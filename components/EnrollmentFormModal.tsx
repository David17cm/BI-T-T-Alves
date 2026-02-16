import React, { useState, useEffect } from 'react';
import { EnrollmentData } from '../types';
import { EnrollmentDataWithId } from '../services/enrollmentService';
import { Vendedor, fetchVendedores } from '../services/vendedoresService';
import { Curso, fetchCursos } from '../services/cursosService';
import { Turma, fetchTurmas } from '../services/turmasService';

interface Props {
    enrollment: EnrollmentDataWithId | null;
    onSave: (data: EnrollmentData) => void;
    onClose: () => void;
    saving: boolean;
}

const DEFAULT_VALUES: EnrollmentData = {
    'Data Matrícula': '',
    'Contrato': '',
    'Aluno': '',
    'Telefone': '',
    'Pacote': '',
    'Situação': 'ATIVO',
    'Turma': '',
    'Total a Receber': 0,
    'Total Recebido': 0,
    'Valor Parcela': 0,
    'Plano de Pagamento': '',
    'Forma de Conhecimento': '',
    'Atendente': '',
    'Divulgador': '',
    'Bolsa': '',
    'Entrada/1º Vencimento': '',
    'Dia Vencimento': 0,
    'Assinatura': 'PRESENCIAL',
};

// Convert DD/MM/YYYY → YYYY-MM-DD for <input type="date">
function toISODate(ddmmyyyy: string): string {
    if (!ddmmyyyy) return '';
    const parts = ddmmyyyy.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return ddmmyyyy;
}

// Convert YYYY-MM-DD → DD/MM/YYYY for EnrollmentData
function toDDMMYYYY(iso: string): string {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return iso;
}

const EnrollmentFormModal: React.FC<Props> = ({ enrollment, onSave, onClose, saving }) => {
    const [form, setForm] = useState<EnrollmentData>(DEFAULT_VALUES);
    const [dateValue, setDateValue] = useState('');
    const [vendedores, setVendedores] = useState<Vendedor[]>([]);
    const [cursos, setCursos] = useState<Curso[]>([]);
    const [turmas, setTurmas] = useState<Turma[]>([]);

    useEffect(() => {
        Promise.all([fetchVendedores(), fetchCursos(), fetchTurmas()])
            .then(([v, c, t]) => {
                setVendedores(v);
                setCursos(c);
                setTurmas(t);
            })
            .catch(() => { });
    }, []);

    useEffect(() => {
        if (enrollment) {
            const { id, ...rest } = enrollment;
            setForm(rest);
            setDateValue(toISODate(rest['Data Matrícula']));
        } else {
            setForm(DEFAULT_VALUES);
            setDateValue('');
        }
    }, [enrollment]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = { ...form, 'Data Matrícula': toDDMMYYYY(dateValue) };
        onSave(data);
    };

    const set = (key: keyof EnrollmentData, val: string | number) => setForm(f => ({ ...f, [key]: val }));
    const xIcon = <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>;
    const inputCls = "w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-[#231F20] focus:outline-none focus:ring-2 focus:ring-[#E31E24] transition-all";
    const labelCls = "block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5";

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-[#231F20] text-white px-8 py-6 rounded-t-3xl flex items-center justify-between">
                    <h2 className="text-lg font-black uppercase tracking-widest">{enrollment ? 'Editar Matrícula' : 'Nova Matrícula'}</h2>
                    <button onClick={onClose} className="text-white/60 hover:text-white">{xIcon}</button>
                </div>
                <form onSubmit={handleSubmit} className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <label className={labelCls}>Aluno</label>
                            <input type="text" required value={form.Aluno} onChange={e => set('Aluno', e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Data Matrícula</label>
                            <input type="date" value={dateValue} onChange={e => setDateValue(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Pacote (Curso)</label>
                            <select value={form.Pacote} onChange={e => { set('Pacote', e.target.value); set('Turma', ''); }} className={inputCls}>
                                <option value="">Selecione o Curso</option>
                                {cursos.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Turma</label>
                            <select value={form.Turma} onChange={e => set('Turma', e.target.value)} className={inputCls} disabled={!form.Pacote}>
                                <option value="">Selecione a Turma</option>
                                {turmas
                                    .filter(t => t.curso_nome === form.Pacote && t.status === 'ATIVA')
                                    .map(t => <option key={t.id} value={t.nome}>{t.nome}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Situação</label>
                            <select value={form['Situação']} onChange={e => set('Situação', e.target.value)} className={inputCls}>
                                <option value="ATIVO">ATIVO</option>
                                <option value="CANCELADO">CANCELADO</option>
                                <option value="PENDENTE">PENDENTE</option>
                                <option value="TRANCADO">TRANCADO</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Vendedor</label>
                            <select value={form.Atendente} onChange={e => set('Atendente', e.target.value)} className={inputCls}>
                                <option value="">Selecione</option>
                                {vendedores.map(v => <option key={v.id} value={v.nome}>{v.nome}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Total a Receber (R$)</label>
                            <input type="number" step="0.01" value={form['Total a Receber']} onChange={e => set('Total a Receber', parseFloat(e.target.value) || 0)} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Total Recebido (R$)</label>
                            <input type="number" step="0.01" value={form['Total Recebido']} onChange={e => set('Total Recebido', parseFloat(e.target.value) || 0)} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Valor Parcela (R$)</label>
                            <input type="number" step="0.01" value={form['Valor Parcela']} onChange={e => set('Valor Parcela', parseFloat(e.target.value) || 0)} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Forma de Conhecimento</label>
                            <input type="text" value={form['Forma de Conhecimento']} onChange={e => set('Forma de Conhecimento', e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Entrada/1º Vencimento</label>
                            <input type="date" value={form['Entrada/1º Vencimento']} onChange={e => set('Entrada/1º Vencimento', e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Dia Vencimento</label>
                            <input type="number" value={form['Dia Vencimento']} onChange={e => set('Dia Vencimento', parseInt(e.target.value) || 0)} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Assinatura</label>
                            <select value={form['Assinatura']} onChange={e => set('Assinatura', e.target.value)} className={inputCls}>
                                <option value="PRESENCIAL">Presencial</option>
                                <option value="DIGITAL">Digital</option>
                                <option value="NENHUM">Nenhum</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-zinc-100">
                        <button type="button" onClick={onClose} disabled={saving} className="px-6 py-3 bg-zinc-100 text-zinc-600 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-zinc-200 transition-all">Cancelar</button>
                        <button type="submit" disabled={saving} className="px-8 py-3 bg-[#E31E24] text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-700 transition-all shadow-lg disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EnrollmentFormModal;
