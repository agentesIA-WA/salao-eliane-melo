import React, { useState } from 'react';
import { useApp } from '../../../contexts/AppContext';
import { Appointment, AppointmentStatus, Service, Professional, BusinessConfig } from '../../../types';
import { Button, Card, Badge, Input, Modal } from '../../../components/Shared';
import { Calendar as CalendarIcon, Users, Scissors, MessageCircle, TrendingUp, Plus, Trash2, Check, X, Clock, Pencil, Briefcase, Settings, Loader2, Coffee, Phone, Mail, Sparkles, AlertCircle, Lock, Upload, ImageIcon, Link as LinkIcon, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getGoogleDriveThumbnail, isGoogleDriveLink } from '../../../services/driveUtils';

const ProfessionalsManager: React.FC = () => {
    const { professionals, services, addProfessional, updateProfessional, deleteProfessional } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [proForm, setProForm] = useState<Partial<Professional>>({ name: '', avatarUrl: '', specialties: [] });
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleImageUpload = async (file: File) => {
        setIsUploading(true);
        setUploadError('');
        try {
            const formData = new FormData();
            formData.append('image', file);
            const response = await fetch('./backend/upload.php', {
                method: 'POST',
                body: formData,
            });
            const result = await response.json();
            if (result.success && result.imageUrl) {
                setProForm(prev => ({ ...prev, avatarUrl: result.imageUrl }));
            } else {
                setUploadError(result.error || 'Erro ao enviar imagem.');
            }
        } catch (err) {
            setUploadError('Falha na conexão. Verifique sua internet e tente novamente.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleImageUpload(file);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            handleImageUpload(file);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleAddNew = () => {
        setEditingId(null);
        setProForm({ name: '', avatarUrl: '', specialties: [] });
        setUploadError('');
        setImageInputMode('upload');
        setIsModalOpen(true);
    };

    const handleEdit = (pro: Professional) => {
        setEditingId(pro.id);
        setProForm({ ...pro });
        setUploadError('');
        setImageInputMode(pro.avatarUrl && (pro.avatarUrl.startsWith('http') && !pro.avatarUrl.startsWith('./') && !pro.avatarUrl.includes('ui-avatars.com')) ? 'url' : 'upload');
        setIsModalOpen(true);
    };

    const handleSubmit = () => {
        if (proForm.name) {
            const newProData = {
                name: proForm.name,
                avatarUrl: proForm.avatarUrl || `https://ui-avatars.com/api/?name=${proForm.name}&background=random`,
                specialties: proForm.specialties || []
            };

            if (editingId) {
                updateProfessional(editingId, newProData);
            } else {
                addProfessional(newProData);
            }
            setIsModalOpen(false);
        }
    };

    const toggleSpecialty = (serviceId: string) => {
        const currentSpecialties = proForm.specialties || [];
        if (currentSpecialties.includes(serviceId)) {
            setProForm({ ...proForm, specialties: currentSpecialties.filter(id => id !== serviceId) });
        } else {
            setProForm({ ...proForm, specialties: [...currentSpecialties, serviceId] });
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h2 className="text-3xl font-serif font-bold text-slate-900 tracking-wide">Parceiros & Equipe</h2>
                  <p className="text-slate-400 text-sm mt-1">Gerencie seu time de profissionais de beleza e vincule suas especialidades para auto-agendamento de clientes.</p>
                </div>
                <Button onClick={handleAddNew} className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-5 self-start sm:self-auto rounded-xl flex items-center gap-1.5"><Plus size={18} /> Novo Profissional</Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {professionals.map(pro => (
                    <Card key={pro.id} className="group relative hover:shadow-lg hover:border-primary-100 transition-all duration-300 p-6 flex flex-col justify-between">
                        
                        {/* Action buttons hover */}
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5 z-10">
                             <button onClick={() => handleEdit(pro)} className="p-2 bg-white rounded-xl shadow-md border border-slate-100 text-blue-500 hover:bg-blue-50 cursor-pointer transition-all"><Pencil size={13}/></button>
                             <button onClick={() => deleteProfessional(pro.id)} className="p-2 bg-white rounded-xl shadow-md border border-slate-100 text-red-500 hover:bg-red-50 cursor-pointer transition-all"><Trash2 size={13}/></button>
                        </div>

                        <div className="flex flex-col items-center text-center">
                            <div className="relative">
                              <img 
                                  src={pro.avatarUrl} 
                                  className="w-20 h-20 rounded-full object-cover mb-4 border-4 border-white shadow-md group-hover:border-primary-200 transition-colors" 
                                  alt={pro.name}
                                  onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${pro.name}`; }}
                              />
                              <div className="absolute bottom-4 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                            </div>
                            
                            <h3 className="font-bold text-slate-950 text-base md:text-lg">{pro.name}</h3>
                            <span className="text-[10px] bg-primary-50 text-primary-700/80 font-extrabold uppercase px-2.5 py-0.5 rounded-full mt-1.5 tracking-wider">Membro Equipe</span>
                            
                            <p className="text-xs text-slate-400 mt-4 font-semibold uppercase tracking-wider">Habilidades ({pro.specialties.length})</p>
                            
                            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                                {pro.specialties.slice(0, 3).map(specId => {
                                    const s = services.find(s => s.id === specId);
                                    return s ? <span key={s.id} className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-md truncate max-w-[110px]">{s.name}</span> : null;
                                })}
                                {pro.specialties.length > 3 && <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md">+{pro.specialties.length - 3}</span>}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Editar Detalhes Profissional" : "Adicionar Novo Colaborador"}>
                <div className="space-y-4">
                    <Input label="Nome Artístico/Completo" value={proForm.name} onChange={e => setProForm({...proForm, name: e.target.value})} placeholder="Ex: Carlos Souza" />
                    
                    {/* Imagem do Profissional - Upload ou URL */}
                    <div className="space-y-3">
                        <label className="block text-xs md:text-sm font-semibold text-slate-700 uppercase tracking-wider">Fotografia de Perfil (Opcional)</label>
                        
                        {/* Toggle: Upload vs URL */}
                        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                            <button
                                type="button"
                                onClick={() => setImageInputMode('upload')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    imageInputMode === 'upload'
                                        ? 'bg-white text-primary-700 shadow-sm border border-primary-100'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <Upload size={13} /> Enviar Foto
                            </button>
                            <button
                                type="button"
                                onClick={() => setImageInputMode('url')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    imageInputMode === 'url'
                                        ? 'bg-white text-primary-700 shadow-sm border border-primary-100'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <LinkIcon size={13} /> Colar Link
                            </button>
                        </div>

                        {imageInputMode === 'upload' ? (
                            <div>
                                {/* Drag & Drop Zone */}
                                <div
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    onClick={() => !isUploading && fileInputRef.current?.click()}
                                    className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 ${
                                        isUploading
                                            ? 'border-primary-300 bg-primary-50/50'
                                            : proForm.avatarUrl && !proForm.avatarUrl.includes('ui-avatars.com')
                                                ? 'border-green-300 bg-green-50/30 hover:border-green-400'
                                                : 'border-slate-200 bg-slate-50/50 hover:border-primary-400 hover:bg-primary-50/30'
                                    }`}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />

                                    {isUploading ? (
                                        <div className="flex flex-col items-center gap-2 py-2">
                                            <Loader2 size={28} className="animate-spin text-primary-500" />
                                            <p className="text-xs font-semibold text-primary-600">Enviando imagem...</p>
                                        </div>
                                    ) : proForm.avatarUrl && !proForm.avatarUrl.includes('ui-avatars.com') && !proForm.avatarUrl.startsWith('http') ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white shadow-md">
                                                <img
                                                    src={proForm.avatarUrl}
                                                    className="w-full h-full object-cover"
                                                    alt="Prévia"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${proForm.name || 'Sem+Foto'}`; }}
                                                />
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Check size={13} className="text-green-600" />
                                                <span className="text-xs font-bold text-green-700">Imagem enviada com sucesso</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400">Clique para substituir a imagem</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 py-2">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                                                <ImageIcon size={24} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-600">Arraste uma imagem aqui</p>
                                                <p className="text-[11px] text-slate-400 mt-0.5">ou <span className="text-primary-600 font-bold">clique para selecionar</span></p>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1">JPG, PNG, WebP ou GIF • Máximo 5MB</p>
                                        </div>
                                    )}
                                </div>

                                {uploadError && (
                                    <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                                        <AlertCircle size={14} className="text-red-500 shrink-0" />
                                        <p className="text-[11px] text-red-700 font-semibold">{uploadError}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div>
                                <Input 
                                    label="" 
                                    value={proForm.avatarUrl || ''} 
                                    onChange={e => setProForm({...proForm, avatarUrl: e.target.value})} 
                                    placeholder="Ex: Link do Google Drive ou link direto de imagem" 
                                />
                                <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                                    Dica: Você pode copiar o link de compartilhamento de qualquer foto do seu <strong>Google Drive</strong> (lembre-se de configurar o acesso da foto para "Qualquer pessoa com o link").
                                </p>
                            </div>
                        )}

                        {/* Image Preview (for URL mode or existing images) */}
                        {proForm.avatarUrl && !proForm.avatarUrl.includes('ui-avatars.com') && (imageInputMode === 'url' || proForm.avatarUrl.startsWith('http')) && (
                            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl transition-all duration-300">
                                <div className="relative w-12 h-12 rounded-full bg-white overflow-hidden border border-slate-100 shrink-0">
                                    <img 
                                        src={getGoogleDriveThumbnail(proForm.avatarUrl)} 
                                        className="w-full h-full object-cover" 
                                        alt="Prévia"
                                        onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${proForm.name || 'Sem+Foto'}`; }}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">Prévia da Imagem</span>
                                    {isGoogleDriveLink(proForm.avatarUrl) ? (
                                        <span className="text-[10px] text-green-600 font-extrabold bg-green-50/80 px-2 py-0.5 rounded-md inline-flex items-center gap-1 border border-green-200/50 mt-0.5">
                                            <Check size={11} strokeWidth={3} className="text-green-600" /> Google Drive Miniatura Ativada
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">URL Tradicional</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Remove image button */}
                        {proForm.avatarUrl && !proForm.avatarUrl.includes('ui-avatars.com') && (
                            <button
                                type="button"
                                onClick={() => {
                                    setProForm({...proForm, avatarUrl: ''});
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                className="text-[11px] text-red-500 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                                <Trash2 size={11} /> Remover imagem
                            </button>
                        )}
                    </div>
                    
                    <div>
                        <label className="block text-xs md:text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">Especialidades (O colaborador poderá atender a estes serviços)</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2 bg-slate-50/50 border border-slate-150 rounded-xl">
                            {services.map(service => {
                                const isSelected = proForm.specialties?.includes(service.id);
                                return (
                                    <div 
                                        key={service.id} 
                                        onClick={() => toggleSpecialty(service.id)}
                                        className={`p-2.5 rounded-lg text-xs md:text-sm border cursor-pointer flex items-center justify-between select-none active:scale-[0.98] transition-all ${isSelected ? 'bg-primary-50 border-primary-500/30 text-primary-800 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <span className="truncate mr-2 font-medium">{service.name}</span>
                                        {isSelected ? (
                                          <Check size={14} className="text-primary-600 font-extrabold" />
                                        ) : (
                                          <div className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-350"></div>
                                        )}
                                    </div>
                                )
                            })}
                            {services.length === 0 && <p className="text-xs text-slate-400 p-2 text-center">Cadastre serviços primeiro.</p>}
                        </div>
                    </div>
                    
                    <Button fullWidth onClick={handleSubmit} className="mt-4">Salvar Perfil de Atendimento</Button>
                </div>
            </Modal>
        </div>
    );
}


export default ProfessionalsManager;
