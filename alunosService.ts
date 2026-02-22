import { supabase } from './supabaseClient';

export interface Aluno {
    id: number;
    nome: string;
    email: string;
    cpf: string;
    endereco: string;
    vendedor_id: number | null;
    vendedor_nome?: string;
    created_at: string;
}

export type AlunoInput = Omit<Aluno, 'id' | 'created_at' | 'vendedor_nome'>;

export async function fetchAlunos(): Promise<Aluno[]> {
    const { data, error } = await supabase
        .from('alunos')
        .select('*, vendedores(nome)')
        .order('nome');
    if (error) throw new Error(`Erro ao buscar alunos: ${error.message}`);
    return (data as any[]).map(row => ({
        ...row,
        vendedor_nome: row.vendedores?.nome || '—',
        vendedores: undefined,
    }));
}

export async function insertAluno(input: AlunoInput): Promise<void> {
    const { error } = await supabase.from('alunos').insert(input);
    if (error) throw new Error(`Erro ao inserir aluno: ${error.message}`);
}

export async function updateAluno(id: number, input: Partial<AlunoInput>): Promise<void> {
    const { error } = await supabase.from('alunos').update(input).eq('id', id);
    if (error) throw new Error(`Erro ao atualizar aluno: ${error.message}`);
}

export async function deleteAluno(id: number): Promise<void> {
    const { error } = await supabase.from('alunos').delete().eq('id', id);
    if (error) throw new Error(`Erro ao excluir aluno: ${error.message}`);
}
