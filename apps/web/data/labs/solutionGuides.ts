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
  "lab0a-fabric-cli-orientation": {
    labId: "lab0a-fabric-cli-orientation",
    title: "Step-by-step command guide",
    steps: [
      {
        title: "Read the rail-to-endpoint map from UFM",
        details: "Start with the fabric-wide view so Rail 0 and Rail 1 are anchored to the exact DGX and switch interfaces before you inspect each endpoint.",
        commands: [{ deviceId: "ufm-server", command: "show ufm topology" }],
      },
      {
        title: "Map DGX HCAs to Linux netdev names",
        details: "Use ibstat for the mlx5 HCA inventory, then use rdma link show to confirm mlx5_0 maps to eth0 and mlx5_1 maps to eth1.",
        commands: [
          { deviceId: "dgx-node-01", command: "ibstat" },
          { deviceId: "dgx-node-01", command: "rdma link show" },
        ],
      },
      {
        title: "Verify eth0 and eth1 from the Linux network stack",
        details: "Check each Linux netdev separately, then read per-port NIC counters to confirm both links are up and clean.",
        commands: [
          { deviceId: "dgx-node-01", command: "ip link show eth0" },
          { deviceId: "dgx-node-01", command: "ip link show eth1" },
          { deviceId: "dgx-node-01", command: "ethtool -S eth0" },
          { deviceId: "dgx-node-01", command: "ethtool -S eth1" },
        ],
      },
      {
        title: "Verify swp1 on each rail leaf with NVUE",
        details: "Move to each Cumulus leaf and confirm swp1 is up and connected to the expected DGX HCA/netdev on that rail.",
        commands: [
          { deviceId: "leaf-rail0", command: "nv show interface swp1 link" },
          { deviceId: "leaf-rail1", command: "nv show interface swp1 link" },
        ],
      },
    ],
  },
  "lab0b-roce-counter-reading": {
    labId: "lab0b-roce-counter-reading",
    title: "Step-by-step command guide",
    steps: [
      {
        title: "Confirm the RoCE/PFC/ECN profile on swp1",
        details: "Start on the Cumulus leaf and verify the lossless RoCE profile, PFC priority, and traffic-class mapping before generating traffic.",
        commands: [
          { deviceId: "leaf-rail0", command: "nv show interface swp1 qos roce status" },
        ],
      },
      {
        title: "Run a short DGX bandwidth probe",
        details: "Generate one controlled RDMA write workload so the counters have a meaningful under-load snapshot to inspect.",
        commands: [
          {
            deviceId: "dgx-node-01",
            command: "ib_write_bw -d mlx5_0 --iters 5000 --size 65536 192.168.100.2",
          },
        ],
      },
      {
        title: "Read switch-side PFC and RoCE counters",
        details: "Check whether swp1 sees modest PFC backpressure, non-zero ECN-marked RoCE packets, and zero no-buffer-discard.",
        commands: [
          {
            deviceId: "leaf-rail0",
            command: "nv show interface swp1 counters qos pfc-stats",
          },
          {
            deviceId: "leaf-rail0",
            command: "nv show interface swp1 qos roce counters",
          },
        ],
      },
      {
        title: "Read host-side NIC counters",
        details: "Confirm the DGX NIC agrees with the switch-side picture: ECN marks may be present, but physical drops stay at zero.",
        commands: [{ deviceId: "dgx-node-01", command: "ethtool -S eth0" }],
      },
    ],
  },
  "lab0-failed-rail": {
    labId: "lab0-failed-rail",
    title: "Step-by-step command guide",
    steps: [
      {
        title: "Identify the failed rail and interface mapping in UFM",
        details: "Use the UFM topology view to map Rail 3 to leaf-rail3 swp5 and DGX mlx5_3 / eth3.",
        commands: [{ deviceId: "ufm-server", command: "show ufm topology" }],
      },
      {
        title: "Confirm the DGX-side RDMA and NIC view",
        details: "Check whether the DGX host still sees mlx5_3 / eth3 as active even though Rail 3 is failing.",
        commands: [
          { deviceId: "dgx-node-a", command: "rdma link show" },
          { deviceId: "dgx-node-a", command: "ethtool -S eth3" },
        ],
      },
      {
        title: "Inspect leaf-rail3 swp5 with NVUE",
        details: "Use the rail-to-port mapping from UFM to inspect the Cumulus leaf interface and confirm the linkflap/protodown fault.",
        commands: [{ deviceId: "leaf-rail3", command: "nv show interface swp5 link" }],
      },
    ],
  },
  "lab1-pfc-fix": {
    labId: "lab1-pfc-fix",
    title: "Step-by-step command guide",
    steps: [
      {
        title: "Confirm the DGX NIC is seeing loss",
        details: "Read the ConnectX counters before changing the switch so the root-cause evidence is captured.",
        commands: [{ deviceId: "dgx-node-a", command: "ethtool -S eth0" }],
      },
      {
        title: "Inspect RoCE/PFC state on swp1 from Cumulus NVUE",
        details: "Confirm the global RoCE profile and per-interface PFC state are not active on the DGX-facing downlink.",
        commands: [
          { deviceId: "spectrum-sw", command: "nv show qos roce" },
          { deviceId: "spectrum-sw", command: "nv show interface swp1 qos pfc" },
        ],
      },
      {
        title: "Enable RoCE lossless and verify swp1 PFC state/counters",
        details: "Stage the RoCE profile, apply it, then verify swp1 PFC state and the per-priority PFC counters.",
        commands: [
          { deviceId: "spectrum-sw", command: "nv set qos roce" },
          { deviceId: "spectrum-sw", command: "nv config apply" },
          { deviceId: "spectrum-sw", command: "nv show interface swp1 qos pfc" },
          {
            deviceId: "spectrum-sw",
            command: "nv show interface swp1 counters qos pfc-stats",
          },
        ],
      },
    ],
  },
  "lab2-congestion": {
    labId: "lab2-congestion",
    title: "Step-by-step command guide",
    steps: [
      {
        title: "Confirm congestion symptoms on the host and the switch downlink",
        details: "Read the DGX NIC counters and the swp1 PFC pause counters to confirm congestion is being absorbed by PFC pauses rather than drops.",
        commands: [
          { deviceId: "dgx-node-a", command: "ethtool -S eth0" },
          {
            deviceId: "spectrum-sw",
            command: "nv show interface swp1 counters qos pfc-stats",
          },
        ],
      },
      {
        title: "Inspect and stage ECN for RoCE traffic class 3",
        details: "Check the congestion-control profile, then enable ECN marking on traffic class 3.",
        commands: [
          {
            deviceId: "spectrum-sw",
            command: "nv show qos congestion-control default-global",
          },
          {
            deviceId: "spectrum-sw",
            command:
              "nv set qos congestion-control default-global traffic-class 3 ecn enabled",
          },
          { deviceId: "spectrum-sw", command: "nv config apply" },
        ],
      },
      {
        title: "Verify TC3 ECN state and host-side CE marks",
        details: "Re-read the TC3 congestion-control state and confirm the DGX NIC is now receiving ECN-marked packets with lower PFC pause pressure.",
        commands: [
          {
            deviceId: "spectrum-sw",
            command: "nv show qos congestion-control default-global traffic-class 3",
          },
          { deviceId: "dgx-node-a", command: "ethtool -S eth0" },
        ],
      },
    ],
  },
  "lab3-uneven-spine": {
    labId: "lab3-uneven-spine",
    title: "Step-by-step command guide",
    steps: [
      {
        title: "Compare leaf uplink and spine downlink counters",
        details: "Check whether swp51/swp52 are carrying most traffic while swp53/swp54 and Spine 3/4 are nearly idle.",
        commands: [
          { deviceId: "leaf-sw", command: "nv show interface swp51 link stats" },
          { deviceId: "leaf-sw", command: "nv show interface swp53 link stats" },
          { deviceId: "spine-1", command: "nv show interface swp1 link stats" },
          { deviceId: "spine-3", command: "nv show interface swp1 link stats" },
        ],
      },
      {
        title: "Inspect and enable adaptive routing on all leaf ECMP uplinks",
        details: "Confirm adaptive routing is off, stage it on swp51-swp54, and apply the NVUE config.",
        commands: [
          { deviceId: "leaf-sw", command: "nv show router adaptive-routing" },
          {
            deviceId: "leaf-sw",
            command: "nv show interface swp51 router adaptive-routing",
          },
          {
            deviceId: "leaf-sw",
            command: "nv set interface swp51 router adaptive-routing enable on",
          },
          {
            deviceId: "leaf-sw",
            command: "nv set interface swp52 router adaptive-routing enable on",
          },
          {
            deviceId: "leaf-sw",
            command: "nv set interface swp53 router adaptive-routing enable on",
          },
          {
            deviceId: "leaf-sw",
            command: "nv set interface swp54 router adaptive-routing enable on",
          },
          { deviceId: "leaf-sw", command: "nv config apply" },
        ],
      },
      {
        title: "Recheck the spine counters",
        details: "Verify Spine 1 and Spine 3 now see comparable swp1 load after adaptive routing is enabled.",
        commands: [
          { deviceId: "spine-1", command: "nv show interface swp1 link stats" },
          { deviceId: "spine-3", command: "nv show interface swp1 link stats" },
        ],
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
          { deviceId: "workstation", command: "cat proposal-a.txt" },
          { deviceId: "workstation", command: "cat proposal-b.txt" },
        ],
      },
      {
        title: "Calculate each oversubscription ratio",
        details: "Turn the proposal specs into a numerical comparison.",
        commands: [
          { deviceId: "workstation", command: "python3 fabric-sizing.py --proposal a" },
          { deviceId: "workstation", command: "python3 fabric-sizing.py --proposal b" },
        ],
      },
      {
        title: "Compare and submit the recommendation",
        details: "Use the comparison output, then submit the proposal that keeps the fabric non-blocking.",
        commands: [
          { deviceId: "workstation", command: "python3 fabric-sizing.py --compare" },
          { deviceId: "workstation", command: "python3 fabric-sizing.py --recommend a" },
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
        details: "Run all_reduce_perf with NCCL_DEBUG=INFO and inspect whether NCCL is using socket or NET/IB transport.",
        commands: [
          {
            deviceId: "dgx-node-a",
            command:
              "NCCL_DEBUG=INFO mpirun -np 128 -N 8 /opt/nccl-tests/build/all_reduce_perf -b 8G -e 8G -f 2 -g 1",
          },
        ],
      },
      {
        title: "Verify RDMA devices and NCCL environment variables",
        details: "Compare the RDMA interfaces to the NCCL environment settings.",
        commands: [
          { deviceId: "dgx-node-a", command: "rdma link show" },
          { deviceId: "dgx-node-a", command: "env | grep '^NCCL_'" },
        ],
      },
      {
        title: "Fix NCCL transport selection and rerun validation",
        details: "Point NCCL at the mlx5 RDMA HCAs and the management socket interface, then rerun the same benchmark.",
        commands: [
          {
            deviceId: "dgx-node-a",
            command:
              "export NCCL_IB_HCA=mlx5_0:1,mlx5_1:1,mlx5_2:1,mlx5_3:1,mlx5_4:1,mlx5_5:1,mlx5_6:1,mlx5_7:1",
          },
          { deviceId: "dgx-node-a", command: "export NCCL_SOCKET_IFNAME=eno1" },
          {
            deviceId: "dgx-node-a",
            command:
              "NCCL_DEBUG=INFO mpirun -np 128 -N 8 /opt/nccl-tests/build/all_reduce_perf -b 8G -e 8G -f 2 -g 1",
          },
        ],
      },
    ],
  },
  "lab6-alert-triage": {
    labId: "lab6-alert-triage",
    title: "Step-by-step command guide",
    steps: [
      {
        title: "Pull UFM high-BER ports and inspect the suspect leaf",
        details: "Use UFM's REST API to identify the active port flagged for high BER and confirm its peer mapping.",
        commands: [
          {
            deviceId: "ufm-server",
            command:
              "curl -ks 'https://ufm-server/ufmRest/resources/ports?high_ber_only=true&active=true'",
          },
          {
            deviceId: "ufm-server",
            command:
              "curl -ks 'https://ufm-server/ufmRest/resources/ports?system=leaf-rail5&active=true'",
          },
        ],
      },
      {
        title: "Correlate the GPU, NIC, and switch-side symptoms",
        details: "Read DCGM and NIC counters on the DGX, then confirm the swp7 link and PFC/FEC counters on the Cumulus leaf.",
        commands: [
          {
            deviceId: "dgx-node-a",
            command: "dcgmi dmon -i 5 -c 1 -e 1001,1004,1005",
          },
          { deviceId: "dgx-node-a", command: "ethtool -S eth5" },
          { deviceId: "leaf-rail5", command: "nv show interface swp7 link" },
          { deviceId: "leaf-rail5", command: "ethtool -S swp7" },
          {
            deviceId: "leaf-rail5",
            command: "nv show interface swp7 counters qos pfc-stats",
          },
        ],
      },
      {
        title: "Reseat the suspect DAC from the Physical Infra panel",
        details: "Open the Physical Infra panel in the left sidebar and run the leaf-rail5 swp7 connector reseat workflow there so the UFM CLI stays reserved for UFM API commands.",
        commands: [],
      },
    ],
  },
  "lab7-pause-storm": {
    labId: "lab7-pause-storm",
    title: "Step-by-step command guide",
    steps: [
      {
        title: "Compare switch and NIC counters",
        details: "The switch-side PFC frame count on swp1 looks mild, so compare it with the DGX NIC's received pause-frame counter.",
        commands: [
          {
            deviceId: "spectrum-sw",
            command: "nv show interface swp1 counters qos pfc-stats",
          },
          { deviceId: "dgx-node-a", command: "ethtool -S eth0" },
        ],
      },
      {
        title: "Check TC3 ECN state and enable ECN",
        details: "Verify TC3 ECN is disabled, stage ECN marking for RoCE traffic class 3, and apply the config.",
        commands: [
          {
            deviceId: "spectrum-sw",
            command: "nv show qos congestion-control default-global traffic-class 3",
          },
          {
            deviceId: "spectrum-sw",
            command:
              "nv set qos congestion-control default-global traffic-class 3 ecn enabled",
          },
          { deviceId: "spectrum-sw", command: "nv config apply" },
        ],
      },
      {
        title: "Verify the storm has cleared",
        details: "Confirm TC3 ECN is now on and the DGX NIC's priority-3 pause counter has dropped to a small backstop level.",
        commands: [
          {
            deviceId: "spectrum-sw",
            command: "nv show qos congestion-control default-global traffic-class 3",
          },
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
        details: "Check swp1 PFC priority, then compare it with the RoCE DSCP-to-switch-priority mapping.",
        commands: [
          { deviceId: "spectrum-sw", command: "nv show interface swp1 qos pfc" },
          { deviceId: "spectrum-sw", command: "nv show qos roce" },
        ],
      },
      {
        title: "Apply the RoCE QoS profile and verify PFC priority 3",
        details: "Stage the RoCE lossless profile, commit it, then confirm swp1 PFC priority and NIC drops.",
        commands: [
          { deviceId: "spectrum-sw", command: "nv set qos roce" },
          { deviceId: "spectrum-sw", command: "nv config apply" },
          { deviceId: "spectrum-sw", command: "nv show interface swp1 qos pfc" },
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
        title: "Map Rail 2 and compare host vs switch state",
        details: "Use UFM's mapping hint, then compare the DGX host view with leaf-rail2 swp3 state.",
        commands: [
          { deviceId: "ufm-server", command: "show ufm topology" },
          { deviceId: "dgx-node-a", command: "ibstat" },
          { deviceId: "leaf-rail2", command: "nv show interface swp3 link" },
        ],
      },
      {
        title: "Replace the optic and clear linkflap protodown",
        details: "Use the Physical Infra panel to replace the OSFP on leaf-rail2 swp3, then clear the linkflap protodown state with Linux `ip link` commands on the switch.",
        commands: [
          {
            deviceId: "leaf-rail2",
            command: "sudo ip link set swp3 protodown_reason linkflap off",
          },
          {
            deviceId: "leaf-rail2",
            command: "sudo ip link set swp3 protodown off",
          },
        ],
      },
      {
        title: "Verify recovery on both sides",
        details: "Confirm swp3 is no longer protodown and the DGX RDMA view is clean.",
        commands: [
          { deviceId: "leaf-rail2", command: "nv show interface swp3 link" },
          { deviceId: "dgx-node-a", command: "rdma link show" },
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
          { deviceId: "workstation", command: "netq show ecmp" },
          { deviceId: "spineB", command: "nv show interface swp54 link stats" },
        ],
      },
      {
        title: "Inspect BGP route weighting and bandwidth community state",
        details: "Check the route choice from the leaf and the advertised bandwidth metadata from spineB.",
        commands: [
          {
            deviceId: "leaf1",
            command: "nv show vrf default router bgp address-family ipv4-unicast route 10.4.0.0/16",
          },
          { deviceId: "spineB", command: "nv show router policy route-map UCMP-LEAF4 rule 10 set" },
        ],
      },
      {
        title: "Set the link-bandwidth community and verify weighted ECMP",
        details: "Advertise the higher spineB bandwidth, then verify the route detail and post-fix counters.",
        commands: [
          {
            deviceId: "spineB",
            command: "nv set router policy route-map UCMP-LEAF4 rule 10 set ext-community-bw multipaths",
          },
          { deviceId: "spineB", command: "nv config apply" },
          {
            deviceId: "leaf1",
            command: "nv show vrf default router bgp address-family ipv4-unicast route 10.4.0.0/16",
          },
          { deviceId: "spineB", command: "nv show interface swp54 link stats" },
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
          { deviceId: "workstation", command: "netq check bgp" },
          {
            deviceId: "leaf1",
            command: "nv show vrf default router bgp address-family ipv4-unicast route 10.2.0.0/16",
          },
        ],
      },
      {
        title: "Inspect the spine ASN mismatch",
        details: "Check SpineA's route view and its peering state toward SpineB.",
        commands: [
          {
            deviceId: "spineA",
            command: "nv show vrf default router bgp address-family ipv4-unicast route 10.2.0.0/16",
          },
          { deviceId: "spineA", command: "nv show vrf default router bgp neighbor 10.0.0.2" },
          { deviceId: "spineB", command: "nv show interface swp4 link stats" },
        ],
      },
      {
        title: "Normalize spine ASNs and verify the leaf post-fix route",
        details: "Move both spines to ASN 65000 and re-read the corrected route from leaf1.",
        commands: [
          { deviceId: "spineA", command: "nv set router bgp autonomous-system 65000" },
          { deviceId: "spineA", command: "nv config apply" },
          { deviceId: "spineB", command: "nv set router bgp autonomous-system 65000" },
          { deviceId: "spineB", command: "nv config apply" },
          {
            deviceId: "leaf1",
            command: "nv show vrf default router bgp address-family ipv4-unicast route 10.2.0.0/16",
          },
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
          { deviceId: "leaf-rackb", command: "show isis segment-routing srv6 node" },
          { deviceId: "rackb-node01", command: "ping -6 2001:db8:0:spine02::1 -c 3" },
          { deviceId: "rackb-node01", command: "ping -6 2001:db8:0:spine03::1 -c 3" },
          { deviceId: "rackb-node01", command: "ping -6 2001:db8:0:lsrv::100 -c 3" },
        ],
      },
      {
        title: "Build the segment list, SR-TE policy, and BGP color route-map",
        details: "Install the explicit waypoint path and color the storage BGP route to select policy color 100.",
        commands: [
          {
            deviceId: "leaf-rackb",
            command: "sudo vtysh -f /etc/frr/checkpoint-segment-list.conf",
          },
          { deviceId: "leaf-rackb", command: "show sr-te segment-list" },
          {
            deviceId: "leaf-rackb",
            command: "sudo vtysh -f /etc/frr/checkpoint-srte-policy.conf",
          },
          {
            deviceId: "leaf-rackb",
            command: "sudo vtysh -f /etc/frr/checkpoint-color-route-map.conf",
          },
          { deviceId: "leaf-rackb", command: "show route-map SET_SR_POLICY" },
        ],
      },
      {
        title: "Verify checkpoint steering and confirm spine-01 is clean",
        details: "Traceroute to the storage prefix should follow spine-02/spine-03, while spine-01 sees no checkpoint SRH packets.",
        commands: [
          { deviceId: "rackb-node01", command: "traceroute 10.100.0.1" },
          { deviceId: "spine-01", command: "sudo tcpdump -ni swp1 'ip6 and ip6[6] == 43' -c 20" },
          { deviceId: "rackb-node01", command: "traceroute 10.20.0.11" },
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
          { deviceId: "tenanta-node", command: "ibv_devinfo -d mlx5_0 -i 1" },
          { deviceId: "security-harness", command: "show mr info" },
          { deviceId: "security-harness", command: "show gid filter" },
        ],
      },
      {
        title: "Reproduce the cross-tenant exposure from Tenant B",
        details: "Run the scan from Tenant B to confirm the leaked rkey can be discovered.",
        commands: [
          { deviceId: "tenantb-node", command: "ibv_devinfo -d mlx5_0" },
          { deviceId: "tenantb-node", command: "ibv_rc_pingpong -d mlx5_0 -g 1" },
          { deviceId: "security-harness", command: "rkey scan" },
        ],
      },
      {
        title: "Enable host-side protection and rotate the rkey",
        details: "Turn on GID filtering, rotate the MR key, then inspect the MR metadata again.",
        commands: [
          { deviceId: "security-harness", command: "enable gid filter" },
          { deviceId: "security-harness", command: "ibv_reg_mr rotate" },
          { deviceId: "security-harness", command: "show mr info after" },
        ],
      },
      {
        title: "Enforce tenant isolation in UFM and verify the attack is blocked",
        details: "Assign separate P_Keys, confirm the UFM table, then rerun the scan from Tenant B.",
        commands: [
          {
            deviceId: "ufm-server",
            command: "curl -ks -X PUT 'https://ufm-server/ufmRest/resources/pkeys/0x8001/guids/506b4b0300a1b200'",
          },
          {
            deviceId: "ufm-server",
            command: "curl -ks -X PUT 'https://ufm-server/ufmRest/resources/pkeys/0x8002/guids/506b4b0300a1b202'",
          },
          {
            deviceId: "ufm-server",
            command: "curl -ks 'https://ufm-server/ufmRest/resources/pkeys/0x8001'",
          },
          {
            deviceId: "ufm-server",
            command: "curl -ks 'https://ufm-server/ufmRest/resources/pkeys/0x8002'",
          },
          { deviceId: "security-harness", command: "rkey scan" },
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
          { deviceId: "leaf-01", command: "cat /etc/lsb-release" },
          { deviceId: "leaf-01", command: "nv show platform" },
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
          { deviceId: "leaf-01", command: "sudo cl-netstat" },
        ],
      },
      {
        title: "Check MTU and BGP baseline, then submit the audit report",
        details: "Verify jumbo-MTU readiness and a clean BGP baseline, then close out the lab with the audit submission command.",
        commands: [
          { deviceId: "leaf-01", command: "ip -br link show | grep swp" },
          { deviceId: "leaf-01", command: "nv show router bgp" },
          { deviceId: "audit-desk", command: "submit audit report" },
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
        details: "Stage the global NVUE RoCE profile on each leaf switch, apply it, then save the startup config on leaf-01.",
        commands: [
          { deviceId: "leaf-01", command: "nv set qos roce" },
          { deviceId: "leaf-01", command: "nv config apply" },
          { deviceId: "leaf-02", command: "nv set qos roce" },
          { deviceId: "leaf-02", command: "nv config apply" },
          { deviceId: "leaf-01", command: "nv config save" },
        ],
      },
      {
        title: "Verify DSCP trust, ECN, and PFC state",
        details: "Read back RoCE queue mapping, ECN thresholds, PFC state, and swp1 counters on leaf-01.",
        commands: [
          { deviceId: "leaf-01", command: "nv show qos roce prio-map" },
          { deviceId: "leaf-01", command: "nv show interface swp1 qos roce status" },
          { deviceId: "leaf-01", command: "nv show interface swp1 qos pfc" },
          { deviceId: "leaf-01", command: "nv show interface swp1 qos" },
          { deviceId: "leaf-01", command: "nv show interface swp1 counters qos pfc-stats" },
          { deviceId: "leaf-01", command: "nv show interface swp1 qos roce counters" },
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
            command: "ethtool -S eth0 | grep -E 'ecn|pfc|retry'",
          },
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
          { deviceId: "leaf-01", command: "nv show interface swp1 qos roce status" },
          { deviceId: "leaf-01", command: "nv show interface swp1 qos roce status pool-map" },
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
          {
            deviceId: "leaf-01",
            command:
              "nv set qos congestion-control default-global traffic-class 3 min-threshold 500000",
          },
          {
            deviceId: "leaf-01",
            command:
              "nv set qos congestion-control default-global traffic-class 3 max-threshold 1500000",
          },
          { deviceId: "leaf-01", command: "nv config apply" },
          { deviceId: "leaf-01", command: "nv config save" },
        ],
      },
      {
        title: "Verify ECN marking is now active",
        details: "Re-read the ECN profile and confirm CE marks/counters are incrementing.",
        commands: [
          { deviceId: "leaf-01", command: "nv show interface swp1 qos roce status" },
          { deviceId: "leaf-01", command: "nv show interface swp1 qos roce counters" },
          { deviceId: "leaf-01", command: "nv show interface swp1 counters qos pfc-stats" },
        ],
      },
    ],
  },
  "lab19-adaptive-routing-imbalance": {
    labId: "lab19-adaptive-routing-imbalance",
    title: "Step-by-step command guide",
    steps: [
      {
        title: "Confirm AR is not actually running in the intended mode",
        details: "Start on leaf-01 and verify the active AR mode, then inspect the detailed utilization spread that shows the fabric is still badly imbalanced.",
        commands: [
          { deviceId: "leaf-01", command: "nv show router adaptive-routing" },
          { deviceId: "leaf-01", command: "nv show router adaptive-routing detail" },
        ],
      },
      {
        title: "Check the DGX B200 reorder-buffer prerequisite",
        details: "Move to the DGX host and verify that the BF3 SuperNIC reorder buffer is disabled, which blocks per-packet AR from staying active.",
        commands: [
          {
            deviceId: "dgx-node-01",
            command: "mlxlink -d /dev/mst/mt41692_pciconf0 --show_module | grep -i reorder",
          },
          {
            deviceId: "dgx-node-01",
            command: "mlxconfig -d /dev/mst/mt41692_pciconf0 q ROCE_REORDER_BUFFER_SIZE",
          },
          { deviceId: "dgx-node-01", command: "nv show interface eth0 reorder-buffer" },
          { deviceId: "dgx-node-01", command: "nv show interface eth1 reorder-buffer" },
        ],
      },
      {
        title: "Enable BF3 reorder on both DGX uplinks",
        details: "Turn reorder on for eth0 and eth1, then apply the DGX-side configuration so the host is ready for per-packet AR.",
        commands: [
          { deviceId: "dgx-node-01", command: "nv set interface eth0 reorder-buffer enable" },
          { deviceId: "dgx-node-01", command: "nv set interface eth1 reorder-buffer enable" },
          { deviceId: "dgx-node-01", command: "nv config apply" },
        ],
      },
      {
        title: "Return the fabric to per-packet AR and verify balance",
        details: "Switch leaf-01 back to per-packet mode, apply the config, then validate that the standard deviation and benchmark throughput now pass.",
        commands: [
          { deviceId: "leaf-01", command: "nv set router adaptive-routing mode per-packet" },
          { deviceId: "leaf-01", command: "nv config apply" },
          { deviceId: "leaf-01", command: "nv show router adaptive-routing detail" },
          {
            deviceId: "dgx-node-01",
            command: "ib_write_bw -d mlx5_0 -x 3 --report_gbits -D 30 -q 16 10.100.1.2",
          },
        ],
      },
    ],
  },
};

export function getSolutionGuide(labId: string): SolutionGuide | undefined {
  return SOLUTION_GUIDES[labId];
}
