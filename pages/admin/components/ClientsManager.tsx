import React, { useState, useEffect, useCallback } from 'react';
import { Client } from '../../../types';
import { dbClients } from '../../../services/db';
import { Button, Card, Input, Modal } from '../../../components/Shared';
import { Users, Pencil, Search, Loader2, Phone, Mail, Calendar, AlertCircle, UserCheck, Trash2, Plus, Eye, FileText } from 'lucide-react';

const formatPhoneMask = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 3) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
};

const ClientsManager: React.FC = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [viewingClient, setViewingClient] = useState<Client | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', email: '', observations: '' });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const loadClients = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await dbClients.getAll();
            setClients(data);
        } catch (err) {
            setError('Não foi possível carregar os clientes. Verifique a conexão com o servidor.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadClients();
    }, [loadClients]);

    const handleEdit = (client: Client) => {
        setEditingClient(client);
        setIsCreating(false);
        setForm({
            name: client.name || '',
            phone: client.phone || '',
            email: client.email || '',
            observations: client.observations || '',
        });
        setSaveError('');
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setIsCreating(true);
        setEditingClient(null);
        setForm({
            name: '',
            phone: '',
            email: '',
            observations: '',
        });
        setSaveError('');
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        const name = form.name.trim();
        if (!name) {
            setSaveError('O nome do cliente é obrigatório.');
            return;
        }
        setSaving(true);
        setSaveError('');

        try {
            if (editingClient) {
                await dbClients.update(editingClient.userId, {
                    name,
                    phone: form.phone.trim(),
                    email: form.email.trim(),
                    observations: form.observations.trim(),
                });
            } else {
                await dbClients.create({
                    name,
                    phone: form.phone.trim(),
                    email: form.email.trim(),
                    observations: form.observations.trim(),
                });
            }

            setIsModalOpen(false);
            await loadClients();
        } catch (err) {
            setSaveError('Erro ao salvar. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!clientToDelete) return;
        setDeleting(true);
        setDeleteError('');
        try {
            await dbClients.delete(clientToDelete.userId);
            setClientToDelete(null);
            await loadClients();
        } catch (err) {
            setDeleteError('Erro ao excluir. Tente novamente.');
        } finally {
            setDeleting(false);
        }
    };

    const filteredClients = clients.filter(c => {
        const term = searchTerm.toLowerCase();
        return (
            (c.name || '').toLowerCase().includes(term) ||
            (c.phone || '').toLowerCase().includes(term) ||
            (c.email || '').toLowerCase().includes(term) ||
            (c.observations || '').toLowerCase().includes(term)
        );
    });

    const formatDate = (value: string) => {
        if (!value) return '—';
        const [datePart] = value.split(' ');
        const [year, month, day] = datePart.split('-');
        if (!year || !month || !day) return value;
        return `${day}/${month}/${year}`;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary-700">Relacionamento</p>
                    <h2 className="mt-1 font-serif text-3xl font-semibold text-slate-900">Clientes</h2>
                    <p className="mt-1 text-sm text-slate-500">Cadastre e mantenha os dados de contato e observações dos clientes.</p>
                </div>
                <Button onClick={handleCreate} className="w-full sm:w-auto">
                    <Plus size={17} /> Cadastrar cliente
                </Button>
            </div>

            {/* Barra de busca */}
            <div className="relative max-w-xl w-full">
                <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar nome, telefone, e-mail ou observação"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-100"
                />
            </div>

            {loading && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Loader2 size={32} className="animate-spin text-primary-500 mb-3" />
                    <p className="text-sm font-semibold">Carregando clientes...</p>
                </div>
            )}

            {!loading && error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                    <AlertCircle size={18} className="text-red-500 shrink-0" />
                    <p className="text-sm text-red-700 font-semibold">{error}</p>
                    <Button onClick={loadClients} className="ml-auto bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 px-3">Tentar novamente</Button>
                </div>
            )}

            {!loading && !error && filteredClients.length === 0 && (
                <Card className="rounded-lg py-16 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <Users size={28} />
                    </div>
                    <h3 className="font-bold text-slate-700 text-lg">
                        {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                        {searchTerm ? 'Tente buscar com outros termos.' : 'Cadastre o primeiro cliente ou aguarde novos agendamentos.'}
                    </p>
                    {!searchTerm && <Button onClick={handleCreate} className="mx-auto mt-5"><Plus size={16} /> Cadastrar cliente</Button>}
                </Card>
            )}

            {!loading && !error && filteredClients.length > 0 && (
                <>
                    <p className="text-xs font-semibold text-slate-500">
                        {filteredClients.length} {filteredClients.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}
                    </p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {filteredClients.map(client => (
                            <Card key={client.userId} className="group relative rounded-lg border-slate-200 p-5 transition-shadow hover:shadow-md flex flex-col justify-between">
                                <div className="absolute right-4 top-4 z-10 flex gap-1">
                                    <button
                                        onClick={() => setViewingClient(client)}
                                        className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                                        title="Visualizar cliente"
                                        aria-label={`Visualizar ${client.name}`}
                                    >
                                        <Eye size={17} />
                                    </button>
                                    <button
                                        onClick={() => handleEdit(client)}
                                        className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-primary-50 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                                        title="Editar cliente"
                                        aria-label={`Editar ${client.name}`}
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        onClick={() => { setClientToDelete(client); setDeleteError(''); }}
                                        className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                                        title="Excluir cliente"
                                        aria-label={`Excluir ${client.name}`}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div>
                                    <div className="flex items-center gap-3 mb-4 pr-24">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary-100 bg-primary-50 text-base font-bold text-primary-700">
                                            {(client.name || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-slate-950 text-base truncate" title={client.name}>{client.name}</h3>
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                                <UserCheck size={10} /> Cliente
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm text-slate-500">
                                        <div className="flex items-center gap-2 truncate">
                                            <Phone size={14} className="text-slate-400 shrink-0" />
                                            <span className="truncate">{client.phone || 'Telefone não informado'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 truncate">
                                            <Mail size={14} className="text-slate-400 shrink-0" />
                                            <span className="truncate">{client.email || 'E-mail não informado'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-slate-400 shrink-0" />
                                            <span>Última visita: {formatDate(client.lastVisit)}</span>
                                        </div>
                                    </div>

                                    {client.observations && (
                                        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200/70 bg-amber-50/70 p-2.5">
                                            <FileText size={14} className="mt-0.5 shrink-0 text-amber-600" />
                                            <p className="line-clamp-2 text-xs leading-relaxed text-amber-800">{client.observations}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Agendamentos</span>
                                    <span className="text-sm font-extrabold text-primary-600">{client.totalAppointments}</span>
                                </div>
                            </Card>
                        ))}
                    </div>
                </>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingClient ? "Editar dados do cliente" : "Cadastrar cliente"}>
                <div className="space-y-4">
                    <Input
                        label="Nome Completo"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        placeholder="Ex: Maria da Silva"
                        required
                    />
                    <Input
                        label="Telefone / WhatsApp"
                        value={form.phone}
                        onChange={e => setForm({ ...form, phone: formatPhoneMask(e.target.value) })}
                        placeholder="Ex: (11) 9 9999-9999"
                        type="tel"
                    />
                    <Input
                        label="E-mail"
                        type="email"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        placeholder="Ex: maria@email.com"
                    />

                    <div className="w-full">
                        <label className="block text-xs md:text-sm font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                            Observação
                        </label>
                        <textarea
                            value={form.observations}
                            onChange={e => setForm({ ...form, observations: e.target.value })}
                            placeholder="Texto livre para anotações sobre o cliente (ex: alergias, preferências de horário, histórico de química, observações gerais)..."
                            rows={3}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all duration-300 bg-slate-50/50 focus:bg-white text-slate-800 placeholder-slate-400 text-sm md:text-base resize-none"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                            Anotações internas sobre o cliente — visíveis para a administração do salão.
                        </p>
                    </div>

                    {saveError && (
                        <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                            <AlertCircle size={14} className="text-red-500 shrink-0" />
                            <p className="text-[11px] text-red-700 font-semibold">{saveError}</p>
                        </div>
                    )}

                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                            {isCreating ? 'O novo cadastro ficará disponível na lista de clientes do salão.' : 'Os dados atualizados do cliente ficarão salvos para consultas e próximos atendimentos.'}
                        </p>
                    </div>

                    <Button fullWidth onClick={handleSubmit} disabled={saving} className="mt-2">
                        {saving ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 size={16} className="animate-spin" /> Salvando...
                            </span>
                        ) : (editingClient ? 'Salvar Alterações' : 'Cadastrar')}
                    </Button>
                </div>
            </Modal>

            {/* Modal de confirmação de exclusão */}
            <Modal isOpen={!!clientToDelete} onClose={() => setClientToDelete(null)} title="Excluir Cliente">
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                        <div className="text-sm text-red-700">
                            <p className="font-bold">Esta ação não pode ser desfeita.</p>
                            <p className="mt-1 text-[13px] leading-relaxed">
                                O cadastro de <strong>{clientToDelete?.name}</strong> será removido da lista de clientes. Os agendamentos existentes não serão excluídos.
                            </p>
                        </div>
                    </div>

                    {deleteError && (
                        <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                            <AlertCircle size={14} className="text-red-500 shrink-0" />
                            <p className="text-[11px] text-red-700 font-semibold">{deleteError}</p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Button variant="outline" fullWidth onClick={() => setClientToDelete(null)} disabled={deleting}>
                            Cancelar
                        </Button>
                        <Button variant="danger" fullWidth onClick={handleDelete} disabled={deleting}>
                            {deleting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 size={16} className="animate-spin" /> Excluindo...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <Trash2 size={16} /> Excluir
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={!!viewingClient} onClose={() => setViewingClient(null)} title="Dados cadastrais do cliente">
                {viewingClient && (
                    <div className="space-y-5">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-lg font-bold text-primary-700">
                                {(viewingClient.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <h4 className="truncate text-lg font-semibold text-slate-900">{viewingClient.name}</h4>
                                <p className="text-xs text-slate-500">ID: {viewingClient.userId}</p>
                            </div>
                        </div>
                        <dl className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-lg bg-slate-50 p-3">
                                <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><Phone size={14} /> Telefone</dt>
                                <dd className="mt-2 break-words text-sm text-slate-900">{viewingClient.phone || 'Não informado'}</dd>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-3">
                                <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><Mail size={14} /> E-mail</dt>
                                <dd className="mt-2 break-all text-sm text-slate-900">{viewingClient.email || 'Não informado'}</dd>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-3">
                                <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><Calendar size={14} /> Última visita</dt>
                                <dd className="mt-2 text-sm text-slate-900">{formatDate(viewingClient.lastVisit)}</dd>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-3">
                                <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><Calendar size={14} /> Agendamentos</dt>
                                <dd className="mt-2 text-sm text-slate-900">{viewingClient.totalAppointments}</dd>
                            </div>
                            <div className="rounded-lg bg-amber-50/70 border border-amber-200/60 p-3 sm:col-span-2">
                                <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-800"><FileText size={14} /> Observação</dt>
                                <dd className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-800">
                                    {viewingClient.observations || 'Nenhuma observação registrada.'}
                                </dd>
                            </div>
                        </dl>
                        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                            <Button variant="outline" onClick={() => setViewingClient(null)}>Fechar</Button>
                            <Button onClick={() => { const client = viewingClient; setViewingClient(null); handleEdit(client); }}><Pencil size={15} /> Editar</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ClientsManager;
