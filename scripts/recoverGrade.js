import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hhgsjzzkvewolzveipcf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoZ3NqenprdmV3b2x6dmVpcGNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY2OTI3OCwiZXhwIjoyMDg2MjQ1Mjc4fQ.2FZgG6udqKy-YF2izvIcICxauhVVvxCppihEr-E4mSg';
const supabase = createClient(supabaseUrl, supabaseKey);

const professoresToCreate = [
    { nome_completo: 'Robert', cursos: ['Informática'] },
    { nome_completo: 'André', cursos: ['Recepcionista', 'Aux Administrativo', 'Operador de Caixa'] },
    { nome_completo: 'Clara', cursos: ['Inglês'] },
    { nome_completo: 'Jonathan', cursos: ['Informática'] },
    { nome_completo: 'Gabriel', cursos: ['Atendente de Farmácia'] },
    { nome_completo: 'Ítalo', cursos: ['Aux de Vet'] },
    { nome_completo: 'Vanessa', cursos: ['Aux de Vet'] },
    { nome_completo: 'Dayse', cursos: ['Aux Administrativo', 'Sec Escolar'] },
    { nome_completo: 'Andressa', cursos: ['Recepcionista', 'Cuidador de Idosos'] },
    { nome_completo: 'Kassia', cursos: ['Atendente de Farmácia'] }
];

const configuracoes = [
    { turma_id: 17, p: 'Robert', h: '08:00', d: ['SEG'] },        // Seg 08h Inf
    { turma_id: 43, p: 'André', h: '08:00', d: ['SEG'] },         // Seg 08h Recep
    { turma_id: 4,  p: 'Jonathan', h: '16:00', d: ['SEG'] },      // Seg 16h Inf
    { turma_id: 18, p: 'Jonathan', h: '18:00', d: ['SEG'] },      // Seg 18h Inf
    { turma_id: 6,  p: 'Jonathan', h: '20:00', d: ['SEG'] },      // Seg 20h Inf
    { turma_id: 1,  p: 'Robert', h: '09:30', d: ['TER'] },        // Ter 9:30h Inf
    { turma_id: 8,  p: 'Jonathan', h: '15:00', d: ['TER'] },      // Ter 15h Inf
    { turma_id: 44, p: 'Andressa', h: '19:00', d: ['TER'] },      // Ter 19h Recep
    { turma_id: 33, p: 'Kassia', h: '19:00', d: ['TER'] },        // Ter 19h Farmacia
    { turma_id: 19, p: 'Robert', h: '08:00', d: ['QUA'] },        // Qua 08h Inf
    { turma_id: 36, p: 'André', h: '08:00', d: ['QUA'] },         // Qua 08h Aux Adm
    { turma_id: 2,  p: 'Robert', h: '10:00', d: ['QUA'] },        // Qua 10h Inf
    { turma_id: 9,  p: 'Robert', h: '14:00', d: ['QUA'] },        // Qua 14h Inf
    { turma_id: 11, p: 'Jonathan', h: '16:00', d: ['QUA'] },      // Qua 16h Inf
    { turma_id: 37, p: 'Dayse', h: '19:00', d: ['QUA'] },         // Qua 19h Aux Adm
    { turma_id: 13, p: 'Jonathan', h: '20:00', d: ['QUA'] },      // Qua 20h Inf
    { turma_id: 45, p: 'Clara', h: '15:00', d: ['SEG', 'QUA'] },  // ingles seg/qua 15h
    { turma_id: 47, p: 'Clara', h: '09:00', d: ['TER', 'SEX'] },  // ingles ter/sex 09h
    { turma_id: 49, p: 'Clara', h: '19:00', d: ['QUA', 'SEX'] },  // QUA/SEX 19H
    { turma_id: 21, p: 'Robert', h: '07:30', d: ['QUI'] },        // Qui 7:30h Inf
    { turma_id: 3,  p: 'Robert', h: '09:30', d: ['QUI'] },        // Qui 9:30h Inf
    { turma_id: 10, p: 'Robert', h: '13:00', d: ['QUI'] },        // Qui 13h Inf
    { turma_id: 12, p: 'Jonathan', h: '15:00', d: ['QUI'] },      // Qui 15h Inf
    { turma_id: 31, p: 'André', h: '15:00', d: ['QUI'] },         // Qui 15h Op Caixa
    { turma_id: 15, p: 'Jonathan', h: '17:00', d: ['QUI'] },      // Qui 17h Inf
    { turma_id: 48, p: 'Dayse', h: '19:00', d: ['QUI'] },         // Qui 19h Sec Escol
    { turma_id: 16, p: 'Jonathan', h: '19:00', d: ['QUI'] },      // Qui 19h Inf
    { turma_id: 22, p: 'Robert', h: '08:00', d: ['SEX'] },        // Sex 08h Inf
    { turma_id: 14, p: 'Jonathan', h: '10:00', d: ['SEX'] },      // Sex 10h Inf
    { turma_id: 5,  p: 'Jonathan', h: '16:00', d: ['SEX'] },      // Sex 16h Inf
    { turma_id: 20, p: 'Jonathan', h: '18:00', d: ['SEX'] },      // Sex 18h Inf
    { turma_id: 39, p: 'Vanessa', h: '19:00', d: ['SEX'] },       // Sex 19h Aux Vet
    { turma_id: 24, p: 'Robert', h: '07:00', d: ['SAB'] },        // Sab 07h Inf
    { turma_id: 40, p: 'Ítalo', h: '07:00', d: ['SAB'] },         // Sab 07h Aux Vet
    { turma_id: 25, p: 'Robert', h: '09:00', d: ['SAB'] },        // Sab 09h Inf
    { turma_id: 34, p: 'Gabriel', h: '09:00', d: ['SAB'] },       // Sab 09h Farmacia
    { turma_id: 26, p: 'Robert', h: '11:00', d: ['SAB'] },        // Sab 11h Inf
    { turma_id: 27, p: 'Jonathan', h: '14:00', d: ['SAB'] },      // Sab 14h Inf
    { turma_id: 32, p: 'André', h: '14:00', d: ['SAB'] },         // Sab 14h Op Caixa
    { turma_id: 28, p: 'Jonathan', h: '16:00', d: ['SAB'] },      // Sab 16h Inf
    { turma_id: 35, p: 'Gabriel', h: '16:00', d: ['SAB'] },       // Sab 16h Farmacia
    { turma_id: 41, p: 'Vanessa', h: '17:00', d: ['SAB'] },       // Sab 17h Aux Vet
    { turma_id: 29, p: 'Jonathan', h: '18:00', d: ['SAB'] },      // Sab 18h Inf
    { turma_id: 38, p: 'André', h: '18:00', d: ['SAB'] },         // Sab 18h Aux Adm
];

async function run() {
    console.log('Fetching existing professores...');
    const { data: extProfs } = await supabase.from('professores').select('*');
    const profMap = {}; // name -> uuid

    console.log('Upserting professores...');
    for (const p of professoresToCreate) {
        let existing = extProfs.find(x => x.nome_completo.toLowerCase() === p.nome_completo.toLowerCase());
        if (existing) {
            profMap[p.nome_completo] = existing.id;
        } else {
            const { data, error } = await supabase.from('professores').insert([p]).select().single();
            if (error) { console.error('Erro prof:', error); continue; }
            profMap[p.nome_completo] = data.id;
            console.log(`Created professor: ${p.nome_completo}`);
        }
    }

    console.log('Upserting turmas_organizacao...');
    const rowsToUpsert = [];
    for (const cfg of configuracoes) {
        const pId = profMap[cfg.p];
        if (!pId) {
            console.warn(`Professor not found for ${cfg.p}`);
            continue;
        }
        rowsToUpsert.push({
            turma_id: cfg.turma_id,
            professor_id: pId,
            horario: cfg.h,
            dias_semana: cfg.d,
            updated_at: new Date().toISOString()
        });
    }

    if (rowsToUpsert.length > 0) {
        const { error } = await supabase.from('turmas_organizacao').upsert(rowsToUpsert, { onConflict: 'turma_id' });
        if (error) console.error('Error upserting turmas org:', error);
        else console.log(`Sucesso! ${rowsToUpsert.length} configurações restauradas.`);
    } else {
        console.log('Nenhuma configuracao para restaurar.');
    }
    process.exit(0);
}

run();
