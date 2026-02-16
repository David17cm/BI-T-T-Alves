import React, { memo } from 'react';

interface VendorData {
    name: string;
    total: number;
    totalValue: number;
    totalReceived: number;
    conversionRate: number;
    digital: number;
    presencial: number;
    pendente: number;
}

interface Props {
    data: VendorData[];
    fmt: (v: number) => string;
}

const VendorTable: React.FC<Props> = memo(({ data, fmt }) => {
    return (
        <div>
            <h4 className="flex items-center gap-2 text-sm font-black text-[#231F20] uppercase tracking-tight mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E31E24]"></span> Desempenho por Vendedor
            </h4>
            <div className="border border-zinc-100 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-zinc-50 text-[9px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-100">
                            <th className="text-left px-5 py-3">#</th>
                            <th className="text-left px-5 py-3">Vendedor</th>
                            <th className="text-center px-5 py-3">Matr.</th>
                            <th className="text-right px-5 py-3">Valor Total</th>
                            <th className="text-right px-5 py-3">Recebido</th>
                            <th className="text-center px-5 py-3">% Rec.</th>
                            <th className="text-center px-5 py-3">Dig.</th>
                            <th className="text-center px-5 py-3">Pres.</th>
                            <th className="text-center px-5 py-3">Pend.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((v, i) => (
                            <tr key={v.name} className={`border-b border-zinc-50 hover:bg-zinc-50 transition-colors ${i === 0 ? 'bg-yellow-50/30' : ''}`}>
                                <td className="px-5 py-3">
                                    {i < 3 ? ['🥇', '🥈', '🥉'][i] : <span className="text-zinc-400 font-bold text-xs">{i + 1}º</span>}
                                </td>
                                <td className="px-5 py-3 font-black text-[#231F20]">
                                    {v.name}
                                    {i === 0 && <span className="ml-2 text-[7px] bg-[#FFF200] text-[#231F20] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">Líder</span>}
                                </td>
                                <td className="px-5 py-3 text-center font-black text-[#E31E24]">{v.total}</td>
                                <td className="px-5 py-3 text-right font-bold text-zinc-600">{fmt(v.totalValue)}</td>
                                <td className="px-5 py-3 text-right font-bold text-green-600">{fmt(v.totalReceived)}</td>
                                <td className="px-5 py-3 text-center">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${v.conversionRate >= 80 ? 'bg-green-100 text-green-700'
                                        : v.conversionRate >= 50 ? 'bg-amber-100 text-amber-700'
                                            : 'bg-red-100 text-red-700'
                                        }`}>
                                        {v.conversionRate.toFixed(0)}%
                                    </span>
                                </td>
                                <td className="px-5 py-3 text-center text-zinc-500 font-bold text-xs">{v.digital}</td>
                                <td className="px-5 py-3 text-center text-zinc-500 font-bold text-xs">{v.presencial}</td>
                                <td className="px-5 py-3 text-center text-amber-600 font-bold text-xs">{v.pendente}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

export default VendorTable;
