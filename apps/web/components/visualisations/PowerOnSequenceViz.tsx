"use client"

import { useState } from "react"

interface PowerOnStep {
  step: number
  device: string
  action: string
  duration: string
  detail: string
  warning?: string
  color: string
}

const steps: PowerOnStep[] = [
  {
    step: 1,
    device: "OOB Management switches",
    action: "Power on 1GbE management network",
    duration: "~2 min",
    detail: "The out-of-band management switches and BMC ports must be reachable before anything else. This gives you console access and power control over every device even if the device has not booted yet. If this comes up last, you are blind during bring-up.",
    color: "#374151",
  },
  {
    step: 2,
    device: "Spine switches (Q3400)",
    action: "Power on InfiniBand spine switches",
    duration: "~4 min",
    detail: "Spine switches boot first because the fabric needs its backbone before edge devices connect. ONYX loads, ASICs initialise, and the Subnet Manager may start here if configured as the primary SM location. You see the boot sequence via console cable.",
    color: "#4c1d95",
  },
  {
    step: 3,
    device: "Leaf switches (QM9700)",
    action: "Power on InfiniBand leaf switches",
    duration: "~3 min",
    detail: "Leaf switches connect upward to spine and will connect outward to DGX nodes. Once both spine and leaf are up, the switch-only fabric is intact. No LID assignments yet — no compute endpoints have connected.",
    color: "#1e3a5f",
  },
  {
    step: 4,
    device: "UFM server",
    action: "Start Unified Fabric Manager",
    duration: "~5 min",
    detail: "UFM starts its discovery process, finds the switches, and builds the initial topology map. LID assignment cannot begin until compute nodes connect. If UFM is not running when nodes boot, the Fabric Manager daemon on each node will enter a retry loop.",
    warning: "UFM must be running before DGX nodes complete boot. If nodes boot first, FM retries but the first job submission may fail while FM initialises.",
    color: "#78350f",
  },
  {
    step: 5,
    device: "DGX H100 nodes",
    action: "Power on compute nodes",
    duration: "~12 min",
    detail: "DGX nodes take the longest to boot: BIOS POST, UEFI firmware, Ubuntu kernel, NVIDIA drivers, NVSwitch initialisation, Fabric Manager daemon start. When FM starts, it registers each ConnectX-7 NIC with UFM. UFM assigns LIDs and programs switch forwarding tables. Training jobs can begin after FM confirms fabric initialisation.",
    color: "#14532d",
  },
  {
    step: 6,
    device: "Validation",
    action: "Verify fabric health before starting jobs",
    duration: "~10 min",
    detail: "Run ibdiagnet from a management host to check for link errors, LID assignment issues, and routing table consistency. Check nvidia-smi on each node to confirm GPU visibility. Check ibstat to confirm all NICs are Active. Only submit jobs after validation passes.",
    color: "#065f46",
  },
]

export function PowerOnSequenceViz() {
  const [activeStep, setActiveStep] = useState<number | null>(null)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  const handleStep = (stepNum: number) => {
    if (activeStep === stepNum) {
      setActiveStep(null)
    } else {
      setActiveStep(stepNum)
      setCompletedSteps(prev => {
        const next = new Set(prev)
        // Mark all previous steps as complete when you click a later step
        for (let i = 1; i < stepNum; i++) next.add(i)
        return next
      })
    }
  }

  const reset = () => {
    setActiveStep(null)
    setCompletedSteps(new Set())
  }

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs uppercase tracking-widest text-slate-500">
          First power-on sequence — click each step
        </p>
        <button onClick={reset} className="text-xs text-slate-600 hover:text-slate-400 transition">
          Reset
        </button>
      </div>

      <div className="space-y-2">
        {steps.map(s => {
          const isActive = activeStep === s.step
          const isDone = completedSteps.has(s.step)

          return (
            <div key={s.step}>
              <button
                onClick={() => handleStep(s.step)}
                className="w-full text-left rounded-xl px-4 py-3 transition-all flex items-start gap-4"
                style={{
                  backgroundColor: isActive ? s.color + "44" : isDone ? s.color + "22" : "#0f172a",
                  border: `1px solid ${isActive ? s.color : isDone ? s.color + "44" : "#1e293b"}`,
                }}
              >
                {/* Step number / checkmark */}
                <div
                  className="flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                  style={{
                    backgroundColor: isDone ? s.color : isActive ? s.color : "#0f172a",
                    border: `2px solid ${s.color}`,
                    color: isDone || isActive ? "#fff" : s.color,
                  }}
                >
                  {isDone && !isActive ? "✓" : s.step}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{s.device}</div>
                      <div className="text-sm font-medium text-white mt-0.5">{s.action}</div>
                    </div>
                    <span className="text-xs text-slate-600 flex-shrink-0 mt-0.5">{s.duration}</span>
                  </div>

                  {isActive && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm leading-7 text-slate-300">{s.detail}</p>
                      {s.warning && (
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                          <span className="font-semibold">⚠ Warning: </span>{s.warning}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </button>
            </div>
          )
        })}
      </div>

      <p className="mt-4 text-xs text-slate-600 text-center">
        Total bring-up time from cold: approximately 35–40 minutes
      </p>
    </div>
  )
}

export default PowerOnSequenceViz
