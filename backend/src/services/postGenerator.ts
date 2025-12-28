import axios from 'axios';
import { supabase } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

// Генерация промпта для изображения
function generateImagePrompt(topic: string): string {
  return `Professional Instagram post image, square 1:1 format, 1080x1080 pixels.
Theme: ${topic}
Style: Modern, bright, vibrant colors, clean minimalist design, trending Instagram aesthetic.
Requirements: No text, no watermarks, eye-catching composition, high quality photography style.`;
}

// Генерация изображения через Perplexity API
async function generateImageWithPerplexity(topic: string): Promise<string> {
  try {
    const prompt = generateImagePrompt(topic);

    console.log(`🎨 Generating image for topic: ${topic}`);

    // Используем Perplexity API для генерации изображения
    // ВАЖНО: Нужно использовать модель, которая поддерживает генерацию изображений
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: 'sonar-pro', // или другая модель с поддержкой изображений
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant that helps generate images for social media posts.'
          },
          {
            role: 'user',
            content: `Generate an image: ${prompt}`
          }
        ],
        return_images: true, // Включаем возврат изображений
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Проверяем, есть ли изображения в ответе
    const citations = response.data.citations || [];
    const images = citations.filter((c: string) =>
      c.match(/\.(jpg|jpeg|png|webp|gif)$/i)
    );

    if (images.length === 0) {
      throw new Error('No images returned from Perplexity');
    }

    // Берем первое изображение
    const imageUrl = images[0];

    // Скачиваем изображение
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    const imageBuffer = Buffer.from(imageResponse.data);

    // Загружаем в Supabase Storage
    const fileName = `${uuidv4()}.png`;
    const { data, error } = await supabase.storage
      .from('post-images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (error) {
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('post-images')
      .getPublicUrl(fileName);

    console.log(`✅ Image generated and uploaded: ${publicUrl}`);
    return publicUrl;
  } catch (error: any) {
    console.error('Error with Perplexity:', error.message);

    // Fallback: используем альтернативный метод (Hugging Face)
    return await generateImageFallback(topic);
  }
}

// Альтернативный метод через другой API (Hugging Face как fallback)
async function generateImageFallback(topic: string): Promise<string> {
  try {
    const prompt = generateImagePrompt(topic);

    const response = await axios.post(
      'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
      {
        inputs: prompt,
        parameters: { width: 1024, height: 1024 }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.HUGGING_FACE_API_KEY}`,
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

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('post-images')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Fallback also failed:', error);
    throw error;
  }
}

// Генерация текста через Perplexity
async function generatePostCaption(topic: string, date: Date): Promise<string> {
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

    const content = response.data.choices[0].message.content;
    return content.trim();
  } catch (error) {
    console.error('Error generating caption:', error);
    return `${topic} 💫\n\nПусть этот день будет наполнен вдохновением и позитивом! ✨`;
  }
}

// Основная функция генерации постов
export async function generateDailyPosts(schedule: any): Promise<any[]> {
  const startDate = new Date(schedule.start_date);
  const endDate = new Date(schedule.end_date);
  const posts: any[] = [];

  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    try {
      console.log(`\n📝 Generating post for ${currentDate.toLocaleDateString('ru-RU')}`);

      // Генерируем текст через Perplexity
      const caption = await generatePostCaption(schedule.topic, currentDate);

      // Генерируем изображение через Perplexity (с fallback на Hugging Face)
      const imageUrl = await generateImageWithPerplexity(schedule.topic);

      // Формируем время публикации
      const [hours, minutes] = schedule.post_time.split(':');
      const scheduledAt = new Date(currentDate);
      scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Сохраняем в БД
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

      if (error) throw error;

      posts.push(post);
      console.log(`✅ Post created successfully`);

      // Задержка между генерациями, чтобы не превысить лимиты
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`❌ Error for ${currentDate.toLocaleDateString('ru-RU')}:`, error.message);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return posts;
}
