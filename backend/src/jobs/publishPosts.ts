// backend/src/jobs/publishPosts.ts
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { generateImage } from '../services/imageGenerator';
import { uploadImageToStorage } from '../services/uploadImage';

export async function publishScheduledPosts() {
  try {
    const now = new Date().toISOString();

    // Находим все посты, которые должны быть опубликованы
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*, users(ig_user_id, ig_access_token)')
      .eq('status', 'pending')
      .lte('scheduled_at', now);

    console.log("Posts to publish:", posts);

    if (error) throw error;

    for (const post of posts || []) {
      try {
        const user = post.users;

        if (!user || !user.ig_access_token || !user.ig_user_id) {
          throw new Error('User Instagram credentials not found');
        }

        // 1. Генерируем изображение
        const imageBuffer = await generateImage(post.topic, post.bg_color);

        // 2. ✅ Загружаем в Supabase Storage и получаем URL
        const fileName = `${post.id}.png`;
        const publicUrl = await uploadImageToStorage(imageBuffer, fileName);

        console.log(`✓ Image uploaded: ${publicUrl}`);

        // 3. Создаем container в Instagram
        const containerResponse = await axios.post(
          `https://graph.facebook.com/v24.0/${user.ig_user_id}/media`,
          {
            image_url: publicUrl,  // ✅ Публичный HTTPS URL!
            caption: post.caption || post.topic,
            access_token: user.ig_access_token,
          }
        );

        const creationId = containerResponse.data.id;

        // 4. Ждем обработки
        await new Promise(resolve => setTimeout(resolve, 15000));

        // 5. Публикуем
        const publishResponse = await axios.post(
          `https://graph.facebook.com/v24.0/${user.ig_user_id}/media_publish`,
          {
            creation_id: creationId,
            access_token: user.ig_access_token,
          }
        );

        const mediaId = publishResponse.data.id;
        console.log(`try to Published post ${post.id} to Instagram`, publicUrl);

        // 6. ✅ Обновляем статус в БД с URL (а не Buffer!)
        await supabase
          .from('posts')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            instagram_media_id: mediaId,
            instagram_container_id: creationId,
            image_url: publicUrl,  // ✅ Сохраняем URL!
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
            retry_count: (post.retry_count || 0) + 1,
          })
          .eq('id', post.id);
      }
    }
  } catch (error) {
    console.error('Publish posts job failed:', error);
  }
}
