import { supabase } from '../lib/supabase';
import axios from 'axios';
import { generateImage } from '../services/imageGenerator';

export async function publishScheduledPosts() {
  try {
    const now = new Date().toISOString();

    // Находим все посты, которые должны быть опубликованы
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*, users(ig_user_id, ig_access_token)')
      .eq('status', 'pending')
      .lte('published_at', now);

    console.log("error in publishScheduledPosts", error, posts);

    if (error) throw error;

    for (const post of posts || []) {
      try {
        const user = post.users;
        
        if (!user || !user.ig_access_token || !user.ig_user_id) {
          throw new Error('User Instagram credentials not found');
        }

        // 1. Генерируем изображение
        const imageBuffer = await generateImage(post.topic, post.bg_color);

        // 2. Загружаем изображение (в реальности нужно загрузить на CDN)
        // Для примера используем base64
        const imageUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`;

        // 3. Создаем container в Instagram
        const containerResponse = await axios.post(
          `https://graph.facebook.com/v24.0/${user.ig_user_id}/media`,
          {
            image_url: imageUrl, // В реальности должен быть публичный URL
            caption: post.topic,
            access_token: user.ig_access_token,
          }
        );

        const creationId = containerResponse.data.id;

        // 4. Ждем обработки
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 5. Публикуем
        const publishResponse = await axios.post(
          `https://graph.facebook.com/v24.0/${user.ig_user_id}/media_publish`,
          {
            creation_id: creationId,
            access_token: user.ig_access_token,
          }
        );

        const mediaId = publishResponse.data.id;

        // 6. Обновляем статус в БД
        await supabase
          .from('posts')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            instagram_media_id: mediaId,
            image_url: imageUrl,
          })
          .eq('id', post.id);

        console.log(`✓ Published post ${post.id} to Instagram`);
      } catch (err: any) {
        console.error(`✗ Failed to publish post ${post.id}:`, err.message);

        // Сохраняем ошибку
        await supabase
          .from('posts')
          .update({
            status: 'failed',
            error_message: err.message,
          })
          .eq('id', post.id);
      }
    }
  } catch (error) {
    console.error('Publish posts job failed:', error);
  }
}
