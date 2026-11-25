#!/usr/bin/env python3
"""Experiment B — Reliable Connected SEND / RECV.

Run the receiver first, then the sender:

    # hostb — receiver (posts the receive WR, owns the payload buffer)
    python3 exp_b_send_recv.py --role receiver --host hostb --ctrl-listen

    # hosta — sender (posts the send WR)
    python3 exp_b_send_recv.py --role sender --host hosta \
        --ctrl-connect 172.20.20.3

Sequence:

  1. Both sides create ctx/PD/MR/CQ/QP and drive the QP to RTS,
     exchanging {qpn, psn, gid} over TCP (control plane only).
  2. Receiver posts ONE RecvWR into its Receive Queue.  The WR
     describes *where incoming data lands* — it does not contain data.
  3. Sender writes the payload into its own registered buffer and
     posts ONE SendWR with opcode IBV_WR_SEND.
  4. Soft-RoCE emits a RoCEv2 packet (UDP dport 4791) on eth1.
  5. Both sides get a signalled completion:
       sender   -> WC opcode SEND,  status SUCCESS
       receiver -> WC opcode RECV,  status SUCCESS, byte_len = payload
  6. Receiver prints the bytes that landed in its buffer.

Note what is NOT happening: the TCP socket carries no payload, the
receiver posted no send WR, and the sender posted no receive WR.
"""

import argparse
import ctypes
import os
import sys
import time

import pyverbs.enums as enums
import pyverbs.wr as wr_mod

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rdma_common as lab

BUF_LEN = 4096
PSN = 0x200
PAYLOAD = b"Hello RDMA - SEND/RECV over Soft-RoCE (FabricLab)\n"
WR_ID_SEND = 0x51
WR_ID_RECV = 0x52


def build_resources(ctx, pd, cq, log, tag):
    buf = ctypes.create_string_buffer(BUF_LEN)
    mr = lab.new_memory_region(pd, buf, BUF_LEN)
    qp = lab.make_qp(pd, cq)
    log.emit("resources", tag=tag, mr_lkey=mr.lkey, mr_rkey=mr.rkey,
             mr_addr=lab.buf_addr(buf), qp_num=qp.qp_num,
             qp_state=lab.qp_state_name(qp))
    return buf, mr, qp


def exchange_and_connect(ctx, qp, gid, gid_index, args, log, f, sock):
    lab.ctrl_send(sock, {"role": args.role, "qpn": qp.qp_num,
                         "psn": PSN, "gid": gid})
    peer = lab.ctrl_recv(f)
    log.emit("metadata_exchange", own_qpn=qp.qp_num, own_psn=PSN,
             own_gid=gid, peer_qpn=peer["qpn"], peer_gid=peer["gid"],
             peer_role=peer["role"])
    lab.bring_qp_to_rts(qp, gid_index,
                        {"qpn": peer["qpn"], "psn": peer["psn"],
                         "gid": peer["gid"]}, own_psn=PSN,
                         path_mtu=ctx.query_port(lab.PORT).active_mtu)
    log.emit("qp_ready", qp_num=qp.qp_num, state=lab.qp_state_name(qp),
             dest_qpn=peer["qpn"], sq_psn=PSN, rq_psn=PSN)
    return peer


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--role", choices=["sender", "receiver"],
                    required=True)
    ap.add_argument("--host", default="localhost")
    ap.add_argument("--dev", default="rxe0")
    ap.add_argument("--ctrl-listen", action="store_true")
    ap.add_argument("--ctrl-connect", metavar="IP")
    args = ap.parse_args()

    log = lab.EventLog(args.host, f"exp-b-{args.role}")

    ctx = lab.open_ib(args.dev)
    gid_index, gid = lab.local_gid(ctx)
    pd = lab.pd_mod.PD(ctx)
    cq = lab.cq_mod.CQ(ctx, 16)
    buf, mr, qp = build_resources(ctx, pd, cq, log, args.role)

    if args.ctrl_listen:
        sock = lab.ctrl_listen()
    else:
        sock = lab.ctrl_connect(args.ctrl_connect)
    f = sock.makefile("rw")
    peer = exchange_and_connect(ctx, qp, gid, gid_index, args, log, f, sock)

    if args.role == "receiver":
        # ---- post the receive WR ------------------------------------
        sge = wr_mod.SGE(addr=lab.buf_addr(buf), length=BUF_LEN,
                         lkey=mr.lkey)
        rwr = wr_mod.RecvWR(wr_id=WR_ID_RECV, num_sge=1, sg=[sge])
        qp.post_recv(rwr)
        log.emit("post_recv", wr_id=WR_ID_RECV, buf_len=BUF_LEN,
                 lkey=mr.lkey, addr=lab.buf_addr(buf))

        # Tell the sender our RQ has a WR armed, then wait for data.
        lab.ctrl_send(sock, {"ready": True})
        wc = lab.poll_one_cqe(cq, tag="recv", timeout=10.0, log=log)
        n = wc.byte_len
        data = bytes(buf.raw[:n])
        log.emit("recv_complete", byte_len=n, payload_hex=data.hex(),
                 payload_repr=repr(data))
        expected = PAYLOAD
        ok = data == expected
        log.emit("verify", check="payload_match", ok=ok,
                 expected_len=len(expected), got_len=n)
        print(f"\nReceiver got {n} bytes: {data!r}")
        print("Payload matches expected SEND" if ok
              else "PAYLOAD MISMATCH")

    else:  # sender
        # Wait until the peer's RQ is armed.
        msg = lab.ctrl_recv(f)
        log.emit("peer_ready", msg=msg)

        # Put the payload in our registered buffer, then post send WR.
        mr.write(PAYLOAD, len(PAYLOAD))
        sge = wr_mod.SGE(addr=lab.buf_addr(buf), length=len(PAYLOAD),
                         lkey=mr.lkey)
        swr = wr_mod.SendWR(wr_id=WR_ID_SEND,
                            opcode=enums.IBV_WR_SEND,
                            num_sge=1, sg=[sge],
                            send_flags=enums.IBV_SEND_SIGNALED)
        qp.post_send(swr)
        log.emit("post_send", wr_id=WR_ID_SEND, opcode="SEND",
                 byte_len=len(PAYLOAD), lkey=mr.lkey,
                 addr=lab.buf_addr(buf), payload=PAYLOAD.decode().strip())

        wc = lab.poll_one_cqe(cq, tag="send", timeout=10.0, log=log)
        log.emit("send_complete", byte_len=wc.byte_len,
                 status="SUCCESS")
        print(f"\nSender completion: SEND of {wc.byte_len} bytes, "
              f"status SUCCESS")

    sock.close()
    qp.close(); cq.close(); mr.close(); pd.close(); ctx.close()
    log.close()


if __name__ == "__main__":
    main()
