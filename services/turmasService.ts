import { supabase } from './supabaseClient';

export interface Turma {
    id: number;
    nome: string;
    curso_id: number | null;
    curso_nome?: string;
    data_inicio: string | null;
    data_fim: string | null;
    status: string;
    created_at: string;
}

export type TurmaInput = Omit<Turma, 'id' | 'created_at' | 'curso_nome'>;

export async function fetchTurmas(): Promise<Turma[]> {
    const { data, error } = await supabase
        .from('turmas')
        .select('*, cursos(nome)')
        .order('nome');
    if (error) throw new Error(`Erro ao buscar turmas: ${error.message}`);
    return (data as any[]).map(row => ({
        ...row,
        curso_nome: row.cursos?.nome || '—',
        cursos: undefined,
    }));
}

export async function insertTurma(input: TurmaInput): Promise<void> {
    const { error } = await supabase.from('turmas').insert(input);
    if (error) throw new Error(`Erro ao inserir turma: ${error.message}`);
}

export async function updateTurma(id: number, input: Partial<TurmaInput>): Promise<void> {
    const { error } = await supabase.from('turmas').update(input).eq('id', id);
    if (error) throw new Error(`Erro ao atualizar turma: ${error.message}`);
}

export async function deleteTurma(id: number): Promise<void> {
    const { error } = await supabase.from('turmas').delete().eq('id', id);
    if (error) throw new Error(`Erro ao excluir turma: ${error.message}`);
}
