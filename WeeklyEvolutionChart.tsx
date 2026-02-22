import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface WeeklyData {
    week: string; // "DD/MM - DD/MM"
    count: number;
    fullLabel: string; // Tooltip label
}

interface Props {
    data: WeeklyData[];
}

const WeeklyEvolutionChart: React.FC<Props> = React.memo(({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="h-[400px] w-full bg-white p-4 rounded-3xl border border-zinc-100 shadow-sm flex flex-col items-center justify-center">
                <h3 className="text-sm font-black text-[#231F20] uppercase tracking-widest mb-2 px-2">
                    Evolução Semanal de Matrículas
                </h3>
                <p className="text-zinc-400 font-bold text-xs">Sem dados suficientes para exibir o gráfico.</p>
            </div>
        );
    }
    return (
        <div className="h-[400px] w-full bg-white p-4 rounded-3xl border border-zinc-100 shadow-sm">
            <h3 className="text-sm font-black text-[#231F20] uppercase tracking-widest mb-6 px-2">
                Evolução Semanal de Matrículas
            </h3>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#E31E24" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#E31E24" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis
                        dataKey="week"
                        tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                        minTickGap={30}
                    />
                    <YAxis
                        tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#231F20',
                            border: 'none',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}
                        itemStyle={{ color: '#E31E24' }}
                        labelStyle={{ color: '#9ca3af', marginBottom: '4px', fontSize: '10px', textTransform: 'uppercase' }}
                        formatter={(value: number) => [`${value} Matrículas`, 'Quantidade']}
                        labelFormatter={(label: string) => `Semana: ${label}`}
                    />
                    <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#E31E24"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorCount)"
                        dot={{ r: 4, strokeWidth: 2, fill: '#E31E24', stroke: '#fff' }}
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#E31E24' }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
});

export default WeeklyEvolutionChart;
