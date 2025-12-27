import cron from 'node-cron';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { logAuthEvent } from '../utils/authLogger';

interface Post {
  id: string;
  schedule_id: string;
  image_url: string;
  caption: string;
  scheduled_at: string;
  status: string;
  schedules: {
    user_id: string;
    users: {
      ig_user_id: string;
      ig_access_token: string;
    };
  };
}

async function publishPost(post: Post) {
  const { ig_user_id, ig_access_token } = post.schedules.users;
  const userId = post.schedules.user_id;

  try {
    // Логируем начало публикации
    await logAuthEvent(userId, 'instagram_post_start', {
      action: 'publish_post',
      post_id: post.id,
      ig_user_id
    });

    // 1. Создаем медиа-контейнер
    const containerResponse = await axios.post(
      `https://graph.facebook.com/v24.0/${ig_user_id}/media`,
      {
        image_url: post.image_url,
        caption: post.caption,
        access_token: ig_access_token
      }
    );

    const creationId = containerResponse.data.id;

    // Ждем обработки
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 2. Публикуем контент
    const publishResponse = await axios.post(
      `https://graph.facebook.com/v24.0/${ig_user_id}/media_publish`,
      {
        creation_id: creationId,
        access_token: ig_access_token
      }
    );

    const mediaId = publishResponse.data.id;

    // Обновляем статус поста
    await supabase
      .from('posts')
      .update({
        status: 'published',
        instagram_media_id: mediaId
      })
      .eq('id', post.id);

    // Логируем успешную публикацию
    await logAuthEvent(userId, 'instagram_post_success', {
      action: 'publish_post',
      status: 'success',
      post_id: post.id,
      instagram_media_id: mediaId,
      ig_user_id
    });

    console.log(`✅ Post ${post.id} published successfully: ${mediaId}`);
  } catch (error: any) {
    console.error(`❌ Failed to publish post ${post.id}:`, error.response?.data || error.message);

    // Логируем ошибку
    await logAuthEvent(userId, 'instagram_post_error', {
      action: 'publish_post',
      status: 'error',
      post_id: post.id,
      error: error.response?.data?.error?.message || error.message,
      error_code: error.response?.data?.error?.code,
      ig_user_id
    });

    // Увеличиваем счетчик попыток
    const { data: currentPost } = await supabase
      .from('posts')
      .select('retry_count')
      .eq('id', post.id)
      .single();

    const retryCount = (currentPost?.retry_count || 0) + 1;

    await supabase
      .from('posts')
      .update({
        status: retryCount >= 3 ? 'failed' : 'pending',
        retry_count: retryCount
      })
      .eq('id', post.id);
  }
}

export function startPublishingJob() {
  // Каждую минуту проверяем посты для публикации
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date().toISOString();

      // Получаем посты, готовые к публикации
      const { data: posts, error } = await supabase
        .from('posts')
        .select(`
          *,
          schedules!inner (
            user_id,
            users!inner (
              ig_user_id,
              ig_access_token,
              ig_token_expires_at
            )
          )
        `)
        .eq('status', 'pending')
        .lte('scheduled_at', now)
        .lt('retry_count', 3);

      if (error) {
        console.error('Error fetching posts:', error);
        return;
      }

      if (!posts || posts.length === 0) {
        return;
      }

      console.log(`📤 Found ${posts.length} posts to publish`);

      // Проверяем токены перед публикацией
      for (const post of posts) {
        const user = post.schedules.users;
        const tokenExpires = new Date(user.ig_token_expires_at);
        const now = new Date();

        if (tokenExpires <= now) {
          // Токен истек
          await logAuthEvent(post.schedules.user_id, 'instagram_token_expired', {
            action: 'check_token',
            status: 'error',
            error: 'Access token expired',
            token_expires: user.ig_token_expires_at
          });

          console.error(`❌ Token expired for user ${post.schedules.user_id}`);
          continue;
        }

        await publishPost(post as Post);
      }
    } catch (error) {
      console.error('Error in publishing job:', error);
    }
  });

  console.log('📅 Publishing job started');
}
