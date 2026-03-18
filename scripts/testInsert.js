import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hhgsjzzkvewolzveipcf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoZ3NqenprdmV3b2x6dmVpcGNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NjkyNzgsImV4cCI6MjA4NjI0NTI3OH0.yM72XgOny6KYh50n0SQeoNJZ42N6IX9TJRyGVO7G-xM'; // anon key
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase.from('professores').insert({
        nome_completo: 'Test',
        cursos: ['Informática']
    }).select().single();
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success:', data);
    }
}

run();
