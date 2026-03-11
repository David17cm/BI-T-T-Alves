
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DailyEnrollment } from '../types';

interface Props {
  data: DailyEnrollment[];
}

const EnrollmentTimeChart: React.FC<Props> = ({ data }) => {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#E31E24" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#E31E24" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="date" 
            fontSize={10} 
            fontWeight={700} 
            tick={{ fill: '#64748b' }} 
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            fontSize={10} 
            fontWeight={700} 
            tick={{ fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
          />
          <Area 
            type="monotone" 
            dataKey="count" 
            name="Matrículas"
            stroke="#E31E24" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorCount)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EnrollmentTimeChart;
