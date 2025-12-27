import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// DEV MODE: Хелпер для получения пользователя в разработке
export async function getDevUser() {
  // В production используем реальную auth
  if (!import.meta.env.DEV) {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  // В dev-режиме возвращаем фейкового пользователя
  return {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };
}
