import { supabase } from './supabaseClient';
import { EnrollmentData } from '../types';
import { logAudit } from './auditService';

export interface SupabaseEnrollment {
    id: number;
    data_matricula: string | null;
    contrato: string | null;
    aluno: string | null;
    telefone: string | null;
    pacote: string | null;
    situacao: string | null;
    turma: string | null;
    total_a_receber: number;
    total_recebido: number;
    valor_parcela: number;
    plano_pagamento: string | null;
    forma_conhecimento: string | null;
    atendente: string | null;
    divulgador: string | null;
    bolsa: string | null;
    entrada_vencimento: string | null;
    dia_vencimento: number;
    assinatura: string | null;
    created_at: string;
}

export interface EnrollmentDataWithId extends EnrollmentData {
    id: number;
}

function toEnrollmentDataWithId(row: SupabaseEnrollment): EnrollmentDataWithId {
    let dataMatricula = '';
    if (row.data_matricula) {
        const parts = row.data_matricula.split('-');
        if (parts.length === 3) {
            dataMatricula = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
    }

    return {
        id: row.id,
        'Data Matrícula': dataMatricula,
        'Contrato': row.contrato || '',
        'Aluno': row.aluno || '',
        'Telefone': row.telefone || '',
        'Pacote': row.pacote || 'OUTROS',
        'Situação': row.situacao || 'ATIVO',
        'Turma': row.turma || 'SEM TURMA',
        'Total a Receber': row.total_a_receber || 0,
        'Total Recebido': row.total_recebido || 0,
        'Valor Parcela': row.valor_parcela || 0,
        'Plano de Pagamento': row.plano_pagamento || '',
        'Forma de Conhecimento': row.forma_conhecimento || '',
        'Atendente': row.atendente || 'NÃO INFORMADO',
        'Divulgador': row.divulgador || '',
        'Bolsa': row.bolsa || '',
        'Entrada/1º Vencimento': row.entrada_vencimento || '',
        'Dia Vencimento': row.dia_vencimento || 0,
        'Assinatura': row.assinatura || 'PRESENCIAL',
    };
}

function toSupabaseRow(data: Partial<EnrollmentData>): Record<string, unknown> {
    const row: Record<string, unknown> = {};

    if (data['Data Matrícula'] !== undefined) {
        const val = data['Data Matrícula'];
        if (!val) {
            row.data_matricula = null;
        } else if (val.includes('/')) {
            // DD/MM/YYYY → YYYY-MM-DD
            const parts = val.split('/');
            if (parts.length === 3 && parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length === 4) {
                row.data_matricula = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            } else {
                row.data_matricula = null;
            }
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
            // Already ISO YYYY-MM-DD
            row.data_matricula = val;
        } else {
            row.data_matricula = null;
        }
    }
    if (data['Contrato'] !== undefined) row.contrato = data['Contrato'];
    if (data['Aluno'] !== undefined) row.aluno = data['Aluno'];
    if (data['Telefone'] !== undefined) row.telefone = data['Telefone'];
    if (data['Pacote'] !== undefined) row.pacote = data['Pacote'];
    if (data['Situação'] !== undefined) row.situacao = data['Situação'];
    if (data['Turma'] !== undefined) row.turma = data['Turma'];
    if (data['Total a Receber'] !== undefined) row.total_a_receber = data['Total a Receber'];
    if (data['Total Recebido'] !== undefined) row.total_recebido = data['Total Recebido'];
    if (data['Valor Parcela'] !== undefined) row.valor_parcela = data['Valor Parcela'];
    if (data['Plano de Pagamento'] !== undefined) row.plano_pagamento = data['Plano de Pagamento'];
    if (data['Forma de Conhecimento'] !== undefined) row.forma_conhecimento = data['Forma de Conhecimento'];
    if (data['Atendente'] !== undefined) row.atendente = data['Atendente'];
    if (data['Divulgador'] !== undefined) row.divulgador = data['Divulgador'];
    if (data['Bolsa'] !== undefined) row.bolsa = data['Bolsa'];
    if (data['Entrada/1º Vencimento'] !== undefined) row.entrada_vencimento = data['Entrada/1º Vencimento'];
    if (data['Dia Vencimento'] !== undefined) row.dia_vencimento = data['Dia Vencimento'];
    if (data['Assinatura'] !== undefined) row.assinatura = data['Assinatura'];

    return row;
}

export interface FetchEnrollmentsOptions {
    turma?: string;
    dateFrom?: string; // YYYY-MM-DD
    dateTo?: string;   // YYYY-MM-DD
    page?: number;     // 0-indexed
    pageSize?: number;
}

export async function fetchEnrollments(options: FetchEnrollmentsOptions | string = {}): Promise<EnrollmentDataWithId[]> {
    // Suporte a chamada legacy com string (turma)
    const opts: FetchEnrollmentsOptions = typeof options === 'string' ? { turma: options } : options;
    const { turma, dateFrom, dateTo, page, pageSize = 50 } = opts;

    let query = supabase.from('enrollments').select('*');

    if (turma) query = query.eq('turma', turma);
    if (dateFrom) query = query.gte('data_matricula', dateFrom);
    if (dateTo) query = query.lte('data_matricula', dateTo);

    query = query.order('data_matricula', { ascending: true });

    if (page !== undefined) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(`Erro ao buscar matrículas: ${error.message}`);
    }

    return (data as SupabaseEnrollment[]).map(toEnrollmentDataWithId);
}

export async function insertEnrollment(data: EnrollmentData): Promise<void> {
    // Verificação de duplicidade (Aluno + Pacote)
    if (data['Aluno'] && data['Pacote']) {
        const { data: existing, error: searchError } = await supabase
            .from('enrollments')
            .select('id')
            .ilike('aluno', data['Aluno'])
            .eq('pacote', data['Pacote'])
            .limit(1);

        if (searchError) {
            throw new Error(`Erro ao verificar duplicidade: ${searchError.message}`);
        }

        if (existing && existing.length > 0) {
            throw new Error(`Ops! O aluno(a) ${data['Aluno']} já possui uma matrícula ativa no curso "${data['Pacote']}"!`);
        }
    }

    const row = toSupabaseRow(data);
    const { data: inserted, error } = await supabase.from('enrollments').insert(row).select('id').single();

    if (error) {
        throw new Error(`Erro ao inserir matrícula: ${error.message}`);
    }

    await logAudit('INSERT', 'enrollments', inserted?.id ?? null, { aluno: data['Aluno'], pacote: data['Pacote'] });
}

export async function updateEnrollment(id: number, data: Partial<EnrollmentData>): Promise<void> {
    const row = toSupabaseRow(data);
    const { error } = await supabase.from('enrollments').update(row).eq('id', id);

    if (error) {
        throw new Error(`Erro ao atualizar matrícula: ${error.message}`);
    }

    await logAudit('UPDATE', 'enrollments', id, data as Record<string, unknown>);
}

export async function deleteEnrollment(id: number): Promise<void> {
    // Busca informações antes de excluir para salvar no Log
    const { data: enrollment } = await supabase
        .from('enrollments')
        .select('aluno, pacote')
        .eq('id', id)
        .single();

    const { error } = await supabase.from('enrollments').delete().eq('id', id);

    if (error) {
        throw new Error(`Erro ao excluir matrícula: ${error.message}`);
    }

    await logAudit('DELETE', 'enrollments', id, {
        aluno: enrollment?.aluno || 'Desconhecido',
        pacote: enrollment?.pacote || 'Desconhecido'
    });
}
