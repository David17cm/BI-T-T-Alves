
import { GoogleGenAI } from "@google/genai";
import { DashboardStats } from "../types";

export const getAIInsights = async (stats: DashboardStats): Promise<string> => {
  // Always initialize with named parameter. Note: This service appears unused in favor of aiService.ts (Edge Function).
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GOOGLE_API_KEY || '' });

  // Fixed: Changed totalRevenue to totalSales as per DashboardStats definition
  const prompt = `
    Analise os seguintes dados de desempenho de vendas da turma JAN/26:
    - Valor Total de Vendas (Contrato): R$ ${stats.totalSales.toLocaleString('pt-BR')}
    - Valor Total Recebido (Caixa): R$ ${stats.totalReceived.toLocaleString('pt-BR')}
    - Total de Matrículas: ${stats.totalEnrollments}
    - Desempenho por Atendente: ${stats.attendantMetrics.map(m => `${m.name}: R$ ${m.totalReceived.toLocaleString('pt-BR')} (${m.enrollmentCount} matrículas)`).join(', ')}
    - Distribuição de Status: ${stats.statusDistribution.map(s => `${s.name}: ${s.value}`).join(', ')}

    Por favor, forneça um breve resumo executivo em português (máximo 3 parágrafos) destacando:
    1. Quem é o atendente de maior destaque.
    2. A saúde geral da turma JAN/26 (considerando cancelamentos e receita).
    3. Uma recomendação para melhorar os resultados.
  `;

  try {
    // Using generateContent directly as per guidelines
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Access the .text property directly (do not call as a method)
    return response.text || "Não foi possível gerar insights no momento.";
  } catch (error) {
    console.error("Erro ao chamar Gemini:", error);
    return "Erro ao processar análise de IA.";
  }
};
