import React, { forwardRef } from 'react';
import WeeklyEvolutionChart from './WeeklyEvolutionChart';
import VendorTable from './ReportAM/VendorTable';
import CoursesTable from './ReportAM/CoursesTable';

interface ReportAMTemplateProps {
    summary: {
        total: number;
        totalReceive: number;
        totalReceived: number;
        pending: number;
        digital: number;
        presencial: number;
        pendenteSig: number;
        courses: [string, { count: number; value: number }][];
    };
    weeklyEvolution: { week: string; fullLabel: string; count: number }[];
    vendorPerformance: {
        name: string;
        total: number;
        totalValue: number;
        totalReceived: number;
        digital: number;
        presencial: number;
        pendente: number;
        conversionRate: number;
    }[];
}

const ReportAMTemplate = forwardRef<HTMLDivElement, ReportAMTemplateProps>(
    ({ summary, weeklyEvolution, vendorPerformance }, ref) => {

        const dateObj = new Date();
        const dataAtual = dateObj.toLocaleDateString('pt-BR');
        const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        return (
            <div
                ref={ref}
                className="bg-[#FFFFFF] text-[#231F20] dark:text-zinc-100 flex flex-col relative"
                style={{ width: '1200px', minHeight: '1697px' }} // Proporção A4 vertical x1.5 para espaço extra na web
            >
                <div className="flex flex-col h-full bg-[#FFFFFF] font-sans text-[#231F20] dark:text-zinc-100">

                    {/* HEADER PRETO — Report AM */}
                    <div className="bg-[#231F20] text-[#FFFFFF] px-12 py-10 rounded-b-[3rem] shadow-lg relative overflow-hidden shrink-0">
                        {/* Detalhes de Background parecidos com o Executive, mas mais discretos */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFFFFF] opacity-[0.03] rounded-full -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#E31E24] opacity-20 rounded-full translate-y-1/2 -translate-x-1/4"></div>

                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <h1 className="text-5xl font-black tracking-tighter italic m-0">T&T<span className="text-[#E31E24]">CURSOS</span></h1>
                            </div>
                            <div className="text-right">
                                <h2 className="text-3xl font-black uppercase tracking-tight text-[#FFFFFF]">Report <span className="text-[#E31E24]">AM</span></h2>
                                <p className="text-xs font-medium bg-[rgba(255,255,255,0.1)] px-3 py-1 rounded-full uppercase tracking-widest mt-2 inline-block text-[#A1A1AA]">
                                    Gerado em {dataAtual}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* CONTEÚDO */}
                    <div className="px-12 py-10 flex-1 flex flex-col gap-8">

                        {/* 1. KPIs */}
                        <section>
                            <h3 className="text-sm font-black text-[#A1A1AA] uppercase tracking-widest mb-4 border-b border-[#E4E4E7] pb-2">1. Sumário Geral</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-[#FEF2F2] p-6 rounded-2xl border border-[#FEE2E2] flex flex-col relative overflow-hidden">
                                    <span className="text-[10px] font-black text-[#E31E24] uppercase tracking-widest">Matrículas Totais</span>
                                    <span className="text-3xl font-black text-[#E31E24] mt-1">{summary.total}</span>
                                </div>
                                <div className="bg-[#FAFAFA] text-[#231F20] dark:text-zinc-100 p-6 rounded-2xl border border-[#E4E4E7] flex flex-col relative overflow-hidden">
                                    <span className="text-[10px] font-black text-[#71717A] uppercase tracking-widest">A Receber</span>
                                    <span className="text-2xl font-black mt-1">{fmt(summary.totalReceive)}</span>
                                </div>
                                <div className="bg-[#F0FDF4] p-6 rounded-2xl border border-[#DCFCE3] flex flex-col relative overflow-hidden">
                                    <span className="text-[10px] font-black text-[#15803D] uppercase tracking-widest">Recebido</span>
                                    <span className="text-2xl font-black text-[#15803D] mt-1">{fmt(summary.totalReceived)}</span>
                                </div>
                            </div>
                        </section>

                        {/* 2. Assinaturas */}
                        <section>
                            <h3 className="text-sm font-black text-[#A1A1AA] uppercase tracking-widest mb-4 border-b border-[#E4E4E7] pb-2">2. Fluxo de Contratos Base</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-[#EFF6FF] text-[#1D4ED8] p-4 rounded-xl border border-[#DBEAFE] flex justify-between items-center px-6">
                                    <span className="text-[10px] font-black uppercase">Digital</span>
                                    <span className="text-2xl font-black">{summary.digital}</span>
                                </div>
                                <div className="bg-[#ECFDF5] text-[#047857] p-4 rounded-xl border border-[#D1FAE5] flex justify-between items-center px-6">
                                    <span className="text-[10px] font-black uppercase">Presencial</span>
                                    <span className="text-2xl font-black">{summary.presencial}</span>
                                </div>
                                <div className="bg-[#FEF3C7] text-[#B45309] p-4 rounded-xl border border-[#FDE68A] flex justify-between items-center px-6">
                                    <span className="text-[10px] font-black uppercase">Pendente</span>
                                    <span className="text-2xl font-black">{summary.pendenteSig}</span>
                                </div>
                            </div>
                        </section>

                        {/* 3. Evolução (Apenas visual do gráfico seria ideal, mas usaremos uma grid minimalista para print seguro ou o gráfico se rodar ok no html-to-image) */}
                        <section>
                            <h3 className="text-sm font-black text-[#A1A1AA] uppercase tracking-widest mb-4 border-b border-[#E4E4E7] pb-2">3. Produtividade Semanal</h3>
                            <div className="bg-[#FAFAFA] rounded-2xl p-6 border border-[#E4E4E7]">
                                {/* Como gráficos SVG complexos como Recharts às vezes bugam no crop do html-to-image, vamos printar o grid em HTML puro para segurança no Relatório, que costuma ser analítico */}
                                <div className="grid grid-cols-7 gap-2">
                                    {weeklyEvolution.slice(-14).map((w, i) => ( // Pega as últimas 14 semanas produtivas
                                        <div key={i} className="flex flex-col items-center bg-[#FFFFFF] border border-[#F4F4F5] p-2 rounded-lg text-center">
                                            <span className="text-[8px] font-bold text-[#A1A1AA] uppercase">{w.week}</span>
                                            <span className="text-lg font-black text-[#E31E24]">{w.count}</span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[8px] font-bold text-center mt-3 text-[#A1A1AA] uppercase tracking-widest">Últimas semanas c/ vendas</p>
                            </div>
                        </section>

                        {/* 4. Matrículas por Curso */}
                        <section>
                            <h3 className="text-sm font-black text-[#A1A1AA] uppercase tracking-widest mb-4 border-b border-[#E4E4E7] pb-2">4. Performance por Produto</h3>
                            <table className="w-full text-left bg-[#FAFAFA] rounded-xl overflow-hidden">
                                <thead>
                                    <tr className="bg-[#231F20] text-[#FFFFFF]">
                                        <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-[#FFFFFF]">Curso (Pacote)</th>
                                        <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-[#FFFFFF]">Matrículas</th>
                                        <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-[#FFFFFF] text-right">Potencial Gerado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summary.courses.map(([name, data], i) => (
                                        <tr key={i} className={i % 2 === 0 ? 'bg-[#FFFFFF]' : 'bg-[#FAFAFA]'}>
                                            <td className="px-4 py-3 text-sm font-bold text-[#231F20] dark:text-zinc-100 border-b border-[#F4F4F5]">{name}</td>
                                            <td className="px-4 py-3 text-sm font-bold text-[#231F20] dark:text-zinc-100 border-b border-[#F4F4F5]">{data.count}</td>
                                            <td className="px-4 py-3 text-sm font-black text-[#231F20] dark:text-zinc-100 text-right border-b border-[#F4F4F5]">
                                                {fmt(data.value)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>

                        {/* 5. Vendedores */}
                        <section>
                            <h3 className="text-sm font-black text-[#A1A1AA] uppercase tracking-widest mb-4 border-b border-[#E4E4E7] pb-2">5. Desempenho Setor Comercial</h3>
                            <table className="w-full text-left bg-[#FFFFFF] rounded-xl overflow-hidden border border-[#E4E4E7]">
                                <thead>
                                    <tr className="bg-[#E31E24] text-[#FFFFFF]">
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#FFFFFF]">Vendedor</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#FFFFFF] text-center">Mat.</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#FFFFFF] text-right">A Receber</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#FFFFFF] text-right">Caixa</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#FFFFFF] text-center">% Efic.</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#FFFFFF] text-center">Dig.</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#FFFFFF] text-center">Pres.</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#FFFFFF] text-center">Pend.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vendorPerformance.map((v, i) => (
                                        <tr key={i} className={i % 2 === 0 ? 'bg-[#FFFFFF]' : 'bg-[#FAFAFA]'}>
                                            <td className="px-4 py-3 text-xs font-bold text-[#231F20] dark:text-zinc-100 border-b border-[#F4F4F5]">{v.name}</td>
                                            <td className="px-4 py-3 text-xs font-black text-[#231F20] dark:text-zinc-100 text-center border-b border-[#F4F4F5]">{v.total}</td>
                                            <td className="px-4 py-3 text-xs font-bold text-[#231F20] dark:text-zinc-100 text-right border-b border-[#F4F4F5]">{fmt(v.totalValue)}</td>
                                            <td className="px-4 py-3 text-xs font-black text-[#15803D] text-right border-b border-[#F4F4F5]">{fmt(v.totalReceived)}</td>
                                            <td className="px-4 py-3 text-xs font-black text-[#231F20] dark:text-zinc-100 text-center border-b border-[#F4F4F5]">{v.conversionRate.toFixed(1)}%</td>
                                            <td className="px-4 py-3 text-xs font-bold text-[#1D4ED8] text-center border-b border-[#F4F4F5]">{v.digital}</td>
                                            <td className="px-4 py-3 text-xs font-bold text-[#047857] text-center border-b border-[#F4F4F5]">{v.presencial}</td>
                                            <td className="px-4 py-3 text-xs font-bold text-[#D97706] text-center border-b border-[#F4F4F5]">{v.pendente}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>

                    </div>

                    {/* FOOTER */}
                    <div className="mt-auto px-12 py-6 bg-[#FAFAFA] border-t border-[#E4E4E7] flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-[#A1A1AA]">
                        <span>© {new Date().getFullYear()} T&T Cursos. Todos os direitos reservados.</span>
                        <span>Documento Interno - Report AM</span>
                    </div>

                </div>
            </div>
        );
    });

ReportAMTemplate.displayName = 'ReportAMTemplate';
export default ReportAMTemplate;
