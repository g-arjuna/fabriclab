#!/usr/bin/env python3
"""Experiment D — RDMA READ.

Run the source first, then the reader:

    # hostb — source owns the buffer being read
    python3 exp_d_read.py --role source --host hostb --ctrl-listen

    # hosta — reader pulls data out of hostb's memory
    python3 exp_d_read.py --role reader --host hosta \
        --ctrl-connect 172.20.20.3

Sequence:

  1. Source registers a buffer, pre-fills it, and shares
     {rkey, addr, length} over the TCP control channel.
  2. Reader posts ONE SendWR with opcode IBV_WR_RDMA_READ whose
     scatter-gather entry points at *its own* destination buffer,
     plus set_wr_rdma(rkey, addr) naming the remote source.
  3. Soft-RoCE emits a RoCEv2 READ *request* packet; the peer
     responds with the data.  Two packet exchanges appear in the
     capture (request + response) — unlike WRITE, READ is
     round-trip.
  4. Reader's CQ gets a WC with opcode RDMA_READ and byte_len.
  5. The source's application sees NO completion for the read —
     the responder side of an RDMA READ does not post a WR.

READ is the follow-up experiment: it validates that the same
RETH metadata channel (rkey + addr) works in the opposite
direction.
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
PSN = 0x400
WR_ID_READ = 0x71
SECRET = b"RDMA READ: this secret lives in hostb memory.\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--role", choices=["source", "reader"], required=True)
    ap.add_argument("--host", default="localhost")
    ap.add_argument("--dev", default="rxe0")
    ap.add_argument("--ctrl-listen", action="store_true")
    ap.add_argument("--ctrl-connect", metavar="IP")
    args = ap.parse_args()

    log = lab.EventLog(args.host, f"exp-d-{args.role}")

    ctx = lab.open_ib(args.dev)
    gid_index, gid = lab.local_gid(ctx)
    pd = lab.pd_mod.PD(ctx)
    cq = lab.cq_mod.CQ(ctx, 16)

    buf = ctypes.create_string_buffer(BUF_LEN)
    if args.role == "source":
        ctypes.memset(buf, ord("#"), BUF_LEN)
        mr_src = lab.new_memory_region(pd, buf, BUF_LEN)
        mr = mr_src
        # Pre-fill the region a remote peer will read.
        ctypes.memmove(buf, SECRET, len(SECRET))
        log.emit("buffer_before", first64=bytes(buf.raw[:64]).hex())
        share = True
    else:
        mr = lab.new_memory_region(pd, buf, BUF_LEN)
        share = False

    qp = lab.make_qp(pd, cq)
    log.emit("resources", tag=args.role, mr_lkey=mr.lkey,
             mr_rkey=mr.rkey, mr_addr=lab.buf_addr(buf),
             qp_num=qp.qp_num, qp_state=lab.qp_state_name(qp))

    if args.ctrl_listen:
        sock = lab.ctrl_listen()
    else:
        sock = lab.ctrl_connect(args.ctrl_connect)
    f = sock.makefile("rw")

    msg = {"role": args.role, "qpn": qp.qp_num, "psn": PSN, "gid": gid}
    if share:
        msg.update({"rkey": mr.rkey, "addr": lab.buf_addr(buf),
                    "length": len(SECRET)})
    lab.ctrl_send(sock, msg)
    peer = lab.ctrl_recv(f)
    log.emit("metadata_exchange", own_qpn=qp.qp_num, own_gid=gid,
             peer_qpn=peer["qpn"], peer_gid=peer["gid"],
             shared_rkey=msg.get("rkey"), shared_addr=msg.get("addr"),
             shared_len=msg.get("length"))

    lab.bring_qp_to_rts(qp, gid_index,
                        {"qpn": peer["qpn"], "psn": peer["psn"],
                         "gid": peer["gid"]}, own_psn=PSN,
                         path_mtu=ctx.query_port(lab.PORT).active_mtu)
    log.emit("qp_ready", qp_num=qp.qp_num, state=lab.qp_state_name(qp),
             dest_qpn=peer["qpn"], sq_psn=PSN, rq_psn=PSN)

    ok = True
    if args.role == "reader":
        msg = lab.ctrl_recv(f)   # {"ready": true} from source
        log.emit("peer_ready", msg=msg)

        sge = wr_mod.SGE(addr=lab.buf_addr(buf), length=len(SECRET),
                         lkey=mr.lkey)
        swr = wr_mod.SendWR(wr_id=WR_ID_READ,
                            opcode=enums.IBV_WR_RDMA_READ,
                            num_sge=1, sg=[sge],
                            send_flags=enums.IBV_SEND_SIGNALED)
        swr.set_wr_rdma(rkey=peer["rkey"], addr=peer["addr"])
        qp.post_send(swr)
        log.emit("post_send", wr_id=WR_ID_READ, opcode="RDMA_READ",
                 local_sge_addr=lab.buf_addr(buf), local_lkey=mr.lkey,
                 remote_addr=peer["addr"], remote_rkey=peer["rkey"],
                 byte_len=len(SECRET))

        wc = lab.poll_one_cqe(cq, tag="read", timeout=10.0, log=log)
        data = bytes(buf.raw[:wc.byte_len])
        ok = data == SECRET
        log.emit("read_complete", byte_len=wc.byte_len, data=data.hex(),
                 verify="payload_match", ok=ok)
        print(f"\nReader got {wc.byte_len} bytes: {data!r}")
        print("Remote READ verified" if ok else "VERIFY FAILED")

        lab.ctrl_send(sock, {"read_done": True})

    else:  # source
        lab.ctrl_send(sock, {"ready": True})
        msg = lab.ctrl_recv(f)
        log.emit("read_done_signal", msg=msg)
        npolled, _ = cq.poll(1)
        ok = npolled == 0
        log.emit("source_cq_poll", npolled=npolled, ok=ok,
                 note="RDMA READ responder side posts no WR, "
                      "so no CQE is expected")

    sock.close()
    qp.close(); cq.close(); mr.close(); pd.close(); ctx.close()
    log.close()
    raise SystemExit(0 if ok else 1)


if __name__ == "__main__":
    main()
