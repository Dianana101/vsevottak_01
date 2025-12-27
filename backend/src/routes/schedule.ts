import express from 'express';
import { supabase } from '../lib/supabase';
import { generateImage } from  '../services/imageGenerator';

const router = express.Router();

// Создать ежедневное расписание
router.post('/daily', async (req, res) => {
  try {
    const { user_id, formData: {time_of_day, topic, bg_color} } = req.body;
    console.log('daily REQ BODY', req.body);

    const { data, error } = await supabase
      .from('schedules')
      .insert({
        user_id,
        time_of_day,
        topic,
        bg_color: bg_color || '#FFFFFF',
        is_active: true,
        type: 'daily',
      })
      .select()
      .single();
    console.log("error in daily", error);

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

   // Генерируем изображение
   const imageUrl = await generateImage(topic, bg_color);
    console.log("imageUrl in daily", imageUrl);

   // Создаем пост
    const post_sch = await supabase
     .from('posts')
     .insert({
       user_id,
       schedule_id: data.id,  // ID созданного расписания
       image_url: imageUrl,
       caption: `Пост на тему: ${topic}`,
       status: 'pending',
       scheduled_at: publishTime.toISOString(),
       created_at: new Date(),
     });
     console.log("post_sch in daily", post_sch);

 }
    if (error) throw error;

    res.json({ success: true, schedule: data });
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

// Создать одноразовый пост
router.post('/custom', async (req, res) => {
  try {
    const { user_id, scheduled_at, topic, bg_color } = req.body;

    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id,
        scheduled_at,
        topic,
        bg_color: bg_color || '#FFFFFF',
        status: 'pending',
      })
      .select()
      .single();

    console.log("error in custom", error);

    if (error) throw error;

    res.json({ success: true, post: data });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
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


// После строки 25 (res.json({ success: true, schedule: data });)
// Добавить:

// Генерировать первый пост сразу после создания расписания


export default router;
