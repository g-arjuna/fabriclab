import type { CommandResult } from "@/types"
import { useLabStore } from "@/store/labStore"

function toRecord(topology: unknown): Record<string, unknown> {
  return topology as Record<string, unknown>
}

export function handleLeaf01ShowBgpVrfA(): CommandResult {
  return {
    output: `BGP routing table for VRF VRF_A, address family IPv4 Unicast
BGP table version is 14, local router ID is 10.0.0.1

Status codes: s suppressed, d damped, h history, * valid, > best
Origin codes: i - IGP, e - EGP, ? - incomplete

   Network          Next Hop        MED LocPrf Weight Path
*> 10.10.1.0/24     0.0.0.0              32768 ?
*> 10.10.2.0/24     10.0.0.2        0          0 65100 65002 ?
*> 10.100.1.0/24    0.0.0.0              32768 ?
*> 10.100.2.0/24    10.0.0.2        0          0 65100 65002 ?

Total number of prefixes 4`,
    type: "success",
  }
}

export function handleLeaf01ShowEvpnRouteType5(): CommandResult {
  return {
    output: `BGP table version is 14, local router ID is 10.0.0.1

Route Distinguisher: 65001:100 (VRF VRF_A, leaf-01)
*> [5]:[0]:[24]:[10.10.1.0]
   VTEP: 10.0.0.1  Route-Target: 65000:100  Origin: incomplete
*> [5]:[0]:[24]:[10.100.1.0]
   VTEP: 10.0.0.1  Route-Target: 65000:100  Origin: incomplete

Route Distinguisher: 65002:100 (VRF VRF_A, leaf-02)
*  [5]:[0]:[24]:[10.10.2.0]
   VTEP: 10.0.0.2  Route-Target: 65000:100  Origin: incomplete
*  [5]:[0]:[24]:[10.100.2.0]
   VTEP: 10.0.0.2  Route-Target: 65000:100  Origin: incomplete

Total VRF_A Type-5 routes: 4
Note: All routes correctly scoped to RT 65000:100`,
    type: "success",
  }
}

export function handleLeaf01ShowVrfAImport(): CommandResult {
  return {
    output: `Route-Import Configuration for VRF VRF_A (leaf-01):
  from-evpn route-target: 65000:100

  (1 import route-target - correct)`,
    type: "success",
  }
}

export function handleLeaf01ShowVrfAExport(): CommandResult {
  return {
    output: `Route-Export Configuration for VRF VRF_A (leaf-01):
  to-evpn route-target: 65000:100`,
    type: "success",
  }
}

export function handleLeaf01ShowEvpn(): CommandResult {
  return {
    output: `EVPN Status: enabled
VNIs configured: 4 (2 L2, 2 L3)
  VNI 100  (L2) VLAN 10  State: up  Remote VTEPs: 10.0.0.2
  VNI 200  (L2) VLAN 20  State: up  Remote VTEPs: 10.0.0.2
  VNI 1000 (L3) VRF_A    State: up  Symmetric IRB: yes
  VNI 2000 (L3) VRF_B    State: up  Symmetric IRB: yes
BGP EVPN sessions: 2 (spine-01: Established, spine-02: Established)`,
    type: "success",
  }
}

export function handleLeaf01ShowWjh(): CommandResult {
  return {
    output: `WJH Drop Summary - leaf-01 (last 60 min)
Severity  Timestamp            Reason              Count  Src IP       Dst IP
--------  -------------------  ------------------  -----  -----------  -----------
(no drops recorded on leaf-01)`,
    type: "success",
  }
}

export function handleLeaf01ShowVxlan(): CommandResult {
  return {
    output: `VXLAN Interface Summary - leaf-01
Name       VNI    Local VTEP    Remote VTEPs    State  MTU
---------  -----  ------------  --------------  -----  ----
vxlan100   100    10.0.0.1      10.0.0.2        up     9216
vxlan1000  1000   10.0.0.1      10.0.0.2        up     9216`,
    type: "success",
  }
}

export function handleLeaf02ShowBgpVrfB(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const t = toRecord(topology)

  if (!t.rtFixed) {
    setCondition("leakConfirmed", true)
    return {
      output: `BGP routing table for VRF VRF_B, address family IPv4 Unicast
BGP table version is 18, local router ID is 10.0.0.2

Status codes: s suppressed, d damped, h history, * valid, > best
Origin codes: i - IGP, e - EGP, ? - incomplete

   Network          Next Hop        MED LocPrf Weight Path
*> 10.20.1.0/24     0.0.0.0              32768 ?
*> 10.20.2.0/24     10.0.0.1        0          0 65100 65001 ?
*> 10.100.1.0/24    10.0.0.1        0          0 65100 65001 ?  <-- LEAKED ROUTE
*> 10.100.2.0/24    10.0.0.2             32768 ?

Total number of prefixes 4

WARNING: 10.100.1.0/24 is a TenantA storage prefix - it should NOT appear in VRF_B`,
      type: "success",
      conceptId: "evpn-route-leak",
    }
  }

  setCondition("isolationRestored", true)
  markVerified("isolationRestored")
  return {
    output: `BGP routing table for VRF VRF_B, address family IPv4 Unicast
BGP table version is 22, local router ID is 10.0.0.2

   Network          Next Hop        MED LocPrf Weight Path
*> 10.20.1.0/24     0.0.0.0              32768 ?
*> 10.20.2.0/24     10.0.0.1        0          0 65100 65001 ?

Total number of prefixes 2

OK: VRF_B routing table is clean - no TenantA prefixes present`,
    type: "success",
    conceptId: "evpn-isolation",
  }
}

export function handleLeaf02ShowEvpnRouteType5(): CommandResult {
  const { topology, setCondition } = useLabStore.getState()
  const t = toRecord(topology)

  if (!t.rtFixed) {
    setCondition("leakyLeafIdentified", true)
    return {
      output: `BGP table version is 18, local router ID is 10.0.0.2

Route Distinguisher: 65001:100 (VRF VRF_A, leaf-01)   <-- TenantA RD
*> [5]:[0]:[24]:[10.10.1.0]
   VTEP: 10.0.0.1  Route-Target: 65000:100
   Imported into: VRF_B  <-- MISCONFIGURATION: VRF_B importing RT 65000:100
*> [5]:[0]:[24]:[10.100.1.0]
   VTEP: 10.0.0.1  Route-Target: 65000:100
   Imported into: VRF_B  <-- MISCONFIGURATION

Route Distinguisher: 65002:200 (VRF VRF_B, leaf-02)
*> [5]:[0]:[24]:[10.20.1.0]
   VTEP: 10.0.0.2  Route-Target: 65000:200
   Imported into: VRF_B  (correct)

FINDING: Routes from RD 65001:100 (TenantA / leaf-01) are being imported into
VRF_B because VRF_B is configured to import RT 65000:100 in addition to 65000:200`,
      type: "success",
      conceptId: "evpn-type5-rd",
    }
  }

  return {
    output: `BGP table version is 22, local router ID is 10.0.0.2

Route Distinguisher: 65002:200 (VRF VRF_B, leaf-02)
*> [5]:[0]:[24]:[10.20.1.0]
   VTEP: 10.0.0.2  Route-Target: 65000:200
   Imported into: VRF_B  (correct)
*> [5]:[0]:[24]:[10.20.2.0]
   VTEP: 10.0.0.1  Route-Target: 65000:200
   Imported into: VRF_B  (correct)

OK: Only TenantB routes (RT 65000:200) are present in VRF_B - isolation confirmed`,
    type: "success",
  }
}

export function handleLeaf02ShowVrfBImport(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const t = toRecord(topology)

  if (!t.rtFixed) {
    setCondition("rtMisconfigFound", true)
    markVerified("rtMisconfigFound")
    return {
      output: `Route-Import Configuration for VRF VRF_B (leaf-02):
  from-evpn route-target: 65000:200   (correct - TenantB)
  from-evpn route-target: 65000:100   <-- WRONG - TenantA route-target

Root cause identified:
VRF_B is importing both its own RT (65000:200) and TenantA's RT (65000:100),
which is why 10.100.1.0/24 is leaking into TenantB.`,
      type: "success",
      conceptId: "evpn-rt-import",
    }
  }

  return {
    output: `Route-Import Configuration for VRF VRF_B (leaf-02):
  from-evpn route-target: 65000:200

OK: Only TenantB's route-target is imported now.`,
    type: "success",
  }
}

export function handleLeaf02ShowVrfBExport(): CommandResult {
  return {
    output: `Route-Export Configuration for VRF VRF_B (leaf-02):
  to-evpn route-target: 65000:200`,
    type: "success",
  }
}

export function handleLeaf02UnsetRtImport(): CommandResult {
  const { topology, setTopology, setCondition, markVerified } = useLabStore.getState()
  const t = toRecord(topology)

  if (t.rtFixed) {
    return {
      output: `Route-target 65000:100 has already been removed from VRF_B.
Run 'nv config apply' and then re-check the VRF_B routing table to confirm the leak is gone.`,
      type: "info",
    }
  }

  setTopology({
    ...t,
    vrfBImportRtCorrect: true,
    vrfBHasLeakedRoute: false,
    rtFixed: true,
  })
  setCondition("rtFixed", true)
  markVerified("rtFixed")

  return {
    output: `Removed route-target 65000:100 from VRF_B import policy.

Pending change:
  VRF_B will now import only RT 65000:200 after configuration is applied.

Next steps:
  1. Run 'nv config apply'
  2. Run 'net clear bgp vrf VRF_B *'
  3. Re-check 'net show bgp vrf VRF_B ipv4 unicast'`,
    type: "success",
    conceptId: "evpn-fix",
  }
}

export function handleLeaf02ConfigApply(): CommandResult {
  const { topology } = useLabStore.getState()
  const t = toRecord(topology)

  if (!t.rtFixed) {
    return {
      output: `No relevant pending fix detected.

VRF_B is still configured to import RT 65000:100.
Remove the bad import first:
  nv unset vrf VRF_B router bgp route-import from-evpn route-target 65000:100`,
      type: "info",
    }
  }

  return {
    output: `Applying NVUE configuration...
Done.

VRF_B import policy committed successfully.
Leaf-02 will now stop importing TenantA routes after the BGP EVPN table refreshes.

Recommended next step:
  net clear bgp vrf VRF_B *`,
    type: "success",
  }
}

export function handleLeaf02BgpSoftReset(): CommandResult {
  const { topology, setTopology } = useLabStore.getState()
  const t = toRecord(topology)

  if (!t.rtFixed) {
    return {
      output: `BGP clear skipped: the route-target leak has not been fixed yet.

Remove the bad import first, then clear the VRF_B BGP table so the leaked
EVPN Type-5 routes are withdrawn.`,
      type: "error",
    }
  }

  setTopology({
    ...t,
    bgpSoftResetDone: true,
  })

  return {
    output: `BGP soft clear requested for VRF_B.
Leaked EVPN Type-5 routes associated with RT 65000:100 have been withdrawn.

Re-run:
  net show bgp vrf VRF_B ipv4 unicast`,
    type: "success",
  }
}

export function handleLeaf02ShowEvpn(): CommandResult {
  const { topology } = useLabStore.getState()
  const t = toRecord(topology)

  if (!t.rtFixed) {
    return {
      output: `EVPN Status: enabled
VNIs configured: 4 (2 L2, 2 L3)
  VNI 100  (L2) VLAN 10  State: up  Remote VTEPs: 10.0.0.1
  VNI 200  (L2) VLAN 20  State: up  Remote VTEPs: 10.0.0.1
  VNI 1000 (L3) VRF_A    State: up  Symmetric IRB: yes
  VNI 2000 (L3) VRF_B    State: up  Symmetric IRB: yes
BGP EVPN sessions: 2 (spine-01: Established, spine-02: Established)

Warning: VRF_B import policy is currently leaking RT 65000:100 into TenantB.`,
        type: "success",
      }
  }

  return {
    output: `EVPN Status: enabled
VNIs configured: 4 (2 L2, 2 L3)
  VNI 100  (L2) VLAN 10  State: up  Remote VTEPs: 10.0.0.1
  VNI 200  (L2) VLAN 20  State: up  Remote VTEPs: 10.0.0.1
  VNI 1000 (L3) VRF_A    State: up  Symmetric IRB: yes
  VNI 2000 (L3) VRF_B    State: up  Symmetric IRB: yes
BGP EVPN sessions: 2 (spine-01: Established, spine-02: Established)

OK: EVPN control plane is healthy and tenant import scopes are clean.`,
    type: "success",
  }
}

export function handleLeaf02ShowWjh(): CommandResult {
  const { topology } = useLabStore.getState()
  const t = toRecord(topology)

  if (!t.rtFixed) {
    return {
      output: `WJH Drop Summary - leaf-02 (last 60 min)
Severity  Timestamp            Reason                  Count  Src IP       Dst IP
--------  -------------------  ----------------------  -----  -----------  -----------
Warning   2026-04-12 11:14:23  EVPN_RT_IMPORT_ANOMALY      4  10.0.0.1     10.0.0.2

Observation:
Control-plane state is healthy, but EVPN route import policy is inconsistent with tenant isolation expectations.`,
      type: "success",
    }
  }

  return {
    output: `WJH Drop Summary - leaf-02 (last 60 min)
Severity  Timestamp            Reason              Count  Src IP       Dst IP
--------  -------------------  ------------------  -----  -----------  -----------
(no EVPN isolation anomalies recorded after the fix)`,
    type: "success",
  }
}

export function handleDgxTenantAPing(): CommandResult {
  const { setCondition, markVerified } = useLabStore.getState()
  setCondition("legitimateAccessVerified", true)
  markVerified("legitimateAccessVerified")

  return {
    output: `PING 10.100.1.5 (10.100.1.5) 56(84) bytes of data.
64 bytes from 10.100.1.5: icmp_seq=1 ttl=63 time=0.311 ms
64 bytes from 10.100.1.5: icmp_seq=2 ttl=63 time=0.287 ms
64 bytes from 10.100.1.5: icmp_seq=3 ttl=63 time=0.295 ms

--- 10.100.1.5 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss

OK: TenantA retains legitimate connectivity to its own storage subnet.`,
    type: "success",
  }
}

export function handleDgxTenantAIbWriteBw(): CommandResult {
  const { setCondition, markVerified } = useLabStore.getState()
  setCondition("rdmaVerified", true)
  markVerified("rdmaVerified")

  return {
    output: `---------------------------------------------------------------------------------------
                    RDMA_Write BW Test
Dual-port       : OFF          Device         : mlx5_0
Connection type : RC           Using SRQ      : OFF
PCIe relax order: ON           TX depth       : 128
CQ Moderation   : 64
Mtu             : 4096[B]
Link type       : Ethernet
GID index       : 3

---------------------------------------------------------------------------------------
 #bytes     #iterations    BW peak[Gb/sec]    BW average[Gb/sec]
 65536      5000               188.42             186.97

OK: Intra-tenant RDMA path is healthy after isolation remediation.`,
    type: "success",
  }
}

export function handleDgxTenantAIpRoute(): CommandResult {
  return {
    output: `default via 192.168.10.254 dev eth0
10.10.1.0/24 dev eth0 proto kernel scope link src 10.10.1.21
10.100.1.0/24 via 10.10.1.254 dev eth0 proto bgp metric 20
10.100.2.0/24 via 10.10.1.254 dev eth0 proto bgp metric 20`,
    type: "success",
  }
}

export function handleDgxTenantBPing(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const t = toRecord(topology)

  if (!t.rtFixed) {
    return {
      output: `PING 10.100.1.5 (10.100.1.5) 56(84) bytes of data.
64 bytes from 10.100.1.5: icmp_seq=1 ttl=63 time=0.422 ms
64 bytes from 10.100.1.5: icmp_seq=2 ttl=63 time=0.407 ms
64 bytes from 10.100.1.5: icmp_seq=3 ttl=63 time=0.419 ms

--- 10.100.1.5 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss

Failure confirmed: TenantB should NOT be able to reach TenantA storage.`,
      type: "success",
      conceptId: "evpn-leak-impact",
    }
  }

  setCondition("crossTenantBlocked", true)
  markVerified("crossTenantBlocked")
  return {
    output: `PING 10.100.1.5 (10.100.1.5) 56(84) bytes of data.
From 10.20.1.21 icmp_seq=1 Destination Host Unreachable
From 10.20.1.21 icmp_seq=2 Destination Host Unreachable
From 10.20.1.21 icmp_seq=3 Destination Host Unreachable

--- 10.100.1.5 ping statistics ---
3 packets transmitted, 0 received, 100% packet loss

OK: Cross-tenant reachability is blocked again.`,
    type: "success",
  }
}

export function handleDgxTenantBIpRoute(): CommandResult {
  const { topology } = useLabStore.getState()
  const t = toRecord(topology)

  if (!t.rtFixed) {
    return {
      output: `default via 192.168.20.254 dev eth0
10.20.1.0/24 dev eth0 proto kernel scope link src 10.20.1.21
10.100.1.0/24 via 10.20.1.254 dev eth0 proto bgp metric 20   <-- leaked

Observation: TenantB has an unexpected route to TenantA storage.`,
      type: "success",
    }
  }

  return {
    output: `default via 192.168.20.254 dev eth0
10.20.1.0/24 dev eth0 proto kernel scope link src 10.20.1.21

OK: No TenantA routes remain in TenantB's routing table.`,
    type: "success",
  }
}
