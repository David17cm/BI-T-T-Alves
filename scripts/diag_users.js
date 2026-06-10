import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uongufxmmflqhfsumuiw.supabase.co';
const supabaseKey = 'sb_publishable_wCIwLLzuFlKpNMEt8aau0w_bWE0R7PW';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    try {
        const { data: users, error: usersError } = await supabase
            .from('app_usuarios')
            .select('username, email');

        if (usersError) {
            console.error('Error fetching app_usuarios:', usersError.message);
        } else {
            console.log('Registered Users in app_usuarios:');
            console.table(users);
        }
    } catch (err) {
        console.error('Script error:', err);
    }
}

checkUsers();
