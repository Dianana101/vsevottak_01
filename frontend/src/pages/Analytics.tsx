import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AnalyticsData {
  id: string;
  post_id: string;
  instagram_media_id: string;
  likes: number;
  comments: number;
  saves: number;
  reach: number;
  impressions: number;
  engagement_rate: number;
  fetched_at: string;
  posts: {
    id: string;
    caption: string;
    image_url: string;
    topic: string;
    published_at: string;
  };
}

export  function Analytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      setLoading(true);
      setError(null);

      // Получаем ID пользователя
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .limit(1)
        .single();

      if (!users) {
        throw new Error('Пользователь не найден');
      }

      // Получаем существующую аналитику из БД
      const { data: existingAnalytics, error: analyticsError } = await supabase
        .from('analytics')
        .select(`
          *,
          posts!inner (
            id,
            caption,
            image_url,
            topic,
            published_at,
            schedules!inner (
              user_id
            )
          )
        `)
        .eq('posts.schedules.user_id', users.id)
        .order('fetched_at', { ascending: false });

      if (analyticsError) {
        throw analyticsError;
      }

      setAnalytics(existingAnalytics || []);

      // Получаем список опубликованных постов без аналитики
      const { data: postsWithoutAnalytics } = await supabase
        .from('posts')
        .select(`
          id,
          instagram_media_id,
          schedules!inner (
            user_id
          )
        `)
        .eq('schedules.user_id', users.id)
        .eq('status', 'published')
        .not('instagram_media_id', 'is', null);

      if (postsWithoutAnalytics && postsWithoutAnalytics.length > 0) {
        // Получаем ID постов, для которых уже есть аналитика
        const postsWithAnalyticsIds = new Set(
          existingAnalytics?.map(a => a.post_id) || []
        );

        // Фильтруем посты, для которых нужно получить аналитику
        const postsToFetch = postsWithoutAnalytics.filter(
          post => !postsWithAnalyticsIds.has(post.id)
        );

        // Автоматически получаем аналитику для новых постов
        if (postsToFetch.length > 0) {
          console.log(`Получение аналитики для ${postsToFetch.length} постов...`);
          
          for (const post of postsToFetch) {
            try {
              await fetchAnalyticsForPost(post.id);
            } catch (err) {
              console.error(`Ошибка получения аналитики для поста ${post.id}:`, err);
            }
          }

          // Перезагружаем аналитику после получения новых данных
          const { data: updatedAnalytics } = await supabase
            .from('analytics')
            .select(`
              *,
              posts!inner (
                id,
                caption,
                image_url,
                topic,
                published_at,
                schedules!inner (
                  user_id
                )
              )
            `)
            .eq('posts.schedules.user_id', users.id)
            .order('fetched_at', { ascending: false });

          setAnalytics(updatedAnalytics || []);
        }
      }
    } catch (err: any) {
      console.error('Error loading analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAnalyticsForPost(postId: string) {
    const response = await fetch(`http://localhost:3000/api/analytics/fetch/${postId}`);
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to fetch analytics');
    }

    return response.json();
  }

  async function refreshAnalytics(postId: string) {
    try {
      await fetchAnalyticsForPost(postId);
      await loadAnalytics(); // Перезагружаем все данные
      alert('✅ Аналитика обновлена!');
    } catch (err: any) {
      console.error('Error refreshing analytics:', err);
      alert('❌ Ошибка: ' + err.message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка аналитики...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 text-xl font-semibold mb-2">Ошибка</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => loadAnalytics()}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (analytics.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-4 text-xl font-medium text-gray-900">Нет данных аналитики</h3>
          <p className="mt-2 text-gray-500">
            Создайте расписание и опубликуйте посты для получения аналитики
          </p>
          <a
            href="/"
            className="mt-6 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Создать расписание
          </a>
        </div>
      </div>
    );
  }

  // Расчет общей статистики
  const totalLikes = analytics.reduce((sum, a) => sum + (a.likes || 0), 0);
  const totalComments = analytics.reduce((sum, a) => sum + (a.comments || 0), 0);
  const totalReach = analytics.reduce((sum, a) => sum + (a.reach || 0), 0);
  const totalSaves = analytics.reduce((sum, a) => sum + (a.saves || 0), 0);
  const avgEngagement = analytics.length > 0
    ? (analytics.reduce((sum, a) => sum + (parseFloat(String(a.engagement_rate)) || 0), 0) / analytics.length).toFixed(2)
    : '0.00';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Аналитика постов</h1>
            <p className="mt-2 text-gray-600">Статистика ваших опубликованных постов в Instagram</p>
          </div>
          <button
            onClick={() => loadAnalytics()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Обновить все
          </button>
        </div>

        {/* Список постов с аналитикой */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {analytics.map((item) => (
              <li key={item.id}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      {item.posts.image_url && (
                        <img
                          src={item.posts.image_url}
                          alt="Post"
                          className="h-20 w-20 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <div className="ml-4 flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.posts.caption?.substring(0, 100) || 'Без подписи'}..
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Тема: {item.posts.topic} • Опубликовано: {new Date(item.posts.published_at).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => refreshAnalytics(item.post_id)}
                      className="ml-4 flex-shrink-0 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Обновить
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    <div>
                      <p className="text-xs text-gray-500">Лайки</p>
                      <p className="text-lg font-semibold text-gray-900">{item.likes || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Комментарии</p>
                      <p className="text-lg font-semibold text-gray-900">{item.comments || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Сохранения</p>
                      <p className="text-lg font-semibold text-gray-900">{item.saves || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Охват</p>
                      <p className="text-lg font-semibold text-gray-900">{item.reach || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Показы</p>
                      <p className="text-lg font-semibold text-gray-900">{item.impressions || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">ER</p>
                      <p className="text-lg font-semibold text-gray-900">{item.engagement_rate || 0}%</p>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-gray-400">
                    Обновлено: {new Date(item.fetched_at).toLocaleString('ru-RU')}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          Показано {analytics.length} {analytics.length === 1 ? 'пост' : 'постов'} с аналитикой
        </div>
      </div>
    </div>
  );
}