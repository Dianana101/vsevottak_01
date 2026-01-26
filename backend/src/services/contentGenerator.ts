import axios from 'axios';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;

export type PostContent = {
  caption: string;
  imageUrl: string[];
};

// Генерация полного контента поста (caption + images)
export async function generatePostContent(topic: string, date: Date, slides: number): Promise<PostContent> {
  const postContent: PostContent = {
    caption: '',
    imageUrl: []
  };

  console.log('generatePostContent slide number: ', slides);

  // topic - тема для расписания
  postContent.caption = await generateCaption(topic, date); //

  const imageUrls: string[] = [];
  for (let i = 0; i < slides; i++) {
    console.log('generatePostContent: ' + i, topic, date);
    const imageUrl = await generateImage(i + ": " + topic);
    imageUrls.push(imageUrl);
  }

  const lastImageUrl = await generateImage("Что вы думаете по этому поводу? Напишите в комментариях!");
  imageUrls.push(lastImageUrl);

  postContent.imageUrl = imageUrls;
  return postContent;
}


// Генерация текста через Perplexity
export async function generateCaption(topic: string, date: Date): Promise<string> {
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
Требования: 4-5 предложений, эмодзи, без хештегов, вдохновляющий тон.
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
    const caption = response.data.choices[0].message.content.trim();
    console.log(`✅ Caption generated: ${response.data.choices[0].message.content}`);
    return caption;
  } catch (error) {
    console.error('Error generating caption:', error);
    return `${topic} 💫\n\nПусть этот день будет наполнен вдохновением и позитивом! ✨`;
  }
}


// Генерация изображения через Hugging Face
export async function generateImage(topic: string): Promise<string> {
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

    const { error } = await supabase.storage
      .from('post-images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    console.log('save img to storage err', error);
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

// Генерация промпта для изображения
function generateImagePrompt(topic: string): string {
  return `Professional Instagram post image, square 1:1 format, 1080x1080 pixels.
Theme: ${topic}
Style: Modern, bright, vibrant colors, clean minimalist design, trending Instagram aesthetic.
Requirements: No watermarks, eye-catching composition, high quality photography style`;
}
