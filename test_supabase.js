import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1];
const supabaseKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data: turmas, error } = await supabase.from('turmas').select('*');
    if (error) console.error(error);
    else console.log('Turmas count:', turmas.length);
    console.log('Sample turma:', turmas[0]);
}

test();
