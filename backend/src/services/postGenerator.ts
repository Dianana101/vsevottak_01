import axios from 'axios';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;

interface Schedule {
  id: string;
  user_id: string;
  topic: string;
  start_date: string;
  end_date: string;
  post_time: string;
}

// Генерация промпта для изображения
function generateImagePrompt(topic: string): string {
  return `Professional Instagram post image, square 1:1 format, 1080x1080 pixels.
Theme: ${topic}
Style: Modern, bright, vibrant colors, clean minimalist design, trending Instagram aesthetic.
Requirements: No text, no watermarks, eye-catching composition, high quality photography style.`;
}

// Генерация изображения через Hugging Face
async function generateImage(topic: string): Promise<string> {
  try {
    const prompt = generateImagePrompt(topic);

    console.log(`🎨 Generating image for: ${topic}`);

    const response = await axios.post(
      'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
      { inputs: prompt, parameters: { width: 1024, height: 1024 } },
      {
        headers: {
          'Authorization': `Bearer ${HUGGING_FACE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: 60000
      }
    );

    const imageBuffer = Buffer.from(response.data);
    const fileName = `${uuidv4()}.png`;

    const { error } = await supabase.storage
      .from('post-images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: false
      });
    console.log('save img to storage err', error)

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('post-images')
      .getPublicUrl(fileName);

    console.log(`✅ Image generated: ${publicUrl}`);
    return publicUrl;
  } catch (error: any) {
    console.error('Error generating image:', error);
    throw error;
  }
}

// Генерация текста через Perplexity
async function generateCaption(topic: string, date: Date): Promise<string> {
  try {
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'Ты создаешь короткие мотивирующие посты для Instagram на русском языке.'
          },
          {
            role: 'user',
            content: `Создай короткий пост на тему "${topic}" для Instagram.
Дата: ${date.toLocaleDateString('ru-RU')}
Требования: 2-3 предложения, эмодзи, без хештегов, вдохновляющий тон.
Ответь ТОЛЬКО текстом поста.`
          }
        ],
        temperature: 0.7,
        max_tokens: 150
      },
      {
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating caption:', error);
    return `${topic} 💫\n\nПусть этот день будет наполнен вдохновением и позитивом! ✨`;
  }
}

// Основная функция генерации постов
export async function generateDailyPosts(schedule: Schedule): Promise<any[]> {
  const startDate = new Date(schedule.start_date);
  const endDate = new Date(schedule.end_date);
  const posts: any[] = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    try {
      console.log(`\n📝 Generating post for ${currentDate.toLocaleDateString('ru-RU')}`);

      const [caption, imageUrl] = await Promise.all([
        generateCaption(schedule.topic, currentDate),
        generateImage(schedule.topic)
      ]);

      console.log('generateDailyPosts', caption, imageUrl);

      const [hours, minutes] = schedule.post_time.split(':');
      const scheduledAt = new Date(currentDate);
      scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const { data: post, error } = await supabase
        .from('posts')
        .insert({
          schedule_id: schedule.id,
          image_url: imageUrl,
          caption,
          scheduled_at: scheduledAt.toISOString(),
          status: 'pending',
          topic: schedule.topic,
          bg_color: '#000000',
          retry_count: 0
        })
        .select()
        .single();

        console.log('generateDailyPosts imageUrl err', error, imageUrl)

      if (error) throw error;

      posts.push(post);
      console.log(`✅ Post created successfully`);

      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`❌ Error for ${currentDate.toLocaleDateString('ru-RU')}:`, error.message);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return posts;
}
