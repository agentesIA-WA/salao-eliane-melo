import React, { useState } from 'react';
import { useApp } from '../../../contexts/AppContext';
import { Appointment, AppointmentStatus, Service, Professional, BusinessConfig } from '../../../types';
import { Button, Card, Badge, Input, Modal } from '../../../components/Shared';
import { Calendar as CalendarIcon, Users, Scissors, MessageCircle, TrendingUp, Plus, Trash2, Check, X, Clock, Pencil, Briefcase, Settings, Loader2, Coffee, Phone, Mail, Sparkles, AlertCircle, Lock, Upload, ImageIcon, Link as LinkIcon, Info } from 'lucide-react';
import { format, parseISO, isSameWeek, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const DashboardOverview: React.FC = () => {
    const { appointments, services, professionals } = useApp();
    const [selectedPopupType, setSelectedPopupType] = React.useState<'total' | 'confirmed' | 'completed' | 'revenue' | 'weekday' | null>(null);
    const [selectedWeekday, setSelectedWeekday] = React.useState<number | null>(null);
    const [selectedMonthStr, setSelectedMonthStr] = React.useState<string>(format(new Date(), 'yyyy-MM'));
    const selectedMonthDate = React.useMemo(() => parseISO(`${selectedMonthStr}-01`), [selectedMonthStr]);
    
    const monthAppointments = React.useMemo(() => {
        return appointments.filter(a => {
            try { return isSameMonth(parseISO(a.date), selectedMonthDate); } 
            catch { return false; }
        });
    }, [appointments, selectedMonthDate]);

    const totalApts = monthAppointments.length;
    const confirmed = monthAppointments.filter(a => a.status === AppointmentStatus.CONFIRMED).length;
    const completed = monthAppointments.filter(a => a.status === AppointmentStatus.COMPLETED).length;
    
    const totalRevenue = monthAppointments
        .filter(a => a.status === AppointmentStatus.COMPLETED)
        .reduce((sum, apt) => {
            const ids = apt.serviceId ? apt.serviceId.split(',').filter(Boolean) : [];
            const aptTotal = services
                .filter(s => ids.includes(s.id))
                .reduce((s, svc) => s + Number(svc.price), 0);
            return sum + aptTotal;
        }, 0);

    const weekDayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const chartData = React.useMemo(() => {
        const counts = [0, 0, 0, 0, 0, 0, 0]; // Dom-Sáb
        monthAppointments.forEach(apt => {
            if (apt.status === AppointmentStatus.CANCELLED) return;
            try {
                const dayOfWeek = parseISO(apt.date).getDay();
                counts[dayOfWeek]++;
            } catch (e) { /* ignore invalid dates */ }
        });
        return weekDayNames.map((name, idx) => ({ name, apts: counts[idx], dayIndex: idx }));
    }, [monthAppointments]);

    const handleBarClick = (data: any) => {
        if (data && data.activePayload && data.activePayload.length > 0) {
            const dayIndex = data.activePayload[0].payload.dayIndex;
            setSelectedWeekday(dayIndex);
            setSelectedPopupType('weekday');
        }
    };

    const modalAppointments = React.useMemo(() => {
        if (!selectedPopupType) return [];
        let filtered: Appointment[] = [];
        if (selectedPopupType === 'total') {
            filtered = [...monthAppointments];
        } else if (selectedPopupType === 'confirmed') {
            filtered = monthAppointments.filter(a => a.status === AppointmentStatus.CONFIRMED);
        } else if (selectedPopupType === 'completed' || selectedPopupType === 'revenue') {
            filtered = monthAppointments.filter(a => a.status === AppointmentStatus.COMPLETED);
        } else if (selectedPopupType === 'weekday' && selectedWeekday !== null) {
            filtered = monthAppointments.filter(a => {
                if (a.status === AppointmentStatus.CANCELLED) return false;
                try { return parseISO(a.date).getDay() === selectedWeekday; } catch { return false; }
            });
        }
        
        return filtered.sort((a, b) => {
            const dateTimeA = `${a.date}T${a.time || '00:00'}`;
            const dateTimeB = `${b.date}T${b.time || '00:00'}`;
            return dateTimeA.localeCompare(dateTimeB);
        });
    }, [selectedPopupType, selectedWeekday, monthAppointments]);

    const { groupedAppointments, sortedDates } = React.useMemo(() => {
        const groups: { [key: string]: Appointment[] } = {};
        for (const apt of modalAppointments) {
            const dateStr = apt.date;
            if (!groups[dateStr]) {
                groups[dateStr] = [];
            }
            groups[dateStr].push(apt);
        }
        const sorted = Object.keys(groups).sort();
        return { groupedAppointments: groups, sortedDates: sorted };
    }, [modalAppointments]);

    const modalTitle = React.useMemo(() => {
        switch (selectedPopupType) {
            case 'total': return 'Detalhamento: Agendamentos Totais';
            case 'confirmed': return 'Detalhamento: Horários Confirmados';
            case 'completed': return 'Detalhamento: Serviços Realizados';
            case 'revenue': return 'Detalhamento: Faturamento Real (Serviços Finalizados)';
            case 'weekday': return `Agendamentos: ${selectedWeekday !== null ? weekDayNames[selectedWeekday] : ''}` + (selectedWeekday !== null ? ` (${weekDayNames[selectedWeekday]}feira)` : '');
            default: return '';
        }
    }, [selectedPopupType]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-3xl font-serif font-bold text-slate-900 select-none tracking-wide">Visão Geral</h2>
                <p className="text-slate-400 text-sm mt-1">Monitore agendamentos, produtividade e faturamento. (Clique nos cards para detalhar)</p>
              </div>
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm shrink-0">
                <CalendarIcon size={16} className="text-slate-500" />
                <input 
                  type="month" 
                  value={selectedMonthStr} 
                  onChange={e => setSelectedMonthStr(e.target.value)}
                  className="bg-transparent border-none text-sm font-bold text-slate-700 outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard 
                    title="Agendamentos Totais" 
                    value={totalApts} 
                    subtitle="No mês selecionado" 
                    icon={<CalendarIcon size={20} className="text-blue-500" />} 
                    gradientClass="from-blue-500/5 to-blue-500/10 border-blue-100" 
                    onClick={() => setSelectedPopupType('total')}
                />
                <StatCard 
                    title="Horários Confirmados" 
                    value={confirmed} 
                    subtitle="No mês selecionado" 
                    icon={<Check size={20} className="text-emerald-500" />} 
                    gradientClass="from-emerald-500/5 to-emerald-500/10 border-emerald-100" 
                    onClick={() => setSelectedPopupType('confirmed')}
                />
                <StatCard 
                    title="Serviços Realizados" 
                    value={completed} 
                    subtitle="No mês selecionado" 
                    icon={<Briefcase size={20} className="text-rose-500" />} 
                    gradientClass="from-rose-500/5 to-rose-500/10 border-rose-100" 
                    onClick={() => setSelectedPopupType('completed')}
                />
                <StatCard 
                    title="Faturamento Real" 
                    value={`R$ ${Number(totalRevenue).toFixed(2)}`} 
                    subtitle="No mês selecionado" 
                    icon={<TrendingUp size={20} className="text-purple-500" />} 
                    gradientClass="from-purple-500/5 to-purple-500/10 border-purple-100" 
                    onClick={() => setSelectedPopupType('revenue')}
                />
            </div>

            <Card className="p-6 md:p-8">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-serif font-bold text-slate-900">Agendamentos por Dia da Semana</h3>
                    <p className="text-xs text-slate-400">Dados reais • Clique em uma barra para ver os agendamentos</p>
                  </div>
                  <Badge color="pink">Mês Selecionado</Badge>
                </div>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} onClick={handleBarClick} className="cursor-pointer">
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13 }} />
                            <YAxis hide />
                            <Tooltip 
                                cursor={{fill: 'rgba(236,72,153,0.06)', radius: 6}} 
                                contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}
                                formatter={(value: number) => [`${value} agendamento(s)`, 'Total']}
                            />
                            <Bar dataKey="apts" radius={[6, 6, 0, 0]} barSize={28}>
                                {chartData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={selectedWeekday === entry.dayIndex ? '#9d174d' : '#db2777'}
                                        className="transition-all duration-200 hover:opacity-80"
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <Modal 
                isOpen={!!selectedPopupType} 
                onClose={() => setSelectedPopupType(null)} 
                title={modalTitle}
            >
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                    {modalAppointments.length === 0 ? (
                        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-medium">
                            Nenhum agendamento encontrado para esta categoria.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {sortedDates.map(dateStr => {
                                const dayAppointments = groupedAppointments[dateStr];
                                const formattedDay = (() => {
                                    try {
                                        const dateObj = parseISO(dateStr);
                                        const dayStr = format(dateObj, "EEEE, dd 'de' MMMM", { locale: ptBR });
                                        return dayStr.charAt(0).toUpperCase() + dayStr.slice(1);
                                    } catch (e) {
                                        return dateStr;
                                    }
                                })();

                                return (
                                    <div key={dateStr} className="space-y-3 bg-slate-50/40 p-3 rounded-2xl border border-slate-100">
                                        <div className="flex items-center justify-between border-b border-slate-100/80 pb-2 px-1">
                                            <div className="flex items-center gap-2">
                                                <CalendarIcon size={14} className="text-pink-500 shrink-0" />
                                                <span className="font-bold text-slate-800 text-xs md:text-sm tracking-wide">{formattedDay}</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-500 bg-slate-200/50 px-2.5 py-0.5 rounded-full shadow-sm">
                                                {dayAppointments.length} {dayAppointments.length === 1 ? 'agendamento' : 'agendamentos'}
                                            </span>
                                        </div>
                                        <div className="space-y-2.5">
                                            {dayAppointments.map(apt => {
                                                const ids = apt.serviceId ? apt.serviceId.split(',') : [];
                                                const aptServices = services.filter(s => ids.includes(s.id));
                                                const serviceName = aptServices.map(s => s.name).join(', ') || 'Outro';
                                                const totalPrice = aptServices.reduce((sum, s) => sum + Number(s.price), 0);
                                                const pro = professionals.find(p => p.id === apt.professionalId);

                                                return (
                                                    <div key={apt.id} className="p-3 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                                                        <div className="space-y-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-bold text-slate-800">{apt.userName}</span>
                                                                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 font-mono tracking-tighter">#{apt.id}</span>
                                                                <Badge color={
                                                                    apt.status === AppointmentStatus.CONFIRMED ? 'green' :
                                                                    apt.status === AppointmentStatus.COMPLETED ? 'pink' :
                                                                    apt.status === AppointmentStatus.PENDING ? 'pink' : 'gray'
                                                                }>
                                                                    {apt.status}
                                                                </Badge>
                                                            </div>
                                                            <div className="text-xs text-slate-500 space-y-0.5">
                                                                <p className="font-medium text-slate-700 truncate">💇‍♀️ Serviço: <span className="font-semibold">{serviceName}</span></p>
                                                                {pro && <p className="truncate">👤 Profissional: <span className="font-semibold text-slate-600">{pro.name}</span></p>}
                                                                {apt.clientPhone && <p>📞 Contato: {apt.clientPhone}</p>}
                                                            </div>
                                                        </div>
                                                        <div className="text-left sm:text-right shrink-0">
                                                            <p className="font-bold text-slate-800">Horário: {apt.time}</p>
                                                            <p className="text-xs font-semibold text-primary-600">R$ {Number(totalPrice) > 0 ? Number(totalPrice).toFixed(2) : '120,00'}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    )
}

const StatCard: React.FC<{ title: string, value: string | number, subtitle: string, icon: React.ReactNode, gradientClass: string, onClick?: () => void }> = ({ title, value, subtitle, icon, gradientClass, onClick }) => (
    <div 
        onClick={onClick}
        className={`bg-white p-5 rounded-2xl border shadow-sm flex items-start justify-between cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-md select-none active:scale-95 ${gradientClass}`}
    >
        <div className="space-y-2">
            <p className="text-xs uppercase font-bold tracking-wider text-slate-500">{title}</p>
            <p className="text-3xl font-serif font-bold text-slate-900 leading-none">{value}</p>
            <p className="text-[11px] text-slate-400 font-medium scale-95 origin-left pt-1">{subtitle}</p>
        </div>
        <div className="p-2.5 bg-white rounded-xl shadow-inner inline-flex items-center justify-center border border-slate-100">
          {icon}
        </div>
    </div>
);

export default DashboardOverview;
