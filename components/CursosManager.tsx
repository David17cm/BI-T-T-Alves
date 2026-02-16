import React, { useState, useEffect, useMemo } from 'react';
import { Curso, CursoInput, fetchCursos, insertCurso, updateCurso, deleteCurso } from '../services/cursosService';
import { EnrollmentDataWithId, insertEnrollment, updateEnrollment } from '../services/enrollmentService';
import { EnrollmentData } from '../types';
import EnrollmentFormModal from './EnrollmentFormModal';

const EMPTY: CursoInput = { nome: '', descricao: '', valor: 0, valor_rematricula: 0 };

type PaymentFilter = 'todos' | 'pago' | 'pendente';

interface Props {
    enrollments?: EnrollmentDataWithId[];
    onDataChanged?: () => void;
}

const CursosManager: React.FC<Props> = ({ enrollments = [], onDataChanged }) => {
    const [data, setData] = useState<Curso[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Curso | null>(null);
    const [form, setForm] = useState<CursoInput>(EMPTY);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedCurso, setExpandedCurso] = useState<number | null>(null);
    const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('todos');

    const load = async () => {
        setLoading(true);
        try { setData(await fetchCursos()); setError(null); }
        catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const filtered = data.filter(d => d.nome.toLowerCase().includes(search.toLowerCase()));

    const openNew = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); setError(null); };
    const openEdit = (c: Curso) => { setEditing(c); setForm({ nome: c.nome, descricao: c.descricao, valor: c.valor, valor_rematricula: c.valor_rematricula }); setModalOpen(true); setError(null); };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setError(null);
        try {
            if (editing) await updateCurso(editing.id, form);
            else await insertCurso(form);
            setModalOpen(false); setEditing(null); load();
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: number) => {
        setSaving(true);
        try { await deleteCurso(id); setDeleteConfirm(null); load(); }
        catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    };

    // Enrollment Editing State
    const [enrollmentModalOpen, setEnrollmentModalOpen] = useState(false);
    const [editingEnrollment, setEditingEnrollment] = useState<EnrollmentDataWithId | null>(null);

    // Get students for a specific course with payment info
    const getStudentsForCurso = (cursoNome: string) => {
        return enrollments.filter(e => e.Pacote === cursoNome);
    };

    const handleEditEnrollment = (e: EnrollmentDataWithId) => {
        setEditingEnrollment(e);
        setEnrollmentModalOpen(true);
    };

    const handleSaveEnrollment = async (data: EnrollmentData) => {
        setSaving(true);
        try {
            if (editingEnrollment) {
                await updateEnrollment(editingEnrollment.id, data);
            } else {
                await insertEnrollment(data);
            }
            setEnrollmentModalOpen(false);
            setEditingEnrollment(null);
            if (onDataChanged) onDataChanged();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const getFilteredStudents = (cursoNome: string) => {
        const students = getStudentsForCurso(cursoNome);
        if (paymentFilter === 'todos') return students;
        return students.filter(s => {
            const isPaid = s['Total Recebido'] > 0;
            return paymentFilter === 'pago' ? isPaid : !isPaid;
        });
    };

    const getPaymentStats = (cursoNome: string) => {
        const students = getStudentsForCurso(cursoNome);
        const paid = students.filter(s => s['Total Recebido'] > 0).length;
        return { total: students.length, paid, pending: students.length - paid };
    };

    const toggleExpand = (cursoId: number) => {
        setExpandedCurso(prev => prev === cursoId ? null : cursoId);
        setPaymentFilter('todos');
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-4xl font-black text-[#231F20] uppercase tracking-tighter italic leading-none">
                    Gestão de <span className="text-[#E31E24]">Cursos</span>
                </h2>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input type="text" placeholder="Buscar curso..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-semibold text-[#231F20] focus:outline-none focus:ring-2 focus:ring-[#E31E24] w-64" />
                    </div>
                    <button onClick={openNew} className="flex items-center gap-2 px-5 py-3 bg-[#E31E24] text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-700 transition-all shadow-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                        Novo Curso
                    </button>
                </div>
            </header>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-xl text-sm font-bold">{error}</div>}

            <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16"><div className="w-10 h-10 border-4 border-zinc-200 border-t-[#E31E24] rounded-full animate-spin"></div></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead><tr className="bg-[#231F20] text-white">
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Nome</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Descrição</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-right">1ª Vez (R$)</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-right">2ª Vez (R$)</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-center">Alunos</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-center">Ações</th>
                            </tr></thead>
                            <tbody>
                                {filtered.length === 0 && <tr><td colSpan={6} className="px-6 py-16 text-center text-zinc-400 font-bold uppercase tracking-widest text-[10px]">{search ? 'Nenhum resultado.' : 'Nenhum curso cadastrado.'}</td></tr>}
                                {filtered.map((c, i) => {
                                    const stats = getPaymentStats(c.nome);
                                    const isExpanded = expandedCurso === c.id;
                                    const students = getFilteredStudents(c.nome);

                                    return (
                                        <React.Fragment key={c.id}>
                                            <tr className={`border-t border-zinc-100 hover:bg-zinc-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'}`}>
                                                <td className="px-6 py-4 font-black text-sm text-[#231F20]">{c.nome}</td>
                                                <td className="px-6 py-4 text-xs text-zinc-600">{c.descricao || '—'}</td>
                                                <td className="px-6 py-4 text-right text-xs font-black text-[#231F20]">R$ {c.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 text-right text-xs font-black text-zinc-500">R$ {c.valor_rematricula.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => toggleExpand(c.id)}
                                                        className={`inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-full transition-all ${isExpanded ? 'bg-[#E31E24] text-white shadow-md' : 'bg-zinc-100 text-zinc-600 hover:bg-[#E31E24] hover:text-white'}`}
                                                        title="Ver alunos"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                        {c.alunos_count || stats.total}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={() => openEdit(c)} className="p-2 bg-zinc-100 rounded-lg hover:bg-[#E31E24] hover:text-white transition-all text-zinc-500" title="Editar">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                        </button>
                                                        {deleteConfirm === c.id ? (
                                                            <div className="flex gap-1">
                                                                <button onClick={() => handleDelete(c.id)} disabled={saving} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg></button>
                                                                <button onClick={() => setDeleteConfirm(null)} className="p-2 bg-zinc-200 rounded-lg hover:bg-zinc-300 transition-all text-zinc-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => setDeleteConfirm(c.id)} className="p-2 bg-zinc-100 rounded-lg hover:bg-red-600 hover:text-white transition-all text-zinc-500" title="Excluir">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Expanded Student List */}
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={6} className="bg-zinc-50 px-6 py-4 border-t border-zinc-200">
                                                        {/* Payment Filter Tabs */}
                                                        <div className="flex flex-wrap items-center gap-2 mb-4">
                                                            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mr-2">Filtrar:</span>
                                                            <button onClick={() => setPaymentFilter('todos')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${paymentFilter === 'todos' ? 'bg-[#231F20] text-white shadow' : 'bg-white text-zinc-500 border border-zinc-200 hover:border-zinc-400'}`}>
                                                                Todos ({stats.total})
                                                            </button>
                                                            <button onClick={() => setPaymentFilter('pago')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${paymentFilter === 'pago' ? 'bg-green-600 text-white shadow' : 'bg-white text-zinc-500 border border-zinc-200 hover:border-green-400'}`}>
                                                                ✓ Pagos ({stats.paid})
                                                            </button>
                                                            <button onClick={() => setPaymentFilter('pendente')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${paymentFilter === 'pendente' ? 'bg-amber-500 text-white shadow' : 'bg-white text-zinc-500 border border-zinc-200 hover:border-amber-400'}`}>
                                                                ⏳ Pendentes ({stats.pending})
                                                            </button>
                                                        </div>

                                                        {students.length === 0 ? (
                                                            <p className="text-center text-zinc-400 text-xs font-bold py-4">Nenhum aluno encontrado.</p>
                                                        ) : (
                                                            <div className="overflow-x-auto rounded-xl border border-zinc-200">
                                                                <table className="w-full text-left bg-white">
                                                                    <thead><tr className="bg-zinc-100">
                                                                        <th className="px-4 py-2.5 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Aluno</th>
                                                                        <th className="px-4 py-2.5 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Turma</th>
                                                                        <th className="px-4 py-2.5 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Situação</th>
                                                                        <th className="px-4 py-2.5 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-right">A Receber</th>
                                                                        <th className="px-4 py-2.5 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-right">Recebido</th>
                                                                        <th className="px-4 py-2.5 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-center">Status</th>
                                                                        <th className="px-4 py-2.5 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-center">Ações</th>
                                                                    </tr></thead>
                                                                    <tbody>
                                                                        {students.map((s, idx) => {
                                                                            const isPaid = s['Total Recebido'] > 0;
                                                                            return (
                                                                                <tr key={s.id || idx} className={`border-t border-zinc-100 ${idx % 2 ? 'bg-zinc-50/30' : ''}`}>
                                                                                    <td className="px-4 py-3 text-xs font-bold text-[#231F20]">{s.Aluno}</td>
                                                                                    <td className="px-4 py-3 text-xs text-zinc-500 font-semibold">{s.Turma}</td>
                                                                                    <td className="px-4 py-3 text-xs text-zinc-500 font-semibold">{s['Situação']}</td>
                                                                                    <td className="px-4 py-3 text-xs font-bold text-right text-zinc-600">R$ {s['Total a Receber'].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                                                    <td className="px-4 py-3 text-xs font-bold text-right text-zinc-600">R$ {s['Total Recebido'].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                                                    <td className="px-4 py-3 text-center">
                                                                                        <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                                            {isPaid ? 'Pago' : 'Pendente'}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-center">
                                                                                        <button onClick={() => handleEditEnrollment(s)} className="p-1.5 bg-zinc-100 rounded-lg hover:bg-[#E31E24] hover:text-white transition-all text-zinc-500" title="Editar Matrícula">
                                                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                                                        </button>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100"><p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{filtered.length} {filtered.length === 1 ? 'curso' : 'cursos'}</p></div>
            </div>

            {/* Course Edit/New Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="bg-[#231F20] text-white px-8 py-6 rounded-t-3xl flex items-center justify-between">
                            <h2 className="text-lg font-black uppercase tracking-widest">{editing ? 'Editar Curso' : 'Novo Curso'}</h2>
                            <button onClick={() => setModalOpen(false)} className="text-white/60 hover:text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-5">
                            <div>
                                <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Nome</label>
                                <input type="text" required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-[#231F20] focus:outline-none focus:ring-2 focus:ring-[#E31E24]" />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Descrição</label>
                                <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-[#231F20] focus:outline-none focus:ring-2 focus:ring-[#E31E24] h-24 resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">1ª Vez — Matrícula (R$)</label>
                                    <input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-[#231F20] focus:outline-none focus:ring-2 focus:ring-[#E31E24]" />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">2ª Vez — Rematrícula (R$)</label>
                                    <input type="number" step="0.01" value={form.valor_rematricula} onChange={e => setForm(f => ({ ...f, valor_rematricula: parseFloat(e.target.value) || 0 }))} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-[#231F20] focus:outline-none focus:ring-2 focus:ring-[#E31E24]" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                                <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className="px-6 py-3 bg-zinc-100 text-zinc-600 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-zinc-200 transition-all">Cancelar</button>
                                <button type="submit" disabled={saving} className="px-8 py-3 bg-[#E31E24] text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-700 transition-all shadow-lg disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Enrollment Edit Modal */}
            {enrollmentModalOpen && (
                <EnrollmentFormModal
                    enrollment={editingEnrollment}
                    onSave={handleSaveEnrollment}
                    onClose={() => { setEnrollmentModalOpen(false); setEditingEnrollment(null); }}
                    saving={saving}
                />
            )}
        </div>
    );
};

export default CursosManager;
