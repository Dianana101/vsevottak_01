import express from 'express';
import { supabase } from '../lib/supabase';

const router = express.Router();

// Создать ежедневное расписание
router.post('/daily', async (req, res) => {
  try {
    const { user_id, time_of_day, topic, bg_color } = req.body;

    const { data, error } = await supabase
      .from('schedules')
      .insert({
        user_id,
        time_of_day,
        topic,
        bg_color: bg_color || '#FFFFFF',
        is_active: true,
      })
      .select()
      .single();

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

export default router;
