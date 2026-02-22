import React, { useState, useEffect } from 'react';
import { Aluno, AlunoInput, fetchAlunos, insertAluno, updateAluno, deleteAluno } from '../services/alunosService';
import { Vendedor, fetchVendedores } from '../services/vendedoresService';

const EMPTY: AlunoInput = { nome: '', email: '', cpf: '', endereco: '', vendedor_id: null };

const AlunosManager: React.FC = () => {
    const [data, setData] = useState<Aluno[]>([]);
    const [vendedores, setVendedores] = useState<Vendedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Aluno | null>(null);
    const [form, setForm] = useState<AlunoInput>(EMPTY);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [a, v] = await Promise.all([fetchAlunos(), fetchVendedores()]);
            setData(a); setVendedores(v); setError(null);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const filtered = data.filter(d =>
        d.nome.toLowerCase().includes(search.toLowerCase()) ||
        (d.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.cpf || '').includes(search)
    );

    const openNew = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); setError(null); };
    const openEdit = (a: Aluno) => {
        setEditing(a);
        setForm({ nome: a.nome, email: a.email, cpf: a.cpf, endereco: a.endereco, vendedor_id: a.vendedor_id });
        setModalOpen(true); setError(null);
    };
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); setError(null);
        try {
            if (editing) await updateAluno(editing.id, form); else await insertAluno(form);
            setModalOpen(false); setEditing(null); load();
        } catch (err: any) { setError(err.message); } finally { setSaving(false); }
    };
    const handleDelete = async (id: number) => {
        setSaving(true);
        try { await deleteAluno(id); setDeleteConfirm(null); load(); }
        catch (err: any) { setError(err.message); } finally { setSaving(false); }
    };

    const editIcon = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
    const deleteIcon = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
    const checkIcon = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>;
    const xIcon = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-4xl font-black text-[#231F20] uppercase tracking-tighter italic leading-none">Gestão de <span className="text-[#E31E24]">Alunos</span></h2>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#E31E24] w-64" />
                    </div>
                    <button onClick={openNew} className="flex items-center gap-2 px-5 py-3 bg-[#E31E24] text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-700 transition-all shadow-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>Novo Aluno
                    </button>
                </div>
            </header>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-xl text-sm font-bold">{error}</div>}
            <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden">
                {loading ? <div className="flex items-center justify-center py-16"><div className="w-10 h-10 border-4 border-zinc-200 border-t-[#E31E24] rounded-full animate-spin"></div></div> : (
                    <table className="w-full text-left">
                        <thead><tr className="bg-[#231F20] text-white">
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Nome</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Email</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">CPF</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Vendedor</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-center">Ações</th>
                        </tr></thead>
                        <tbody>
                            {filtered.length === 0 && <tr><td colSpan={5} className="px-6 py-16 text-center text-zinc-400 font-bold uppercase tracking-widest text-[10px]">{search ? 'Nenhum resultado.' : 'Nenhum aluno cadastrado.'}</td></tr>}
                            {filtered.map((a, i) => (
                                <tr key={a.id} className={`border-t border-zinc-100 hover:bg-zinc-50 ${i % 2 ? 'bg-zinc-50/50' : ''}`}>
                                    <td className="px-6 py-4"><p className="font-black text-sm">{a.nome}</p>{a.endereco && <p className="text-[10px] text-zinc-400 truncate max-w-xs">{a.endereco}</p>}</td>
                                    <td className="px-6 py-4 text-xs font-bold text-zinc-600">{a.email || '—'}</td>
                                    <td className="px-6 py-4 text-xs font-mono font-bold text-zinc-600">{a.cpf || '—'}</td>
                                    <td className="px-6 py-4"><span className="bg-[#231F20] text-white text-[9px] font-black px-2.5 py-1 rounded-full">{a.vendedor_nome}</span></td>
                                    <td className="px-6 py-4"><div className="flex items-center justify-center gap-2">
                                        <button onClick={() => openEdit(a)} className="p-2 bg-zinc-100 rounded-lg hover:bg-[#E31E24] hover:text-white transition-all text-zinc-500">{editIcon}</button>
                                        {deleteConfirm === a.id ? (<div className="flex gap-1">
                                            <button onClick={() => handleDelete(a.id)} disabled={saving} className="p-2 bg-red-600 text-white rounded-lg">{checkIcon}</button>
                                            <button onClick={() => setDeleteConfirm(null)} className="p-2 bg-zinc-200 rounded-lg text-zinc-600">{xIcon}</button>
                                        </div>) : (
                                            <button onClick={() => setDeleteConfirm(a.id)} className="p-2 bg-zinc-100 rounded-lg hover:bg-red-600 hover:text-white transition-all text-zinc-500">{deleteIcon}</button>
                                        )}
                                    </div></td>
                                </tr>))}
                        </tbody>
                    </table>)}
                <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100"><p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{filtered.length} aluno(s)</p></div>
            </div>
            {modalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="bg-[#231F20] text-white px-8 py-6 rounded-t-3xl flex items-center justify-between">
                            <h2 className="text-lg font-black uppercase tracking-widest">{editing ? 'Editar Aluno' : 'Novo Aluno'}</h2>
                            <button onClick={() => setModalOpen(false)} className="text-white/60 hover:text-white">{xIcon}</button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-5">
                            <div><label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Nome</label>
                                <input type="text" required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#E31E24]" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Email</label>
                                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#E31E24]" /></div>
                                <div><label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">CPF</label>
                                    <input type="text" value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#E31E24]" /></div>
                            </div>
                            <div><label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Endereço</label>
                                <input type="text" value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#E31E24]" /></div>
                            <div><label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Vendedor</label>
                                <select value={form.vendedor_id ?? ''} onChange={e => setForm(f => ({ ...f, vendedor_id: e.target.value ? Number(e.target.value) : null }))} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#E31E24]">
                                    <option value="">Selecione</option>
                                    {vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                                </select></div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                                <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className="px-6 py-3 bg-zinc-100 text-zinc-600 font-black uppercase tracking-widest text-[10px] rounded-xl">Cancelar</button>
                                <button type="submit" disabled={saving} className="px-8 py-3 bg-[#E31E24] text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar'}</button>
                            </div>
                        </form>
                    </div>
                </div>)}
        </div>
    );
};
export default AlunosManager;
