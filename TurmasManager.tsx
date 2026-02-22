import React, { useState, useEffect } from 'react';
import { Turma, TurmaInput, fetchTurmas, insertTurma, updateTurma, deleteTurma } from '../services/turmasService';
import { Curso, fetchCursos } from '../services/cursosService';
import { supabase } from '../services/supabaseClient';

const EMPTY: TurmaInput = { nome: '', curso_id: null, data_inicio: null, data_fim: null, status: 'ATIVA' };

const TurmasManager: React.FC = () => {
    const [data, setData] = useState<Turma[]>([]);
    const [cursos, setCursos] = useState<Curso[]>([]);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedCourse, setSelectedCourse] = useState<string>('');
    const [expandedTurma, setExpandedTurma] = useState<number | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Turma | null>(null);
    const [form, setForm] = useState<TurmaInput>(EMPTY);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            try {
                const [t, c, e] = await Promise.all([
                    fetchTurmas(),
                    fetchCursos(),
                    supabase.from('enrollments').select('id, aluno, turma').eq('situacao', 'ATIVO')
                ]);
                setData(t);
                setCursos(c);
                setEnrollments(e.data || []);
                setError(null);
            } catch (e: any) { setError(e.message); }
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const filtered = data.filter(d => {
        const matchSearch = d.nome.toLowerCase().includes(search.toLowerCase()) || (d.curso_nome || '').toLowerCase().includes(search.toLowerCase());
        const matchCourse = selectedCourse ? d.curso_nome === selectedCourse : true;
        return matchSearch && matchCourse;
    });

    const getStudents = (turmaNome: string) => enrollments.filter(e => e.turma === turmaNome);

    const openNew = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); setError(null); };
    const openEdit = (t: Turma) => {
        setEditing(t);
        setForm({ nome: t.nome, curso_id: t.curso_id, data_inicio: t.data_inicio, data_fim: t.data_fim, status: t.status });
        setModalOpen(true); setError(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setError(null);
        try {
            if (editing) await updateTurma(editing.id, form);
            else await insertTurma(form);
            setModalOpen(false); setEditing(null); load();
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: number) => {
        setSaving(true);
        try { await deleteTurma(id); setDeleteConfirm(null); load(); }
        catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    };

    const statusColor = (s: string) => {
        const up = s.toUpperCase();
        if (up.includes('ATIV')) return 'bg-green-100 text-green-700';
        if (up.includes('ENCERR') || up.includes('FINALI')) return 'bg-red-100 text-red-700';
        return 'bg-yellow-100 text-yellow-700';
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-4xl font-black text-[#231F20] uppercase tracking-tighter italic leading-none">
                    Gestão de <span className="text-[#E31E24]">Turmas</span>
                </h2>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input type="text" placeholder="Buscar turma..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-semibold text-[#231F20] focus:outline-none focus:ring-2 focus:ring-[#E31E24] w-48" />
                    </div>
                    <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className="px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-semibold text-[#231F20] focus:outline-none focus:ring-2 focus:ring-[#E31E24] w-48">
                        <option value="">Todos os Cursos</option>
                        {cursos.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                    </select>
                    <button onClick={openNew} className="flex items-center gap-2 px-5 py-3 bg-[#E31E24] text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-700 transition-all shadow-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                        Nova Turma
                    </button>
                </div>
            </header>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-xl text-sm font-bold">{error}</div>}

            <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16"><div className="w-10 h-10 border-4 border-zinc-200 border-t-[#E31E24] rounded-full animate-spin"></div></div>
                ) : (
                    <table className="w-full text-left">
                        <thead><tr className="bg-[#231F20] text-white">
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Turma</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Curso</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-center">Alunos</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-center">Ações</th>
                        </tr></thead>
                        <tbody>
                            {filtered.length === 0 && <tr><td colSpan={6} className="px-6 py-16 text-center text-zinc-400 font-bold uppercase tracking-widest text-[10px]">{search || selectedCourse ? 'Nenhum resultado.' : 'Nenhuma turma cadastrada.'}</td></tr>}
                            {filtered.map((t, i) => {
                                const students = getStudents(t.nome);
                                const isExpanded = expandedTurma === t.id;
                                return (
                                    <React.Fragment key={t.id}>
                                        <tr className={`border-t border-zinc-100 hover:bg-zinc-50 transition-colors cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'} ${isExpanded ? 'bg-zinc-100' : ''}`} onClick={() => setExpandedTurma(isExpanded ? null : t.id)}>
                                            <td className="px-6 py-4 font-black text-sm text-[#231F20]">
                                                <div className="flex items-center gap-2">
                                                    <svg className={`w-4 h-4 text-zinc-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                                    {t.nome}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><span className="inline-block bg-[#231F20] text-white text-[9px] font-black px-2.5 py-1 rounded-full">{t.curso_nome}</span></td>
                                            <td className="px-6 py-4"><span className={`inline-block text-[9px] font-black px-2.5 py-1 rounded-full uppercase ${statusColor(t.status)}`}>{t.status}</span></td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-block bg-zinc-200 text-zinc-700 text-[10px] font-black px-2.5 py-1 rounded-full">{students.length}</span>
                                            </td>
                                            <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => openEdit(t)} className="p-2 bg-zinc-100 rounded-lg hover:bg-[#E31E24] hover:text-white transition-all text-zinc-500" title="Editar">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                    {deleteConfirm === t.id ? (
                                                        <div className="flex gap-1">
                                                            <button onClick={() => handleDelete(t.id)} disabled={saving} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg></button>
                                                            <button onClick={() => setDeleteConfirm(null)} className="p-2 bg-zinc-200 rounded-lg hover:bg-zinc-300 transition-all text-zinc-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => setDeleteConfirm(t.id)} className="p-2 bg-zinc-100 rounded-lg hover:bg-red-600 hover:text-white transition-all text-zinc-500" title="Excluir">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="bg-zinc-50/50">
                                                <td colSpan={6} className="px-6 py-4 border-t border-zinc-100 shadow-inner">
                                                    <div className="pl-6 border-l-2 border-[#E31E24]">
                                                        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Alunos Matriculados ({students.length})</h4>
                                                        {students.length === 0 ? (
                                                            <p className="text-zinc-400 text-xs italic">Nenhum aluno nesta turma.</p>
                                                        ) : (
                                                            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                                {students.map(s => (
                                                                    <li key={s.id} className="text-xs font-bold text-zinc-700 flex items-center gap-2">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                                        {s.aluno}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                )}
                <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100"><p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{filtered.length} {filtered.length === 1 ? 'turma' : 'turmas'}</p></div>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="bg-[#231F20] text-white px-8 py-6 rounded-t-3xl flex items-center justify-between">
                            <h2 className="text-lg font-black uppercase tracking-widest">{editing ? 'Editar Turma' : 'Nova Turma'}</h2>
                            <button onClick={() => setModalOpen(false)} className="text-white/60 hover:text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-5">
                            <div>
                                <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Nome da Turma</label>
                                <input type="text" required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-[#231F20] focus:outline-none focus:ring-2 focus:ring-[#E31E24]" />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Curso</label>
                                <select value={form.curso_id ?? ''} onChange={e => setForm(f => ({ ...f, curso_id: e.target.value ? Number(e.target.value) : null }))} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-[#231F20] focus:outline-none focus:ring-2 focus:ring-[#E31E24]">
                                    <option value="">Selecione um curso</option>
                                    {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Status</label>
                                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-[#231F20] focus:outline-none focus:ring-2 focus:ring-[#E31E24]">
                                    <option value="ATIVA">ATIVA</option>
                                    <option value="ENCERRADA">ENCERRADA</option>
                                    <option value="PLANEJADA">PLANEJADA</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                                <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className="px-6 py-3 bg-zinc-100 text-zinc-600 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-zinc-200 transition-all">Cancelar</button>
                                <button type="submit" disabled={saving} className="px-8 py-3 bg-[#E31E24] text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-700 transition-all shadow-lg disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TurmasManager;
