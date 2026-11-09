import React, { useState, useMemo } from 'react';
import { 
    format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, 
    startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, 
    isSameDay, isSameMonth, parseISO, isToday 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, Scissors, MessageCircle, Pencil, FileText } from 'lucide-react';
import { Appointment, AppointmentStatus, Service, Professional, BusinessConfig } from '../types';
import { Badge } from './Shared';

interface AdminCalendarViewProps {
    appointments: Appointment[];
    services: Service[];
    professionals: Professional[];
    businessConfig: BusinessConfig;
    onEdit: (apt: Appointment) => void;
    onMessage: (apt: Appointment) => void;
}

export const AdminCalendarView: React.FC<AdminCalendarViewProps> = ({ 
    appointments, services, professionals, businessConfig, onEdit, onMessage 
}) => {
    const [viewType, setViewType] = useState<'month' | 'week' | 'day'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());

    const sortedApts = useMemo(() => {
        return appointments
            .filter(a => a.status !== AppointmentStatus.CANCELLED)
            .sort((a, b) => {
                const dateA = parseISO(`${a.date}T${a.time || '00:00'}`);
                const dateB = parseISO(`${b.date}T${b.time || '00:00'}`);
                return dateA.getTime() - dateB.getTime();
            });
    }, [appointments]);

    const navigatePrevious = () => {
        if (viewType === 'month') setCurrentDate(subMonths(currentDate, 1));
        if (viewType === 'week') setCurrentDate(subWeeks(currentDate, 1));
        if (viewType === 'day') setCurrentDate(subDays(currentDate, 1));
    };

    const navigateNext = () => {
        if (viewType === 'month') setCurrentDate(addMonths(currentDate, 1));
        if (viewType === 'week') setCurrentDate(addWeeks(currentDate, 1));
        if (viewType === 'day') setCurrentDate(addDays(currentDate, 1));
    };

    const navigateToday = () => {
        setCurrentDate(new Date());
    };

    const getAppointmentsForDate = (date: Date) => {
        return sortedApts.filter(apt => isSameDay(parseISO(apt.date), date));
    };

    const statusColors: Record<string, string> = {
        [AppointmentStatus.PENDING]: 'bg-yellow-400',
        [AppointmentStatus.CONFIRMED]: 'bg-green-500',
        [AppointmentStatus.COMPLETED]: 'bg-blue-500',
        [AppointmentStatus.CANCELLED]: 'bg-red-500',
    };

    const renderMonthView = () => {
        const start = startOfWeek(startOfMonth(currentDate));
        const end = endOfWeek(endOfMonth(currentDate));
        const days = eachDayOfInterval({ start, end });

        const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

        return (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
                    {weekDays.map(day => (
                        <div key={day} className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 auto-rows-fr">
                    {days.map((day, idx) => {
                        const dayApts = getAppointmentsForDate(day);
                        const isCurrentMonth = isSameMonth(day, currentDate);
                        const isTodayDate = isToday(day);

                        return (
                            <div 
                                key={day.toString()} 
                                onClick={() => {
                                    setCurrentDate(day);
                                    setViewType('day');
                                }}
                                className={`min-h-[100px] p-2 border-b border-r border-slate-100 transition-colors cursor-pointer hover:bg-slate-50
                                    ${!isCurrentMonth ? 'bg-slate-50/30' : 'bg-white'}
                                    ${idx % 7 === 6 ? 'border-r-0' : ''}
                                `}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold
                                        ${isTodayDate ? 'bg-primary-600 text-white shadow-md' : 
                                          !isCurrentMonth ? 'text-slate-400' : 'text-slate-700'}
                                    `}>
                                        {format(day, 'd')}
                                    </span>
                                    {dayApts.length > 0 && (
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                            {dayApts.length}
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-1 mt-1">
                                    {dayApts.slice(0, 3).map(apt => (
                                        <div key={apt.id} className="flex items-center gap-1.5 text-[10px] bg-slate-50 p-1 rounded border border-slate-100 truncate">
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${statusColors[apt.status] || 'bg-slate-300'}`}></span>
                                            <span className="truncate font-medium text-slate-700">{apt.time} - {apt.userName.split(' ')[0]}</span>
                                        </div>
                                    ))}
                                    {dayApts.length > 3 && (
                                        <div className="text-[10px] text-primary-500 font-bold pl-1">
                                            +{dayApts.length - 3} mais
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderWeekView = () => {
        const start = startOfWeek(currentDate);
        const end = endOfWeek(currentDate);
        const days = eachDayOfInterval({ start, end });

        return (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm flex flex-col">
                <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
                    {days.map(day => (
                        <div key={day.toString()} className="py-3 text-center border-r border-slate-100 last:border-r-0">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{format(day, 'EEE', { locale: ptBR })}</div>
                            <div className={`mt-1 inline-flex w-8 h-8 items-center justify-center rounded-full text-sm font-bold
                                ${isToday(day) ? 'bg-primary-600 text-white shadow-md' : 'text-slate-800'}
                            `}>
                                {format(day, 'd')}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 min-h-[500px] bg-slate-50/20">
                    {days.map((day, idx) => {
                        const dayApts = getAppointmentsForDate(day);
                        return (
                            <div key={day.toString()} className={`border-r border-slate-100 last:border-r-0 p-2 space-y-2 ${isToday(day) ? 'bg-primary-50/10' : ''}`}>
                                {dayApts.length === 0 ? (
                                    <div className="text-center text-slate-300 text-[10px] font-medium pt-4">Livre</div>
                                ) : (
                                    dayApts.map(apt => renderAppointmentCard(apt, true))
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderDayView = () => {
        const dayApts = getAppointmentsForDate(currentDate);

        return (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm min-h-[400px]">
                <h3 className="text-lg font-serif font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <CalendarIcon size={20} className="text-primary-500" />
                    Agenda de {format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </h3>

                {dayApts.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CalendarIcon size={24} className="text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-medium">Nenhum agendamento para este dia.</p>
                    </div>
                ) : (
                    <div className="space-y-4 max-w-3xl">
                        {dayApts.map(apt => renderAppointmentCard(apt, false))}
                    </div>
                )}
            </div>
        );
    };

    const renderAppointmentCard = (apt: Appointment, compact: boolean) => {
        const ids = apt.serviceId ? apt.serviceId.split(',') : [];
        const aptServices = services.filter(s => ids.includes(s.id));
        const serviceName = aptServices.map(s => s.name).join(', ') || 'Outro';
        const pro = professionals.find(p => p.id === apt.professionalId);

        if (compact) {
            return (
                <div key={apt.id} className="bg-white border border-slate-200 p-2 rounded-xl shadow-sm hover:border-primary-300 transition-colors group cursor-pointer" onClick={() => onEdit(apt)}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusColors[apt.status] || 'bg-slate-300'}`}></span>
                        <span className="text-[11px] font-bold text-slate-800">{apt.time}</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-700 truncate">{apt.userName}</div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">{serviceName}</div>
                </div>
            );
        }

        return (
            <div key={apt.id} className="flex gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 transition-all group">
                <div className="flex flex-col items-center justify-center shrink-0 w-16 border-r border-slate-200 pr-4">
                    <span className="text-lg font-bold text-primary-600">{apt.time}</span>
                    <span className={`w-3 h-3 rounded-full mt-2 ${statusColors[apt.status] || 'bg-slate-300'}`}></span>
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-bold text-slate-900 text-base">{apt.userName}</h4>
                            <p className="text-sm text-slate-600 mt-0.5">{serviceName}</p>
                        </div>
                        <Badge color={
                            apt.status === AppointmentStatus.CONFIRMED ? 'green' :
                            apt.status === AppointmentStatus.COMPLETED ? 'blue' :
                            apt.status === AppointmentStatus.CANCELLED ? 'red' : 'gray'
                        }>{apt.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
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
                    <button onClick={() => onEdit(apt)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Editar / Reagendar">
                        <Pencil size={16} />
                    </button>
                    <button onClick={() => onMessage(apt)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Enviar WhatsApp">
                        <MessageCircle size={16} />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4 font-sans animate-in fade-in duration-300">
            {/* Toolbar do Calendário */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-3 md:p-4 rounded-2xl border border-slate-100 shadow-sm gap-4">
                
                <div className="flex items-center gap-2">
                    <button onClick={navigatePrevious} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors">
                        <ChevronLeft size={18} />
                    </button>
                    <button onClick={navigateToday} className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                        Hoje
                    </button>
                    <button onClick={navigateNext} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors">
                        <ChevronRight size={18} />
                    </button>
                    
                    <div className="ml-2 font-serif font-bold text-lg text-slate-800 capitalize w-48 text-center">
                        {viewType === 'month' && format(currentDate, "MMMM yyyy", { locale: ptBR })}
                        {viewType === 'week' && `${format(startOfWeek(currentDate), "dd MMM", { locale: ptBR })} - ${format(endOfWeek(currentDate), "dd MMM", { locale: ptBR })}`}
                        {viewType === 'day' && format(currentDate, "dd 'de' MMM, yyyy", { locale: ptBR })}
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setViewType('month')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewType === 'month' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Mês
                    </button>
                    <button 
                        onClick={() => setViewType('week')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewType === 'week' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Semana
                    </button>
                    <button 
                        onClick={() => setViewType('day')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewType === 'day' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Dia
                    </button>
                </div>
            </div>

            {/* Renderização do Calendário */}
            {viewType === 'month' && renderMonthView()}
            {viewType === 'week' && renderWeekView()}
            {viewType === 'day' && renderDayView()}

        </div>
    );
};
