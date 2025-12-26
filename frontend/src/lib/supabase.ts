import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
console.log(import.meta.env);
// Для локальной разработки - установить тестовую сессию
if (import.meta.env.DEV) {
  supabase.auth.setSession({
    access_token: 'fake_dev_token',
    refresh_token: 'fake_dev_token',
    user: {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', // ID тестового пользователя
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString()
    }
  } as any);
}
