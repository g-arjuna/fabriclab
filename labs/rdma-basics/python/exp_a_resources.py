#!/usr/bin/env python3
"""Experiment A — create and inspect RDMA resources.

Run once on each host:

    # on hostb (10.10.10.2, container clab-rdma-lab-hostb)
    python3 exp_a_resources.py --role b --host hostb --ctrl-listen

    # on hosta (10.10.10.1, container clab-rdma-lab-hosta)
    python3 exp_a_resources.py --role a --host hosta \
        --ctrl-connect 172.20.20.3

What it shows, in order:

  1. ibv_open_device  -> verbs context for "rxe0" (Soft-RoCE)
  2. ibv_query_port / ibv_query_gid_table -> port state, MTU, GIDs
  3. ibv_alloc_pd     -> protection domain
  4. ibv_reg_mr       -> memory region over a real buffer (lkey/rkey)
  5. ibv_create_cq    -> completion queue
  6. ibv_create_qp    -> Reliable Connected queue pair (RESET state)
  7. QP state machine RESET -> INIT -> RTR -> RTS, with the peer's
     QPN / PSN / RoCEv2 GID exchanged over a plain TCP socket.

The TCP socket is ONLY a control channel: it carries the metadata
needed to program the QP.  No payload ever travels over it.
"""

import argparse
import ctypes
import os
import sys

import pyverbs.device as device_mod
import pyverbs.enums as enums
import pyverbs.pd as pd_mod

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rdma_common as lab

BUF_LEN = 4096
PSN = 0x100


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--role", choices=["a", "b"], required=True)
    ap.add_argument("--host", default="localhost")
    ap.add_argument("--dev", default="rxe0")
    ap.add_argument("--ctrl-listen", action="store_true",
                    help="act as TCP control-channel server (hostb)")
    ap.add_argument("--ctrl-connect", metavar="IP",
                    help="control-channel peer address (hosta)")
    args = ap.parse_args()

    log = lab.EventLog(args.host, f"exp-a-{args.role}")

    # ---- 1. device context -----------------------------------------
    ctx = lab.open_ib(args.dev)
    dev_attr = ctx.query_device()
    log.emit("open_device", dev=args.dev,
             node_guid=hex(dev_attr.node_guid),
             vendor_id=hex(dev_attr.vendor_id),
             vendor_part_id=dev_attr.vendor_part_id,
             max_qp=dev_attr.max_qp, max_cq=dev_attr.max_cq,
             max_mr=dev_attr.max_mr, max_sge=dev_attr.max_sge)

    # ---- 2. port + GID table ----------------------------------------
    port = ctx.query_port(lab.PORT)
    gid_index, gid = lab.local_gid(ctx)
    lab.print_gid_table(ctx)
    log.emit("port_info", port_state=device_mod.port_state_to_str(
                 port.state),
             active_mtu=lab.mtu_name(port.active_mtu),
             link_layer=device_mod.translate_link_layer(port.link_layer),
             gid_index=gid_index, gid=gid)

    # ---- 3-6. PD, MR, CQ, QP ---------------------------------------
    pd = pd_mod.PD(ctx)
    buf = ctypes.create_string_buffer(BUF_LEN)
    mr = lab.new_memory_region(pd, buf, BUF_LEN)
    cq = lab.cq_mod.CQ(ctx, 16)
    qp = lab.make_qp(pd, cq)

    log.emit("resources", pd=hex(pd.handle), cq_cqe=cq.cqe,
             mr_lkey=mr.lkey, mr_rkey=mr.rkey, mr_len=mr.length,
             mr_addr=lab.buf_addr(buf),
             qp_num=qp.qp_num, qp_state=lab.qp_state_name(qp),
             max_send_wr=8, max_recv_wr=8,
             sq_sig_all=True)

    # ---- 7. control channel + QP state machine ---------------------
    # Both sides send their own metadata first, then read the peer's.
    # Order does not matter: whichever arrives first is buffered.
    if args.ctrl_listen:
        sock = lab.ctrl_listen()
    else:
        sock = lab.ctrl_connect(args.ctrl_connect)
    f = sock.makefile("rw")

    lab.ctrl_send(sock, {"role": args.role, "qpn": qp.qp_num,
                         "psn": PSN, "gid": gid})
    peer = lab.ctrl_recv(f)
    log.emit("metadata_exchange", own_qpn=qp.qp_num, own_psn=PSN,
             own_gid=gid, peer_qpn=peer["qpn"], peer_gid=peer["gid"],
             peer_role=peer["role"])

    attr = lab.bring_qp_to_rts(qp, gid_index,
                               {"qpn": peer["qpn"], "psn": peer["psn"],
                                "gid": peer["gid"]},
                               own_psn=PSN,
                               path_mtu=ctx.query_port(
                                   lab.PORT).active_mtu)

    log.emit("qp_state", state="INIT->RTR->RTS", qp_num=qp.qp_num,
             detail="RC QP driven to RTS")
    log.emit("qp_ready", qp_num=qp.qp_num,
             state=lab.qp_state_name(qp),
             dest_qpn=peer["qpn"], path_mtu=lab.mtu_name(attr.path_mtu),
             timeout=attr.timeout, retry_cnt=attr.retry_cnt,
             rnr_retry=attr.rnr_retry, sq_psn=attr.sq_psn,
             rq_psn=attr.rq_psn)

    print(f"\nExperiment A complete on {args.host}: QP {qp.qp_num} is "
          f"{lab.qp_state_name(qp)} toward QPN {peer['qpn']}.")
    print("No work requests were posted — this experiment only creates "
          "and inspects RDMA resources.")

    sock.close()
    qp.close(); cq.close(); mr.close(); pd.close(); ctx.close()
    log.close()


if __name__ == "__main__":
    main()
