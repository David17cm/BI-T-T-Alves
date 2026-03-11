import { supabase } from './supabaseClient';

export interface Trafego {
    id: number;
    data: string;
    quantidade_mensagens: number;
    observacao: string;
    created_at: string;
}

export type TrafegoInput = Omit<Trafego, 'id' | 'created_at'>;

export async function fetchTrafego(month?: number, year?: number): Promise<Trafego[]> {
    let query = supabase.from('trafego').select('*').order('data', { ascending: true });

    if (month !== undefined && year !== undefined) {
        const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const endMonth = month + 1 > 11 ? 0 : month + 1;
        const endYear = month + 1 > 11 ? year + 1 : year;
        const endDate = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-01`;
        query = query.gte('data', startDate).lt('data', endDate);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Erro ao buscar tráfego: ${error.message}`);
    return data as Trafego[];
}

export async function insertTrafego(input: TrafegoInput): Promise<void> {
    const { error } = await supabase.from('trafego').insert(input);
    if (error) throw new Error(`Erro ao inserir tráfego: ${error.message}`);
}

export async function updateTrafego(id: number, input: Partial<TrafegoInput>): Promise<void> {
    const { error } = await supabase.from('trafego').update(input).eq('id', id);
    if (error) throw new Error(`Erro ao atualizar tráfego: ${error.message}`);
}

export async function deleteTrafego(id: number): Promise<void> {
    const { error } = await supabase.from('trafego').delete().eq('id', id);
    if (error) throw new Error(`Erro ao excluir tráfego: ${error.message}`);
}
