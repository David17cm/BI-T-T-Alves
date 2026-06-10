import { supabase } from './supabaseClient';

export const sendMessageToAI = async (
    history: { role: string; text: string }[],
    context: string,
    userMessage: string,
    userApiKey?: string
) => {
    try {
        // Se houver uma chave do usuário, podemos tentar usar o SDK do Google direto no frontend
        // para maior velocidade e independência da Edge Function se necessário.
        // No momento, vamos apenas passá-la como header se existisse suporte, 
        // mas o ideal é usar o geminiService.ts se tivermos a chave.
        
        if (userApiKey) {
            const { getAIInsights } = await import('./geminiService');
            // Mock de contexto para o geminiService que espera DashboardStats
            return await getAIInsights(userMessage, userApiKey);
        }

        const { data: { session } } = await supabase.auth.getSession();

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`,
                'apikey': supabaseAnonKey,
            },
            body: JSON.stringify({
                message: userMessage,
                context,
                history,
            }),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `Erro ${response.status}`);
        }

        const data = await response.json();
        return data.reply;
    } catch (error: any) {
        console.error('Erro ao comunicar com a IA:', error);
        throw new Error(error.message || 'Falha ao comunicar com a IA.');
    }
};
