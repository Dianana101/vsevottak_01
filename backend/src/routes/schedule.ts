import express from 'express';
import {supabase} from '../lib/supabase';
import axios from 'axios';
import {v4 as uuidv4} from 'uuid';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;

const CAROUSEL_IMAGE_COUNT = 3;

const router = express.Router();

// Создать ежедневное расписание
router.post('/daily', async (req, res) => {
  try {
    const { user_id, formData: {time_of_day, topic, bg_color} } = req.body;
    console.log('daily req', req.body);
      let currentDate = new Date(); // todo post time

      const postContent: PostContent = await generatePostContent(topic, currentDate);
      console.log('\n\ngenerated caption and imageUrl', postContent.caption, postContent.imageUrl);

      const {data, error} = await supabase
      .from('schedules')
      .insert({
        user_id,
        time_of_day,
          topic: postContent.caption,
          bg_color: bg_color || 'rgba(192,111,216,0.77)',
        is_active: true,
        type: 'daily',
      })
      .select()
      .single();

    console.log("error in daily", error);

    if (error) throw error;

    const { data: user } = await supabase
      .from('users')
      .select('ig_user_id, ig_access_token')
      .eq('id', user_id)
      .single();

    console.log("user in daily", user);

    if (user) {
      // Генерируем время публикации первого поста
      const [hours, minutes] = time_of_day.split(':');
      const publishTime = new Date();
      publishTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Если время уже прошло сегодня, планируем на завтра
      if (publishTime < new Date()) {
        publishTime.setDate(publishTime.getDate() + 1);
      }

      // ✅ ИСПРАВЛЕНИЕ: создаём пост БЕЗ изображения
      // Изображение будет сгенерировано и загружено при публикации
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id,
          schedule_id: data.id,
          topic: topic,
          bg_color: bg_color,
            caption: `Пост на тему: ${postContent.caption}`,
          status: 'pending',
          scheduled_at: publishTime.toISOString(),
          created_at: new Date().toISOString(),
            image_url: postContent.imageUrl.join(','),

        })
        .select()
        .single();

      if (postError) {
        console.error("Error creating post:", postError);
      } else {
        console.log("Post created:", post);
      }
    }

    res.json({ success: true, schedule: data });
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

// Получить все расписания пользователя
router.get('/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ schedules: data });
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({ error: 'Failed to get schedules' });
  }
});


// Генерация изображения через Hugging Face
async function generateImage(topic: string): Promise<string> {
    console.log('generateImage', topic);

    try {
        const prompt = generateImagePrompt(topic);

        console.log(`🎨 Generating image for: ${topic}`);

        const response = await axios.post(
            'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell',
            {
                inputs: prompt,
                parameters: {width: 1024, height: 1024},
            },
            {
                headers: {
                    Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,
                    Accept: 'image/png',
                },
                responseType: 'arraybuffer',
            }
        );

        const imageBuffer = Buffer.from(response.data);
        const fileName = `${uuidv4()}.png`;

        const {error} = await supabase.storage
            .from('post-images')
            .upload(fileName, imageBuffer, {
                contentType: 'image/png',
                upsert: false
            });
        console.log('save img to storage err', error)

        if (error) throw error;

        const {data: {publicUrl}} = supabase.storage
            .from('post-images')
            .getPublicUrl(fileName);

        console.log(`✅ Image generated: ${publicUrl}
     `);
        return publicUrl;
    } catch (error: any) {
        console.error('Error generating image:', error);
        throw error;
    }
}

// Генерация текста через Perplexity
async function generateCaption(topic: string, date: Date): Promise<string> {
    console.log('generateCaption', topic);

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
                max_tokens: 1024
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

function generateImagePrompt(topic: string): string {
    return `Professional Instagram post image, square 1:1 format, 1080x1080 pixels.
Theme: ${topic}
Style: Modern, bright, vibrant colors, clean minimalist design, trending Instagram aesthetic.
Requirements: No watermarks, eye-catching composition, high quality photography style, include short topic description as a title on the image.`;
}

type PostContent = {
    caption: string;
    imageUrl: string[];
}

async function generatePostContent(topic: string, date: Date): Promise<PostContent> {
    const postContent: PostContent = {
        caption: '',
        imageUrl: []
    };

    postContent.caption = await generateCaption(topic, date);

    const imageUrls: string[] = [];
    for (let i = 0; i < CAROUSEL_IMAGE_COUNT; i++) {
        console.log('generatePostContent', topic, date);
        const imageUrl = await generateImage(topic);
        imageUrls.push(imageUrl);
    }

    const lastImageUrl = await generateImage("Картинка с вопросом для вовлечения аудитории в Instagram постах на тему: " + topic);
    imageUrls.push(lastImageUrl);
    postContent.imageUrl = imageUrls;
    return postContent;
}
export default router;
