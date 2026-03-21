export function formatConditionLabel(key: string): string {
  const labels: Record<string, string> = {
    pfcDisabled: "PFC Disabled",
    pfcVerified: "PFC Verified",
    ecnEnabled: "ECN Enabled",
    ecnVerified: "ECN Verified",
    congestionChecked: "Congestion Checked",
  };

  return labels[key] ?? key;
}
