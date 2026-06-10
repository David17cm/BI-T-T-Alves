import React, { useState } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, ReferenceLine, LabelList
} from 'recharts';

interface WeeklyData {
    week: string;       // ex: "24/02/26" (inicio da semana — segunda-feira)
    count: number;
    fullLabel: string;  // ex: "24/02/26 à 01/03/26"
}

interface Props {
    data: WeeklyData[];
}

// Tooltip customizado — mostra o intervalo Seg→Sáb de forma clara
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const count = payload[0]?.value ?? 0;
    const fullLabel = payload[0]?.payload?.fullLabel ?? label;

    return (
        <div style={{
            backgroundColor: '#231F20',
            borderRadius: '14px',
            padding: '12px 16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            minWidth: '180px'
        }}>
            <p style={{
                color: '#9ca3af',
                fontSize: '9px',
                fontWeight: '900',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                marginBottom: '4px'
            }}>
                📅 Semana (Seg → Sáb)
            </p>
            <p style={{
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: '900',
                marginBottom: '8px',
                letterSpacing: '0.06em'
            }}>
                {fullLabel}
            </p>
            <div style={{
                borderTop: '1px solid rgba(255,255,255,0.1)',
                paddingTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <span style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    backgroundColor: '#E31E24', flexShrink: 0
                }} />
                <span style={{ color: '#E31E24', fontSize: '14px', fontWeight: '900' }}>
                    {count}
                </span>
                <span style={{ color: '#9ca3af', fontSize: '10px', fontWeight: '700' }}>
                    matrícula{count !== 1 ? 's' : ''}
                </span>
            </div>
        </div>
    );
};

const WeeklyEvolutionChart: React.FC<Props> = React.memo(({ data }) => {
    const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

    const maxCount = data.length > 0 ? Math.max(...data.map(d => d.count)) : 0;

    if (!data || data.length === 0) {
        return (
            <div className="h-[400px] w-full flex flex-col items-center justify-center gap-3 p-6">
                <span className="text-4xl">📊</span>
                <p className="text-zinc-400 font-bold text-xs uppercase tracking-widest text-center">
                    Sem dados suficientes para exibir o gráfico.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-4">

            {/* Header + Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 px-2">
                <div>
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.18em] mb-0.5 flex items-center gap-1.5">
                        <span className="w-5 h-[2px] bg-[#E31E24] rounded-full inline-block" />
                        Cada coluna = uma semana
                    </p>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                        <span className="text-[#231F20] dark:text-zinc-100">⏰</span>
                        Semana: <span className="text-[#E31E24] font-black">Segunda-feira → Sábado</span>
                    </p>
                </div>
                <div className="flex bg-zinc-100 dark:bg-zinc-800 transition-colors p-1 rounded-xl self-start">
                    <button
                        onClick={() => setChartType('bar')}
                        title="Barras Verticais"
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${chartType === 'bar' ? 'bg-white dark:bg-zinc-900 transition-colors shadow text-[#E31E24]' : 'text-zinc-400 hover:text-[#231F20] dark:text-zinc-100'}`}
                    >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <rect x="1" y="6" width="4" height="13" rx="1" />
                            <rect x="8" y="2" width="4" height="17" rx="1" />
                            <rect x="15" y="10" width="4" height="9" rx="1" />
                        </svg>
                        Barras
                    </button>
                    <button
                        onClick={() => setChartType('line')}
                        title="Linha Simples"
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${chartType === 'line' ? 'bg-white dark:bg-zinc-900 transition-colors shadow text-[#E31E24]' : 'text-zinc-400 hover:text-[#231F20] dark:text-zinc-100'}`}
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 20 20">
                            <polyline points="1,15 6,8 11,11 16,4 19,7" />
                        </svg>
                        Linha
                    </button>
                </div>
            </div>

            {/* Chart */}
            <div style={{ height: '340px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'bar' ? (
                        <BarChart
                            data={data}
                            margin={{ top: 20, right: 20, left: 0, bottom: 30 }}
                            barCategoryGap="25%"
                        >
                            <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#E31E24" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#E31E24" stopOpacity={0.6} />
                                </linearGradient>
                                <linearGradient id="barGradientTop" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#ff4a50" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#E31E24" stopOpacity={0.7} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis
                                dataKey="week"
                                tick={{ fill: '#9ca3af', fontSize: 9, fontWeight: 700 }}
                                axisLine={false}
                                tickLine={false}
                                interval={0}
                                angle={-35}
                                textAnchor="end"
                                height={50}
                            />
                            <YAxis
                                tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }}
                                axisLine={false}
                                tickLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(227,30,36,0.05)', radius: 8 }}
                                content={<CustomTooltip />}
                            />
                            <Bar
                                dataKey="count"
                                radius={[6, 6, 0, 0]}
                            >
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.count === maxCount ? 'url(#barGradientTop)' : 'url(#barGradient)'}
                                    />
                                ))}
                                <LabelList
                                    dataKey="count"
                                    position="top"
                                    style={{ fill: '#6b7280', fontSize: 9, fontWeight: 900 }}
                                />
                            </Bar>
                        </BarChart>
                    ) : (
                        <LineChart
                            data={data}
                            margin={{ top: 20, right: 20, left: 0, bottom: 30 }}
                        >
                            <defs>
                                <filter id="lineGlow">
                                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                    <feMerge>
                                        <feMergeNode in="coloredBlur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis
                                dataKey="week"
                                tick={{ fill: '#9ca3af', fontSize: 9, fontWeight: 700 }}
                                axisLine={false}
                                tickLine={false}
                                interval={0}
                                angle={-35}
                                textAnchor="end"
                                height={50}
                            />
                            <YAxis
                                tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }}
                                axisLine={false}
                                tickLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip
                                cursor={{ stroke: '#E31E24', strokeWidth: 1, strokeDasharray: '4 4' }}
                                content={<CustomTooltip />}
                            />
                            <ReferenceLine
                                y={maxCount}
                                stroke="#E31E24"
                                strokeDasharray="4 4"
                                strokeOpacity={0.3}
                                label={{
                                    value: `Pico: ${maxCount}`,
                                    position: 'right',
                                    fill: '#E31E24',
                                    fontSize: 9,
                                    fontWeight: 900
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="count"
                                stroke="#E31E24"
                                strokeWidth={2.5}
                                dot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: '#E31E24' }}
                                activeDot={{ r: 7, fill: '#E31E24', stroke: 'rgba(227,30,36,0.3)', strokeWidth: 6 }}
                                style={{ filter: 'url(#lineGlow)' }}
                            />
                        </LineChart>
                    )}
                </ResponsiveContainer>
            </div>

            {/* Footer Note */}
            <p className="text-center text-[9px] text-zinc-400 font-bold uppercase tracking-widest pb-1">
                ⚡ Eixo X = Início da Semana (Seg) &nbsp;·&nbsp; Semana encerra no Sábado
            </p>
        </div>
    );
});

export default WeeklyEvolutionChart;
