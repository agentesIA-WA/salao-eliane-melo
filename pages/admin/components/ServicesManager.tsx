import React, { useState } from 'react';
import { useApp } from '../../../contexts/AppContext';
import { Appointment, AppointmentStatus, Service, Professional, BusinessConfig } from '../../../types';
import { Button, Card, Badge, Input, Modal } from '../../../components/Shared';
import { Calendar as CalendarIcon, Users, Scissors, MessageCircle, TrendingUp, Plus, Trash2, Check, X, Clock, Pencil, Briefcase, Settings, Loader2, Coffee, Phone, Mail, Sparkles, AlertCircle, Lock, Upload, ImageIcon, Link as LinkIcon, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getGoogleDriveThumbnail, isGoogleDriveLink } from '../../../services/driveUtils';

const ServicesManager: React.FC = () => {
    const { services, deleteService, addService, updateService } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [serviceForm, setServiceForm] = useState<Partial<Service>>({ name: '', price: 0, durationMinutes: 60, imageUrl: '', observation: '' });
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
                setServiceForm(prev => ({ ...prev, imageUrl: result.imageUrl }));
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
        setServiceForm({ name: '', price: 0, durationMinutes: 60, imageUrl: '', observation: '' });
        setUploadError('');
        setImageInputMode('upload');
        setIsModalOpen(true);
    };

    const handleEdit = (service: Service) => {
        setEditingId(service.id);
        setServiceForm({ ...service });
        setUploadError('');
        setImageInputMode(service.imageUrl && (service.imageUrl.startsWith('http') && !service.imageUrl.startsWith('./')) ? 'url' : 'upload');
        setIsModalOpen(true);
    };

    const handleSubmit = () => {
        if (serviceForm.name && serviceForm.price) {
            if (editingId) {
                updateService(editingId, serviceForm);
            } else {
                addService({
                    name: serviceForm.name!,
                    price: Number(serviceForm.price),
                    durationMinutes: Number(serviceForm.durationMinutes || 60),
                    description: serviceForm.description || 'Novo serviço',
                    imageUrl: serviceForm.imageUrl || `https://picsum.photos/400/300?random=${Date.now()}`,
                    observation: serviceForm.observation || ''
                });
            }
            setIsModalOpen(false);
            setServiceForm({ name: '', price: 0, durationMinutes: 60, imageUrl: '', observation: '' });
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h2 className="text-3xl font-serif font-bold text-slate-900 tracking-wide">Catálogo de Serviços</h2>
                  <p className="text-slate-400 text-sm mt-1">Gerencie a cartela de serviços de estética ofertados por seu salão.</p>
                </div>
                <Button onClick={handleAddNew} className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-5 self-start sm:self-auto rounded-xl flex items-center gap-1.5"><Plus size={18} /> Novo Serviço</Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map(service => (
                    <Card key={service.id} className="group relative hover:shadow-lg transition-all duration-300 overflow-hidden border border-slate-100 flex flex-col justify-between">
                        
                        <div className="relative h-44 w-full bg-slate-100 overflow-hidden rounded-t-xl -mt-5 -mx-5 -mb-2">
                            <img 
                                src={getGoogleDriveThumbnail(service.imageUrl)} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                alt={service.name}
                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Sem+Imagem'; }}
                            />
                            
                            {/* Actions Overlay */}
                            <div className="absolute top-3 right-3 flex gap-1.5">
                                 <button onClick={() => handleEdit(service)} className="p-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg text-blue-500 hover:text-blue-700 hover:bg-white transition-all cursor-pointer"><Pencil size={14}/></button>
                                 <button onClick={() => deleteService(service.id)} className="p-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg text-red-500 hover:text-red-700 hover:bg-white transition-all cursor-pointer"><Trash2 size={14}/></button>
                            </div>
                        </div>

                        <div className="space-y-3 pt-4">
                            <div className="flex justify-between items-start gap-2">
                                <h3 className="font-bold text-slate-900 text-base md:text-lg line-clamp-1">{service.name}</h3>
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-2 md:leading-relaxed">{service.description}</p>
                            
                            {service.observation && (
                                <div className="flex items-start gap-1.5 mt-2 p-2 bg-amber-50 border border-amber-200/60 rounded-lg">
                                    <Info size={12} className="text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-amber-700 font-medium line-clamp-2 leading-relaxed">{service.observation}</p>
                                </div>
                            )}
                            
                            <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                                <span className="text-primary-600 font-extrabold text-base md:text-lg">R$ {Number(service.price).toFixed(2)}</span>
                                <span className="text-[11px] text-slate-500 font-bold bg-slate-100 px-2.5 py-1 rounded-lg flex items-center gap-1"><Clock size={11} />{service.durationMinutes} min</span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Editar Serviço" : "Adicionar Novo Serviço"}>
                <div className="space-y-4">
                    <Input label="Código/Nome do Serviço" value={serviceForm.name} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} placeholder="Ex: Escova Paris" />
                    <Input label="Descrição do Atendimento" value={serviceForm.description || ''} onChange={e => setServiceForm({...serviceForm, description: e.target.value})} placeholder="Lavagem especial com ativos de caviar..." />
                    <div className="grid grid-cols-2 gap-4">
                         <Input type="number" label="Preço Praticado (R$)" value={serviceForm.price} onChange={e => setServiceForm({...serviceForm, price: parseFloat(e.target.value)})} />
                         <Input 
                            type="number" 
                            label="Tempo Estipulado (minutos)" 
                            value={serviceForm.durationMinutes} 
                            onChange={e => setServiceForm({...serviceForm, durationMinutes: parseInt(e.target.value)})} 
                            placeholder="Ex: 60"
                         />
                    </div>
                    <div>
                        <label className="block text-xs md:text-sm font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Observação (opcional)</label>
                        <textarea 
                            value={serviceForm.observation || ''} 
                            onChange={e => setServiceForm({...serviceForm, observation: e.target.value})} 
                            placeholder="Ex: Inclui lavagem e secagem • Não indicado para grávidas • Necessário agendar com antecedência..."
                            rows={2}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all bg-slate-50/50 focus:bg-white text-slate-800 text-sm resize-none"
                        />
                        <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                            Este texto aparece em destaque para os clientes na hora de escolher o serviço.
                        </p>
                    </div>
                    {/* Imagem do Serviço - Upload ou URL */}
                    <div className="space-y-3">
                        <label className="block text-xs md:text-sm font-semibold text-slate-700 uppercase tracking-wider">Foto do Serviço</label>
                        
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
                                            : serviceForm.imageUrl
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
                                    ) : serviceForm.imageUrl && !serviceForm.imageUrl.startsWith('http') ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-white shadow-md">
                                                <img
                                                    src={serviceForm.imageUrl}
                                                    className="w-full h-full object-cover"
                                                    alt="Prévia"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Sem+Foto'; }}
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
                                    value={serviceForm.imageUrl || ''} 
                                    onChange={e => setServiceForm({...serviceForm, imageUrl: e.target.value})} 
                                    placeholder="Ex: Link do Google Drive ou link direto de imagem" 
                                />
                                <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                                    Dica: Você pode copiar o link de compartilhamento de qualquer foto do seu <strong>Google Drive</strong> (lembre-se de configurar o acesso da foto para "Qualquer pessoa com o link").
                                </p>
                            </div>
                        )}

                        {/* Image Preview (for URL mode or existing images) */}
                        {serviceForm.imageUrl && (imageInputMode === 'url' || serviceForm.imageUrl.startsWith('http')) && (
                            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl transition-all duration-300">
                                <div className="relative w-12 h-12 rounded-lg bg-white overflow-hidden border border-slate-100 shrink-0">
                                    <img 
                                        src={getGoogleDriveThumbnail(serviceForm.imageUrl)} 
                                        className="w-full h-full object-cover" 
                                        alt="Prévia"
                                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Sem+Foto'; }}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">Prévia da Imagem</span>
                                    {isGoogleDriveLink(serviceForm.imageUrl) ? (
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
                        {serviceForm.imageUrl && (
                            <button
                                type="button"
                                onClick={() => {
                                    setServiceForm({...serviceForm, imageUrl: ''});
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                className="text-[11px] text-red-500 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                                <Trash2 size={11} /> Remover imagem
                            </button>
                        )}
                    </div>

                    <Button fullWidth onClick={handleSubmit} className="mt-4">Confirmar Alterações</Button>
                </div>
            </Modal>
        </div>
    )
}


export default ServicesManager;
