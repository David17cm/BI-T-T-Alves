import React, { useState, useEffect } from 'react';
import { Curso, CursoInput, fetchCursos, insertCurso, updateCurso, deleteCurso } from '../services/cursosService';
import { EnrollmentDataWithId } from '../services/enrollmentService';

const EMPTY: CursoInput = { 
    nome: '', 
    descricao: '', 
    valor: 0, 
    valor_rematricula: 0,
    modulos: '',
    carga_horaria: '' 
};

interface Props {
    enrollments?: EnrollmentDataWithId[];
    onDataChanged?: () => void;
}

const PedagogoManager: React.FC<Props> = ({ enrollments = [], onDataChanged }) => {
    const [data, setData] = useState<Curso[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Curso | null>(null);
    const [form, setForm] = useState<CursoInput>(EMPTY);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try { setData(await fetchCursos()); setError(null); }
        catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const filtered = data.filter(d => 
        d.nome.toLowerCase().includes(search.toLowerCase()) ||
        (d.modulos || '').toLowerCase().includes(search.toLowerCase())
    );

    const openNew = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); setError(null); };
    const openEdit = (c: Curso) => { 
        setEditing(c); 
        setForm({ 
            nome: c.nome, 
            descricao: c.descricao, 
            valor: c.valor, 
            valor_rematricula: c.valor_rematricula,
            modulos: c.modulos || '',
            carga_horaria: c.carga_horaria || ''
        }); 
        setModalOpen(true); 
        setError(null); 
    };

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

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-4xl font-black text-[#231F20] dark:text-zinc-100 uppercase tracking-tighter italic leading-none">
                    Gestão <span className="text-[#E31E24]">Pedagógica</span>
                </h2>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input type="text" placeholder="Buscar curso ou módulo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 pr-4 py-3 bg-white dark:bg-zinc-900 transition-colors border border-zinc-200 dark:border-zinc-700 transition-colors rounded-xl text-sm font-semibold text-[#231F20] dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#E31E24] w-64" />
                    </div>
                    <button onClick={openNew} className="flex items-center gap-2 px-5 py-3 bg-[#E31E24] text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-700 transition-all shadow-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                        Novo Pacote
                    </button>
                </div>
            </header>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-xl text-sm font-bold">{error}</div>}

            <div className="bg-white dark:bg-zinc-900 transition-colors rounded-[2rem] shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16"><div className="w-10 h-10 border-4 border-zinc-200 dark:border-zinc-700 transition-colors border-t-[#E31E24] rounded-full animate-spin"></div></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead><tr className="bg-[#231F20] text-white">
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Pacote (Curso)</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Módulos</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-center">Carga Horária</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-right">Valor (R$)</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-center">Ações</th>
                            </tr></thead>
                            <tbody>
                                {filtered.length === 0 && <tr><td colSpan={5} className="px-6 py-16 text-center text-zinc-400 font-bold uppercase tracking-widest text-[10px]">{search ? 'Nenhum resultado.' : 'Nenhum pacote cadastrado.'}</td></tr>}
                                {filtered.map((c, i) => (
                                    <tr key={c.id} className={`border-t border-zinc-100 dark:border-zinc-800 transition-colors hover:bg-zinc-50 dark:bg-zinc-950/50 transition-colors ${i % 2 === 0 ? 'bg-white dark:bg-zinc-900 transition-colors' : 'bg-zinc-50 dark:bg-zinc-950/50 transition-colors'}`}>
                                        <td className="px-6 py-4">
                                            <p className="font-black text-sm text-[#231F20] dark:text-zinc-100">{c.nome}</p>
                                            <p className="text-[10px] text-zinc-400 truncate max-w-xs">{c.descricao || 'Sem descrição'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {(c.modulos || 'Nenhum módulo').split(',').map((m, idx) => (
                                                    <span key={idx} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[8px] font-black px-2 py-0.5 rounded-md uppercase border border-zinc-200 dark:border-zinc-700 transition-colors">
                                                        {m.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-[#231F20] text-[#FFF200] text-[10px] font-black px-3 py-1 rounded-full shadow-sm">
                                                {c.carga_horaria || '0'}h
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs font-black text-[#231F20] dark:text-zinc-100">
                                            R$ {c.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => openEdit(c)} className="p-2 bg-zinc-100 dark:bg-zinc-800 transition-colors rounded-lg hover:bg-[#E31E24] hover:text-white transition-all text-zinc-500" title="Editar">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                </button>
                                                {deleteConfirm === c.id ? (
                                                    <div className="flex gap-1">
                                                        <button onClick={() => handleDelete(c.id)} disabled={saving} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg></button>
                                                        <button onClick={() => setDeleteConfirm(null)} className="p-2 bg-zinc-200 rounded-lg hover:bg-zinc-300 transition-all text-zinc-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setDeleteConfirm(c.id)} className="p-2 bg-zinc-100 dark:bg-zinc-800 transition-colors rounded-lg hover:bg-red-600 hover:text-white transition-all text-zinc-500" title="Excluir">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-950/50 transition-colors border-t border-zinc-100 dark:border-zinc-800 transition-colors"><p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{filtered.length} pacote(s)</p></div>
            </div>

            {/* Pedagogo Edit/New Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
                    <div className="bg-white dark:bg-zinc-900 transition-colors rounded-3xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="bg-[#231F20] text-white px-8 py-6 rounded-t-3xl flex items-center justify-between">
                            <h2 className="text-lg font-black uppercase tracking-widest">{editing ? 'Editar Pacote' : 'Novo Pacote'}</h2>
                            <button onClick={() => setModalOpen(false)} className="text-white/60 hover:text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-5">
                            <div>
                                <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Nome do Pacote (Curso)</label>
                                <input type="text" required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950/50 transition-colors border border-zinc-200 dark:border-zinc-700 transition-colors rounded-xl text-sm font-semibold text-[#231F20] dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#E31E24]" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Carga Horária (h)</label>
                                    <input type="text" value={form.carga_horaria} onChange={e => setForm(f => ({ ...f, carga_horaria: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950/50 transition-colors border border-zinc-200 dark:border-zinc-700 transition-colors rounded-xl text-sm font-semibold text-[#231F20] dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#E31E24]" placeholder="Ex: 120" />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Valor do Pacote (R$)</label>
                                    <input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950/50 transition-colors border border-zinc-200 dark:border-zinc-700 transition-colors rounded-xl text-sm font-semibold text-[#231F20] dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#E31E24]" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Módulos (Separados por vírgula)</label>
                                <textarea value={form.modulos} onChange={e => setForm(f => ({ ...f, modulos: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950/50 transition-colors border border-zinc-200 dark:border-zinc-700 transition-colors rounded-xl text-sm font-semibold text-[#231F20] dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#E31E24] h-20 resize-none" placeholder="Ex: Windows, Word, Excel" />
                            </div>

                            <div>
                                <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Descrição Curta</label>
                                <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950/50 transition-colors border border-zinc-200 dark:border-zinc-700 transition-colors rounded-xl text-sm font-semibold text-[#231F20] dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#E31E24] h-16 resize-none" />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800 transition-colors">
                                <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className="px-6 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-zinc-200 transition-all">Cancelar</button>
                                <button type="submit" disabled={saving} className="px-8 py-3 bg-[#E31E24] text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-700 transition-all shadow-lg disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PedagogoManager;
