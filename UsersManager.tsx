import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { supabaseAdmin } from '../services/adminClient';

interface AppUser {
    id?: string;
    username: string;
    email: string;
    role: 'admin' | 'auxiliar';
    ativo: boolean;
    auth_user_id?: string;
}

const UsersManager: React.FC = () => {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<AppUser | null>(null);
    const [form, setForm] = useState({
        username: '',
        email: '',
        password: '',
        role: 'auxiliar' as 'admin' | 'auxiliar',
    });

    const loadUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('app_usuarios')
            .select('*')
            .neq('role', 'master')
            .order('username');
        if (!error && data) setUsers(data);
        setLoading(false);
    };

    useEffect(() => { loadUsers(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!supabaseAdmin) {
            setError('Chave de serviço não configurada. Adicione VITE_SUPABASE_SERVICE_KEY no .env');
            return;
        }

        setSaving(true);
        try {
            if (editingUser) {
                // Atualizar usuário existente (somente username e role)
                const { error: updateError } = await supabase
                    .from('app_usuarios')
                    .update({
                        username: form.username.toLowerCase().trim(),
                        role: form.role,
                    })
                    .eq('id', editingUser.id);

                if (updateError) throw new Error(updateError.message);

                // Update Role in Supabase Auth Metadata as well
                if (editingUser.auth_user_id) {
                    await supabaseAdmin.auth.admin.updateUserById(editingUser.auth_user_id, {
                        user_metadata: { role: form.role }
                    });
                }

                setSuccess(`Usuário "${form.username}" atualizado com sucesso!`);
            } else {
                // 1. Criar novo usuário no Supabase Auth
                const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                    email: form.email,
                    password: form.password,
                    user_metadata: { role: form.role },
                    email_confirm: true,
                });

                if (authError) throw new Error(authError.message);

                // 2. Inserir na tabela app_usuarios
                const { error: insertError } = await supabase.from('app_usuarios').insert({
                    username: form.username.toLowerCase().trim(),
                    email: form.email.toLowerCase().trim(),
                    role: form.role,
                    ativo: true,
                    auth_user_id: authData.user?.id,
                });

                if (insertError) throw new Error(insertError.message);

                setSuccess(`Usuário "${form.username}" criado com sucesso!`);
            }

            setForm({ username: '', email: '', password: '', role: 'auxiliar' });
            setEditingUser(null);
            setShowForm(false);
            loadUsers();
        } catch (err: any) {
            setError(err.message || 'Erro ao processar a solicitação.');
        } finally {
            setSaving(false);
        }
    };

    const handleEditClick = (user: AppUser) => {
        setEditingUser(user);
        setForm({
            username: user.username,
            email: user.email,
            password: '', // Não preenche a senha ao editar
            role: user.role,
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleToggleActive = async (user: AppUser) => {
        await supabase
            .from('app_usuarios')
            .update({ ativo: !user.ativo })
            .eq('id', user.id);
        loadUsers();
    };

    const handleDelete = async (user: AppUser) => {
        if (!confirm(`Excluir o usuário "${user.username}"?`)) return;
        if (supabaseAdmin && user.auth_user_id) {
            await supabaseAdmin.auth.admin.deleteUser(user.auth_user_id);
        }
        await supabase.from('app_usuarios').delete().eq('id', user.id);
        loadUsers();
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-4xl font-black text-[#231F20] uppercase tracking-tighter italic leading-none">
                    Gestão de <span className="text-[#E31E24]">Usuários</span>
                </h2>
                <button
                    onClick={() => {
                        setEditingUser(null);
                        setForm({ username: '', email: '', password: '', role: 'auxiliar' });
                        setShowForm(true);
                        setError(null);
                        setSuccess(null);
                    }}
                    className="flex items-center gap-2 px-5 py-3 bg-[#E31E24] text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-700 transition-all shadow-lg"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                    </svg>
                    Novo Usuário
                </button>
            </header>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-5 py-3 rounded-xl text-sm font-bold">
                    ✅ {success}
                </div>
            )}

            {/* Formulário de criação/edição */}
            {showForm && (
                <div className="bg-white rounded-[2rem] shadow-xl p-8 border-t-8 border-[#E31E24]">
                    <h3 className="text-lg font-black text-[#231F20] uppercase tracking-tight mb-6">
                        {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                    </h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Nome de Usuário</label>
                            <input
                                type="text"
                                required
                                value={form.username}
                                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                                placeholder="ex: joao.silva"
                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#E31E24]/30 focus:border-[#E31E24]"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">E-mail (para login interno)</label>
                            <input
                                type="email"
                                required
                                disabled={!!editingUser}
                                value={form.email}
                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                placeholder="usuario@email.com"
                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#E31E24]/30 focus:border-[#E31E24] disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            {editingUser && <p className="text-[8px] font-bold text-zinc-400 mt-1 uppercase tracking-wider">O e-mail não pode ser alterado</p>}
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Senha {editingUser && '(Deixe em branco para manter)'}</label>
                            <input
                                type="password"
                                required={!editingUser}
                                minLength={6}
                                value={form.password}
                                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                placeholder={editingUser ? "Deixe em branco" : "Mínimo 6 caracteres"}
                                disabled={!!editingUser} // Desabilitado na edição por segurança
                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#E31E24]/30 focus:border-[#E31E24] disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            {editingUser && <p className="text-[8px] font-bold text-zinc-400 mt-1 uppercase tracking-wider">Troca de senha pelo próprio usuário</p>}
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Perfil</label>
                            <select
                                value={form.role}
                                onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'auxiliar' }))}
                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#E31E24]/30 focus:border-[#E31E24]"
                            >
                                <option value="admin">👑 Admin — Acesso completo com valores</option>
                                <option value="auxiliar">👤 Auxiliar — Alimentação de dados, sem valores</option>
                            </select>
                        </div>
                        <div className="md:col-span-2 flex gap-3 justify-end mt-2">
                            <button
                                type="button"
                                onClick={() => { setShowForm(false); setEditingUser(null); setForm({ username: '', email: '', password: '', role: 'auxiliar' }); }}
                                className="px-6 py-3 bg-zinc-100 text-zinc-600 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-zinc-200 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-3 bg-[#E31E24] text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-700 transition-all shadow-lg disabled:opacity-60 flex items-center gap-2"
                            >
                                {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando...</> : editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Lista de usuários */}
            <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-16 flex justify-center">
                        <div className="w-8 h-8 border-4 border-zinc-100 border-t-[#E31E24] rounded-full animate-spin" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="p-16 text-center">
                        <p className="text-zinc-400 font-bold uppercase tracking-widest text-[10px]">Nenhum usuário cadastrado ainda.</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#231F20] text-white">
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Usuário</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">E-mail</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Perfil</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-center">Status</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user, idx) => (
                                <tr key={user.id} className={`border-t border-zinc-100 hover:bg-zinc-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'}`}>
                                    <td className="px-6 py-4 font-black text-sm text-[#231F20]">@{user.username}</td>
                                    <td className="px-6 py-4 text-xs font-semibold text-zinc-500">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-block text-[9px] font-black px-3 py-1 rounded-full uppercase ${user.role === 'admin' ? 'bg-[#E31E24] text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                                            {user.role === 'admin' ? '👑 Admin' : '👤 Auxiliar'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => handleToggleActive(user)}
                                            className={`inline-block text-[9px] font-black px-3 py-1 rounded-full uppercase transition-all ${user.ativo ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700' : 'bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700'}`}
                                        >
                                            {user.ativo ? 'Ativo' : 'Inativo'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleEditClick(user)}
                                                className="p-2 bg-zinc-100 rounded-lg hover:bg-[#231F20] hover:text-white transition-all text-zinc-500"
                                                title="Editar usuário"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user)}
                                                className="p-2 bg-zinc-100 rounded-lg hover:bg-red-600 hover:text-white transition-all text-zinc-500"
                                                title="Excluir usuário"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default UsersManager;
