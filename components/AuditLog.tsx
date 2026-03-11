import React, { useEffect, useState } from 'react';
import { fetchAuditLogs, AuditLog as AuditLogType } from '../services/auditService';

const AuditLogComponent: React.FC = () => {
    const [logs, setLogs] = useState<AuditLogType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchAuditLogs()
            .then(setLogs)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    const actionColor = (action: string) => {
        if (action === 'INSERT') return 'bg-green-100 text-green-700';
        if (action === 'UPDATE') return 'bg-blue-100 text-blue-700';
        if (action === 'DELETE') return 'bg-red-100 text-red-700';
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700';
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <header>
                <h2 className="text-4xl font-black text-[#231F20] dark:text-zinc-100 uppercase tracking-tighter italic leading-none">
                    Log de <span className="text-[#E31E24]">Auditoria</span>
                </h2>
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mt-2">
                    Últimas 200 operações no sistema • Visível apenas para Master
                </p>
            </header>

            {error && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 px-6 py-3 rounded-xl text-sm font-bold">
                    ⚠️ {error} — Verifique se a tabela <code>audit_logs</code> foi criada no Supabase.
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-zinc-200 dark:border-zinc-700 transition-colors border-t-[#E31E24] rounded-full animate-spin" />
                </div>
            ) : (
                <div className="bg-white dark:bg-zinc-900 transition-colors rounded-[2rem] shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-[#231F20] text-white">
                                    <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest">Data/Hora</th>
                                    <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest">Usuário</th>
                                    <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest">Ação</th>
                                    <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest">Tabela</th>
                                    <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest">ID</th>
                                    <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest">Detalhes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-16 text-center text-zinc-400 font-bold uppercase tracking-widest text-[10px]">
                                            Nenhum log registrado ainda.
                                        </td>
                                    </tr>
                                )}
                                {logs.map((log, idx) => (
                                    <tr key={log.id} className={`border-t border-zinc-100 dark:border-zinc-800 transition-colors hover:bg-zinc-50 dark:bg-zinc-950/50 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-zinc-900 transition-colors' : 'bg-zinc-50 dark:bg-zinc-950/50 transition-colors/40'}`}>
                                        <td className="px-5 py-3 text-xs font-semibold text-zinc-600 whitespace-nowrap">{formatDate(log.created_at)}</td>
                                        <td className="px-5 py-3 text-xs font-bold text-[#231F20] dark:text-zinc-100 truncate max-w-[180px]">{log.user_email}</td>
                                        <td className="px-5 py-3">
                                            <span className={`inline-block text-[9px] font-black px-2.5 py-1 rounded-full uppercase ${actionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-xs font-semibold text-zinc-500">{log.table_name}</td>
                                        <td className="px-5 py-3 text-xs font-bold text-zinc-500">#{log.row_id ?? '—'}</td>
                                        <td className="px-5 py-3 text-[10px] text-zinc-400 max-w-[220px] truncate" title={JSON.stringify(log.details)}>
                                            {log.details ? JSON.stringify(log.details) : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-950/50 transition-colors border-t border-zinc-100 dark:border-zinc-800 transition-colors">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{logs.length} registro{logs.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditLogComponent;
