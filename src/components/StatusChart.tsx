import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS: Record<string, string> = {
  'ATIVO': '#22c55e',
  'Ativo': '#22c55e',
  'ativo': '#22c55e',
  'CANCELADO': '#E31E24',
  'Cancelado': '#E31E24',
  'cancelado': '#E31E24',
};

const DEFAULT_COLORS = ['#22c55e', '#E31E24', '#FFF200', '#231F20', '#71717a'];

interface Props {
  data: { name: string; value: number }[];
}

// Tooltip personalizado
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0];
  const total = payload[0]?.payload?.total ?? item.value;
  const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';

  return (
    <div style={{
      background: '#231F20',
      borderRadius: '12px',
      padding: '10px 14px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
      minWidth: '140px'
    }}>
      <p style={{ color: '#9ca3af', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px' }}>
        {item.name}
      </p>
      <p style={{ color: item.payload.fill, fontSize: '20px', fontWeight: 900, margin: 0, lineHeight: 1 }}>
        {item.value}
      </p>
      <p style={{ color: '#6b7280', fontSize: '10px', fontWeight: 700, marginTop: '2px' }}>
        {pct}% do total
      </p>
    </div>
  );
};

const StatusChart: React.FC<Props> = ({ data }) => {
  const total = data.reduce((s, d) => s + d.value, 0);

  // Enriquece os dados com total para tooltip
  const enriched = data.map((d, i) => ({
    ...d,
    fill: COLORS[d.name] || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
    total,
    pct: total > 0 ? ((d.value / total) * 100).toFixed(1) : '0',
  }));

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Gráfico de rosca com número central */}
      <div className="relative w-full" style={{ height: '220px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={enriched}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={95}
              paddingAngle={enriched.length > 1 ? 4 : 0}
              dataKey="value"
              strokeWidth={0}
              startAngle={90}
              endAngle={-270}
            >
              {enriched.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Número central */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-3xl font-black text-[#231F20] dark:text-zinc-100 leading-none">{total}</p>
          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-1">Total</p>
        </div>
      </div>

      {/* Legenda em cards informativos */}
      <div className="w-full grid grid-cols-1 gap-2">
        {enriched.map((item, i) => {
          const barWidth = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={i} className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-950/50 transition-colors rounded-xl px-4 py-3 border border-zinc-100 dark:border-zinc-800 transition-colors">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.fill }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest truncate">{item.name}</span>
                  <div className="flex items-baseline gap-1 ml-2">
                    <span className="text-sm font-black" style={{ color: item.fill }}>{item.value}</span>
                    <span className="text-[9px] font-bold text-zinc-400">({item.pct}%)</span>
                  </div>
                </div>
                {/* Mini barra de progresso */}
                <div className="w-full bg-zinc-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${barWidth}%`, backgroundColor: item.fill }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatusChart;
