import { supabase } from './supabaseClient';
import { DiaSemana } from './orgTurmasService';

export interface CtrlEntry { p: string; f: string; }

export interface ControleRow {
    id: string;
    professorId: string;
    cursoNome: string;
    totalAlunos: string;
    dias: Partial<Record<DiaSemana, CtrlEntry>>;
}

export type CursosDBType = Record<string, Record<string, { matriculados: string; pagos: string }>>;
export type ControleRowsDBType = Record<string, ControleRow[]>;

export async function fetchControleSemanal(mondayIso: string): Promise<{ rows: ControleRow[], cursos: Record<string, { matriculados: string; pagos: string }> }> {
    const { data, error } = await supabase
        .from('controle_semanal')
        .select('*')
        .eq('monday_iso', mondayIso)
        .maybeSingle();

    if (error) throw new Error(`Erro ao buscar controle semanal: ${error.message}`);
    
    if (!data) {
        return { rows: [], cursos: {} };
    }
    
    return {
        rows: (data.rows_data as ControleRow[]) || [],
        cursos: (data.cursos_data as Record<string, { matriculados: string; pagos: string }>) || {}
    };
}

export async function upsertControleSemanal(mondayIso: string, rows: ControleRow[], cursos: Record<string, { matriculados: string; pagos: string }>): Promise<void> {
    const { error } = await supabase.from('controle_semanal').upsert({
        monday_iso: mondayIso,
        rows_data: rows,
        cursos_data: cursos,
        updated_at: new Date().toISOString()
    }, { onConflict: 'monday_iso' });
    
    if (error) throw new Error(`Erro ao salvar controle semanal: ${error.message}`);
}
