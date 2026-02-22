import React, { useState } from 'react';
import { signInWithUsername } from '../services/authService';

interface Props {
    onLogin: () => void;
}

const LoginPage: React.FC<Props> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await signInWithUsername(username, password);
            onLogin();
        } catch (err: any) {
            setError(err?.message || 'Erro ao fazer login. Verifique suas credenciais.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#E31E24]/5 rounded-full" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#231F20]/5 rounded-full" />
            </div>

            <div className="relative w-full max-w-md">
                <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-[#231F20] p-10 flex flex-col items-center">
                        <div className="bg-[#E31E24] px-8 py-4 rounded-2xl shadow-2xl transform -rotate-1 mb-4">
                            <span className="text-white text-5xl font-black italic tracking-tighter leading-none">T&T</span>
                            <br />
                            <span className="text-[#FFF200] text-[11px] font-black tracking-[0.3em] uppercase">CURSOS</span>
                        </div>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mt-3 italic">
                            Dashboard Inteligente
                        </h2>
                    </div>

                    {/* Form */}
                    <div className="p-10">
                        <h1 className="text-2xl font-black text-[#231F20] uppercase tracking-tighter mb-2">
                            Acesso ao <span className="text-[#E31E24]">Sistema</span>
                        </h1>
                        <p className="text-xs text-zinc-400 font-semibold mb-8 uppercase tracking-widest">
                            Entre com seu usuário e senha
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Username */}
                            <div>
                                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-2">
                                    Nome de Usuário
                                </label>
                                <div className="relative">
                                    <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        required
                                        placeholder="masterbialves"
                                        className="w-full pl-11 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-[#231F20] focus:outline-none focus:ring-2 focus:ring-[#E31E24]/30 focus:border-[#E31E24] transition-all placeholder:text-zinc-300"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-2">
                                    Senha
                                </label>
                                <div className="relative">
                                    <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                        placeholder="••••••••"
                                        className="w-full pl-11 pr-12 py-4 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-[#231F20] focus:outline-none focus:ring-2 focus:ring-[#E31E24]/30 focus:border-[#E31E24] transition-all placeholder:text-zinc-300"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(p => !p)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                    >
                                        {showPassword ? (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
                                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    {error}
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-[#E31E24] text-white font-black uppercase tracking-widest text-[11px] rounded-xl hover:bg-red-700 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-2"
                            >
                                {loading ? (
                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Entrando...</>
                                ) : (
                                    <>Entrar no Sistema<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg></>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
                <p className="text-center text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-6">
                    Acesso restrito — apenas usuários autorizados
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
