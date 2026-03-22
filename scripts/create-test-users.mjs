import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Ler variáveis do .env atual
const envFile = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const serviceRoleKey = envFile.match(/VITE_SUPABASE_SERVICE_KEY=(.*)/)[1].trim();

const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    console.log('🔧 Corrigindo role do masterbialves...');

    // Fix masterbialves role metadata
    const { data: masterUser } = await admin.auth.admin.listUsers();
    const mbUser = masterUser?.users?.find(u => u.email === 'david.oficialstm@gmail.com');

    if (mbUser) {
        await admin.auth.admin.updateUserById(mbUser.id, {
            user_metadata: { role: 'master' }
        });
        console.log('✅ masterbialves atualizado para role=master');
    } else {
        console.log('👤 Criando novo masterbialves...');
        const { data: newMaster, error: masterError } = await admin.auth.admin.createUser({
            email: 'david.oficialstm@gmail.com',
            password: '22cm',
            email_confirm: true,
            user_metadata: { role: 'master' }
        });

        if (masterError) {
            console.error('❌ Erro ao criar master:', masterError.message);
        } else {
            const { error: insertError } = await admin.from('app_usuarios').upsert({
                username: 'masterbialves',
                email: 'david.oficialstm@gmail.com',
                role: 'master',
                ativo: true,
                auth_user_id: newMaster.user.id
            }, { onConflict: 'username' });

            if (insertError) console.error('❌ Erro ao inserir na tabela:', insertError.message);
            else console.log('✅ masterbialves criado com sucesso!');
        }
    }

    // Delete broken test user if exists
    const testeUser = masterUser?.users?.find(u => u.email === 'teste@master.com' || u.email === 'teste2@master.com');
    if (testeUser) {
        await admin.auth.admin.deleteUser(testeUser.id);
        console.log('🗑️  Usuário teste antigo removido');
    }

    // Create a clean auxiliar test user
    console.log('👤 Criando usuário auxiliar de teste...');
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email: 'auxiliar@teste.com',
        password: '123456',
        email_confirm: true,
        user_metadata: { role: 'auxiliar' }
    });

    if (createError) {
        console.error('❌ Erro ao criar auxiliar:', createError.message);
    } else {
        // Insert into app_usuarios
        const { error: insertError } = await admin.from('app_usuarios').upsert({
            username: 'auxiliar',
            email: 'auxiliar@teste.com',
            role: 'auxiliar',
            ativo: true,
            auth_user_id: newUser.user.id
        }, { onConflict: 'username' });

        if (insertError) {
            console.error('❌ Erro ao inserir na tabela:', insertError.message);
        } else {
            console.log('✅ Usuário auxiliar criado com sucesso!');
            console.log('   Usuario: auxiliar');
            console.log('   Senha:   123456');
            console.log('   Role:    auxiliar');
        }
    }

    // Also clean up app_usuarios for old test entries
    await admin.from('app_usuarios').delete().in('email', ['teste@master.com', 'teste2@master.com']);

    console.log('\n🎉 Pronto! Credenciais de teste:');
    console.log('   masterbialves / 22cm  → Master (todos os dados)');
    console.log('   auxiliar / 123456     → Auxiliar (sem valores financeiros)');
}

run().catch(console.error);
