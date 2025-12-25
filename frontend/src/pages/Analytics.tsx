import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';

interface Post {
  id: string;
  topic: string;
  status: string;
  scheduled_at: string;
  published_at: string | null;
  error_message: string | null;
}

interface Stats {
  total: number;
  published: number;
  pending: number;
  failed: number;
}

export function Analytics() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, published: 0, pending: 0, failed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get(`/api/analytics/${user.id}`);
      setPosts(response.data.posts);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
    
    setLoading(false);
  }

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Аналитика</h1>

      {/* Статистика */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Всего постов</div>
          <div className="text-3xl font-bold">{stats.total}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Опубликовано</div>
          <div className="text-3xl font-bold text-green-600">{stats.published}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Ожидают</div>
          <div className="text-3xl font-bold text-blue-600">{stats.pending}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Ошибки</div>
          <div className="text-3xl font-bold text-red-600">{stats.failed}</div>
        </div>
      </div>

      {/* Список постов */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">История постов</h2>
        </div>
        
        <div className="divide-y">
          {posts.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              Постов пока нет
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium">{post.topic}</div>
                  <div className="text-sm text-gray-500">
                    Запланировано: {new Date(post.scheduled_at).toLocaleString('ru-RU')}
                  </div>
                  {post.published_at && (
                    <div className="text-sm text-gray-500">
                      Опубликовано: {new Date(post.published_at).toLocaleString('ru-RU')}
                    </div>
                  )}
                  {post.error_message && (
                    <div className="text-sm text-red-600">
                      Ошибка: {post.error_message}
                    </div>
                  )}
                </div>
                
                <div className="ml-4">
                  {post.status === 'published' && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      Опубликован
                    </span>
                  )}
                  {post.status === 'pending' && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      Ожидает
                    </span>
                  )}
                  {post.status === 'failed' && (
                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                      Ошибка
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
