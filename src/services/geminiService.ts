
import { GoogleGenAI } from "@google/genai";
import { DashboardStats } from "../types";

export const getAIInsights = async (prompt: string, apiKey?: string): Promise<string> => {
  const finalApiKey = apiKey || import.meta.env.VITE_GOOGLE_API_KEY || '';
  
  if (!finalApiKey) {
    throw new Error("Google API Key não configurada.");
  }

  const ai = new GoogleGenAI({ 
    apiKey: finalApiKey,
    apiVersion: 'v1'
  });

  // Função interna para diagnóstico se der erro
  const logAvailableModels = async () => {
    try {
      const response = await ai.models.list();
      console.log("Resposta de diagnóstico (lista de modelos):", response);
    } catch (e) {
      console.warn("Não foi possível listar modelos para diagnóstico.");
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });
    return response.text || "Não foi possível gerar resposta no momento.";
  } catch (error: any) {
    console.error("Erro detalhado ao chamar Gemini:", error);
    
    // Tenta diagnóstico se for erro de modelo não encontrado
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      await logAvailableModels();
      
      // Tentativa de fallback para modelo mais antigo/estável
      try {
        console.log("Tentando fallback para gemini-pro...");
        const fallback = await ai.models.generateContent({
          model: 'gemini-pro',
          contents: prompt,
        });
        return fallback.text || "Não foi possível gerar resposta no momento.";
      } catch (err) {
        throw new Error(`A sua chave não encontrou o modelo gemini-1.5-flash. Verifique seu projeto no Google AI Studio. (Erro: ${error.message})`);
      }
    }

    if (error.message?.includes('401') || error.message?.includes('API_KEY_INVALID')) {
      throw new Error("Chave de API inválida. Verifique a chave nas configurações do chat.");
    }
    
    const errorMessage = error.message || 'Falha na comunicação';
    throw new Error(`Erro na IA: ${errorMessage}`);
  }
};
