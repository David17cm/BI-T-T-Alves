
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { CourseMetric } from '../types';

const COLORS = ['#E31E24', '#231F20', '#FFF200', '#71717a', '#dc2626'];

interface Props {
  data: CourseMetric[];
}

const CourseChart: React.FC<Props> = ({ data }) => {
  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="name" 
            fontSize={9} 
            fontWeight={900} 
            tick={{ fill: '#231F20' }} 
            className="uppercase"
            tickFormatter={(val) => val.length > 20 ? val.substring(0, 20) + '...' : val}
          />
          <YAxis fontSize={10} fontWeight={700} tickFormatter={(val) => `R$${val}`} />
          <Tooltip 
            formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR')}`}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
          />
          <Legend wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', paddingTop: '10px' }} />
          <Bar dataKey="totalSales" name="Vendido (R$)" fill="#231F20" radius={[4, 4, 0, 0]} />
          <Bar dataKey="totalReceived" name="Recebido (R$)" fill="#E31E24" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CourseChart;
