import { supabase } from './supabaseClient';

export interface Curso {
    id: number;
    nome: string;
    descricao: string;
    valor: number;
    valor_rematricula: number;
    created_at: string;
    alunos_count?: number;
}

export type CursoInput = Omit<Curso, 'id' | 'created_at' | 'alunos_count'>;

export async function fetchCursos(): Promise<Curso[]> {
    const { data: cursos, error: cursosError } = await supabase.from('cursos').select('*').order('nome');
    if (cursosError) throw new Error(`Erro ao buscar cursos: ${cursosError.message}`);

    const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select('pacote')
        .neq('situacao', 'CANCELADO');

    if (enrollError) throw new Error(`Erro ao buscar matrículas: ${enrollError.message}`);

    const counts: Record<string, number> = {};
    enrollments?.forEach((e: any) => {
        const p = e.pacote;
        if (p) counts[p] = (counts[p] || 0) + 1;
    });

    return cursos.map((c: any) => ({
        ...c,
        alunos_count: counts[c.nome] || 0
    })) as Curso[];
}

export async function insertCurso(input: CursoInput): Promise<void> {
    const { error } = await supabase.from('cursos').insert(input);
    if (error) throw new Error(`Erro ao inserir curso: ${error.message}`);
}

export async function updateCurso(id: number, input: Partial<CursoInput>): Promise<void> {
    const { error } = await supabase.from('cursos').update(input).eq('id', id);
    if (error) throw new Error(`Erro ao atualizar curso: ${error.message}`);
}

export async function deleteCurso(id: number): Promise<void> {
    const { error } = await supabase.from('cursos').delete().eq('id', id);
    if (error) throw new Error(`Erro ao excluir curso: ${error.message}`);
}
