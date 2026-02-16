# Guia de Deploy na Vercel

Este guia passo a passo ajudará você a colocar o seu Dashboard de Vendas online usando a Vercel.

## 1. Pré-requisitos

Certifique-se de que seu projeto está no GitHub (ou GitLab/Bitbucket). A Vercel se conecta ao seu repositório para fazer o deploy automático.

## 2. Configuração na Vercel

1.  Acesse [vercel.com](https://vercel.com) e faça login.
2.  Clique em **"Add New..."** > **"Project"**.
3.  Selecione o repositório do seu projeto (`dashboard-de-vendas` ou o nome que você deu).
4.  Clique em **"Import"**.

## 3. Configurações de Compilação (Build)

A Vercel deve detectar automaticamente que é um projeto **Vite**.
As configurações padrão devem ser:
*   **Framework Preset:** Vite
*   **Root Directory:** `./` (ou a raiz do repositório)
*   **Build Command:** `vite build` (ou `npm run build`)
*   **Output Directory:** `dist`

## 4. Variáveis de Ambiente (MUITO IMPORTANTE)

Para que o site funcione e conecte ao seu banco de dados Supabase, você **precisa** configurar as seguintes variáveis de ambiente na Vercel.

Vá na seção **"Environment Variables"** antes de clicar em Deploy (ou nas configurações do projeto depois):

| Nome da Variável | Descrição | Onde encontrar |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | A URL do seu projeto Supabase | Supabase > Settings > API > Project URL |
| `VITE_SUPABASE_ANON_KEY` | A chave pública (anon) do Supabase | Supabase > Settings > API > Project API keys (anon public) |
| `VITE_GOOGLE_API_KEY` | (Opcional) Chave da API Google Gemini | Google AI Studio (caso use recursos locais de IA) |

**Atenção:**
*   Não use aspas nos valores.
*   Copie exatamente como aparecem no Supabase.

## 5. Finalizando

1.  Clique em **"Deploy"**.
2.  Aguarde o processo de build (pode levar 1-2 minutos).
3.  Se tudo der certo, você verá uma tela com fogos de artifício e o link do seu site (ex: `https://seu-projeto.vercel.app`).

## 6. Solução de Problemas Comuns

*   **Tela Branca ou Erro 404 ao atualizar a página:**
    *   Como é um Single Page Application (SPA), o Vite cuida disso, mas se tiver problemas de rota, crie um arquivo `vercel.json` na raiz com o seguinte conteúdo:
    ```json
    {
      "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
    }
    ```

*   **Erro de conexão com o Supabase:**
    *   Verifique se as variáveis de ambiente foram coladas corretamente.
    *   Às vezes é necessário fazer um "Redeploy" (na aba Deployments) após adicionar as variáveis.

---
**Observação sobre a IA:**
A funcionalidade de IA (`AIAssistant`) utiliza uma **Edge Function** no Supabase (`ai-chat`). Certifique-se de que você fez o deploy dessa função no Supabase para que o chat funcione corretamente em produção. O frontend apenas se comunica com ela.
