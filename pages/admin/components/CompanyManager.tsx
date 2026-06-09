import React, { useState } from 'react';
import { useApp } from '../../../contexts/AppContext';
import { Appointment, AppointmentStatus, Service, Professional, BusinessConfig } from '../../../types';
import { Button, Card, Badge, Input, Modal } from '../../../components/Shared';
import { Calendar as CalendarIcon, Users, Scissors, MessageCircle, TrendingUp, Plus, Trash2, Check, X, Clock, Pencil, Briefcase, Settings, Loader2, Coffee, Phone, Mail, Sparkles, AlertCircle, Lock, Upload, ImageIcon, Link as LinkIcon, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getGoogleDriveThumbnail, isGoogleDriveLink } from '../../../services/driveUtils';

const CompanyManager: React.FC = () => {
    const { businessConfig, updateBusinessConfig } = useApp();
    const [companyName, setCompanyName] = useState(businessConfig.companyName || '');
    const [cnpj, setCnpj] = useState(businessConfig.cnpj || '');
    const [phone, setPhone] = useState(businessConfig.phone || '');
    const [email, setEmail] = useState(businessConfig.email || '');
    const [address, setAddress] = useState(businessConfig.address || '');
    const [description, setDescription] = useState(businessConfig.description || '');
    const [logoUrl, setLogoUrl] = useState(businessConfig.logoUrl || '');
    const [instagramUrl, setInstagramUrl] = useState(businessConfig.instagramUrl || '');

    const [isSaving, setIsSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSave = async () => {
        if (!companyName.trim()) {
            setErrorMsg('O nome comercial da empresa é obrigatório.');
            return;
        }
        setIsSaving(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            await updateBusinessConfig({
                ...businessConfig,
                companyName,
                cnpj,
                phone,
                email,
                address,
                description,
                logoUrl,
                instagramUrl
            });
            setSuccessMsg('Cadastro da empresa atualizado com sucesso!');
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err) {
            setErrorMsg('Erro ao salvar os dados da empresa.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-serif font-bold text-slate-900 tracking-wide">Cadastro da Empresa</h2>
                    <p className="text-slate-400 text-sm mt-1">Gerencie a identidade, dados cadastrais e meios de contato do seu estabelecimento.</p>
                </div>
                <div className="flex items-center gap-3">
                    {successMsg && (
                        <span className="text-emerald-600 text-xs md:text-sm font-semibold flex items-center bg-emerald-50 p-2 rounded-xl border border-emerald-100 animate-pulse">
                            <Check size={14} className="mr-1" /> {successMsg}
                        </span>
                    )}
                    {errorMsg && (
                        <span className="text-red-600 text-xs md:text-sm font-semibold flex items-center bg-red-50 p-2 rounded-xl border border-red-100">
                            <AlertCircle size={14} className="mr-1" /> {errorMsg}
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Preview Card */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="p-6 flex flex-col items-center text-center">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Pré-visualização do Perfil</h4>
                        <div className="relative w-32 h-32 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/60 shadow-inner flex items-center justify-center group mb-4">
                            {logoUrl ? (
                                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Logo'; }} />
                            ) : (
                                <Briefcase size={40} className="text-slate-300" />
                            )}
                        </div>
                        <h3 className="font-serif text-xl font-bold text-slate-900">{companyName || 'Nome da Empresa'}</h3>
                        <p className="text-xs text-slate-400 font-mono mt-1">{cnpj || '00.000.000/0000-00'}</p>
                        
                        {description && (
                            <p className="text-sm text-slate-500 mt-4 italic line-clamp-3">"{description}"</p>
                        )}

                        <div className="w-full border-t border-slate-100 my-4 pt-4 space-y-2.5 text-left text-xs">
                            {phone && (
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Phone size={14} className="text-primary-500 shrink-0" />
                                    <span className="truncate">{phone}</span>
                                </div>
                            )}
                            {email && (
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Mail size={14} className="text-primary-500 shrink-0" />
                                    <span className="truncate">{email}</span>
                                </div>
                            )}
                            {instagramUrl && (
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Sparkles size={14} className="text-primary-500 shrink-0" />
                                    <span className="truncate">{instagramUrl}</span>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Form inputs Card */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-6 space-y-4">
                        <h3 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">Informações Principais</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Input 
                                    label="Nome Fantasia / Comercial" 
                                    value={companyName} 
                                    onChange={e => setCompanyName(e.target.value)} 
                                    placeholder="Ex: Salão Eliane Melo"
                                    required
                                />
                            </div>
                            <div>
                                <Input 
                                    label="CNPJ" 
                                    value={cnpj} 
                                    onChange={e => setCnpj(e.target.value)} 
                                    placeholder="00.000.000/0000-00"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição / Slogan do Salão</label>
                            <textarea 
                                value={description} 
                                onChange={e => setDescription(e.target.value)} 
                                placeholder="Uma breve descrição sobre a história, missão ou especialidade do salão..."
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-slate-800 text-sm h-28 resize-none"
                            />
                        </div>

                        <div>
                            <Input 
                                label="URL do Logotipo (Imagem)" 
                                value={logoUrl} 
                                onChange={e => setLogoUrl(e.target.value)} 
                                placeholder="https://exemplo.com/sua-logo.jpg"
                            />
                        </div>
                    </Card>

                    <Card className="p-6 space-y-4">
                        <h3 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">Contato e Localização</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Input 
                                    label="Telefone / WhatsApp" 
                                    value={phone} 
                                    onChange={e => setPhone(e.target.value)} 
                                    placeholder="(11) 99999-9999"
                                />
                            </div>
                            <div>
                                <Input 
                                    label="E-mail de Contato" 
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)} 
                                    placeholder="contato@empresa.com"
                                />
                            </div>
                            <div>
                                <Input 
                                    label="Instagram / Redes Sociais" 
                                    value={instagramUrl} 
                                    onChange={e => setInstagramUrl(e.target.value)} 
                                    placeholder="@seu_perfil"
                                />
                            </div>
                        </div>

                        <div>
                            <Input 
                                label="Endereço Completo" 
                                value={address} 
                                onChange={e => setAddress(e.target.value)} 
                                placeholder="Rua das Acácia, 100 - Centro, Cidade - UF"
                            />
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default CompanyManager;
