import { supabase } from './supabaseClient';

export interface EmailPayload {
    recipients: string[];
    subject: string;
    html: string;
}

export async function sendWeeklyReport(payload: EmailPayload) {
    const { data, error } = await supabase.functions.invoke('send-report', {
        body: payload,
    });

    if (error) {
        throw new Error(error.message || 'Erro ao chamar função de e-mail.');
    }

    return data;
}

export function generateReportHTML(
    mondayLabel: string, 
    semLabel: string, 
    cursoList: [string, { p: number, f: number }][],
    dbCursos: any,
    mondayISO: string
) {
    const totalP = cursoList.reduce((s, [, v]) => s + v.p, 0);
    const totalF = cursoList.reduce((s, [, v]) => s + v.f, 0);
    const totalM = totalP + totalF;

    const rows = cursoList.map(([curso, v]) => {
        const cd = (dbCursos[mondayISO] || {})[curso] || { pagos: '' };
        const mat = v.p + v.f;
        const pag = Number(cd.pagos) || 0;
        const freq = mat > 0 ? (v.p / mat) * 100 : 0;
        const freqStr = freq.toFixed(1);
        
        // Cor da barra de progresso baseado na frequencia
        const barColor = freq >= 75 ? '#2fb344' : freq >= 50 ? '#f59e0b' : '#e31e24';

        return `
            <tr>
                <td style="padding: 16px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle;">
                    <div style="font-weight: 800; font-size: 14px; color: #1e293b; text-transform: uppercase; letter-spacing: -0.5px;">${curso}</div>
                    <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">${pag > 0 ? `Pagos: ${pag}` : 'Sem reg. pgto'}</div>
                </td>
                <td style="padding: 16px 12px; border-bottom: 1px solid #f1f5f9; text-align: center; font-weight: 700; color: #334155;">${mat}</td>
                <td style="padding: 16px 12px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #2fb344; font-weight: 800;">${v.p}</td>
                <td style="padding: 16px 12px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #e31e24; font-weight: 700;">${v.f}</td>
                <td style="padding: 16px 12px; border-bottom: 1px solid #f1f5f9; text-align: right; min-width: 100px;">
                    <div style="font-size: 12px; font-weight: 900; color: #0f172a; margin-bottom: 4px;">${freqStr}%</div>
                    <div style="width: 100%; height: 6px; background: #f1f5f9; border-radius: 10px; overflow: hidden;">
                        <div style="width: ${freqStr}%; height: 100%; background: ${barColor}; border-radius: 10px;"></div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f4f4f4; padding-bottom: 40px; }
        .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; color: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .header { background-color: #231f20; padding: 40px 20px; text-align: center; position: relative; }
        .header-stripe { height: 6px; background-color: #e31e24; width: 100%; }
        .title { color: #e31e24; font-size: 11px; font-weight: 900; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 8px; }
        .semana-info { background: #f8fafc; border: 1px solid #f1f5f9; padding: 24px; border-radius: 12px; margin: 24px; text-align: center; }
        .table-container { padding: 0 24px 24px 24px; }
        table { width: 100%; border-collapse: collapse; }
        th { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; padding: 12px; text-align: left; border-bottom: 2px solid #f1f5f9; }
        .summary-card { margin: 24px; padding: 24px; border-radius: 16px; background: linear-gradient(135deg, #231f20 0%, #171717 100%); color: #ffffff; display: block; }
        .footer { padding: 30px; text-align: center; font-size: 11px; color: #94a3b8; background: #ffffff; }
    </style>
</head>
<body>
    <div class="wrapper">
        <center>
            <table class="main" role="presentation">
                <tr>
                        <div style="font-size: 42px; font-weight: 900; color: #ffffff; margin: 0; letter-spacing: -2px; line-height: 1;">T&T</div>
                        <div style="font-size: 14px; font-weight: 800; color: #fff200; margin-top: 5px; letter-spacing: 6px; text-transform: uppercase;">CURSOS</div>
                        <div style="color: #444; font-size: 8px; margin-top: 10px;">PREMIUM 2.0</div>
                    </td>
                </tr>
                <tr><td class="header-stripe"></td></tr>
                
                <tr>
                    <td style="padding: 40px 30px 0 30px; text-align: center;">
                        <div class="title">Controle Semanal</div>
                        <h1 style="font-size: 28px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -1px;">Relatório de Desempenho</h1>
                    </td>
                </tr>

                <tr>
                    <td>
                        <div class="semana-info">
                            <span style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">Período Analisado</span>
                            <span style="font-size: 18px; color: #1e293b; font-weight: 800;">${mondayLabel}</span>
                            ${semLabel ? `<div style="display: inline-block; padding: 2px 10px; background: #e31e24; color: #fff; font-size: 10px; font-weight: 900; border-radius: 20px; margin-top: 8px; vertical-align: middle; text-transform: uppercase;">${semLabel}</div>` : ''}
                        </div>
                    </td>
                </tr>

                <tr>
                    <td class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 40%;">Curso</th>
                                    <th style="text-align: center;">Matr.</th>
                                    <th style="text-align: center;">Pres.</th>
                                    <th style="text-align: center;">Fal.</th>
                                    <th style="text-align: right;">Frequência</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows}
                            </tbody>
                        </table>
                    </td>
                </tr>

                <tr>
                    <td>
                        <div class="summary-card">
                            <table style="width: 100%;">
                                <tr>
                                    <td style="width: 50%;">
                                        <div style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Total Matrículas</div>
                                        <div style="font-size: 32px; font-weight: 900; color: #ffffff;">${totalM} <span style="font-size: 14px; font-weight: 600; color: #64748b;">Geral</span></div>
                                    </td>
                                    <td style="width: 50%; text-align: right; border-left: 1px solid #334155; padding-left: 20px;">
                                        <div style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Presenças Totais</div>
                                        <div style="font-size: 32px; font-weight: 900; color: #2fb344;">${totalP} <span style="font-size: 14px; font-weight: 600; color: #1e3a22;">Alunos</span></div>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </td>
                </tr>

                <tr>
                    <td class="footer">
                        <div style="margin-bottom: 12px;">
                            <img src="https://img.icons8.com/ios-filled/24/94a3b8/guarantee.png" style="width: 20px; vertical-align: middle; margin-right: 8px;" />
                            <strong>Sistema OFC Alves</strong> - Inteligência em Gestão
                        </div>
                        <div style="font-size: 10px;">Enviado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                        <div style="margin-top: 20px; font-style: italic;">"Onde há planejamento, há sucesso."</div>
                    </td>
                </tr>
            </table>
        </center>
    </div>
</body>
</html>
    `;
}
