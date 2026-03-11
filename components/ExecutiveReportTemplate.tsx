import React, { forwardRef } from 'react';

// Tipos simplificados equivalentes aos usados em DesempenhoManager
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

interface VendorStat {
    name: string;
    total: number;
    presencial: number;
    digital: number;
    pendente: number;
    totalValue: number;
    totalReceived: number;
}

interface Props {
    data: EnrollmentRow[];
    vendorStats: VendorStat[];
    periodLabel: string;
}

const ExecutiveReportTemplate = forwardRef<HTMLDivElement, Props>(({ data, vendorStats, periodLabel }, ref) => {
    // Calculando Big Numbers
    const totalA_Receber = data.reduce((acc, curr) => acc + (curr.total_a_receber || 0), 0);
    const totalRecebido = data.reduce((acc, curr) => acc + (curr.total_recebido || 0), 0);

    // Inadimplência / Pendências (Assinatura != Assinado e valor não recebido integralmente)
    // Aqui usamos uma heurística básica: matrículas como "Pendente" ou sem Assinatura
    const inadimplentes = data.filter(d => d.assinatura !== 'Assinado' || d.total_recebido < d.total_a_receber);
    const taxaInadimplencia = data.length > 0 ? (inadimplentes.length / data.length) * 100 : 0;
    const valorInadimplente = inadimplentes.reduce((acc, curr) => acc + (curr.total_a_receber - curr.total_recebido), 0);

    // Matrículas reais ativas na janela de data
    const totalMatriculas = data.length;

    // Formatting currency
    const fmt = (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Top Vendedores para gráfico de barras simulado no HTML (para html2canvas capturar perfeito)
    const maxSales = Math.max(...vendorStats.map(v => v.total), 1);
    const top5 = vendorStats.slice(0, 5);

    const dataAtual = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    return (
        <div
            ref={ref}
            className="bg-[#FFFFFF] text-[#231F20] dark:text-zinc-100 flex flex-col relative"
            style={{ width: '210mm', minHeight: '297mm', padding: '0', boxSizing: 'border-box', fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
            {/* Header Timbrado Oficial */}
            <div className="bg-[#E31E24] text-[#FFFFFF] px-12 py-10 rounded-b-[3rem] shadow-lg relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFFFFF] opacity-5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#000000] opacity-10 rounded-full translate-y-1/2 -translate-x-1/4"></div>

                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <h1 className="text-5xl font-black tracking-tighter italic m-0">T&T<span className="text-[#FECACA]">CURSOS</span></h1>
                    </div>
                    <div className="text-right">
                        <h2 className="text-2xl font-black uppercase tracking-tight">Dossiê Executivo</h2>
                        <p className="text-xs font-medium bg-[rgba(0,0,0,0.2)] px-3 py-1 rounded-full uppercase tracking-widest mt-2 inline-block">
                            Período: {periodLabel}
                        </p>
                    </div>
                </div>
            </div>

            {/* Conteúdo Principal */}
            <div className="px-12 py-10 flex-1 flex flex-col gap-8">

                {/* 1. Sumário Executivo (Big Numbers) */}
                <section>
                    <h3 className="text-sm font-black text-[#A1A1AA] uppercase tracking-widest mb-4 border-b border-[#E4E4E7] pb-2">1. Sumário Financeiro e Operacional</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-[#FAFAFA] p-6 rounded-2xl border border-[#F4F4F5] flex flex-col relative overflow-hidden">
                            <span className="text-[10px] font-black text-[#71717A] uppercase tracking-widest">Receita Bruta Gerada</span>
                            <span className="text-3xl font-black text-[#231F20] dark:text-zinc-100 mt-1">{fmt(totalA_Receber)}</span>
                        </div>
                        <div className="bg-[#F0FDF4] p-6 rounded-2xl border border-[#DCFCE3] flex flex-col relative overflow-hidden">
                            <span className="text-[10px] font-black text-[#15803D] uppercase tracking-widest">Caixa Real Recebido</span>
                            <span className="text-3xl font-black text-[#15803D] mt-1">{fmt(totalRecebido)}</span>
                            <div className="absolute right-4 bottom-4 opacity-10">
                                <svg className="w-12 h-12 text-[#15803D]" fill="currentColor" viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" /></svg>
                            </div>
                        </div>
                        <div className="bg-[#231F20] text-[#FFFFFF] p-6 rounded-2xl shadow-md flex flex-col relative overflow-hidden">
                            <span className="text-[10px] font-black text-[#A1A1AA] uppercase tracking-widest">Volume de Matrículas</span>
                            <span className="text-4xl font-black mt-1">{totalMatriculas}</span>
                            <span className="text-xs font-bold text-[#71717A] mt-1">Alunos inseridos no período</span>
                        </div>
                    </div>
                </section>

                {/* 2. Top Performers (Gráfico Visual Híbrido) */}
                <section>
                    <h3 className="text-sm font-black text-[#A1A1AA] uppercase tracking-widest mb-4 border-b border-[#E4E4E7] pb-2">2. Top 5 Vendedores (Volume)</h3>
                    <div className="space-y-4 bg-[#FFFFFF] border border-[#F4F4F5] p-6 rounded-2xl">
                        {top5.map((v, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="w-24 shrink-0 font-bold text-xs truncate uppercase tracking-wider">{v.name}</div>
                                <div className="flex-1 h-6 bg-[#F4F4F5] rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-[#27272A] to-[#231F20] flex items-center px-3"
                                        style={{ width: `${(v.total / maxSales) * 100}%` }}
                                    >
                                        <span className="text-[9px] font-black text-[#FFFFFF]">{v.total}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 3. Tabela de Desempenho Completa */}
                <section>
                    <h3 className="text-sm font-black text-[#A1A1AA] uppercase tracking-widest mb-4 border-b border-[#E4E4E7] pb-2">3. Análise Detalhada da Equipe</h3>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#FAFAFA] border-y border-[#E4E4E7]">
                                <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-[#231F20] dark:text-zinc-100">#</th>
                                <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-[#231F20] dark:text-zinc-100">Vendedor</th>
                                <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-[#231F20] dark:text-zinc-100 text-center">Matrículas</th>
                                <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-[#231F20] dark:text-zinc-100 text-center">Presencial</th>
                                <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-[#231F20] dark:text-zinc-100 text-center">Digital</th>
                                <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-[#231F20] dark:text-zinc-100 text-right">Gerado (R$)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vendorStats.map((v, i) => (
                                <tr key={i} className="border-b border-[#F4F4F5]">
                                    <td className="py-3 px-4 text-xs font-black text-[#A1A1AA]">{i + 1}º</td>
                                    <td className="py-3 px-4 text-xs font-bold text-[#231F20] dark:text-zinc-100 uppercase">{v.name}</td>
                                    <td className="py-3 px-4 text-xs font-black text-center text-[#E31E24]">{v.total}</td>
                                    <td className="py-3 px-4 text-xs font-semibold text-[#71717A] text-center">{v.presencial}</td>
                                    <td className="py-3 px-4 text-xs font-semibold text-[#71717A] text-center">{v.digital}</td>
                                    <td className="py-3 px-4 text-xs font-black text-[#231F20] dark:text-zinc-100 text-right">{v.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

            </div>

            {/* Footer */}
            <div className="mt-auto px-12 py-6 bg-[#FAFAFA] border-t border-[#E4E4E7] flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-[#A1A1AA]">
                <span>© {new Date().getFullYear()} T&T Cursos. Uso Interno e Confidencial.</span>
                <span>Gerado em: {dataAtual}</span>
            </div>
        </div>
    );
});

export default ExecutiveReportTemplate;
