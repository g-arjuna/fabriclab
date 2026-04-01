import type { CommandResult } from "@/types"
import { useLabStore } from "@/store/labStore"

function markSidVerificationProgress(key: string): void {
  const store = useLabStore.getState()
  const conditions = store.lab.conditions

  store.setCondition(key, true)

  if (
    conditions.isisNeighborShown === true
    && (key === "sidReachabilitySpine02" || conditions.sidReachabilitySpine02 === true)
    && (key === "sidReachabilitySpine03" || conditions.sidReachabilitySpine03 === true)
    && (key === "sidReachabilityStorage" || conditions.sidReachabilityStorage === true)
  ) {
    store.setTopology({ isisAdjVerified: true })
    store.setCondition("isisAdjVerified", true)
    store.markVerified("isisAdjVerified")
  }
}

export function showIsisNeighbor(): CommandResult {
  const store = useLabStore.getState()
  const conditions = store.lab.conditions

  store.setCondition("isisNeighborShown", true)

  if (
    conditions.sidReachabilitySpine02 === true
    && conditions.sidReachabilitySpine03 === true
    && conditions.sidReachabilityStorage === true
  ) {
    store.setTopology({ isisAdjVerified: true })
    store.setCondition("isisAdjVerified", true)
    store.markVerified("isisAdjVerified")
  }

  return {
    output: `IS-IS Adjacency Table (leaf-rackB):

System ID      Interface  L  State    Uptime  Hostname
0000.0000.0002 swp49      2  Up       4d02h   spine-01
0000.0000.0003 swp50      2  Up       4d02h   spine-02
0000.0000.0004 swp51      2  Up       4d01h   spine-03
0000.0000.0005 swp52      2  Up       4d02h   spine-04

All 4 spine adjacencies: Up
SRv6 capability: Advertised (TLV-27 present on all peers)

Next step: verify SRv6 SIDs are distributed -> 'show isis srv6 node'`,
    type: "success",
  }
}

export function showIsisSrv6Node(): CommandResult {
  return {
    output: `IS-IS SRv6 Node Table:

Node         Locator Prefix              Algorithm  SIDs
-----------  --------------------------  ---------  ----
leaf-rackB   2001:db8:0:leaf-rackb::/64  0          End ::1, End.X ::2 (swp1-4)
spine-01     2001:db8:0:spine01::/64     0          End ::1
spine-02     2001:db8:0:spine02::/64     0          End ::1
spine-03     2001:db8:0:spine03::/64     0          End ::1
spine-04     2001:db8:0:spine04::/64     0          End ::1
leaf-storage 2001:db8:0:lsrv::/64        0          End ::1
                                                     End.DT4 ::100 (VRF STORAGE)

Pre-provisioned SIDs for your segment-list:
  spine-02 End SID:          2001:db8:0:spine02::1
  spine-03 End SID:          2001:db8:0:spine03::1
  leaf-storage End.DT4 SID:  2001:db8:0:lsrv::100  (decap into VRF STORAGE)

Verify reachability -> 'ping6 spine02 sid'`,
    type: "info",
  }
}

export function ping6Spine02(): CommandResult {
  markSidVerificationProgress("sidReachabilitySpine02")

  return {
    output: `PING 2001:db8:0:spine02::1 (2001:db8:0:spine02::1): 56 data bytes
64 bytes from 2001:db8:0:spine02::1: icmp_seq=1 ttl=64 time=0.412 ms
64 bytes from 2001:db8:0:spine02::1: icmp_seq=2 ttl=64 time=0.398 ms
64 bytes from 2001:db8:0:spine02::1: icmp_seq=3 ttl=64 time=0.401 ms

--- 2001:db8:0:spine02::1 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss
SID reachable`,
    type: "success",
  }
}

export function ping6Spine03(): CommandResult {
  markSidVerificationProgress("sidReachabilitySpine03")

  return {
    output: `PING 2001:db8:0:spine03::1 (2001:db8:0:spine03::1): 56 data bytes
64 bytes from 2001:db8:0:spine03::1: icmp_seq=1 ttl=64 time=0.419 ms
64 bytes from 2001:db8:0:spine03::1: icmp_seq=2 ttl=64 time=0.408 ms
64 bytes from 2001:db8:0:spine03::1: icmp_seq=3 ttl=64 time=0.411 ms

--- 2001:db8:0:spine03::1 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss
SID reachable`,
    type: "success",
  }
}

export function ping6StorageSid(): CommandResult {
  markSidVerificationProgress("sidReachabilityStorage")

  return {
    output: `PING 2001:db8:0:lsrv::100 (2001:db8:0:lsrv::100): 56 data bytes
64 bytes from 2001:db8:0:lsrv::100: icmp_seq=1 ttl=63 time=0.831 ms
64 bytes from 2001:db8:0:lsrv::100: icmp_seq=2 ttl=63 time=0.827 ms
64 bytes from 2001:db8:0:lsrv::100: icmp_seq=3 ttl=63 time=0.829 ms

--- 2001:db8:0:lsrv::100 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss
SID reachable (End.DT4 / VRF STORAGE)

All three segment-list SIDs confirmed reachable.
Ready to configure the segment-list -> 'configure segment-list'`,
    type: "success",
  }
}

export function showSegmentRoutingSrv6Sid(): CommandResult {
  return {
    output: `Local SRv6 SID Table (leaf-rackB):

SID                            Context           Owner  State
-----------------------------  ----------------  -----  -----
2001:db8:0:leaf-rackb::1       End               IS-IS  Up
2001:db8:0:leaf-rackb::2       End.X(swp1)       IS-IS  Up
2001:db8:0:leaf-rackb::3       End.X(swp2)       IS-IS  Up
2001:db8:0:leaf-rackb::4       End.X(swp3)       IS-IS  Up
2001:db8:0:leaf-rackb::5       End.X(swp4)       IS-IS  Up

No End.DT4 SIDs here - this switch is a headend, not an egress VRF node.
The End.DT4 SID lives on leaf-storage: 2001:db8:0:lsrv::100`,
    type: "info",
  }
}

export function configureSegmentList(): CommandResult {
  const store = useLabStore.getState()

  store.setTopology({ segmentListConfigured: true })
  store.setCondition("segmentListConfigured", true)
  store.markVerified("segmentListConfigured")

  return {
    output: `Configuring segment-list CHECKPOINT-PATH...

vtysh (simulated):
  segment-routing
   traffic-eng
    segment-list CHECKPOINT-PATH
     index 10 ipv6 2001:db8:0:spine02::1
     index 20 ipv6 2001:db8:0:spine03::1
     index 30 ipv6 2001:db8:0:lsrv::100
    !
   !
  !

Segment-list CHECKPOINT-PATH configured.
3 segments: spine-02 -> spine-03 -> leaf-storage (End.DT4)

Verify -> 'show sr-te segment-list'`,
    type: "success",
  }
}

export function showSrteSegmentList(): CommandResult {
  const configured = useLabStore.getState().topology.segmentListConfigured ?? false

  if (!configured) {
    return {
      output: `No segment-lists configured.

Run 'configure segment-list' to define the CHECKPOINT-PATH.`,
      type: "info",
    }
  }

  return {
    output: `SR-TE Segment Lists:

Name: CHECKPOINT-PATH
  Index  Type  Value
  -----  ----  ------------------------------------------
  10     IPv6  2001:db8:0:spine02::1   (End @ spine-02)
  20     IPv6  2001:db8:0:spine03::1   (End @ spine-03)
  30     IPv6  2001:db8:0:lsrv::100    (End.DT4 VRF STORAGE @ leaf-storage)

SID list order: traffic visits spine-02 first, then spine-03, then decaps at leaf-storage.

Next step: bind this list to a policy -> 'configure sr-te policy'`,
    type: "success",
  }
}

export function configureSrtePolicy(): CommandResult {
  const store = useLabStore.getState()
  const segmentListConfigured = store.topology.segmentListConfigured ?? false

  if (!segmentListConfigured) {
    return {
      output: `ERROR: segment-list CHECKPOINT-PATH not found.

Configure the segment-list first -> 'configure segment-list'`,
      type: "error",
    }
  }

  store.setTopology({ srtePolicyActive: true })
  store.setCondition("srtePolicyActive", true)
  store.markVerified("srtePolicyActive")

  return {
    output: `Configuring SR-TE policy CHECKPOINT-STORAGE...

vtysh (simulated):
  segment-routing
   traffic-eng
    policy CHECKPOINT-STORAGE
     color 100 endpoint 2001:db8:0:lsrv::1
     candidate-path preference 100 explicit segment-list CHECKPOINT-PATH
    !
   !
  !

Policy CHECKPOINT-STORAGE configured.

Verify -> 'show sr-te policy'`,
    type: "success",
  }
}

export function showSrtePolicy(): CommandResult {
  const policyActive = useLabStore.getState().topology.srtePolicyActive ?? false

  if (!policyActive) {
    return {
      output: `No SR-TE policies configured.

Configure the policy -> 'configure sr-te policy'`,
      type: "info",
    }
  }

  return {
    output: `SR-TE Policies (leaf-rackB):

Policy: CHECKPOINT-STORAGE
  Endpoint:     2001:db8:0:lsrv::1
  Color:        100
  Status:       Active
  Binding SID:  2001:db8:0:leaf-rackb::200  (auto-assigned)

  Candidate-paths:
    Preference 100 (Active)
      Type: Explicit
      Segment-list: CHECKPOINT-PATH
      Segments: 3
        [0] 2001:db8:0:spine02::1
        [1] 2001:db8:0:spine03::1
        [2] 2001:db8:0:lsrv::100

  Traffic counters: 0 packets, 0 bytes (no traffic steered yet)
  -> Apply route-map to steer DSCP 10 here -> 'configure route-map dscp10'`,
    type: "success",
  }
}

export function configureRouteMapDscp10(): CommandResult {
  return {
    output: `Configuring route-map STEER-CHECKPOINT...

vtysh (simulated):
  route-map STEER-CHECKPOINT permit 10
   match ip dscp 10
   set sr-te color 100
  !
  route-map STEER-CHECKPOINT permit 20
   ! permit all other traffic - no set action = normal ECMP
  !

Route-map STEER-CHECKPOINT created.
  Clause 10: DSCP 10 -> SR-TE color 100 (checkpoint -> CHECKPOINT-STORAGE policy)
  Clause 20: all other traffic -> normal ECMP forwarding

Apply to server-facing ports -> 'apply route-map swp1-4'`,
    type: "success",
  }
}

export function applyRouteMapSwp14(): CommandResult {
  const store = useLabStore.getState()
  const policyActive = store.topology.srtePolicyActive ?? false

  if (!policyActive) {
    return {
      output: `WARNING: SR-TE policy is not yet active.
Complete Tasks 2 and 3 before applying the route-map:
  'configure segment-list'
  'configure sr-te policy'`,
      type: "error",
    }
  }

  store.setTopology({
    routeMapApplied: true,
    congestionDetected: false,
    bufferUtilPct: 22,
  })
  store.setCondition("routeMapApplied", true)
  store.markVerified("routeMapApplied")

  return {
    output: `Applying route-map STEER-CHECKPOINT to swp1-4 (ingress)...

vtysh (simulated):
  interface swp1
   ip policy route-map STEER-CHECKPOINT
  interface swp2
   ip policy route-map STEER-CHECKPOINT
  interface swp3
   ip policy route-map STEER-CHECKPOINT
  interface swp4
   ip policy route-map STEER-CHECKPOINT

Route-map applied to swp1-4 (all Rack B server-facing ports).

From this point:
  DSCP 10 packets (checkpoint) -> SID list -> spine-02 -> spine-03 -> leaf-storage
  DSCP 26 packets (NCCL)       -> normal ECMP across spine-01/02/03/04
  All other traffic            -> normal ECMP

Verify -> 'show ip policy'
Then verify the path -> rackb-node01: 'traceroute6 checkpoint dscp10'`,
    type: "success",
  }
}

export function showIpPolicy(): CommandResult {
  const applied = useLabStore.getState().topology.routeMapApplied ?? false

  if (!applied) {
    return {
      output: `Interface  Input policy
---------  ------------
swp1       (none)
swp2       (none)
swp3       (none)
swp4       (none)
swp49      (none)
swp50      (none)

No route-map applied to server-facing ports yet.
-> 'configure route-map dscp10' then 'apply route-map swp1-4'`,
      type: "info",
    }
  }

  return {
    output: `Interface  Input policy
---------  ------------------
swp1       STEER-CHECKPOINT
swp2       STEER-CHECKPOINT
swp3       STEER-CHECKPOINT
swp4       STEER-CHECKPOINT
swp49      (none)  [spine-facing - no policy needed]
swp50      (none)
swp51      (none)
swp52      (none)

Route-map correctly applied to all Rack B server-facing interfaces.

DSCP 10 -> SR-TE color 100 -> CHECKPOINT-STORAGE policy -> spine-02 -> spine-03 -> leaf-storage`,
    type: "success",
  }
}

export function showRouteMapSteerCheckpoint(): CommandResult {
  const applied = useLabStore.getState().topology.routeMapApplied ?? false

  return {
    output: `route-map STEER-CHECKPOINT, permit, sequence 10
  Match clauses:
    ip dscp 10
  Set clauses:
    sr-te color 100
  Policy routing matches: ${applied ? "0 packets, 0 bytes" : "pending traffic"}

route-map STEER-CHECKPOINT, permit, sequence 20
  Match clauses:
    (none - matches all remaining traffic)
  Set clauses:
    (none - normal forwarding)
  Policy routing matches: ${applied ? "0 packets, 0 bytes" : "pending traffic"}

${applied ? "Route-map is active on swp1-4." : "Route-map definition is ready; apply it on swp1-4 to activate steering."}`,
    type: "info",
  }
}

export function traceroute6CheckpointDscp10(): CommandResult {
  const store = useLabStore.getState()
  const applied = store.topology.routeMapApplied ?? false
  const policyActive = store.topology.srtePolicyActive ?? false

  if (!applied || !policyActive) {
    return {
      output: `traceroute to 2001:db8:0:lsrv::1, 30 hops max, DSCP=10

 1  2001:db8:0:leaf-rackb::1  (leaf-rackB)    0.412 ms
 2  2001:db8:0:spine01::1     (spine-01)  <- checkpoint is hitting spine-01
    0.821 ms
 3  2001:db8:0:lsrv::1        (leaf-storage)  1.249 ms

DSCP 10 traffic is going through spine-01 (normal ECMP).
SR-TE policy is not active or route-map is not applied.
Complete all configuration steps before re-running traceroute6.`,
      type: "error",
    }
  }

  store.setCondition("tracerouteVerified", true)
  store.markVerified("tracerouteVerified")

  return {
    output: `traceroute to 2001:db8:0:lsrv::1, 30 hops max
  Probe marked DSCP 10 (-Q 0x28)
  SRH present in outbound packet (3 SIDs)

 1  2001:db8:0:leaf-rackb::1   (leaf-rackB)   0.391 ms
    SRH: [spine02::1, spine03::1, lsrv::100]  Segments Left=2

 2  2001:db8:0:spine02::1      (spine-02)  <- SR-TE waypoint 1
    0.802 ms
    SRH Segments Left=1

 3  2001:db8:0:spine03::1      (spine-03)  <- SR-TE waypoint 2
    1.198 ms
    SRH Segments Left=0

 4  10.100.0.1                 (leaf-storage VRF STORAGE)  1.631 ms
    SRH decapsulated (End.DT4 applied at leaf-storage)
    Inner IPv4 packet delivered to VRF STORAGE

CONFIRMED: DSCP 10 traffic follows SR-TE path spine-02 -> spine-03
Now verify spine-01 is clean -> switch to spine-01: 'tcpdump srh swp1'`,
    type: "success",
  }
}

export function traceroute6NcclDscp26(): CommandResult {
  const applied = useLabStore.getState().topology.routeMapApplied ?? false

  return {
    output: `traceroute to 2001:db8:0:leaf-a1::1, 30 hops max
  Probe marked DSCP 26 (-Q 0x68)
  ${applied ? "No SRH in outbound packet (normal ECMP - DSCP 26 not steered)" : "No SR-TE policy active"}

 1  2001:db8:0:leaf-rackb::1   (leaf-rackB)   0.388 ms
 2  2001:db8:0:spine01::1      (spine-01)${applied ? "  <- ECMP chose spine-01 (no SRH)" : ""}
    0.819 ms
 3  2001:db8:0:leaf-a1::1      (Leaf-A1)   1.228 ms

NCCL traffic (DSCP 26) follows normal ECMP - no SR-TE steering applied.
Spine may vary per run (ECMP is hash-based).
${applied ? "DSCP 26 is intentionally not in route-map clause 10." : ""}`,
    type: "success",
  }
}

export function tcpdumpSrhSwp1Spine01(): CommandResult {
  const store = useLabStore.getState()
  const applied = store.topology.routeMapApplied ?? false

  if (!applied) {
    return {
      output: `tcpdump -i swp1 -v 'ip6 and ip6[6]==43' -c 20
  (Next Header 43 = Routing Header / SRH)

14:23:01.441201 IP6 2001:db8:0:leaf-rackb::1 > 2001:db8:0:lsrv::100
  Routing: SRH, Segments Left=0
  SID[0]: 2001:db8:0:lsrv::100

14:23:01.441889 IP6 2001:db8:0:leaf-rackb::1 > 2001:db8:0:lsrv::100
  Routing: SRH, Segments Left=0
  SID[0]: 2001:db8:0:lsrv::100

[... 18 more SRH packets captured ...]

WARNING: SRH traffic (checkpoint) is visible on spine-01.
Apply SR-TE policy and route-map before re-checking.`,
      type: "error",
    }
  }

  store.setCondition("spine01Clean", true)
  store.markVerified("spine01Clean")

  return {
    output: `tcpdump -i swp1 -v 'ip6 and ip6[6]==43' -c 20 --timeout 30
  (Next Header 43 = Routing Header / SRH)

tcpdump: listening on swp1, link-type EN10MB, 30 second capture...

[30 seconds elapsed]
0 packets captured <- no SRH traffic on spine-01
0 packets received by filter
0 packets dropped by kernel

Checkpoint traffic (SRH) is not transiting spine-01.

Lab complete sequence:
  - IS-IS adjacency verified
  - Segment-list configured (spine-02 -> spine-03 -> leaf-storage)
  - SR-TE policy active (color 100, CHECKPOINT-STORAGE)
  - Route-map applied (DSCP 10 -> SR-TE color 100 on swp1-4)
  - Traceroute6 confirmed: spine-02 -> spine-03 path for DSCP 10
  - spine-01 is clean: zero checkpoint SRH traffic`,
    type: "success",
  }
}

export function tcpdumpSrhSwp1Spine02(): CommandResult {
  const applied = useLabStore.getState().topology.routeMapApplied ?? false

  if (!applied) {
    return {
      output: `tcpdump -i swp1 'ip6 and ip6[6]==43' -c 5
0 packets captured (no SR-TE active yet)`,
      type: "info",
    }
  }

  return {
    output: `tcpdump -i swp1 -v 'ip6 and ip6[6]==43' -c 5
  (Next Header 43 = Routing Header / SRH)

14:23:01.441201 IP6 2001:db8:0:leaf-rackb::? > 2001:db8:0:spine02::1
  Routing: SRH
  SID[2]: 2001:db8:0:spine02::1   <- this node, being processed
  SID[1]: 2001:db8:0:spine03::1
  SID[0]: 2001:db8:0:lsrv::100
  Segments Left=1 (about to decrement, next hop = spine-03)

14:23:01.441890 [same SRH structure]
[3 more packets...]

5 packets captured - checkpoint traffic is transiting spine-02 (expected)
Spine-02 is the correct SR-TE waypoint 1.`,
    type: "success",
  }
}

export function showSrv6PacketsSpine01(): CommandResult {
  const applied = useLabStore.getState().topology.routeMapApplied ?? false

  return {
    output: applied
      ? `SRv6 packet counters (spine-01):

  interface swp1: rx_srv6_pkts = 0  <- zero SRH packets from leaf-rackB direction
  interface swp2: rx_srv6_pkts = 0
  interface swp49: rx_srv6_pkts = 0
  interface swp50: rx_srv6_pkts = 0

Spine-01 is not forwarding any SRv6 checkpoint traffic.
SR-TE is correctly steering checkpoint away from spine-01.`
      : `SRv6 packet counters (spine-01):

  interface swp1: rx_srv6_pkts = 4,821  <- checkpoint SRH traffic present
  interface swp2: rx_srv6_pkts = 3,918
  ...

Checkpoint traffic is hitting spine-01 (SR-TE not yet active).`,
    type: applied ? "success" : "error",
  }
}

export function showTopologyLab14(): CommandResult {
  return {
    output: `Lab 14 - SR-TE Path Steering Topology:

  +------------------------------------------------------------------+
  | rackb-node01     leaf-rackB      Spines          leaf-storage    |
  | (DSCP 10 src)    (SR-TE headend) 01  02  03  04  (End.DT4)       |
  |                                                                  |
  | o---------------- o-------------o    |    |    o                 |
  | checkpoint        headend       ECMP |    |    VRF STORAGE       |
  |                            spine-02 o---- |                      |
  |                            (waypoint 1)   |                      |
  |                            spine-03 o-----+                      |
  |                            (waypoint 2)                          |
  |                                                                  |
  | NCCL (DSCP 26): leaf-rackB -> ECMP across all 4 spines           |
  | Checkpoint (DSCP 10): leaf-rackB -> spine-02 -> spine-03 -> storage |
  +------------------------------------------------------------------+

Devices (click to open terminal):
  rackb-node01   Rack B compute node (traceroute6 verification)
  leaf-rackb     Headend switch (configure SR-TE here)
  spine-01       NCCL spine (should be clean after SR-TE)
  spine-02       SR-TE checkpoint waypoint 1
  leaf-storage   Storage destination (End.DT4)

Pre-provisioned SIDs:
  2001:db8:0:spine02::1   End SID for spine-02
  2001:db8:0:spine03::1   End SID for spine-03
  2001:db8:0:lsrv::100    End.DT4 SID for leaf-storage (VRF STORAGE)`,
    type: "info",
  }
}

export function showInterfaceCountersSpine01(): CommandResult {
  const applied = useLabStore.getState().topology.routeMapApplied ?? false

  const bufferUtil = applied ? "18%" : "78%"
  const drops = applied ? "0" : "14,821"
  const pfcRx = applied ? "0" : "289"

  return {
    output: `Interface counters (spine-01):

Interface  RX packets      TX packets      RX drops   PFC rx  Buffer util
---------  --------------  --------------  ---------  ------  -----------
swp1       8,234,918,441   8,198,441,223   ${drops.padEnd(9)} ${pfcRx.padEnd(6)}  ${bufferUtil}
swp2       8,228,341,892   8,201,884,112   ${drops.padEnd(9)} ${pfcRx.padEnd(6)}  ${bufferUtil}
swp3       8,241,002,341   8,194,773,221   ${drops.padEnd(9)} ${pfcRx.padEnd(6)}  ${bufferUtil}
swp4       8,196,448,221   8,178,334,118   ${drops.padEnd(9)} ${pfcRx.padEnd(6)}  ${bufferUtil}

${applied
  ? "Spine-01 buffer utilisation: 18% (nominal). PFC pauses: zero. Checkpoint traffic is no longer hashing to this spine."
  : "Spine-01 buffer utilisation: 78% (high). PFC pauses: 289. Checkpoint elephant flows are overwhelming this spine's buffers. Apply SR-TE to steer checkpoint off spine-01."}`,
    type: applied ? "success" : "error",
  }
}

export function showSegmentRoutingSrv6SidStorage(): CommandResult {
  return {
    output: `Local SRv6 SID Table (leaf-storage):

SID                        Context               Owner  State
-------------------------  --------------------  -----  -----
2001:db8:0:lsrv::1         End                   IS-IS  Up
2001:db8:0:lsrv::100       End.DT4 (VRF STORAGE) BGP    Up    <- this is your segment-list index 30

End.DT4 behaviour on packet arrival:
  1. IPv6 dst matches 2001:db8:0:lsrv::100 -> this SID
  2. Strip outer IPv6 header (40 bytes) and any SRH
  3. IPv4 FIB lookup in VRF STORAGE
  4. Forward inner packet to storage server`,
    type: "info",
  }
}

export function showIpRouteVrfStorage(): CommandResult {
  return {
    output: `IPv4 routing table, VRF STORAGE:

Codes: K - kernel route, C - connected, S - static, B - BGP

B    10.100.0.0/24 [20/0] via 10.100.0.254, swp1, 4d02h
C  * 10.100.0.0/24 is directly connected, swp1
C  * 10.100.0.1/32 is directly connected, lo

Storage server reachable at 10.100.0.1 via VRF STORAGE.
Checkpoint traffic will be delivered here after SRv6 decapsulation.`,
    type: "success",
  }
}

export function showMtu(): CommandResult {
  const applied = useLabStore.getState().topology.routeMapApplied ?? false

  return {
    output: `Interface MTU (leaf-rackB):

  swp1-4   (server-facing):  mtu 9216
  swp49-52 (spine-facing):   mtu 9216

SRH overhead for 3-SID path:
  SRH fixed header:   8 bytes
  3 x SID (16 each): 48 bytes
  Total SRH overhead: 56 bytes

Payload MTU budget: 9216 - 40 (IPv6) - 56 (SRH) = 9120 bytes

All interfaces at 9216 bytes MTU. SRH overhead accommodated.
${applied ? "Checkpoint flows will use up to 9120-byte inner payloads." : ""}`,
    type: "success",
  }
}
