import React, { useState, useMemo } from 'react';
import { EnrollmentData } from '../types';
import { EnrollmentDataWithId, insertEnrollment, updateEnrollment, deleteEnrollment } from '../services/enrollmentService';
import EnrollmentFormModal from './EnrollmentFormModal';

interface Props {
    data: EnrollmentDataWithId[];
    onDataChanged: () => void;
}

const EnrollmentTable: React.FC<Props> = ({ data, onDataChanged }) => {
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<EnrollmentDataWithId | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);


    // Apply search filter
    const filtered = useMemo(() => {
        const lowerSearch = search.toLowerCase();
        return data.filter(d =>
            d.Aluno.toLowerCase().includes(lowerSearch) ||
            d.Pacote.toLowerCase().includes(lowerSearch) ||
            d.Atendente.toLowerCase().includes(lowerSearch) ||
            d.Turma.toLowerCase().includes(lowerSearch)
        );
    }, [data, search]);

    const handleNew = () => {
        setEditing(null);
        setModalOpen(true);
        setActionError(null);
    };

    const handleEdit = (item: EnrollmentDataWithId) => {
        setEditing(item);
        setModalOpen(true);
        setActionError(null);
    };

    const handleSave = async (formData: EnrollmentData) => {
        setSaving(true);
        setActionError(null);
        try {
            if (editing) {
                await updateEnrollment(editing.id, formData);
            } else {
                await insertEnrollment(formData);
            }
            setModalOpen(false);
            setEditing(null);
            onDataChanged();
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Erro ao salvar.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        setSaving(true);
        setActionError(null);
        try {
            await deleteEnrollment(id);
            setDeleteConfirm(null);
            onDataChanged();
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Erro ao excluir.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-4xl font-black text-[#231F20] uppercase tracking-tighter italic leading-none">
                    Gestão de <span className="text-[#E31E24]">Matrículas</span>
                </h2>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Buscar aluno, pacote, vendedor..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-semibold text-[#231F20] focus:outline-none focus:ring-2 focus:ring-[#E31E24] w-72"
                        />
                    </div>
                    <button
                        onClick={handleNew}
                        className="flex items-center gap-2 px-5 py-3 bg-[#E31E24] text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-700 transition-all shadow-lg"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                        </svg>
                        Nova Matrícula
                    </button>
                </div>
            </header>

            {actionError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-xl text-sm font-bold">
                    {actionError}
                </div>
            )}

            <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#231F20] text-white">
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
                            {filtered.map((item, idx) => (
                                <tr key={item.id} className={`border-t border-zinc-100 hover:bg-zinc-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'}`}>
                                    <td className="px-6 py-4">
                                        <p className="font-black text-sm text-[#231F20]">{item.Aluno}</p>
                                        <p className="text-[10px] text-zinc-400 font-semibold">{item['Data Matrícula']}</p>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold text-[#231F20]">{item.Pacote}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-block bg-[#231F20] text-white text-[9px] font-black px-2.5 py-1 rounded-full">{item.Turma}</span>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold text-[#231F20]">{item.Atendente}</td>
                                    <td className="px-6 py-4 text-right text-xs font-black text-[#231F20]">
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
                                                className="p-2 bg-zinc-100 rounded-lg hover:bg-[#E31E24] hover:text-white transition-all text-zinc-500"
                                                title="Editar"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            {deleteConfirm === item.id ? (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        disabled={saving}
                                                        className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-[9px] font-black"
                                                        title="Confirmar"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirm(null)}
                                                        className="p-2 bg-zinc-200 rounded-lg hover:bg-zinc-300 transition-all text-zinc-600"
                                                        title="Cancelar"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setDeleteConfirm(item.id)}
                                                    className="p-2 bg-zinc-100 rounded-lg hover:bg-red-600 hover:text-white transition-all text-zinc-500"
                                                    title="Excluir"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        {filtered.length} {filtered.length === 1 ? 'matrícula' : 'matrículas'}
                        {search && ` (filtrado de ${data.length})`}
                    </p>
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
