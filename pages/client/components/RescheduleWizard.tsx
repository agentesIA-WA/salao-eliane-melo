import React, { useState, useMemo } from 'react';
import { useApp } from '../../../contexts/AppContext';
import { Service, Professional, AppointmentStatus, Appointment } from '../../../types';
import { Button, Card, Badge, Input } from '../../../components/Shared';
import { Calendar, Clock, User as UserIcon, Star, Scissors, LogOut, Plus, ChevronLeft, Phone, Mail, Check, Sparkles, Sliders, ChevronRight, MapPin, MessageCircle, Trash2, RefreshCw, X, Info, Lock } from 'lucide-react';
import { format, startOfToday, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getGoogleDriveThumbnail } from '../../../services/driveUtils';
import { calculateCoincidentAvailableSlots, findBlockedSlotConflict, getDayBlockInfo, formatServicePrice, formatServicesTotalPrice } from '../../../services/serviceGroups';

const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface RescheduleWizardProps {
  appointment: Appointment;
  onCancel: () => void;
  onSuccess: () => void;
}

const RescheduleWizard: React.FC<RescheduleWizardProps> = ({ appointment, onCancel, onSuccess }) => {
    const { services, professionals, appointments, updateAppointment, businessConfig } = useApp();
    const [step, setStep] = useState(1);
    
    // Initial services matching current booking
    const [selectedServices, setSelectedServices] = useState<Service[]>(() => {
        const initialIds = appointment.serviceId ? appointment.serviceId.split(',') : [];
        return services.filter(s => initialIds.includes(s.id));
    });

    const totalDuration = useMemo(() => {
        return selectedServices.reduce((sum, s) => sum + Number(s.durationMinutes), 0);
    }, [selectedServices]);

    const totalPrice = useMemo(() => {
        return selectedServices.reduce((sum, s) => sum + s.price, 0);
    }, [selectedServices]);

    // Initial value matching current booking
    const [selectedPro, setSelectedPro] = useState<Professional | null>(() => {
        return professionals.find(p => p.id === appointment.professionalId) || null;
    });
    const [selectedDate, setSelectedDate] = useState<string>(appointment.date);
    const [selectedTime, setSelectedTime] = useState<string>(appointment.time);
    const [selectedMonth, setSelectedMonth] = useState<string>(() => {
        return appointment.date ? appointment.date.substring(0, 7) : format(new Date(), 'yyyy-MM');
    });
    const [isSaved, setIsSaved] = useState(false);

    // Toggle service selection
    const toggleService = (service: Service) => {
        setSelectedServices(prev => {
            const exists = prev.some(s => s.id === service.id);
            if (exists) {
                return prev.filter(s => s.id !== service.id);
            } else {
                return [...prev, service];
            }
        });
        setSelectedTime(''); // Reset time because duration changed
    };

    // Filter professionals by specialties of ALL currently selected services
    const availablePros = useMemo(() => {
        if (selectedServices.length === 0) return [];
        return professionals.filter(pro => {
            return selectedServices.every(s => pro.specialties.includes(s.id));
        });
    }, [professionals, selectedServices]);

    // Auto-adjust selected professional and clear selections if no longer valid
    React.useEffect(() => {
        if (selectedPro) {
            const isMatch = availablePros.some(p => p.id === selectedPro.id);
            if (!isMatch) {
                setSelectedPro(null);
                setSelectedTime('');
            }
        }
    }, [selectedServices, availablePros, selectedPro]);

    // Generate next 6 months helper
    const monthsOfBooking = useMemo(() => {
        const list = [];
        const baseDate = new Date();
        for (let i = 0; i < 6; i++) {
            const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
            list.push({
                val: format(d, 'yyyy-MM'),
                label: format(d, "MMMM 'de' yyyy", { locale: ptBR }),
                month: d.getMonth(),
                year: d.getFullYear()
            });
        }
        return list;
    }, []);

    // Generate dates based on selectedMonth (full month weekly grid)
    const today = startOfToday();
    const { leadingEmptyDays, availableDates } = useMemo(() => {
        const [yearStr, monthStr] = selectedMonth.split('-');
        const year = parseInt(yearStr, 10);
        const monthIndex = parseInt(monthStr, 10) - 1;

        const start = new Date(year, monthIndex, 1);
        const end = endOfMonth(start);
        const monthDays = eachDayOfInterval({ start, end });

        const mapped = monthDays.map(d => {
            const val = format(d, 'yyyy-MM-dd');
            const dayOfWeek = d.getDay();
            const schedule = businessConfig.days?.[dayOfWeek];
            const isClosed = !schedule || !schedule.isOpen;
            const isPast = d < today;

            const blockInfo = getDayBlockInfo(val, businessConfig, selectedPro?.id);
            let isBlocked = blockInfo.isBlocked;
            let blockReason = blockInfo.blockReason;

            if (!isBlocked && !isClosed && !isPast && selectedPro && totalDuration > 0 && blockInfo.blocks.length > 0) {
                const calc = calculateCoincidentAvailableSlots({
                    date: val,
                    professionalId: selectedPro.id,
                    totalDuration,
                    appointments,
                    services,
                    businessConfig,
                    excludeAppointmentId: appointment.id
                });
                if (calc.dayIsBlocked) {
                    isBlocked = true;
                    blockReason = calc.blockReason || blockReason;
                }
            }

            return {
                val,
                dayNumber: format(d, 'dd'),
                weekdayShort: WEEKDAYS_SHORT[dayOfWeek],
                full: format(d, "dd 'de' MMMM", { locale: ptBR }),
                isPast,
                isClosed,
                isBlocked,
                blockReason
            };
        });

        return {
            leadingEmptyDays: start.getDay(),
            availableDates: mapped
        };
    }, [selectedMonth, today, businessConfig, selectedPro, totalDuration, appointments, services, appointment.id]);

    // Calculate available time slots
    const { availableTimeSlots, dayIsClosed, dayIsBlocked, blockReason } = useMemo(() => {
        return calculateCoincidentAvailableSlots({
            date: selectedDate,
            professionalId: selectedPro?.id,
            totalDuration,
            appointments,
            services,
            businessConfig,
            excludeAppointmentId: appointment.id
        });
    }, [selectedDate, selectedPro, totalDuration, appointments, services, businessConfig, appointment.id]);

    const sendWhatsAppUpdate = (updatedPro: Professional, updatedDate: string, updatedTime: string) => {
        const cleanPhone = (appointment.clientPhone || '').replace(/\D/g, '');
        const formattedPhone = cleanPhone.length === 11 || cleanPhone.length === 10 ? `55${cleanPhone}` : cleanPhone;
        const dateStr = format(parseISO(updatedDate), "EEEE, d 'de' MMMM", { locale: ptBR });
        const servicesStr = selectedServices.map(s => s.name).join(', ');
        const companyName = businessConfig.companyName || 'Salão de Beleza';
        const addressStr = businessConfig.address ? `📍 Endereço: ${businessConfig.address}` : '';
        const aptIdStr = `🔢 *Nº do Agendamento:* ${appointment.id}\n`;
        
        const message = `Olá, ${appointment.userName}!
Seu agendamento no *${companyName}* foi atualizado com sucesso! 🔄

${aptIdStr}💇‍♀️ *Serviços:* ${servicesStr}
👤 *Profissional:* ${updatedPro.name}
📅 *Data:* ${dateStr}
⏰ *Horário:* ${updatedTime}
💰 *Valor total:* ${formatServicesTotalPrice(selectedServices)}
${addressStr ? `\n${addressStr}` : ''}

Te aguardamos com muito carinho! 🥰`;

        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${formattedPhone}?text=${encodedMessage}`, '_blank');
    };

    const handleSave = async () => {
        if (selectedPro && selectedDate && selectedTime && selectedServices.length > 0) {
            const conflict = findBlockedSlotConflict(
                selectedDate,
                selectedTime,
                totalDuration,
                selectedPro.id,
                businessConfig.blockedSlots || [],
                professionals
            );
            if (conflict) return;

            await updateAppointment(appointment.id, {
                serviceId: selectedServices.map(s => s.id).join(','),
                professionalId: selectedPro.id,
                date: selectedDate,
                time: selectedTime,
                status: AppointmentStatus.PENDING
            });
            setIsSaved(true);
            sendWhatsAppUpdate(selectedPro, selectedDate, selectedTime);
        }
    };

    const selectedServicesNames = selectedServices.map(s => s.name).join(', ');
    const displayDateStr = selectedDate ? format(parseISO(selectedDate), "EEEE, d 'de' MMMM", { locale: ptBR }) : '';

    if (isSaved && selectedPro) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-md border border-emerald-200">
                    <Check size={36} className="text-emerald-600" />
                </div>
                
                <h2 className="text-3xl font-serif font-bold text-slate-950 mb-2 text-center font-sans">Reagendamento Confirmado!</h2>
                <p className="text-slate-500 text-center text-sm max-w-sm mb-8 leading-relaxed font-sans">
                  Pronto! Seu horário e serviços foram reagendados com sucesso e o profissional já sincronizou o cronograma.
                </p>

                <Card className="w-full max-w-md mb-8 border border-emerald-100 bg-white shadow-[0_12px_45px_rgba(0,0,0,0.02)] p-6 space-y-4">
                    <h3 className="font-semibold text-xs tracking-wider uppercase text-slate-400 border-b pb-3 flex items-center gap-2">
                      <Sparkles size={14} className="text-primary-500" /> Detalhes Atualizados da Reserva
                    </h3>
                    
                    <div className="space-y-4">
                        <div className="flex items-start gap-4 pb-4 border-b border-dashed border-slate-100">
                            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 font-bold text-xs flex items-center justify-center min-w-[40px]">
                                Nº
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Número do Agendamento</p>
                                <p className="font-extrabold text-emerald-600 text-lg tracking-wider font-mono">{appointment.id}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-start gap-4">
                            <div className="p-2.5 bg-primary-50 rounded-xl text-primary-600">
                                <Scissors size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Serviços Alterados</p>
                                <p className="font-bold text-slate-800 text-base">{selectedServicesNames}</p>
                                <p className="text-xs text-slate-500">{totalDuration} minutos • {formatServicesTotalPrice(selectedServices)}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-2.5 bg-primary-50 rounded-xl text-primary-600">
                                <UserIcon size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Profissional Selecionado</p>
                                <p className="font-bold text-slate-800 text-base">{selectedPro.name}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 border-t border-slate-100 pt-4">
                            <div className="p-2.5 bg-primary-50 rounded-xl text-primary-600">
                                <Calendar size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Novo Horário</p>
                                <p className="font-extrabold text-primary-600 text-lg mt-0.5">{selectedTime} h</p>
                                <p className="text-xs font-semibold text-slate-500 uppercase mt-0.5">{displayDateStr}</p>
                            </div>
                        </div>
                    </div>
                </Card>

                <div className="w-full max-w-md space-y-3">
                    <Button 
                        fullWidth 
                        onClick={() => sendWhatsAppUpdate(selectedPro, selectedDate, selectedTime)} 
                        className="py-3 bg-emerald-600 hover:bg-emerald-700 hover:shadow-[0_4px_14px_rgba(16,185,129,0.3)] text-white font-semibold text-base border-none rounded-xl"
                    >
                        <MessageCircle size={20} className="fill-white/10" />
                        Enviar Detalhes por WhatsApp
                    </Button>

                    <Button 
                        fullWidth 
                        variant="outline"
                        onClick={onSuccess} 
                        className="py-3 font-semibold text-base rounded-xl"
                    >
                        Retornar ao Início
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 py-4 px-6 md:px-8">
                <div className="max-w-3xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-xl transition-all cursor-pointer border-none bg-transparent">
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <span className="text-[9px] uppercase font-bold tracking-wider text-primary-500 font-mono">CÓDIGO: {appointment.id}</span>
                            <h1 className="text-lg md:text-xl font-serif font-bold text-slate-900 leading-tight">Reagendar Atendimento</h1>
                        </div>
                    </div>
                    <button onClick={onCancel} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all cursor-pointer border-none bg-transparent">
                        <X size={20} />
                    </button>
                </div>
            </header>

            {/* Main content */}
            <div className="max-w-3xl mx-auto w-full p-4 md:p-8 flex-1">
                {/* Steps tracker */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="bg-primary-600 h-full transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }}></div>
                    </div>
                    <span className="text-xs font-bold text-slate-400">Página {step} de 3</span>
                </div>

                <Card className="bg-white border p-6 md:p-8 space-y-6 shadow-sm">
                    {/* Step 1: Select Services */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="border-b border-slate-100 pb-3">
                                <h3 className="font-bold text-slate-800 text-sm tracking-wider uppercase">1. Escolha Outros Serviços</h3>
                                <p className="text-xs text-slate-400 leading-normal mt-1">Marque ou desmarque os serviços que deseja incluir no seu novo agendamento.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1">
                                {services.map(service => {
                                    const isSelected = selectedServices.some(s => s.id === service.id);
                                    return (
                                        <button 
                                            key={service.id}
                                            type="button"
                                            onClick={() => toggleService(service)}
                                            className={`p-4 rounded-xl border text-left flex justify-between items-center transition-all cursor-pointer ${isSelected ? 'border-primary-500 bg-primary-50/10 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-transparent'}`}
                                        >
                                            <div className="space-y-1">
                                                <h4 className="font-bold text-slate-800 text-sm leading-tight flex items-center gap-1.5">
                                                    {service.name}
                                                    {isSelected && <Check size={14} className="text-primary-500" />}
                                                </h4>
                                                <p className="text-xs text-slate-400 font-medium">⏳ {service.durationMinutes} min</p>
                                                {service.observation && (
                                                    <p className="text-[10px] text-amber-600 font-semibold flex items-center gap-1 mt-0.5">
                                                        <Info size={10} className="shrink-0" /> {service.observation}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-slate-800 text-sm">{formatServicePrice(service)}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex justify-between items-center text-xs mt-2 leading-relaxed">
                                <div>
                                    <p className="text-slate-400 uppercase font-bold text-[10px]">TOTAIS DO NOVO AGENDAMENTO</p>
                                    <p className="font-bold text-slate-800 mt-0.5">{selectedServices.length} serviço(s) selecionado(s)</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-extrabold text-sm text-primary-600">{formatServicesTotalPrice(selectedServices)}</p>
                                    <p className="text-slate-500 font-semibold">{totalDuration} min</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Specialist & Date Selection */}
                    {step === 2 && (
                        <div className="space-y-6">
                            {/* Selected Services Recap */}
                            <div className="bg-primary-50/50 p-4 rounded-2xl border border-primary-100">
                                <h4 className="text-[10px] font-bold text-primary-800 uppercase tracking-wide">Serviços Selecionados</h4>
                                <p className="font-bold text-slate-800 text-sm mt-1">{selectedServicesNames}</p>
                                <p className="text-xs text-slate-500 leading-normal mt-0.5">Duração total: {totalDuration} minutos • {formatServicesTotalPrice(selectedServices)}</p>
                            </div>

                            {/* Select Pro */}
                            <div className="space-y-3">
                                <h3 className="font-bold text-slate-800 text-sm tracking-wider uppercase">2. Escolha o Especialista</h3>
                                {availablePros.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {availablePros.map(pro => {
                                            const isSelected = selectedPro?.id === pro.id;
                                            return (
                                                <button 
                                                    key={pro.id}
                                                    type="button"
                                                    onClick={() => { setSelectedPro(pro); setSelectedTime(''); }}
                                                    className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${isSelected ? 'border-primary-500 bg-primary-50/20 shadow-md' : 'border-slate-200 hover:border-slate-300 bg-transparent'}`}
                                                >
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 overflow-hidden shrink-0 border border-slate-200">
                                                        {pro.avatarUrl ? <img src={pro.avatarUrl} alt={pro.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : pro.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-sm leading-tight">{pro.name}</h4>
                                                        <p className="text-xs text-slate-400 mt-0.5 font-sans">Atende aos serviços solicitados</p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-6 bg-red-50 rounded-xl border border-red-100 text-center text-xs">
                                        <p className="font-bold text-red-800">Sem profissionais disponíveis</p>
                                        <p className="text-red-600 mt-1">Nenhum de nossos profissionais é especialista em todos os serviços selecionados simultaneamente. Experimente ajustar a seleção.</p>
                                    </div>
                                )}
                            </div>

                            {/* Select Month & Date */}
                            {selectedPro && availablePros.some(p => p.id === selectedPro?.id) && (
                                <>
                                    {/* Select Month */}
                                    <div className="space-y-3 border-t border-slate-100 pt-5">
                                        <h3 className="font-bold text-slate-800 text-sm tracking-wider uppercase flex items-center gap-1.5 mb-1">
                                            <Calendar size={15} className="text-primary-500" /> 3. Escolha o Mês do Reagendamento
                                        </h3>
                                        <div className="flex gap-2.5 overflow-x-auto pb-3 pl-1 scrollbar-thin">
                                            {monthsOfBooking.map(m => {
                                                const isSelected = selectedMonth === m.val;
                                                return (
                                                    <button
                                                        key={m.val}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedMonth(m.val);
                                                            setSelectedDate('');
                                                            setSelectedTime('');
                                                        }}
                                                        className={`flex-shrink-0 px-4 py-2 rounded-2xl border text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer capitalize ${isSelected ? 'bg-primary-600 text-white border-primary-600 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                                                    >
                                                        {m.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Select Day */}
                                    <div className="space-y-3 border-t border-slate-100 pt-5">
                                        <h3 className="font-bold text-slate-800 text-sm tracking-wider uppercase mb-1">4. Escolha o Dia ({selectedMonth ? monthsOfBooking.find(m => m.val === selectedMonth)?.label : ''})</h3>
                                        {availableDates.length > 0 ? (
                                            <div className="space-y-2">
                                                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                                                    {WEEKDAYS_SHORT.map(w => (
                                                        <div key={w} className="text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 py-1">
                                                            {w}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                                                    {Array.from({ length: leadingEmptyDays }).map((_, idx) => (
                                                        <div key={`empty-${idx}`} className="h-16 sm:h-20 rounded-2xl bg-slate-50/40 border border-transparent" />
                                                    ))}
                                                    {availableDates.map(d => {
                                                        const isSelected = selectedDate === d.val;
                                                        const isBlockedDay = d.isBlocked;
                                                        const showBlocked = isSelected && isBlockedDay;
                                                        const isDisabled = d.isPast || d.isClosed;

                                                        let cardClass = 'bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300';
                                                        if (isDisabled) {
                                                            cardClass = 'bg-slate-100/70 border-slate-200/50 text-slate-300 cursor-not-allowed opacity-60';
                                                        } else if (showBlocked) {
                                                            cardClass = 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20 scale-[1.02]';
                                                        } else if (isSelected) {
                                                            cardClass = 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-500/20 scale-[1.02]';
                                                        } else if (isBlockedDay) {
                                                            cardClass = 'bg-amber-50/90 border-amber-300 text-amber-900 hover:bg-amber-100/80';
                                                        }

                                                        return (
                                                            <button 
                                                                key={d.val}
                                                                type="button"
                                                                disabled={isDisabled}
                                                                onClick={() => { setSelectedDate(d.val); setSelectedTime(''); }}
                                                                className={`flex flex-col items-center justify-between p-1.5 rounded-2xl h-16 sm:h-20 transition-all border ${isDisabled ? '' : 'cursor-pointer'} ${cardClass}`}
                                                            >
                                                                <div className="w-full flex items-center justify-center gap-1">
                                                                    <span className={`text-[9px] sm:text-[10px] uppercase font-semibold tracking-wider ${
                                                                        showBlocked ? 'text-amber-100' :
                                                                        isSelected ? 'text-primary-100' :
                                                                        isBlockedDay && !isDisabled ? 'text-amber-700' : 'text-slate-400'
                                                                    }`}>
                                                                        {d.weekdayShort}
                                                                    </span>
                                                                    {isBlockedDay && !isDisabled && (
                                                                        <Lock size={11} className={showBlocked ? 'text-white' : 'text-amber-600'} />
                                                                    )}
                                                                </div>
                                                                <div className="text-base sm:text-xl font-extrabold leading-none">{d.dayNumber}</div>
                                                                <div className="min-h-[12px] flex items-center justify-center">
                                                                    {d.isClosed ? (
                                                                        <span className="text-[8px] sm:text-[9px] font-bold uppercase text-red-400">Fechado</span>
                                                                    ) : showBlocked ? (
                                                                        <span className="text-[8px] sm:text-[9px] font-bold uppercase text-white">Bloqueado</span>
                                                                    ) : null}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {selectedDate && dayIsBlocked && (
                                                    <div className="p-5 bg-amber-50 rounded-2xl text-center border border-amber-200 space-y-2 mt-3 animate-in fade-in">
                                                        <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                                                            <Lock size={18} />
                                                        </div>
                                                        <p className="text-amber-900 font-bold text-sm">Data Bloqueada para Agendamentos</p>
                                                        <p className="text-xs text-amber-700">
                                                            Este dia encontra-se bloqueado na agenda do salão. Selecione outra data disponível.
                                                        </p>
                                                        {blockReason && (
                                                            <p className="text-xs text-amber-900 font-semibold bg-amber-100/90 border border-amber-300/80 rounded-xl px-3.5 py-2 inline-block mt-1">
                                                                Justificativa: {blockReason}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400">Nenhum dia disponível para este mês.</p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Step 3: Time Slot Selection */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <h3 className="font-bold text-slate-800 text-sm tracking-wider uppercase">5. Selecione o Novo Horário</h3>
                                <p className="text-xs text-slate-400 leading-normal">Exibindo horários livres para o especialista {selectedPro?.name} em {displayDateStr}.</p>
                                
                                {dayIsClosed ? (
                                    <div className="p-6 bg-red-50 rounded-2xl text-center border border-red-100">
                                        <p className="text-red-800 font-bold">Inoperante</p>
                                        <p className="text-xs text-red-600 mt-1 font-medium">O estabelecimento está fechado ou não opera neste dia da semana.</p>
                                    </div>
                                ) : dayIsBlocked ? (
                                    <div className="p-6 bg-amber-50 rounded-2xl text-center border border-amber-200 space-y-2">
                                        <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                                            <Lock size={18} />
                                        </div>
                                        <p className="text-amber-900 font-bold text-sm">Data Bloqueada para Agendamentos</p>
                                        <p className="text-xs text-amber-700">
                                            Este dia encontra-se bloqueado na agenda do salão. Volte e selecione outra data disponível.
                                        </p>
                                        {blockReason && (
                                            <p className="text-xs text-amber-900 font-semibold bg-amber-100/90 border border-amber-300/80 rounded-xl px-3.5 py-2 inline-block mt-1">
                                                Justificativa: {blockReason}
                                            </p>
                                        )}
                                    </div>
                                ) : availableTimeSlots.length > 0 ? (
                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1 animate-in fade-in duration-300">
                                        {availableTimeSlots.map(t => (
                                            <button 
                                                key={t}
                                                type="button"
                                                onClick={() => setSelectedTime(t)}
                                                className={`py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border-none ${selectedTime === t ? 'bg-primary-600 text-white shadow-md shadow-primary-500/10' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 bg-slate-50 rounded-2xl text-center border border-slate-100/50">
                                        <p className="text-slate-500 text-xs sm:text-sm leading-relaxed font-semibold">
                                            Nenhum horário disponível para este dia com este profissional para a duração de {totalDuration} min. Tente outra data.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Mini Recap */}
                            {selectedTime && selectedPro && (
                                <div className="border-t border-slate-150 pt-5 space-y-3 animate-in slide-in-from-bottom-2 duration-300">
                                    <h3 className="text-slate-400 text-xs uppercase tracking-widest font-bold font-sans">Novo Agendamento Consolidado</h3>
                                    <div className="p-4 rounded-2xl bg-slate-50 text-xs space-y-1.5 border border-slate-200 leading-relaxed font-semibold">
                                        <p><span className="text-slate-400">Especialista:</span> <span className="font-bold text-slate-800">{selectedPro.name}</span></p>
                                        <p><span className="text-slate-400">Serviços:</span> <span className="font-bold text-slate-800">{selectedServicesNames}</span></p>
                                        <p><span className="text-slate-400">Horário anterior:</span> <span className="text-slate-600">{format(parseISO(appointment.date), 'dd/MM/yyyy')} às {appointment.time}</span></p>
                                        <p><span className="text-slate-400">Novo horário:</span> <span className="font-extrabold text-emerald-600 text-sm">{format(parseISO(selectedDate), 'dd/MM/yyyy')} às {selectedTime}</span></p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Card>
            </div>

            {/* Sticky wizard footer */}
            <div className="p-4 bg-white border-t border-slate-200 sticky bottom-0">
                <div className="max-w-3xl mx-auto flex gap-3">
                    {step === 1 ? (
                        <>
                            <Button variant="outline" className="flex-1 py-3 font-sans" onClick={onCancel}>
                                Cancelar
                            </Button>
                            <Button 
                                className="flex-1 bg-primary-600 text-white py-3 hover:bg-primary-700 font-sans" 
                                disabled={selectedServices.length === 0} 
                                onClick={() => setStep(2)}
                            >
                                Avançar (Profissional)
                            </Button>
                        </>
                    ) : step === 2 ? (
                        <>
                            <Button variant="outline" className="flex-1 py-3 font-sans" onClick={() => setStep(1)}>
                                Voltar (Serviços)
                            </Button>
                            <Button 
                                className="flex-1 bg-primary-600 text-white py-3 hover:bg-primary-700 font-sans" 
                                disabled={!selectedPro || !selectedDate || dayIsBlocked || dayIsClosed} 
                                onClick={() => setStep(3)}
                            >
                                Escolher Horário
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" className="flex-1 py-3 font-sans" onClick={() => setStep(2)}>
                                Voltar
                            </Button>
                            <Button 
                                className="flex-1 bg-primary-600 text-white py-3 hover:bg-primary-700 font-bold font-sans" 
                                disabled={!selectedTime} 
                                onClick={handleSave}
                            >
                                Confirmar Reagendamento
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RescheduleWizard;
