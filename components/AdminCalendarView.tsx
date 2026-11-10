import React, { useState, useMemo } from 'react';
import {
    format,
    addMonths,
    subMonths,
    eachDayOfInterval,
    endOfMonth,
    parseISO,
    isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    User,
    MessageCircle,
    Pencil,
    FileText,
    Lock
} from 'lucide-react';
import { Appointment, AppointmentStatus, Service, Professional, BusinessConfig } from '../types';
import { Badge } from './Shared';
import { isDateInBlockedSlot, timeToMinutes, formatServicesTotalPrice } from '../services/serviceGroups';

const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface AdminCalendarViewProps {
    appointments: Appointment[];
    services: Service[];
    professionals: Professional[];
    businessConfig: BusinessConfig;
    onEdit: (apt: Appointment) => void;
    onMessage: (apt: Appointment) => void;
}

export const AdminCalendarView: React.FC<AdminCalendarViewProps> = ({
    appointments,
    services,
    professionals,
    businessConfig,
    onEdit,
    onMessage
}) => {
    const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => new Date());
    const [selectedDate, setSelectedDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));

    const sortedApts = useMemo(() => {
        return appointments
            .filter(a => a.status !== AppointmentStatus.CANCELLED)
            .sort((a, b) => {
                const dateA = parseISO(`${a.date}T${a.time || '00:00'}`);
                const dateB = parseISO(`${b.date}T${b.time || '00:00'}`);
                return dateA.getTime() - dateB.getTime();
            });
    }, [appointments]);

    const appointmentsByDate = useMemo(() => {
        const map: Record<string, Appointment[]> = {};
        for (const apt of sortedApts) {
            if (!map[apt.date]) map[apt.date] = [];
            map[apt.date].push(apt);
        }
        return map;
    }, [sortedApts]);

    const navigatePrevious = () => {
        const prev = subMonths(currentMonthDate, 1);
        setCurrentMonthDate(prev);
        setSelectedDate(format(new Date(prev.getFullYear(), prev.getMonth(), 1), 'yyyy-MM-dd'));
    };

    const navigateNext = () => {
        const next = addMonths(currentMonthDate, 1);
        setCurrentMonthDate(next);
        setSelectedDate(format(new Date(next.getFullYear(), next.getMonth(), 1), 'yyyy-MM-dd'));
    };

    const navigateToday = () => {
        const now = new Date();
        setCurrentMonthDate(now);
        setSelectedDate(format(now, 'yyyy-MM-dd'));
    };

    const statusColors: Record<string, string> = {
        [AppointmentStatus.PENDING]: 'bg-yellow-400',
        [AppointmentStatus.CONFIRMED]: 'bg-green-500',
        [AppointmentStatus.IN_PROGRESS]: 'bg-purple-500',
        [AppointmentStatus.COMPLETED]: 'bg-blue-500',
        [AppointmentStatus.CANCELLED]: 'bg-red-500',
    };

    const { leadingEmptyDays, monthDays } = useMemo(() => {
        const year = currentMonthDate.getFullYear();
        const monthIndex = currentMonthDate.getMonth();
        const start = new Date(year, monthIndex, 1);
        const end = endOfMonth(start);
        const days = eachDayOfInterval({ start, end });
        const blockedSlots = Array.isArray(businessConfig?.blockedSlots) ? businessConfig.blockedSlots : [];

        const mappedDays = days.map(d => {
            const val = format(d, 'yyyy-MM-dd');
            const dayOfWeek = d.getDay();
            const schedule = businessConfig.days?.[dayOfWeek];
            const isClosed = !schedule || !schedule.isOpen;

            const dayBlocks = blockedSlots.filter(b => isDateInBlockedSlot(val, b));
            const workStart = schedule?.start ? timeToMinutes(schedule.start) : 8 * 60;
            const workEnd = schedule?.end ? timeToMinutes(schedule.end) : 18 * 60;
            const hasFullOrPartialBlock = dayBlocks.length > 0;
            const fullBlock = dayBlocks.find(b => {
                const bStart = timeToMinutes(b.time || '00:00');
                const bDur = Math.max(1, Number(b.durationMinutes) || 1440);
                return bDur >= 1440 || (bStart <= workStart && bStart + bDur >= workEnd);
            });
            const blockReason =
                fullBlock?.reason?.trim() ||
                dayBlocks.map(b => b.reason?.trim()).find(Boolean) ||
                undefined;

            return {
                dateObj: d,
                val,
                dayNumber: format(d, 'dd'),
                weekdayShort: WEEKDAYS_SHORT[dayOfWeek],
                isClosed,
                isTodayDate: isToday(d),
                isBlockedDay: hasFullOrPartialBlock,
                blockReason,
                dayBlocks,
                apts: appointmentsByDate[val] || []
            };
        });

        return {
            leadingEmptyDays: start.getDay(),
            monthDays: mappedDays
        };
    }, [currentMonthDate, businessConfig, appointmentsByDate]);

    const selectedDayInfo = useMemo(() => {
        return monthDays.find(d => d.val === selectedDate) || null;
    }, [monthDays, selectedDate]);

    const selectedDayApts = useMemo(() => {
        return appointmentsByDate[selectedDate] || [];
    }, [appointmentsByDate, selectedDate]);

    const renderAppointmentCard = (apt: Appointment) => {
        const ids = apt.serviceId ? apt.serviceId.split(',') : [];
        const aptServices = services.filter(s => ids.includes(s.id));
        const serviceName = aptServices.map(s => s.name).join(', ') || 'Outro';
        const pro = professionals.find(p => p.id === apt.professionalId);

        return (
            <div key={apt.id} className="flex gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 transition-all group">
                <div className="flex flex-col items-center justify-center shrink-0 w-16 border-r border-slate-200 pr-4">
                    <span className="text-lg font-bold text-primary-600">{apt.time}</span>
                    <span className={`w-3 h-3 rounded-full mt-2 ${statusColors[apt.status] || 'bg-slate-300'}`}></span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                        <div>
                            <h4 className="font-bold text-slate-900 text-base">{apt.userName}</h4>
                            <p className="text-sm text-slate-600 mt-0.5">{serviceName}</p>
                            <p className="text-xs font-bold text-primary-600 mt-0.5">{formatServicesTotalPrice(aptServices, apt.totalPrice)}</p>
                        </div>
                        <Badge color={
                            apt.status === AppointmentStatus.CONFIRMED ? 'green' :
                            apt.status === AppointmentStatus.COMPLETED ? 'blue' :
                            apt.status === AppointmentStatus.CANCELLED ? 'red' : 'gray'
                        }>{apt.status}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500">
                        {pro && (
                            <span className="flex items-center gap-1.5 font-medium"><User size={14} className="text-slate-400" /> {pro.name}</span>
                        )}
                        {apt.clientPhone && (
                            <span className="flex items-center gap-1.5 font-medium"><MessageCircle size={14} className="text-slate-400" /> {apt.clientPhone}</span>
                        )}
                    </div>
                    {apt.observations && (
                        <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                            <FileText size={14} className="text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-800 leading-relaxed">{apt.observations}</p>
                        </div>
                    )}
                </div>
                <div className="flex flex-col gap-2 shrink-0 justify-center">
                    <button onClick={() => onEdit(apt)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer" title="Editar / Reagendar">
                        <Pencil size={16} />
                    </button>
                    <button onClick={() => onMessage(apt)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors cursor-pointer" title="Enviar WhatsApp">
                        <MessageCircle size={16} />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 font-sans animate-in fade-in duration-300">
            {/* Toolbar do Calendário */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-3 md:p-4 rounded-2xl border border-slate-100 shadow-sm gap-4">
                <div className="flex items-center gap-2">
                    <button onClick={navigatePrevious} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer">
                        <ChevronLeft size={18} />
                    </button>
                    <button onClick={navigateToday} className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer">
                        Hoje
                    </button>
                    <button onClick={navigateNext} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer">
                        <ChevronRight size={18} />
                    </button>

                    <div className="ml-2 font-serif font-bold text-lg text-slate-800 capitalize">
                        {format(currentMonthDate, "MMMM 'de' yyyy", { locale: ptBR })}
                    </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary-600"></span> Selecionado
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Bloqueado
                    </span>
                </div>
            </div>

            {/* Grade Mensal Semanal Unificada */}
            <div className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-6 shadow-sm space-y-4">
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {WEEKDAYS_SHORT.map(day => (
                        <div key={day} className="py-1.5 text-center text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {Array.from({ length: leadingEmptyDays }).map((_, idx) => (
                        <div key={`empty-${idx}`} className="h-20 sm:h-24 rounded-2xl bg-slate-50/40 border border-transparent" />
                    ))}

                    {monthDays.map(d => {
                        const isSelected = selectedDate === d.val;
                        const isBlockedDay = d.isBlockedDay;
                        const showBlocked = isSelected && isBlockedDay;

                        let cardClasses = 'bg-slate-50 border-slate-200/80 text-slate-800 hover:bg-slate-100 hover:border-slate-300';
                        if (showBlocked) {
                            cardClasses = 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20 scale-[1.02]';
                        } else if (isSelected) {
                            cardClasses = 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-500/15 scale-[1.02]';
                        } else if (isBlockedDay) {
                            cardClasses = 'bg-amber-50/90 border-amber-300 text-amber-900 hover:bg-amber-100/80';
                        } else if (d.isClosed) {
                            cardClasses = 'bg-slate-100/70 border-slate-200/60 text-slate-400 hover:bg-slate-100';
                        }

                        return (
                            <button
                                key={d.val}
                                type="button"
                                onClick={() => setSelectedDate(d.val)}
                                className={`h-20 sm:h-24 rounded-2xl border p-1.5 sm:p-2 text-center flex flex-col items-center justify-between transition-all duration-200 cursor-pointer relative ${cardClasses}`}
                            >
                                <div className="w-full flex items-center justify-between px-0.5">
                                    <span className={`text-[9px] sm:text-[10px] uppercase font-semibold tracking-wider ${
                                        showBlocked ? 'text-amber-100' :
                                        isSelected ? 'text-primary-100' :
                                        isBlockedDay ? 'text-amber-700' : 'text-slate-400'
                                    }`}>
                                        {d.weekdayShort}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        {isBlockedDay && (
                                            <Lock size={11} className={showBlocked ? 'text-white' : 'text-amber-600'} />
                                        )}
                                        {d.apts.length > 0 && (
                                            <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full ${
                                                isSelected
                                                    ? 'bg-white/25 text-white'
                                                    : 'bg-primary-100 text-primary-700'
                                            }`}>
                                                {d.apts.length}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="text-base sm:text-xl font-extrabold leading-none">
                                    {d.dayNumber}
                                </div>

                                <div className="min-h-[14px] flex items-center justify-center">
                                    {showBlocked ? (
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-white">
                                            Bloqueado
                                        </span>
                                    ) : d.isClosed && !isBlockedDay ? (
                                        <span className={`text-[9px] font-bold uppercase ${isSelected ? 'text-white/80' : 'text-red-400'}`}>
                                            Fechado
                                        </span>
                                    ) : d.isTodayDate && !isSelected ? (
                                        <span className="text-[9px] font-bold uppercase text-primary-600">
                                            Hoje
                                        </span>
                                    ) : null}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Painel de aviso de bloqueio quando o dia clicado estiver bloqueado */}
                {selectedDayInfo?.isBlockedDay && (
                    <div className="p-4 sm:p-5 bg-amber-50 rounded-2xl border border-amber-200 space-y-2 animate-in fade-in">
                        <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                            <Lock size={16} className="text-amber-600 shrink-0" />
                            <span>Data com Bloqueio Administrativo</span>
                        </div>
                        <div className="space-y-1.5 text-xs text-amber-800">
                            {selectedDayInfo.dayBlocks.map(b => {
                                const proLabel = b.professionalId === 'ALL'
                                    ? 'Todo o Salão'
                                    : professionals.find(p => p.id === b.professionalId)?.name || 'Profissional';
                                const isFull = Number(b.durationMinutes) >= 1440;
                                return (
                                    <div key={b.id} className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold">
                                            • {proLabel} ({isFull ? 'Dia Inteiro' : `${b.time} - ${b.durationMinutes} min`})
                                        </span>
                                        {b.reason && (
                                            <span className="bg-amber-100/90 border border-amber-300/80 text-amber-900 font-semibold px-2.5 py-0.5 rounded-lg">
                                                Justificativa: {b.reason}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Listagem de Agendamentos do Dia Selecionado */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                <h3 className="text-lg font-serif font-bold text-slate-800 mb-6 flex items-center gap-2 capitalize">
                    <CalendarIcon size={20} className="text-primary-500" />
                    Agenda de {format(parseISO(selectedDate), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </h3>

                {selectedDayApts.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <CalendarIcon size={22} className="text-slate-300" />
                        </div>
                        <p className="text-slate-500 text-sm font-medium">Nenhum agendamento para este dia.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {selectedDayApts.map(apt => renderAppointmentCard(apt))}
                    </div>
                )}
            </div>
        </div>
    );
};
