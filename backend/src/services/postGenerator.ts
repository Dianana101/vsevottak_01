import cron from 'node-cron';
import axios from 'axios';
import { supabase } from '../config/supabase';
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

// Проверка доступности изображения
async function validateImageUrl(imageUrl: string): Promise<boolean> {
  try {
    const response = await axios.head(imageUrl, { timeout: 10000 });
    const contentType = response.headers['content-type'];

    console.log(`Image URL check:`, {
      url: imageUrl,
      status: response.status,
      contentType
    });

    // Проверяем, что это изображение
    if (!contentType || !contentType.startsWith('image/')) {
      console.error('❌ URL is not an image:', contentType);
      return false;
    }

    return response.status === 200;
  } catch (error: any) {
    console.error('❌ Image URL validation failed:', error.message);
    return false;
  }
}

async function publishPost(post: Post) {
  const { ig_user_id, ig_access_token } = post.schedules.users;
  const userId = post.schedules.user_id;

  try {
    console.log(`\n📤 Publishing post ${post.id}`);
    console.log(`Image URL: ${post.image_url}`);

    // Проверяем доступность изображения
    const isImageValid = await validateImageUrl(post.image_url);
    if (!isImageValid) {
      throw new Error('Image URL is not accessible or invalid');
    }

    // Логируем начало публикации
    await logAuthEvent(userId, 'instagram_post_start', {
      action: 'publish_post',
      post_id: post.id,
      ig_user_id,
      image_url: post.image_url
    });

    console.log(`Creating media container...`);

    // 1. Создаем медиа-контейнер с правильными параметрами
    const containerParams = {
      image_url: post.image_url,
      caption: post.caption,
      access_token: ig_access_token
    };

    console.log('Container params:', JSON.stringify(containerParams, null, 2));

    const containerResponse = await axios.post(
      `https://graph.facebook.com/v24.0/${ig_user_id}/media`,
      null, // body должен быть null
      {
        params: containerParams, // параметры передаются в query string
        timeout: 30000
      }
    );

    console.log('Container response:', containerResponse.data);

    const creationId = containerResponse.data.id;
    console.log(`✅ Container created: ${creationId}`);

    // 2. Ждем обработки (Instagram обрабатывает изображение)
    console.log('Waiting for Instagram to process image...');
    let retries = 0;
    const maxRetries = 20;
    let isReady = false;

    while (!isReady && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // ждем 3 секунды

      try {
        // Проверяем статус контейнера
        const statusResponse = await axios.get(
          `https://graph.facebook.com/v24.0/${creationId}`,
          {
            params: {
              fields: 'status_code',
              access_token: ig_access_token
            }
          }
        );

        const statusCode = statusResponse.data.status_code;
        console.log(`Container status: ${statusCode}`);

        if (statusCode === 'FINISHED') {
          isReady = true;
        } else if (statusCode === 'ERROR') {
          throw new Error('Instagram reported an error processing the media');
        }
      } catch (error: any) {
        console.log(`Status check attempt ${retries + 1}: ${error.message}`);
      }

      retries++;
    }

    if (!isReady) {
      console.log('⏰ Container might not be ready, but attempting to publish anyway...');
    }

    // 3. Публикуем контент
    console.log('Publishing media...');
    const publishResponse = await axios.post(
      `https://graph.facebook.com/v24.0/${ig_user_id}/media_publish`,
      null,
      {
        params: {
          creation_id: creationId,
          access_token: ig_access_token
        },
        timeout: 30000
      }
    );

    const mediaId = publishResponse.data.id;
    console.log(`✅ Media published: ${mediaId}`);

    // Обновляем статус поста
    await supabase
      .from('posts')
      .update({
        status: 'published',
        instagram_media_id: mediaId,
        published_at: new Date().toISOString()
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

    console.log(`✅ Post ${post.id} published successfully!`);
  } catch (error: any) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    const errorCode = error.response?.data?.error?.code;

    console.error(`❌ Failed to publish post ${post.id}:`, {
      error: error.response?.data || error.message,
      image_url: post.image_url
    });

    // Логируем ошибку
    await logAuthEvent(userId, 'instagram_post_error', {
      action: 'publish_post',
      status: 'error',
      post_id: post.id,
      error: errorMessage,
      error_code: errorCode,
      ig_user_id,
      image_url: post.image_url
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
        retry_count: retryCount,
        error_message: errorMessage
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

      console.log(`\n📤 Found ${posts.length} posts to publish`);

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

        // Задержка между публикациями
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.error('Error in publishing job:', error);
    }
  });

  console.log('📅 Publishing job started');
}
