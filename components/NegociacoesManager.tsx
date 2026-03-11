import React, { useState, useEffect, useMemo } from 'react';
import { Negociacao, NegociacaoInput, StatusNegociacao, fetchNegociacoes, insertNegociacao, updateNegociacao, deleteNegociacao } from '../services/negociacoesService';
import { fetchVendedores } from '../services/vendedoresService';
import { supabase } from '../services/supabaseClient';

const STATUS_OPTIONS: { value: StatusNegociacao; label: string; colorClass: string; icon: string }[] = [
    { value: 'Pago', label: 'Pago', colorClass: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-400 dark:border-green-800', icon: '🟢' },
    { value: 'Aguardando pagamento', label: 'Aguardando pagamento', colorClass: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800', icon: '🟡' },
    { value: 'Atrasado', label: 'Atrasado', colorClass: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800', icon: '🔴' },
    { value: 'Reagendado', label: 'Reagendado', colorClass: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800', icon: '🔵' }
];

const getTodayDateStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const NegociacoesManager: React.FC = () => {
    const [data, setData] = useState<Negociacao[]>([]);
    const [vendedores, setVendedores] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Negociacao | null>(null);
    const [form, setForm] = useState<NegociacaoInput>({
        aluno: '',
        telefone: '',
        atendente: '',
        valor_negociado: 0,
        status: 'Aguardando pagamento',
        data_contato: getTodayDateStr(),
        data_promessa: getTodayDateStr(),
        observacao: ''
    });
    const [saving, setSaving] = useState(false);

    // Filters
    const [filterVendor, setFilterVendor] = useState<string>('todos');
    const [filterStatus, setFilterStatus] = useState<string>('todos');

    const loadData = async () => {
        setLoading(true);
        try {
            const [negData, vendData] = await Promise.all([
                fetchNegociacoes(),
                fetchVendedores()
            ]);
            setData(negData);
            setVendedores(vendData.map(v => v.nome));
            setError(null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        // Real-time subscription
        const channel = supabase
            .channel('negociacoes-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'negociacoes' }, () => {
                loadData();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Derived State
    const todayStr = getTodayDateStr();

    // 1. Contatos de hoje: data_contato === hoje
    const contatosHojeCount = data.filter(n => n.data_contato === todayStr).length;

    // 2. Atrasos novos (não avisados ainda / não fechados)
    // Aqueles que a data_promessa < hoje AND status != 'Pago' E status != 'Reagendado'
    const promessasAtrasadas = data.filter(n => {
        return n.data_promessa < todayStr && n.status !== 'Pago' && n.status !== 'Reagendado';
    });

    // Auto-atualizar status para Atrasado na view (poderia ser feito no backend também via cron)
    // Para simplificar, a lógica de Atrasado visual já resolve muito
    // Se data_promessa passou e não pagou, deveriam ser re-marcados ou contatados.

    // 3. Ranking de Recuperação
    const ranking = useMemo(() => {
        const aggs: Record<string, { totalRecovered: number; count: number }> = {};
        data.forEach(n => {
            if (n.status === 'Pago') {
                const vend = n.atendente || 'Sem vendedor';
                if (!aggs[vend]) aggs[vend] = { totalRecovered: 0, count: 0 };
                aggs[vend].totalRecovered += Number(n.valor_negociado);
                aggs[vend].count++;
            }
        });
        return Object.entries(aggs)
            .map(([vendedor, stats]) => ({ vendedor, ...stats }))
            .sort((a, b) => b.totalRecovered - a.totalRecovered)
            .slice(0, 5); // Top 5
    }, [data]);

    // Apply filters
    const filteredData = useMemo(() => {
        return data.filter(n => {
            if (filterVendor !== 'todos' && n.atendente !== filterVendor) return false;
            if (filterStatus !== 'todos' && n.status !== filterStatus) return false;
            return true;
        });
    }, [data, filterVendor, filterStatus]);

    const openModal = (neg?: Negociacao) => {
        if (neg) {
            setEditing(neg);
            setForm({
                aluno: neg.aluno,
                telefone: neg.telefone || '',
                atendente: neg.atendente,
                valor_negociado: neg.valor_negociado,
                status: neg.status,
                data_contato: neg.data_contato,
                data_promessa: neg.data_promessa,
                observacao: neg.observacao || ''
            });
        } else {
            setEditing(null);
            setForm({
                aluno: '',
                telefone: '',
                atendente: vendedores[0] || '',
                valor_negociado: 0,
                status: 'Aguardando pagamento',
                data_contato: todayStr,
                data_promessa: todayStr,
                observacao: ''
            });
        }
        setModalOpen(true);
        setError(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            if (editing) {
                await updateNegociacao(editing.id, form);
            } else {
                await insertNegociacao(form);
            }
            setModalOpen(false);
            loadData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!editing) return;
        if (!window.confirm('Tem certeza que deseja excluir esta negociação?')) return;

        setSaving(true);
        try {
            await deleteNegociacao(editing.id);
            setModalOpen(false);
            loadData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-black text-[#231F20] dark:text-zinc-100 uppercase tracking-tighter italic leading-none">
                        Módulo de <span className="text-amber-500">Negociações</span>
                    </h2>
                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        Modo de Teste — Controle de Pagamentos
                    </p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg transition-all hover:scale-105 hover:shadow-amber-500/30"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                    Nova Negociação
                </button>
            </header>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl text-sm font-bold shadow-sm flex items-center gap-3"><svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>{error}</div>}

            {/* Dashboard Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Alertas */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4">Central de Alertas</h3>

                    {contatosHojeCount > 0 && (
                        <div className="bg-zinc-800 dark:bg-zinc-900 border-l-4 border-blue-500 p-6 rounded-2xl shadow-xl hover:shadow-blue-500/20 transition-all flex items-start gap-4">
                            <div className="text-2xl mt-1">📅</div>
                            <div>
                                <h4 className="text-sm font-black text-white uppercase tracking-wider">Ações para Hoje</h4>
                                <p className="text-zinc-300 mt-1 font-semibold text-sm">Existem <strong className="text-blue-400 text-lg">{contatosHojeCount}</strong> negociaç{contatosHojeCount === 1 ? 'ão' : 'ões'} agendadas para contato no dia de hoje.</p>
                            </div>
                        </div>
                    )}

                    {promessasAtrasadas.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 p-6 rounded-2xl shadow-xl hover:shadow-red-500/20 transition-all">
                            <h4 className="flex items-center gap-2 text-sm font-black text-red-700 dark:text-red-400 uppercase tracking-wider mb-3">
                                <span className="text-xl">⚠️</span> Promessas Quebradas (Atrasos)
                            </h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                                {promessasAtrasadas.map(p => (
                                    <div key={p.id} className="bg-white dark:bg-zinc-800/50 p-3 rounded-lg border border-red-100 dark:border-red-800 flex items-center justify-between group cursor-pointer" onClick={() => openModal(p)}>
                                        <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                            <strong className="text-[#231F20] dark:text-white uppercase px-1">{p.aluno}</strong> deveria pagar R$ {p.valor_negociado} em {new Date(p.data_promessa + 'T00:00:00').toLocaleDateString('pt-BR')} e ainda não pagou.
                                        </p>
                                        <span className="text-[10px] text-red-500 font-bold opacity-0 group-hover:opacity-100 transition-all uppercase underline">Ver info</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {contatosHojeCount === 0 && promessasAtrasadas.length === 0 && (
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl text-center">
                            <span className="text-3xl mb-2 block">✅</span>
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Tudo tranquilo por enquanto! Nenhum alerta crítico.</p>
                        </div>
                    )}
                </div>

                {/* Ranking de Recuperação */}
                <div>
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span>💰</span> Ranking de Recuperação
                    </h3>
                    <div className="bg-white dark:bg-zinc-900 shadow-xl rounded-3xl p-6 border-t-8 border-green-500">
                        {ranking.length > 0 ? (
                            <ul className="space-y-4">
                                {ranking.map((row, i) => (
                                    <li key={row.vendedor} className="flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-white shrink-0 shadow-md ${i === 0 ? 'bg-amber-400 scale-110 drop-shadow-md z-10' :
                                            i === 1 ? 'bg-zinc-400' :
                                                i === 2 ? 'bg-amber-700' : 'bg-zinc-700'
                                            }`}>
                                            {i + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-black text-[#231F20] dark:text-zinc-100 truncate">{row.vendedor}</p>
                                            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">{row.count} recebimento(s)</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-green-600">R$ {row.totalRecovered.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-xs text-zinc-400 text-center font-bold py-8 italic uppercase">Nenhuma recuperação registrada ainda.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Filters & Table */}
            <div className="bg-white dark:bg-zinc-900 shadow-sm rounded-3xl overflow-hidden">
                <div className="bg-[#231F20] flex flex-col md:flex-row md:items-center justify-between p-6 gap-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Todas as Negociações</h3>
                    <div className="flex flex-wrap gap-4">
                        <select
                            value={filterVendor}
                            onChange={(e) => setFilterVendor(e.target.value)}
                            className="bg-zinc-800 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                            <option value="todos">Todos Vendedores</option>
                            {vendedores.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-zinc-800 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                            <option value="todos">Todos Status</option>
                            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 flex justify-center"><div className="w-10 h-10 border-4 border-zinc-200 border-t-amber-500 rounded-full animate-spin"></div></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800">
                                    <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap">Status</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap">Aluno</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap">Vendedor</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap">Data Contato</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap">Venc./Promessa</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.length === 0 && (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-xs font-bold text-zinc-400 uppercase tracking-widest">Nenhuma negociação encontrada.</td></tr>
                                )}
                                {filteredData.map(row => {
                                    const st = STATUS_OPTIONS.find(s => s.value === row.status);
                                    // Automaticamente pintar de vermelho se atrasou e não está pago
                                    const isAutoAtrasado = row.data_promessa < todayStr && row.status !== 'Pago' && row.status !== 'Reagendado' && row.status !== 'Atrasado';
                                    const displayStatus = isAutoAtrasado ? STATUS_OPTIONS.find(s => s.value === 'Atrasado') : st;

                                    return (
                                        <tr key={row.id}
                                            onClick={() => openModal(row)}
                                            className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${displayStatus?.colorClass}`}>
                                                    {displayStatus?.icon} {displayStatus?.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-[#231F20] dark:text-zinc-100">{row.aluno}</span>
                                                    {row.telefone && (
                                                        <a href={`https://wa.me/55${row.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-zinc-500 hover:text-green-500 transition-colors flex items-center gap-1 mt-1 font-bold group" onClick={e => e.stopPropagation()}>
                                                            <svg className="w-3 h-3 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 21.077c-1.503 0-2.956-.395-4.246-1.144l-.304-.18-3.155.828.841-3.076-.197-.313c-.822-1.306-1.258-2.825-1.258-4.382 0-4.604 3.746-8.349 8.356-8.349 2.23 0 4.326.868 5.897 2.445A8.303 8.303 0 0 1 20.386 12.8c0 4.603-3.744 8.277-8.355 8.277zm-5.744-2.816l.18.11c1.171.72 2.502 1.1 3.868 1.1 3.715 0 6.741-3.023 6.741-6.733 0-1.78-.693-3.454-1.954-4.717a6.678 6.678 0 0 0-4.721-1.957c-3.715 0-6.741 3.023-6.741 6.732 0 1.25.32 2.464.93 3.535l.121.192-.497 1.82 1.903-.497a.382.382 0 0 0-.01-.005.41.41 0 0 0 .007.037z" /><path d="M16.485 14.524c-.246-.123-1.458-.72-1.684-.803-.227-.082-.39-.123-.554.123-.163.245-.635.803-.777.967-.142.163-.284.184-.53.061-.246-.123-1.04-.384-1.983-1.22-.733-.65-1.228-1.452-1.37-1.698-.142-.246-.015-.379.108-.5.11-.11.246-.285.369-.427.123-.142.164-.246.246-.41.082-.164.04-.307-.02-.43-.062-.123-.554-1.334-.76-1.826-.198-.475-.401-.412-.553-.42h-.471c-.164 0-.43.061-.656.307-.226.246-.86.84-.86 2.048 0 1.208.881 2.375 1.004 2.54.123.163 1.733 2.645 4.198 3.71 1.603.693 2.213.791 2.96.685.83-.118 2.38-.973 2.716-1.913.336-.941.336-1.748.236-1.914-.1-.166-.366-.272-.612-.396z" /></svg>
                                                            {row.telefone}
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{row.atendente}</td>
                                            <td className="px-6 py-4 text-xs font-bold text-zinc-600">{new Date(row.data_contato + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                            <td className="px-6 py-4 text-xs font-bold text-zinc-600">{new Date(row.data_promessa + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                            <td className="px-6 py-4 text-sm font-black text-right text-[#231F20] dark:text-zinc-100">
                                                R$ {Number(row.valor_negociado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de Formulário */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in" onMouseDown={() => setModalOpen(false)}>
                    <div className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden transform transition-all" onMouseDown={e => e.stopPropagation()}>
                        <div className="bg-[#231F20] text-white px-8 py-6 flex items-center justify-between">
                            <h2 className="text-xl font-black uppercase tracking-widest">{editing ? 'Editar' : 'Nova'} Negociação</h2>
                            <button onClick={() => setModalOpen(false)} className="text-white/60 hover:text-white p-2 bg-white/5 rounded-xl hover:bg-white/20 transition-all">
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-5">
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Nome do Aluno(a)</label>
                                    <input type="text" required value={form.aluno} onChange={e => setForm(f => ({ ...f, aluno: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="Nome completo" />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Telefone / WhatsApp</label>
                                    <input type="tel" value={form.telefone || ''} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="(11) 99999-9999" />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Vendedor Responsável</label>
                                    <select value={form.atendente} onChange={e => setForm(f => ({ ...f, atendente: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500">
                                        <option value="">Selecione...</option>
                                        {vendedores.map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Valor Negociado (R$)</label>
                                    <input type="number" step="0.01" min="0" required value={form.valor_negociado} onChange={e => setForm(f => ({ ...f, valor_negociado: parseFloat(e.target.value) || 0 }))} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="0.00" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Status Atual</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {STATUS_OPTIONS.map(st => (
                                            <label key={st.value} className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${form.status === st.value ? st.colorClass.split(' ')[0] + ' border-amber-500' : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30'}`}>
                                                <input type="radio" className="hidden" name="status" checked={form.status === st.value} onChange={() => setForm(f => ({ ...f, status: st.value }))} />
                                                <span className="text-lg">{st.icon}</span>
                                                <span className="text-[10px] font-black uppercase tracking-wider">{st.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Data do Contato</label>
                                    <input type="date" required value={form.data_contato} onChange={e => setForm(f => ({ ...f, data_contato: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500" />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Promessa de Pagamento</label>
                                    <input type="date" required value={form.data_promessa} onChange={e => setForm(f => ({ ...f, data_promessa: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Observações Adicionais</label>
                                    <textarea value={form.observacao || ''} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 h-24 resize-none" placeholder="O que foi acordado com o aluno?" />
                                </div>
                            </div>

                            <div className="flex justify-between pt-6 border-t border-zinc-100 dark:border-zinc-800">
                                {editing ? (
                                    <button type="button" onClick={handleDelete} disabled={saving} className="px-6 py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-200 transition-all">Excluir</button>
                                ) : <div />}
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className="px-6 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-zinc-200 transition-all">Cancelar</button>
                                    <button type="submit" disabled={saving} className="px-8 py-3 bg-amber-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg hover:shadow-amber-500/30 hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2">
                                        {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : null}
                                        {saving ? 'Gravando...' : 'Salvar Negociação'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NegociacoesManager;
