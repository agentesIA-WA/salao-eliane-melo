import React, { useState, useRef } from 'react';
import { useApp } from '../../../contexts/AppContext';
import { Appointment, AppointmentStatus, Service, Professional, BusinessConfig } from '../../../types';
import { Button, Card, Badge, Input, Modal } from '../../../components/Shared';
import { Calendar as CalendarIcon, Users, Scissors, MessageCircle, TrendingUp, Plus, Trash2, Check, X, Clock, Pencil, Briefcase, Settings, Loader2, Coffee, Phone, Mail, Sparkles, AlertCircle, Lock, Upload, ImageIcon, Link as LinkIcon, Info, Download, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getGoogleDriveThumbnail, isGoogleDriveLink } from '../../../services/driveUtils';
import * as XLSX from 'xlsx';

const ServicesManager: React.FC = () => {
    const { services, deleteService, addService, updateService } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [serviceForm, setServiceForm] = useState<Partial<Service>>({ name: '', price: 0, durationMinutes: 60, imageUrl: '', observation: '' });
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importPreview, setImportPreview] = useState<Partial<Service>[]>([]);
    const [importError, setImportError] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const importFileInputRef = React.useRef<HTMLInputElement>(null);

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
                <div className="flex flex-col sm:flex-row gap-3 self-start sm:self-auto">
                    <Button 
                        onClick={() => {
                            setImportFile(null);
                            setImportPreview([]);
                            setImportError('');
                            setIsImportModalOpen(true);
                        }} 
                        variant="outline"
                        className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-medium py-2.5 px-5 rounded-xl flex items-center gap-1.5"
                    >
                        <FileSpreadsheet size={18} /> Importar Planilha
                    </Button>
                    <Button onClick={handleAddNew} className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-5 rounded-xl flex items-center gap-1.5"><Plus size={18} /> Novo Serviço</Button>
                </div>
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

            {/* Import Modal */}
            <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Importar Serviços via Planilha" size="lg">
                <div className="space-y-4">
                    {/* Download Template */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="flex items-center gap-3">
                            <FileSpreadsheet size={24} className="text-blue-600" />
                            <div>
                                <p className="font-semibold text-blue-800">Baixe o modelo de planilha</p>
                                <p className="text-sm text-blue-600 mt-0.5">Preencha a planilha com seus serviços e faça o upload abaixo</p>
                            </div>
                        </div>
                        <button
                            onClick={downloadTemplate}
                            className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            <Download size={16} /> Baixar Modelo (.xlsx)
                        </button>
                    </div>

                    {/* File Upload */}
                    <div className="space-y-3">
                        <label className="block text-xs md:text-sm font-semibold text-slate-700 uppercase tracking-wider">Selecione a planilha (.xlsx, .xls, .csv)</label>
                        <div
                            onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const file = e.dataTransfer.files?.[0];
                                if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
                                    handleImportFileSelect(file);
                                } else {
                                    setImportError('Formato inválido. Use .xlsx, .xls ou .csv');
                                }
                            }}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onClick={() => importFileInputRef.current?.click()}
                            className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 ${
                                importFile
                                    ? 'border-green-300 bg-green-50/30'
                                    : 'border-slate-200 bg-slate-50/50 hover:border-primary-400 hover:bg-primary-50/30'
                            }`}
                        >
                            <input
                                ref={importFileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImportFileSelect(file);
                                }}
                                className="hidden"
                            />

                            {importFile ? (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-green-200 w-full max-w-md">
                                        <FileSpreadsheet size={28} className="text-green-600" />
                                        <div className="flex-1 text-left min-w-0">
                                            <p className="font-semibold text-green-800 truncate">{importFile.name}</p>
                                            <p className="text-xs text-green-600">{(importFile.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                        <button
                                            onClick={() => { setImportFile(null); setImportPreview([]); setImportError(''); importFileInputRef.current!.value = ''; }}
                                            className="text-red-500 hover:text-red-700 p-1"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                    {importPreview.length > 0 && (
                                        <button
                                            onClick={handleImportConfirm}
                                            disabled={isImporting}
                                            className="w-full max-w-md px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isImporting ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" />
                                                    Importando {importPreview.length} serviços...
                                                </>
                                            ) : (
                                                <>
                                                    <Check size={16} />
                                                    Confirmar Importação de {importPreview.length} serviços
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 py-2">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                                        <FileSpreadsheet size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-600">Arraste a planilha aqui</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">ou <span className="text-primary-600 font-bold">clique para selecionar</span></p>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">Formatos: .xlsx, .xls, .csv • Máximo 5MB</p>
                                </div>
                            )}
                        </div>

                        {importError && (
                            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                                <AlertTriangle size={14} className="text-red-500 shrink-0" />
                                <p className="text-[11px] text-red-700 font-semibold">{importError}</p>
                            </div>
                        )}
                    </div>

                    {/* Preview */}
                    {importPreview.length > 0 && (
                        <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Prévia dos serviços a serem importados ({importPreview.length})</p>
                            {importPreview.map((svc, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-100">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900 text-sm truncate">{svc.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                                            {svc.groupName && <span className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs">{svc.groupName}</span>}
                                            <span>R$ {Number(svc.price).toFixed(2)}</span>
                                            <span>{svc.durationMinutes} min</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Instructions */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Info size={13} /> Instruções
                        </p>
                        <ul className="text-[11px] text-slate-600 space-y-1">
                            <li>• <strong>Nome</strong> (obrigatório): Nome do serviço</li>
                            <li>• <strong>Grupo</strong> (opcional): Categoria do serviço (ex: Cabelo, Unhas, Estética)</li>
                            <li>• <strong>Descrição</strong> (opcional): Detalhes do atendimento</li>
                            <li>• <strong>Preço</strong> (obrigatório): Valor em reais (ex: 85.00)</li>
                            <li>• <strong>Duração (min)</strong> (opcional): Tempo em minutos (padrão: 60)</li>
                            <li>• <strong>Observação</strong> (opcional): Informações extras para o cliente</li>
                            <li>• <strong>Imagem URL</strong> (opcional): Link da foto do serviço</li>
                        </ul>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

// Helper functions for import
const downloadTemplate = () => {
    const templateData = [
        { 
            'Nome*': 'Corte Feminino', 
            'Grupo': 'Cabelo', 
            'Descrição': 'Corte com lavagem e finalização', 
            'Preço*': 85.00, 
            'Duração (min)': 60, 
            'Observação': 'Inclui lavagem e secagem',
            'Imagem URL': ''
        },
        { 
            'Nome*': 'Manicure Simples', 
            'Grupo': 'Unhas', 
            'Descrição': 'Corte, lixamento e esmaltação', 
            'Preço*': 35.00, 
            'Duração (min)': 45, 
            'Observação': 'Esmalte não incluso',
            'Imagem URL': ''
        },
        { 
            'Nome*': 'Limpeza de Pele', 
            'Grupo': 'Estética', 
            'Descrição': 'Limpeza profunda com extração', 
            'Preço*': 120.00, 
            'Duração (min)': 90, 
            'Observação': 'Não indicado para pele sensível',
            'Imagem URL': ''
        },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Serviços');
    XLSX.writeFile(wb, 'modelo_servicos.xlsx');
};

const handleImportFileSelect = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
        setImportError('Arquivo muito grande. Tamanho máximo: 5MB');
        return;
    }

    setImportFile(file);
    setImportError('');

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

            const preview: Partial<Service>[] = [];
            const errors: string[] = [];

            jsonData.forEach((row: any, index: number) => {
                const rowNum = index + 2; // +2 because header is row 1, 0-indexed
                const name = (row['Nome*'] || row['Nome'] || row['nome'] || '').toString().trim();
                const groupName = (row['Grupo'] || row['grupo'] || '').toString().trim();
                const description = (row['Descrição'] || row['Descricao'] || row['descrição'] || row['descricao'] || '').toString().trim();
                const price = parseFloat((row['Preço*'] || row['Preco*'] || row['Preço'] || row['Preco'] || row['preço'] || row['preco'] || '0').toString().replace(',', '.'));
                const durationMinutes = parseInt((row['Duração (min)'] || row['Duracao (min)'] || row['Duração'] || row['Duracao'] || row['duração'] || row['duracao'] || '60').toString()) || 60;
                const observation = (row['Observação'] || row['Observacao'] || row['observação'] || row['observacao'] || '').toString().trim();
                const imageUrl = (row['Imagem URL'] || row['Imagem'] || row['imagem'] || row['Image URL'] || row['image'] || '').toString().trim();

                if (!name) {
                    errors.push(`Linha ${rowNum}: Nome é obrigatório`);
                    return;
                }
                if (isNaN(price) || price <= 0) {
                    errors.push(`Linha ${rowNum}: Preço inválido`);
                    return;
                }

                preview.push({
                    name,
                    groupName: groupName || '',
                    description: description || 'Serviço importado via planilha',
                    price,
                    durationMinutes,
                    observation: observation || '',
                    imageUrl: imageUrl || `https://picsum.photos/400/300?random=${Date.now() + index}`,
                });
            });

            if (errors.length > 0) {
                setImportError(errors.join('; '));
                setImportPreview([]);
            } else if (preview.length === 0) {
                setImportError('Nenhum serviço válido encontrado na planilha');
                setImportPreview([]);
            } else {
                setImportPreview(preview);
            }
        } catch (err) {
            setImportError('Erro ao ler a planilha. Verifique o formato do arquivo.');
            setImportPreview([]);
        }
    };
    reader.readAsArrayBuffer(file);
};

const handleImportConfirm = async () => {
    if (importPreview.length === 0 || isImporting) return;

    setIsImporting(true);
    setImportError('');

    try {
        for (const svc of importPreview) {
            await addService({
                name: svc.name!,
                groupName: svc.groupName?.trim() || '',
                price: Number(svc.price),
                durationMinutes: Number(svc.durationMinutes || 60),
                description: svc.description || 'Serviço importado via planilha',
                imageUrl: svc.imageUrl || `https://picsum.photos/400/300?random=${Date.now()}`,
                observation: svc.observation || ''
            });
        }
        setIsImportModalOpen(false);
        setImportFile(null);
        setImportPreview([]);
    } catch (err) {
        setImportError('Erro ao importar serviços. Tente novamente.');
    } finally {
        setIsImporting(false);
    }
};


export default ServicesManager;
