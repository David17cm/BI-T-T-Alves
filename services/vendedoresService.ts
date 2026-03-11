import { supabase } from './supabaseClient';

export interface Vendedor {
    id: number;
    nome: string;
    telefone: string;
    email: string;
    comissao: number;
    foto_url: string | null;
    created_at: string;
}

export type VendedorInput = Omit<Vendedor, 'id' | 'created_at'>;

export async function fetchVendedores(): Promise<Vendedor[]> {
    const { data, error } = await supabase.from('vendedores').select('*').order('nome');
    if (error) throw new Error(`Erro ao buscar vendedores: ${error.message}`);
    return data as Vendedor[];
}

export async function insertVendedor(input: VendedorInput): Promise<void> {
    const { error } = await supabase.from('vendedores').insert(input);
    if (error) throw new Error(`Erro ao inserir vendedor: ${error.message}`);
}

export async function updateVendedor(id: number, input: Partial<VendedorInput>): Promise<void> {
    const { error } = await supabase.from('vendedores').update(input).eq('id', id);
    if (error) throw new Error(`Erro ao atualizar vendedor: ${error.message}`);
}

export async function deleteVendedor(id: number): Promise<void> {
    const { error } = await supabase.from('vendedores').delete().eq('id', id);
    if (error) throw new Error(`Erro ao excluir vendedor: ${error.message}`);
}
