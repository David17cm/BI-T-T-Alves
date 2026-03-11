import React, { useState, useEffect, useRef } from 'react';
import { fetchCursos, Curso } from '../services/cursosService';
import { fetchTurmas, Turma } from '../services/turmasService';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Professor {
    id: string;
    nomeCompleto: string;
    cursos: string[];
}

export interface TurmaConfig {
    turmaKey: string;
    professorId: string;
    diasSemana: DiaSemana[];
}

export type DiaSemana = 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB';
const DIAS: DiaSemana[] = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
const DIA_LABEL: Record<DiaSemana, string> = { SEG: 'Segunda', TER: 'Terça', QUA: 'Quarta', QUI: 'Quinta', SEX: 'Sexta', SAB: 'Sábado' };

const LS_PROFESSORES = 'tt_professores_v1';
const LS_TURMAS_ORG = 'tt_turmas_org_v1';
const LS_CONTROLE = 'tt_controle_v1';

// ── Utils ──────────────────────────────────────────────────────────────────────

function loadFromLS<T>(key: string, fallback: T): T {
    try { const r = localStorage.getItem(key); return r ? (JSON.parse(r) as T) : fallback; }
    catch { return fallback; }
}
function saveToLS<T>(key: string, v: T) { localStorage.setItem(key, JSON.stringify(v)); }
function genId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

function getMondayOf(d: Date): Date {
    const x = new Date(d); const day = x.getDay();
    x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day)); x.setHours(0, 0, 0, 0); return x;
}
function isoDate(d: Date) { return d.toISOString().slice(0, 10); }
function labelSemana(m: Date): string {
    const s = new Date(m); s.setDate(m.getDate() + 5);
    const f = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return `${f(m)} até ${f(s)}`;
}
const DIA_OFFSET: Record<DiaSemana, number> = { SEG: 0, TER: 1, QUA: 2, QUI: 3, SEX: 4, SAB: 5 };

const DIA_COLOR: Record<DiaSemana, { text: string; border: string; bg: string; badge: string }> = {
    SEG: { text: 'text-blue-700', border: 'border-blue-200', bg: 'bg-blue-50', badge: 'bg-blue-600' },
    TER: { text: 'text-purple-700', border: 'border-purple-200', bg: 'bg-purple-50', badge: 'bg-purple-600' },
    QUA: { text: 'text-emerald-700', border: 'border-emerald-200', bg: 'bg-emerald-50', badge: 'bg-emerald-600' },
    QUI: { text: 'text-amber-700', border: 'border-amber-200', bg: 'bg-amber-50', badge: 'bg-amber-500' },
    SEX: { text: 'text-rose-700', border: 'border-rose-200', bg: 'bg-rose-50', badge: 'bg-rose-600' },
    SAB: { text: 'text-zinc-700', border: 'border-zinc-300', bg: 'bg-zinc-100 dark:bg-zinc-800 transition-colors', badge: 'bg-zinc-50 dark:bg-zinc-950/50 transition-colors0' },
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLE SEMANAL TABLE
// ─────────────────────────────────────────────────────────────────────────────

interface TurmaOrg { turmaId: number; professorId: string; horario: string; diasSemana: DiaSemana[]; }
interface CtrlEntry { p: string; f: string; }
interface ControleRow {
    id: string;
    professorId: string;
    cursoNome: string;
    totalAlunos: string;
    dias: Partial<Record<DiaSemana, CtrlEntry>>;
}
type CtrlDB_v2 = Record<string, ControleRow[]>;
type CursosDB = Record<string, Record<string, { matriculados: string; pagos: string }>>;
const LS_CONTROLE_V2 = 'tt_controle_v2';
const LS_CONTROLE_CURSOS = 'tt_controle_cursos_v1';

const ControleSemanalTable: React.FC<{ professores: Professor[] }> = ({ professores }) => {
    const [turmas, setTurmas] = useState<Turma[]>([]);
    const [loading, setLoading] = useState(true);
    const [monday, setMonday] = useState<Date>(() => getMondayOf(new Date()));
    const [db, setDb] = useState<CtrlDB_v2>(() => loadFromLS<CtrlDB_v2>(LS_CONTROLE_V2, {}));
    const [dbCursos, setDbCursos] = useState<CursosDB>(() => loadFromLS<CursosDB>(LS_CONTROLE_CURSOS, {}));
    const [saved, setSaved] = useState(false);
    const [semLabel, setSemLabel] = useState('');

    useEffect(() => { fetchTurmas().then(d => { setTurmas(d); setLoading(false); }).catch(() => setLoading(false)); }, []);

    const mondayISO = isoDate(monday);
    const getWeek = () => db[mondayISO] || [];

    const addRow = () => {
        const week = [...getWeek()];
        week.push({ id: genId(), professorId: '', cursoNome: '', totalAlunos: '', dias: {} });
        const next = { ...db, [mondayISO]: week };
        setDb(next); saveToLS(LS_CONTROLE_V2, next); setSaved(false);
    };

    const updateRow = (id: string, patch: Partial<ControleRow>) => {
        const week = getWeek().map(r => r.id === id ? { ...r, ...patch } : r);
        const next = { ...db, [mondayISO]: week };
        setDb(next); saveToLS(LS_CONTROLE_V2, next); setSaved(false);
    };

    const removeRow = (id: string) => {
        const week = getWeek().filter(r => r.id !== id);
        const next = { ...db, [mondayISO]: week };
        setDb(next); saveToLS(LS_CONTROLE_V2, next); setSaved(false);
    };

    const setEntry = (id: string, dia: DiaSemana, patch: Partial<CtrlEntry>) => {
        const week = getWeek().map(r => {
            if (r.id !== id) return r;
            const newDias = { ...r.dias, [dia]: { ...(r.dias[dia] || { p: '', f: '' }), ...patch } };
            return { ...r, dias: newDias };
        });
        const next = { ...db, [mondayISO]: week };
        setDb(next); saveToLS(LS_CONTROLE_V2, next); setSaved(false);
    };

    const setCD = (curso: string, patch: Partial<{ matriculados: string; pagos: string }>) => {
        const week = { ...(dbCursos[mondayISO] || {}) };
        const cur = week[curso] || { matriculados: '', pagos: '' };
        week[curso] = { ...cur, ...patch };
        const next = { ...dbCursos, [mondayISO]: week };
        setDbCursos(next); saveToLS(LS_CONTROLE_CURSOS, next); setSaved(false);
    };

    const cursoMap: Record<string, { p: number; f: number }> = {};
    Array.from(new Set(turmas.map(t => t.curso_nome))).forEach((c: any) => cursoMap[c as string] = { p: 0, f: 0 });

    getWeek().forEach(row => {
        if (!row.cursoNome) return;
        if (!cursoMap[row.cursoNome]) cursoMap[row.cursoNome] = { p: 0, f: 0 };
        DIAS.forEach(d => {
            cursoMap[row.cursoNome].p += Number(row.dias[d]?.p) || 0;
            cursoMap[row.cursoNome].f += Number(row.dias[d]?.f) || 0;
        });
    });
    const cursoList = Object.entries(cursoMap).sort((a, b) => a[0].localeCompare(b[0]));

    const inp = 'w-[54px] text-center px-0.5 py-1.5 text-sm font-black border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E31E24] bg-white dark:bg-zinc-900 transition-colors transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';
    const inpLg = 'w-16 text-center px-2 py-1.5 text-xs font-bold border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E31E24] bg-white dark:bg-zinc-900 transition-colors text-[#231F20] dark:text-zinc-100';

    const uniqueCursosDisp = Array.from(new Set(turmas.map(t => t.curso_nome).filter(Boolean)));

    return (
        <div className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <h3 className="text-2xl font-black text-[#231F20] dark:text-zinc-100 uppercase tracking-tighter italic">
                        Controle <span className="text-[#E31E24]">Semanal</span>
                    </h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Lançamento Livre</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <input type="text" placeholder="Ex: 1ª Semana de Aula" value={semLabel} onChange={e => setSemLabel(e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-zinc-900 transition-colors border border-zinc-200 dark:border-zinc-700 transition-colors rounded-xl text-[11px] font-bold text-[#231F20] dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#E31E24] placeholder:text-zinc-300 min-w-[170px]" />
                    <div className="flex items-center bg-white dark:bg-zinc-900 transition-colors border border-zinc-200 dark:border-zinc-700 transition-colors rounded-xl overflow-hidden shadow-sm">
                        <button onClick={() => { const d = new Date(monday); d.setDate(d.getDate() - 7); setMonday(d); }} className="px-3 py-2.5 text-zinc-500 hover:bg-zinc-50 dark:bg-zinc-950/50 transition-colors border-r border-zinc-100 dark:border-zinc-800 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <span className="px-4 py-2.5 text-[10px] font-black text-[#231F20] dark:text-zinc-100 uppercase min-w-[130px] text-center">{labelSemana(monday)}</span>
                        <button onClick={() => { const d = new Date(monday); d.setDate(d.getDate() + 7); setMonday(d); }} className="px-3 py-2.5 text-zinc-500 hover:bg-zinc-50 dark:bg-zinc-950/50 transition-colors border-l border-zinc-100 dark:border-zinc-800 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                    <button onClick={() => setMonday(getMondayOf(new Date()))} className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 font-black uppercase text-[9px] tracking-widest rounded-xl hover:bg-zinc-200">Hoje</button>
                    <button onClick={() => { saveToLS(LS_CONTROLE_V2, db); saveToLS(LS_CONTROLE_CURSOS, dbCursos); setSaved(true); setTimeout(() => setSaved(false), 2500); }}
                        className={`flex items-center gap-2 px-5 py-2.5 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-sm ${saved ? 'bg-green-600 text-white' : 'bg-[#231F20] text-white hover:bg-zinc-700'}`}>
                        {saved ? <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>Salvo!</> : 'Salvar'}
                    </button>
                </div>
            </div>

            {loading ? <div className="flex items-center justify-center py-16"><div className="w-10 h-10 border-4 border-zinc-200 dark:border-zinc-700 transition-colors border-t-[#E31E24] rounded-full animate-spin" /></div> : (
                <div className="flex flex-col gap-6 items-start">
                    <div className="w-full bg-white dark:bg-zinc-900 transition-colors rounded-[2rem] shadow-sm overflow-hidden min-w-0 pb-1">
                        {semLabel && <div className="px-5 py-2 bg-amber-50 border-b border-amber-200"><p className="text-[11px] font-black text-amber-700 uppercase tracking-widest">{semLabel} — {labelSemana(monday)}</p></div>}
                        <div className="overflow-x-auto">
                            <table className="text-left min-w-[700px] w-full">
                                <thead>
                                    <tr className="bg-[#231F20]">
                                        <th className="px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-r border-zinc-700" rowSpan={2}>Lançamentos (Prof.)</th>
                                        <th className="px-3 py-2 text-[9px] font-black text-zinc-400 uppercase text-center border-r border-zinc-700" rowSpan={2}>Total<br />Alunos</th>
                                        {DIAS.map(d => <th key={d} colSpan={2} className={`py-2 text-[9px] font-black uppercase text-center border-r border-zinc-700 ${DIA_COLOR[d].text}`}>{DIA_LABEL[d]}</th>)}
                                        <th className="px-3 py-2 text-[9px] font-black text-green-400 uppercase text-center border-r border-zinc-700" rowSpan={2}>TP</th>
                                        <th className="px-3 py-2 text-[9px] font-black text-red-400 uppercase text-center" rowSpan={2}>TF</th>
                                    </tr>
                                    <tr className="bg-zinc-900">
                                        {DIAS.map(d => <React.Fragment key={d}>
                                            <th className="px-2 py-1.5 text-[8px] font-black text-green-400 uppercase text-center w-11">P</th>
                                            <th className="px-2 py-1.5 text-[8px] font-black text-red-400 uppercase text-center w-11 border-r border-zinc-700">F</th>
                                        </React.Fragment>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {getWeek().length === 0 ? (
                                        <tr><td colSpan={16} className="px-5 py-8 text-center text-zinc-400 text-xs font-bold">Nenhum lançamento adicionado nesta semana.</td></tr>
                                    ) : getWeek().map((row, idx) => {
                                        let tp = 0, tf = 0;
                                        DIAS.forEach(d => { tp += Number(row.dias[d]?.p) || 0; tf += Number(row.dias[d]?.f) || 0; });
                                        return (
                                            <tr key={row.id} className={`border-t border-zinc-100 dark:border-zinc-800 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-zinc-900 transition-colors' : 'bg-zinc-50 dark:bg-zinc-950/50 transition-colors/40'}`}>
                                                <td className="px-3 py-2 border-r border-zinc-100 dark:border-zinc-800 transition-colors min-w-[210px] align-top">
                                                    <div className="flex flex-col gap-1.5 pt-2">
                                                        <select value={row.professorId} onChange={e => updateRow(row.id, { professorId: e.target.value })}
                                                            className="w-full text-xs font-bold text-[#231F20] dark:text-zinc-100 bg-white dark:bg-zinc-900 transition-colors border border-zinc-200 dark:border-zinc-700 transition-colors rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-[#E31E24]">
                                                            <option value="">Selecione o Professor</option>
                                                            {professores.map(p => <option key={p.id} value={p.id}>{p.nomeCompleto}</option>)}
                                                        </select>
                                                        <select value={row.cursoNome} onChange={e => updateRow(row.id, { cursoNome: e.target.value })}
                                                            className="w-full text-[10px] font-bold text-zinc-500 bg-zinc-50 dark:bg-zinc-950/50 transition-colors border border-zinc-200 dark:border-zinc-700 transition-colors rounded p-1.5 uppercase focus:outline-none focus:ring-1 focus:ring-[#E31E24]">
                                                            <option value="">Selecione o Curso</option>
                                                            {uniqueCursosDisp.map((c: any) => <option key={c} value={c}>{c}</option>)}
                                                        </select>
                                                        <button onClick={() => removeRow(row.id)} className="text-[9px] font-bold text-red-500 hover:text-red-700 text-left w-fit self-end mr-1 mt-0.5 uppercase tracking-widest">Remover</button>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-2 text-center border-r border-zinc-100 dark:border-zinc-800 transition-colors align-top pt-4">
                                                    <span className="font-black text-xs text-[#231F20] dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 transition-colors px-2.5 py-1.5 rounded-lg inline-block min-w-[36px] border border-zinc-200 dark:border-zinc-700 transition-colors">{(tp + tf) || '—'}</span>
                                                </td>
                                                {DIAS.map(dia => {
                                                    const e = row.dias[dia] || { p: '', f: '' };
                                                    return (
                                                        <React.Fragment key={dia}>
                                                            <td className="px-1 py-2 text-center align-top pt-4"><input type="number" min="0" value={e.p} onChange={x => setEntry(row.id, dia, { p: x.target.value })} className={`${inp} border-green-200 text-green-700`} /></td>
                                                            <td className="px-1 py-2 text-center border-r border-zinc-100 dark:border-zinc-800 transition-colors align-top pt-4"><input type="number" min="0" value={e.f} onChange={x => setEntry(row.id, dia, { f: x.target.value })} className={`${inp} border-red-200 text-red-600`} /></td>
                                                        </React.Fragment>
                                                    );
                                                })}
                                                <td className="px-3 py-2 text-center border-r border-zinc-100 dark:border-zinc-800 transition-colors align-top pt-4"><span className="font-black text-sm text-green-700 bg-green-50 px-2 py-1 rounded-lg">{tp || '—'}</span></td>
                                                <td className="px-3 py-2 text-center align-top pt-4"><span className={`font-black text-sm px-2 py-1 rounded-lg ${tf > 0 ? 'text-white bg-[#E31E24]' : 'text-zinc-300 bg-zinc-50 dark:bg-zinc-950/50 transition-colors'}`}>{tf || '—'}</span></td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="bg-zinc-50 dark:bg-zinc-950/50 transition-colors border-t border-zinc-100 dark:border-zinc-800 transition-colors">
                                        <td colSpan={16} className="px-5 py-3 text-left">
                                            <button onClick={addRow} className="px-5 py-2.5 bg-zinc-200 text-zinc-800 hover:bg-zinc-300 transition-colors rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">+ Adicionar Linha</button>
                                        </td>
                                    </tr>
                                    {getWeek().length > 0 && (() => {
                                        let gp = 0, gf = 0;
                                        getWeek().forEach(row => { DIAS.forEach(d => { gp += Number(row.dias[d]?.p) || 0; gf += Number(row.dias[d]?.f) || 0; }); });
                                        return (
                                            <tr className="bg-[#231F20]">
                                                <td colSpan={2 + DIAS.length * 2} className="px-5 py-2 text-right text-[10px] font-black text-zinc-400 uppercase tracking-widest">TOTAL</td>
                                                <td className="px-3 py-2 text-center"><span className="font-black text-sm text-green-400">{gp}</span></td>
                                                <td className="px-3 py-2 text-center"><span className="font-black text-sm text-red-400">{gf}</span></td>
                                            </tr>
                                        );
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {cursoList.length > 0 && (
                        <div className="w-full bg-white dark:bg-zinc-900 transition-colors rounded-[2rem] shadow-sm overflow-hidden flex-shrink-0">
                            <div className="bg-[#231F20] px-5 py-3"><p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Acompanhamento e Pagamentos por Curso</p></div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left min-w-[700px]">
                                    <thead><tr className="bg-amber-400">
                                        <th className="px-5 py-3 text-[9px] font-black text-[#231F20] dark:text-zinc-100 uppercase border-r border-amber-500">Curso</th>
                                        <th className="px-3 py-3 text-[9px] font-black text-green-900 uppercase text-center">TP (Presenças)</th>
                                        <th className="px-3 py-3 text-[9px] font-black text-red-900 uppercase text-center border-r border-amber-500">TF (Faltas)</th>
                                        <th className="px-4 py-3 text-[9px] font-black text-[#231F20] dark:text-zinc-100 uppercase text-center">Matriculados</th>
                                        <th className="px-4 py-3 text-[9px] font-black text-green-900 uppercase text-center">Pagos</th>
                                        <th className="px-4 py-3 text-[9px] font-black text-red-900 uppercase text-center border-r border-amber-500">📍 Faltam Pagar</th>
                                        <th className="px-4 py-3 text-[9px] font-black text-[#231F20] dark:text-zinc-100 uppercase text-center border-r border-amber-500">% de Frequência</th>
                                        <th className="px-4 py-3 text-[9px] font-black text-[#231F20] dark:text-zinc-100 uppercase text-center">% de Adimplência</th>
                                    </tr></thead>
                                    <tbody>
                                        {cursoList.map(([curso, v], i) => {
                                            const cd = (dbCursos[mondayISO] || {})[curso] || { pagos: '' };
                                            const mat = v.p + v.f;
                                            const pag = Number(cd.pagos) || 0;
                                            const faltam = Math.max(0, mat - pag);
                                            const pct = mat > 0 ? ((pag / mat) * 100).toFixed(1) : '0.0';
                                            const pctFreq = mat > 0 ? ((v.p / mat) * 100).toFixed(1) : '0.0';
                                            return (
                                                <tr key={curso} className={`border-t border-zinc-100 dark:border-zinc-800 transition-colors ${i % 2 === 0 ? 'bg-white dark:bg-zinc-900 transition-colors' : 'bg-zinc-50 dark:bg-zinc-950/50 /50 transition-colors'}`}>
                                                    <td className="px-5 py-3 text-xs font-black text-[#231F20] dark:text-zinc-100 border-r border-zinc-100 dark:border-zinc-800 transition-colors whitespace-nowrap">{curso}</td>
                                                    <td className="px-3 py-3 text-center font-black text-sm text-green-700 bg-green-50/30">{v.p || '—'}</td>
                                                    <td className="px-3 py-3 text-center font-black text-sm text-red-600 border-r border-zinc-100 dark:border-zinc-800 transition-colors bg-red-50/30">{v.f || '—'}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="font-black text-sm text-[#231F20] dark:text-zinc-100">{mat || '—'}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <input type="number" min="0" value={cd.pagos} onChange={e => setCD(curso, { pagos: e.target.value })} className={`${inpLg} border-green-300 !text-green-700 bg-green-50`} placeholder="0" />
                                                    </td>
                                                    <td className="px-4 py-3 text-center border-r border-zinc-100 dark:border-zinc-800 transition-colors">
                                                        <span className={`inline-block px-3 py-1 rounded-lg text-sm font-black ${faltam > 0 ? 'bg-red-100 text-red-700' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                                                            {faltam > 0 ? faltam : '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center border-r border-zinc-100 dark:border-zinc-800 transition-colors">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="w-16 h-2 bg-zinc-200 rounded-full overflow-hidden">
                                                                <div className={`h-full ${Number(pctFreq) >= 80 ? 'bg-green-500' : Number(pctFreq) >= 50 ? 'bg-amber-400' : 'bg-[#E31E24]'}`} style={{ width: `${pctFreq}%` }} />
                                                            </div>
                                                            <span className="text-xs font-black text-[#231F20] dark:text-zinc-100 w-10 text-right">{pctFreq}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="w-16 h-2 bg-zinc-200 rounded-full overflow-hidden">
                                                                <div className={`h-full ${Number(pct) >= 80 ? 'bg-green-500' : Number(pct) >= 50 ? 'bg-amber-400' : 'bg-[#E31E24]'}`} style={{ width: `${pct}%` }} />
                                                            </div>
                                                            <span className="text-xs font-black text-[#231F20] dark:text-zinc-100 w-10 text-right">{pct}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="bg-amber-50 border-t-2 border-amber-300">
                                            <td className="px-5 py-3 text-[10px] font-black text-amber-800 uppercase border-r border-amber-300">Total Geral</td>
                                            <td className="px-3 py-3 text-center font-black text-sm text-green-700">{cursoList.reduce((s, [, v]) => s + v.p, 0) || '—'}</td>
                                            <td className="px-3 py-3 text-center font-black text-sm text-red-600 border-r border-amber-300">{cursoList.reduce((s, [, v]) => s + v.f, 0) || '—'}</td>
                                            <td className="px-4 py-3 text-center font-black text-sm text-[#231F20] dark:text-zinc-100">{cursoList.reduce((s, [, v]) => s + v.p + v.f, 0) || '—'}</td>
                                            <td className="px-4 py-3 text-center font-black text-sm text-green-700">{cursoList.reduce((s, [c]) => { const a = dbCursos[mondayISO]?.[c]; return s + (Number(a?.pagos) || 0); }, 0) || '—'}</td>
                                            <td className="px-4 py-3 text-center border-r border-amber-300 font-black text-sm text-red-600">{cursoList.reduce((s, [c, v]) => { const a = dbCursos[mondayISO]?.[c]; return s + Math.max(0, (v.p + v.f) - (Number(a?.pagos) || 0)); }, 0) || '—'}</td>
                                            <td className="px-4 py-3 text-center border-r border-amber-300 font-black text-sm text-[#231F20] dark:text-zinc-100">
                                                {(() => {
                                                    const tm = cursoList.reduce((s, [, v]) => s + v.p + v.f, 0);
                                                    const tpFreq = cursoList.reduce((s, [, v]) => s + v.p, 0);
                                                    return tm > 0 ? ((tpFreq / tm) * 100).toFixed(1) + '%' : '—';
                                                })()}
                                            </td>
                                            <td className="px-4 py-3 text-center font-black text-sm text-[#231F20] dark:text-zinc-100">
                                                {(() => {
                                                    const tm = cursoList.reduce((s, [, v]) => s + v.p + v.f, 0);
                                                    const tp = cursoList.reduce((s, [c]) => { const a = dbCursos[mondayISO]?.[c]; return s + (Number(a?.pagos) || 0); }, 0);
                                                    return tm > 0 ? ((tp / tm) * 100).toFixed(1) + '%' : '—';
                                                })()}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};



// ─────────────────────────────────────────────────────────────────────────────
// CADASTRO DE PROFESSORES
// ─────────────────────────────────────────────────────────────────────────────

const CadastroProfessores: React.FC<{ cursos: Curso[] }> = ({ cursos }) => {
    const [professores, setProfessores] = useState<Professor[]>(() => loadFromLS<Professor[]>(LS_PROFESSORES, []));
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Professor | null>(null);
    const [nome, setNome] = useState('');
    const [cursosSel, setCursosSel] = useState<string[]>([]);
    const [search, setSearch] = useState('');
    const [delConfirm, setDelConfirm] = useState<string | null>(null);

    const persist = (list: Professor[]) => { setProfessores(list); saveToLS(LS_PROFESSORES, list); };
    const openNew = () => { setEditing(null); setNome(''); setCursosSel([]); setModalOpen(true); };
    const openEdit = (p: Professor) => { setEditing(p); setNome(p.nomeCompleto); setCursosSel(p.cursos); setModalOpen(true); };
    const handleSave = (e: React.FormEvent) => {
        e.preventDefault(); if (!nome.trim()) return;
        editing ? persist(professores.map(p => p.id === editing.id ? { ...p, nomeCompleto: nome.trim(), cursos: cursosSel } : p))
            : persist([...professores, { id: genId(), nomeCompleto: nome.trim(), cursos: cursosSel }]);
        setModalOpen(false);
    };
    const toggleC = (n: string) => setCursosSel(p => p.includes(n) ? p.filter(c => c !== n) : [...p, n]);
    const filtered = professores.filter(p => p.nomeCompleto.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-black text-[#231F20] dark:text-zinc-100 uppercase tracking-tighter italic">
                        Professores <span className="text-[#E31E24]">Cadastrados</span>
                    </h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                        {professores.length} professor{professores.length !== 1 ? 'es' : ''} no sistema
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
                        className="px-4 py-2.5 bg-white dark:bg-zinc-900 transition-colors border border-zinc-200 dark:border-zinc-700 transition-colors rounded-xl text-sm font-semibold text-[#231F20] dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#E31E24] w-48" />
                    <button onClick={openNew} className="flex items-center gap-2 px-5 py-2.5 bg-[#E31E24] text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-700 transition-all shadow-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                        Novo Professor
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 transition-colors rounded-[2rem] shadow-sm overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="py-20 text-center">
                        <p className="text-zinc-400 font-black uppercase tracking-widest text-[10px]">
                            {search ? 'Nenhum professor encontrado.' : 'Nenhum professor cadastrado ainda.'}
                        </p>
                        {!search && <button onClick={openNew} className="mt-4 text-[#E31E24] font-black uppercase text-[10px] tracking-widest hover:underline">+ Cadastrar primeiro professor</button>}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-[#231F20] text-white">
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">#</th>
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Nome</th>
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Cursos</th>
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((p, i) => (
                                    <tr key={p.id} className={`border-t border-zinc-100 dark:border-zinc-800 transition-colors hover:bg-zinc-50 dark:bg-zinc-950/50 transition-colors ${i % 2 === 0 ? 'bg-white dark:bg-zinc-900 transition-colors' : 'bg-zinc-50 dark:bg-zinc-950/50 /50 transition-colors'}`}>
                                        <td className="px-6 py-4"><div className="w-8 h-8 rounded-xl bg-[#E31E24] flex items-center justify-center text-white font-black text-xs">{i + 1}</div></td>
                                        <td className="px-6 py-4"><p className="font-black text-sm text-[#231F20] dark:text-zinc-100">{p.nomeCompleto}</p></td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {p.cursos.length === 0
                                                    ? <span className="text-[10px] text-zinc-400 font-bold">— sem cursos</span>
                                                    : p.cursos.map(c => <span key={c} className="px-2.5 py-1 bg-[#231F20] text-white text-[9px] font-black uppercase rounded-full">{c}</span>)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => openEdit(p)} className="p-2 bg-zinc-100 dark:bg-zinc-800 transition-colors rounded-lg hover:bg-[#E31E24] hover:text-white transition-all text-zinc-500" title="Editar">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                </button>
                                                {delConfirm === p.id ? (
                                                    <div className="flex gap-1">
                                                        <button onClick={() => { persist(professores.filter(x => x.id !== p.id)); setDelConfirm(null); }} className="p-2 bg-red-600 text-white rounded-lg">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                        </button>
                                                        <button onClick={() => setDelConfirm(null)} className="p-2 bg-zinc-200 rounded-lg text-zinc-600">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setDelConfirm(p.id)} className="p-2 bg-zinc-100 dark:bg-zinc-800 transition-colors rounded-lg hover:bg-red-600 hover:text-white transition-all text-zinc-500" title="Excluir">
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
            </div>

            {modalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
                    <div className="bg-white dark:bg-zinc-900 transition-colors rounded-3xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="bg-[#231F20] text-white px-8 py-6 rounded-t-3xl flex items-center justify-between">
                            <h2 className="text-lg font-black uppercase tracking-widest">{editing ? 'Editar Professor' : 'Novo Professor'}</h2>
                            <button onClick={() => setModalOpen(false)} className="text-white/60 hover:text-white">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div>
                                <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Nome Completo <span className="text-[#E31E24]">*</span></label>
                                <input type="text" required placeholder="Ex: Marcos Oliveira" value={nome} onChange={e => setNome(e.target.value)}
                                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950/50 transition-colors border border-zinc-200 dark:border-zinc-700 transition-colors rounded-xl text-sm font-semibold text-[#231F20] dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#E31E24] placeholder:text-zinc-300" />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2">Cursos que Ministra</label>
                                {cursos.length === 0 ? <p className="text-xs text-zinc-400 italic">Nenhum curso no sistema.</p> : (
                                    <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto">
                                        {cursos.map(c => {
                                            const sel = cursosSel.includes(c.nome);
                                            return <button type="button" key={c.id} onClick={() => toggleC(c.nome)}
                                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${sel ? 'bg-[#231F20] border-[#231F20] text-white' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 hover:border-zinc-400'}`}>
                                                <div className={`w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 border-2 ${sel ? 'bg-[#E31E24] border-[#E31E24]' : 'border-zinc-300'}`}>
                                                    {sel && <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-wide leading-tight">{c.nome}</span>
                                            </button>;
                                        })}
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800 transition-colors">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-6 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-zinc-200">Cancelar</button>
                                <button type="submit" className="px-8 py-3 bg-[#E31E24] text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-700 shadow-lg">
                                    {editing ? 'Salvar Alterações' : 'Cadastrar Professor'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// ORGANIZAÇÃO DE TURMAS
// ─────────────────────────────────────────────────────────────────────────────

const OrganizacaoTurmas: React.FC<{ professores: Professor[] }> = ({ professores }) => {
    const [turmas, setTurmas] = useState<Turma[]>([]);
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState<Record<number, TurmaOrg>>(() => loadFromLS<Record<number, TurmaOrg>>(LS_TURMAS_ORG, {}));
    const [saved, setSaved] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => { fetchTurmas().then(d => { setTurmas(d); setLoading(false); }).catch(() => setLoading(false)); }, []);

    const getOrg = (id: number): TurmaOrg => config[id] ?? { turmaId: id, professorId: '', horario: '', diasSemana: [] };
    const upd = (id: number, patch: Partial<TurmaOrg>) => {
        setConfig(prev => { const n = { ...prev, [id]: { ...getOrg(id), ...patch } }; saveToLS(LS_TURMAS_ORG, n); return n; });
        setSaved(false);
    };
    const toggleDia = (id: number, dia: DiaSemana) => {
        const org = getOrg(id);
        upd(id, { diasSemana: org.diasSemana.includes(dia) ? org.diasSemana.filter(d => d !== dia) : [...org.diasSemana, dia] });
    };

    const filtered = turmas.filter(t => t.nome.toLowerCase().includes(search.toLowerCase()) || (t.curso_nome ?? '').toLowerCase().includes(search.toLowerCase()));
    const configured = (Object.values(config) as TurmaOrg[]).filter(c => c.professorId || c.diasSemana.length > 0).length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-black text-[#231F20] dark:text-zinc-100 uppercase tracking-tighter italic">Organização <span className="text-[#E31E24]">de Turmas</span></h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">{configured}/{turmas.length} turmas configuradas</p>
                </div>
                <div className="flex items-center gap-3">
                    <input type="text" placeholder="Buscar turma..." value={search} onChange={e => setSearch(e.target.value)}
                        className="px-4 py-2.5 bg-white dark:bg-zinc-900 transition-colors border border-zinc-200 dark:border-zinc-700 transition-colors rounded-xl text-sm font-semibold text-[#231F20] dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#E31E24] w-56" />
                    <button onClick={() => { saveToLS(LS_TURMAS_ORG, config); setSaved(true); setTimeout(() => setSaved(false), 2500); }}
                        className={`flex items-center gap-2 px-5 py-2.5 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all shadow-lg ${saved ? 'bg-green-600 text-white' : 'bg-[#231F20] text-white hover:bg-zinc-700'}`}>
                        {saved ? <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>Salvo!</> : 'Salvar Tudo'}
                    </button>
                </div>
            </div>
            {professores.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 flex items-center gap-3">
                    <span className="text-xl">!</span>
                    <p className="text-[11px] font-black text-amber-700 uppercase tracking-widest">Cadastre professores primeiro na aba Professores.</p>
                </div>
            )}
            <div className="bg-white dark:bg-zinc-900 transition-colors rounded-[2rem] shadow-sm overflow-hidden">
                {loading ? <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-zinc-200 dark:border-zinc-700 transition-colors border-t-[#E31E24] rounded-full animate-spin" /></div> : (
                    <div className="divide-y divide-zinc-100">
                        {filtered.map(t => {
                            const org = getOrg(t.id); const prof = professores.find(p => p.id === org.professorId);
                            return (
                                <div key={t.id} className="p-6">
                                    <div className="flex flex-col md:flex-row md:items-start gap-4 mb-4">
                                        <div className="flex items-center gap-3 md:w-1/3">
                                            <div className={`w-2 h-10 rounded-full flex-shrink-0 ${org.professorId ? 'bg-[#E31E24]' : 'bg-zinc-200'}`} />
                                            <div>
                                                <p className="font-black text-sm text-[#231F20] dark:text-zinc-100">{t.nome}</p>
                                                <p className="text-[10px] text-zinc-400 font-bold uppercase">{t.curso_nome}</p>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Professor</label>
                                            <select value={org.professorId} onChange={e => upd(t.id, { professorId: e.target.value })}
                                                className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-950/50 transition-colors border border-zinc-200 dark:border-zinc-700 transition-colors rounded-xl text-sm font-semibold text-[#231F20] dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#E31E24]">
                                                <option value="">— Selecionar professor —</option>
                                                {professores.map(p => <option key={p.id} value={p.id}>{p.nomeCompleto}</option>)}
                                            </select>
                                            {prof && <div className="flex flex-wrap gap-1 mt-1.5">{prof.cursos.map(c => <span key={c} className="px-2 py-0.5 bg-[#231F20] text-white text-[8px] font-black rounded-full uppercase">{c}</span>)}</div>}
                                        </div>
                                        <div className="w-40">
                                            <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Horário</label>
                                            <input type="time" value={org.horario} onChange={e => upd(t.id, { horario: e.target.value })}
                                                className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-950/50 transition-colors border border-zinc-200 dark:border-zinc-700 transition-colors rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#E31E24]" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2">Dias da Semana</label>
                                        <div className="flex flex-wrap gap-2">
                                            {DIAS.map(dia => {
                                                const on = org.diasSemana.includes(dia);
                                                return <button key={dia} type="button" onClick={() => toggleDia(t.id, dia)}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${on ? 'bg-[#E31E24] border-[#E31E24] text-white shadow-md' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400'}`}>
                                                    {dia}
                                                </button>;
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {filtered.length === 0 && <div className="py-16 text-center text-zinc-400 font-black uppercase tracking-widest text-[10px]">Nenhuma turma encontrada.</div>}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// GRADE SEMANAL
// ─────────────────────────────────────────────────────────────────────────────

type GradeItem = { turma: Turma; org: TurmaOrg; prof: Professor | undefined };

const GradeSemanal: React.FC<{ professores: Professor[] }> = ({ professores }) => {
    const [turmas, setTurmas] = useState<Turma[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterProf, setFP] = useState('');
    const [exporting, setExp] = useState<'idle' | 'png' | 'pdf'>('idle');
    const exportRef = useRef<HTMLDivElement>(null);

    useEffect(() => { fetchTurmas().then(d => { setTurmas(d); setLoading(false); }).catch(() => setLoading(false)); }, []);

    const config = loadFromLS<Record<number, TurmaOrg>>(LS_TURMAS_ORG, {});
    const grade: Record<DiaSemana, GradeItem[]> = DIAS.reduce((a, d) => ({ ...a, [d]: [] }), {} as Record<DiaSemana, GradeItem[]>);
    turmas.forEach(t => { const o = config[t.id]; if (!o) return; o.diasSemana.forEach(d => { const prof = professores.find(p => p.id === o.professorId); if (filterProf && prof?.id !== filterProf) return; grade[d].push({ turma: t, org: o, prof }); }); });
    DIAS.forEach(d => { grade[d].sort((a, b) => { if (!a.org.horario && !b.org.horario) return 0; if (!a.org.horario) return 1; if (!b.org.horario) return -1; return a.org.horario.localeCompare(b.org.horario); }); });

    const fileName = () => { const lbl = (filterProf ? professores.find(p => p.id === filterProf)?.nomeCompleto ?? 'prof' : 'todos').replace(/\s+/g, '-').toLowerCase(); return `grade-${lbl}-${new Date().toISOString().slice(0, 10)}`; };
    const capture = async () => { if (!exportRef.current) return null; try { await toPng(exportRef.current, { cacheBust: true, pixelRatio: 1 }); return await toPng(exportRef.current, { cacheBust: true, pixelRatio: 4, backgroundColor: '#f4f4f5', quality: 1 }); } catch { return null; } };

    const handlePNG = async () => { setExp('png'); try { const u = await capture(); if (!u) { alert('Erro ao gerar imagem.'); return; } const a = document.createElement('a'); a.download = `${fileName()}.png`; a.href = u; document.body.appendChild(a); a.click(); document.body.removeChild(a); } finally { setExp('idle'); } };
    const handlePDF = async () => { setExp('pdf'); try { const u = await capture(); if (!u) { alert('Erro ao gerar PDF.'); return; } const img = new Image(); await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = u ?? ''; }); const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }); const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight(), m = 8, aw = pw - m * 2, ah = ph - m * 2, r = img.width / img.height; let dw = aw, dh = dw / r; if (dh > ah) { dh = ah; dw = dh * r; } pdf.addImage(u ?? '', 'PNG', m + (aw - dw) / 2, m, dw, dh); pdf.save(`${fileName()}.pdf`); } finally { setExp('idle'); } };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <h3 className="text-2xl font-black text-[#231F20] dark:text-zinc-100 uppercase tracking-tighter italic">Grade <span className="text-[#E31E24]">Semanal</span></h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Visão geral por dia e professor</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {professores.length > 0 && (
                        <div className="relative">
                            <select value={filterProf} onChange={e => setFP(e.target.value)}
                                className="pl-8 pr-3 py-2 bg-white dark:bg-zinc-900 transition-colors border border-zinc-200 dark:border-zinc-700 transition-colors rounded-xl text-[10px] font-black text-zinc-600 uppercase focus:outline-none focus:ring-2 focus:ring-[#E31E24] appearance-none">
                                <option value="">Todos</option>
                                {professores.map(p => <option key={p.id} value={p.id}>{p.nomeCompleto}</option>)}
                            </select>
                            <svg className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button onClick={handlePNG} disabled={exporting !== 'idle'} className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50">
                            {exporting === 'png' ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                            PNG
                        </button>
                        <button onClick={handlePDF} disabled={exporting !== 'idle'} className="flex items-center gap-1.5 px-4 py-2.5 bg-[#E31E24] text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-700 transition-all shadow-sm disabled:opacity-50">
                            {exporting === 'pdf' ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                            PDF
                        </button>
                    </div>
                </div>
            </div>

            <div ref={exportRef}>
                {loading ? <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-zinc-200 dark:border-zinc-700 transition-colors border-t-[#E31E24] rounded-full animate-spin" /></div> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                        {DIAS.map(dia => (
                            <div key={dia} className={`rounded-2xl border ${DIA_COLOR[dia].border} overflow-hidden`}>
                                <div className={`px-4 py-2 ${DIA_COLOR[dia].bg}`}>
                                    <h4 className={`text-sm font-black uppercase tracking-widest ${DIA_COLOR[dia].text}`}>{DIA_LABEL[dia]}</h4>
                                </div>
                                <div className="p-3 space-y-2 bg-white dark:bg-zinc-900 transition-colors">
                                    {grade[dia].length === 0 ? <p className="text-zinc-400 text-xs font-bold">Nenhuma aula agendada.</p> :
                                        grade[dia].map((item, i) => (
                                            <div key={i} className="bg-zinc-50 dark:bg-zinc-950/50 transition-colors border border-zinc-100 dark:border-zinc-800 transition-colors rounded-xl p-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    {item.org.horario && <span className={`px-2 py-0.5 text-[9px] font-black rounded-full text-white ${DIA_COLOR[dia].badge}`}>{item.org.horario}</span>}
                                                    <p className="font-black text-[11px] text-[#231F20] dark:text-zinc-100 leading-tight">{item.prof?.nomeCompleto ?? '—'}</p>
                                                </div>
                                                <p className="text-[9px] text-zinc-500 font-bold uppercase">{item.turma.nome} · {item.turma.curso_nome}</p>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// PEDAGÓGICO MANAGER
// ─────────────────────────────────────────────────────────────────────────────

type PedTab = 'professores' | 'turmas' | 'grade';
const PED_TABS: { id: PedTab; label: string; icon: React.ReactNode }[] = [
    { id: 'professores', label: 'Professores', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
    { id: 'turmas', label: 'Org. de Turmas', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },
    { id: 'grade', label: 'Grade Semanal', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
];

const PedagogicoManager: React.FC<{ cursos: Curso[]; professores: Professor[] }> = ({ cursos, professores }) => {
    const [active, setActive] = useState<PedTab>('professores');
    return (
        <div className="space-y-5">
            <div className="flex flex-wrap gap-2 bg-zinc-50 dark:bg-zinc-950/50 transition-colors p-1.5 rounded-2xl border border-zinc-100 dark:border-zinc-800 transition-colors">
                {PED_TABS.map(t => (
                    <button key={t.id} onClick={() => setActive(t.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex-1 justify-center ${active === t.id ? 'bg-white dark:bg-zinc-900 transition-colors text-[#231F20] dark:text-zinc-100 shadow-sm border border-zinc-200 dark:border-zinc-700 transition-colors' : 'text-zinc-400 hover:text-zinc-600'}`}>
                        {t.icon}
                        <span className="hidden sm:inline">{t.label}</span>
                    </button>
                ))}
            </div>
            {active === 'professores' && <CadastroProfessores cursos={cursos} />}
            {active === 'turmas' && <OrganizacaoTurmas professores={professores} />}
            {active === 'grade' && <GradeSemanal professores={professores} />}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

type TopTab = 'pedagogico' | 'controle';
const TOP_TABS: { id: TopTab; label: string; icon: React.ReactNode }[] = [
    { id: 'pedagogico', label: 'Pedagógico', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
    { id: 'controle', label: 'Controle Semanal', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
];

const ControleSemanManager: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TopTab>('pedagogico');
    const [cursos, setCursos] = useState<Curso[]>([]);
    const [professores, setProfessores] = useState<Professor[]>(() => loadFromLS<Professor[]>(LS_PROFESSORES, []));

    useEffect(() => { setProfessores(loadFromLS<Professor[]>(LS_PROFESSORES, [])); }, [activeTab]);
    useEffect(() => { fetchCursos().then(setCursos).catch(() => { }); }, []);

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            <header className="flex items-center gap-3">
                <h2 className="text-4xl font-black text-[#231F20] dark:text-zinc-100 uppercase tracking-tighter italic leading-none">
                    Controle <span className="text-[#E31E24]">Semanal</span>
                </h2>
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-400 text-[#231F20] dark:text-zinc-100 text-[9px] font-black uppercase tracking-widest rounded-full">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg> Dev Only
                </span>
            </header>

            <div className="flex flex-wrap gap-2 bg-white dark:bg-zinc-900 transition-colors p-2 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 transition-colors">
                {TOP_TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex-1 justify-center ${activeTab === tab.id ? 'bg-[#231F20] text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-50 dark:bg-zinc-950/50 transition-colors hover:text-zinc-700'}`}>
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="min-h-[400px]">
                {activeTab === 'pedagogico' && <PedagogicoManager cursos={cursos} professores={professores} />}
                {activeTab === 'controle' && <ControleSemanalTable professores={professores} />}
            </div>
        </div>
    );
};

export default ControleSemanManager;
