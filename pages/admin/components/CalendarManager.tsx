import React, { useState } from 'react';
import { useApp } from '../../../contexts/AppContext';
import { Appointment, AppointmentStatus, Service, Professional, BusinessConfig } from '../../../types';
import { Button, Card, Badge, Input, Modal } from '../../../components/Shared';
import { Calendar as CalendarIcon, Users, Scissors, MessageCircle, TrendingUp, Plus, Trash2, Check, X, Clock, Pencil, Briefcase, Settings, Loader2, Coffee, Phone, Mail, Sparkles, AlertCircle, Lock, Upload, ImageIcon, Link as LinkIcon, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateWhatsAppMessage } from '../../../services/geminiService';
import { AdminCalendarView } from '../../../components/AdminCalendarView';

const CalendarManager: React.FC = () => {
    const { appointments, updateAppointmentStatus, updateAppointment, services, professionals, addAppointment, businessConfig, updateBusinessConfig } = useApp();
    const [isGenerating, setIsGenerating] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');

    const [isBlockedModalOpen, setIsBlockedModalOpen] = useState(false);
    const [blockedForm, setBlockedForm] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        period: 'INTEIRO', // 'MANHA', 'TARDE', 'INTEIRO', 'CUSTOM'
        time: '00:00',
        professionalId: 'ALL',
        durationMinutes: 1440
    });

    const handlePeriodChange = (period: string) => {
        let time = '00:00';
        let durationMinutes = 1440;
        
        if (period === 'MANHA') {
            time = '08:00';
            durationMinutes = 240; // 4 hours
        } else if (period === 'TARDE') {
            time = '13:00';
            durationMinutes = 300; // 5 hours
        } else if (period === 'CUSTOM') {
            time = '09:00';
            durationMinutes = 60;
        }

        setBlockedForm({ ...blockedForm, period, time, durationMinutes });
    };

    const handleAddBlock = async () => {
        if (!blockedForm.date || !blockedForm.time) return;
        const newBlock = {
            id: 'block-' + Date.now(),
            date: blockedForm.date,
            time: blockedForm.time,
            professionalId: blockedForm.professionalId,
            durationMinutes: Number(blockedForm.durationMinutes)
        };
        const updatedBlocks = [...(businessConfig.blockedSlots || []), newBlock];
        await updateBusinessConfig({ ...businessConfig, blockedSlots: updatedBlocks });
        setBlockedForm({ ...blockedForm, period: 'INTEIRO', time: '00:00', durationMinutes: 1440 });
    };

    const handleDeleteBlock = async (idToDel: string) => {
        const updatedBlocks = (businessConfig.blockedSlots || []).filter(b => b.id !== idToDel);
        await updateBusinessConfig({ ...businessConfig, blockedSlots: updatedBlocks });
    };

    // State for New Appointment Modal
    const [isNewAptModalOpen, setIsNewAptModalOpen] = useState(false);
    const [newAptForm, setNewAptForm] = useState({
        userName: '',
        clientEmail: '',
        clientPhone: '',
        serviceId: '',
        professionalId: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '09:00'
    });

    // State for Edits/Rescheduling
    const [editApt, setEditApt] = useState<Appointment | null>(null);
    const [editForm, setEditForm] = useState({
        userName: '',
        clientEmail: '',
        clientPhone: '',
        serviceId: '',
        professionalId: '',
        date: '',
        time: ''
    });

    const handleOpenEditModal = (apt: Appointment) => {
        setEditApt(apt);
        setEditForm({
            userName: apt.userName || '',
            clientEmail: apt.clientEmail || '',
            clientPhone: apt.clientPhone || '',
            serviceId: apt.serviceId || '',
            professionalId: apt.professionalId || '',
            date: apt.date || '',
            time: apt.time || ''
        });
    };

    const handleUpdateApt = async () => {
        if (!editApt) return;
        if (editForm.userName && editForm.serviceId && editForm.professionalId && editForm.date && editForm.time) {
            await updateAppointment(editApt.id, {
                userName: editForm.userName,
                clientEmail: editForm.clientEmail,
                clientPhone: editForm.clientPhone,
                serviceId: editForm.serviceId,
                professionalId: editForm.professionalId,
                date: editForm.date,
                time: editForm.time
            });
            setEditApt(null);
        }
    };

    const editSelectedServiceIds = editForm.serviceId ? editForm.serviceId.split(',').filter(Boolean) : [];
    const filteredProfessionalsForEdit = editSelectedServiceIds.length > 0
        ? professionals.filter(p => editSelectedServiceIds.every(sid => p.specialties.includes(sid)) || p.id === editForm.professionalId)
        : professionals;

    const handleEditServiceToggle = (serviceId: string) => {
        const current = editForm.serviceId ? editForm.serviceId.split(',').filter(Boolean) : [];
        let updated: string[];
        if (current.includes(serviceId)) {
            updated = current.filter(id => id !== serviceId);
        } else {
            updated = [...current, serviceId];
        }
        setEditForm({ ...editForm, serviceId: updated.join(','), professionalId: '' });
    };

    const handleStatusChange = (id: string, newStatus: AppointmentStatus) => {
        updateAppointmentStatus(id, newStatus);
    };

    const handleGenerateMessage = async (apt: Appointment) => {
        setIsGenerating(apt.id);
        const ids = apt.serviceId ? apt.serviceId.split(',') : [];
        const aptServices = services.filter(s => ids.includes(s.id));
        const pro = professionals.find(p => p.id === apt.professionalId);
        
        if (aptServices.length > 0 && pro) {
            const serviceName = aptServices.map(s => s.name).join(', ');
            const totalDuration = aptServices.reduce((sum, s) => sum + Number(s.durationMinutes), 0);
            const totalPrice = aptServices.reduce((sum, s) => sum + s.price, 0);
            const syntheticService: Service = {
                id: apt.serviceId,
                name: serviceName,
                description: '',
                durationMinutes: totalDuration,
                price: totalPrice
            };
            const msg = await generateWhatsAppMessage(apt, syntheticService, pro);
            const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
            window.open(url, '_blank');
        }
        setIsGenerating(null);
    };

    const handleSubmitNewApt = () => {
        if (newAptForm.userName && newAptForm.serviceId && newAptForm.professionalId && newAptForm.date && newAptForm.time) {
            const finalEmail = newAptForm.clientEmail.trim() ? newAptForm.clientEmail.trim() : `guest_${Date.now()}@salao.local`;

            addAppointment({
                userId: `guest-${Date.now()}`,
                userName: newAptForm.userName,
                clientEmail: finalEmail,
                clientPhone: newAptForm.clientPhone,
                serviceId: newAptForm.serviceId,
                professionalId: newAptForm.professionalId,
                date: newAptForm.date,
                time: newAptForm.time
            });
            setIsNewAptModalOpen(false);
            setNewAptForm({
                userName: '',
                clientEmail: '',
                clientPhone: '',
                serviceId: '',
                professionalId: '',
                date: format(new Date(), 'yyyy-MM-dd'),
                time: '09:00'
            });
        }
    };

    const filteredProfessionals = newAptForm.serviceId 
        ? professionals.filter(p => p.specialties.includes(newAptForm.serviceId))
        : [];

    const sortedApts = [...appointments].sort((a, b) => b.id.localeCompare(a.id));

    return (
        <div className="space-y-6">
             <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h2 className="text-3xl font-serif font-bold text-slate-900 tracking-wide">Agendamentos Realizados</h2>
                  <p className="text-slate-400 text-sm mt-1">Visualize listagem de clientes e gerencie o fluxo de agendamentos diário do salão.</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="bg-slate-100 p-1 rounded-xl flex w-full sm:w-auto sm:mr-2">
                        <button onClick={() => setViewMode('list')} className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Lista</button>
                        <button onClick={() => setViewMode('calendar')} className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewMode === 'calendar' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Calendário</button>
                    </div>
                    <Button 
                    onClick={() => setIsBlockedModalOpen(true)} 
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 px-4 self-start sm:self-auto rounded-xl flex items-center gap-1.5 flex-1 sm:flex-none justify-center"
                    >
                    <Lock size={18} /> Bloqueios
                    </Button>
                    <Button 
                    onClick={() => setIsNewAptModalOpen(true)} 
                    className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-5 self-start sm:self-auto rounded-xl flex items-center gap-1.5 flex-1 sm:flex-none justify-center"
                    >
                    <Plus size={18} /> Novo Agendamento
                    </Button>
                </div>
             </div>

             {viewMode === 'calendar' ? (
                 <AdminCalendarView 
                     appointments={appointments}
                     services={services}
                     professionals={professionals}
                     businessConfig={businessConfig}
                     onEdit={handleOpenEditModal}
                     onMessage={handleGenerateMessage}
                 />
             ) : (
             <div className="bg-white rounded-2xl md:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.01)] border border-slate-100 overflow-hidden">
                
                {/* Desktop view table */}
                <table className="min-w-full divide-y divide-slate-100 hidden md:table">
                    <thead className="bg-slate-50/50">
                        <tr>
                            <th className="px-6 py-4.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                            <th className="px-6 py-4.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contato Completo</th>
                            <th className="px-6 py-4.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Serviço Solicitado</th>
                            <th className="px-6 py-4.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Data / Horário</th>
                            <th className="px-6 py-4.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status Atendimento</th>
                            <th className="px-6 py-4.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-50">
                        {sortedApts.map(apt => {
                            const ids = apt.serviceId ? apt.serviceId.split(',') : [];
                            const aptServices = services.filter(s => ids.includes(s.id));
                            const serviceName = aptServices.map(s => s.name).join(', ') || 'Outro';
                            const displayEmail = apt.clientEmail && !apt.clientEmail.startsWith('guest_') ? apt.clientEmail : '';
                            return (
                                <tr key={apt.id} className="hover:bg-slate-50/30 transition-all duration-150">
                                    <td className="px-6 py-4.5 whitespace-nowrap font-bold text-slate-900">
                                        <div className="flex items-center gap-2">
                                            {apt.userName}
                                            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 font-mono tracking-tighter">#{apt.id}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4.5 whitespace-nowrap text-sm text-slate-500">
                                        <div className="flex flex-col gap-1 text-xs">
                                            {apt.clientPhone && <span className="flex items-center gap-1.5 font-medium text-slate-700"><Phone size={12} className="text-primary-500" /> {apt.clientPhone}</span>}
                                            {displayEmail && <span className="flex items-center gap-1.5 text-slate-400"><Mail size={12} /> {displayEmail}</span>}
                                            {!apt.clientPhone && !displayEmail && <span className="text-slate-300">Sem contato comercial</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4.5 whitespace-nowrap text-sm font-semibold text-slate-800">{serviceName}</td>
                                    <td className="px-6 py-4.5 whitespace-nowrap text-sm text-slate-600 font-medium">
                                        {format(parseISO(apt.date), 'dd/MM/yyyy')} <span className="text-primary-600 font-bold ml-1">{apt.time}</span>
                                    </td>
                                    <td className="px-6 py-4.5 whitespace-nowrap">
                                        <select 
                                            value={apt.status} 
                                            onChange={(e) => handleStatusChange(apt.id, e.target.value as AppointmentStatus)}
                                            className="text-xs font-bold rounded-lg px-3 py-1.5 bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary-500/10 cursor-pointer text-slate-800"
                                        >
                                            {Object.values(AppointmentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-6 py-4.5 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => handleGenerateMessage(apt)}
                                                disabled={isGenerating === apt.id}
                                                className="text-green-600 hover:text-green-700 hover:bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 flex items-center justify-center font-bold text-xs cursor-pointer select-none transition-all active:scale-95"
                                            >
                                                <MessageCircle size={14} className="mr-1.5" />
                                                {isGenerating === apt.id ? 'Gerando...' : 'WhatsApp'}
                                            </button>
                                            
                                            <button 
                                                onClick={() => handleOpenEditModal(apt)}
                                                className="text-primary-600 hover:text-primary-700 hover:bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100 flex items-center justify-center font-bold text-xs cursor-pointer select-none transition-all active:scale-95"
                                            >
                                                <Pencil size={14} className="mr-1.5" />
                                                Reagendar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>

                {/* Mobile view card stack */}
                <div className="md:hidden divide-y divide-slate-100 divide-dashed">
                  {sortedApts.map(apt => {
                    const ids = apt.serviceId ? apt.serviceId.split(',') : [];
                    const aptServices = services.filter(s => ids.includes(s.id));
                    const serviceName = aptServices.map(s => s.name).join(', ') || 'Outro';
                    const displayEmail = apt.clientEmail && !apt.clientEmail.startsWith('guest_') ? apt.clientEmail : '';
                    return (
                      <div key={apt.id} className="p-5 space-y-4 hover:bg-slate-50/50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-900 leading-none flex items-center gap-2">
                                {apt.userName}
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 font-mono tracking-tighter">#{apt.id}</span>
                            </h4>
                            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">{serviceName}</p>
                          </div>
                          
                          <select 
                              value={apt.status} 
                              onChange={(e) => handleStatusChange(apt.id, e.target.value as AppointmentStatus)}
                              className="text-xs font-bold rounded-lg px-2.5 py-1 bg-slate-100 border-none outline-none cursor-pointer text-slate-800 scale-95"
                          >
                              {Object.values(AppointmentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-500 border-t border-slate-50 pt-3">
                          <div className="space-y-1">
                            <p className="font-medium text-slate-700 flex items-center gap-1">
                              <CalendarIcon size={12} className="text-primary-500" />
                              {format(parseISO(apt.date), 'dd/MM/yyyy')} às <span className="font-bold text-primary-600">{apt.time}</span>
                            </p>
                            {apt.clientPhone && (
                              <p className="flex items-center gap-1 text-slate-500 mt-0.5">
                                <Phone size={12} /> {apt.clientPhone}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                              <button 
                                  onClick={() => handleGenerateMessage(apt)}
                                  disabled={isGenerating === apt.id}
                                  className="text-green-600 hover:text-green-700 bg-green-50 border border-green-100 font-bold px-2 py-1.5 rounded-xl text-[11px] flex items-center shrink-0 cursor-pointer"
                              >
                                  <MessageCircle size={12} className="mr-1" />
                                  {isGenerating === apt.id ? '...' : 'WhatsApp'}
                              </button>
                              
                              <button 
                                  onClick={() => handleOpenEditModal(apt)}
                                  className="text-primary-600 hover:text-primary-700 bg-primary-50 border border-primary-100 font-bold px-2.5 py-1.5 rounded-xl text-[11px] flex items-center shrink-0 cursor-pointer"
                              >
                                  <Pencil size={12} className="mr-1" />
                                  Reagendar
                              </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {sortedApts.length === 0 && (
                  <div className="text-center p-12 space-y-2">
                    <AlertCircle size={32} className="text-slate-300 mx-auto" />
                    <p className="text-slate-500 text-sm font-semibold">Nenhum agendamento registrado até o momento.</p>
                  </div>
                )}

             </div>
             )}

             {/* Modal Gerenciar Bloqueios */}
            <Modal isOpen={isBlockedModalOpen} onClose={() => setIsBlockedModalOpen(false)} title="Gerenciar Bloqueios de Horário">
                <div className="space-y-5 mt-2">
                    <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl">
                        <h4 className="text-sm font-bold text-orange-800 flex items-center gap-1.5"><Lock size={16}/> Novo Bloqueio</h4>
                        <p className="text-xs text-orange-600 mt-1 mb-3">Feche um horário na agenda para impedir que clientes façam reservas. O bloqueio não afeta agendamentos já confirmados.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data</label>
                                <input type="date" value={blockedForm.date} onChange={e => setBlockedForm({...blockedForm, date: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-primary-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Período de Bloqueio</label>
                                <select value={blockedForm.period} onChange={e => handlePeriodChange(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-primary-500 bg-white">
                                    <option value="INTEIRO">Dia Inteiro (Bloqueia tudo)</option>
                                    <option value="MANHA">Manhã (08:00 às 12:00)</option>
                                    <option value="TARDE">Tarde (13:00 às 18:00)</option>
                                    <option value="CUSTOM">Horário Personalizado</option>
                                </select>
                            </div>
                        </div>

                        {blockedForm.period === 'CUSTOM' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3 animate-in fade-in slide-in-from-top-2">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Horário de Início</label>
                                    <input type="time" value={blockedForm.time} onChange={e => setBlockedForm({...blockedForm, time: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-primary-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Duração (minutos)</label>
                                    <select value={blockedForm.durationMinutes} onChange={e => setBlockedForm({...blockedForm, durationMinutes: Number(e.target.value)})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-primary-500 bg-white">
                                        <option value={30}>30 minutos</option>
                                        <option value={60}>1 hora</option>
                                        <option value={90}>1 hora e 30 min</option>
                                        <option value={120}>2 horas</option>
                                        <option value={240}>4 horas (Meio período)</option>
                                        <option value={480}>8 horas</option>
                                        <option value={1440}>Dia Inteiro (24 horas)</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className={blockedForm.period !== 'CUSTOM' ? 'md:col-span-2' : ''}>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Profissional</label>
                                <select value={blockedForm.professionalId} onChange={e => setBlockedForm({...blockedForm, professionalId: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-primary-500 bg-white">
                                    <option value="ALL">Todo o Salão (Todos profissionais)</option>
                                    {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        </div>
                        
                        <div className="flex justify-end mt-4">
                            <Button onClick={handleAddBlock} className="bg-slate-900 text-white hover:bg-black px-4 py-2 text-xs font-bold w-full md:w-auto">Adicionar Bloqueio</Button>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2 mb-3">Bloqueios Ativos</h4>
                        {(businessConfig.blockedSlots || []).length === 0 ? (
                            <p className="text-xs text-slate-400 italic text-center py-4">Nenhum bloqueio cadastrado no momento.</p>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {(businessConfig.blockedSlots || []).map(block => (
                                    <div key={block.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <div>
                                            <div className="text-sm font-bold text-slate-800">{format(parseISO(block.date), 'dd/MM/yyyy')} às {block.time}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">Duração: {block.durationMinutes} min • Profissional: {block.professionalId === 'ALL' ? 'Todos' : professionals.find(p => p.id === block.professionalId)?.name || 'Desconhecido'}</div>
                                        </div>
                                        <button onClick={() => handleDeleteBlock(block.id)} className="text-slate-400 hover:text-red-500 p-2 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

             {/* Modal with Shared styling */}
             <Modal isOpen={isNewAptModalOpen} onClose={() => setIsNewAptModalOpen(false)} title="Novo Agendamento Administrativo">
                <div className="space-y-4">
                    <Input 
                        label="Nome Completo do Cliente" 
                        value={newAptForm.userName} 
                        onChange={e => setNewAptForm({...newAptForm, userName: e.target.value})} 
                        placeholder="Ex: Maria Carolina"
                        required
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input 
                            label="WhatsApp Telefone" 
                            value={newAptForm.clientPhone} 
                            onChange={e => setNewAptForm({...newAptForm, clientPhone: e.target.value})} 
                            placeholder="Ex: (11) 98765-4321"
                        />
                         <Input 
                            label="Endereço de Email" 
                            value={newAptForm.clientEmail} 
                            onChange={e => setNewAptForm({...newAptForm, clientEmail: e.target.value})} 
                            placeholder="Ex: cliente@email.com"
                        />
                    </div>
                    
                    <div className="w-full">
                        <label className="block text-xs md:text-sm font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Serviço de Beleza</label>
                        <select 
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all bg-slate-50/50 focus:bg-white text-slate-800 text-sm md:text-base outline-none cursor-pointer"
                            value={newAptForm.serviceId}
                            onChange={e => setNewAptForm({...newAptForm, serviceId: e.target.value, professionalId: ''})}
                        >
                            <option value="">Selecione...</option>
                            {services.map(s => <option key={s.id} value={s.id}>{s.name} (R$ {Number(s.price).toFixed(2)})</option>)}
                        </select>
                    </div>

                    <div className="w-full">
                        <label className="block text-xs md:text-sm font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Profissional Responsável</label>
                        <select 
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all bg-slate-50/50 focus:bg-white text-slate-800 text-sm md:text-base outline-none cursor-pointer disabled:opacity-50"
                            value={newAptForm.professionalId}
                            onChange={e => setNewAptForm({...newAptForm, professionalId: e.target.value})}
                            disabled={!newAptForm.serviceId}
                        >
                            <option value="">{newAptForm.serviceId ? "Selecione o artista..." : "Selecione o serviço primeiro..."}</option>
                            {filteredProfessionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            type="date" 
                            label="Data do Atendimento" 
                            value={newAptForm.date} 
                            onChange={e => setNewAptForm({...newAptForm, date: e.target.value})} 
                        />
                        <Input 
                            type="time" 
                            label="Horário" 
                            value={newAptForm.time} 
                            onChange={e => setNewAptForm({...newAptForm, time: e.target.value})} 
                        />
                    </div>

                    <Button fullWidth onClick={handleSubmitNewApt} className="mt-4">Confirmar Agendamento Interno</Button>
                </div>
             </Modal>

             {/* Edit/Reschedule Modal */}
             <Modal isOpen={!!editApt} onClose={() => setEditApt(null)} title="Atualizar (Reagendar) Agendamento">
                 {editApt && (
                     <div className="space-y-4">
                         <Input 
                             label="Nome Completo do Cliente" 
                             value={editForm.userName} 
                             onChange={e => setEditForm({...editForm, userName: e.target.value})} 
                             required
                         />

                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <Input 
                                 label="WhatsApp Telefone" 
                                 value={editForm.clientPhone} 
                                 onChange={e => setEditForm({...editForm, clientPhone: e.target.value})} 
                                 placeholder="Ex: (11) 98765-4321"
                             />
                              <Input 
                                 label="Endereço de Email" 
                                 value={editForm.clientEmail} 
                                 onChange={e => setEditForm({...editForm, clientEmail: e.target.value})} 
                                 placeholder="Ex: cliente@email.com"
                             />
                         </div>
                         
                         <div className="w-full">
                             <label className="block text-xs md:text-sm font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Serviços de Beleza</label>
                             <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                                 {services.map(s => {
                                     const isSelected = editSelectedServiceIds.includes(s.id);
                                     return (
                                         <div
                                             key={s.id}
                                             onClick={() => handleEditServiceToggle(s.id)}
                                             className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${isSelected ? 'bg-primary-50/60' : 'hover:bg-slate-100/50'}`}
                                         >
                                             <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-primary-600 border-primary-600 text-white' : 'border-slate-300 bg-white'}`}>
                                                 {isSelected && <Check size={12} strokeWidth={3} />}
                                             </div>
                                             <div className="flex-1 min-w-0">
                                                 <span className="text-sm font-medium text-slate-800 truncate block">{s.name}</span>
                                             </div>
                                             <span className="text-xs font-bold text-primary-600 shrink-0">R$ {Number(s.price).toFixed(2)}</span>
                                         </div>
                                     );
                                 })}
                             </div>
                             {editSelectedServiceIds.length > 0 && (
                                 <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                                     {editSelectedServiceIds.length} serviço(s) selecionado(s) • Total: R$ {services.filter(s => editSelectedServiceIds.includes(s.id)).reduce((sum, s) => sum + Number(s.price), 0).toFixed(2)}
                                 </p>
                             )}
                         </div>

                         <div className="w-full">
                             <label className="block text-xs md:text-sm font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Profissional Responsável</label>
                             <select 
                                 className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all bg-slate-50/50 focus:bg-white text-slate-800 text-sm md:text-base outline-none cursor-pointer disabled:opacity-50"
                                 value={editForm.professionalId}
                                 onChange={e => setEditForm({...editForm, professionalId: e.target.value})}
                                 disabled={!editForm.serviceId}
                             >
                                 <option value="">{editForm.serviceId ? "Selecione o artista..." : "Selecione o serviço primeiro..."}</option>
                                 {filteredProfessionalsForEdit.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                             </select>
                         </div>

                         <div className="grid grid-cols-2 gap-4">
                             <Input 
                                 type="date" 
                                 label="Data do Atendimento" 
                                 value={editForm.date} 
                                 onChange={e => setEditForm({...editForm, date: e.target.value})} 
                             />
                             <Input 
                                 type="time" 
                                 label="Horário" 
                                 value={editForm.time} 
                                 onChange={e => setEditForm({...editForm, time: e.target.value})} 
                             />
                         </div>

                         <Button fullWidth onClick={handleUpdateApt} className="mt-4">Salvar Alterações / Reagendar</Button>
                     </div>
                 )}
              </Modal>
        </div>
    );
}

export default CalendarManager;
