import axios from 'axios';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface Schedule {
  id: string;
  user_id: string;
  topic: string;
  start_date: string;
  end_date: string;
  post_time: string;
}

interface GeneratedPost {
  topic: string;
  caption: string;
  bg_color: string;
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

// Генерация текста для поста через AI
async function generatePostContent(topic: string, date: Date): Promise<GeneratedPost> {
  const prompt = `Создай короткий мотивирующий пост на тему "${topic}" для Instagram.
Дата: ${date.toLocaleDateString('ru-RU')}
Требования:
- Текст должен быть кратким (2-3 предложения)
- Использовать эмодзи
- Без хештегов
- Вдохновляющий тон

Формат ответа (только JSON):
{
  "caption": "текст поста",
  "bg_color": "${COLORS[Math.floor(Math.random() * COLORS.length)]}"
}`;

  try {
    // Используем бесплатный API для генерации текста
    // Вы можете заменить на OpenAI, Anthropic и т.д.
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Ты помощник для создания мотивирующих постов в Instagram на русском языке.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    const parsed = JSON.parse(content);

    return {
      topic,
      caption: parsed.caption,
      bg_color: parsed.bg_color || COLORS[0]
    };
  } catch (error) {
    console.error('Error generating post content:', error);

    // Fallback: простой текст
    return {
      topic,
      caption: `${topic} 💫\n\nПусть этот день будет наполнен вдохновением и позитивом! ✨`,
      bg_color: COLORS[Math.floor(Math.random() * COLORS.length)]
    };
  }
}

// Генерация изображения для поста
async function generatePostImage(caption: string, bgColor: string): Promise<string> {
  try {
    // Создаем простое изображение с текстом через canvas
    const canvas = require('canvas');
    const { createCanvas } = canvas;

    const width = 1080;
    const height = 1080;
    const canvasInstance = createCanvas(width, height);
    const ctx = canvasInstance.getContext('2d');

    // Фон
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Текст
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Разбиваем текст на строки
    const words = caption.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > width - 200) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    lines.push(currentLine);

    // Рисуем строки
    const lineHeight = 60;
    const startY = (height - lines.length * lineHeight) / 2;

    lines.forEach((line, i) => {
      ctx.fillText(line, width / 2, startY + i * lineHeight);
    });

    // Конвертируем в Buffer
    const buffer = canvasInstance.toBuffer('image/png');

    // Загружаем в Supabase Storage
    const fileName = `${uuidv4()}.png`;
    const { data, error } = await supabase.storage
      .from('post-images')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (error) {
      throw error;
    }

    // Получаем публичный URL
    const { data: { publicUrl } } = supabase.storage
      .from('post-images')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
}

// Генерация ежедневных постов для расписания
export async function generateDailyPosts(schedule: Schedule): Promise<any[]> {
  const startDate = new Date(schedule.start_date);
  const endDate = new Date(schedule.end_date);
  const posts: any[] = [];

  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    // Генерируем контент
    const postContent = await generatePostContent(schedule.topic, currentDate);

    // Генерируем изображение
    const imageUrl = await generatePostImage(postContent.caption, postContent.bg_color);

    // Формируем время публикации
    const [hours, minutes] = schedule.post_time.split(':');
    const scheduledAt = new Date(currentDate);
    scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // Сохраняем пост в БД
    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        schedule_id: schedule.id,
        image_url: imageUrl,
        caption: postContent.caption,
        scheduled_at: scheduledAt.toISOString(),
        status: 'pending',
        topic: postContent.topic,
        bg_color: postContent.bg_color,
        retry_count: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving post:', error);
      throw error;
    }

    posts.push(post);

    // Переходим к следующему дню
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return posts;
}

// Пересоздание постов для расписания (если нужно обновить)
export async function regeneratePosts(scheduleId: string): Promise<void> {
  // Удаляем старые посты
  await supabase
    .from('posts')
    .delete()
    .eq('schedule_id', scheduleId);

  // Получаем расписание
  const { data: schedule, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('id', scheduleId)
    .single();

  if (error || !schedule) {
    throw new Error('Schedule not found');
  }

  // Генерируем новые посты
  await generateDailyPosts(schedule);
}
