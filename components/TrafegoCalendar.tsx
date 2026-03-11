import React, { useState, useEffect, useMemo } from 'react';
import { Trafego, TrafegoInput, fetchTrafego, insertTrafego, updateTrafego, deleteTrafego } from '../services/trafegoService';
import { supabase } from '../services/supabaseClient';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Cell } from 'recharts';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Helper: get ISO week number
function getWeekNumber(d: Date): number {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Helper: get Monday of given week
function getWeekStart(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
}

function getWeekEnd(weekStart: Date): Date {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
}

function formatDateBR(d: Date): string {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Vendor colors palette
const VENDOR_COLORS = ['#E31E24', '#231F20', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1'];

interface EnrollmentRecord {
    id: number;
    aluno: string;
    pacote: string;
    turma: string;
    atendente: string | null;
    total_a_receber: number;
    total_recebido: number;
    data_matricula: string;
    created_at: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const mat = payload.find((p: any) => p.dataKey === 'matriculas')?.value || 0;
        const msg = payload.find((p: any) => p.dataKey === 'mensagens')?.value || 0;
        const conversion = msg > 0 ? ((mat / msg) * 100).toFixed(1) : '0.0';

        return (
            <div className="bg-[#231F20] border border-zinc-800 p-4 rounded-2xl shadow-2xl text-white outline-none">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#A1A1AA] mb-3 border-b border-zinc-800 pb-2">Dia {label}</p>
                <div className="space-y-2">
                    <p className="text-sm font-semibold flex justify-between items-center gap-6">
                        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#E31E24]"></span> Matrículas:</span>
                        <span className="font-black text-white">{mat}</span>
                    </p>
                    <p className="text-sm font-semibold flex justify-between items-center gap-6">
                        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#10B981]"></span> Mensagens (Tráfego):</span>
                        <span className="font-black text-white">{msg}</span>
                    </p>
                    {msg > 0 && (
                        <p className="text-xs font-semibold flex justify-between gap-6 pt-2 mt-2 border-t border-zinc-800">
                            <span className="text-[#A1A1AA]">Taxa de Conversão:</span>
                            <span className="font-black text-[#10B981]">{conversion}%</span>
                        </p>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

const TrafegoCalendar: React.FC = () => {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth());
    const [year, setYear] = useState(now.getFullYear());
    const [data, setData] = useState<Trafego[]>([]);
    const [allEnrollments, setAllEnrollments] = useState<EnrollmentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Trafego | null>(null);
    const [form, setForm] = useState<TrafegoInput>({ data: '', quantidade_mensagens: 0, observacao: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Date range filter
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');
    const [quickRange, setQuickRange] = useState<string>('month'); // 'week' | 'month' | 'custom'

    // Set initial date range to current month
    useEffect(() => {
        applyQuickRange('month');
    }, []);

    const applyQuickRange = (range: string) => {
        const today = new Date();
        if (range === 'week') {
            const ws = getWeekStart(today);
            const we = getWeekEnd(ws);
            setDateFrom(toDateStr(ws));
            setDateTo(toDateStr(we));
        } else if (range === 'month') {
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            setDateFrom(toDateStr(start));
            setDateTo(toDateStr(end));
        } else if (range === 'last4weeks') {
            const end = new Date(today);
            const start = new Date(today);
            start.setDate(start.getDate() - 27); // 4 weeks = 28 days
            setDateFrom(toDateStr(start));
            setDateTo(toDateStr(end));
        }
        setQuickRange(range);
    };

    const load = async () => {
        setLoading(true);
        try {
            const [trafegoData, enrollmentsData] = await Promise.all([
                fetchTrafego(month, year),
                supabase.from('enrollments')
                    .select('id, aluno, pacote, turma, atendente, total_a_receber, total_recebido, data_matricula, created_at')
                    .order('data_matricula', { ascending: true })
            ]);
            setData(trafegoData);
            setAllEnrollments((enrollmentsData.data || []) as EnrollmentRecord[]);
            setError(null);
        }
        catch (e: any) { setError(e.message); } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, [month, year]);

    // Filter enrollments by date range
    const filteredEnrollments = useMemo(() => {
        if (!dateFrom || !dateTo) return allEnrollments;
        return allEnrollments.filter(e => {
            const d = e.data_matricula;
            return d >= dateFrom && d <= dateTo;
        });
    }, [allEnrollments, dateFrom, dateTo]);

    // Weekly evolution data
    const weeklyData = useMemo(() => {
        if (filteredEnrollments.length === 0) return [];

        const weekMap: Record<string, { weekLabel: string; count: number; totalValue: number; weekStart: Date }> = {};

        filteredEnrollments.forEach(e => {
            const parts = e.data_matricula.split('-');
            const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            const ws = getWeekStart(d);
            const we = getWeekEnd(ws);
            const key = toDateStr(ws);
            const weekLabel = `${formatDateBR(ws)} - ${formatDateBR(we)}`;

            if (!weekMap[key]) {
                weekMap[key] = { weekLabel, count: 0, totalValue: 0, weekStart: ws };
            }
            weekMap[key].count++;
            weekMap[key].totalValue += e.total_a_receber || 0;
        });

        return Object.values(weekMap).sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
    }, [filteredEnrollments]);

    // Per-vendor breakdown
    const vendorData = useMemo(() => {
        const map: Record<string, { name: string; count: number; totalValue: number; totalReceived: number }> = {};

        filteredEnrollments.forEach(e => {
            const vendor = e.atendente || 'Não informado';
            if (!map[vendor]) map[vendor] = { name: vendor, count: 0, totalValue: 0, totalReceived: 0 };
            map[vendor].count++;
            map[vendor].totalValue += e.total_a_receber || 0;
            map[vendor].totalReceived += e.total_recebido || 0;
        });

        return Object.values(map).sort((a, b) => b.count - a.count);
    }, [filteredEnrollments]);

    // Vendor x Week chart data for stacked bar
    const vendorWeeklyChart = useMemo(() => {
        if (filteredEnrollments.length === 0) return [];

        const vendors = vendorData.map(v => v.name);
        const weekMap: Record<string, Record<string, number> & { weekLabel: string; weekStart: Date }> = {};

        filteredEnrollments.forEach(e => {
            const parts = e.data_matricula.split('-');
            const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            const ws = getWeekStart(d);
            const we = getWeekEnd(ws);
            const key = toDateStr(ws);
            const weekLabel = `${formatDateBR(ws)} - ${formatDateBR(we)}`;
            const vendor = e.atendente || 'Não informado';

            if (!weekMap[key]) {
                weekMap[key] = { weekLabel, weekStart: ws } as any;
                vendors.forEach(v => { (weekMap[key] as any)[v] = 0; });
            }
            (weekMap[key] as any)[vendor] = ((weekMap[key] as any)[vendor] || 0) + 1;
        });

        return Object.values(weekMap).sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
    }, [filteredEnrollments, vendorData]);

    // Calendar month data
    const enrollmentsForCalendar = useMemo(() => {
        return allEnrollments.filter(e => {
            const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
            return e.data_matricula?.startsWith(prefix);
        });
    }, [allEnrollments, month, year]);

    const dataMap = useMemo(() => {
        const m: Record<string, Trafego> = {};
        data.forEach(d => { m[d.data] = d; });
        return m;
    }, [data]);

    const calendarDays = useMemo(() => {
        const first = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0).getDate();
        const startDow = first.getDay();
        const cells: (number | null)[] = [];
        for (let i = 0; i < startDow; i++) cells.push(null);
        for (let d = 1; d <= lastDay; d++) cells.push(d);
        while (cells.length % 7 !== 0) cells.push(null);
        return cells;
    }, [month, year]);

    const chartData = useMemo(() => {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const result = [];
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const trafegoEntry = dataMap[dateStr];
            const matriculasCount = enrollmentsForCalendar.filter(e => e.data_matricula === dateStr).length;

            result.push({
                day: d,
                mensagens: trafegoEntry ? trafegoEntry.quantidade_mensagens : 0,
                matriculas: matriculasCount
            });
        }
        return result;
    }, [dataMap, enrollmentsForCalendar, month, year]);

    const totalMessages = data.reduce((s, d) => s + d.quantidade_mensagens, 0);
    const maxMessages = Math.max(...data.map(d => d.quantidade_mensagens), 1);

    const openDay = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const existing = dataMap[dateStr];
        if (existing) {
            setEditing(existing);
            setForm({ data: existing.data, quantidade_mensagens: existing.quantidade_mensagens, observacao: existing.observacao });
        } else {
            setEditing(null);
            setForm({ data: dateStr, quantidade_mensagens: 0, observacao: '' });
        }
        setModalOpen(true); setError(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); setError(null);
        try {
            if (editing) await updateTrafego(editing.id, form); else await insertTrafego(form);
            setModalOpen(false); setEditing(null); load();
        } catch (err: any) { setError(err.message); } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!editing) return;
        setSaving(true);
        try { await deleteTrafego(editing.id); setModalOpen(false); setEditing(null); load(); }
        catch (err: any) { setError(err.message); } finally { setSaving(false); }
    };

    const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
    const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

    const xIcon = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>;

    const vendorNames = vendorData.map(v => v.name);

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-4xl font-black text-[#231F20] dark:text-zinc-100 uppercase tracking-tighter italic leading-none">
                    <span className="text-[#E31E24]">Tráfego</span>
                </h2>
                <div className="flex items-center gap-4">
                    <div className="bg-white dark:bg-zinc-900 transition-colors rounded-2xl px-6 py-3 shadow-sm flex items-center gap-3">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Total Mês</span>
                        <span className="text-2xl font-black text-[#E31E24]">{totalMessages}</span>
                        <span className="text-[9px] font-black text-zinc-400 uppercase">msgs</span>
                    </div>
                </div>
            </header>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-xl text-sm font-bold">{error}</div>}

            {/* Calendar Section */}
            <div className="bg-white dark:bg-zinc-900 transition-colors rounded-[2rem] shadow-sm overflow-hidden">
                <div className="bg-[#231F20] text-white px-8 py-5 flex items-center justify-between">
                    <button onClick={prevMonth} className="p-2 hover:bg-white dark:bg-zinc-900 transition-colors/10 rounded-lg transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h3 className="text-lg font-black uppercase tracking-widest">{MONTHS[month]} {year}</h3>
                    <button onClick={nextMonth} className="p-2 hover:bg-white dark:bg-zinc-900 transition-colors/10 rounded-lg transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16"><div className="w-10 h-10 border-4 border-zinc-200 dark:border-zinc-700 transition-colors border-t-[#E31E24] rounded-full animate-spin"></div></div>
                ) : (
                    <div className="p-6">
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {DAYS.map(d => <div key={d} className="text-center text-[9px] font-black text-zinc-400 uppercase tracking-widest py-2">{d}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {calendarDays.map((day, idx) => {
                                if (day === null) return <div key={idx} className="aspect-square" />;
                                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const entry = dataMap[dateStr];
                                const msgs = entry?.quantidade_mensagens || 0;
                                const intensity = msgs > 0 ? Math.max(0.15, msgs / maxMessages) : 0;
                                const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
                                return (
                                    <button key={idx} onClick={() => openDay(day)}
                                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 hover:shadow-lg cursor-pointer border-2 ${isToday ? 'border-[#E31E24]' : 'border-transparent'} ${msgs > 0 ? 'shadow-sm' : 'hover:bg-zinc-50 dark:bg-zinc-950/50 transition-colors'}`}
                                        style={msgs > 0 ? { backgroundColor: `rgba(227, 30, 36, ${intensity})` } : {}}>
                                        <span className={`text-xs font-black ${msgs > 0 && intensity > 0.5 ? 'text-white' : 'text-[#231F20] dark:text-zinc-100'}`}>{day}</span>
                                        {msgs > 0 && <span className={`text-[10px] font-black ${intensity > 0.5 ? 'text-white' : 'text-[#E31E24]'}`}>{msgs}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Daily Chart */}
            <div className="bg-white dark:bg-zinc-900 transition-colors rounded-[2rem] shadow-sm p-8">
                <h3 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-6">Desempenho Diário: Conversões vs Matrículas</h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <defs>
                                <linearGradient id="colorMat" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#E31E24" stopOpacity={0.9} />
                                    <stop offset="95%" stopColor="#E31E24" stopOpacity={0.4} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke="#f3f4f6" vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6', opacity: 0.4 }} />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                            <Bar dataKey="matriculas" name="Matrículas" barSize={12} fill="url(#colorMat)" radius={[6, 6, 0, 0]} />
                            <Line type="monotone" dataKey="mensagens" name="Mensagens (Tráfego)" stroke="#10B981" strokeWidth={4} dot={false} activeDot={{ r: 6, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }} className="drop-shadow-md" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ━━━ EVOLUÇÃO SEMANAL ━━━ */}
            <div className="bg-white dark:bg-zinc-900 transition-colors rounded-[2rem] shadow-sm overflow-hidden">
                <div className="bg-[#231F20] text-white px-8 py-5 flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest">Evolução de Matrículas por Semana</h3>
                </div>

                {/* Date Range Filter */}
                <div className="px-8 py-5 border-b border-zinc-100 dark:border-zinc-800 transition-colors flex flex-col md:flex-row items-start md:items-center gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mr-1">Período:</span>
                        {[
                            { key: 'week', label: 'Esta Semana' },
                            { key: 'month', label: 'Este Mês' },
                            { key: 'last4weeks', label: 'Últimas 4 Semanas' },
                            { key: 'custom', label: 'Customizado' },
                        ].map(btn => (
                            <button
                                key={btn.key}
                                onClick={() => { if (btn.key !== 'custom') applyQuickRange(btn.key); else setQuickRange('custom'); }}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${quickRange === btn.key
                                    ? 'bg-[#E31E24] text-white shadow-md'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200'
                                    }`}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => { setDateFrom(e.target.value); setQuickRange('custom'); }}
                            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors text-xs font-bold text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#E31E24] focus:border-transparent"
                        />
                        <span className="text-zinc-400 text-xs font-bold">até</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => { setDateTo(e.target.value); setQuickRange('custom'); }}
                            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors text-xs font-bold text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#E31E24] focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="px-8 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-zinc-50 dark:bg-zinc-950/50 transition-colors rounded-xl p-4">
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Total Matrículas</p>
                        <p className="text-2xl font-black text-[#231F20] dark:text-zinc-100 mt-1">{filteredEnrollments.length}</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-950/50 transition-colors rounded-xl p-4">
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Valor Total</p>
                        <p className="text-2xl font-black text-[#E31E24] mt-1">R$ {filteredEnrollments.reduce((s, e) => s + (e.total_a_receber || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-950/50 transition-colors rounded-xl p-4">
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Semanas</p>
                        <p className="text-2xl font-black text-[#231F20] dark:text-zinc-100 mt-1">{weeklyData.length}</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-950/50 transition-colors rounded-xl p-4">
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Vendedores</p>
                        <p className="text-2xl font-black text-[#231F20] dark:text-zinc-100 mt-1">{vendorData.length}</p>
                    </div>
                </div>

                {/* Weekly Evolution Table */}
                {weeklyData.length > 0 && (
                    <div className="px-8 pb-6">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-zinc-50 dark:bg-zinc-950/50 transition-colors border-b border-zinc-200 dark:border-zinc-700 transition-colors">
                                    <th className="px-4 py-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Semana</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-center">Matrículas</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-right">Valor Total</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest w-1/3">Progresso</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const maxCount = Math.max(...weeklyData.map(w => w.count), 1);
                                    return weeklyData.map((w, i) => (
                                        <tr key={i} className={`border-t border-zinc-100 dark:border-zinc-800 transition-colors ${i % 2 ? 'bg-zinc-50 dark:bg-zinc-950/50 transition-colors/30' : ''}`}>
                                            <td className="px-4 py-3 text-xs font-bold text-[#231F20] dark:text-zinc-100">{w.weekLabel}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-block bg-[#E31E24] text-white text-[10px] font-black px-2.5 py-1 rounded-full min-w-[28px]">{w.count}</span>
                                            </td>
                                            <td className="px-4 py-3 text-xs font-black text-right text-zinc-600">R$ {w.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                            <td className="px-4 py-3">
                                                <div className="bg-zinc-100 dark:bg-zinc-800 transition-colors rounded-full h-5 overflow-hidden">
                                                    <div
                                                        className="bg-gradient-to-r from-[#E31E24] to-[#ff6b6b] h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                                                        style={{ width: `${Math.max((w.count / maxCount) * 100, 8)}%` }}
                                                    >
                                                        {w.count > 0 && <span className="text-white text-[8px] font-black">{w.count}</span>}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ));
                                })()}
                            </tbody>
                        </table>
                    </div>
                )}

                {weeklyData.length === 0 && !loading && (
                    <div className="px-8 pb-8 text-center py-12">
                        <p className="text-zinc-400 font-bold uppercase tracking-widest text-[10px]">Nenhuma matrícula no período selecionado</p>
                    </div>
                )}
            </div>

            {/* ━━━ VENDAS POR VENDEDOR ━━━ */}
            {vendorData.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 transition-colors rounded-[2rem] shadow-sm overflow-hidden">
                    <div className="bg-[#231F20] text-white px-8 py-5">
                        <h3 className="text-sm font-black uppercase tracking-widest">Vendas por Vendedor
                            <span className="text-zinc-400 text-[10px] font-bold normal-case tracking-normal ml-3">
                                {dateFrom && dateTo ? `${dateFrom.split('-').reverse().join('/')} — ${dateTo.split('-').reverse().join('/')}` : 'Todo período'}
                            </span>
                        </h3>
                    </div>

                    {/* Vendor Weekly Stacked Chart */}
                    {vendorWeeklyChart.length > 1 && vendorNames.length > 0 && (
                        <div className="px-8 pt-6">
                            <h4 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-4">Matrículas por Semana × Vendedor</h4>
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={vendorWeeklyChart} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                                        <CartesianGrid stroke="#f3f4f6" vertical={false} />
                                        <XAxis dataKey="weekLabel" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 9 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                            labelStyle={{ color: '#6b7280', fontWeight: 'bold', marginBottom: '5px' }}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                        {vendorNames.map((name, i) => (
                                            <Bar key={name} dataKey={name} stackId="a" fill={VENDOR_COLORS[i % VENDOR_COLORS.length]} radius={i === vendorNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Vendor Table */}
                    <div className="px-8 py-6">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-zinc-50 dark:bg-zinc-950/50 transition-colors border-b border-zinc-200 dark:border-zinc-700 transition-colors">
                                        <th className="px-4 py-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Vendedor</th>
                                        <th className="px-4 py-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-center">Matrículas</th>
                                        <th className="px-4 py-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-right">Valor Total</th>
                                        <th className="px-4 py-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-right">Recebido</th>
                                        <th className="px-4 py-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-center">% do Total</th>
                                        <th className="px-4 py-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest w-1/4">Participação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const totalAll = filteredEnrollments.length || 1;
                                        return vendorData.map((v, i) => (
                                            <tr key={v.name} className={`border-t border-zinc-100 dark:border-zinc-800 transition-colors hover:bg-zinc-50 dark:bg-zinc-950/50 transition-colors ${i % 2 ? 'bg-zinc-50 dark:bg-zinc-950/50 transition-colors/30' : ''}`}>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[9px] font-black" style={{ backgroundColor: VENDOR_COLORS[i % VENDOR_COLORS.length] }}>
                                                            {v.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                                        </div>
                                                        <span className="font-black text-sm text-[#231F20] dark:text-zinc-100">{v.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="inline-block bg-[#231F20] text-white text-[10px] font-black px-2.5 py-1 rounded-full min-w-[28px]">{v.count}</span>
                                                </td>
                                                <td className="px-4 py-3 text-xs font-black text-right text-zinc-600">R$ {v.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                <td className="px-4 py-3 text-xs font-black text-right text-green-600">R$ {v.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="text-xs font-black text-[#E31E24]">{((v.count / totalAll) * 100).toFixed(1)}%</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="bg-zinc-100 dark:bg-zinc-800 transition-colors rounded-full h-4 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-500"
                                                            style={{
                                                                width: `${(v.count / totalAll) * 100}%`,
                                                                backgroundColor: VENDOR_COLORS[i % VENDOR_COLORS.length]
                                                            }}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-4 bg-zinc-50 dark:bg-zinc-950/50 transition-colors border-t border-zinc-100 dark:border-zinc-800 transition-colors flex items-center justify-between">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                            {vendorData.length} vendedor(es) • {filteredEnrollments.length} matrícula(s) no período
                        </p>
                    </div>
                </div>
            )}

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
                    <div className="bg-white dark:bg-zinc-900 transition-colors rounded-3xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="bg-[#231F20] text-white px-8 py-6 rounded-t-3xl flex items-center justify-between">
                            <h2 className="text-lg font-black uppercase tracking-widest">{editing ? 'Editar' : 'Novo'} Registro</h2>
                            <button onClick={() => setModalOpen(false)} className="text-white/60 hover:text-white">{xIcon}</button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-5">
                            <div><label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Data</label>
                                <input type="date" required value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950/50 transition-colors border border-zinc-200 dark:border-zinc-700 transition-colors rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#E31E24]" /></div>
                            <div><label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Quantidade de Mensagens</label>
                                <input type="number" min="0" required value={form.quantidade_mensagens} onChange={e => setForm(f => ({ ...f, quantidade_mensagens: parseInt(e.target.value) || 0 }))} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950/50 transition-colors border border-zinc-200 dark:border-zinc-700 transition-colors rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#E31E24]" /></div>
                            <div><label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Observação</label>
                                <textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950/50 transition-colors border border-zinc-200 dark:border-zinc-700 transition-colors rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#E31E24] h-20 resize-none" /></div>
                            <div className="flex justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800 transition-colors">
                                {editing ? <button type="button" onClick={handleDelete} disabled={saving} className="px-6 py-3 bg-red-100 text-red-700 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-200 transition-all">Excluir</button> : <div />}
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className="px-6 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 font-black uppercase tracking-widest text-[10px] rounded-xl">Cancelar</button>
                                    <button type="submit" disabled={saving} className="px-8 py-3 bg-[#E31E24] text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar'}</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>)}
        </div>
    );
};
export default TrafegoCalendar;
