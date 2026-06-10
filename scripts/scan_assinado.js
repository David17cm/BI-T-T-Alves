
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://hhgsjzzkvewolzveipcf.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoZ3NqenprdmV3b2x6dmVpcGNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY2OTI3OCwiZXhwIjoyMDg2MjQ1Mjc4fQ.2FZgG6udqKy-YF2izvIcICxauhVVvxCppihEr-E4mSg');

async function main() {
    const { data, error } = await supabase.from('enrollments').select('*');
    if (error) {
        console.error(error);
        return;
    }
    
    const fieldsWithAssinado = new Set();
    const studentsWithAssinado = [];

    data.forEach(row => {
        let hasAssinado = false;
        for (const [key, value] of Object.entries(row)) {
            if (value && typeof value === 'string' && value.toLowerCase().includes('assinado')) {
                fieldsWithAssinado.add(key);
                hasAssinado = true;
            }
        }
        if (hasAssinado) {
            studentsWithAssinado.push(row.aluno);
        }
    });

    console.log('Fields containing "Assinado":', Array.from(fieldsWithAssinado));
    console.log('Students with "Assinado":', studentsWithAssinado);
    
    // Also check for specific values of 'assinatura' again
    const signatures = new Set(data.map(d => d.assinatura));
    console.log('Unique signatures:', Array.from(signatures));
}

main();
