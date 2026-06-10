import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import WeeklyEvolutionChart from './WeeklyEvolutionChart';
import VendorTable from './ReportAM/VendorTable';
import CoursesTable from './ReportAM/CoursesTable';
import ReportAMTemplate from './ReportAMTemplate';
import { toJpeg } from 'html-to-image';
import { toast } from 'sonner';

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
    data_matricula?: string | null;
}

const ReportAM: React.FC = () => {
    const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const reportRef = React.useRef<HTMLDivElement>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('enrollments')
                .select('id, aluno, pacote, turma, assinatura, total_a_receber, total_recebido, atendente, created_at, data_matricula')
                .neq('situacao', 'CANCELADO')
                .neq('situacao', 'Cancelado')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setEnrollments(data || []);
            setError(null);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    // ============================================
    // FILTER: ALL TIME
    // ============================================
    // Helper to get date object
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
        return new Date(e.created_at);
    };

    const filteredEnrollments = useMemo(() => {
        return enrollments; // Removes the 2026 strict filter to match Dashboard
    }, [enrollments]);

    // ============================================
    // REPORT DATA: General Summary
    // ============================================
    const summary = useMemo(() => {
        const data = filteredEnrollments;
        const total = data.length;
        const totalReceive = data.reduce((s, r) => s + (r.total_a_receber || 0), 0);
        const totalReceived = data.reduce((s, r) => s + (r.total_recebido || 0), 0);
        const pending = totalReceive - totalReceived;
        const digital = data.filter(r => r.assinatura === 'DIGITAL').length;
        const presencial = data.filter(r => r.assinatura === 'PRESENCIAL').length;
        const pendenteSig = data.filter(r => !r.assinatura || r.assinatura === 'NENHUM').length;

        // By course
        const courseMap: Record<string, { count: number; value: number }> = {};
        data.forEach(r => {
            const c = r.pacote || 'Outros';
            if (!courseMap[c]) courseMap[c] = { count: 0, value: 0 };
            courseMap[c].count++;
            courseMap[c].value += (r.total_a_receber || 0);
        });
        const courses = Object.entries(courseMap).sort((a, b) => b[1].count - a[1].count);

        return { total, totalReceive, totalReceived, pending, digital, presencial, pendenteSig, courses };
    }, [filteredEnrollments]);

    // ============================================
    // REPORT DATA: Weekly Evolution
    // ============================================
    const weeklyEvolution = useMemo(() => {
        if (filteredEnrollments.length === 0) return [];

        const sorted = [...filteredEnrollments].sort((a, b) => getEnrollmentDate(a).getTime() - getEnrollmentDate(b).getTime());

        const firstDate = getEnrollmentDate(sorted[0]);
        const lastDate = getEnrollmentDate(sorted[sorted.length - 1]);

        // Encontra a segunda-feira da semana do primeiro dado
        const startDate = new Date(firstDate);
        startDate.setHours(0, 0, 0, 0);
        const dayOfWeek = startDate.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate.setDate(startDate.getDate() - daysToMonday);

        const endDate = new Date(lastDate);
        endDate.setHours(23, 59, 59, 999);

        const weeks: { week: string; fullLabel: string; count: number }[] = [];
        let currentStart = new Date(startDate);
        const MAX_WEEKS = 150;
        let safetyCounter = 0;

        while (currentStart <= endDate && safetyCounter < MAX_WEEKS) {
            // Semana: Segunda → Sábado (+5 dias)
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
                    week: fmt(currentStart),
                    fullLabel: `Seg ${fmt(currentStart)} → Sáb ${fmt(currentEnd)}`,
                    count
                });
            }

            // Avança 7 dias para a próxima segunda-feira
            currentStart.setDate(currentStart.getDate() + 7);
            safetyCounter++;
        }

        return weeks;
    }, [filteredEnrollments]);

    // ============================================
    // REPORT DATA: Vendor Performance
    // ============================================
    const vendorPerformance = useMemo(() => {
        const map: Record<string, EnrollmentRow[]> = {};
        filteredEnrollments.forEach(r => {
            const v = r.atendente || 'Não informado';
            if (!map[v]) map[v] = [];
            map[v].push(r);
        });
        return Object.entries(map)
            .map(([name, rows]) => ({
                name,
                total: rows.length,
                totalValue: rows.reduce((s, r) => s + (r.total_a_receber || 0), 0),
                totalReceived: rows.reduce((s, r) => s + (r.total_recebido || 0), 0),
                digital: rows.filter(r => r.assinatura === 'DIGITAL').length,
                presencial: rows.filter(r => r.assinatura === 'PRESENCIAL').length,
                pendente: rows.filter(r => !r.assinatura || r.assinatura === 'NENHUM').length,
                conversionRate: rows.length > 0 ? ((rows.reduce((s, r) => s + (r.total_recebido || 0), 0) / rows.reduce((s, r) => s + (r.total_a_receber || 0), 0)) * 100) || 0 : 0,
            }))
            .sort((a, b) => b.total - a.total);
    }, [filteredEnrollments]);

    // ============================================
    // PDF EXPORT (High Resolution Render)
    // ============================================
    const exportPDF = useCallback(async () => {
        if (!reportRef.current) return;
        setGenerating(true);
        const loadingId = toast.loading('Calculando Report AM (Alta Resolução). Aguarde...', { duration: Infinity });

        try {
            // Renderiza com SVG nativo do navegador para suportar Tailwind v4 perfeitamente
            const dataUrl = await toJpeg(reportRef.current, {
                quality: 1.0,
                pixelRatio: 2,
                backgroundColor: '#ffffff',
                width: reportRef.current.scrollWidth,
                height: reportRef.current.scrollHeight,
                style: { margin: '0' }
            });

            const dateStr = new Date().toLocaleDateString('pt-BR');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const props = pdf.getImageProperties(dataUrl);
            const pdfHeight = (props.height * pdfWidth) / props.width;

            pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Report_AM_${dateStr.replace(/\//g, '-')}.pdf`);
            toast.success('Report gerado com sucesso!', { id: loadingId });
        } catch (e: any) {
            console.error('Erro ao gerar PDF:', e);
            toast.error('Erro: ' + (e?.message || 'Falha ao renderizar PDF.'), { id: loadingId });
        } finally {
            setGenerating(false);
        }
    }, [summary, vendorPerformance, weeklyEvolution]);

    // ============================================
    // EXCEL EXPORT
    // ============================================
    const exportExcel = useCallback(() => {
        setGenerating(true);
        try {
            const wb = XLSX.utils.book_new();
            const reportTitle = `Relatório Geral`;
            const dateStr = new Date().toLocaleDateString('pt-BR');

            // Summary sheet
            const summaryData = [
                [reportTitle.toUpperCase()],
                [],
                ['Indicador', 'Valor'],
                ['Total de Matrículas', summary.total],
                ['Total a Receber', summary.totalReceive],
                ['Total Recebido', summary.totalReceived],
                ['Pendente', summary.pending],
                ['Assinatura Digital', summary.digital],
                ['Assinatura Presencial', summary.presencial],
                ['Assinatura Pendente', summary.pendenteSig],
                [],
                ['EVOLUÇÃO SEMANAL'],
                ['Semana', 'Matrículas'],
                ...weeklyEvolution.map(w => [w.fullLabel, w.count]),
                [],
                ['DESEMPENHO POR VENDEDOR'],
                ['Vendedor', 'Matrículas', 'Valor Total', 'Recebido', '% Recebido', 'Digital', 'Presencial', 'Pendente'],
                ...vendorPerformance.map(v => [
                    v.name, v.total, v.totalValue, v.totalReceived,
                    `${v.conversionRate.toFixed(1)}%`, v.digital, v.presencial, v.pendente,
                ]),
                [],
                ['MATRÍCULAS POR CURSO'],
                ['Curso', 'Matrículas', 'Valor Total'],
                ...summary.courses.map(([name, data]) => [name, data.count, data.value]),
            ];
            const ws = XLSX.utils.aoa_to_sheet(summaryData);
            ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, ws, 'Resumo Geral');

            XLSX.writeFile(wb, `report_am_geral_${dateStr.replace(/\//g, '-')}.xlsx`);
        } catch (e: any) {
            console.error('Erro ao gerar Excel:', e);
        }
        setGenerating(false);
    }, [summary, vendorPerformance, weeklyEvolution]);

    // ============================================
    // RENDER
    // ============================================
    const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto flex items-center justify-center py-32">
                <div className="w-10 h-10 border-4 border-zinc-200 dark:border-zinc-700 transition-colors border-t-[#E31E24] rounded-full animate-spin"></div>
            </div>
        );
    }

    const reportTitle = "Relatório Geral";

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-black text-[#231F20] dark:text-zinc-100 uppercase tracking-tighter italic leading-none">
                        Report <span className="text-[#E31E24]">AM</span>
                    </h2>
                    <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                        Relatórios Exportáveis • PDF & Excel
                    </p>
                </div>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-xl text-sm font-bold">{error}</div>}

            {/* Export Buttons */}
            <div className="flex items-center gap-3">
                <button
                    onClick={exportPDF}
                    disabled={generating}
                    className="group flex items-center gap-3 bg-gradient-to-r from-[#E31E24] to-[#c41920] text-white font-black uppercase tracking-widest text-[10px] px-6 py-3.5 rounded-xl hover:shadow-lg hover:shadow-[#E31E24]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {generating ? 'Gerando...' : 'Exportar PDF'}
                </button>
                <button
                    onClick={exportExcel}
                    disabled={generating}
                    className="group flex items-center gap-3 bg-gradient-to-r from-[#1D6F42] to-[#166534] text-white font-black uppercase tracking-widest text-[10px] px-6 py-3.5 rounded-xl hover:shadow-lg hover:shadow-green-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {generating ? 'Gerando...' : 'Exportar Excel'}
                </button>
            </div>

            {/* Report Preview */}
            <div className="bg-white dark:bg-zinc-900 transition-colors rounded-3xl shadow-xl border border-zinc-100 dark:border-zinc-800 transition-colors overflow-hidden">
                {/* Report Header */}
                <div className="bg-gradient-to-r from-[#231F20] to-[#2d2829] px-8 py-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">
                                {reportTitle}
                            </h3>
                            <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest mt-1">
                                {filteredEnrollments.length} matrículas no período
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[#FFF200] text-3xl font-black italic">{filteredEnrollments.length}</p>
                            <p className="text-zinc-500 text-[8px] font-bold uppercase">matrículas totais</p>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-8 report-content-enter">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { label: 'Total Matrículas', value: summary.total, color: 'from-[#E31E24] to-[#c41920]' },
                            { label: 'A Receber', value: fmt(summary.totalReceive), color: 'from-[#231F20] to-[#2d2829]' },
                            { label: 'Recebido', value: fmt(summary.totalReceived), color: 'from-green-600 to-green-700' },
                        ].map((kpi, i) => (
                            <div key={i} className={`bg-gradient-to-br ${kpi.color} rounded-2xl p-5 text-white shadow-lg`}>
                                <p className="text-[8px] font-black uppercase tracking-widest opacity-70">{kpi.label}</p>
                                <p className="text-xl font-black mt-1">{kpi.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Weekly Evolution Chart */}
                    <WeeklyEvolutionChart data={weeklyEvolution} />

                    {/* Signature breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex justify-between items-center px-6">
                            <p className="text-[10px] font-black text-blue-600 uppercase">Digital</p>
                            <p className="text-3xl font-black text-blue-700">{summary.digital}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 flex justify-between items-center px-6">
                            <p className="text-[10px] font-black text-emerald-600 uppercase">Presencial</p>
                            <p className="text-3xl font-black text-emerald-700">{summary.presencial}</p>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 flex justify-between items-center px-6">
                            <p className="text-[10px] font-black text-amber-600 uppercase">Pendente</p>
                            <p className="text-3xl font-black text-amber-700">{summary.pendenteSig}</p>
                        </div>
                    </div>

                    {/* Courses table */}
                    <CoursesTable data={summary.courses} fmt={fmt} />

                    {/* Vendor Performance Table */}
                    <VendorTable data={vendorPerformance} fmt={fmt} />
                </div>
            </div>

            <style>{`
                .report-card {
                    transform: translateY(0);
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .report-card:hover {
                    transform: translateY(-4px);
                }
                .report-content-enter {
                    animation: reportFadeIn 0.5s ease-out;
                }
                @keyframes reportFadeIn {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            {/* Motor de Referência Oculto para Impressão PDF */}
            <div className="fixed opacity-0 pointer-events-none top-0 left-0 -z-50 w-[1200px]">
                <ReportAMTemplate
                    ref={reportRef}
                    summary={summary}
                    vendorPerformance={vendorPerformance}
                    weeklyEvolution={weeklyEvolution}
                />
            </div>
        </div>
    );
};

export default ReportAM;
