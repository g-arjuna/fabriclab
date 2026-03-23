export function formatConditionLabel(key: string): string {
  const labels: Record<string, string> = {
    railIdentified: "Rail identified",
    linkConfirmed: "Link state confirmed",
    faultIsolated: "Fault isolated to switch port",
    pfcMissing: "PFC absence confirmed",
    pfcEnabled: "PFC enabled on switch",
    pfcVerified: "PFC verified with show dcb pfc",
    pfcDisabled: "PFC disabled",
    ecnEnabled: "ECN enabled",
    ecnVerified: "ECN verified",
    congestionChecked: "Congestion pattern identified",
    spineChecked: "Spine utilisation checked",
    lbModeIdentified: "Load balancing mode identified",
    lbEnabled: "Per-packet load balancing enabled",
    spineVerified: "Spine utilisation verified (balanced)",
    transportChecked: "NCCL transport identified",
    rdmaDevicesChecked: "RDMA devices verified",
    envVarIdentified: "Misconfigured env variable found",
    hcaFixed: "NCCL_IB_HCA corrected",
    socketFixed: "NCCL_SOCKET_IFNAME corrected",
    ncclVerified: "NCCL busbw verified (RDMA active)",
    proposalAInspected: "Proposal A inspected",
    proposalBInspected: "Proposal B inspected",
    oversubscriptionCalculated: "Oversubscription calculated",
    correctProposalIdentified: "Correct proposal identified",
  };

  return labels[key] ?? key;
}
