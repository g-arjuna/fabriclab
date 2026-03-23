import type { DeviceType } from '@/types'

export const DEVICE_COMMANDS: Record<DeviceType, string[]> = {
  dgx: [
    'ibstat',
    'rdma link show',
    'show proposal a',
    'show proposal b',
    'nccl-debug --transport',
    'show nccl env',
    'run nccl-tests',
    'calculate oversubscription a',
    'calculate oversubscription b',
    'compare proposals',
    'recommend proposal a',
    'recommend proposal b',
    'recommend proposal',
    'set nccl ib-hca',
    'set nccl socket-ifname',
    'show topology',
    'show rdma links',
    'ethtool -S eth0',
    'help',
    'hint',
  ],
  'leaf-switch': [
    'show dcb pfc',
    'show dcb ets',
    'show dcb load-balance',
    'show interface counters',
    'show roce',
    'show switch port rail0',
    'show switch port rail1',
    'show switch port rail2',
    'show switch port rail3',
    'show switch port rail4',
    'show switch port rail5',
    'show switch port rail6',
    'show switch port rail7',
    'show interfaces ib status',
    'show ib counters',
    'disable pfc',
    'enable pfc',
    'enable ecn',
    'enable load-balance per-packet',
    'disable ecn',
    'clear counters',
    'help',
    'hint',
  ],
  'spine-switch': [
    'show interface counters',
    'show interfaces ib status',
    'show ib counters',
    'show ib sm',
    'help',
    'hint',
  ],
  'ufm-server': [
    'show topology',
    'show rdma links',
    'help',
  ],
}

export function getDeviceCommands(deviceType: DeviceType): string[] {
  return DEVICE_COMMANDS[deviceType] ?? []
}

export function isCommandAllowedOnDevice(
  command: string,
  deviceType: DeviceType,
): boolean {
  const allowed = DEVICE_COMMANDS[deviceType] ?? []
  const normalised = command.trim().toLowerCase()
  return allowed.some(
    (candidate) =>
      candidate.toLowerCase() === normalised
      || normalised.startsWith(candidate.toLowerCase()),
  )
}

export const DEVICE_PROMPTS: Record<DeviceType, string> = {
  dgx: 'dgx-node:~$',
  'leaf-switch': 'leaf-switch #',
  'spine-switch': 'spine-switch #',
  'ufm-server': 'ufm-server $',
}

export const DEVICE_OS_LABELS: Record<DeviceType, string> = {
  dgx: 'DGX OS (Ubuntu 22.04)',
  'leaf-switch': 'Cumulus Linux / Spectrum-X',
  'spine-switch': 'ONYX 3.11',
  'ufm-server': 'UFM 6.8',
}
