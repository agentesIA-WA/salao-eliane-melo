import React, { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Service, Professional, AppointmentStatus, Appointment } from '../../types';
import { Button, Card, Badge, Input } from '../../components/Shared';
import { Calendar, Clock, User as UserIcon, Star, Scissors, LogOut, Plus, ChevronLeft, Phone, Mail, Check, Sparkles, Sliders, ChevronRight, MapPin, MessageCircle, Trash2, RefreshCw, X, Info } from 'lucide-react';
import { format, startOfToday, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getGoogleDriveThumbnail } from '../../services/driveUtils';

// Extracted sub-view components
import BookingWizard from './components/BookingWizard';
import RescheduleWizard from './components/RescheduleWizard';

// Helper to convert "HH:mm" to minutes from midnight
const timeToMinutes = (time: string) => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

// Helper to convert minutes from midnight to "HH:mm"
const minutesToTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const ClientDashboard: React.FC = () => {
  const { user, logout, appointments, services, professionals, businessConfig, updateAppointmentStatus } = useApp();
  const [view, setView] = useState<'home' | 'history' | 'book'>('home');
  
  // Booking State
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedPro, setSelectedPro] = useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  // Search State
  const [searchCode, setSearchCode] = useState('');
  const [searchedAppointment, setSearchedAppointment] = useState<Appointment | null>(null);
  const [searchError, setSearchError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Reschedule & Cancel States
  const [reschedulingApt, setReschedulingApt] = useState<Appointment | null>(null);
  const [cancellingAptId, setCancellingAptId] = useState<string | null>(null);

  const handleSearchAppointment = (code: string) => {
    setHasSearched(true);
    setSearchError('');
    setSearchedAppointment(null);
    if (!code.trim()) {
      setSearchError('Por favor, informe o número do agendamento.');
      return;
    }
    
    // Allow finding by lowercase, uppercase, with or without 'AG-'
    const cleanCode = code.toUpperCase().trim();
    const searchTarget = cleanCode.startsWith('AG-') ? cleanCode : `AG-${cleanCode}`;
    
    const found = appointments.find(apt => 
      apt.id.toUpperCase() === searchTarget || 
      apt.id.toUpperCase() === cleanCode
    );
    if (found) {
      setSearchedAppointment(found);
    } else {
      setSearchError('Reserva não encontrada. Verifique o número informado.');
    }
  };

  const resetBooking = () => {
    setSelectedServices([]);
    setSelectedPro(null);
    setSelectedDate('');
    setSelectedTime('');
  };

  const sendWhatsAppCancellation = (apt: Appointment) => {
    const cleanPhone = (apt.clientPhone || '').replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 11 || cleanPhone.length === 10 ? `55${cleanPhone}` : cleanPhone;
    const dateStr = format(parseISO(apt.date), "EEEE, d 'de' MMMM", { locale: ptBR });
    const ids = apt.serviceId ? apt.serviceId.split(',') : [];
    const aptServices = services.filter(s => ids.includes(s.id));
    const servicesStr = aptServices.map(s => s.name).join(', ');
    const companyName = businessConfig.companyName || 'Salão de Beleza';
    
    const message = `Olá, ${apt.userName}!
Seu agendamento no *${companyName}* foi cancelado com sucesso. ❌

🔢 *Nº do Agendamento:* ${apt.id}
💇‍♀️ *Serviço:* ${servicesStr}
📅 *Data:* ${dateStr}
⏰ *Horário:* ${apt.time}

Se precisar, estamos sempre à disposição para novos agendamentos! 🥰`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${formattedPhone}?text=${encodedMessage}`, '_blank');
  };

  const handleCancelAppointment = async (id: string) => {
    const apt = appointments.find(a => a.id === id);
    if (!apt) return;
    await updateAppointmentStatus(id, AppointmentStatus.CANCELLED);
    setCancellingAptId(null);
    sendWhatsAppCancellation(apt);
    // Sync the search result if it's the one that got cancelled
    if (searchedAppointment && searchedAppointment.id === id) {
      setSearchedAppointment({ ...searchedAppointment, status: AppointmentStatus.CANCELLED });
    }
  };

  const myAppointments = useMemo(() => {
      return appointments
        .filter(a => a.userId === user?.id)
        .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [appointments, user?.id]);

  const upcoming = myAppointments.filter(a => 
    [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED].includes(a.status)
  );

  const completedOrOthers = myAppointments.filter(a => 
    ![AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED].includes(a.status)
  );

  if (view === 'book') {
    return (
      <BookingWizard 
        onCancel={() => { resetBooking(); setView('home'); }}
        onSuccess={() => { resetBooking(); setView('home'); }}
        selectedServices={selectedServices}
        setSelectedServices={setSelectedServices}
        selectedPro={selectedPro}
        setSelectedPro={setSelectedPro}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        selectedTime={selectedTime}
        setSelectedTime={setSelectedTime}
      />
    );
  }

  if (reschedulingApt) {
    return (
      <RescheduleWizard 
        appointment={reschedulingApt}
        onCancel={() => setReschedulingApt(null)}
        onSuccess={() => {
          setReschedulingApt(null);
          if (searchedAppointment && searchedAppointment.id === reschedulingApt.id) {
            const updated = appointments.find(a => a.id === reschedulingApt.id);
            if (updated) {
              setSearchedAppointment(updated);
            }
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen pb-32 bg-gradient-to-tr from-luxury-50 via-white to-primary-50/20 text-slate-800 transition-colors">
      
      {/* Premium Adaptive Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-luxury-100">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold shadow-inner">
              {user?.name.charAt(0)}
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium scale-95 origin-left">ÁREA DO CLIENTE</p>
              <h1 className="text-lg md:text-xl font-serif font-bold text-slate-900 leading-tight">Olá, {user?.name.split(' ')[0]}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={logout} 
              className="p-2.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 active:scale-95 transition-all cursor-pointer"
              title="Sair da Conta"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container - Fully Responsive Grid System */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10">
        {view === 'home' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left side: Hero statement + Popular Services Grid (8 columns on desktop) */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Luxury Salon Promo Card */}
              <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-luxury-900 to-primary-950 text-white relative overflow-hidden shadow-[0_10px_30px_rgba(236,72,153,0.1)]">
                <div className="absolute right-0 top-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none -mr-12 -mt-12"></div>
                <div className="absolute left-0 bottom-0 w-32 h-32 bg-luxury-400/10 rounded-full blur-2xl pointer-events-none -ml-8 -mb-8"></div>
                
                <div className="max-w-md space-y-3 z-10 relative">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-primary-200 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
                    <Sparkles size={12} /> {businessConfig.companyName || 'Salão Eliane Melo'}
                  </div>
                  <h2 className="text-2xl md:text-3xl font-serif font-light leading-tight">
                    Sua melhor versão <br/>
                    <span className="font-serif italic font-normal text-primary-300">merece ser revelada.</span>
                  </h2>
                  <p className="text-luxury-200 text-sm font-light leading-relaxed">
                    {businessConfig.description || 'Escolha um de nossos serviços sofisticados abaixo e agende agora sua experiência privativa de beleza.'}
                  </p>
                  <div className="pt-2">
                    <Button 
                      onClick={() => { resetBooking(); setView('book'); }}
                      className="bg-primary-600 hover:bg-primary-700 text-white border-none py-2 px-5 text-sm rounded-xl font-medium"
                    >
                      Agendar um Horário
                    </Button>
                  </div>
                </div>
              </div>

              {/* Services Section */}
              <section className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="font-serif text-2xl font-bold text-slate-900 tracking-wide">Nossos Serviços</h3>
                    <p className="text-slate-400 text-xs">Selecione o serviço ideal para o seu dia</p>
                  </div>
                </div>

                {/* Popular Services Grid (Responsive layout) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                  {services.map(service => (
                    <div 
                      key={service.id} 
                      className="group flex flex-col md:flex-row bg-white rounded-2xl md:rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.01)] border border-luxury-100 hover:border-primary-300 overflow-hidden cursor-pointer hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5"
                      onClick={() => {
                        setSelectedServices([service]);
                        setView('book');
                      }}
                    >
                      <div className="relative w-full md:w-32 h-40 md:h-full min-h-[120px] bg-slate-100 overflow-hidden">
                        <img 
                          src={getGoogleDriveThumbnail(service.imageUrl)} 
                          alt={service.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent md:hidden"></div>
                      </div>
                      
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-semibold text-slate-800 group-hover:text-primary-600 transition-colors text-base md:text-lg line-clamp-1">{service.name}</h4>
                          </div>
                          <p className="text-slate-400 text-xs line-clamp-2 mt-1 leading-relaxed">{service.description}</p>
                          {service.observation && (
                            <div className="flex items-start gap-1.5 mt-2 px-2.5 py-1.5 bg-amber-50 border border-amber-200/60 rounded-lg">
                              <Info size={12} className="text-amber-500 shrink-0 mt-0.5" />
                              <p className="text-[11px] text-amber-700 font-medium line-clamp-2 leading-relaxed">{service.observation}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-50">
                          <span className="text-primary-600 font-bold text-base md:text-lg">R$ {Number(service.price).toFixed(2)}</span>
                          <span className="flex items-center text-xs text-slate-400 gap-1 font-medium bg-slate-50 px-2.5 py-1 rounded-lg">
                            <Clock size={12} className="text-slate-400" /> {service.durationMinutes} min
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

            </div>

            {/* Right side: Quick Upcoming Appointments preview (4 columns on desktop) */}
            <div className="lg:col-span-4 space-y-6">

              {/* Buscar Agendamento */}
              <div className="bg-white p-6 rounded-2xl md:rounded-3xl border border-luxury-100 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-4">
                <h3 className="font-serif text-lg font-bold text-slate-900 border-b border-luxury-50 pb-3 flex items-center justify-between">
                  <span>Buscar Agendamento</span>
                  <Check size={16} className="text-primary-500" />
                </h3>
                
                <p className="text-xs text-slate-400">Insira o código do seu agendamento (ex: AG-123456) para consultar os detalhes.</p>
                
                <div className="flex gap-2">
                  <Input 
                    type="text" 
                    placeholder="Código do agendamento"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    className="flex-1 text-xs border border-slate-250 py-1.5 px-3 rounded-xl focus:border-primary-500 font-mono tracking-wider"
                  />
                  <Button 
                    onClick={() => handleSearchAppointment(searchCode)}
                    className="bg-slate-900 hover:bg-black text-white text-xs border-none py-2 px-3 rounded-xl font-medium shrink-0"
                  >
                    Buscar
                  </Button>
                </div>

                {searchError && (
                  <p className="text-xs font-semibold text-red-500 bg-red-50 p-2.5 rounded-xl border border-red-100">
                    {searchError}
                  </p>
                )}

                {hasSearched && searchedAppointment && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3 relative overflow-hidden animate-in fade-in duration-300">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] bg-primary-100 text-primary-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                        {searchedAppointment.id}
                      </span>
                      <button 
                        onClick={() => {
                          setHasSearched(false);
                          setSearchedAppointment(null);
                          setSearchCode('');
                        }}
                        className="text-slate-400 hover:text-slate-600 text-xs shrink-0 font-bold"
                      >
                        Limpar
                      </button>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-800">
                        {services.filter(s => searchedAppointment.serviceId?.split(',').includes(s.id)).map(s => s.name).join(', ') || 'Nenhum'}
                      </p>
                      
                      <div className="space-y-1 text-[11px] text-slate-600">
                        <p className="flex items-center gap-1.5 font-medium">
                          <Calendar size={12} className="text-primary-500" />
                          {format(parseISO(searchedAppointment.date), "dd/MM/yyyy")} às {searchedAppointment.time}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <UserIcon size={12} className="text-primary-500 text-slate-400" />
                          Profissional: {professionals.find(p => p.id === searchedAppointment.professionalId)?.name || 'Qualquer'}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Badge 
                            color={
                              searchedAppointment.status === AppointmentStatus.CONFIRMED ? 'green' :
                              searchedAppointment.status === AppointmentStatus.COMPLETED ? 'pink' :
                              searchedAppointment.status === AppointmentStatus.CANCELLED ? 'red' : 'gray'
                            }
                          >
                            {searchedAppointment.status}
                          </Badge>
                        </p>
                      </div>

                      {businessConfig.address && (
                        <div className="pt-2 border-t border-slate-200/60 flex gap-1 items-start text-[10px] text-slate-500 leading-normal">
                          <MapPin size={12} className="text-slate-400 shrink-0 mt-0.5" />
                          <span className="break-words">{businessConfig.address}</span>
                        </div>
                      )}

                      {/* Cancel conformation OR actions */}
                      {([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED].includes(searchedAppointment.status)) && (
                        <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                          {cancellingAptId === searchedAppointment.id ? (
                            <div className="bg-red-50 p-2.5 rounded-xl border border-red-200 text-[11px] text-center space-y-2">
                              <p className="font-semibold text-red-800">Deseja realmente cancelar este agendamento?</p>
                              <div className="flex gap-2 justify-center">
                                <button 
                                  onClick={() => handleCancelAppointment(searchedAppointment.id)} 
                                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-all text-[10px] cursor-pointer"
                                >
                                  Sim, Cancelar
                                </button>
                                <button 
                                  onClick={() => setCancellingAptId(null)} 
                                  className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold transition-all text-[10px] cursor-pointer"
                                >
                                  Não, voltar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2 pt-1">
                              <button 
                                onClick={() => setReschedulingApt(searchedAppointment)}
                                className="flex-1 py-1.5 px-3 border border-slate-250 hover:border-slate-400 bg-white hover:bg-slate-55 text-slate-700 rounded-xl font-semibold text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <RefreshCw size={12} className="text-primary-500" /> Reagendar
                              </button>
                              <button 
                                onClick={() => setCancellingAptId(searchedAppointment.id)}
                                className="py-1.5 px-2.5 border border-red-200 hover:border-red-400 hover:bg-red-50 text-red-500 rounded-xl font-semibold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0"
                                title="Cancelar Agendamento"
                              >
                                <Trash2 size={12} /> Cancelar
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-white p-6 rounded-2xl md:rounded-3xl border border-luxury-100 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-5">
                <h3 className="font-serif text-lg font-bold text-slate-900 border-b border-luxury-50 pb-3 flex items-center justify-between">
                  <span>Próximos Horários</span>
                  {upcoming.length > 0 && <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping"></span>}
                </h3>

                {upcoming.length > 0 ? (
                  <div className="space-y-4 font-sans">
                    {upcoming.map(apt => {
                      const ids = apt.serviceId ? apt.serviceId.split(',') : [];
                      const aptServices = services.filter(s => ids.includes(s.id));
                      const serviceName = aptServices.map(s => s.name).join(', ') || 'Outro';
                      const serviceDuration = aptServices.reduce((sum, s) => sum + Number(s.durationMinutes), 0);
                      const pro = professionals.find(p => p.id === apt.professionalId);
                      return (
                        <div key={apt.id} className="p-4 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary-50/50 to-primary-100/20 border border-primary-100/50 relative overflow-hidden group space-y-3">
                          <div className="absolute right-0 top-0 w-24 h-24 bg-primary-500/5 rounded-full blur-xl pointer-events-none"></div>
                          
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <Badge color="pink" children={<span className="text-[10px] tracking-wider uppercase font-bold">{apt.status}</span>} />
                              <h4 className="font-bold text-slate-800 text-base mt-2">{serviceName}</h4>
                            </div>
                          </div>

                          <div className="space-y-2 text-slate-600">
                            <div className="flex items-center gap-2 text-xs">
                              <Calendar size={13} className="text-primary-600" />
                              <span className="font-medium capitalize text-slate-700">
                                {format(parseISO(apt.date), "EEEE, d 'de' MMMM", { locale: ptBR })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Clock size={13} className="text-primary-600" />
                              <span className="font-medium text-slate-700">{apt.time} ({serviceDuration} minutos)</span>
                            </div>
                            {pro && (
                              <div className="flex items-center gap-2 text-xs">
                                <UserIcon size={13} className="text-primary-600" />
                                <span className="font-medium text-slate-700">Profissional: {pro.name}</span>
                              </div>
                            )}
                          </div>

                          {/* Quick Cancel confirmation or actions */}
                          <div className="pt-2.5 border-t border-primary-100/40">
                            {cancellingAptId === apt.id ? (
                              <div className="bg-red-50 p-2.5 rounded-xl border border-red-200 text-[11px] text-center space-y-2">
                                <p className="font-semibold text-red-800">Deseja realmente cancelar este agendamento?</p>
                                <div className="flex gap-2 justify-center">
                                  <button 
                                    onClick={() => handleCancelAppointment(apt.id)} 
                                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[10px] cursor-pointer"
                                  >
                                    Sim, Cancelar
                                  </button>
                                  <button 
                                    onClick={() => setCancellingAptId(null)} 
                                    className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold text-[10px] cursor-pointer"
                                  >
                                    Não
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => setReschedulingApt(apt)}
                                  className="flex-1 py-1.5 px-3 border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <RefreshCw size={11} className="text-primary-500" /> Reagendar
                                </button>
                                <button 
                                  onClick={() => setCancellingAptId(apt.id)}
                                  className="py-1.5 px-2 border border-red-200 hover:border-red-400 hover:bg-red-50 text-red-500 rounded-xl font-bold text-[11px] transition-all flex items-center justify-center cursor-pointer pb-1.5 shrink-0"
                                  title="Cancelar Agendamento"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mx-auto mb-3">
                      <Calendar size={20} />
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed">Você não possui nenhum agendamento pendente.</p>
                    <button 
                      onClick={() => setView('book')} 
                      className="text-primary-600 hover:text-primary-700 hover:underline text-xs font-semibold mt-2 cursor-pointer inline-flex items-center gap-1"
                    >
                      Agende o primeiro agora <ChevronRight size={12}/>
                    </button>
                  </div>
                )}
              </div>

              {/* Informative Tip Card */}
              <div className="p-5 rounded-2xl md:rounded-3xl bg-luxury-100/40 border border-luxury-100 text-slate-600 space-y-2 text-xs leading-relaxed">
                <p className="font-semibold text-slate-700">Políticas de Cancelamento</p>
                <p>Nossos atendimentos são reservados individualmente para sua comodidade. Caso precise reagendar, pedimos que altere com até 24 horas de antecedência.</p>
                <p className="text-primary-600 font-medium">Fale Conosco: +55 (61) 99369-3493</p>
              </div>

            </div>

          </div>
        )}
        
        {/* HISTORY VIEW: Beautiful Full List */}
        {view === 'history' && (
          <section className="max-w-3xl mx-auto space-y-6">
            <div className="text-center md:text-left">
              <h2 className="font-serif text-3xl font-bold text-slate-900 tracking-wide">Meus Agendamentos</h2>
              <p className="text-slate-400 text-sm mt-1">Veja todo seu histórico de visitas e agendamentos confirmados.</p>
            </div>
            
            <div className="space-y-4">
              {myAppointments.map(apt => {
                const ids = apt.serviceId ? apt.serviceId.split(',') : [];
                const aptServices = services.filter(s => ids.includes(s.id));
                const serviceName = aptServices.map(s => s.name).join(', ') || 'Outro';
                const servicePrice = aptServices.reduce((sum, s) => sum + s.price, 0);
                const pro = professionals.find(p => p.id === apt.professionalId);
                
                const isUpcoming = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED].includes(apt.status);
                
                return (
                  <div 
                    key={apt.id} 
                    className="bg-white p-5 rounded-2xl border border-luxury-100/80 shadow-[0_4px_25px_rgba(0,0,0,0.01)] flex flex-col gap-4 group hover:shadow-sm transition-all duration-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
                          <Scissors size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-800 text-base md:text-lg">{serviceName}</h4>
                          </div>
                          
                          <div className="flex flex-wrap items-center text-slate-500 text-xs md:text-sm gap-x-3 gap-y-1 mt-1 font-medium">
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                              {apt.id}
                            </span>
                            <span className="flex items-center gap-1 text-slate-700">
                              <Calendar size={13} className="text-slate-400" /> 
                              {format(parseISO(apt.date), 'dd/MM/yyyy')}
                            </span>
                            <span className="flex items-center gap-1 text-slate-700">
                              <Clock size={13} className="text-slate-400" /> {apt.time}
                            </span>
                            {pro && (
                              <span className="text-slate-400 font-medium">c/ {pro.name}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t border-slate-50 sm:border-none">
                        <span className="text-slate-800 font-bold font-sans text-sm md:text-base sm:mr-3">R$ {Number(servicePrice).toFixed(2)}</span>
                        <Badge 
                          color={
                            apt.status === AppointmentStatus.CONFIRMED ? 'green' :
                            apt.status === AppointmentStatus.COMPLETED ? 'pink' :
                            apt.status === AppointmentStatus.CANCELLED ? 'red' : 'gray'
                          }
                        >{apt.status}</Badge>
                      </div>
                    </div>

                    {/* Reschedule and Cancel buttons */}
                    {isUpcoming && (
                      <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row gap-2 justify-end items-center">
                        {cancellingAptId === apt.id ? (
                          <div className="w-full md:w-auto bg-red-50 p-3 rounded-xl border border-red-200 text-xs text-center space-y-2 md:space-y-0 md:flex md:items-center md:gap-4 md:justify-between animate-in fade-in duration-200">
                            <p className="font-semibold text-red-800">Deseja realmente cancelar seu agendamento {apt.id}?</p>
                            <div className="flex gap-2 justify-center">
                              <button 
                                onClick={() => handleCancelAppointment(apt.id)} 
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-all text-xs cursor-pointer"
                              >
                                Sim, Cancelar
                              </button>
                              <button 
                                onClick={() => setCancellingAptId(null)} 
                                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold transition-all text-xs cursor-pointer"
                              >
                                Não, voltar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2 w-full md:w-auto md:justify-end">
                            <button 
                              onClick={() => setReschedulingApt(apt)}
                              className="flex-1 md:flex-initial py-2 px-4 border border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <RefreshCw size={12} className="text-primary-500 animation-spin-slow" /> Reagendar Atendimento
                            </button>
                            <button 
                              onClick={() => setCancellingAptId(apt.id)}
                              className="py-2 px-3 border border-red-200 hover:border-red-400 hover:bg-red-50 text-red-500 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0"
                              title="Cancelar Agendamento"
                            >
                              <Trash2 size={12} /> Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {myAppointments.length === 0 && (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mx-auto mb-4">
                    <Scissors size={28} />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-slate-800 mb-1">Nenhum agendamento ainda</h3>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">Que tal descobrir nossa lista de serviços exclusivos e reservar uma experiência incrível de spa?</p>
                  <Button variant="primary" onClick={() => setView('book')}>Escolher Serviço</Button>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Floating Island Bottom Navigation - The Ultimate Premium Aesthetic */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 max-w-md w-[calc(100%-2rem)] bg-white/95 backdrop-blur-md shadow-[0_15px_30px_rgba(0,0,0,0.08)] border border-luxury-100 rounded-3xl z-50">
          <div className="flex justify-around items-center px-4 py-2">
              <button 
                onClick={() => setView('home')} 
                className={`flex flex-col items-center p-2.5 transition-all outline-none rounded-xl cursor-pointer ${view === 'home' ? 'text-primary-600 font-bold scale-105' : 'text-slate-400 font-medium hover:text-slate-600'}`}
              >
                  <Scissors size={20} className={view === 'home' ? 'stroke-[2.5px]' : 'stroke-2'} />
                  <span className="text-[10px] mt-1 tracking-wider uppercase font-sans">Serviços</span>
              </button>

              <button 
                onClick={() => { resetBooking(); setView('book'); }} 
                className="flex items-center justify-center -translate-y-6 bg-primary-600 text-white rounded-full w-14 h-14 shadow-lg hover:bg-primary-700 active:scale-90 transition-all cursor-pointer shadow-primary-500/20 group"
                title="Novo Agendamento"
              >
                  <Plus size={28} className="transition-transform group-hover:rotate-90 duration-300 pointer-events-none" />
              </button>

              <button 
                onClick={() => setView('history')} 
                className={`flex flex-col items-center p-2.5 transition-all outline-none rounded-xl cursor-pointer ${view === 'history' ? 'text-primary-600 font-bold scale-105' : 'text-slate-400 font-medium hover:text-slate-600'}`}
              >
                  <Calendar size={20} className={view === 'history' ? 'stroke-[2.5px]' : 'stroke-2'} />
                  <span className="text-[10px] mt-1 tracking-wider uppercase font-sans">Agenda</span>
              </button>
          </div>
      </nav>
    </div>
  );
};
