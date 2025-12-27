import { supabase } from '../lib/supabase';

export interface AuthLogPayload {
  action?: string;
  status?: 'success' | 'error';
  error?: string;
  token_expires?: string;
  instagram_user_id?: string;
  [key: string]: any;
}

export async function logAuthEvent(
  userId: string | null,
  event: string,
  payload: AuthLogPayload = {}
): Promise<void> {
  try {
    const { error } = await supabase
      .from('auth_logs')
      .insert({
        user_id: userId,
        event,
        payload,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to log auth event:', error);
    }
  } catch (err) {
    console.error('Error logging auth event:', err);
  }
}
