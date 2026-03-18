import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hhgsjzzkvewolzveipcf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoZ3NqenprdmV3b2x6dmVpcGNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY2OTI3OCwiZXhwIjoyMDg2MjQ1Mjc4fQ.2FZgG6udqKy-YF2izvIcICxauhVVvxCppihEr-E4mSg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data } = await supabase.from('turmas').select('id, nome, curso_id');
    const { data: cursos } = await supabase.from('cursos').select('id, nome');
    
    const cmap = {};
    cursos.forEach(c => cmap[c.id] = c.nome);

    const turmas = data.map(t => ({ id: t.id, nome: t.nome, curso: cmap[t.curso_id] }));
    console.log(JSON.stringify(turmas, null, 2));
}

run();
