import React, { useState } from 'react';
import { useApp } from '../../../contexts/AppContext';
import { Appointment, AppointmentStatus, Service, Professional, BusinessConfig } from '../../../types';
import { Button, Card, Badge, Input, Modal } from '../../../components/Shared';
import { Calendar as CalendarIcon, Users, Scissors, MessageCircle, TrendingUp, Plus, Trash2, Check, X, Clock, Pencil, Briefcase, Settings, Loader2, Coffee, Phone, Mail, Sparkles, AlertCircle, Lock, Upload, ImageIcon, Link as LinkIcon, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SettingsManager: React.FC = () => {
    const { businessConfig, updateBusinessConfig, verifyAdminPassword, changeAdminPassword } = useApp();
    const [localConfig, setLocalConfig] = useState<BusinessConfig>(businessConfig);
    const [isSaving, setIsSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    // Controle de Acesso / Senha Administrativa
    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [isChangingPass, setIsChangingPass] = useState(false);
    const [passError, setPassError] = useState('');
    const [passSuccess, setPassSuccess] = useState('');

    const handleChangePassword = async () => {
        if (!currentPass || !newPass || !confirmPass) {
            setPassError('Por favor, preencha todos os campos.');
            return;
        }

        if (newPass.length < 4) {
            setPassError('A nova senha precisa ter pelo menos 4 caracteres.');
            return;
        }

        if (newPass !== confirmPass) {
            setPassError('A confirmação da nova senha não confere.');
            return;
        }

        setIsChangingPass(true);
        setPassError('');
        setPassSuccess('');

        try {
            const isCorrect = await verifyAdminPassword(currentPass);
            if (!isCorrect) {
                setPassError('A senha atual informada está incorreta.');
                return;
            }

            await changeAdminPassword(newPass);
            setPassSuccess('Sua senha administrativa foi alterada com sucesso!');
            setCurrentPass('');
            setNewPass('');
            setConfirmPass('');
        } catch (err) {
            setPassError('Ocorreu um erro ao atualizar a senha administrativa.');
        } finally {
            setIsChangingPass(false);
        }
    };

    const daysOfWeek = [
        { id: 0, label: 'Domingo' },
        { id: 1, label: 'Segunda-feira' },
        { id: 2, label: 'Terça-feira' },
        { id: 3, label: 'Quarta-feira' },
        { id: 4, label: 'Quinta-feira' },
        { id: 5, label: 'Sexta-feira' },
        { id: 6, label: 'Sábado' },
    ];

    const handleDayToggle = (dayId: number) => {
        setLocalConfig(prev => ({
            ...prev,
            days: {
                ...prev.days,
                [dayId]: { ...prev.days[dayId], isOpen: !prev.days[dayId].isOpen }
            }
        }));
    };

    const handleLunchToggle = (dayId: number) => {
        setLocalConfig(prev => ({
            ...prev,
            days: {
                ...prev.days,
                [dayId]: { ...prev.days[dayId], hasLunch: !prev.days[dayId].hasLunch }
            }
        }));
    };

    const handleTimeChange = (dayId: number, type: 'start' | 'end' | 'lunchStart' | 'lunchEnd', value: string) => {
        setLocalConfig(prev => ({
            ...prev,
            days: {
                ...prev.days,
                [dayId]: { ...prev.days[dayId], [type]: value }
            }
        }));
    };

    const handleSave = () => {
        setIsSaving(true);
        setSuccessMsg('');
        
        setTimeout(() => {
            updateBusinessConfig(localConfig);
            setIsSaving(false);
            setSuccessMsg('Configurações de horário atualizadas com sucesso!');
            setTimeout(() => setSuccessMsg(''), 3000);
        }, 800);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h2 className="text-3xl font-serif font-bold text-slate-900 tracking-wide">Políticas de Horário</h2>
                  <p className="text-slate-400 text-sm mt-1">Configure o expediente oficial do estabelecimento e faixas de almoço/descanso clínico por dia de semana.</p>
                </div>
                <div className="flex items-center gap-3">
                    {successMsg && (
                        <span className="text-green-600 text-xs md:text-sm font-semibold flex items-center bg-green-50 p-2 rounded-xl border border-green-100 animate-pulse">
                            <Check size={14} className="mr-1" /> {successMsg}
                        </span>
                    )}
                    <Button onClick={handleSave} disabled={isSaving} className="min-w-[160px] bg-slate-900 hover:bg-black font-semibold text-white">
                        {isSaving ? (
                            <div className="flex items-center justify-center">
                                <Loader2 size={16} className="animate-spin mr-2" /> Salvando...
                            </div>
                        ) : 'Salvar Alterações'}
                    </Button>
                </div>
            </div>

            <Card className="p-4 md:p-6 space-y-4">
                <h3 className="font-serif text-lg font-bold text-slate-950 flex items-center gap-1.5"><Clock className="text-primary-500" size={20} /> Grade de Funcionamento Semanal</h3>
                <div className="divide-y divide-slate-100">
                    {daysOfWeek.map(day => {
                        const config = localConfig.days[day.id] || { isOpen: false, start: '09:00', end: '18:00', hasLunch: false, lunchStart: '12:00', lunchEnd: '13:00' };
                        return (
                            <div key={day.id} className="flex flex-col py-4 first:pt-2 last:pb-2 gap-3 transition-colors hover:bg-slate-50/20 px-2 rounded-xl">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center">
                                        <input 
                                            type="checkbox" 
                                            checked={config.isOpen} 
                                            onChange={() => handleDayToggle(day.id)}
                                            className="h-5 w-5 text-primary-600 border-slate-300 rounded focus:ring-primary-500 cursor-pointer transition-all mr-3"
                                            id={`day-${day.id}`}
                                        />
                                        <label htmlFor={`day-${day.id}`} className={`font-bold text-sm md:text-base cursor-pointer select-none ${config.isOpen ? 'text-slate-800' : 'text-slate-400'}`}>
                                            {day.label}
                                        </label>
                                    </div>

                                    {config.isOpen ? (
                                        <div className="flex items-center gap-2.5 self-start sm:self-auto pl-8 sm:pl-0">
                                            <div className="flex items-center">
                                                <span className="text-xs text-slate-400 mr-2 uppercase font-bold tracking-wider">Abre</span>
                                                <input 
                                                    type="time" 
                                                    value={config.start} 
                                                    onChange={(e) => handleTimeChange(day.id, 'start', e.target.value)}
                                                    className="border border-slate-200 outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 rounded-lg px-2.5 py-1 text-xs md:text-sm text-slate-900 bg-slate-50"
                                                />
                                            </div>
                                            <span className="text-slate-300">-</span>
                                            <div className="flex items-center">
                                                <span className="text-xs text-slate-400 mr-2 uppercase font-bold tracking-wider">Fecha</span>
                                                <input 
                                                    type="time" 
                                                    value={config.end} 
                                                    onChange={(e) => handleTimeChange(day.id, 'end', e.target.value)}
                                                    className="border border-slate-200 outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 rounded-lg px-2.5 py-1 text-xs md:text-sm text-slate-900 bg-slate-50"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-xs md:text-sm text-slate-400 italic bg-slate-100 rounded-full py-1 px-3 self-start sm:self-auto pl-3 ml-8 sm:ml-0 font-medium select-none">Estabelecimento Fechado</span>
                                    )}
                                </div>

                                {config.isOpen && (
                                    <div className="ml-8 pt-3 border-t border-slate-50/80 flex flex-wrap items-center gap-4 animate-in slide-in-from-top-2 duration-200">
                                        <div className="flex items-center">
                                            <input 
                                                type="checkbox" 
                                                id={`lunch-${day.id}`}
                                                checked={config.hasLunch} 
                                                onChange={() => handleLunchToggle(day.id)}
                                                className="h-4.5 w-4.5 text-orange-500 border-slate-300 rounded focus:ring-orange-400 cursor-pointer transition-all mr-2"
                                            />
                                            <label htmlFor={`lunch-${day.id}`} className="text-xs md:text-sm text-slate-600 font-semibold cursor-pointer select-none flex items-center">
                                                <Coffee size={14} className="mr-1 text-orange-500/75"/> Intervalo de Almoço Integrador
                                            </label>
                                        </div>

                                        {config.hasLunch && (
                                            <div className="flex items-center gap-2 animate-in fade-in duration-200">
                                                <input 
                                                    type="time" 
                                                    value={config.lunchStart || ''} 
                                                    onChange={(e) => handleTimeChange(day.id, 'lunchStart', e.target.value)}
                                                    className="border border-slate-200 outline-none rounded-lg px-2 py-1 text-xs text-slate-700 bg-slate-50"
                                                />
                                                <span className="text-slate-400 text-xs">até</span>
                                                <input 
                                                    type="time" 
                                                    value={config.lunchEnd || ''} 
                                                    onChange={(e) => handleTimeChange(day.id, 'lunchEnd', e.target.value)}
                                                    className="border border-slate-200 outline-none rounded-lg px-2 py-1 text-xs text-slate-700 bg-slate-50"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Card>

            {/* Controle de Acesso Card */}
            <Card className="p-4 md:p-6 space-y-5">
                <h3 className="font-serif text-lg font-bold text-slate-950 flex items-center gap-1.5 uppercase tracking-wide">
                    <Lock className="text-primary-500" size={20} /> Controle de Acesso (Senha Administrativa)
                </h3>
                <p className="text-slate-400 text-sm -mt-2 leading-relaxed">
                    Altere o código de acesso que dá permissão à área de gerência e configurações do salão. Use uma senha pessoal e evite anotá-la em locais públicos.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div>
                        <Input 
                            type="password" 
                            label="Senha Atual" 
                            value={currentPass} 
                            onChange={e => { setCurrentPass(e.target.value); setPassError(''); setPassSuccess(''); }} 
                            placeholder="Digite a senha atual"
                        />
                    </div>
                    <div>
                        <Input 
                            type="password" 
                            label="Nova Senha" 
                            value={newPass} 
                            onChange={e => { setNewPass(e.target.value); setPassError(''); setPassSuccess(''); }} 
                            placeholder="Mínimo de 4 dígitos"
                        />
                    </div>
                    <div>
                        <Input 
                            type="password" 
                            label="Confirmar Nova Senha" 
                            value={confirmPass} 
                            onChange={e => { setConfirmPass(e.target.value); setPassError(''); setPassSuccess(''); }} 
                            placeholder="Repita a nova senha"
                        />
                    </div>
                </div>

                {passError && (
                    <div className="text-red-500 text-xs font-semibold bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2 animate-in fade-in duration-200">
                        <AlertCircle size={15} />
                        {passError}
                    </div>
                )}

                {passSuccess && (
                    <div className="text-emerald-700 text-xs font-semibold bg-emerald-50 p-3 rounded-lg border border-emerald-100 flex items-center gap-2 animate-in fade-in duration-200">
                        <Check size={15} />
                        {passSuccess}
                    </div>
                )}

                <div className="flex justify-end mt-2">
                    <Button 
                        onClick={handleChangePassword} 
                        disabled={isChangingPass || !currentPass || !newPass || !confirmPass}
                        className="bg-slate-900 border-none text-white py-2 px-5 hover:bg-black font-semibold text-sm transition-all"
                    >
                        {isChangingPass ? (
                            <div className="flex items-center gap-2">
                                <Loader2 size={16} className="animate-spin" /> Verificando...
                            </div>
                        ) : 'Atualizar Nova Senha'}
                    </Button>
                </div>
            </Card>
        </div>
    );
};


export default SettingsManager;
