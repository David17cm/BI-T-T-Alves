import React, { memo } from 'react';

interface CourseData {
    count: number;
    value: number;
}

interface Props {
    data: [string, CourseData][];
    fmt: (v: number) => string;
}

const CoursesTable: React.FC<Props> = memo(({ data, fmt }) => {
    return (
        <div>
            <h4 className="flex items-center gap-2 text-sm font-black text-[#231F20] uppercase tracking-tight mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E31E24]"></span> Matrículas por Curso
            </h4>
            <div className="border border-zinc-100 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-zinc-50 text-[9px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-100">
                            <th className="text-left px-5 py-3">Curso</th>
                            <th className="text-center px-5 py-3">Matrículas</th>
                            <th className="text-right px-5 py-3">Valor Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map(([name, d], i) => (
                            <tr key={name} className={`group hover:bg-zinc-50 transition-colors ${i < data.length - 1 ? 'border-b border-zinc-50' : ''}`}>
                                <td className="px-5 py-3 font-bold text-[#231F20] group-hover:text-[#E31E24] transition-colors">{name}</td>
                                <td className="px-5 py-3 text-center font-black text-zinc-700">{d.count}</td>
                                <td className="px-5 py-3 text-right font-bold text-zinc-500">{fmt(d.value)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

export default CoursesTable;
