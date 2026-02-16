
import { EnrollmentData, DashboardStats, AttendantMetric, CourseMetric, DailyEnrollment } from '../types';

const cleanNumeric = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val || val === '') return 0;

  let cleaned = val.toString()
    .replace(/\\/g, '')
    .replace(/R\$\s?/g, '')
    .replace(/[^\d,.-]/g, '')
    .trim();

  if (cleaned === '') return 0;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  if (lastComma > lastDot) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    cleaned = cleaned.replace(/,/g, '');
  } else if (lastComma !== -1) {
    cleaned = cleaned.replace(',', '.');
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
};

const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const cleanStr = dateStr.replace(/\\/g, '').trim();
  const parts = cleanStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return null;
};

export const processCSV = (csvText: string): EnrollmentData[] => {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  const rawHeaders = parseLine(lines[0]);
  const normalizedHeaders = rawHeaders.map(h =>
    h.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  );

  const findIdx = (keywords: string[]) => {
    return normalizedHeaders.findIndex(h => keywords.some(k => h.includes(k)));
  };

  const idxTurma = findIdx(["TURMA"]);
  const idxGerado = findIdx(["TOTAL A RECEBER"]);
  const idxRecebido = findIdx(["TOTAL RECEBIDO"]);
  const idxAtendente = findIdx(["ATENDENTE"]);
  const idxPacote = findIdx(["PACOTE", "CURSO"]);
  const idxData = findIdx(["DATA MATRICULA"]);
  const idxSituacao = findIdx(["SITUACAO"]);
  const idxAluno = findIdx(["ALUNO"]);

  const results: EnrollmentData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const lineText = lines[i].trim();
    if (!lineText) continue;

    const values = parseLine(lineText);

    const valorGerado = cleanNumeric(idxGerado !== -1 ? values[idxGerado] : 0);
    const valorRecebido = cleanNumeric(idxRecebido !== -1 ? values[idxRecebido] : 0);

    results.push({
      "Data Matrícula": idxData !== -1 ? values[idxData] : '',
      "Contrato": values[normalizedHeaders.indexOf("CONTRATO")] || '',
      "Aluno": idxAluno !== -1 ? values[idxAluno] : '',
      "Telefone": values[normalizedHeaders.indexOf("TELEFONE")] || '',
      "Pacote": idxPacote !== -1 ? values[idxPacote] : 'OUTROS',
      "Situação": idxSituacao !== -1 ? values[idxSituacao] : 'ATIVO',
      "Turma": values[idxTurma] || 'SEM TURMA',
      "Total a Receber": valorGerado,
      "Total Recebido": valorRecebido,
      "Valor Parcela": cleanNumeric(values[normalizedHeaders.indexOf("VALOR PARCELA")]),
      "Plano de Pagamento": values[normalizedHeaders.indexOf("PLANO DE PAGAMENTO")] || '',
      "Forma de Conhecimento": values[normalizedHeaders.indexOf("FORMA DE CONHECIMENTO")] || '',
      "Atendente": idxAtendente !== -1 ? values[idxAtendente] : 'NÃO INFORMADO',
      "Divulgador": values[normalizedHeaders.indexOf("DIVULGADOR")] || '',
      "Bolsa": values[normalizedHeaders.indexOf("BOLSA")] || '',
      "Entrada/1º Vencimento": values[normalizedHeaders.indexOf("ENTRADA/1º VENCIMENTO")] || '',
      "Dia Vencimento": parseInt(values[normalizedHeaders.indexOf("DIA VENCIMENTO")] || '0'),
      "Assinatura": values[normalizedHeaders.indexOf("ASSINATURA")] || ''
    });
  }

  return results;
};

function parseLine(line: string): string[] {
  const result = [];
  let cur = '';
  let inQuote = false;
  const delimiter = line.includes(';') ? ';' : ',';
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuote = !inQuote;
    else if (char === delimiter && !inQuote) {
      result.push(cur.trim().replace(/^"|"$/g, ''));
      cur = '';
    } else cur += char;
  }
  result.push(cur.trim().replace(/^"|"$/g, ''));
  return result;
}

export const getDashboardStats = (data: EnrollmentData[]): DashboardStats => {
  const attendantMap: Record<string, AttendantMetric> = {};
  const courseMap: Record<string, CourseMetric> = {};
  const statusMap: Record<string, number> = {};
  const dateMap: Record<string, { count: number, rawDate: Date }> = {};
  const classesSet = new Set<string>();

  let totalSales = 0;
  let totalReceived = 0;

  data.forEach((item) => {
    const attendant = item.Atendente;
    const pacote = item.Pacote;
    const gerado = item['Total a Receber'];
    const recebido = item['Total Recebido'];

    classesSet.add(item.Turma);

    totalSales += gerado;
    totalReceived += recebido;

    if (!attendantMap[attendant]) attendantMap[attendant] = { name: attendant, totalSales: 0, totalReceived: 0, enrollmentCount: 0 };
    attendantMap[attendant].totalSales += gerado;
    attendantMap[attendant].totalReceived += recebido;
    attendantMap[attendant].enrollmentCount += 1;

    if (!courseMap[pacote]) courseMap[pacote] = { name: pacote, totalSales: 0, totalReceived: 0, enrollmentCount: 0 };
    courseMap[pacote].totalSales += gerado;
    courseMap[pacote].totalReceived += recebido;
    courseMap[pacote].enrollmentCount += 1;

    statusMap[item['Situação']] = (statusMap[item['Situação']] || 0) + 1;

    const parsedDate = parseDate(item['Data Matrícula']);
    if (parsedDate) {
      const dateKey = item['Data Matrícula'].trim();
      if (!dateMap[dateKey]) dateMap[dateKey] = { count: 0, rawDate: parsedDate };
      dateMap[dateKey].count += 1;
    }
  });

  const totalEnrollments = data.length;
  const averageTicket = totalEnrollments > 0 ? totalSales / totalEnrollments : 0;

  return {
    totalSales: Math.round(totalSales * 100) / 100,
    totalReceived: Math.round(totalReceived * 100) / 100,
    totalEnrollments,
    averageTicket: Math.round(averageTicket * 100) / 100,
    availableClasses: Array.from(classesSet).sort(),
    attendantMetrics: Object.values(attendantMap).sort((a, b) => b.totalSales - a.totalSales),
    courseMetrics: Object.values(courseMap).sort((a, b) => b.totalSales - a.totalSales),
    statusDistribution: Object.entries(statusMap).map(([name, value]) => ({ name, value })),
    dailyEnrollments: Object.entries(dateMap).map(([date, v]) => ({ date, count: v.count, rawDate: v.rawDate })).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime())
  };
};
