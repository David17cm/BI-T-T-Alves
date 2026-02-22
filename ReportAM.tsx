import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import WeeklyEvolutionChart from './WeeklyEvolutionChart';
import VendorTable from './ReportAM/VendorTable';
import CoursesTable from './ReportAM/CoursesTable';

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

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('enrollments')
                .select('id, aluno, pacote, turma, assinatura, total_a_receber, total_recebido, atendente, created_at, data_matricula')
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
                return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
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

        // Find absolute min and max dates from data
        const firstDate = getEnrollmentDate(sorted[0]);
        const lastDate = getEnrollmentDate(sorted[sorted.length - 1]);

        // Start weekly charts from the beginning of the month of the first sale
        const startDate = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(lastDate);
        endDate.setHours(23, 59, 59, 999);

        const weeks: { week: string; fullLabel: string; count: number }[] = [];
        let currentStart = new Date(startDate);

        // Safety break
        const MAX_WEEKS = 150; // allows ~3 years of weeks
        let safetyCounter = 0;

        // Loop through the active period
        while (currentStart <= endDate && safetyCounter < MAX_WEEKS) {
            const currentEnd = new Date(currentStart);
            currentEnd.setDate(currentEnd.getDate() + 6);
            currentEnd.setHours(23, 59, 59, 999);

            // Count enrollments in this range
            const count = sorted.filter(e => {
                const d = getEnrollmentDate(e);
                return d >= currentStart && d <= currentEnd;
            }).length;

            const labelDate = `${String(currentStart.getDate()).padStart(2, '0')}/${String(currentStart.getMonth() + 1).padStart(2, '0')}`;
            const labelEnd = `${String(currentEnd.getDate()).padStart(2, '0')}/${String(currentEnd.getMonth() + 1).padStart(2, '0')}`;
            const yearShort = String(currentStart.getFullYear()).slice(-2);

            // Only add weeks that have data or are between data points
            weeks.push({
                week: `${labelDate}/${yearShort}`,
                fullLabel: `${labelDate}/${yearShort} à ${labelEnd}/${yearShort}`,
                count
            });

            // Move to next week
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
    // PDF EXPORT
    // ============================================
    const exportPDF = useCallback(async () => {
        setGenerating(true);
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const reportTitle = `Relatório Geral`;
            const dateStr = new Date().toLocaleDateString('pt-BR');

            // Header
            doc.setFillColor(35, 31, 32);
            doc.rect(0, 0, pageWidth, 40, 'F');
            doc.setTextColor(255, 242, 0);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('REPORT AM', 14, 20);
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.text(reportTitle, 14, 30);
            doc.setTextColor(200, 200, 200);
            doc.setFontSize(8);
            doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - 14, 30, { align: 'right' });

            doc.setTextColor(0, 0, 0);
            let y = 50;

            // Title
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(reportTitle.toUpperCase(), 14, y);
            y += 12;

            // Summary cards
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const summaryData = [
                ['Total de Matrículas', String(summary.total)],
                ['Total a Receber', `R$ ${summary.totalReceive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
                ['Total Recebido', `R$ ${summary.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
                ['Pendente', `R$ ${summary.pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
                ['Assinatura Digital', String(summary.digital)],
                ['Assinatura Presencial', String(summary.presencial)],
                ['Assinatura Pendente', String(summary.pendenteSig)],
            ];

            autoTable(doc, {
                startY: y,
                head: [['Indicador', 'Valor']],
                body: summaryData,
                theme: 'grid',
                headStyles: { fillColor: [227, 30, 36], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 248, 248] },
                margin: { left: 14, right: 14 },
            });

            y = (doc as any).lastAutoTable.finalY + 15;

            // Weekly Evolution
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('EVOLUÇÃO SEMANAL', 14, y);
            y += 8;

            autoTable(doc, {
                startY: y,
                head: [['Semana', 'Matrículas']],
                body: weeklyEvolution.map(w => [w.fullLabel, String(w.count)]),
                theme: 'grid',
                headStyles: { fillColor: [227, 30, 36], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 248, 248] },
                margin: { left: 14, right: 14 },
            });

            y = (doc as any).lastAutoTable.finalY + 15;

            // Vendor Performance Table
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('DESEMPENHO POR VENDEDOR', 14, y);
            y += 8;

            autoTable(doc, {
                startY: y,
                head: [['Vendedor', 'Matrículas', 'Valor Total', 'Recebido', '% Recebido', 'Digital', 'Presencial', 'Pendente']],
                body: vendorPerformance.map(v => [
                    v.name,
                    String(v.total),
                    `R$ ${v.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                    `R$ ${v.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                    `${v.conversionRate.toFixed(1)}%`,
                    String(v.digital),
                    String(v.presencial),
                    String(v.pendente),
                ]),
                theme: 'grid',
                headStyles: { fillColor: [227, 30, 36], textColor: 255, fontStyle: 'bold', fontSize: 7 },
                bodyStyles: { fontSize: 8 },
                alternateRowStyles: { fillColor: [248, 248, 248] },
                margin: { left: 14, right: 14 },
            });

            y = (doc as any).lastAutoTable.finalY + 15;

            // Courses table
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('MATRÍCULAS POR CURSO', 14, y);
            y += 8;

            autoTable(doc, {
                startY: y,
                head: [['Curso', 'Matrículas', 'Valor Total']],
                body: summary.courses.map(([name, data]) => [
                    name,
                    String(data.count),
                    `R$ ${data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                ]),
                theme: 'grid',
                headStyles: { fillColor: [35, 31, 32], textColor: [255, 242, 0], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 248, 248] },
                margin: { left: 14, right: 14 },
            });

            // Footer
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFillColor(35, 31, 32);
                doc.rect(0, doc.internal.pageSize.getHeight() - 15, pageWidth, 15, 'F');
                doc.setTextColor(200, 200, 200);
                doc.setFontSize(7);
                doc.text(`Report AM • ${reportTitle} • Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 5, { align: 'center' });
            }

            doc.save(`report_am_geral_${dateStr.replace(/\//g, '-')}.pdf`);
        } catch (e: any) {
            console.error('Erro ao gerar PDF:', e);
        }
        setGenerating(false);
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
                <div className="w-10 h-10 border-4 border-zinc-200 border-t-[#E31E24] rounded-full animate-spin"></div>
            </div>
        );
    }

    const reportTitle = "Relatório Geral";

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-black text-[#231F20] uppercase tracking-tighter italic leading-none">
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
            <div className="bg-white rounded-3xl shadow-xl border border-zinc-100 overflow-hidden">
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Matrículas', value: summary.total, color: 'from-[#E31E24] to-[#c41920]' },
                            { label: 'A Receber', value: fmt(summary.totalReceive), color: 'from-[#231F20] to-[#2d2829]' },
                            { label: 'Recebido', value: fmt(summary.totalReceived), color: 'from-green-600 to-green-700' },
                            { label: 'Pendente', value: fmt(summary.pending), color: 'from-amber-500 to-amber-600' },
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
        </div>
    );
};

export default ReportAM;
