import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

export function Settings() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
    checkAuthStatus();
  }, []);

  async function loadUser() {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (authUser) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();
      
      setUser(data);
    }
    
    setLoading(false);
  }

  function checkAuthStatus() {
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get('auth');
    
    if (authStatus === 'success') {
      alert('Instagram подключен успешно!');
      loadUser();
    } else if (authStatus === 'error') {
      alert('Ошибка подключения Instagram');
    }
  }

  function handleConnectInstagram() {
    if (!user) return;
    window.location.href = `${api.defaults.baseURL}/api/auth/instagram/login?user_id=${user.id}`;
  }

  if (loading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Настройки</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Instagram Подключение</h2>

        {user?.ig_user_id ? (
          <div className="space-y-3">
            <div className="flex items-center text-green-600">
              <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              <span className="font-medium">Instagram подключен</span>
            </div>
            
            <div className="text-sm text-gray-600">
              <p>Instagram Business ID: {user.ig_user_id}</p>
              <p>Токен истекает: {new Date(user.ig_token_expires_at).toLocaleDateString('ru-RU')}</p>
            </div>

            <button
              onClick={handleConnectInstagram}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Переподключить
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              Подключите ваш Instagram Business аккаунт для автоматической публикации постов.
            </p>
            
            <button
              onClick={handleConnectInstagram}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition"
            >
              Подключить Instagram
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
