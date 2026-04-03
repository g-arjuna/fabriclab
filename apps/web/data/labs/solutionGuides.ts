export type SolutionGuideCommand = {
  deviceId: string;
  command: string;
};

export type SolutionGuideStep = {
  title: string;
  details: string;
  commands: SolutionGuideCommand[];
};

export type SolutionGuide = {
  labId: string;
  title: string;
  steps: SolutionGuideStep[];
};

export const SOLUTION_GUIDES: Record<string, SolutionGuide> = {
  "lab0-failed-rail": {
    labId: "lab0-failed-rail",
    title: "Step-by-step command guide",
    steps: [
      {
        title: "Identify the failed rail from the DGX host",
        details: "Use the topology view first, then confirm the NIC-side RDMA state.",
        commands: [
          { deviceId: "dgx-node-a", command: "show topology" },
          { deviceId: "dgx-node-a", command: "show rdma links" },
        ],
      },
      {
        title: "Check the switch-side view for Rail 3",
        details: "The port state mismatch isolates the failure to the leaf-switch port side.",
        commands: [{ deviceId: "leaf-rail3", command: "show switch port rail3" }],
      },
    ],
  },
  "lab1-pfc-fix": {
    labId: "lab1-pfc-fix",
    title: "Step-by-step command guide",
    steps: [
      {
        title: "Inspect the current PFC state",
        details: "Verify that the switch is running without PFC before making changes.",
        commands: [{ deviceId: "spectrum-sw", command: "show dcb pfc" }],
      },
      {
        title: "Enable PFC on the switch",
        details: "Apply the lossless transport fix on the switch CLI.",
        commands: [{ deviceId: "spectrum-sw", command: "enable pfc" }],
      },
      {
        title: "Verify PFC is enabled",
        details: "Re-read the PFC state after the change.",
        commands: [{ deviceId: "spectrum-sw", command: "show dcb pfc" }],
      },
    ],
  },
  "lab2-congestion": {
    labId: "lab2-congestion",
    title: "Step-by-step command guide",
    steps: [
      {
        title: "Check whether congestion is visible in interface counters",
        details: "Start from the leaf switch and inspect the queue/counter state.",
        commands: [{ deviceId: "spectrum-sw", command: "show interface counters" }],
      },
      {
        title: "Enable ECN",
        details: "Add congestion marking so senders back off before buffers saturate.",
        commands: [{ deviceId: "spectrum-sw", command: "enable ecn" }],
      },
      {
        title: "Verify RoCE/ECN state",
        details: "Confirm the post-change RoCE configuration on the switch.",
        commands: [{ deviceId: "spectrum-sw", command: "show roce" }],
      },
    ],
  },
  "lab3-uneven-spine": {
    labId: "lab3-uneven-spine",
    title: "Step-by-step command guide",
    steps: [
      {
        title: "Compare leaf and spine counters",
        details: "Confirm that one spine is carrying a disproportionate share of the traffic.",
        commands: [
          { deviceId: "leaf-sw", command: "show interface counters" },
          { deviceId: "spine-sw", command: "show interface counters" },
        ],
      },
      {
        title: "Inspect and change the load-balancing mode",
        details: "Move from hash-based flow pinning to per-packet distribution.",
        commands: [
          { deviceId: "leaf-sw", command: "show dcb load-balance" },
          { deviceId: "leaf-sw", command: "enable load-balance per-packet" },
        ],
      },
      {
        title: "Recheck the spine counters",
        details: "Verify traffic is now spread more evenly across the spine.",
        commands: [{ deviceId: "spine-sw", command: "show interface counters" }],
      },
    ],
  },
  "lab4-topology-sizing": {
    labId: "lab4-topology-sizing",
    title: "Step-by-step command guide",
    steps: [
      {
        title: "Inspect both topology proposals",
        details: "Read the port-count and switch-count assumptions for Proposal A and Proposal B.",
        commands: [
          { deviceId: "workstation", command: "show proposal a" },
          { deviceId: "workstation", command: "show proposal b" },
        ],
      },
      {
        title: "Calculate each oversubscription ratio",
        details: "Turn the proposal specs into a numerical comparison.",
        commands: [
          { deviceId: "workstation", command: "calculate oversubscription a" },
          { deviceId: "workstation", command: "calculate oversubscription b" },
        ],
      },
      {
        title: "Compare and submit the recommendation",
        details: "Use the comparison output, then submit the proposal that keeps the fabric non-blocking.",
        commands: [
          { deviceId: "workstation", command: "compare proposals" },
          { deviceId: "workstation", command: "recommend proposal b" },
        ],
      },
    ],
  },
  "lab5-nccl-diagnosis": {
    labId: "lab5-nccl-diagnosis",
    title: "Step-by-step command guide",
    steps: [
      {
        title: "Check which transport NCCL selected",
        details: "Start on the DGX host and inspect the selected transport path.",
        commands: [{ deviceId: "dgx-node-a", command: "nccl-debug --transport" }],
      },
      {
        title: "Verify RDMA devices and NCCL environment variables",
        details: "Compare the RDMA interfaces to the NCCL environment settings.",
        commands: [
          { deviceId: "dgx-node-a", command: "rdma link show" },
          { deviceId: "dgx-node-a", command: "show nccl env" },
        ],
      },
      {
        title: "Fix NCCL transport selection and rerun validation",
        details: "Point NCCL at the mlx5 devices and management socket interface, then rerun the benchmark.",
        commands: [
          {
            deviceId: "dgx-node-a",
            command:
              "set nccl ib-hca mlx5_0,mlx5_1,mlx5_2,mlx5_3,mlx5_4,mlx5_5,mlx5_6,mlx5_7",
          },
          { deviceId: "dgx-node-a", command: "set nccl socket-ifname eno1" },
          { deviceId: "dgx-node-a", command: "run nccl-tests" },
        ],
      },
    ],
  },
  "lab6-alert-triage": {
    labId: "lab6-alert-triage",
    title: "Step-by-step command guide",
    steps: [
      {
        title: "Pull UFM-wide port counters and inspect the suspect port",
        details: "Use UFM to find the symbol-error hotspot and its timestamps.",
        commands: [
          { deviceId: "ufm-server", command: "show ufm ports" },
          { deviceId: "ufm-server", command: "show ufm port leaf-rail5 swp7" },
        ],
      },
      {
        title: "Correlate the GPU and switch-side symptoms",
        details: "Check the DGX GPU-side view, then the leaf switch port counters.",
        commands: [
          { deviceId: "dgx-node-a", command: "show dcgm gpu5" },
          { deviceId: "leaf-rail5", command: "show interface swp7" },
        ],
      },
      {
        title: "Apply the physical remediation from UFM",
        details: "Reseat the degraded connector after confirming the fault is localized to that port pair.",
        commands: [{ deviceId: "ufm-server", command: "reseat connector leaf-rail5 swp7" }],
      },
    ],
  },
  "lab7-pause-storm": {
    labId: "lab7-pause-storm",
    title: "Step-by-step command guide",
    steps: [
      {
        title: "Compare switch and NIC counters",
        details: "The switch counters look mild, so cross-check the NIC-side pause statistics.",
        commands: [
          { deviceId: "spectrum-sw", command: "show interface counters" },
          { deviceId: "dgx-node-a", command: "ethtool -S eth0" },
        ],
      },
      {
        title: "Check ECN scheduling and enable ECN",
        details: "Verify ECN is missing, then enable it on the switch.",
        commands: [
          { deviceId: "spectrum-sw", command: "show dcb ets" },
          { deviceId: "spectrum-sw", command: "enable ecn" },
        ],
      },
      {
        title: "Verify the storm has cleared",
        details: "Confirm switch QoS state and the NIC pause counter after the fix.",
        commands: [
          { deviceId: "spectrum-sw", command: "show dcb ets" },
          { deviceId: "dgx-node-a", command: "ethtool -S eth0" },
        ],
      },
    ],
  },
  "lab8-pfc-priority-mismatch": {
    labId: "lab8-pfc-priority-mismatch",
    title: "Step-by-step command guide",
    steps: [
      {
        title: "Confirm drops on the DGX NIC",
        details: "Use NIC counters to verify packets are being discarded.",
        commands: [{ deviceId: "dgx-node-a", command: "ethtool -S eth0" }],
      },
      {
        title: "Compare PFC priority to RoCE traffic class mapping",
        details: "Read both switch outputs and look for a priority mismatch.",
        commands: [
          { deviceId: "spectrum-sw", command: "show dcb pfc" },
          { deviceId: "spectrum-sw", command: "show roce" },
        ],
      },
      {
        title: "Move PFC to priority 3 and verify",
        details: "Apply the fix, then confirm both the switch config and NIC drop counters.",
        commands: [
          { deviceId: "spectrum-sw", command: "enable pfc priority 3" },
          { deviceId: "spectrum-sw", command: "show dcb pfc" },
          { deviceId: "dgx-node-a", command: "ethtool -S eth0" },
        ],
      },
    ],
  },
  "lab9-errdisable-recovery": {
    labId: "lab9-errdisable-recovery",
    title: "Step-by-step command guide",
    steps: [
      {
        title: "Identify the impacted rail and compare NIC vs switch state",
        details: "The DGX host reports mlx5_2 as active, so switch to the Rail 2 leaf and inspect the port.",
        commands: [
          { deviceId: "dgx-node-a", command: "show topology" },
          { deviceId: "dgx-node-a", command: "ibstat" },
          { deviceId: "leaf-rail2", command: "show switch port rail2" },
        ],
      },
      {
        title: "Replace the optic and re-enable the port",
        details: "Clear the physical fault first, then remove the err-disabled state.",
        commands: [
          { deviceId: "leaf-rail2", command: "replace optic rail2" },
          { deviceId: "leaf-rail2", command: "no shutdown" },
        ],
      },
      {
        title: "Verify recovery on both sides",
        details: "Recheck switch and DGX-side RDMA state after the port comes back.",
        commands: [
          { deviceId: "leaf-rail2", command: "show switch port rail2" },
          { deviceId: "dgx-node-a", command: "show rdma links" },
        ],
      },
    ],
  },
  "lab10-ecmp-hotspot": {
    labId: "lab10-ecmp-hotspot",
    title: "Step-by-step command guide",
    steps: [
      {
        title: "Confirm the fabric hotspot symptom",
        details: "Start from the workstation overview, then inspect counters on the congested spine.",
        commands: [
          { deviceId: "workstation", command: "show fabric health" },
          { deviceId: "spineB", command: "show interface counters" },
        ],
      },
      {
        title: "Inspect BGP route weighting and bandwidth community state",
        details: "Check the route choice from the leaf and the advertised bandwidth metadata from spineB.",
        commands: [
          { deviceId: "leaf1", command: "show bgp route 10.4.0.0/16" },
          { deviceId: "spineB", command: "show bgp neighbors 10.0.0.1" },
          { deviceId: "spineB", command: "show bgp link-bandwidth" },
        ],
      },
      {
        title: "Set the link-bandwidth community and verify weighted ECMP",
        details: "Advertise the higher spineB bandwidth, then verify the route detail and post-fix counters.",
        commands: [
          { deviceId: "spineB", command: "set bgp link-bandwidth community 1200" },
          { deviceId: "leaf1", command: "show bgp route 10.4.0.0/16 detail" },
          { deviceId: "spineB", command: "show interface counters after" },
        ],
      },
    ],
  },
  "lab11-bgp-path-failure": {
    labId: "lab11-bgp-path-failure",
    title: "Step-by-step command guide",
    steps: [
      {
        title: "Scope the failure and inspect the leaf route",
        details: "Use the workstation topology view, then check which path leaf1 currently prefers.",
        commands: [
          { deviceId: "workstation", command: "show topology" },
          { deviceId: "leaf1", command: "show bgp route 10.2.0.0/16" },
        ],
      },
      {
        title: "Inspect the spine ASN mismatch",
        details: "Check SpineA's route view and its peering state toward SpineB.",
        commands: [
          { deviceId: "spineA", command: "show bgp route 10.2.0.0/16" },
          { deviceId: "spineA", command: "show bgp neighbors 10.0.0.2" },
        ],
      },
      {
        title: "Normalize spine ASNs and verify the leaf post-fix route",
        details: "Move both spines to ASN 65000 and re-read the corrected route from leaf1.",
        commands: [
          { deviceId: "spineA", command: "set bgp local-as 65000" },
          { deviceId: "spineB", command: "set bgp local-as 65000 spineb" },
          { deviceId: "leaf1", command: "show bgp route 10.2.0.0/16 after" },
        ],
      },
    ],
  },
  "lab14-srv6-te-path-steering": {
    labId: "lab14-srv6-te-path-steering",
    title: "Step-by-step command guide",
    steps: [
      {
        title: "Verify IS-IS and SRv6 SID reachability",
        details: "Confirm control-plane adjacency on leaf-rackB and SID reachability from the Rack B node.",
        commands: [
          { deviceId: "leaf-rackb", command: "show isis neighbor" },
          { deviceId: "leaf-rackb", command: "show isis srv6 node" },
          { deviceId: "rackb-node01", command: "ping6 spine02 sid" },
          { deviceId: "rackb-node01", command: "ping6 spine03 sid" },
          { deviceId: "rackb-node01", command: "ping6 storage sid" },
        ],
      },
      {
        title: "Build the segment list, SR-TE policy, and DSCP 10 route-map",
        details: "Configure the explicit waypoint path and bind checkpoint traffic to color 100 on the rack leaf.",
        commands: [
          { deviceId: "leaf-rackb", command: "configure segment-list" },
          { deviceId: "leaf-rackb", command: "configure sr-te policy" },
          { deviceId: "leaf-rackb", command: "configure route-map dscp10" },
          { deviceId: "leaf-rackb", command: "apply route-map swp1-4" },
        ],
      },
      {
        title: "Verify checkpoint steering and confirm spine-01 is clean",
        details: "The DSCP 10 traceroute should follow spine-02/spine-03, while spine-01 sees no checkpoint SRH packets.",
        commands: [
          { deviceId: "rackb-node01", command: "traceroute6 checkpoint dscp10" },
          { deviceId: "spine-01", command: "tcpdump srh swp1" },
        ],
      },
    ],
  },
  "lab15-rdma-rkey-exposure": {
    labId: "lab15-rdma-rkey-exposure",
    title: "Step-by-step command guide",
    steps: [
      {
        title: "Inspect Tenant A's exposed memory registration",
        details: "Start by reading the MR metadata and current GID filter state on Tenant A.",
        commands: [
          { deviceId: "tenanta-node", command: "show mr info" },
          { deviceId: "tenanta-node", command: "show gid filter" },
        ],
      },
      {
        title: "Reproduce the cross-tenant exposure from Tenant B",
        details: "Run the scan from Tenant B to confirm the leaked rkey can be discovered.",
        commands: [
          { deviceId: "tenantb-node", command: "rkey scan" },
          { deviceId: "tenantb-node", command: "ibv_rc_pingpong -d mlx5_0 -g 1" },
        ],
      },
      {
        title: "Enable host-side protection and rotate the rkey",
        details: "Turn on GID filtering, rotate the MR key, then inspect the MR metadata again.",
        commands: [
          { deviceId: "tenanta-node", command: "enable gid filter" },
          { deviceId: "tenanta-node", command: "ibv_reg_mr rotate" },
          { deviceId: "tenanta-node", command: "show mr info after" },
        ],
      },
      {
        title: "Enforce tenant isolation in UFM and verify the attack is blocked",
        details: "Assign separate P_Keys, confirm the UFM table, then rerun the scan from Tenant B.",
        commands: [
          { deviceId: "ufm-server", command: "set pkey tenanta 0x8001" },
          { deviceId: "ufm-server", command: "set pkey tenantb 0x8002" },
          { deviceId: "ufm-server", command: "show ufm pkey table" },
          { deviceId: "tenantb-node", command: "rkey scan" },
        ],
      },
    ],
  },
  "lab16-spectrum-x-platform-audit": {
    labId: "lab16-spectrum-x-platform-audit",
    title: "Step-by-step command guide",
    steps: [
      {
        title: "Verify NVUE and platform identity on leaf-01",
        details: "Confirm the NOS/NVUE version and hardware platform metadata before the bring-up audit.",
        commands: [
          { deviceId: "leaf-01", command: "nv --version" },
          { deviceId: "leaf-01", command: "cl-platform-info" },
        ],
      },
      {
        title: "Audit switch ports on all three devices",
        details: "Run the same interface command on leaf-01, leaf-02, and storage-01.",
        commands: [
          { deviceId: "leaf-01", command: "nv show interface | grep -E \"swp|state\"" },
          { deviceId: "leaf-02", command: "nv show interface | grep -E \"swp|state\"" },
          { deviceId: "storage-01", command: "nv show interface | grep -E \"swp|state\"" },
        ],
      },
      {
        title: "Check ASIC identity and forwarding-health counters",
        details: "Read EEPROM data on leaf-01 and storage-01, and verify zero error counters on leaf-01.",
        commands: [
          { deviceId: "leaf-01", command: "decode-syseeprom" },
          { deviceId: "storage-01", command: "decode-syseeprom" },
          { deviceId: "leaf-01", command: "cl-netstat" },
        ],
      },
      {
        title: "Check MTU and BGP baseline, then submit the audit report",
        details: "Verify jumbo-MTU readiness and a clean BGP baseline, then close out the lab with the audit submission command.",
        commands: [
          { deviceId: "leaf-01", command: "ip link show | grep mtu" },
          { deviceId: "leaf-01", command: "nv show router bgp" },
          { deviceId: "leaf-01", command: "submit audit report" },
        ],
      },
    ],
  },
  "lab17-roce-day-zero-config": {
    labId: "lab17-roce-day-zero-config",
    title: "Step-by-step command guide",
    steps: [
      {
        title: "Apply the RoCE QoS preset on both leaves",
        details: "Stage and apply the same NVUE shorthand config on each leaf switch, then save it on leaf-01.",
        commands: [
          { deviceId: "leaf-01", command: "nv set interface swp1-32 qos roce" },
          { deviceId: "leaf-01", command: "nv config apply" },
          { deviceId: "leaf-02", command: "nv set interface swp1-32 qos roce" },
          { deviceId: "leaf-02", command: "nv config apply" },
          { deviceId: "leaf-01", command: "nv config save" },
        ],
      },
      {
        title: "Verify DSCP trust, ECN, and PFC state",
        details: "Read back each QoS component on leaf-01 and check swp1's per-interface QoS view.",
        commands: [
          { deviceId: "leaf-01", command: "nv show qos trust dscp-map" },
          { deviceId: "leaf-01", command: "nv show qos ecn profile roce" },
          { deviceId: "leaf-01", command: "nv show qos pfc" },
          { deviceId: "leaf-01", command: "nv show interface swp1 qos" },
        ],
      },
      {
        title: "Validate host-side RDMA performance and latency",
        details: "Confirm the DGX MTU/device view, then run bandwidth and latency checks.",
        commands: [
          { deviceId: "dgx-node-01", command: "ibv_devinfo -d mlx5_0" },
          { deviceId: "dgx-node-01", command: "ip link show eth0" },
          {
            deviceId: "dgx-node-01",
            command: "ib_write_bw -d mlx5_0 --iters 5000 --size 65536 192.168.100.2",
          },
          {
            deviceId: "dgx-node-01",
            command: "ib_write_lat -d mlx5_0 --iters 10000 192.168.100.2",
          },
        ],
      },
    ],
  },
  "lab18-ecn-threshold-tuning": {
    labId: "lab18-ecn-threshold-tuning",
    title: "Step-by-step command guide",
    steps: [
      {
        title: "Inspect the current ECN profile and buffer headroom",
        details: "Compare the configured ECN thresholds against available switch buffer capacity.",
        commands: [
          { deviceId: "leaf-01", command: "nv show qos ecn profile roce" },
          { deviceId: "leaf-01", command: "cl-resource-query" },
        ],
      },
      {
        title: "Generate load from the DGX node",
        details: "Start one bandwidth stream per mlx5 device to exercise the queue under load.",
        commands: [
          {
            deviceId: "dgx-node-01",
            command: "ib_write_bw -d mlx5_0 --iters 10000 --size 65536 192.168.100.2 &",
          },
          {
            deviceId: "dgx-node-01",
            command: "ib_write_bw -d mlx5_1 --iters 10000 --size 65536 192.168.100.2 &",
          },
          {
            deviceId: "dgx-node-01",
            command: "ib_write_bw -d mlx5_2 --iters 10000 --size 65536 192.168.100.2 &",
          },
          {
            deviceId: "dgx-node-01",
            command: "ib_write_bw -d mlx5_3 --iters 10000 --size 65536 192.168.100.2 &",
          },
        ],
      },
      {
        title: "Lower the ECN min threshold and widen the marking range",
        details: "Apply a 500 KB / 1.5 MB profile and commit it to the switch.",
        commands: [
          { deviceId: "leaf-01", command: "nv set qos ecn profile roce min-threshold 500000" },
          { deviceId: "leaf-01", command: "nv set qos ecn profile roce max-threshold 1500000" },
          { deviceId: "leaf-01", command: "nv config apply" },
          { deviceId: "leaf-01", command: "nv config save" },
        ],
      },
      {
        title: "Verify ECN marking is now active",
        details: "Re-read the ECN profile and confirm CE marks/counters are incrementing.",
        commands: [
          { deviceId: "leaf-01", command: "nv show qos ecn profile roce" },
          { deviceId: "leaf-01", command: "ethtool -S swp1 | grep ecn" },
          { deviceId: "leaf-01", command: "nv show interface swp1 counters" },
        ],
      },
    ],
  },
};

export function getSolutionGuide(labId: string): SolutionGuide | undefined {
  return SOLUTION_GUIDES[labId];
}
