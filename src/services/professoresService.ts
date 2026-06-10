import { supabase } from './supabaseClient';

export interface Professor {
    id: string; // uuid in DB
    nomeCompleto: string;
    cursos: string[];
}

export async function fetchProfessores(): Promise<Professor[]> {
    const { data, error } = await supabase.from('professores').select('*').order('nome_completo');
    if (error) throw new Error(`Erro ao buscar professores: ${error.message}`);
    return data.map(d => ({
        id: d.id,
        nomeCompleto: d.nome_completo,
        cursos: d.cursos || []
    }));
}

export async function insertProfessor(p: Omit<Professor, 'id'>): Promise<Professor> {
    const { data, error } = await supabase.from('professores').insert({
        nome_completo: p.nomeCompleto,
        cursos: p.cursos
    }).select().single();
    if (error) throw new Error(`Erro ao inserir professor: ${error.message}`);
    
    return {
        id: data.id,
        nomeCompleto: data.nome_completo,
        cursos: data.cursos || []
    };
}

export async function updateProfessor(id: string, p: Omit<Professor, 'id'>): Promise<void> {
    const { error } = await supabase.from('professores').update({
        nome_completo: p.nomeCompleto,
        cursos: p.cursos
    }).eq('id', id);
    if (error) throw new Error(`Erro ao atualizar professor: ${error.message}`);
}

export async function deleteProfessor(id: string): Promise<void> {
    const { error } = await supabase.from('professores').delete().eq('id', id);
    if (error) throw new Error(`Erro ao excluir professor: ${error.message}`);
}
