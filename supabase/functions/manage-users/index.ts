import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 1. Verify the caller is authenticated and is a master user
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Admin client using service role (server-side only — never exposed to browser)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // Verify caller's JWT and get their role from app_usuarios
        const callerClient = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
        if (authError || !caller) throw new Error('Token inválido.');

        const callerRole = caller.user_metadata?.role;
        if (callerRole !== 'master') {
            return new Response(JSON.stringify({ error: 'Acesso negado. Apenas o Master pode gerenciar usuários.' }), {
                status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 2. Process the action
        const { action, ...payload } = await req.json();

        if (action === 'create') {
            const { username, email, password, role } = payload;
            if (!username || !email || !password || !role) throw new Error('Campos obrigatórios faltando.');

            const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
                email, password,
                user_metadata: { role },
                email_confirm: true,
            });
            if (authErr) throw new Error(authErr.message);

            const { error: insertErr } = await supabaseAdmin.from('app_usuarios').insert({
                username: username.toLowerCase().trim(),
                email: email.toLowerCase().trim(),
                role,
                ativo: true,
                auth_user_id: authData.user.id,
            });
            if (insertErr) {
                // Rollback auth user if table insert fails
                await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
                throw new Error(insertErr.message);
            }
            return new Response(JSON.stringify({ success: true, userId: authData.user.id }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'delete') {
            const { userId, authUserId } = payload;
            if (authUserId) await supabaseAdmin.auth.admin.deleteUser(authUserId);
            await supabaseAdmin.from('app_usuarios').delete().eq('id', userId);
            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'toggle') {
            const { userId, ativo } = payload;
            await supabaseAdmin.from('app_usuarios').update({ ativo }).eq('id', userId);
            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ error: 'Ação desconhecida.' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
