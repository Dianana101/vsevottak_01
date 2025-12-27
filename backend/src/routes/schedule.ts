import express from 'express';
import { supabase } from '../lib/supabase';
import { generateDailyPosts } from '../services/postGenerator';
import { logAuthEvent } from '../utils/authLogger';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { user_id, topic, start_date, end_date, post_time, type = 'daily' } = req.body;

    // Валидация
    if (!user_id || !topic || !start_date || !end_date || !post_time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Логируем начало создания расписания
    await logAuthEvent(user_id, 'schedule_create_start', {
      action: 'create_schedule',
      topic,
      start_date,
      end_date,
      post_time
    });

    // Создаем расписание
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .insert({
        user_id,
        topic,
        start_date,
        end_date,
        post_time,
        type,
        status: 'active'
      })
      .select()
      .single();

    if (scheduleError) {
      await logAuthEvent(user_id, 'schedule_create_error', {
        action: 'create_schedule',
        status: 'error',
        error: scheduleError.message
      });

      return res.status(500).json({ error: scheduleError.message });
    }

    // Генерируем посты
    const posts = await generateDailyPosts(schedule);

    // Логируем успешное создание
    await logAuthEvent(user_id, 'schedule_create_success', {
      action: 'create_schedule',
      status: 'success',
      schedule_id: schedule.id,
      posts_count: posts.length,
      topic
    });

    res.json({
      message: 'Schedule created successfully',
      schedule,
      posts_count: posts.length
    });
  } catch (error: any) {
    console.error('Error creating schedule:', error);

    const userId = req.body.user_id;
    if (userId) {
      await logAuthEvent(userId, 'schedule_create_error', {
        action: 'create_schedule',
        status: 'error',
        error: error.message
      });
    }

    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
