import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

interface Props {
    onClose: () => void;
}

const ChangePasswordModal: React.FC<Props> = ({ onClose }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError('A nova senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);

        if (error) {
            setError(error.message);
        } else {
            setSuccess(true);
            setTimeout(() => {
                onClose();
            }, 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200">
                <div className="absolute top-0 left-0 w-full h-2 bg-[#E31E24]"></div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-zinc-400 hover:text-[#231F20] transition-colors p-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <div className="p-8">
                    <div className="flex items-center gap-3 mb-6 block w-fit">
                        <div className="w-10 h-10 bg-[#E31E24]/10 rounded-xl flex items-center justify-center text-[#E31E24]">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                        </div>
                        <h2 className="text-xl font-black text-[#231F20] uppercase tracking-tighter italic">Trocar <span className="text-[#E31E24]">Senha</span></h2>
                    </div>

                    {success ? (
                        <div className="bg-green-50 text-green-700 p-6 rounded-2xl flex flex-col items-center text-center gap-3">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <div>
                                <h3 className="font-black text-sm uppercase tracking-widest">Senha Atualizada</h3>
                                <p className="text-xs font-semibold mt-1">Sua senha foi alterada com sucesso.</p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-red-50 text-red-700 text-xs font-bold px-4 py-3 rounded-xl border border-red-100">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Nova Senha</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#E31E24]/30 focus:border-[#E31E24] transition-all"
                                />
                            </div>

                            <div>
                                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Confirmar Nova Senha</label>
                                <input
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#E31E24]/30 focus:border-[#E31E24] transition-all"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !password || !confirmPassword}
                                className="w-full mt-2 py-3.5 bg-[#E31E24] text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center justify-center"
                            >
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    'Atualizar Senha'
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
