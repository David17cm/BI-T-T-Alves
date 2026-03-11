import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { EnrollmentData } from '../types';
import { EnrollmentDataWithId, insertEnrollment, updateEnrollment, deleteEnrollment } from '../services/enrollmentService';
import EnrollmentFormModal from './EnrollmentFormModal';

interface Props {
    data: EnrollmentDataWithId[];
    onDataChanged: () => void;
    isAdmin?: boolean;
}

const ITEMS_PER_PAGE = 50;

const EnrollmentTable: React.FC<Props> = ({ data, onDataChanged, isAdmin = false }) => {
    const [search, setSearch] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<EnrollmentDataWithId | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(0);


    // Resetar página ao mudar a busca ou data
    React.useEffect(() => {
        setCurrentPage(0);
    }, [search, filterStartDate, filterEndDate]);

    // Apply search filter
    const filtered = useMemo(() => {
        const lowerSearch = search.toLowerCase();

        let targetStart = 0;
        let targetEnd = Infinity;

        if (filterStartDate) {
            const [y, m, d] = filterStartDate.split('-');
            targetStart = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).getTime();
        }
        if (filterEndDate) {
            const [y, m, d] = filterEndDate.split('-');
            // Set end of the day or just use exact date (matching item date)
            targetEnd = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).getTime();
        }

        return data.filter(d => {
            const matchesSearch = d.Aluno.toLowerCase().includes(lowerSearch) ||
                d.Pacote.toLowerCase().includes(lowerSearch) ||
                d.Atendente.toLowerCase().includes(lowerSearch) ||
                d.Turma.toLowerCase().includes(lowerSearch);

            let matchesDate = true;
            if (filterStartDate || filterEndDate) {
                // d['Data Matrícula'] is in DD/MM/YYYY
                if (d['Data Matrícula']) {
                    const [dayStr, monthStr, yearStr] = d['Data Matrícula'].split('/');
                    const itemTime = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr)).getTime();
                    matchesDate = itemTime >= targetStart && itemTime <= targetEnd;
                } else {
                    matchesDate = false; // Se a pessoa filtrou por data, não mostra sem data.
                }
            }

            return matchesSearch && matchesDate;
        });
    }, [data, search, filterStartDate, filterEndDate]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const paginated = filtered.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

    const handleNew = () => {
        setEditing(null);
        setModalOpen(true);
    };

    const handleEdit = (item: EnrollmentDataWithId) => {
        setEditing(item);
        setModalOpen(true);
    };

    const handleSave = async (formData: EnrollmentData) => {
        setSaving(true);
        try {
            if (editing) {
                await updateEnrollment(editing.id, formData);
                toast.success('Matrícula atualizada com sucesso!');
            } else {
                await insertEnrollment(formData);
                toast.success('Nova matrícula registrada!');
            }
            setModalOpen(false);
            setEditing(null);
            onDataChanged();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao salvar.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        setSaving(true);
        try {
            await deleteEnrollment(id);
            setDeleteConfirm(null);
            onDataChanged();
            toast.success('Matrícula excluída.');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao excluir.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-3xl md:text-4xl font-black text-[#231F20] dark:text-zinc-100 uppercase tracking-tighter italic leading-none">
                    Gestão de <span className="text-[#E31E24]">Matrículas</span>
                </h2>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-auto">
                        <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Buscar aluno, pacote, vendedor..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-10 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-[#231F20] dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#E31E24] w-full md:w-64 transition-colors"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-1.5 focus-within:ring-2 focus-within:ring-[#E31E24] transition-colors">
                        <span className="text-[10px] font-black uppercase text-zinc-400">De:</span>
                        <input
                            type="date"
                            value={filterStartDate}
                            onChange={e => setFilterStartDate(e.target.value)}
                            className="bg-transparent text-sm font-semibold text-zinc-600 focus:outline-none w-[115px]"
                            title="Data Inicial"
                        />
                        <span className="text-[10px] font-black uppercase text-zinc-400">Até:</span>
                        <input
                            type="date"
                            value={filterEndDate}
                            onChange={e => setFilterEndDate(e.target.value)}
                            className="bg-transparent text-sm font-semibold text-zinc-600 focus:outline-none w-[115px]"
                            title="Data Final"
                        />
                        {(filterStartDate || filterEndDate) && (
                            <button
                                onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                                className="ml-1 text-zinc-400 hover:text-[#E31E24] w-6 h-6 rounded-full flex items-center justify-center transition-colors shrink-0"
                                title="Limpar período"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}
                    </div>
                    <button
                        onClick={handleNew}
                        className="flex items-center justify-center gap-2 px-5 py-3 bg-[#E31E24] text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-700 transition-all shadow-lg w-full sm:w-auto"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                        </svg>
                        Nova Matrícula
                    </button>
                </div>
            </header>

            {/* Erros agora são toasts — sem bloco de erro inline */}

            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-sm overflow-hidden transition-colors border border-transparent dark:border-zinc-800">
                <div className="overflow-x-auto">
                    <table className="w-full text-left hidden md:table">
                        <thead>
                            <tr className="bg-[#231F20] dark:bg-black text-white">
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Aluno</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Pacote</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Turma</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Vendedor</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-right">A Receber</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-right">Recebido</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Situação</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center">
                                        <p className="text-zinc-400 font-bold uppercase tracking-widest text-[10px]">
                                            {search ? 'Nenhum resultado encontrado.' : 'Nenhuma matrícula cadastrada.'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                            {paginated.map((item, idx) => (
                                <tr key={`desktop-${item.id}`} className={`border-t border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:bg-zinc-950/50 transition-colors dark:hover:bg-zinc-800/50 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-zinc-50 dark:bg-zinc-950/50 /50 transition-colors dark:bg-zinc-950'}`}>
                                    <td className="px-6 py-4">
                                        <p className="font-black text-sm text-[#231F20] dark:text-zinc-100">{item.Aluno}</p>
                                        <p className="text-[10px] text-zinc-400 font-semibold">{item['Data Matrícula']}</p>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold text-[#231F20] dark:text-zinc-200">{item.Pacote}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-block bg-[#231F20] dark:bg-zinc-800 text-white text-[9px] font-black px-2.5 py-1 rounded-full">{item.Turma}</span>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold text-[#231F20] dark:text-zinc-200">{item.Atendente}</td>
                                    <td className="px-6 py-4 text-right text-xs font-black text-[#231F20] dark:text-zinc-100">
                                        R$ {item['Total a Receber'].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-right text-xs font-black text-green-600">
                                        R$ {item['Total Recebido'].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-block text-[9px] font-black px-2.5 py-1 rounded-full uppercase ${item['Situação'].toUpperCase().includes('ATIV') ? 'bg-green-100 text-green-700' :
                                            item['Situação'].toUpperCase().includes('CANCEL') ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {item['Situação']}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="p-2 bg-zinc-100 dark:bg-zinc-800 transition-colors rounded-lg hover:bg-[#E31E24] hover:text-white transition-all text-zinc-500"
                                                title="Editar"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            {deleteConfirm === item.id ? (
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => handleDelete(item.id)} disabled={saving} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all" title="Confirmar">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                    </button>
                                                    <button onClick={() => setDeleteConfirm(null)} className="p-2 bg-zinc-200 rounded-lg hover:bg-zinc-300 text-zinc-600" title="Cancelar">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setDeleteConfirm(item.id)} className="p-2 bg-zinc-100 dark:bg-zinc-800 transition-colors rounded-lg hover:bg-red-600 hover:text-white transition-all text-zinc-500" title="Excluir">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* MOBILE VIEW (CARDS) */}
                    <div className="md:hidden flex flex-col gap-4 p-4 bg-[#F8F9FA] dark:bg-[#0a0a0c]">
                        {filtered.length === 0 && (
                            <div className="py-16 text-center bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                                <p className="text-zinc-400 font-bold uppercase tracking-widest text-[10px]">
                                    {search ? 'Nenhum resultado encontrado.' : 'Nenhuma matrícula cadastrada.'}
                                </p>
                            </div>
                        )}
                        {paginated.map((item, idx) => (
                            <div key={`mobile-${item.id}`} className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-zinc-100 dark:border-zinc-800 transition-all hover:shadow-md flex flex-col gap-4">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <p className="font-black text-lg text-[#231F20] dark:text-zinc-100 leading-tight">{item.Aluno}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-xs font-bold text-[#E31E24]">{item.Pacote}</span>
                                            <span className="inline-block bg-[#231F20] dark:bg-zinc-800 text-white text-[9px] font-black px-2 py-0.5 rounded-full">{item.Turma}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`inline-block text-[9px] font-black px-2.5 py-1 rounded-md uppercase shrink-0 text-center ${item['Situação'].toUpperCase().includes('ATIV') ? 'bg-green-100 text-green-700' :
                                            item['Situação'].toUpperCase().includes('CANCEL') ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {item['Situação']}
                                        </span>
                                        <p className="text-[10px] text-zinc-400 font-semibold">{item['Data Matrícula']}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 bg-zinc-50 dark:bg-zinc-950/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/50 mt-1">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Vendedor</p>
                                        <p className="text-sm font-bold text-[#231F20] dark:text-zinc-100 tracking-tight">{item.Atendente}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Financeiro</p>
                                        <div className="flex flex-col items-end">
                                            <p className="text-xs font-black text-green-600">R$ {item['Total Recebido'].toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-[9px] text-zinc-400 font-normal uppercase">Rec.</span></p>
                                            <p className="text-[10px] font-bold text-zinc-500 line-through decoration-zinc-300 dark:decoration-zinc-700 mt-0.5">R$ {item['Total a Receber'].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Ações mobile */}
                                <div className="flex items-center justify-end gap-2 pt-2">
                                    <button onClick={() => handleEdit(item)} className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl hover:bg-[#E31E24] hover:text-white transition-all text-xs font-bold text-zinc-600 dark:text-zinc-300 flex items-center justify-center gap-2 flex-1 shadow-sm border border-zinc-200 dark:border-zinc-700">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        Editar
                                    </button>
                                    {deleteConfirm === item.id ? (
                                        <div className="flex items-center gap-2 flex-1">
                                            <button onClick={() => handleDelete(item.id)} disabled={saving} className="px-4 py-2.5 bg-red-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-700 transition-all flex-1 shadow-md flex justify-center">
                                                Confirmar
                                            </button>
                                            <button onClick={() => setDeleteConfirm(null)} className="px-3 py-2.5 bg-zinc-200 dark:bg-zinc-700 rounded-xl text-zinc-600 dark:text-zinc-300 font-bold text-xs flex justify-center">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setDeleteConfirm(item.id)} className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl hover:bg-red-600 hover:text-white transition-all text-zinc-500 shadow-sm border border-zinc-200 dark:border-zinc-700 flex justify-center items-center">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-4 transition-colors">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        {filtered.length} {filtered.length === 1 ? 'matrícula' : 'matrículas'}
                        {search && ` (filtrado de ${data.length})`}
                    </p>
                    {totalPages > 1 && (
                        <div className="flex flex-wrap items-center gap-2 justify-center w-full md:w-auto mt-2 md:mt-0">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                disabled={currentPage === 0}
                                className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg bg-zinc-200 text-zinc-600 hover:bg-zinc-300 disabled:opacity-40 transition-all"
                            >← Ant.</button>
                            {Array.from({ length: totalPages }, (_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i)}
                                    className={`w-8 h-8 text-[10px] font-black rounded-lg transition-all ${currentPage === i ? 'bg-[#E31E24] text-white shadow' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200'}`}
                                >{i + 1}</button>
                            )).slice(Math.max(0, currentPage - 2), Math.min(totalPages, currentPage + 3))}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={currentPage === totalPages - 1}
                                className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg bg-zinc-200 text-zinc-600 hover:bg-zinc-300 disabled:opacity-40 transition-all"
                            >Próx. →</button>
                        </div>
                    )}
                </div>
            </div>

            {modalOpen && (
                <EnrollmentFormModal
                    enrollment={editing}
                    onSave={handleSave}
                    onClose={() => { setModalOpen(false); setEditing(null); }}
                    saving={saving}
                />
            )}
        </div>
    );
};

export default EnrollmentTable;
