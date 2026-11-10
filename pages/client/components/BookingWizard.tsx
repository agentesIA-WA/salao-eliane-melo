import React, { useState, useMemo } from 'react';
import { useApp } from '../../../contexts/AppContext';
import { Service, Professional, AppointmentStatus, Appointment } from '../../../types';
import { Button, Card, Badge, Input } from '../../../components/Shared';
import { Calendar, Clock, User as UserIcon, Star, Scissors, LogOut, Plus, ChevronLeft, Phone, Mail, Check, Sparkles, Sliders, ChevronRight, MapPin, MessageCircle, Trash2, RefreshCw, X, Info, Lock } from 'lucide-react';
import { format, startOfToday, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getGoogleDriveThumbnail } from '../../../services/driveUtils';
import { calculateCoincidentAvailableSlots, findBlockedSlotConflict, getDayBlockInfo, groupServicesByGroup, formatServicePrice, formatServicesTotalPrice, isVariablePriceService } from '../../../services/serviceGroups';

const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const BookingWizard: React.FC<{
    onCancel: () => void,
    onSuccess: () => void,
    selectedServices: Service[], setSelectedServices: (services: Service[]) => void,
    selectedPro: Professional | null, setSelectedPro: (p: Professional) => void,
    selectedDate: string, setSelectedDate: (d: string) => void,
    selectedTime: string, setSelectedTime: (t: string) => void
}> = ({ onCancel, onSuccess, selectedServices, setSelectedServices, selectedPro, setSelectedPro, selectedDate, setSelectedDate, selectedTime, setSelectedTime }) => {
    
    const { services, professionals, appointments, addAppointment, user, businessConfig } = useApp();
    const [step, setStep] = useState(1);
    const [selectedMonth, setSelectedMonth] = useState<string>(() => {
        return format(new Date(), 'yyyy-MM');
    });
    
    // Contact Info State
    const [guestName, setGuestName] = useState(user?.name || '');
    const [guestPhone, setGuestPhone] = useState(user?.phone || '');
    const [guestEmail, setGuestEmail] = useState(user?.email || '');

    // Confirmation State
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [createdApt, setCreatedApt] = useState<Appointment | null>(null);

    const totalDuration = useMemo(() => {
        return selectedServices.reduce((sum, s) => sum + Number(s.durationMinutes), 0);
    }, [selectedServices]);

    const handleServiceToggle = (s: Service) => {
        let newSelected: Service[];
        if (selectedServices.some(item => item.id === s.id)) {
            newSelected = selectedServices.filter(item => item.id !== s.id);
        } else {
            newSelected = [...selectedServices, s];
        }
        setSelectedServices(newSelected);
        setSelectedPro(null);
        setSelectedDate('');
        setSelectedTime('');
    };

    const sendWhatsAppMessage = () => {
        if (!selectedPro) return;
        const cleanPhone = guestPhone.replace(/\D/g, '');
        const formattedPhone = cleanPhone.length === 11 || cleanPhone.length === 10 ? `55${cleanPhone}` : cleanPhone;
        const dateStr = format(parseISO(selectedDate), "EEEE, d 'de' MMMM", { locale: ptBR });
        const servicesStr = selectedServices.map(s => s.name).join(', ');
        const companyName = businessConfig.companyName || 'Salão de Beleza';
        const addressStr = businessConfig.address ? `📍 Endereço: ${businessConfig.address}` : '';
        const aptIdStr = createdApt?.id ? `🔢 *Nº do Agendamento:* ${createdApt.id}\n` : '';
        
        const message = `Olá, ${guestName}!
Sua reserva no *${companyName}* foi confirmada com sucesso! ✨

${aptIdStr}💇‍♀️ *Serviço:* ${servicesStr}
👤 *Profissional:* ${selectedPro.name}
📅 *Data:* ${dateStr}
⏰ *Horário:* ${selectedTime}
${addressStr ? `\n${addressStr}` : ''}

Te aguardamos com muito carinho! 🥰`;

        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${formattedPhone}?text=${encodedMessage}`, '_blank');
    };

    const handleBook = async () => {
        if (selectedServices.length > 0 && selectedPro && selectedDate && selectedTime && user && guestName && guestPhone) {
            const conflict = findBlockedSlotConflict(
                selectedDate,
                selectedTime,
                totalDuration,
                selectedPro.id,
                businessConfig.blockedSlots || [],
                professionals
            );
            if (conflict) return;

            const newApt = await addAppointment({
                userId: user.id,
                userName: guestName, 
                clientPhone: guestPhone,
                clientEmail: guestEmail,
                serviceId: selectedServices.map(s => s.id).join(','),
                professionalId: selectedPro.id,
                date: selectedDate,
                time: selectedTime,
            });
            if (newApt) {
                setCreatedApt(newApt);
                setIsConfirmed(true);
            }
        }
    };

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const stepsLabels = ["Serviço", "Profissional", "Data e Hora", "Confirmação"];

    // Generate the next 6 months helper
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
                    businessConfig
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
    }, [selectedMonth, today, businessConfig, selectedPro, totalDuration, appointments, services]);

    // Calculate available time slots
    const { availableTimeSlots, dayIsClosed, dayIsBlocked, blockReason } = useMemo(() => {
        return calculateCoincidentAvailableSlots({
            date: selectedDate,
            professionalId: selectedPro?.id,
            totalDuration,
            appointments,
            services,
            businessConfig
        });
    }, [selectedDate, selectedPro, totalDuration, appointments, services, businessConfig]);

    // Success View
    if (isConfirmed && selectedServices.length > 0 && selectedPro) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-md border border-green-200">
                    <Check size={36} className="text-green-600" />
                </div>
                
                <h2 className="text-3xl font-serif font-bold text-slate-950 mb-2 text-center">Reserva Confirmada!</h2>
                <p className="text-slate-500 text-center text-sm max-w-sm mb-8 leading-relaxed">
                  Perfeito, {guestName.split(' ')[0]}.<br/>
                  Seu horário foi agendado com sucesso e o profissional já está preparado.
                </p>

                <Card className="w-full max-w-md mb-8 border border-green-100 bg-white shadow-[0_12px_45px_rgba(0,0,0,0.02)] p-6 space-y-4">
                    <h3 className="font-semibold text-xs tracking-wider uppercase text-slate-400 border-b pb-3 flex items-center gap-2">
                      <Sparkles size={14} className="text-primary-500" /> Detalhes do Cupom de Agendamento
                    </h3>
                    
                    <div className="space-y-4">
                        {createdApt?.id && (
                            <div className="flex items-start gap-4 pb-4 border-b border-dashed border-slate-100">
                                <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 font-bold text-xs flex items-center justify-center min-w-[40px]">
                                    Nº
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Número do Agendamento</p>
                                    <p className="font-extrabold text-emerald-600 text-lg tracking-wider font-mono">{createdApt.id}</p>
                                </div>
                            </div>
                        )}
                        
                        <div className="flex items-start gap-4">
                            <div className="p-2.5 bg-primary-50 rounded-xl text-primary-600">
                                <Scissors size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                    {selectedServices.length === 1 ? 'Serviço' : 'Serviços'}
                                </p>
                                <p className="font-bold text-slate-800 text-base">{selectedServices.map(s => s.name).join(', ')}</p>
                                <p className="text-xs text-slate-500">{totalDuration} minutos de atendimento total</p>
                            </div>
                        </div>
                        
                        <div className="flex items-start gap-4 border-t border-slate-100 pt-4">
                            <div className="p-2.5 bg-primary-50 rounded-xl text-primary-600">
                                <UserIcon size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Profissional Esteticista</p>
                                <p className="font-bold text-slate-800 text-base">{selectedPro.name}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 border-t border-slate-100 pt-4">
                            <div className="p-2.5 bg-primary-50 rounded-xl text-primary-600">
                                <Calendar size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Data e Horário</p>
                                <p className="font-bold text-slate-800 text-base capitalize">
                                    {format(parseISO(selectedDate), "EEEE, d 'de' MMMM", { locale: ptBR })}
                                </p>
                                <p className="text-lg font-extrabold text-primary-600 mt-0.5">{selectedTime}</p>
                            </div>
                        </div>

                        {businessConfig.address && (
                            <div className="flex items-start gap-4 border-t border-slate-100 pt-4">
                                <div className="p-2.5 bg-primary-50 rounded-xl text-primary-600">
                                    <MapPin size={18} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Endereço</p>
                                    <p className="font-bold text-slate-800 text-sm mt-0.5 break-words">{businessConfig.address}</p>
                                </div>
                            </div>
                        )}
                        
                        <div className="flex items-start gap-4 border-t border-slate-100 pt-4">
                            <div className="p-2.5 bg-primary-50 rounded-xl text-primary-600">
                                <Scissors size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Valor Total</p>
                                <p className="font-bold text-slate-800 text-base">{formatServicesTotalPrice(selectedServices, createdApt?.totalPrice)}</p>
                            </div>
                        </div>

                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mt-2 text-center">
                            <p className="text-xs text-amber-800 font-bold">Atenção, tempo máximo de espera de 10 minutos.</p>
                        </div>
                    </div>
                </Card>

                <div className="w-full max-w-md space-y-3">
                    <Button 
                        fullWidth 
                        onClick={sendWhatsAppMessage} 
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
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            
            {/* Header with Visual Stepper Progress */}
            <div className="p-4 bg-white border-b border-slate-200 sticky top-0 z-40">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                  <button 
                    onClick={step === 1 ? onCancel : prevStep} 
                    className="p-2 text-slate-400 hover:text-slate-800 active:scale-95 transition-transform"
                  >
                       <ChevronLeft size={24} />
                  </button>
                  
                  <div className="text-center">
                      {selectedServices.length > 0 && step > 1 && (
                        <div className="text-[10px] text-primary-600 font-bold uppercase tracking-widest line-clamp-1 max-w-xs md:max-w-md mx-auto">{selectedServices.map(s => s.name).join(', ')}</div>
                      )}
                      <h2 className="font-serif font-bold text-base md:text-lg text-slate-900 leading-tight">
                        {step === 1 && "Escolha os Serviços"}
                        {step === 2 && "Escolha o Profissional"}
                        {step === 3 && "Selecione Data e Hora"}
                        {step === 4 && "Confirmar Informações"}
                      </h2>
                  </div>
                  
                  <div className="w-10 h-10 flex items-center justify-center text-xs font-bold text-slate-400 bg-slate-50 rounded-full">
                    {step}/4
                  </div>
                </div>

                {/* Progress bar */}
                <div className="max-w-3xl mx-auto mt-3 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary-600 h-full transition-all duration-300"
                      style={{ width: `${(step / 4) * 100}%` }}
                    ></div>
                </div>
            </div>

            {/* Content view window */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
                <div className="max-w-3xl mx-auto">
                  
                  {/* Step 1: Services */}
                  {step === 1 && (
                      <div className="space-y-6">
                          <p className="text-xs text-slate-400 mb-2 font-medium">Você pode selecionar quantos serviços desejar:</p>
                          {(() => {
                              const groupedList = groupServicesByGroup(services);
                              return groupedList.map(({ groupName, items }) => (
                                  <div key={groupName} className="space-y-3">
                                      {(groupedList.length > 1 || groupName !== 'Outros Serviços') && (
                                          <div className="flex items-center gap-2 pt-1">
                                              <span className="h-2 w-2 rounded-full bg-primary-500"></span>
                                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">{groupName}</h4>
                                              <div className="flex-1 h-px bg-slate-200/70"></div>
                                          </div>
                                      )}
                                      <div className="space-y-3">
                                          {items.map(s => {
                                              const isSelected = selectedServices.some(item => item.id === s.id);
                                              return (
                                                  <div 
                                                    key={s.id} 
                                                    onClick={() => handleServiceToggle(s)} 
                                                    className={`flex items-center p-4 bg-white border rounded-2xl cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 ${
                                                        isSelected 
                                                          ? 'border-primary-500 bg-primary-50/20 shadow-[0_4px_20px_rgba(236,72,153,0.05)]' 
                                                          : 'border-slate-100 hover:border-primary-300 hover:shadow-[0_4px_20px_rgba(236,72,153,0.02)]'
                                                    }`}
                                                  >
                                                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 transition-colors shrink-0 ${
                                                          isSelected ? 'bg-primary-600 border-primary-600 text-white' : 'border-slate-300 bg-white'
                                                      }`}>
                                                          {isSelected && <Check size={12} strokeWidth={3} />}
                                                      </div>
                                                      <img 
                                                        src={getGoogleDriveThumbnail(s.imageUrl)} 
                                                        className="w-16 h-16 rounded-xl object-cover mr-4 shadow-inner shrink-0" 
                                                        alt={s.name}
                                                        referrerPolicy="no-referrer" 
                                                      />
                                                      <div className="flex-1 min-w-0">
                                                          <h3 className="font-bold text-slate-800 text-sm md:text-base truncate">{s.name}</h3>
                                                          <p className="text-xs text-slate-400 mt-1 line-clamp-1">{s.description}</p>
                                                          <p className="text-[11px] text-slate-500 font-medium mt-1 inline-flex bg-slate-50 px-2 py-0.5 rounded-md">{s.durationMinutes} minutos</p>
                                                          {s.observation && (
                                                              <p className="text-[10px] text-amber-600 font-semibold flex items-center gap-1 mt-1.5">
                                                                  <Info size={11} className="shrink-0" /> {s.observation}
                                                              </p>
                                                          )}
                                                      </div>
                                                      <div className="text-right ml-2 shrink-0">
                                                          {isVariablePriceService(s) ? (
                                                              <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-lg text-xs block">
                                                                  Valor a combinar
                                                              </span>
                                                          ) : (
                                                              <span className="font-extrabold text-primary-600 text-sm md:text-base block">{formatServicePrice(s)}</span>
                                                          )}
                                                      </div>
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  </div>
                              ));
                          })()}
                      </div>
                  )}

                  {/* Step 2: Professional */}
                  {step === 2 && selectedServices.length > 0 && (
                      <div className="space-y-4">
                        <div className="text-sm text-slate-400 mb-2 font-medium">
                          {selectedServices.length === 1 
                            ? `Estes profissionais realizam o serviço "${selectedServices[0].name}":`
                            : `Estes profissionais realizam os serviços selecionados (${selectedServices.map(s => s.name).join(', ')}):`
                          }
                        </div>
                        {professionals.filter(p => selectedServices.every(s => p.specialties.includes(s.id))).length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {professionals
                                    .filter(p => selectedServices.every(s => p.specialties.includes(s.id)))
                                    .map(p => (
                                    <div 
                                      key={p.id} 
                                      onClick={() => { setSelectedPro(p); nextStep(); }}
                                      className="flex items-center p-4 bg-white border border-slate-100 hover:border-primary-300 rounded-2xl cursor-pointer hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 group"
                                    >
                                        <img 
                                          src={p.avatarUrl} 
                                          className="w-14 h-14 rounded-full mr-4 object-cover border-2 border-slate-100 group-hover:border-primary-300 transition-colors" 
                                          alt={p.name}
                                          referrerPolicy="no-referrer" 
                                        />
                                        <div className="flex-1">
                                          <h3 className="font-bold text-slate-800 text-sm md:text-base group-hover:text-primary-600 transition-colors">{p.name}</h3>
                                          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">ESPECIALISTA</span>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-primary-50 text-slate-400 group-hover:text-primary-600 flex items-center justify-center transition-colors">
                                          <ChevronRight size={16} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 bg-amber-50 rounded-2xl text-center border border-amber-100 animate-in fade-in">
                                <p className="text-amber-800 font-bold mb-1">Sem profissionais em comum</p>
                                <p className="text-xs text-amber-600 leading-relaxed">
                                    Não encontramos nenhum profissional especializado em todos os serviços selecionados de forma combinada. Tente realizar agendamentos individuais ou remova algum serviço.
                                </p>
                            </div>
                        )}
                      </div>
                  )}

                  {/* Step 3: Date & Time */}
                  {step === 3 && selectedServices.length > 0 && selectedPro && (
                      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6">
                          
                          {/* Selected Recaps */}
                          <div className="flex flex-col sm:flex-row gap-2 justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 text-xs">
                            <div>
                               <span className="text-slate-400 uppercase font-bold tracking-wider mr-1">
                                    {selectedServices.length === 1 ? 'Serviço:' : 'Serviços:'}
                               </span>
                               <span className="font-semibold text-slate-700">
                                    {selectedServices.map(s => s.name).join(', ')} ({totalDuration} min)
                               </span>
                            </div>
                            <div>
                               <span className="text-slate-400 uppercase font-bold tracking-wider mr-1">Profissional:</span>
                               <span className="font-semibold text-slate-700">{selectedPro.name}</span>
                            </div>
                          </div>

                          {/* 1. Escolha o Mês */}
                          <div className="space-y-3">
                              <h3 className="font-bold text-slate-800 text-sm tracking-wider uppercase flex items-center gap-1.5">
                                  <Calendar size={15} className="text-primary-500" /> 1. Escolha o Mês de Atendimento
                              </h3>
                              <div className="flex gap-2 pb-1 overflow-x-auto scrollbar-thin">
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
                                              className={`flex-shrink-0 px-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer capitalize ${isSelected ? 'bg-primary-600 text-white border-primary-600 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                                          >
                                              {m.label}
                                          </button>
                                      );
                                  })}
                              </div>
                          </div>

                          {/* 2. Escolha o Dia */}
                          <div className="border-t border-slate-100 pt-5">
                              <h3 className="font-bold text-slate-800 text-sm tracking-wider uppercase mb-3">2. Escolha o dia de Atendimento ({selectedMonth ? monthsOfBooking.find(m => m.val === selectedMonth)?.label : ''})</h3>
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

                                              let cardClass = 'bg-slate-50 border-slate-200/80 text-slate-800 hover:bg-slate-100 hover:border-slate-300';
                                              if (isDisabled) {
                                                  cardClass = 'bg-slate-100/70 border-slate-200/50 text-slate-300 cursor-not-allowed opacity-60';
                                              } else if (showBlocked) {
                                                  cardClass = 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20 scale-[1.02]';
                                              } else if (isSelected) {
                                                  cardClass = 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-500/10 scale-[1.02]';
                                              } else if (isBlockedDay) {
                                                  cardClass = 'bg-amber-50/90 border-amber-300 text-amber-900 hover:bg-amber-100/80';
                                              }

                                              return (
                                                  <button 
                                                      key={d.val}
                                                      type="button"
                                                      disabled={isDisabled}
                                                      onClick={() => { setSelectedDate(d.val); setSelectedTime(''); }}
                                                      className={`h-16 sm:h-20 rounded-2xl border p-1.5 text-center flex flex-col items-center justify-between transition-all duration-200 ${isDisabled ? '' : 'cursor-pointer'} ${cardClass}`}
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
                                  </div>
                              ) : (
                                  <p className="text-xs text-slate-400">Nenhum dia disponível para este mês.</p>
                              )}
                          </div>
                          
                          {selectedDate && (
                              <div className="border-t border-slate-100 pt-5 animate-in fade-in duration-300">
                                  <h3 className="font-bold text-slate-800 text-sm tracking-wider uppercase mb-3">3. Selecione o Horário</h3>
                                  {dayIsClosed ? (
                                      <div className="p-6 bg-red-50 rounded-2xl text-center border border-red-100">
                                          <p className="text-red-800 font-bold">Fechado</p>
                                          <p className="text-xs text-red-600 mt-1">O estabelecimento não abre neste dia da semana.</p>
                                      </div>
                                  ) : dayIsBlocked ? (
                                      <div className="p-6 bg-amber-50 rounded-2xl text-center border border-amber-200 space-y-2">
                                          <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                                              <Lock size={18} />
                                          </div>
                                          <p className="text-amber-900 font-bold text-sm">Data Bloqueada para Agendamentos</p>
                                          <p className="text-xs text-amber-700">
                                              Este dia encontra-se bloqueado na agenda do salão. Por favor, selecione outra data disponível.
                                          </p>
                                          {blockReason && (
                                              <p className="text-xs text-amber-900 font-semibold bg-amber-100/90 border border-amber-300/80 rounded-xl px-3.5 py-2 inline-block mt-1">
                                                  Justificativa: {blockReason}
                                              </p>
                                          )}
                                      </div>
                                  ) : availableTimeSlots.length > 0 ? (
                                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
                                          {availableTimeSlots.map(t => (
                                              <button 
                                                  key={t} 
                                                  onClick={() => setSelectedTime(t)}
                                                  className={`py-3 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${selectedTime === t ? 'bg-primary-600 text-white shadow-md shadow-primary-500/10' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}`}
                                              >
                                                  {t}
                                              </button>
                                          ))}
                                      </div>
                                  ) : (
                                      <div className="p-6 bg-slate-50 rounded-2xl text-center border border-slate-100/50">
                                          <p className="text-slate-500 text-xs md:text-sm leading-relaxed">
                                              Nenhum horário disponível para este dia com este profissional para a duração total do atendimento ({totalDuration} min).
                                          </p>
                                      </div>
                                  )}
                              </div>
                          )}
                      </div>
                  )}

                  {/* Step 4: Confirmation & Data */}
                  {step === 4 && selectedServices.length > 0 && selectedPro && (
                      <div className="space-y-6 animate-in fade-in duration-300">
                          
                          {/* Order recap card */}
                          <Card className="bg-gradient-to-tr from-luxury-50 to-white border border-luxury-100 p-6 space-y-4">
                             <h3 className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-4 border-b pb-2">Resumo da Experiência</h3>
                             <div className="space-y-3 text-sm">
                                  <div className="flex flex-col gap-1.5 border-b border-luxury-100/40 pb-3">
                                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                                          {selectedServices.length === 1 ? 'Serviço Selecionado' : 'Serviços Selecionados'}
                                      </span>
                                      <div className="space-y-1">
                                          {selectedServices.map(s => (
                                              <div key={s.id} className="flex justify-between items-start text-xs text-slate-700">
                                                  <span className="font-medium mr-2">{s.name} ({s.durationMinutes} min)</span>
                                                  <span className="font-bold text-slate-800 shrink-0">{formatServicePrice(s)}</span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                                  <div className="flex justify-between items-center gap-2 pt-1">
                                      <span className="text-slate-500">Tempo de Duração Total</span>
                                      <span className="font-bold text-slate-800">{totalDuration} minutos</span>
                                  </div>
                                  <div className="flex justify-between items-center gap-2">
                                      <span className="text-slate-500">Especialista</span>
                                      <span className="font-bold text-slate-800">{selectedPro.name}</span>
                                  </div>
                                  <div className="flex justify-between items-center gap-2">
                                      <span className="text-slate-500 font-sans">Agendamento</span>
                                      <span className="font-bold text-slate-800 capitalize">
                                        {format(parseISO(selectedDate), 'dd/MM/yyyy')} às {selectedTime}
                                      </span>
                                  </div>
                                  <div className="border-t border-luxury-100/80 pt-4 flex justify-between items-center">
                                      <span className="text-base font-bold text-slate-800">Total Devido no Local</span>
                                      <span className="text-xl md:text-2xl font-extrabold text-primary-600 font-sans text-right">
                                          {formatServicesTotalPrice(selectedServices)}
                                      </span>
                                  </div>
                                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mt-4 text-center">
                                      <p className="text-xs text-amber-800 font-bold">Atenção, tempo máximo de espera de 10 minutos.</p>
                                  </div>
                             </div>
                          </Card>

                          {/* Contact Info inputs */}
                          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
                              <h3 className="font-serif text-lg font-bold text-slate-900 border-b pb-3 mb-2 flex items-center gap-1.5">
                                <UserIcon className="text-primary-500" size={18} /> Seus Dados de Atendimento
                              </h3>
                              
                              <div className="space-y-4">
                                <Input 
                                    label="Seu Nome Completo" 
                                    value={guestName} 
                                    onChange={e => setGuestName(e.target.value)} 
                                    placeholder="Ex: Maria Carolina"
                                    required
                                />
                                <Input 
                                    label="Contato WhatsApp" 
                                    value={guestPhone} 
                                    onChange={e => {
                                        let v = e.target.value.replace(/\D/g, '');
                                        if (v.length > 11) v = v.substring(0, 11);
                                        let formatted = v;
                                        if (v.length > 2) formatted = `(${v.substring(0, 2)}) ${v.substring(2)}`;
                                        if (v.length > 3) formatted = `(${v.substring(0, 2)}) ${v.substring(2, 3)} ${v.substring(3)}`;
                                        if (v.length > 7) formatted = `(${v.substring(0, 2)}) ${v.substring(2, 3)} ${v.substring(3, 7)}-${v.substring(7)}`;
                                        setGuestPhone(formatted);
                                    }} 
                                    placeholder="Ex: (11) 9 9999-9999"
                                    type="tel"
                                    required
                                />
                                <Input 
                                    label="Email para Confirmação" 
                                    value={guestEmail} 
                                    onChange={e => setGuestEmail(e.target.value)} 
                                    placeholder="Ex: maria.lima@exemplo.com"
                                    type="email"
                                />
                              </div>
                          </div>

                          <p className="text-[11px] text-slate-400 text-center leading-normal">
                              Ao confirmar este agendamento, você autoriza o recebimento de mensagens automáticas de lembrete com emojis gerados por inteligência artificial em seu celular.
                          </p>
                      </div>
                  )}

                </div>
            </div>

            {/* Sticky wizard footer */}
            <div className="p-4 bg-white border-t border-slate-200 sticky bottom-0">
                <div className="max-w-3xl mx-auto">
                  {step === 1 && (
                      <Button 
                        fullWidth 
                        disabled={selectedServices.length === 0} 
                        onClick={nextStep}
                        className="bg-primary-600 text-white py-3 hover:bg-primary-700"
                      >
                          Prosseguir para o Profissional ({selectedServices.length} {selectedServices.length === 1 ? 'selecionado' : 'selecionados'})
                      </Button>
                  )}
                  {step === 3 && (
                      <Button fullWidth disabled={!selectedDate || !selectedTime} onClick={nextStep}>
                          Prosseguir para Finalização
                      </Button>
                  )}
                  {step === 4 && (
                      <Button fullWidth disabled={!guestName || !guestPhone} onClick={handleBook} className="bg-primary-600 text-white py-3.5 hover:bg-primary-700">
                          Confirmar Minha Experiência
                      </Button>
                  )}
                </div>
            </div>
        </div>
    );
}

// Reschedule Wizard Component - Compact and Premium Look
interface RescheduleWizardProps {
    appointment: Appointment;
    onCancel: () => void;
    onSuccess: () => void;
}


export default BookingWizard;
