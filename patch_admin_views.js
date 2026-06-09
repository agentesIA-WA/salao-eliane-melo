const fs = require('fs');
const file = '/home/wesley/Desktop/salao-eliane-melo/pages/admin/AdminViews.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add 'businessConfig, updateBusinessConfig' to CalendarManager useApp()
content = content.replace(
    'const { appointments, updateAppointmentStatus, updateAppointment, services, professionals, addAppointment } = useApp();',
    'const { appointments, updateAppointmentStatus, updateAppointment, services, professionals, addAppointment, businessConfig, updateBusinessConfig } = useApp();'
);

// 2. Add Modal state to CalendarManager
const modalStateStr = `
    const [isBlockedModalOpen, setIsBlockedModalOpen] = useState(false);
    const [blockedForm, setBlockedForm] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '09:00',
        professionalId: 'ALL',
        durationMinutes: 60
    });

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
        setBlockedForm({ ...blockedForm, time: '09:00', durationMinutes: 60 });
    };

    const handleDeleteBlock = async (idToDel) => {
        const updatedBlocks = (businessConfig.blockedSlots || []).filter(b => b.id !== idToDel);
        await updateBusinessConfig({ ...businessConfig, blockedSlots: updatedBlocks });
    };
`;
content = content.replace(
    'const [isGenerating, setIsGenerating] = useState<string | null>(null);',
    'const [isGenerating, setIsGenerating] = useState<string | null>(null);\n' + modalStateStr
);

// 3. Add Button to header
const headerTarget = `<div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h2 className="text-3xl font-serif font-bold text-slate-900 tracking-wide">Agendamentos Realizados</h2>
                  <p className="text-slate-400 text-sm mt-1">Visualize listagem de clientes e gerencie o fluxo de agendamentos diário do salão.</p>
                </div>
                <Button 
                  onClick={() => setIsNewAptModalOpen(true)} 
                  className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-5 self-start sm:self-auto rounded-xl flex items-center gap-1.5"
                >
                  <Plus size={18} /> Novo Agendamento
                </Button>
             </div>`;
const newHeader = `<div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h2 className="text-3xl font-serif font-bold text-slate-900 tracking-wide">Agendamentos Realizados</h2>
                  <p className="text-slate-400 text-sm mt-1">Visualize listagem de clientes e gerencie o fluxo de agendamentos diário do salão.</p>
                </div>
                <div className="flex gap-2">
                    <Button 
                    onClick={() => setIsBlockedModalOpen(true)} 
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 px-4 self-start sm:self-auto rounded-xl flex items-center gap-1.5"
                    >
                    <Lock size={18} /> Bloqueios
                    </Button>
                    <Button 
                    onClick={() => setIsNewAptModalOpen(true)} 
                    className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-5 self-start sm:self-auto rounded-xl flex items-center gap-1.5"
                    >
                    <Plus size={18} /> Novo Agendamento
                    </Button>
                </div>
             </div>`;
content = content.replace(headerTarget, newHeader);

// 4. Add the Blocked Modal JSX right after the NewAptModal JSX
const blockModalStr = `
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
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Horário de Início</label>
                                <input type="time" value={blockedForm.time} onChange={e => setBlockedForm({...blockedForm, time: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-primary-500" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Duração (minutos)</label>
                                <select value={blockedForm.durationMinutes} onChange={e => setBlockedForm({...blockedForm, durationMinutes: Number(e.target.value)})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-primary-500 bg-white">
                                    <option value={30}>30 minutos</option>
                                    <option value={60}>1 hora</option>
                                    <option value={90}>1 hora e 30 min</option>
                                    <option value={120}>2 horas</option>
                                    <option value={240}>4 horas (Meio período)</option>
                                    <option value={480}>8 horas (Dia inteiro)</option>
                                </select>
                            </div>
                            <div>
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
`;

content = content.replace(
    '{/* Modal Edit/Reschedule */}',
    blockModalStr + '\n            {/* Modal Edit/Reschedule */}'
);

fs.writeFileSync(file, content);
console.log('AdminViews updated.');
