#!/usr/bin/env python3
"""Experiment C — RDMA WRITE (the main event).

Run the target first, then the writer:

    # hostb — target owns the destination buffer
    python3 exp_c_write.py --role target --host hostb --ctrl-listen

    # hosta — writer pushes data into hostb's memory
    python3 exp_c_write.py --role writer --host hosta \
        --ctrl-connect 172.20.20.3

What happens:

  1. Both sides exchange QP metadata *and* the target additionally
     shares {rkey, addr, length} describing its registered buffer.
  2. Target NEVER posts a receive WR.  An ordinary RDMA WRITE does
     not consume a receive WR and produces no CQE on the target.
  3. Writer posts ONE SendWR with opcode IBV_WR_RDMA_WRITE whose
     scatter-gather entry points at *its own* buffer, plus
     set_wr_rdma(rkey, addr) naming the *remote* destination.
  4. Soft-RoCE emits a RoCEv2 WRITE packet (UDP dport 4791) whose
     RETH header carries the remote virtual address, remote key
     and transfer length — visible in the packet capture.
  5. The NIC (here: Soft-RoCE) writes the payload directly into the
     target's registered memory.  The target's application observes
     the change only after the writer signals completion over the
     TCP control channel — in a real program you would use a
     signalled write, immediate data, or an event.

The packet's RETH rkey/address are the same numbers printed by the
target in step 1 — that is the correlation the packet explorer in
the FabricLab page highlights.
"""

import argparse
import ctypes
import os
import sys

import pyverbs.enums as enums
import pyverbs.wr as wr_mod

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rdma_common as lab

BUF_LEN = 4096
PSN = 0x300
WR_ID_WRITE = 0x61
PAYLOAD = b"RDMA WRITE landed in hostb memory without a recv WR!\n"


def exchange_meta(f, sock, qp, gid, role, mr=None, buf=None, log=None):
    msg = {"role": role, "qpn": qp.qp_num, "psn": PSN, "gid": gid}
    if mr is not None:
        msg.update({"rkey": mr.rkey, "addr": lab.buf_addr(buf),
                    "length": BUF_LEN})
    lab.ctrl_send(sock, msg)
    peer = lab.ctrl_recv(f)
    if log:
        log.emit("metadata_exchange", own_qpn=qp.qp_num, own_gid=gid,
                 peer_qpn=peer["qpn"], peer_gid=peer["gid"],
                 shared_rkey=msg.get("rkey"), shared_addr=msg.get("addr"),
                 shared_len=msg.get("length"))
    return peer


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--role", choices=["target", "writer"], required=True)
    ap.add_argument("--host", default="localhost")
    ap.add_argument("--dev", default="rxe0")
    ap.add_argument("--ctrl-listen", action="store_true")
    ap.add_argument("--ctrl-connect", metavar="IP")
    args = ap.parse_args()

    log = lab.EventLog(args.host, f"exp-c-{args.role}")

    ctx = lab.open_ib(args.dev)
    gid_index, gid = lab.local_gid(ctx)
    pd = lab.pd_mod.PD(ctx)
    cq = lab.cq_mod.CQ(ctx, 16)

    buf = ctypes.create_string_buffer(BUF_LEN)
    if args.role == "target":
        # Writable by remote peers; also locally writable.
        ctypes.memset(buf, ord("."), BUF_LEN)
        before = bytes(buf.raw[:64])
        log.emit("buffer_before", first64=before.hex())
    mr = lab.new_memory_region(pd, buf, BUF_LEN)
    qp = lab.make_qp(pd, cq)
    log.emit("resources", role=args.role, mr_lkey=mr.lkey,
             mr_rkey=mr.rkey, mr_addr=lab.buf_addr(buf),
             qp_num=qp.qp_num, qp_state=lab.qp_state_name(qp))

    if args.ctrl_listen:
        sock = lab.ctrl_listen()
    else:
        sock = lab.ctrl_connect(args.ctrl_connect)
    f = sock.makefile("rw")

    share_mr = args.role == "target"
    peer = exchange_meta(f, sock, qp, gid, args.role,
                         mr=mr if share_mr else None,
                         buf=buf if share_mr else None, log=log)

    lab.bring_qp_to_rts(qp, gid_index,
                        {"qpn": peer["qpn"], "psn": peer["psn"],
                         "gid": peer["gid"]}, own_psn=PSN,
                         path_mtu=ctx.query_port(lab.PORT).active_mtu)
    log.emit("qp_ready", qp_num=qp.qp_num, state=lab.qp_state_name(qp),
             dest_qpn=peer["qpn"], sq_psn=PSN, rq_psn=PSN)

    if args.role == "writer":
        # Wait for target to confirm it is in RTS and watching.
        msg = lab.ctrl_recv(f)
        log.emit("peer_ready", msg=msg)

        mr.write(PAYLOAD, len(PAYLOAD))
        sge = wr_mod.SGE(addr=lab.buf_addr(buf), length=len(PAYLOAD),
                         lkey=mr.lkey)
        swr = wr_mod.SendWR(wr_id=WR_ID_WRITE,
                            opcode=enums.IBV_WR_RDMA_WRITE,
                            num_sge=1, sg=[sge],
                            send_flags=enums.IBV_SEND_SIGNALED)
        # remote_addr/rkey live in the WR, NOT in any packet header
        # field visible to the sender's CPU — they go into RETH.
        swr.set_wr_rdma(rkey=peer["rkey"], addr=peer["addr"])
        qp.post_send(swr)
        log.emit("post_send", wr_id=WR_ID_WRITE, opcode="RDMA_WRITE",
                 local_sge_addr=lab.buf_addr(buf), local_lkey=mr.lkey,
                 remote_addr=peer["addr"], remote_rkey=peer["rkey"],
                 byte_len=len(PAYLOAD), payload=PAYLOAD.decode().strip())

        wc = lab.poll_one_cqe(cq, tag="write", timeout=10.0, log=log)
        log.emit("write_complete", byte_len=wc.byte_len,
                 status="SUCCESS")
        print(f"\nWriter completion: RDMA_WRITE of {wc.byte_len} bytes "
              f"to remote addr {peer['addr']:#x} rkey {peer['rkey']}, "
              "status SUCCESS")

        # Only AFTER our completion is signalled may the target trust
        # that the remote memory has been updated.
        lab.ctrl_send(sock, {"write_done": True})

    else:  # target
        # Signal readiness, then wait for the writer's completion.
        lab.ctrl_send(sock, {"ready": True})
        msg = lab.ctrl_recv(f)
        log.emit("write_done_signal", msg=msg)

        # Demonstrate that an ordinary WRITE generated NO receive CQE:
        # poll once with a tiny budget — nothing should arrive.
        npolled, _ = cq.poll(1)
        log.emit("target_cq_poll", npolled=npolled,
                 note="ordinary RDMA WRITE produces no CQE on target")

        after = bytes(buf.raw[:len(PAYLOAD)])
        expected = PAYLOAD
        ok = after == expected
        log.emit("buffer_after", first64=after.hex(),
                 verify="payload_match", ok=ok)
        print(f"\nTarget buffer now starts with: {after!r}")
        print("Remote WRITE verified" if ok else "VERIFY FAILED")

    sock.close()
    qp.close(); cq.close(); mr.close(); pd.close(); ctx.close()
    log.close()


if __name__ == "__main__":
    main()
