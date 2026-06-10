import { supabase } from './supabaseClient';

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';

export interface AuditLog {
    id: number;
    created_at: string;
    user_email: string;
    action: AuditAction;
    table_name: string;
    row_id: number | null;
    details: Record<string, unknown> | null;
}

/**
 * Grava uma entrada na tabela audit_logs do Supabase.
 * Silencia erros para nunca bloquear a operação principal.
 */
export async function logAudit(
    action: AuditAction,
    tableName: string,
    rowId: number | null,
    details?: Record<string, unknown>
): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('audit_logs').insert({
            user_email: user?.email ?? 'desconhecido',
            action,
            table_name: tableName,
            row_id: rowId,
            details: details ?? null,
        });
    } catch {
        // Nunca bloquear a operação principal por falha de log
    }
}

/**
 * Busca todos os logs de auditoria (apenas para Master).
 */
export async function fetchAuditLogs(): Promise<AuditLog[]> {
    const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

    if (error) throw new Error(`Erro ao buscar logs: ${error.message}`);
    return (data ?? []) as AuditLog[];
}
