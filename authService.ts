import { supabase } from './supabaseClient';

export type UserRole = 'master' | 'admin' | 'auxiliar';

// Login por nome de usuário (busca o e-mail na tabela app_usuarios)
export async function signInWithUsername(username: string, password: string) {
  // Busca o e-mail associado ao nome de usuário
  const { data: usuario, error: lookupError } = await supabase
    .from('app_usuarios')
    .select('email')
    .eq('username', username.toLowerCase().trim())
    .single();

  if (lookupError || !usuario) {
    throw new Error('Usuário não encontrado.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: usuario.email,
    password,
  });

  if (error) {
    if (error.message.toLowerCase().includes('invalid')) {
      throw new Error('Senha incorreta.');
    }
    throw new Error(error.message);
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function getUserRole(user: { user_metadata?: { role?: string } } | null): UserRole {
  const role = user?.user_metadata?.role;
  if (role === 'master') return 'master';
  if (role === 'admin') return 'admin';
  return 'auxiliar';
}

export function onAuthStateChange(callback: (user: any | null, role: UserRole) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user ?? null;
    callback(user, getUserRole(user));
  });
}
