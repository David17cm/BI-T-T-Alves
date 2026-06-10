import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { fetchVendedores, Vendedor } from '../services/vendedoresService';
import WeeklyEvolutionChart from './WeeklyEvolutionChart';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { toJpeg } from 'html-to-image';
import { toast } from 'sonner';
import ExecutiveReportTemplate from './ExecutiveReportTemplate';

interface EnrollmentRow {
    id: number;
    aluno: string;
    pacote: string;
    turma: string;
    assinatura: string | null;
    total_a_receber: number;
    total_recebido: number;
    atendente: string | null;
    created_at?: string;
    data_matricula?: string | null;
}

interface Props { isAdmin?: boolean; }

type PeriodFilter = 'tudo' | 'mes_atual' | '30dias' | 'personalizado';

const DesempenhoManager: React.FC<Props> = ({ isAdmin = true }) => {
    const [allData, setAllData] = useState<EnrollmentRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
    const [vendedores, setVendedores] = useState<Vendedor[]>([]);
    const [totalTrafficMessages, setTotalTrafficMessages] = useState(0);
    const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('tudo');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [isPrinting, setIsPrinting] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    // Map vendedor name -> foto_url for quick lookup
    const vendorPhotos = useMemo(() => {
        const m: Record<string, string> = {};
        vendedores.forEach(v => { if (v.foto_url) m[v.nome] = v.foto_url; });
        return m;
    }, [vendedores]);

    // Calcula dateFrom e dateTo com base no filtro selecionado
    const getDateRange = useCallback((filter: PeriodFilter): { from?: string; to?: string } => {
        const today = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

        if (filter === 'mes_atual') {
            const from = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`;
            return { from, to: fmt(today) };
        }
        if (filter === '30dias') {
            const from = new Date(today); from.setDate(today.getDate() - 30);
            return { from: fmt(from), to: fmt(today) };
        }
        if (filter === 'personalizado') {
            return { from: customStart || undefined, to: customEnd || undefined };
        }
        return {};
    }, [customStart, customEnd]);

    const load = useCallback(async (filter: PeriodFilter = periodFilter) => {
        setLoading(true);
        try {
            const { from, to } = getDateRange(filter);
            let enrollQuery = supabase
                .from('enrollments')
                .select('id, aluno, pacote, turma, assinatura, total_a_receber, total_recebido, atendente, created_at, data_matricula')
                .neq('situacao', 'CANCELADO')
                .neq('situacao', 'Cancelado')
                .order('atendente');
            if (from) enrollQuery = enrollQuery.gte('data_matricula', from);
            if (to) enrollQuery = enrollQuery.lte('data_matricula', to);

            const [enrollRes, vendedoresData, trafegoRes] = await Promise.all([
                enrollQuery,
                fetchVendedores(),
                supabase.from('trafego').select('quantidade_mensagens'),
            ]);
            if (enrollRes.error) throw enrollRes.error;
            setAllData(enrollRes.data || []);
            setVendedores(vendedoresData);
            const totalMsgs = (trafegoRes.data || []).reduce((s: number, r: any) => s + (r.quantidade_mensagens || 0), 0);
            setTotalTrafficMessages(totalMsgs);
            setError(null);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, [getDateRange, periodFilter]);

    useEffect(() => {
        load(periodFilter);
        const channel = supabase
            .channel('enrollments-desempenho')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, () => load(periodFilter))
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [periodFilter]);

    // Group by vendor
    const vendorStats = useMemo(() => {
        const map: Record<string, EnrollmentRow[]> = {};
        allData.forEach(d => {
            const v = d.atendente || 'Não informado';
            if (!map[v]) map[v] = [];
            map[v].push(d);
        });
        return Object.entries(map)
            .map(([name, rows]) => {
                // Courses breakdown
                const courseMap: Record<string, number> = {};
                rows.forEach(r => {
                    const c = r.pacote || 'Outros';
                    courseMap[c] = (courseMap[c] || 0) + 1;
                });
                const courses = Object.entries(courseMap).sort((a, b) => b[1] - a[1]);

                // Signature stats
                const digital = rows.filter(r => r.assinatura === 'DIGITAL').length;
                const presencial = rows.filter(r => r.assinatura === 'PRESENCIAL').length;
                const pendente = rows.filter(r => !r.assinatura || r.assinatura === 'NENHUM').length;

                const totalValue = rows.reduce((s, r) => s + (r.total_a_receber || 0), 0);
                const totalReceived = rows.reduce((s, r) => s + (r.total_recebido || 0), 0);

                return {
                    name,
                    rows,
                    courses,
                    digital,
                    presencial,
                    pendente,
                    total: rows.length,
                    totalValue,
                    totalReceived
                };
            })
            .sort((a, b) => b.total - a.total);
    }, [allData]);

    // Totals
    const totals = useMemo(() => {
        const digital = allData.filter(r => r.assinatura === 'DIGITAL').length;
        const presencial = allData.filter(r => r.assinatura === 'PRESENCIAL').length;
        const pendente = allData.filter(r => !r.assinatura || r.assinatura === 'NENHUM').length;
        return { digital, presencial, pendente, total: allData.length };
    }, [allData]);

    const getEnrollmentDate = (e: any) => {
        if (e.data_matricula) {
            if (e.data_matricula.includes('/')) {
                const parts = e.data_matricula.split('/');
                return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            }
            if (e.data_matricula.includes('-')) {
                const parts = e.data_matricula.split('-');
                return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            }
            return new Date(e.data_matricula);
        }
        return new Date(e.created_at || new Date());
    };

    const weeklyEvolution = useMemo(() => {
        if (allData.length === 0) return [];
        const sorted = [...allData].sort((a, b) => getEnrollmentDate(a).getTime() - getEnrollmentDate(b).getTime());

        const firstDate = getEnrollmentDate(sorted[0]);
        const lastDate = getEnrollmentDate(sorted[sorted.length - 1]);

        // Encontra a segunda-feira da semana do primeiro dado
        const startDate = new Date(firstDate);
        startDate.setHours(0, 0, 0, 0);
        const dayOfWeek = startDate.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // recua até a segunda
        startDate.setDate(startDate.getDate() - daysToMonday);

        const endDate = new Date(lastDate);
        endDate.setHours(23, 59, 59, 999);

        const weeks: { week: string; fullLabel: string; count: number }[] = [];
        let currentStart = new Date(startDate);
        let safetyCounter = 0;
        const MAX_WEEKS = 150;

        while (currentStart <= endDate && safetyCounter < MAX_WEEKS) {
            // Semana: Segunda (currentStart) → Sábado (+5 dias)
            const currentEnd = new Date(currentStart);
            currentEnd.setDate(currentEnd.getDate() + 5);
            currentEnd.setHours(23, 59, 59, 999);

            const count = sorted.filter(e => {
                const d = getEnrollmentDate(e);
                return d >= currentStart && d <= currentEnd;
            }).length;

            const pad = (n: number) => String(n).padStart(2, '0');
            const fmt = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;

            if (count > 0) {
                weeks.push({
                    week: fmt(currentStart),                                   // Label do eixo X
                    fullLabel: `Seg ${fmt(currentStart)} → Sáb ${fmt(currentEnd)}`,  // Label do tooltip
                    count
                });
            }

            // Avança 7 dias para a próxima segunda-feira
            currentStart.setDate(currentStart.getDate() + 7);
            safetyCounter++;
        }

        return weeks;
    }, [allData]);

    // Exportar Relatório Executivo Avançado
    const exportPDF = async () => {
        if (!reportRef.current) return;
        setIsPrinting(true);
        const loadingId = toast.loading('Calculando Dossiê Executivo (Alta Resolução). Aguarde...', { duration: Infinity });

        try {
            // Renderiza com SVG nativo do navegador para suportar Tailwind v4 perfeitamente
            const dataUrl = await toJpeg(reportRef.current, {
                quality: 1.0,
                pixelRatio: 3,
                backgroundColor: '#ffffff',
                style: { margin: '0' }
            });

            // A4
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const props = pdf.getImageProperties(dataUrl);
            const pdfHeight = (props.height * pdfWidth) / props.width;

            pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Dossie_Executivo_TT_${new Date().toISOString().slice(0, 10)}.pdf`);
            toast.success('Dossiê Executivo gerado com sucesso!', { id: loadingId });
        } catch (err: any) {
            console.error(err);
            toast.error('Erro: ' + (err?.message || 'Falha ao renderizar PDF.'), { id: loadingId });
        } finally {
            setIsPrinting(false);
        }
    };

    // Exportar Excel
    const exportExcel = () => {
        const rows = vendorStats.map((v, i) => ({
            Posição: `${i + 1}º`,
            Vendedor: v.name,
            Matrículas: v.total,
            Presencial: v.presencial,
            Digital: v.digital,
            Pendente: v.pendente,
            ...(isAdmin ? { 'Valor Total (R$)': v.totalValue, 'Recebido (R$)': v.totalReceived } : {}),
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Desempenho');
        XLSX.writeFile(wb, `desempenho_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    if (loading) {
        // Skeleton Screen
        return (
            <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
                <div className="h-10 bg-zinc-200 rounded-2xl w-64" />
                <div className="h-8 bg-zinc-100 dark:bg-zinc-800 transition-colors rounded-xl w-48" />
                {/* Pódio skeleton */}
                <div className="bg-zinc-200 rounded-[2rem] h-72" />
                {/* Cards skeleton */}
                <div className="grid grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <div key={i} className="bg-zinc-200 rounded-2xl h-24" />)}
                </div>
                {/* Chart skeleton */}
                <div className="bg-zinc-200 rounded-[2rem] h-52" />
                {/* Vendor cards skeleton */}
                {[...Array(3)].map((_, i) => <div key={i} className="bg-zinc-200 rounded-[2rem] h-20" />)}
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <header className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-[#231F20] dark:text-zinc-100 uppercase tracking-tighter italic leading-none">
                        <span className="text-[#E31E24]">Desempenho</span> por Vendedor
                    </h2>
                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mt-2">
                        Matrículas por curso • Assinaturas de contratos
                    </p>
                </div>
                {/* Filtros de Período */}
                <div className="flex flex-col gap-2 items-start md:items-end w-full md:w-auto mt-4 md:mt-0">
                    <div className="flex flex-wrap gap-2">
                        {([['tudo', 'TUDO'], ['mes_atual', 'MÊS ATUAL'], ['30dias', '30 DIAS'], ['personalizado', 'PERSONALIZADO']] as [PeriodFilter, string][]).map(([id, label]) => (
                            <button key={id} onClick={() => setPeriodFilter(id)}
                                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${periodFilter === id ? 'bg-[#E31E24] text-white shadow' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                    {periodFilter === 'personalizado' && (
                        <div className="flex flex-wrap items-center gap-2 bg-zinc-50 dark:bg-zinc-950/50 transition-colors rounded-xl px-4 py-2 w-full md:w-auto">
                            <span className="text-[9px] font-black text-zinc-400 uppercase">De:</span>
                            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="border border-zinc-200 dark:border-zinc-700 transition-colors rounded-lg px-2 py-1 text-xs" />
                            <span className="text-[9px] font-black text-zinc-400 uppercase">Até:</span>
                            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="border border-zinc-200 dark:border-zinc-700 transition-colors rounded-lg px-2 py-1 text-xs" />
                            <button onClick={() => load('personalizado')} className="px-3 py-1 bg-[#E31E24] text-white text-[9px] font-black uppercase rounded-lg">OK</button>
                        </div>
                    )}
                    {/* Exportação */}
                    <div className="flex flex-wrap gap-2 mt-1 w-full md:w-auto">
                        <button onClick={exportPDF} disabled={isPrinting} className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#231F20] text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-zinc-700 transition-all flex-1 sm:flex-none disabled:opacity-50">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Exportar PDF
                        </button>
                        <button onClick={exportExcel} className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-700 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-green-800 transition-all flex-1 sm:flex-none">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                            Exportar Excel
                        </button>
                    </div>
                </div>
            </header>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-xl text-sm font-bold">{error}</div>}

            {/* 🏆 RANKING GAMIFICADO */}
            {vendorStats.length > 0 && (
                <div className="ranking-container bg-gradient-to-br from-[#231F20] via-[#2d2829] to-[#1a1617] rounded-[2rem] shadow-2xl overflow-hidden relative">
                    {/* Animated background particles */}
                    <div className="ranking-particles"></div>

                    <div className="px-8 pt-8 pb-4 relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="ranking-title-enter">
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">
                                    <span className="ranking-trophy-spin inline-block">🏆</span> Ranking <span className="text-[#FFF200] ranking-text-glow">Vendedores</span>
                                </h3>
                                <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                                    Classificação referente ao período: <span className="text-white">
                                        {periodFilter === 'tudo' ? 'Geral (Desde o Início)' :
                                            periodFilter === 'mes_atual' ? 'Neste Mês' :
                                                periodFilter === '30dias' ? 'Últimos 30 Dias' :
                                                    customStart && customEnd ? `De ${customStart.split('-').reverse().join('/')} até ${customEnd.split('-').reverse().join('/')}` : 'Personalizado'}
                                    </span>
                                </p>
                            </div>
                            {vendorStats.length > 0 && (
                                <div className="ranking-badge-pulse bg-gradient-to-r from-[#FFF200]/20 to-[#E31E24]/20 rounded-xl px-4 py-2 border border-[#FFF200]/20 self-start md:self-auto">
                                    <p className="text-[8px] font-black text-[#FFF200] uppercase tracking-widest">⭐ Destaque do Período</p>
                                    <p className="text-sm font-black text-white">{vendorStats[0].name}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Podium - Top 3 */}
                    {vendorStats.length >= 2 && (
                        <div className="flex items-end justify-center gap-3 px-8 pt-4 pb-2 relative z-10">
                            {/* 2nd Place */}
                            {vendorStats[1] && (
                                <div className="flex flex-col items-center flex-1 max-w-[200px] podium-entry" style={{ animationDelay: '0.3s' }}>
                                    {vendorPhotos[vendorStats[1].name] ? (
                                        <img src={vendorPhotos[vendorStats[1].name]} alt={vendorStats[1].name} className="podium-avatar-enter w-14 h-14 rounded-full object-cover shadow-lg border-2 border-zinc-300" style={{ animationDelay: '0.6s' }} />
                                    ) : (
                                        <div className="podium-avatar-enter w-14 h-14 rounded-full bg-gradient-to-br from-zinc-300 to-zinc-400 flex items-center justify-center text-[#231F20] dark:text-zinc-100 text-lg font-black shadow-lg border-2 border-zinc-300" style={{ animationDelay: '0.6s' }}>
                                            {vendorStats[1].name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    <p className="text-white font-black text-sm mt-2 truncate max-w-full text-center">{vendorStats[1].name}</p>
                                    <p className="text-zinc-500 text-[10px] font-bold">{vendorStats[1].total} matrículas</p>
                                    <div className="podium-bar-grow w-full bg-gradient-to-t from-zinc-600 to-zinc-500 rounded-t-xl mt-2 flex items-end justify-center" style={{ '--target-height': '80px', animationDelay: '0.4s' } as any}>
                                        <span className="text-3xl mb-2 podium-medal-bounce" style={{ animationDelay: '1s' }}>🥈</span>
                                    </div>
                                </div>
                            )}
                            {/* 1st Place */}
                            <div className="flex flex-col items-center flex-1 max-w-[220px] podium-entry" style={{ animationDelay: '0.1s' }}>
                                <div className="relative">
                                    <div className="champion-glow-ring">
                                        {vendorPhotos[vendorStats[0].name] ? (
                                            <img src={vendorPhotos[vendorStats[0].name]} alt={vendorStats[0].name} className="podium-avatar-enter w-[72px] h-[72px] rounded-full object-cover shadow-xl" style={{ animationDelay: '0.4s' }} />
                                        ) : (
                                            <div className="podium-avatar-enter w-[72px] h-[72px] rounded-full bg-gradient-to-br from-[#FFF200] to-[#E31E24] flex items-center justify-center text-[#231F20] dark:text-zinc-100 text-xl font-black shadow-xl" style={{ animationDelay: '0.4s' }}>
                                                {vendorStats[0].name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <span className="absolute -top-3 -right-3 text-2xl crown-float">👑</span>
                                </div>
                                <p className="text-[#FFF200] font-black text-base mt-2 truncate max-w-full text-center ranking-text-glow">{vendorStats[0].name}</p>
                                <p className="text-zinc-400 text-[10px] font-bold">{vendorStats[0].total} matrículas{isAdmin ? ` • R$ ${vendorStats[0].totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : ''}</p>
                                <div className="podium-bar-grow w-full bg-gradient-to-t from-[#E31E24] to-[#FFF200]/80 rounded-t-xl mt-2 flex items-end justify-center" style={{ '--target-height': '120px', animationDelay: '0.2s' } as any}>
                                    <span className="text-4xl mb-3 podium-medal-bounce" style={{ animationDelay: '0.8s' }}>🥇</span>
                                </div>
                            </div>
                            {/* 3rd Place */}
                            {vendorStats[2] && (
                                <div className="flex flex-col items-center flex-1 max-w-[200px] podium-entry" style={{ animationDelay: '0.5s' }}>
                                    {vendorPhotos[vendorStats[2].name] ? (
                                        <img src={vendorPhotos[vendorStats[2].name]} alt={vendorStats[2].name} className="podium-avatar-enter w-14 h-14 rounded-full object-cover shadow-lg border-2 border-amber-600" style={{ animationDelay: '0.8s' }} />
                                    ) : (
                                        <div className="podium-avatar-enter w-14 h-14 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white text-lg font-black shadow-lg border-2 border-amber-600" style={{ animationDelay: '0.8s' }}>
                                            {vendorStats[2].name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    <p className="text-white font-black text-sm mt-2 truncate max-w-full text-center">{vendorStats[2].name}</p>
                                    <p className="text-zinc-500 text-[10px] font-bold">{vendorStats[2].total} matrículas</p>
                                    <div className="podium-bar-grow w-full bg-gradient-to-t from-amber-800 to-amber-700 rounded-t-xl mt-2 flex items-end justify-center" style={{ '--target-height': '60px', animationDelay: '0.6s' } as any}>
                                        <span className="text-3xl mb-2 podium-medal-bounce" style={{ animationDelay: '1.2s' }}>🥉</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Traffic comparison header */}
                    {totalTrafficMessages > 0 && (
                        <div className="px-8 pt-4 relative z-10">
                            <div className="flex items-center gap-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                                <span>📊 Conversão: Matrículas vs Mensagens Tráfego</span>
                                <span className="text-zinc-600">({totalTrafficMessages.toLocaleString('pt-BR')} mensagens total)</span>
                            </div>
                        </div>
                    )}

                    {/* Leaderboard - All positions */}
                    <div className="px-8 py-6 space-y-2 relative z-10">
                        {vendorStats.map((vendor, i) => {
                            const barBase = totalTrafficMessages > 0 ? totalTrafficMessages : (vendorStats[0]?.total || 1);
                            const pct = Math.min((vendor.total / barBase) * 100, 100);
                            const conversionRate = totalTrafficMessages > 0 ? ((vendor.total / totalTrafficMessages) * 100).toFixed(1) : null;
                            const medals = ['🥇', '🥈', '🥉'];
                            const medal = medals[i] || `${i + 1}º`;
                            const bgColors = [
                                'from-[#FFF200]/20 to-[#E31E24]/10 border-[#FFF200]/30',
                                'from-zinc-300/10 to-zinc-400/10 border-zinc-400/20',
                                'from-amber-600/10 to-amber-800/10 border-amber-600/20',
                            ];
                            const bgColor = bgColors[i] || 'from-white/5 to-white/5 border-white/10';

                            return (
                                <div
                                    key={vendor.name}
                                    className={`leaderboard-row flex items-center gap-4 bg-gradient-to-r ${bgColor} border rounded-xl px-4 py-3 transition-all duration-300 hover:translate-x-1 hover:shadow-lg hover:shadow-white/5 ${i === 0 ? 'champion-row-shimmer' : ''}`}
                                    style={{ animationDelay: `${0.8 + i * 0.12}s` }}
                                >
                                    <span className={`text-xl w-10 text-center font-black ${i < 3 ? 'medal-wiggle' : ''}`} style={{ animationDelay: `${1.5 + i * 0.2}s` }}>
                                        {typeof medal === 'string' && medal.length > 3 ? <span className="text-zinc-500 text-sm">{medal}</span> : medal}
                                    </span>
                                    {vendorPhotos[vendor.name] ? (
                                        <img src={vendorPhotos[vendor.name]} alt={vendor.name} className={`w-10 h-10 rounded-full object-cover ${i === 0 ? 'champion-glow' : ''}`} />
                                    ) : (
                                        <div className={`w-10 h-10 rounded-full bg-white dark:bg-zinc-900 transition-colors/10 flex items-center justify-center text-white text-xs font-black ${i === 0 ? 'champion-glow' : ''}`}>
                                            {vendor.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-black text-white text-sm truncate">{vendor.name}</p>
                                            {i === 0 && <span className="text-[8px] bg-[#FFF200] text-[#231F20] dark:text-zinc-100 font-black px-2 py-0.5 rounded-full uppercase ranking-badge-pulse">Top Vendedor</span>}
                                            {vendor.total >= 10 && <span className="text-xs fire-flicker" title="10+ matrículas">🔥</span>}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                            <div className="flex-1 bg-white dark:bg-zinc-900 transition-colors/10 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full progress-bar-fill ${i === 0 ? 'bg-gradient-to-r from-[#FFF200] to-[#E31E24]' : i === 1 ? 'bg-zinc-400' : i === 2 ? 'bg-amber-600' : 'bg-white dark:bg-zinc-900 transition-colors/40'}`}
                                                    style={{ '--bar-width': `${pct}%`, animationDelay: `${1 + i * 0.15}s` } as any}
                                                ></div>
                                            </div>
                                            <span className="text-[10px] font-black text-zinc-400 w-24 text-right">
                                                {vendor.total} matr.{conversionRate && <span className="text-zinc-600"> ({conversionRate}%)</span>}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right hidden md:block">
                                        {isAdmin && <p className="text-xs font-black text-white">R$ {vendor.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>}
                                        <p className="text-[9px] font-bold text-zinc-500">Top: {vendor.courses[0]?.[0] || '-'}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <style>{`
                /* === PODIUM ANIMATIONS === */
                .podium-entry {
                    will-change: opacity, transform;
                    animation: fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
                }
                .podium-bar-grow {
                    height: 0;
                    animation: growBar 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both;
                }
                @keyframes growBar {
                    from { height: 0; }
                    to { height: var(--target-height); }
                }
                .podium-avatar-enter {
                    animation: avatarPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
                }
                @keyframes avatarPop {
                    from { transform: scale(0) rotate(-180deg); opacity: 0; }
                    to { transform: scale(1) rotate(0deg); opacity: 1; }
                }
                .podium-medal-bounce {
                    display: inline-block;
                    animation: medalDrop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
                }
                @keyframes medalDrop {
                    from { transform: translateY(-30px) scale(0); opacity: 0; }
                    50% { transform: translateY(5px) scale(1.3); opacity: 1; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }

                /* === CROWN === */
                .crown-float {
                    display: inline-block;
                    animation: crownFloat 2s ease-in-out infinite, crownEnter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both;
                }
                @keyframes crownFloat {
                    0%, 100% { transform: translateY(0) rotate(-5deg); }
                    50% { transform: translateY(-6px) rotate(5deg); }
                }
                @keyframes crownEnter {
                    from { transform: translateY(-40px) scale(0); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }

                /* === CHAMPION GLOW === */
                .champion-glow {
                    animation: championGlow 2s ease-in-out infinite alternate;
                }
                @keyframes championGlow {
                    from { box-shadow: 0 0 10px rgba(255, 242, 0, 0.3), 0 0 20px rgba(227, 30, 36, 0.1); }
                    to { box-shadow: 0 0 25px rgba(255, 242, 0, 0.7), 0 0 50px rgba(227, 30, 36, 0.4), 0 0 80px rgba(255, 242, 0, 0.15); }
                }

                /* Glowing ring around #1 avatar on podium */
                .champion-glow-ring {
                    position: relative;
                    display: inline-block;
                    border-radius: 9999px;
                    padding: 4px;
                    background: conic-gradient(from var(--glow-angle, 0deg), #FFF200, #E31E24, #FFF200, #E31E24, #FFF200);
                    animation: glowRingSpin 3s linear infinite, glowRingPulse 2s ease-in-out infinite alternate;
                    box-shadow: 0 0 20px rgba(255, 242, 0, 0.5), 0 0 40px rgba(227, 30, 36, 0.3), 0 0 60px rgba(255, 242, 0, 0.15);
                }
                @property --glow-angle {
                    syntax: '<angle>';
                    initial-value: 0deg;
                    inherits: false;
                }
                @keyframes glowRingSpin {
                    to { --glow-angle: 360deg; }
                }
                @keyframes glowRingPulse {
                    from { box-shadow: 0 0 15px rgba(255, 242, 0, 0.4), 0 0 30px rgba(227, 30, 36, 0.2); }
                    to { box-shadow: 0 0 30px rgba(255, 242, 0, 0.8), 0 0 60px rgba(227, 30, 36, 0.5), 0 0 90px rgba(255, 242, 0, 0.2); }
                }

                /* Shimmer effect on #1 leaderboard row */
                .champion-row-shimmer {
                    position: relative;
                    overflow: hidden;
                    animation: rowGlow 2.5s ease-in-out infinite alternate;
                }
                .champion-row-shimmer::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 50%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 242, 0, 0.12), rgba(255, 255, 255, 0.15), rgba(255, 242, 0, 0.12), transparent);
                    animation: shimmerSweep 3s ease-in-out infinite;
                    pointer-events: none;
                    z-index: 1;
                }
                @keyframes shimmerSweep {
                    0% { left: -100%; }
                    100% { left: 200%; }
                }
                @keyframes rowGlow {
                    from { box-shadow: inset 0 0 20px rgba(255, 242, 0, 0.08), 0 0 10px rgba(255, 242, 0, 0.05); }
                    to { box-shadow: inset 0 0 30px rgba(255, 242, 0, 0.15), 0 0 20px rgba(255, 242, 0, 0.1); }
                }

                /* === LEADERBOARD === */
                .leaderboard-row {
                    will-change: opacity, transform;
                    animation: slideInLeft 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
                }
                @keyframes slideInLeft {
                    from { transform: translateX(-40px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }

                /* === PROGRESS BAR === */
                .progress-bar-fill {
                    width: 0;
                    animation: fillBar 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
                }
                @keyframes fillBar {
                    from { width: 0; }
                    to { width: var(--bar-width); }
                }

                /* === MEDAL WIGGLE === */
                .medal-wiggle {
                    display: inline-block;
                    animation: wiggle 0.6s ease-in-out both;
                }
                @keyframes wiggle {
                    0% { transform: rotate(0); }
                    20% { transform: rotate(-15deg); }
                    40% { transform: rotate(12deg); }
                    60% { transform: rotate(-8deg); }
                    80% { transform: rotate(5deg); }
                    100% { transform: rotate(0); }
                }

                /* === FIRE FLICKER === */
                .fire-flicker {
                    display: inline-block;
                    animation: flicker 0.8s ease-in-out infinite alternate;
                }
                @keyframes flicker {
                    from { transform: scale(1); filter: brightness(1); }
                    to { transform: scale(1.2); filter: brightness(1.3); }
                }

                /* === TITLE === */
                .ranking-title-enter {
                    animation: fadeInUp 0.5s ease-out both;
                }
                .ranking-trophy-spin {
                    animation: trophySpin 1s cubic-bezier(0.34, 1.56, 0.64, 1) both;
                }
                @keyframes trophySpin {
                    from { transform: rotate(-30deg) scale(0); }
                    to { transform: rotate(0) scale(1); }
                }
                .ranking-text-glow {
                    animation: textGlow 2s ease-in-out infinite alternate;
                }
                @keyframes textGlow {
                    from { text-shadow: 0 0 5px rgba(255, 242, 0, 0.3); }
                    to { text-shadow: 0 0 15px rgba(255, 242, 0, 0.6), 0 0 30px rgba(255, 242, 0, 0.2); }
                }

                /* === BADGE PULSE === */
                .ranking-badge-pulse {
                    animation: badgePulse 2s ease-in-out infinite;
                }
                @keyframes badgePulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }

                /* === GENERAL === */
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* === BACKGROUND PARTICLES === */
                .ranking-particles {
                    position: absolute; inset: 0; overflow: hidden; pointer-events: none;
                }
                .ranking-particles::before, .ranking-particles::after {
                    content: ''; position: absolute; width: 4px; height: 4px; border-radius: 50%;
                    background: rgba(255, 242, 0, 0.15);
                    animation: particleFloat 6s ease-in-out infinite;
                }
                .ranking-particles::before { top: 20%; left: 10%; animation-delay: 0s; }
                .ranking-particles::after { top: 60%; right: 15%; animation-delay: 3s; background: rgba(227, 30, 36, 0.15); }
                @keyframes particleFloat {
                    0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
                    50% { transform: translateY(-30px) scale(1.5); opacity: 0.8; }
                }
            `}</style>

            {/* Global Signature Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-zinc-900 transition-colors rounded-2xl p-6 shadow-sm">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Total Contratos</p>
                    <p className="text-3xl font-black text-[#231F20] dark:text-zinc-100 mt-1">{totals.total}</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 transition-colors rounded-2xl p-6 shadow-sm border-l-4 border-green-500">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Presencial</p>
                    <p className="text-3xl font-black text-green-600 mt-1">{totals.presencial}</p>
                    <p className="text-[9px] font-bold text-zinc-400 mt-1">{totals.total > 0 ? ((totals.presencial / totals.total) * 100).toFixed(1) : 0}%</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 transition-colors rounded-2xl p-6 shadow-sm border-l-4 border-blue-500">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Digital</p>
                    <p className="text-3xl font-black text-blue-600 mt-1">{totals.digital}</p>
                    <p className="text-[9px] font-bold text-zinc-400 mt-1">{totals.total > 0 ? ((totals.digital / totals.total) * 100).toFixed(1) : 0}%</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 transition-colors rounded-2xl p-6 shadow-sm border-l-4 border-[#E31E24]">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Pendente</p>
                    <p className="text-3xl font-black text-[#E31E24] mt-1">{totals.pendente}</p>
                    <p className="text-[9px] font-bold text-zinc-400 mt-1">{totals.total > 0 ? ((totals.pendente / totals.total) * 100).toFixed(1) : 0}%</p>
                </div>
            </div>

            {/* Evolução Semanal Integrada */}
            <div className="mb-8 bg-white dark:bg-zinc-900 transition-colors p-6 md:p-8 rounded-[3rem] shadow-sm border border-zinc-100 dark:border-zinc-800 transition-colors">
                <div className="mb-4 px-2 pb-4 border-b border-zinc-100 dark:border-zinc-800 transition-colors">
                    <h3 className="text-base font-black text-[#231F20] dark:text-zinc-100 uppercase tracking-tighter italic">
                        📈 Evolução Semanal de Matrículas
                    </h3>
                    <p className="text-zinc-400 text-[9px] font-bold uppercase tracking-widest mt-1">
                        Período: <span className="text-[#E31E24] font-black">
                            {periodFilter === 'tudo' ? 'Geral (Desde o Início)' :
                                periodFilter === 'mes_atual' ? 'Neste Mês' :
                                    periodFilter === '30dias' ? 'Últimos 30 Dias' :
                                        customStart && customEnd ? `De ${customStart.split('-').reverse().join('/')} até ${customEnd.split('-').reverse().join('/')}` : 'Personalizado'}
                        </span>
                    </p>
                </div>
                <WeeklyEvolutionChart data={weeklyEvolution} />
            </div>

            {/* Per-Vendor Cards */}
            <div className="space-y-4">
                {vendorStats.map((vendor, vi) => {
                    const isExpanded = expandedVendor === vendor.name;
                    const sigTotal = vendor.total || 1;
                    const presencialPct = (vendor.presencial / sigTotal) * 100;
                    const digitalPct = (vendor.digital / sigTotal) * 100;
                    const pendentePct = (vendor.pendente / sigTotal) * 100;

                    return (
                        <div key={vendor.name} className="bg-white dark:bg-zinc-900 transition-colors rounded-[2rem] shadow-sm overflow-hidden">
                            {/* Vendor Header - clickable */}
                            <button
                                onClick={() => setExpandedVendor(isExpanded ? null : vendor.name)}
                                className="w-full px-8 py-6 flex items-center justify-between hover:bg-zinc-50 dark:bg-zinc-950/50 /50 transition-colors transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-[#231F20] flex items-center justify-center text-white text-sm font-black shadow-lg">
                                        {vendor.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="text-left">
                                        <p className="font-black text-lg text-[#231F20] dark:text-zinc-100">{vendor.name}</p>
                                        <p className="text-[10px] text-zinc-400 font-bold">{vendor.total} matrícula{vendor.total !== 1 ? 's' : ''} • {vendor.courses.length} curso{vendor.courses.length !== 1 ? 's' : ''}</p>
                                        {vendor.courses.length > 0 && (
                                            <p className="text-[10px] font-bold mt-0.5">
                                                <span className="text-zinc-400">Top: </span>
                                                <span className="text-[#E31E24]">{vendor.courses[0][0]}</span>
                                                <span className="text-zinc-400"> ({vendor.courses[0][1]})</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {/* Mini signature badges */}
                                    <div className="hidden md:flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[9px] font-black px-2.5 py-1 rounded-full">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                            {vendor.presencial}
                                        </span>
                                        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-[9px] font-black px-2.5 py-1 rounded-full">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                            {vendor.digital}
                                        </span>
                                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-[9px] font-black px-2.5 py-1 rounded-full">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                            {vendor.pendente}
                                        </span>
                                    </div>
                                    <svg className={`w-5 h-5 text-zinc-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                </div>
                            </button>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="border-t border-zinc-100 dark:border-zinc-800 transition-colors">
                                    {/* Courses breakdown */}
                                    <div className="px-8 py-6">
                                        <h4 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-4">Matrículas por Curso</h4>
                                        <div className="space-y-3">
                                            {vendor.courses.map(([curso, count]) => {
                                                const pct = (count / vendor.total) * 100;
                                                return (
                                                    <div key={curso} className="flex items-center gap-4">
                                                        <span className="w-40 text-xs font-bold text-[#231F20] dark:text-zinc-100 truncate" title={curso}>{curso}</span>
                                                        <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 transition-colors rounded-full h-6 overflow-hidden">
                                                            <div
                                                                className="bg-[#231F20] h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                                                                style={{ width: `${Math.max(pct, 8)}%` }}
                                                            >
                                                                <span className="text-white text-[9px] font-black">{count}</span>
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-black text-zinc-400 w-12 text-right">{pct.toFixed(0)}%</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Signature Stats */}
                                    <div className="px-8 py-6 bg-zinc-50 dark:bg-zinc-950/50 /50 transition-colors border-t border-zinc-100 dark:border-zinc-800 transition-colors">
                                        <h4 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-4">Contratos Assinados</h4>
                                        <div className="grid grid-cols-3 gap-4 mb-4">
                                            <div className="bg-white dark:bg-zinc-900 transition-colors rounded-xl p-4 border border-green-100">
                                                <p className="text-[9px] font-black text-green-600 uppercase tracking-widest">Presencial</p>
                                                <p className="text-2xl font-black text-green-600 mt-1">{vendor.presencial}</p>
                                                <p className="text-[9px] font-bold text-zinc-400">{presencialPct.toFixed(1)}%</p>
                                            </div>
                                            <div className="bg-white dark:bg-zinc-900 transition-colors rounded-xl p-4 border border-blue-100">
                                                <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Digital</p>
                                                <p className="text-2xl font-black text-blue-600 mt-1">{vendor.digital}</p>
                                                <p className="text-[9px] font-bold text-zinc-400">{digitalPct.toFixed(1)}%</p>
                                            </div>
                                            <div className="bg-white dark:bg-zinc-900 transition-colors rounded-xl p-4 border border-red-100">
                                                <p className="text-[9px] font-black text-[#E31E24] uppercase tracking-widest">Pendente</p>
                                                <p className="text-2xl font-black text-[#E31E24] mt-1">{vendor.pendente}</p>
                                                <p className="text-[9px] font-bold text-zinc-400">{pendentePct.toFixed(1)}%</p>
                                            </div>
                                        </div>
                                        {/* Stacked bar */}
                                        <div className="bg-zinc-200 rounded-full h-5 overflow-hidden flex w-full">
                                            {vendor.presencial > 0 && (
                                                <div className="bg-green-500 h-full flex items-center justify-center transition-all duration-500 border-r border-[#231F20]/10 last:border-r-0"
                                                    style={{ width: `${Math.max(presencialPct, 2)}%` }}>
                                                    {presencialPct > 10 && <span className="text-white text-[9px] font-black leading-none">{vendor.presencial}</span>}
                                                </div>
                                            )}
                                            {vendor.digital > 0 && (
                                                <div className="bg-blue-500 h-full flex items-center justify-center transition-all duration-500 border-r border-[#231F20]/10 last:border-r-0"
                                                    style={{ width: `${Math.max(digitalPct, 2)}%` }}>
                                                    {digitalPct > 10 && <span className="text-white text-[9px] font-black leading-none">{vendor.digital}</span>}
                                                </div>
                                            )}
                                            {vendor.pendente > 0 && (
                                                <div className="bg-[#E31E24] h-full flex items-center justify-center transition-all duration-500"
                                                    style={{ width: `${Math.max(pendentePct, 2)}%` }}>
                                                    {pendentePct > 10 && <span className="text-white text-[9px] font-black leading-none">{vendor.pendente}</span>}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-6 mt-4">
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm"></span>
                                                <span className="text-[9px] font-bold text-zinc-500 tracking-wide">Presencial</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm"></span>
                                                <span className="text-[9px] font-bold text-zinc-500 tracking-wide">Digital</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2.5 h-2.5 rounded-full bg-[#E31E24] shadow-sm"></span>
                                                <span className="text-[9px] font-bold text-zinc-500 tracking-wide">Pendente</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Values summary — somente admin */}
                                    {isAdmin && (
                                        <div className="px-8 py-4 bg-[#231F20] flex items-center justify-between">
                                            <div>
                                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Valor Total</p>
                                                <p className="text-lg font-black text-white">R$ {vendor.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Recebido</p>
                                                <p className="text-lg font-black text-green-400">R$ {vendor.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {vendorStats.length === 0 && (
                <div className="bg-white dark:bg-zinc-900 transition-colors rounded-[2rem] shadow-sm p-16 text-center">
                    <p className="text-zinc-400 font-bold uppercase tracking-widest text-[10px]">Nenhum dado encontrado</p>
                </div>
            )}
            {/* Motor de Referência Oculto para Impressão PDF */}
            <div className="fixed opacity-0 pointer-events-none top-0 left-0 -z-50 w-[210mm]">
                <ExecutiveReportTemplate
                    ref={reportRef}
                    data={allData}
                    vendorStats={vendorStats}
                    periodLabel={
                        periodFilter === 'tudo' ? 'Geral (Desde o Início)' :
                            periodFilter === 'mes_atual' ? 'Mês Atual' :
                                periodFilter === '30dias' ? 'Últimos 30 Dias' :
                                    `De ${customStart.split('-').reverse().join('/')} até ${customEnd.split('-').reverse().join('/')}`
                    }
                />
            </div>
        </div>
    );
};

export default DesempenhoManager;
