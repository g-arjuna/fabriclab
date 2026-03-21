"use client";

import { useTopologyStore } from "@/store/topology";

type LabStatusProps = {
  labTitle: string;
};

export default function LabStatus({ labTitle }: LabStatusProps) {
  const pfcEnabled = useTopologyStore((state) => state.pfcEnabled);
  const hasVerified = useTopologyStore((state) => state.hasVerified);
  const attempts = useTopologyStore((state) => state.attempts);
  const mistakeCount = useTopologyStore((state) => state.mistakeCount);

  const labCompleted = pfcEnabled === false && hasVerified === true;
  const labStatus =
    labCompleted === false ? "none" : mistakeCount === 0 ? "success" : "warning";
  const needsVerification = pfcEnabled === false && hasVerified === false;
  const showHint = attempts >= 3 && labCompleted === false;
  const showStrongHint = attempts >= 5 && labCompleted === false;

  return (
    <>
      <p className="mt-4 text-sm font-medium text-gray-900">{`Lab: ${labTitle}`}</p>
      {needsVerification ? (
        <p className="mt-4 text-base font-medium text-amber-600">
          {"Configuration changed. Please verify using 'show dcb pfc'"}
        </p>
      ) : null}
      {labStatus === "success" ? (
        <p className="mt-4 text-base font-medium text-green-600">
          Lab Completed!
        </p>
      ) : null}
      {labStatus === "warning" ? (
        <p className="mt-4 text-base font-medium text-amber-600">
          Lab Completed with mistakes
        </p>
      ) : null}
      {showStrongHint ? (
        <p className="mt-4 text-base text-blue-700">
          {"Hint: Try disabling PFC using 'disable pfc'"}
        </p>
      ) : null}
      {showHint && showStrongHint === false ? (
        <p className="mt-4 text-base text-blue-700">
          Hint: You may need to change the configuration before verifying.
        </p>
      ) : null}
    </>
  );
}
