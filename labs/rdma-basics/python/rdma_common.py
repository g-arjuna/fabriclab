"""Shared helpers for the FabricLab RDMA basics lab.

This module wraps only the *mechanical* parts of a Pyverbs program:

  * opening the RDMA device context,
  * choosing the RoCEv2 GID,
  * the TCP control channel used to swap QP/MR metadata,
  * driving a Reliable Connected QP through RESET -> INIT -> RTR -> RTS,
  * polling a completion queue with a finite timeout.

Every actual verbs operation (ibv_reg_mr, ibv_create_qp,
ibv_post_send, ibv_poll_cq, ...) is still invoked explicitly in the
experiment scripts so the learner can see each call.

Only tested against python3-pyverbs 50.0 (Ubuntu 24.04).
"""

import ctypes
import json
import os
import socket
import sys
import time

import pyverbs.addr as addr
import pyverbs.cq as cq_mod
import pyverbs.device as device
import pyverbs.enums as enums
import pyverbs.mr as mr_mod
import pyverbs.pd as pd_mod
import pyverbs.qp as qp_mod
import pyverbs.utils as utils
import pyverbs.wr as wr_mod

PORT = 1                      # RDMA port on the rxe0 device
CTRL_PORT = 5001              # TCP control channel (NOT the RDMA data plane)
# For a 1500-byte Ethernet underlay the port's active MTU is
# IBV_MTU_1024; callers should pass ctx.query_port(PORT).active_mtu.
DEFAULT_PATH_MTU = enums.IBV_MTU_1024
ACCESS = (enums.IBV_ACCESS_LOCAL_WRITE |
          enums.IBV_ACCESS_REMOTE_WRITE |
          enums.IBV_ACCESS_REMOTE_READ)


class EventLog:
    """Structured application event log.

    Every experiment writes one JSON object per line.  The FabricLab
    replay page consumes the same schema, so field names are part of
    the lab's public contract.  ``seq`` is a per-process monotonic
    counter; it is *not* a wall-clock ordering guarantee across the
    two hosts.
    """

    def __init__(self, host, role, path=None):
        self.host = host
        self.role = role
        self.path = path or os.environ.get(
            "RDMA_EVENT_LOG", "/tmp/rdma-events.jsonl")
        self.seq = 0
        self._fh = open(self.path, "a", buffering=1)

    def emit(self, event, **fields):
        self.seq += 1
        rec = {
            "seq": self.seq,
            "t_unix_ns": time.time_ns(),
            "host": self.host,
            "role": self.role,
            "event": event,
        }
        rec.update(fields)
        line = json.dumps(rec, sort_keys=True)
        self._fh.write(line + "\n")
        # Human-readable mirror on stdout for `docker exec` sessions.
        extra = " ".join(f"{k}={v}" for k, v in fields.items())
        print(f"[{self.host}/{self.role}] #{self.seq} {event} {extra}",
              flush=True)

    def close(self):
        self._fh.close()


def qp_state_name(qp):
    return utils.qp_state_to_str(qp.qp_state)


def mtu_name(mtu):
    return utils.mtu_to_str(mtu)


def open_ib(dev_name="rxe0"):
    """Open a verbs context for the Soft-RoCE device."""
    return device.Context(name=dev_name)


def local_gid(ctx, port=PORT):
    """Return (gid_index, gid_str) of our RoCEv2 GID on ``port``.

    RoCEv2 GIDs are the IPv4/IPv6 addresses of the data-plane
    interface, learned by the kernel and published in the GID table.
    """
    table = ctx.query_gid_table(64)
    candidates = [e for e in table
                  if e.port_num == port
                  and e.gid_type == enums.IBV_GID_TYPE_ROCE_V2]
    if not candidates:
        raise RuntimeError("no RoCEv2 GID found; is an IPv4/IPv6 "
                           "address assigned to the RDMA netdev?")
    # Prefer the IPv4-mapped RoCEv2 GID (::ffff:a.b.c.d).  Link-local
    # fe80:: GIDs can collide between hosts on the same L2 segment.
    for entry in candidates:
        if ":ffff:" in entry.gid_str():
            return entry.gid_index, entry.gid_str()
    entry = candidates[0]
    return entry.gid_index, entry.gid_str()


def print_gid_table(ctx, port=PORT):
    print("GID table:")
    for entry in ctx.query_gid_table(64):
        if entry.port_num == port:
            print(f"  index={entry.gid_index} "
                  f"type={device.translate_gid_type(entry.gid_type)} "
                  f"gid={entry.gid_str()}")


def new_memory_region(pd, buf, length):
    """Register ``buf`` (a ctypes buffer) and return its ibv_mr."""
    return mr_mod.MR(pd, length=length, access=ACCESS,
                     address=ctypes.addressof(buf))


def buf_addr(buf):
    """Virtual address of a ctypes buffer — the 'addr' verbs use."""
    return ctypes.addressof(buf)


def make_qp(pd, cq, max_wr=8):
    """Create an RC QP bound to ``cq`` for both send and receive."""
    init_attr = qp_mod.QPInitAttr(
        qp_type=enums.IBV_QPT_RC,
        scq=cq,
        rcq=cq,
        cap=qp_mod.QPCap(max_send_wr=max_wr, max_recv_wr=max_wr,
                         max_send_sge=1, max_recv_sge=1),
        sq_sig_all=1,          # every send WR produces a CQE
    )
    return qp_mod.QP(pd, init_attr)


def bring_qp_to_rts(qp, own_gid_index, peer, own_psn=0x100,
                    path_mtu=DEFAULT_PATH_MTU):
    """Drive an RC QP RESET -> INIT -> RTR -> RTS.

    ``peer`` is the dict received over the TCP control channel:
    {"qpn": int, "psn": int, "gid": "xxxx:..."}.
    ``path_mtu`` should be the port's active MTU
    (``ctx.query_port(PORT).active_mtu``).

    Returns the final QPAttr used for RTS (useful for logging).
    """
    attr = qp_mod.QPAttr(port_num=PORT, path_mtu=path_mtu)

    # ---- INIT: only local attributes are needed ---------------------
    attr.pkey_index = 0
    attr.qp_access_flags = ACCESS
    qp.to_init(attr)

    # ---- RTR: everything needed to *receive* from the peer ---------
    dgid = addr.GID(peer["gid"])
    gr = addr.GlobalRoute(dgid=dgid, sgid_index=own_gid_index,
                          hop_limit=255, traffic_class=0)
    attr.ah_attr = addr.AHAttr(is_global=1, port_num=PORT, gr=gr)
    attr.dest_qp_num = peer["qpn"]
    attr.rq_psn = peer["psn"]      # PSN the peer will start sending with
    attr.max_dest_rd_atomic = 1
    attr.min_rnr_timer = 0
    qp.to_rtr(attr)

    # ---- RTS: everything needed to *send* to the peer ---------------
    attr.timeout = 14              # ~4.096us * 2^14
    attr.retry_cnt = 7
    attr.rnr_retry = 7
    attr.sq_psn = own_psn          # PSN we start sending with
    attr.max_rd_atomic = 1
    qp.to_rts(attr)
    return attr


def poll_one_cqe(cq, tag="", timeout=5.0, log=None):
    """Poll ``cq`` until one completion arrives or ``timeout`` expires.

    Returns the WC.  Raises TimeoutError on expiry — never interpret
    WC fields before checking ``wc.status == IBV_WC_SUCCESS``.
    """
    deadline = time.monotonic() + timeout
    while True:
        npolled, wcs = cq.poll(1)
        for wc in wcs:
            if wc.status == enums.IBV_WC_SUCCESS:
                if log:
                    log.emit("cqe", tag=tag, wr_id=wc.wr_id,
                             opcode=cq_mod.cqe_opcode_to_str(wc.opcode),
                             byte_len=wc.byte_len,
                             qp_num=wc.qp_num, src_qp=wc.src_qp,
                             status="SUCCESS")
                return wc
            if log:
                log.emit("cqe_error", tag=tag, wr_id=wc.wr_id,
                         status=wc.status, opcode=wc.opcode)
        if time.monotonic() >= deadline:
            raise TimeoutError(
                f"no completion on CQ within {timeout}s ({tag})")
        time.sleep(0.005)


def ctrl_send(sock, obj):
    sock.sendall((json.dumps(obj) + "\n").encode())


def ctrl_recv(sock_file):
    """Read one JSON line from a socket file object."""
    line = sock_file.readline()
    if not line:
        raise ConnectionError("control channel closed")
    return json.loads(line)


def ctrl_listen(port=CTRL_PORT):
    """Server side of the control channel. Returns a connected socket."""
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(("0.0.0.0", port))
    srv.listen(1)
    conn, addr = srv.accept()
    srv.close()
    return conn


def ctrl_connect(host, port=CTRL_PORT):
    """Client side of the control channel."""
    sock = socket.create_connection((host, port), timeout=10)
    return sock
