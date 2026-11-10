import { format, parseISO } from 'date-fns';
import {
  Appointment,
  AppointmentStatus,
  BlockedSlot,
  BusinessConfig,
  Professional,
  Service
} from '../types';

export const timeToMinutes = (time: string): number => {
  if (!time || !time.includes(':')) return 0;
  const [h, m] = time.split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
};

export const minutesToTime = (minutes: number): string => {
  const safe = Math.max(0, Math.floor(minutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const isDateInBlockedSlot = (targetDate: string, block: BlockedSlot): boolean => {
  if (!targetDate || !block?.date) return false;
  const startDate = block.date.trim();
  if (!startDate) return false;
  const rawEnd = block.endDate ? block.endDate.trim() : '';
  const endDate = rawEnd && rawEnd >= startDate ? rawEnd : startDate;
  return targetDate >= startDate && targetDate <= endDate;
};

export interface BlockedSlotConflict {
  block: BlockedSlot;
  reason?: string;
  message: string;
}

export const findBlockedSlotConflict = (
  date: string,
  time: string,
  durationMinutes: number,
  professionalId: string,
  blockedSlots: BlockedSlot[] = [],
  professionals: Professional[] = []
): BlockedSlotConflict | null => {
  if (!date || !time || !Array.isArray(blockedSlots) || blockedSlots.length === 0) {
    return null;
  }

  const startMin = timeToMinutes(time);
  const safeDuration = Math.max(1, Number(durationMinutes) || 60);
  const endMin = startMin + safeDuration;

  for (const block of blockedSlots) {
    if (!block || !isDateInBlockedSlot(date, block)) continue;
    if (block.professionalId !== 'ALL' && professionalId && block.professionalId !== professionalId) {
      continue;
    }

    const blockStart = timeToMinutes(block.time || '00:00');
    const blockDuration = Math.max(1, Number(block.durationMinutes) || 1440);
    const blockEnd = blockStart + blockDuration;

    if (startMin < blockEnd && endMin > blockStart) {
      const proName =
        block.professionalId === 'ALL'
          ? 'Todo o Salão'
          : professionals.find(p => p.id === block.professionalId)?.name || 'Profissional selecionado';
      const isFullDay = blockDuration >= 1440 || (blockStart === 0 && blockEnd >= 1440);
      const periodText = isFullDay ? 'Dia Inteiro' : `${block.time} (${blockDuration} min)`;
      const reasonText = block.reason?.trim() ? ` • Justificativa: ${block.reason.trim()}` : '';

      return {
        block,
        reason: block.reason?.trim() || undefined,
        message: `Horário bloqueado (${proName} — ${periodText})${reasonText}`
      };
    }
  }

  return null;
};

export const getDayBlockInfo = (
  targetDate: string,
  businessConfig?: BusinessConfig,
  professionalId?: string | null
): { isBlocked: boolean; blockReason?: string; blocks: BlockedSlot[] } => {
  if (!targetDate || !businessConfig) {
    return { isBlocked: false, blocks: [] };
  }

  const blockedSlots = Array.isArray(businessConfig.blockedSlots) ? businessConfig.blockedSlots : [];
  const relevantBlocks = blockedSlots.filter(
    b =>
      isDateInBlockedSlot(targetDate, b) &&
      (b.professionalId === 'ALL' || !professionalId || b.professionalId === professionalId)
  );

  if (relevantBlocks.length === 0) {
    return { isBlocked: false, blocks: [] };
  }

  const dateObj = parseISO(targetDate);
  const dayOfWeek = dateObj.getDay();
  const schedule = businessConfig.days?.[dayOfWeek];
  const workStart = schedule?.start ? timeToMinutes(schedule.start) : 8 * 60;
  const workEnd = schedule?.end ? timeToMinutes(schedule.end) : 18 * 60;

  const fullDayBlock = relevantBlocks.find(b => {
    const bStart = timeToMinutes(b.time || '00:00');
    const bDur = Math.max(1, Number(b.durationMinutes) || 1440);
    const bEnd = bStart + bDur;
    return bDur >= 1440 || (bStart <= workStart && bEnd >= workEnd);
  });

  const firstReason =
    fullDayBlock?.reason?.trim() ||
    relevantBlocks.map(b => b.reason?.trim()).find(Boolean) ||
    undefined;

  return {
    isBlocked: Boolean(fullDayBlock),
    blockReason: firstReason,
    blocks: relevantBlocks
  };
};

export interface AvailableSlotsCalculationResult {
  availableTimeSlots: string[];
  dayIsClosed: boolean;
  dayIsBlocked: boolean;
  blockReason?: string;
}

export const calculateCoincidentAvailableSlots = (params: {
  date: string;
  professionalId?: string | null;
  totalDuration: number;
  appointments: Appointment[];
  services: Service[];
  businessConfig: BusinessConfig;
  excludeAppointmentId?: string;
}): AvailableSlotsCalculationResult => {
  const {
    date,
    professionalId,
    totalDuration,
    appointments,
    services,
    businessConfig,
    excludeAppointmentId
  } = params;

  if (!date || !professionalId || totalDuration <= 0) {
    return { availableTimeSlots: [], dayIsClosed: false, dayIsBlocked: false };
  }

  const dateObj = parseISO(date);
  const dayOfWeek = dateObj.getDay();
  const schedule = businessConfig.days?.[dayOfWeek];

  if (!schedule || !schedule.isOpen) {
    return { availableTimeSlots: [], dayIsClosed: true, dayIsBlocked: false };
  }

  const workStart = timeToMinutes(schedule.start);
  const workEnd = timeToMinutes(schedule.end);

  const hasLunch = schedule.hasLunch;
  const lunchStart = hasLunch ? timeToMinutes(schedule.lunchStart) : -1;
  const lunchEnd = hasLunch ? timeToMinutes(schedule.lunchEnd) : -1;

  const blockedSlots = Array.isArray(businessConfig?.blockedSlots) ? businessConfig.blockedSlots : [];
  const relevantBlocks = blockedSlots.filter(
    b =>
      isDateInBlockedSlot(date, b) &&
      (b.professionalId === 'ALL' || b.professionalId === professionalId)
  );

  const fullDayBlock = relevantBlocks.find(b => {
    const bStart = timeToMinutes(b.time || '00:00');
    const bDur = Math.max(1, Number(b.durationMinutes) || 1440);
    const bEnd = bStart + bDur;
    return bDur >= 1440 || (bStart <= workStart && bEnd >= workEnd);
  });

  const blockReason =
    fullDayBlock?.reason?.trim() ||
    relevantBlocks.map(b => b.reason?.trim()).find(Boolean) ||
    undefined;

  if (fullDayBlock) {
    return {
      availableTimeSlots: [],
      dayIsClosed: false,
      dayIsBlocked: true,
      blockReason
    };
  }

  const stepMinutes = 30;
  const serviceDuration = totalDuration;

  const proAppointments = appointments.filter(
    apt =>
      apt.professionalId === professionalId &&
      apt.date === date &&
      apt.id !== excludeAppointmentId &&
      apt.status !== AppointmentStatus.CANCELLED
  );

  const baseBusyIntervals = proAppointments.map(apt => {
    const ids = apt.serviceId ? apt.serviceId.split(',') : [];
    const aptServices = services.filter(s => ids.includes(s.id));
    const duration =
      aptServices.length > 0
        ? aptServices.reduce((sum, s) => sum + Number(s.durationMinutes), 0)
        : 60;
    const start = timeToMinutes(apt.time);
    return { start, end: start + duration };
  });

  if (hasLunch && lunchStart < lunchEnd) {
    baseBusyIntervals.push({ start: lunchStart, end: lunchEnd });
  }

  const blockIntervals = relevantBlocks.map(b => {
    const start = timeToMinutes(b.time || '00:00');
    return { start, end: start + Math.max(1, Number(b.durationMinutes) || 1440) };
  });

  const allBusyIntervals = [...baseBusyIntervals, ...blockIntervals];

  const slots: string[] = [];
  const slotsWithoutBlocks: string[] = [];
  const now = new Date();
  const currentDateStr = format(now, 'yyyy-MM-dd');
  const isTodayDate = date === currentDateStr;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (let time = workStart; time < workEnd; time += stepMinutes) {
    const slotStart = time;
    if (isTodayDate && slotStart <= currentMinutes) {
      continue;
    }

    const slotEnd = time + serviceDuration;
    if (slotEnd > workEnd) continue;

    const isBusyBase = baseBusyIntervals.some(busy => slotStart < busy.end && slotEnd > busy.start);
    if (!isBusyBase) {
      slotsWithoutBlocks.push(minutesToTime(time));
    }

    const isBusyAll = allBusyIntervals.some(busy => slotStart < busy.end && slotEnd > busy.start);
    if (!isBusyAll) {
      slots.push(minutesToTime(time));
    }
  }

  const dayIsBlocked =
    relevantBlocks.length > 0 && slots.length === 0 && slotsWithoutBlocks.length > 0;

  return {
    availableTimeSlots: slots,
    dayIsClosed: false,
    dayIsBlocked,
    blockReason
  };
};

export const DEFAULT_SERVICE_GROUP = 'Outros Serviços';

export const groupServicesByGroup = (services: Service[] = []) => {
  const groups = new Map<string, Service[]>();
  const safeServices = Array.isArray(services) ? services : [];

  safeServices.forEach(service => {
    const groupName = service?.groupName?.trim() || DEFAULT_SERVICE_GROUP;
    const groupedServices = groups.get(groupName) || [];
    groupedServices.push(service);
    groups.set(groupName, groupedServices);
  });

  const entries = Array.from(groups, ([groupName, groupedServices]) => ({
    groupName,
    items: groupedServices,
    services: groupedServices,
  }));

  return entries.sort((a, b) => {
    if (a.groupName === DEFAULT_SERVICE_GROUP) return 1;
    if (b.groupName === DEFAULT_SERVICE_GROUP) return -1;
    return a.groupName.localeCompare(b.groupName, 'pt-BR');
  });
};

export const isVariablePriceService = (service?: Partial<Service> | null): boolean => {
  return service?.priceType === 'variable';
};

export const formatServicePrice = (service?: Partial<Service> | null): string => {
  if (isVariablePriceService(service)) {
    return 'Valor a combinar';
  }
  return `R$ ${Number(service?.price || 0).toFixed(2)}`;
};

export const formatServicesTotalPrice = (
  selectedServices: Partial<Service>[],
  customTotal?: number | string | null
): string => {
  if (customTotal !== null && customTotal !== undefined && String(customTotal).trim() !== '') {
    const num = Number(customTotal);
    if (Number.isFinite(num)) {
      return `R$ ${num.toFixed(2)}`;
    }
  }

  const hasVariable = selectedServices.some(isVariablePriceService);
  const fixedSum = selectedServices
    .filter(s => !isVariablePriceService(s))
    .reduce((sum, s) => sum + Number(s.price || 0), 0);

  if (hasVariable && fixedSum > 0) {
    return `R$ ${fixedSum.toFixed(2)} + a combinar`;
  }
  if (hasVariable) {
    return 'Valor a combinar (sob avaliação)';
  }
  return `R$ ${fixedSum.toFixed(2)}`;
};

export const calculateAppointmentRevenue = (
  aptServices: Partial<Service>[],
  customTotal?: number | string | null
): number => {
  if (customTotal !== null && customTotal !== undefined && String(customTotal).trim() !== '') {
    const num = Number(customTotal);
    if (Number.isFinite(num)) {
      return num;
    }
  }
  return aptServices
    .filter(s => !isVariablePriceService(s))
    .reduce((sum, s) => sum + Number(s.price || 0), 0);
};

export const formatCurrencyMask = (value: number | string | null | undefined): string => {
  const num = typeof value === 'number' ? value : Number(value || 0);
  const safeNum = Number.isFinite(num) ? num : 0;
  return `R$ ${safeNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const parseCurrencyMask = (rawValue: string): number => {
  const digits = rawValue.replace(/\D/g, '').slice(0, 11);
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
};

