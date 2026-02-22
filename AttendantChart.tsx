
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { AttendantMetric } from '../types';

// Paleta Oficial T&T Cursos
const BRAND_COLORS = ['#E31E24', '#231F20', '#A1A1AA', '#dc2626', '#18181b', '#d4d4d8'];

interface Props {
  data: AttendantMetric[];
}

const AttendantChart: React.FC<Props> = ({ data }) => {
  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
          <XAxis 
            type="number" 
            tickFormatter={(value) => `R$ ${value}`} 
            fontSize={10}
            fontWeight={900}
            stroke="#cbd5e1"
          />
          <YAxis 
            type="category" 
            dataKey="name" 
            width={90} 
            fontSize={9}
            fontWeight={900}
            tick={{ fill: '#231F20' }}
            stroke="#cbd5e1"
            className="uppercase tracking-tighter"
          />
          <Tooltip 
            cursor={{ fill: '#FFF20010' }}
            formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Total Recebido']}
            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', fontWeight: 'bold' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
          <Bar dataKey="totalReceived" name="Recebido (R$)" radius={[0, 8, 8, 0]} barSize={28}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={BRAND_COLORS[index % BRAND_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AttendantChart;
