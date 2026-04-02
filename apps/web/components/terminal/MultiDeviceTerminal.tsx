'use client'

import { useEffect, useRef } from 'react'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal as XTerm } from '@xterm/xterm'

import { handleCommand } from '@/components/terminal/commandHandler'
import { useLabStore } from '@/store/labStore'
import type { DeviceType, LabDevice } from '@/types'

interface Props {
  devices: LabDevice[]
  labTitle: string
}

const DEVICE_THEME: Record<
  DeviceType,
  { bg: string; fg: string; prompt: string; accent: string }
> = {
  dgx: { bg: '#0a1a0f', fg: '#e2e8f0', prompt: '#4ade80', accent: '#22c55e' },
  'leaf-switch': {
    bg: '#0a0f1a',
    fg: '#e2e8f0',
    prompt: '#60a5fa',
    accent: '#3b82f6',
  },
  'spine-switch': {
    bg: '#0d0a1a',
    fg: '#e2e8f0',
    prompt: '#a78bfa',
    accent: '#8b5cf6',
  },
  'ufm-server': {
    bg: '#1a100a',
    fg: '#e2e8f0',
    prompt: '#fbbf24',
    accent: '#f59e0b',
  },
}

function hexToAnsiColor(hex: string): string {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!match) return '\x1b[37m'
  const [, red, green, blue] = match
  return `\x1b[38;2;${parseInt(red, 16)};${parseInt(green, 16)};${parseInt(blue, 16)}m`
}

function DeviceTerminalPane({
  device,
  isVisible,
  labTitle,
}: {
  device: LabDevice
  isVisible: boolean
  labTitle: string
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const termRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const inputBufferRef = useRef('')
  const initialised = useRef(false)
  const appendToDeviceHistory = useLabStore((state) => state.appendToDeviceHistory)
  const theme = DEVICE_THEME[device.type]

  useEffect(() => {
    if (!containerRef.current || initialised.current) return

    let resizeObserver: ResizeObserver | null = null
    let disposable: { dispose: () => void } | null = null
    let handleInsert: ((event: Event) => void) | null = null

    const timeoutId = window.setTimeout(() => {
      if (!containerRef.current || initialised.current) return

      const terminal = new XTerm({
        cursorBlink: true,
        fontFamily: 'JetBrains Mono, Menlo, monospace',
        fontSize: 13,
        theme: {
          background: theme.bg,
          foreground: theme.fg,
          cursor: theme.accent,
        },
      })
      const fitAddon = new FitAddon()
      terminal.loadAddon(fitAddon)
      terminal.open(containerRef.current)

      requestAnimationFrame(() => {
        fitAddon.fit()
      })

      initialised.current = true
      termRef.current = terminal
      fitAddonRef.current = fitAddon

      terminal.writeln(`\x1b[1m${device.label}\x1b[0m`)
      terminal.writeln(`\x1b[2m${device.osLabel} · Lab: ${labTitle}\x1b[0m`)
      terminal.writeln(`\x1b[2mType 'help' for available commands. Type 'hint' if stuck.\x1b[0m`)
      terminal.writeln('')

      const writePrompt = () => {
        terminal.write(`${hexToAnsiColor(theme.prompt)}${device.prompt}\x1b[0m `)
      }
      writePrompt()

      handleInsert = (event: Event) => {
        const customEvent = event as CustomEvent<{ command: string; deviceId?: string }>
        if (customEvent.detail.deviceId && customEvent.detail.deviceId !== device.id) return
        const command = customEvent.detail.command
        while (inputBufferRef.current.length > 0) {
          inputBufferRef.current = inputBufferRef.current.slice(0, -1)
          terminal.write('\b \b')
        }
        inputBufferRef.current = command
        terminal.write(command)
      }
      window.addEventListener('insert-command', handleInsert as EventListener)

      disposable = terminal.onData((data) => {
        if (data === '\r') {
          const input = inputBufferRef.current.trim()
          terminal.write('\r\n')

          if (input.length > 0) {
            appendToDeviceHistory(device.id, {
              type: 'input',
              text: input,
              timestamp: Date.now(),
            })

            const output = handleCommand(input, device.id, device.type)
            const colorised = coloriseOutput(output)
            terminal.write(colorised + '\r\n')

            appendToDeviceHistory(device.id, {
              type: 'output',
              text: output,
              timestamp: Date.now(),
            })
          }

          inputBufferRef.current = ''
          writePrompt()
          return
        }

        if (data === '\u0008' || data === '\u007f') {
          if (inputBufferRef.current.length > 0) {
            inputBufferRef.current = inputBufferRef.current.slice(0, -1)
            terminal.write('\b \b')
          }
          return
        }

        if (/[\x20-\x7e]/.test(data)) {
          inputBufferRef.current += data
          terminal.write(data)
        }
      })

      resizeObserver = new ResizeObserver(() => fitAddon.fit())
      resizeObserver.observe(containerRef.current)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
      if (handleInsert) {
        window.removeEventListener('insert-command', handleInsert as EventListener)
      }
      disposable?.dispose()
      resizeObserver?.disconnect()
      termRef.current?.dispose()
      termRef.current = null
      fitAddonRef.current = null
      initialised.current = false
    }
  }, [appendToDeviceHistory, device, labTitle, theme])

  useEffect(() => {
    if (isVisible && fitAddonRef.current) {
      requestAnimationFrame(() => {
        fitAddonRef.current?.fit()
      })
    }
  }, [isVisible])

  return <div ref={containerRef} className="h-full w-full" />
}

function coloriseOutput(output: string): string {
  return output
    .split('\n')
    .map((line) => {
      if (line.startsWith('WARNING') || line.startsWith('ERROR:')) return `\x1b[33m${line}\x1b[0m`
      if (line.startsWith('[HINT]')) return `\x1b[36m${line}\x1b[0m`
      if (line.includes('Did you mean:')) {
        return `\x1b[37m${line.replace(/Did you mean: .+\?/, (match) => `\x1b[36m${match}\x1b[0m`)}\x1b[0m`
      }
      if (line.startsWith('Command not available')) return `\x1b[33m${line}\x1b[0m`
      return `\x1b[37m${line}\x1b[0m`
    })
    .join('\r\n')
}

export function MultiDeviceTerminal({ devices, labTitle }: Props) {
  const activeDeviceId = useLabStore((state) => state.activeDeviceId)
  const deviceSessions = useLabStore((state) => state.deviceSessions)
  const setActiveDevice = useLabStore((state) => state.setActiveDevice)
  const openDeviceSession = useLabStore((state) => state.openDeviceSession)

  const openSessionIds = Object.keys(deviceSessions)

  useEffect(() => {
    if (devices.length === 0) return

    const firstDevice = devices[0]
    const firstSessionOpen = deviceSessions[firstDevice.id] !== undefined

    if (!firstSessionOpen) {
      openDeviceSession(firstDevice.id)
    }

    if (activeDeviceId === null) {
      setActiveDevice(firstDevice.id)
    }
  }, [activeDeviceId, deviceSessions, devices, openDeviceSession, setActiveDevice])

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0f1a]">
      <div className="flex flex-shrink-0 items-center gap-0.5 overflow-x-auto border-b border-white/10 bg-slate-950 px-2 py-1.5">
        {devices.map((device) => {
          const hasSession = deviceSessions[device.id] !== undefined
          const isActive = activeDeviceId === device.id
          const theme = DEVICE_THEME[device.type]

          return (
            <button
              key={device.id}
              type="button"
              onClick={() => {
                if (!hasSession) {
                  openDeviceSession(device.id)
                }
                setActiveDevice(device.id)
              }}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-all"
              style={{
                backgroundColor: isActive ? theme.bg : 'transparent',
                border: `1px solid ${isActive ? `${theme.accent}55` : 'transparent'}`,
                color: isActive ? theme.fg : '#64748b',
                opacity: hasSession || isActive ? 1 : 0.6,
              }}
              title={hasSession ? `Switch to ${device.label}` : `Open ${device.label} terminal`}
            >
              <span
                className="h-2 w-2 flex-shrink-0 rounded-full transition-colors"
                style={{
                  backgroundColor: isActive
                    ? theme.accent
                    : hasSession
                    ? `${theme.accent}88`
                    : '#374151',
                }}
              />
              <span className="font-medium">{device.label}</span>
              <span
                className="rounded px-1 py-0.5 text-[9px]"
                style={{
                  backgroundColor: isActive ? `${theme.accent}22` : 'transparent',
                  color: isActive ? theme.accent : '#475569',
                }}
              >
                {device.osLabel}
              </span>
              {!hasSession && (
                <span className="text-[9px] text-slate-600">+</span>
              )}
            </button>
          )
        })}
      </div>

      <div className="relative flex-1 min-h-0">
        {openSessionIds.map((sessionId) => {
          const device = devices.find((item) => item.id === sessionId)
          if (!device) return null
          return (
            <div
              key={sessionId}
              className="absolute inset-0 p-3"
              style={{
                visibility: activeDeviceId === sessionId ? 'visible' : 'hidden',
              }}
            >
              <DeviceTerminalPane
                device={device}
                isVisible={activeDeviceId === sessionId}
                labTitle={labTitle}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MultiDeviceTerminal
