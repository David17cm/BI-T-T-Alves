import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Manually parse .env because dotenv might not be installed or working same way
const env = Object.fromEntries(
    fs.readFileSync('.env', 'utf-8')
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => line.split('=').map(s => s.trim()))
);

const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceKey = env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function checkAndFix() {
    console.log('Using Supabase URL:', supabaseUrl);
    
    // 1. Check if user exists in app_usuarios
    const { data: usuario, error: lookupError } = await supabase
        .from('app_usuarios')
        .select('*')
        .eq('username', 'masterbialves');
    
    if (lookupError) {
        console.error('Error querying app_usuarios:', lookupError.message);
    } else {
        console.log('User in app_usuarios:', usuario);
    }

    // 2. list users in Auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        console.error('Error listing auth users:', listError.message);
    } else {
        const found = users.find(u => u.email === 'david.oficialstm@gmail.com');
        console.log('User in Auth (david.oficialstm@gmail.com):', found ? 'Found' : 'Not Found');
    }
}

checkAndFix();
