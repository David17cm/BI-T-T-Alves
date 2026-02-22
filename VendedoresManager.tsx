import React, { useState, useEffect, useRef } from 'react';
import { Vendedor, VendedorInput, fetchVendedores, insertVendedor, updateVendedor, deleteVendedor } from '../services/vendedoresService';

const EMPTY: VendedorInput = { nome: '', telefone: '', email: '', comissao: 0, foto_url: null };

const VendedoresManager: React.FC = () => {
    const [data, setData] = useState<Vendedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Vendedor | null>(null);
    const [form, setForm] = useState<VendedorInput>(EMPTY);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const load = async () => {
        setLoading(true);
        try { setData(await fetchVendedores()); setError(null); }
        catch (e: any) { setError(e.message); } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const filtered = data.filter(d => d.nome.toLowerCase().includes(search.toLowerCase()));
    const openNew = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); setError(null); };
    const openEdit = (v: Vendedor) => { setEditing(v); setForm({ nome: v.nome, telefone: v.telefone, email: v.email, comissao: v.comissao, foto_url: v.foto_url }); setModalOpen(true); setError(null); };
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); setError(null);
        try { if (editing) await updateVendedor(editing.id, form); else await insertVendedor(form); setModalOpen(false); setEditing(null); load(); }
        catch (err: any) { setError(err.message); } finally { setSaving(false); }
    };
    const handleDelete = async (id: number) => {
        setSaving(true);
        try { await deleteVendedor(id); setDeleteConfirm(null); load(); }
        catch (err: any) { setError(err.message); } finally { setSaving(false); }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setError('A foto deve ter no máximo 5MB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setForm(f => ({ ...f, foto_url: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const removePhoto = () => {
        setForm(f => ({ ...f, foto_url: null }));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const editIcon = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
    const deleteIcon = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
    const checkIcon = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>;
    const xIcon = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-4xl font-black text-[#231F20] uppercase tracking-tighter italic leading-none">Gestão de <span className="text-[#E31E24]">Vendedores</span></h2>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#E31E24] w-64" />
                    </div>
                    <button onClick={openNew} className="flex items-center gap-2 px-5 py-3 bg-[#E31E24] text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-700 transition-all shadow-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>Novo Vendedor
                    </button>
                </div>
            </header>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-xl text-sm font-bold">{error}</div>}
            <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden">
                {loading ? <div className="flex items-center justify-center py-16"><div className="w-10 h-10 border-4 border-zinc-200 border-t-[#E31E24] rounded-full animate-spin"></div></div> : (
                    <table className="w-full text-left">
                        <thead><tr className="bg-[#231F20] text-white">
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Foto</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Nome</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Telefone</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Email</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-right">Comissão (%)</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-center">Ações</th>
                        </tr></thead>
                        <tbody>
                            {filtered.length === 0 && <tr><td colSpan={6} className="px-6 py-16 text-center text-zinc-400 font-bold uppercase tracking-widest text-[10px]">{search ? 'Nenhum resultado.' : 'Nenhum vendedor cadastrado.'}</td></tr>}
                            {filtered.map((v, i) => (
                                <tr key={v.id} className={`border-t border-zinc-100 hover:bg-zinc-50 ${i % 2 ? 'bg-zinc-50/50' : ''}`}>
                                    <td className="px-6 py-4">
                                        {v.foto_url ? (
                                            <img src={v.foto_url} alt={v.nome} className="w-10 h-10 rounded-full object-cover shadow-sm border-2 border-zinc-200" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-[#231F20] flex items-center justify-center text-white text-xs font-black">
                                                {v.nome.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-black text-sm">{v.nome}</td>
                                    <td className="px-6 py-4 text-xs font-bold text-zinc-600">{v.telefone || '—'}</td>
                                    <td className="px-6 py-4 text-xs font-bold text-zinc-600">{v.email || '—'}</td>
                                    <td className="px-6 py-4 text-right text-xs font-black">{v.comissao}%</td>
                                    <td className="px-6 py-4"><div className="flex items-center justify-center gap-2">
                                        <button onClick={() => openEdit(v)} className="p-2 bg-zinc-100 rounded-lg hover:bg-[#E31E24] hover:text-white transition-all text-zinc-500">{editIcon}</button>
                                        {deleteConfirm === v.id ? (<div className="flex gap-1">
                                            <button onClick={() => handleDelete(v.id)} disabled={saving} className="p-2 bg-red-600 text-white rounded-lg">{checkIcon}</button>
                                            <button onClick={() => setDeleteConfirm(null)} className="p-2 bg-zinc-200 rounded-lg text-zinc-600">{xIcon}</button>
                                        </div>) : (
                                            <button onClick={() => setDeleteConfirm(v.id)} className="p-2 bg-zinc-100 rounded-lg hover:bg-red-600 hover:text-white transition-all text-zinc-500">{deleteIcon}</button>
                                        )}
                                    </div></td>
                                </tr>))}
                        </tbody>
                    </table>)}
                <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100"><p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{filtered.length} vendedor(es)</p></div>
            </div>
            {modalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="bg-[#231F20] text-white px-8 py-6 rounded-t-3xl flex items-center justify-between">
                            <h2 className="text-lg font-black uppercase tracking-widest">{editing ? 'Editar Vendedor' : 'Novo Vendedor'}</h2>
                            <button onClick={() => setModalOpen(false)} className="text-white/60 hover:text-white">{xIcon}</button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-5">
                            {/* Photo Upload */}
                            <div className="flex items-center gap-6">
                                <div className="relative group">
                                    {form.foto_url ? (
                                        <img src={form.foto_url} alt="Foto" className="w-20 h-20 rounded-full object-cover shadow-lg border-3 border-zinc-200" />
                                    ) : (
                                        <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center border-2 border-dashed border-zinc-300">
                                            <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        </div>
                                    )}
                                    {form.foto_url && (
                                        <button type="button" onClick={removePhoto} className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-black shadow-lg hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100">×</button>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2">Foto do Vendedor</label>
                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-zinc-100 text-zinc-700 font-bold text-xs rounded-lg hover:bg-zinc-200 transition-all">
                                        {form.foto_url ? 'Trocar Foto' : 'Enviar Foto'}
                                    </button>
                                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                                    <p className="text-[9px] text-zinc-400 mt-1">JPG ou PNG, máx. 5MB</p>
                                </div>
                            </div>
                            <div><label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Nome</label>
                                <input type="text" required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#E31E24]" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Telefone</label>
                                    <input type="text" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#E31E24]" /></div>
                                <div><label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Email</label>
                                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#E31E24]" /></div>
                            </div>
                            <div><label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Comissão (%)</label>
                                <input type="number" step="0.1" value={form.comissao} onChange={e => setForm(f => ({ ...f, comissao: parseFloat(e.target.value) || 0 }))} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#E31E24]" /></div>
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
export default VendedoresManager;
