
export interface EnrollmentData {
  "Data Matrícula": string;
  "Contrato": string | number;
  "Aluno": string;
  "Telefone": string;
  "Pacote": string;
  "Situação": string;
  "Turma": string;
  "Total a Receber": number;
  "Total Recebido": number;
  "Valor Parcela": number;
  "Plano de Pagamento": string;
  "Forma de Conhecimento": string;
  "Atendente": string;
  "Divulgador": string;
  "Bolsa": string;
  "Entrada/1º Vencimento": string;
  "Dia Vencimento": number;
  "Assinatura": string;
}

export interface AttendantMetric {
  name: string;
  totalSales: number;     // Valor Total do Contrato (Total a Receber)
  totalReceived: number;  // Valor que já foi pago (Total Recebido)
  enrollmentCount: number;
}

export interface CourseMetric {
  name: string;
  totalSales: number;
  totalReceived: number;
  enrollmentCount: number;
}

export interface DailyEnrollment {
  date: string;
  count: number;
  rawDate: Date;
}

export interface DashboardStats {
  totalSales: number;
  totalReceived: number;
  totalEnrollments: number;
  averageTicket: number;
  availableClasses: string[];
  attendantMetrics: AttendantMetric[];
  courseMetrics: CourseMetric[];
  statusDistribution: { name: string; value: number }[];
  dailyEnrollments: DailyEnrollment[];
}
