// backend/src/jobs/publishPosts.ts
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { generateImage } from '../services/imageGenerator';

export async function publishScheduledPosts() {
  try {
    const now = new Date().toISOString();

    const { data: posts, error } = await supabase
      .from('posts')
      .select('*, users(ig_user_id, ig_access_token)')
      .eq('status', 'pending')
      // .lte('scheduled_at', now);

    console.log('publishScheduledPosts 1', error, posts?.length);
    if (error) throw error;

    for (const post of posts || []) {
      try {
        const user = post.users;

        if (!user || !user.ig_access_token || !user.ig_user_id) {
          throw new Error('User Instagram credentials not found');
        }

        // 1. Генерируем изображение
        const imageBuffer = await generateImage(post.topic, post.bg_color);

        // 2. ✅ Загружаем в Supabase Storage
        const fileName = `${post.id}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(fileName, imageBuffer, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: true  // Перезаписываем, если файл существует
          });
    console.log('publishScheduledPosts post image error', uploadError);

        if (uploadError) throw uploadError;

        // 3. ✅ Получаем публичный URL
        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(fileName);

    console.log('publishScheduledPosts public url', publicUrl, post.caption || post.topic, user.ig_access_token, `https://graph.facebook.com/v24.0/${user.ig_user_id}/media`);

        // 4. Создаем container в Instagram с публичным URL
        const containerResponse = await axios.post(
          `https://graph.facebook.com/v24.0/${user.ig_user_id}/media`,
          {
            image_url: publicUrl,  // ✅ Публичный HTTPS URL!
            caption: post.caption || post.topic,
            access_token: user.ig_access_token,
          }
        );
    console.log('publishScheduledPosts containerResponse: ', containerResponse);

        const creationId = containerResponse.data.id;

        // 5. Ждем обработки
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 6. Публикуем
        const publishResponse = await axios.post(
          `https://graph.facebook.com/v24.0/${user.ig_user_id}/media_publish`,
          {
            creation_id: creationId,
            access_token: user.ig_access_token,
          }
        );
    console.log('publishScheduledPosts publishResponse', publishResponse);

        const mediaId = publishResponse.data.id;

        // 7. ✅ Сохраняем только URL, а не весь буфер!
        const resp = await supabase
          .from('posts')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            instagram_media_id: mediaId,
            instagram_container_id: creationId,
            image_url: publicUrl,  // ✅ Компактный URL!
          })
          .eq('id', post.id);

        console.log(`✓ Published post ${post.id} to Instagram`);
      } catch (err: any) {
        console.error(`✗ Failed to publish post ${post.id}:`, err.message);

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
