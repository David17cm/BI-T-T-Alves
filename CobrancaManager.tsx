import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';

interface EnrollmentRow {
    id: number;
    aluno: string;
    pacote: string;
    turma: string;
    assinatura: string | null;
    total_a_receber: number;
    total_recebido: number;
    atendente: string | null;
    created_at: string;
}

interface Props { isAdmin?: boolean; }

const CobrancaManager: React.FC<Props> = ({ isAdmin = true }) => {
    const [allData, setAllData] = useState<EnrollmentRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedVendor, setSelectedVendor] = useState<string>('todos');

    const load = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('enrollments')
                .select('id, aluno, pacote, turma, assinatura, total_a_receber, total_recebido, atendente, created_at')
                .order('aluno');
            if (error) throw error;
            setAllData(data || []);
            setError(null);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        load();
        // Real-time subscription
        const channel = supabase
            .channel('enrollments-cobranca')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, () => {
                load();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const pendentes = allData.filter(d => !d.assinatura || d.assinatura === 'NENHUM');
    const totalAlunos = allData.length;
    const totalPresencial = allData.filter(d => d.assinatura === 'PRESENCIAL').length;
    const totalDigital = allData.filter(d => d.assinatura === 'DIGITAL').length;
    const totalNenhum = pendentes.length;

    // Calculate delay in days
    const getDaysDelayed = (dateStr: string) => {
        const createdDate = new Date(dateStr);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - createdDate.getTime());
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    };

    // Get top 10 oldest pending (sort by created_at ascending)
    const topPendentes = [...pendentes]
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .slice(0, 10);

    const criticalDelayCount = pendentes.filter(p => getDaysDelayed(p.created_at) >= 7).length;
    const warningDelayCount = pendentes.filter(p => getDaysDelayed(p.created_at) >= 3 && getDaysDelayed(p.created_at) < 7).length;

    const maxBar = Math.max(totalPresencial, totalDigital, totalNenhum, 1);

    // Unique vendors with pending counts
    const vendorList = useMemo(() => {
        const map: Record<string, number> = {};
        pendentes.forEach(d => {
            const v = d.atendente || 'Não informado';
            map[v] = (map[v] || 0) + 1;
        });
        return Object.entries(map).sort((a, b) => b[1] - a[1]);
    }, [pendentes]);

    const filteredPendentes = selectedVendor === 'todos' ? pendentes : pendentes.filter(p => (p.atendente || 'Não informado') === selectedVendor);

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-black text-[#231F20] uppercase tracking-tighter italic leading-none">
                        <span className="text-[#E31E24]">Cobrança</span> de Assinaturas
                    </h2>
                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mt-2">
                        Alunos com assinatura pendente • Atualização em tempo real
                    </p>
                </div>
                {vendorList.length > 1 && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mr-1">Vendedor:</span>
                        <button
                            onClick={() => setSelectedVendor('todos')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${selectedVendor === 'todos'
                                ? 'bg-[#231F20] text-white shadow-md'
                                : 'bg-white text-zinc-500 border border-zinc-200 hover:border-zinc-400'
                                }`}
                        >
                            Todos ({pendentes.length})
                        </button>
                        {vendorList.map(([vendor, count]) => (
                            <button
                                key={vendor}
                                onClick={() => setSelectedVendor(vendor)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${selectedVendor === vendor
                                    ? 'bg-[#E31E24] text-white shadow-md'
                                    : 'bg-white text-zinc-500 border border-zinc-200 hover:border-[#E31E24] hover:text-[#E31E24]'
                                    }`}
                            >
                                {vendor} ({count})
                            </button>
                        ))}
                    </div>
                )}
            </header>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-xl text-sm font-bold">{error}</div>}

            {/* Alertas de Atraso */}
            {(criticalDelayCount > 0 || warningDelayCount > 0) && (
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    {criticalDelayCount > 0 && (
                        <div className="flex-1 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-4 animate-pulse-slow">
                            <div className="w-10 h-10 bg-[#E31E24] rounded-full flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-500/30">
                                <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Crítico (&gt; 7 dias)</p>
                                <p className="text-xl font-black text-red-800 leading-none mt-1">{criticalDelayCount} alunos</p>
                            </div>
                        </div>
                    )}
                    {warningDelayCount > 0 && (
                        <div className="flex-1 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4">
                            <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white shrink-0 shadow-lg shadow-amber-500/30">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Atenção (3 a 7 dias)</p>
                                <p className="text-xl font-black text-amber-900 leading-none mt-1">{warningDelayCount} alunos</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Total Alunos</p>
                    <p className="text-3xl font-black text-[#231F20] mt-1">{totalAlunos}</p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border-l-4 border-green-500">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Presencial</p>
                    <p className="text-3xl font-black text-green-600 mt-1">{totalPresencial}</p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border-l-4 border-blue-500">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Digital</p>
                    <p className="text-3xl font-black text-blue-600 mt-1">{totalDigital}</p>
                </div>
                <div className="group relative bg-white rounded-2xl p-6 shadow-sm border-l-4 border-[#E31E24] cursor-default transition-all hover:shadow-md">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Pendente</p>
                    <p className="text-3xl font-black text-[#E31E24] mt-1">{totalNenhum}</p>

                    {/* Tooltip */}
                    {topPendentes.length > 0 && (
                        <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 translate-y-full w-64 bg-[#231F20] text-white p-4 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all z-50 pointer-events-none">
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#231F20] rotate-45"></div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#E31E24] mb-2 relative z-10">Mais Antigos</h4>
                            <ul className="space-y-1 relative z-10">
                                {topPendentes.map((p, i) => (
                                    <li key={p.id} className="text-[10px] font-bold text-zinc-300 flex justify-between">
                                        <span className="truncate max-w-[70%]">{i + 1}. {p.aluno}</span>
                                        <span className="text-zinc-500">{new Date(p.created_at).toLocaleDateString()}</span>
                                    </li>
                                ))}
                            </ul>
                            {pendentes.length > 10 && <p className="text-[9px] text-zinc-500 mt-2 text-center italic">+ {pendentes.length - 10} outros...</p>}
                        </div>
                    )}
                </div>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-[2rem] shadow-sm p-8">
                <h3 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-6">Distribuição de Assinaturas</h3>
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <span className="w-24 text-xs font-black text-zinc-600 text-right">Presencial</span>
                        <div className="flex-1 bg-zinc-100 rounded-full h-8 overflow-hidden">
                            <div className="bg-green-500 h-full rounded-full flex items-center justify-end pr-3 transition-all duration-700"
                                style={{ width: `${Math.max((totalPresencial / maxBar) * 100, totalPresencial > 0 ? 8 : 0)}%` }}>
                                {totalPresencial > 0 && <span className="text-white text-[10px] font-black">{totalPresencial}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="w-24 text-xs font-black text-zinc-600 text-right">Digital</span>
                        <div className="flex-1 bg-zinc-100 rounded-full h-8 overflow-hidden">
                            <div className="bg-blue-500 h-full rounded-full flex items-center justify-end pr-3 transition-all duration-700"
                                style={{ width: `${Math.max((totalDigital / maxBar) * 100, totalDigital > 0 ? 8 : 0)}%` }}>
                                {totalDigital > 0 && <span className="text-white text-[10px] font-black">{totalDigital}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="w-24 text-xs font-black text-[#E31E24] text-right">Pendente</span>
                        <div className="flex-1 bg-zinc-100 rounded-full h-8 overflow-hidden">
                            <div className="bg-[#E31E24] h-full rounded-full flex items-center justify-end pr-3 transition-all duration-700"
                                style={{ width: `${Math.max((totalNenhum / maxBar) * 100, totalNenhum > 0 ? 8 : 0)}%` }}>
                                {totalNenhum > 0 && <span className="text-white text-[10px] font-black">{totalNenhum}</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pending Table */}
            <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden">
                <div className="bg-[#231F20] text-white px-8 py-5">
                    <h3 className="text-sm font-black uppercase tracking-widest">Alunos com Assinatura Pendente</h3>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16"><div className="w-10 h-10 border-4 border-zinc-200 border-t-[#E31E24] rounded-full animate-spin"></div></div>
                ) : (
                    <table className="w-full text-left">
                        <thead><tr className="bg-zinc-50 border-b border-zinc-200">
                            <th className="px-6 py-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Aluno</th>
                            <th className="px-6 py-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Pacote</th>
                            <th className="px-6 py-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Turma</th>
                            <th className="px-6 py-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Vendedor</th>
                            <th className="px-6 py-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Tempo de Atraso</th>
                            {isAdmin && <th className="px-6 py-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-right">A Receber</th>}
                        </tr></thead>
                        <tbody>
                            {filteredPendentes.length === 0 && <tr><td colSpan={isAdmin ? 6 : 5} className="px-6 py-16 text-center text-zinc-400 font-bold uppercase tracking-widest text-[10px]">Nenhum aluno com assinatura pendente {selectedVendor !== 'todos' ? 'para este vendedor' : ''} 🎉</td></tr>}
                            {filteredPendentes.map((p, i) => {
                                const days = getDaysDelayed(p.created_at);
                                const isCritical = days >= 7;
                                const isWarning = days >= 3 && days < 7;

                                return (
                                    <tr key={p.id} className={`border-t transition-colors ${isCritical
                                            ? 'bg-red-50/80 hover:bg-red-100 border-red-200'
                                            : isWarning
                                                ? 'bg-amber-50/80 hover:bg-amber-100 border-amber-200'
                                                : i % 2 ? 'bg-zinc-50/50 hover:bg-zinc-100 border-zinc-100' : 'hover:bg-zinc-50 border-zinc-100'
                                        }`}>
                                        <td className="px-6 py-4 font-black text-sm text-[#231F20] flex items-center gap-2">
                                            {isCritical && <span title="Atraso Crítico" className="flex w-2 h-2 rounded-full bg-[#E31E24] animate-pulse"></span>}
                                            {isWarning && <span title="Atraso de Atenção" className="flex w-2 h-2 rounded-full bg-amber-500"></span>}
                                            {p.aluno || '—'}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-zinc-600">{p.pacote || '—'}</td>
                                        <td className="px-6 py-4"><span className={`inline-block text-[9px] font-black px-2.5 py-1 rounded-full ${isCritical ? 'bg-red-900 text-white' : isWarning ? 'bg-amber-900 text-white' : 'bg-[#231F20] text-white'}`}>{p.turma || '—'}</span></td>
                                        <td className="px-6 py-4 text-xs font-bold text-zinc-600">{p.atendente || '—'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${isCritical ? 'bg-red-100 text-red-700 border border-red-200' : isWarning ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-zinc-100 text-zinc-500'
                                                }`}>
                                                {days === 0 ? 'Hoje' : `${days} dia${days > 1 ? 's' : ''}`}
                                            </span>
                                        </td>
                                        {isAdmin && <td className="px-6 py-4 text-right text-xs font-black text-[#E31E24]">R$ {(p.total_a_receber || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
                <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        {filteredPendentes.length} pendente(s){selectedVendor !== 'todos' && ` (filtrado de ${pendentes.length})`}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CobrancaManager;
