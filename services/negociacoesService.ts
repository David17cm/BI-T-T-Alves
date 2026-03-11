import { supabase } from './supabaseClient';
import { logAudit } from './auditService';

export type StatusNegociacao = 'Pago' | 'Aguardando pagamento' | 'Atrasado' | 'Reagendado';

export interface Negociacao {
    id: number;
    enrollment_id: number | null;
    aluno: string;
    telefone: string | null;
    atendente: string;
    valor_negociado: number;
    status: StatusNegociacao;
    data_contato: string;
    data_promessa: string;
    observacao: string | null;
    created_at: string;
}

export interface NegociacaoInput {
    enrollment_id?: number | null;
    aluno: string;
    telefone?: string | null;
    atendente: string;
    valor_negociado: number;
    status: StatusNegociacao;
    data_contato: string;
    data_promessa: string;
    observacao?: string | null;
}

export async function fetchNegociacoes(): Promise<Negociacao[]> {
    const { data, error } = await supabase
        .from('negociacoes')
        .select('*')
        .order('data_contato', { ascending: false });

    if (error) {
        throw new Error(`Erro ao buscar negociações: ${error.message}`);
    }
    return data || [];
}

export async function insertNegociacao(data: NegociacaoInput): Promise<void> {
    const { data: inserted, error } = await supabase.from('negociacoes').insert(data).select('id').single();
    if (error) {
        throw new Error(`Erro ao inserir negociação: ${error.message}`);
    }
    await logAudit('INSERT', 'negociacoes', inserted?.id ?? null, { aluno: data.aluno, valor: data.valor_negociado });
}

export async function updateNegociacao(id: number, data: Partial<NegociacaoInput>): Promise<void> {
    const { error } = await supabase.from('negociacoes').update(data).eq('id', id);
    if (error) {
        throw new Error(`Erro ao atualizar negociação: ${error.message}`);
    }
    await logAudit('UPDATE', 'negociacoes', id, data as Record<string, unknown>);
}

export async function deleteNegociacao(id: number): Promise<void> {
    const { data: neg } = await supabase.from('negociacoes').select('aluno').eq('id', id).single();

    const { error } = await supabase.from('negociacoes').delete().eq('id', id);
    if (error) {
        throw new Error(`Erro ao excluir negociação: ${error.message}`);
    }
    await logAudit('DELETE', 'negociacoes', id, { aluno: neg?.aluno || 'Desconhecido' });
}
