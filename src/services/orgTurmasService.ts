import { supabase } from './supabaseClient';

export type DiaSemana = 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB';

export interface TurmaOrg {
    turmaId: number;
    professorId: string;
    horario: string;
    diasSemana: DiaSemana[];
}

export async function fetchTurmasOrg(): Promise<Record<number, TurmaOrg>> {
    const { data, error } = await supabase.from('turmas_organizacao').select('*');
    if (error) throw new Error(`Erro ao buscar organização das turmas: ${error.message}`);
    
    const config: Record<number, TurmaOrg> = {};
    for (const row of data || []) {
        config[row.turma_id] = {
            turmaId: row.turma_id,
            professorId: row.professor_id || '',
            horario: row.horario || '',
            diasSemana: (row.dias_semana || []) as DiaSemana[]
        };
    }
    return config;
}

export async function upsertTurmasOrg(orgs: TurmaOrg[]): Promise<void> {
    if (orgs.length === 0) return;
    
    const rows = orgs.map(o => ({
        turma_id: o.turmaId,
        professor_id: o.professorId || null,
        horario: o.horario,
        dias_semana: o.diasSemana,
        updated_at: new Date().toISOString()
    }));
    
    // We use upsert with onConflict: 'turma_id' to update existing records or insert new ones
    const { error } = await supabase.from('turmas_organizacao').upsert(rows, { onConflict: 'turma_id' });
    if (error) throw new Error(`Erro ao salvar organização das turmas: ${error.message}`);
}
