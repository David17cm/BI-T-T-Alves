
import React, { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { EnrollmentData, DashboardStats, DailyEnrollment } from './types';
import { getDashboardStats } from './utils/csvProcessor';
import { fetchEnrollments, EnrollmentDataWithId } from './services/enrollmentService';
import AttendantChart from './components/AttendantChart';
import StatusChart from './components/StatusChart';
import EnrollmentTimeChart from './components/EnrollmentTimeChart';
import EnrollmentTable from './components/EnrollmentTable';
import AIAssistant from './components/AIAssistant';
import LoginPage from './components/LoginPage';
import { getSession, signOut, getUserRole, onAuthStateChange, UserRole } from './services/authService';

// Lazy load heavy components
const CursosManager = React.lazy(() => import('./components/CursosManager'));
const TurmasManager = React.lazy(() => import('./components/TurmasManager'));
const AlunosManager = React.lazy(() => import('./components/AlunosManager'));
const VendedoresManager = React.lazy(() => import('./components/VendedoresManager'));
const TrafegoCalendar = React.lazy(() => import('./components/TrafegoCalendar'));
const CobrancaManager = React.lazy(() => import('./components/CobrancaManager'));
const DesempenhoManager = React.lazy(() => import('./components/DesempenhoManager'));
const ReportAM = React.lazy(() => import('./components/ReportAM'));
const UsersManager = React.lazy(() => import('./components/UsersManager'));
const ChangePasswordModal = React.lazy(() => import('./components/ChangePasswordModal'));

type ViewType = 'overview' | 'commercial' | 'enrollments' | 'cursos' | 'turmas' | 'alunos' | 'vendedores' | 'trafego' | 'cobranca' | 'desempenho' | 'report_am' | 'usuarios';
type DateFilter = 'tudo' | 'ontem' | '7dias' | '14dias' | '30dias' | 'personalizado';

const App: React.FC = () => {
  // Auth state
  const [user, setUser] = useState<any | null>(null);
  const [role, setRole] = useState<UserRole>('auxiliar');
  const [authLoading, setAuthLoading] = useState(true);

  const [allData, setAllData] = useState<EnrollmentDataWithId[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewType>('overview');

  const [dateFilter, setDateFilter] = useState<DateFilter>('tudo');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [expandedCursos, setExpandedCursos] = useState<string[]>([]);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Auth initialization
  useEffect(() => {
    getSession().then(session => {
      const u = session?.user ?? null;
      const r = getUserRole(u);
      setUser(u);
      setRole(r);
      // Auxiliar começa na aba Matrículas (sem conteúdo financeiro)
      if (r === 'auxiliar') setActiveTab('enrollments');
      setAuthLoading(false);
    });
    const { data: listener } = onAuthStateChange((u, r) => {
      setUser(u);
      setRole(r);
      if (r === 'auxiliar') setActiveTab('enrollments');
    });
    return () => listener?.subscription?.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setRole('auxiliar');
  };

  const isAdmin = role === 'admin' || role === 'master';
  const isMaster = role === 'master';

  const availableClasses = useMemo(() => {
    const classes = Array.from(new Set(allData.map(d => d.Turma)));
    return classes.sort();
  }, [allData]);

  // Buscar dados do Supabase
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchEnrollments();
      setAllData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do Supabase.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Selecionar todas por padrão ao carregar dados
  useEffect(() => {
    if (allData.length > 0 && selectedClasses.length === 0) {
      // Select all compound keys by default
      const allKeys = Array.from(new Set(allData.map(d => `${d.Pacote}|${d.Turma}`)));
      setSelectedClasses(allKeys);
    }
  }, [allData]);

  // Group by Pacote (curso) -> Turma from enrollment data
  const cursoTurmaMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    allData.forEach(d => {
      const curso = d.Pacote || 'Outros';
      const key = `${curso}|${d.Turma}`;
      if (!map[curso]) map[curso] = [];
      if (!map[curso].includes(key)) {
        map[curso].push(key);
      }
    });
    return map;
  }, [allData]);

  // Friendly turma name from compound key
  const getTurmaName = (compoundKey: string) => compoundKey.split('|')[1] || compoundKey;

  // Recalcula estatísticas sempre que o dado bruto ou as turmas selecionadas mudarem
  useEffect(() => {
    if (allData.length > 0) {
      const filtered = selectedClasses.length > 0
        ? allData.filter(d => selectedClasses.includes(`${d.Pacote}|${d.Turma}`))
        : allData;

      setStats(getDashboardStats(filtered));
    }
  }, [allData, selectedClasses]);

  const filteredDailyData = useMemo(() => {
    if (!stats) return [];
    if (dateFilter === 'tudo') return stats.dailyEnrollments;

    const maxDateTime = Math.max(...(stats.dailyEnrollments || []).map(d => d.rawDate.getTime()));
    const refDate = new Date(maxDateTime);
    refDate.setHours(23, 59, 59, 999);

    return (stats.dailyEnrollments || []).filter(d => {
      const date = d.rawDate;
      const diffDays = (refDate.getTime() - date.getTime()) / (1000 * 3600 * 24);

      switch (dateFilter) {
        case 'ontem': return diffDays >= 1 && diffDays < 2;
        case '7dias': return diffDays <= 7;
        case '14dias': return diffDays <= 14;
        case '30dias': return diffDays <= 30;
        case 'personalizado':
          if (!startDate || !endDate) return true;
          const s = new Date(startDate);
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          return date >= s && date <= e;
        default: return true;
      }
    });
  }, [stats, dateFilter, startDate, endDate]);

  const toggleClass = (compoundKey: string) => {
    setSelectedClasses(prev =>
      prev.includes(compoundKey)
        ? prev.filter(c => c !== compoundKey)
        : [...prev, compoundKey]
    );
  };

  const toggleCurso = (cursoName: string) => {
    const cursoKeys = cursoTurmaMap[cursoName] || [];
    const allSelected = cursoKeys.every(k => selectedClasses.includes(k));
    if (allSelected) {
      setSelectedClasses(prev => prev.filter(c => !cursoKeys.includes(c)));
    } else {
      setSelectedClasses(prev => [...new Set([...prev, ...cursoKeys])]);
    }
  };

  const toggleExpandCurso = (cursoName: string) => {
    setExpandedCursos(prev =>
      prev.includes(cursoName) ? prev.filter(c => c !== cursoName) : [...prev, cursoName]
    );
  };

  // Auth loading spinner
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-zinc-200 border-t-[#E31E24] rounded-full animate-spin" />
      </div>
    );
  }

  // Login gate
  if (!user) {
    return <LoginPage onLogin={() => { }} />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col md:flex-row font-sans text-[#231F20]">

      {/* MOBILE HEADER */}
      <div className="md:hidden bg-[#231F20] text-white p-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-[#E31E24] p-1.5 rounded-lg transform -rotate-1">
            <span className="text-white text-lg font-black italic tracking-tighter leading-none">T&T</span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 italic">DASHBOARD</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-white hover:bg-white/10 rounded-lg">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </div>

      {/* SIDEBAR FIXA (DESKTOP) / DRAWER (MOBILE) */}
      <aside className={`fixed inset-y-0 left-0 bg-[#231F20] text-white flex flex-col shadow-2xl z-40 transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:sticky md:top-0 md:h-screen w-72 md:w-72`}>
        <div className="p-8 border-b border-white/10 flex flex-col items-center relative">
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden absolute top-4 right-4 text-zinc-500 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="bg-[#E31E24] p-4 rounded-xl shadow-2xl mb-4 transform -rotate-1 w-full max-w-[140px] text-center">
            <span className="text-white text-4xl font-black italic tracking-tighter leading-none">T&T</span>
            <br />
            <span className="text-[#FFF200] text-[10px] font-black tracking-[0.3em] uppercase">CURSOS</span>
          </div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mt-2 italic">DASHBOARD INTELIGENTE</h2>
          {/* User info + badge */}
          <div className="mt-4 flex flex-col items-center gap-1 w-full">
            <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${isAdmin ? 'bg-[#E31E24] text-white' : 'bg-white/10 text-zinc-400'}`}>
              {isAdmin ? '👑 Admin' : '👤 Auxiliar'}
            </span>
            <span className="text-[9px] text-zinc-600 font-semibold truncate max-w-full px-2 text-center">{user?.email}</span>
          </div>
        </div>

        <nav className="flex-grow p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {/* Visão Geral e Painel Comercial: somente Admin */}
          {isAdmin && (
            <>
              <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-[#E31E24] text-white shadow-lg' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
                Visão Geral
              </button>
              <button onClick={() => setActiveTab('commercial')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'commercial' ? 'bg-[#E31E24] text-white shadow-lg' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Painel Comercial
              </button>
            </>
          )}
          <button onClick={() => setActiveTab('enrollments')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'enrollments' ? 'bg-[#E31E24] text-white shadow-lg' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Matrículas
          </button>

          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-4">Cadastros</p>
          </div>
          <button onClick={() => setActiveTab('cursos')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'cursos' ? 'bg-[#E31E24] text-white shadow-lg' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            Cursos
          </button>
          <button onClick={() => setActiveTab('turmas')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'turmas' ? 'bg-[#E31E24] text-white shadow-lg' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            Turmas
          </button>

          <button onClick={() => setActiveTab('vendedores')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'vendedores' ? 'bg-[#E31E24] text-white shadow-lg' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Vendedores
          </button>
          <button onClick={() => setActiveTab('trafego')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'trafego' ? 'bg-[#E31E24] text-white shadow-lg' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Tráfego
          </button>
          <button onClick={() => setActiveTab('cobranca')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'cobranca' ? 'bg-[#E31E24] text-white shadow-lg' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Cobrança
          </button>
          <button onClick={() => setActiveTab('desempenho')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'desempenho' ? 'bg-[#E31E24] text-white shadow-lg' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Desempenho
          </button>
          {isAdmin && (
            <button onClick={() => setActiveTab('report_am')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'report_am' ? 'bg-[#E31E24] text-white shadow-lg' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Report AM
            </button>
          )}

          {/* Gerenciar Usuários: somente Master */}
          {isMaster && (
            <>
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-4">Sistema</p>
              </div>
              <button onClick={() => setActiveTab('usuarios')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'usuarios' ? 'bg-[#E31E24] text-white shadow-lg' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                Usuários
              </button>
            </>
          )}

          {Object.keys(cursoTurmaMap).length > 0 && (
            <div className="mt-8 px-4 pt-4 border-t border-white/10 pb-20">
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-4">Filtrar por Curso</p>
              <div className="space-y-1">
                {Object.keys(cursoTurmaMap).sort().map(cursoName => {
                  const cursoTurmas = cursoTurmaMap[cursoName];
                  const selectedCount = cursoTurmas.filter(t => selectedClasses.includes(t)).length;
                  const allSelected = selectedCount === cursoTurmas.length;
                  const someSelected = selectedCount > 0 && !allSelected;
                  const isExpanded = expandedCursos.includes(cursoName);

                  return (
                    <div key={cursoName}>
                      {/* Curso Header */}
                      <div className="flex items-center gap-2 group">
                        <button onClick={() => toggleCurso(cursoName)} className="flex items-center gap-2 flex-grow py-2 cursor-pointer">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${allSelected ? 'bg-[#E31E24] border-[#E31E24]' :
                            someSelected ? 'bg-[#E31E24]/40 border-[#E31E24]' :
                              'border-white/20 group-hover:border-white/40'
                            }`}>
                            {(allSelected || someSelected) && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                          </div>
                          <span className={`text-[10px] font-black uppercase truncate transition-all ${allSelected || someSelected ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
                            }`}>{cursoName}</span>
                        </button>
                        <button onClick={() => toggleExpandCurso(cursoName)} className="p-1 text-zinc-500 hover:text-white transition-all">
                          <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                        </button>
                        <span className="text-[8px] text-zinc-600 font-bold">{selectedCount}/{cursoTurmas.length}</span>
                      </div>

                      {/* Turmas Dropdown */}
                      {isExpanded && (
                        <div className="ml-6 space-y-1 pb-2">
                          {cursoTurmas.sort().map(compoundKey => (
                            <label key={compoundKey} className="flex items-center gap-2 cursor-pointer group py-1">
                              <input type="checkbox" className="hidden" checked={selectedClasses.includes(compoundKey)} onChange={() => toggleClass(compoundKey)} />
                              <div className={`w-3 h-3 rounded border-2 flex items-center justify-center transition-all ${selectedClasses.includes(compoundKey) ? 'bg-[#E31E24] border-[#E31E24]' : 'border-white/15 group-hover:border-white/30'}`}>
                                {selectedClasses.includes(compoundKey) && <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                              </div>
                              <span className={`text-[9px] font-semibold truncate transition-all ${selectedClasses.includes(compoundKey) ? 'text-zinc-300' : 'text-zinc-600 group-hover:text-zinc-400'}`}>{getTurmaName(compoundKey)}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </nav>
        {/* User Info & Settings */}
        <div className="p-4 border-t border-white/10">
          {isMaster && (
            <button
              onClick={() => setIsChangePasswordOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-800/50 text-zinc-300 font-bold uppercase tracking-widest text-[9px] rounded-xl hover:bg-zinc-800 hover:text-white transition-all mb-4 group"
            >
              <div className="w-6 h-6 rounded-lg bg-zinc-700/50 flex items-center justify-center group-hover:bg-[#E31E24] transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
              </div>
              Trocar Senha
            </button>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:bg-red-900/30 hover:text-[#E31E24] transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sair
          </button>
        </div>
      </aside>

      {/* OVERLAY MOBILE */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* AI BUTTON (FLOATING) */}
      <button
        onClick={() => setIsAIOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-[#231F20] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform border-2 border-[#E31E24] animate-bounce"
        title="Falar com IA"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
      </button>

      {/* AI COMPONENT */}
      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} stats={stats} />

      <main className="flex-grow p-4 md:p-10 overflow-y-auto max-h-screen custom-scrollbar w-full">

        {/* LOADING STATE */}
        {loading && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 border-8 border-zinc-200 border-t-[#E31E24] rounded-full animate-spin mb-6 mx-auto"></div>
            <p className="text-zinc-900 font-black uppercase tracking-widest text-[10px]">Carregando dados do Supabase...</p>
          </div>
        )}

        {/* ERROR STATE */}
        {error && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-center p-10 bg-white rounded-[3rem] shadow-inner border-4 border-dashed border-red-200">
            <svg className="w-16 h-16 text-[#E31E24] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h1 className="text-xl font-black text-[#E31E24] uppercase tracking-tighter mb-2">Erro ao Carregar</h1>
            <p className="text-zinc-500 font-bold text-sm mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-[#E31E24] text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-700 transition-all shadow-lg"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {/* MODULE VIEWS */}
        <Suspense fallback={
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 border-4 border-zinc-200 border-t-[#E31E24] rounded-full animate-spin mb-4"></div>
            <p className="text-zinc-400 font-bold uppercase tracking-widest text-[9px]">Carregando módulo...</p>
          </div>
        }>
          {activeTab === 'enrollments' && !loading && !error && <EnrollmentTable data={allData} onDataChanged={loadData} />}
          {activeTab === 'cursos' && <CursosManager enrollments={allData} onDataChanged={loadData} />}
          {activeTab === 'turmas' && <TurmasManager />}
          {activeTab === 'alunos' && <AlunosManager />}
          {activeTab === 'vendedores' && <VendedoresManager />}
          {activeTab === 'trafego' && <TrafegoCalendar />}
          {activeTab === 'cobranca' && <CobrancaManager isAdmin={isAdmin} />}
          {activeTab === 'desempenho' && <DesempenhoManager isAdmin={isAdmin} />}
          {activeTab === 'report_am' && isAdmin && <ReportAM />}
          {activeTab === 'usuarios' && isMaster && <UsersManager />}
        </Suspense>

        {/* EMPTY STATE */}
        {!stats && !loading && !error && (activeTab === 'overview' || activeTab === 'commercial') && (
          <div className="h-full flex flex-col items-center justify-center text-center p-10 bg-white rounded-[3rem] shadow-inner border-4 border-dashed border-zinc-100">
            <h1 className="text-3xl font-black text-[#231F20] uppercase tracking-tighter italic">BI <span className="text-[#E31E24]">FINANCEIRO</span></h1>
            <p className="text-zinc-400 mt-2 font-bold uppercase tracking-widest text-[10px]">Nenhum dado encontrado no banco de dados.</p>
          </div>
        )}

        {stats && (activeTab === 'overview' || activeTab === 'commercial') && (
          <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <h2 className="text-4xl font-black text-[#231F20] uppercase tracking-tighter italic leading-none">
                {activeTab === 'overview' ? 'BI' : 'Desempenho'} <span className="text-[#E31E24]">{activeTab === 'overview' ? 'ALVES' : 'Comercial'}</span>
              </h2>
              <div className="bg-[#231F20] text-white px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">
                Turmas: <span className="text-[#FFF200]">{selectedClasses.length > 0 ? selectedClasses.join(', ') : 'Todas'}</span>
              </div>
            </header>

            {/* CARDS RESUMO — valores financeiros só para admin */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {isAdmin ? (
                <>
                  <div className="bg-white rounded-[2rem] p-6 shadow-xl border-l-[10px] border-[#E31E24]">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total Gerado</p>
                    <div className="flex items-end gap-1">
                      <span className="text-xs font-black text-[#E31E24] mb-1">R$</span>
                      <h3 className="text-3xl font-black text-[#231F20] tracking-tighter">{stats.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                    </div>
                  </div>
                  <div className="bg-white rounded-[2rem] p-6 shadow-xl border-l-[10px] border-[#FFF200]">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total Recebido</p>
                    <div className="flex items-end gap-1">
                      <span className="text-xs font-black text-green-500 mb-1">R$</span>
                      <h3 className="text-3xl font-black text-[#231F20] tracking-tighter">{stats.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                    </div>
                  </div>
                  <div className="bg-white rounded-[2rem] p-6 shadow-xl border-l-[10px] border-[#231F20]">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Matrículas</p>
                    <div className="flex items-end gap-1">
                      <h3 className="text-3xl font-black text-[#231F20] tracking-tighter">{stats.totalEnrollments}</h3>
                      <span className="text-xs font-black text-zinc-400 mb-1 uppercase italic">Unid.</span>
                    </div>
                  </div>
                  <div className="bg-[#E31E24] rounded-[2rem] p-6 shadow-xl text-white transform hover:scale-105 transition-all">
                    <p className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-1">Ticket Médio</p>
                    <div className="flex items-end gap-1">
                      <span className="text-xs font-black text-white mb-1">R$</span>
                      <h3 className="text-3xl font-black text-white tracking-tighter">{stats.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                    </div>
                  </div>
                </>
              ) : (
                <div className="md:col-span-4 bg-white rounded-[2rem] p-6 shadow-xl border-l-[10px] border-[#231F20] flex items-center gap-4">
                  <div>
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Matrículas</p>
                    <div className="flex items-end gap-1">
                      <h3 className="text-3xl font-black text-[#231F20] tracking-tighter">{stats.totalEnrollments}</h3>
                      <span className="text-xs font-black text-zinc-400 mb-1 uppercase italic">Unid.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {activeTab === 'overview' && (
              <div className="space-y-10">
                {/* LISTAGEM POR PACOTE */}
                <section className="bg-white p-10 rounded-[3rem] shadow-sm">
                  <h4 className="text-xs font-black text-[#231F20] uppercase tracking-[0.2em] flex items-center gap-3 mb-10">
                    <span className="w-3 h-6 bg-[#E31E24] rounded-full"></span> Resultados por Pacote
                  </h4>
                  <div className="grid grid-cols-1 gap-6">
                    {stats.courseMetrics?.map((course, idx) => (
                      <div key={idx} className="bg-zinc-50 rounded-[2rem] p-8 border border-zinc-100 flex flex-col lg:flex-row lg:items-center gap-8 hover:shadow-md transition-all">
                        <div className="lg:w-1/3">
                          <span className="text-[9px] font-black text-[#E31E24] uppercase tracking-widest block mb-1">Nome do Pacote</span>
                          <h5 className="text-lg font-black text-[#231F20] uppercase tracking-tighter leading-tight">{course.name}</h5>
                          <span className="inline-block mt-2 bg-[#231F20] text-white text-[9px] font-black px-3 py-1 rounded-full">{course.enrollmentCount} VENDIDOS</span>
                        </div>
                        <div className="flex-grow grid grid-cols-2 gap-4 border-l border-zinc-200 lg:pl-10">
                          <div>
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total Gerado</p>
                            <p className="text-xl font-black text-[#231F20]">R$ {course.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total Recebido</p>
                            <p className="text-xl font-black text-green-600">R$ {course.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                        <div className="lg:w-48 text-right bg-white p-6 rounded-3xl shadow-inner border-t-8 border-[#E31E24]">
                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Efetividade</p>
                          <p className="text-3xl font-black text-[#231F20] tracking-tighter">
                            {course.totalSales > 0 ? ((course.totalReceived / course.totalSales) * 100).toFixed(1) : 0}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-sm">
                    <div className="flex flex-col gap-4 mb-8">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h4 className="text-[10px] font-black text-[#231F20] uppercase tracking-[0.2em]">Fluxo de Matrículas</h4>
                        <div className="flex flex-wrap gap-2">
                          {[{ id: 'tudo', label: 'TUDO' }, { id: 'ontem', label: 'ONTEM' }, { id: '7dias', label: '7 DIAS' }, { id: '14dias', label: '14 DIAS' }, { id: '30dias', label: '30 DIAS' }, { id: 'personalizado', label: 'PERSONALIZADO' }].map((f) => (
                            <button key={f.id} onClick={() => setDateFilter(f.id as DateFilter)} className={`px-3 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${dateFilter === f.id ? 'bg-[#E31E24] text-white shadow-lg' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}>{f.label}</button>
                          ))}
                        </div>
                      </div>
                      {dateFilter === 'personalizado' && (
                        <div className="flex flex-wrap items-center gap-3 bg-zinc-50 rounded-2xl px-5 py-3">
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">De:</span>
                          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-xs font-bold text-[#231F20] focus:outline-none focus:ring-2 focus:ring-[#E31E24]/30 focus:border-[#E31E24]" />
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Até:</span>
                          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-xs font-bold text-[#231F20] focus:outline-none focus:ring-2 focus:ring-[#E31E24]/30 focus:border-[#E31E24]" />
                          {startDate && endDate && (
                            <span className="text-[10px] font-bold text-zinc-500 ml-2">
                              {new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')} — {new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      )}
                      {/* Summary for filtered period */}
                      <div className="flex items-center gap-6">
                        <span className="text-[10px] font-bold text-zinc-400">
                          <span className="text-[#231F20] font-black">{filteredDailyData.reduce((s, d) => s + d.count, 0)}</span> matrícula{filteredDailyData.reduce((s, d) => s + d.count, 0) !== 1 ? 's' : ''} no período
                        </span>
                        {filteredDailyData.length > 0 && (
                          <span className="text-[10px] font-bold text-zinc-400">
                            {(() => { const d = filteredDailyData[0].rawDate; return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; })()}
                            {filteredDailyData.length > 1 && ` — ${(() => { const d = filteredDailyData[filteredDailyData.length - 1].rawDate; return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; })()}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <EnrollmentTimeChart data={filteredDailyData.map(d => ({ ...d, date: `${String(d.rawDate.getDate()).padStart(2, '0')}/${String(d.rawDate.getMonth() + 1).padStart(2, '0')}` }))} />
                  </div>
                  <div className="bg-white p-10 rounded-[3rem] shadow-sm">
                    <h4 className="text-[10px] font-black text-[#231F20] uppercase tracking-[0.2em] mb-8">Status das Vendas</h4>
                    <StatusChart data={stats.statusDistribution || []} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'commercial' && (
              <div className="bg-[#231F20] p-10 rounded-[3rem] shadow-2xl">
                <h3 className="text-2xl font-black uppercase text-white tracking-tighter italic mb-10">Ranking <span className="text-[#E31E24]">Atendentes (Selecionados)</span></h3>
                <div className="grid grid-cols-1 gap-4">
                  {stats.attendantMetrics?.map((attendant, index) => (
                    <div key={index} className="bg-white/5 p-8 rounded-[2rem] border border-white/10 flex flex-col lg:flex-row lg:items-center gap-6 group hover:bg-white/10 transition-all">
                      <div className="flex items-center gap-6 lg:w-1/3">
                        <div className="w-12 h-12 flex items-center justify-center bg-[#E31E24] rounded-xl font-black text-white">{index + 1}º</div>
                        <h4 className="text-xl font-black uppercase text-white tracking-tight">{attendant.name}</h4>
                      </div>
                      <div className="flex-grow grid grid-cols-3 gap-4 lg:px-10">
                        <div>
                          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Total Gerado</p>
                          <p className="text-lg font-black text-white">R$ {attendant.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Total Recebido</p>
                          <p className="text-lg font-black text-[#FFF200]">R$ {attendant.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Ticket Médio</p>
                          <p className="text-lg font-black text-zinc-300">R$ {(attendant.totalSales / attendant.enrollmentCount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col">
                        <span className="text-2xl font-black text-white">{attendant.enrollmentCount}</span>
                        <span className="text-[9px] font-black text-zinc-500 uppercase">Matrículas</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #E31E24; border-radius: 10px; }`}</style>

      {/* Modals */}
      <Suspense fallback={null}>
        {isChangePasswordOpen && <ChangePasswordModal onClose={() => setIsChangePasswordOpen(false)} />}
      </Suspense>
    </div>
  );
};

export default App;
