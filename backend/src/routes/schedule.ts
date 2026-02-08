import express from 'express';
import { supabase } from '../lib/supabase';

const router = express.Router();

// Create a daily posting schedule
router.post('/daily', async (req, res) => {
  try {
    const { user_id, formData: { time_of_day, topic, bg_description, carousel_slides } } = req.body;
    console.log('daily req', req.body);

    // Save only the schedule, without creating posts
    const { data, error } = await supabase
      .from('schedules')
      .insert({
        user_id,
        time_of_day,
        topic: topic,
        bg_description: bg_description || 'Minimalist gradient background',
        // carousel_slides: carousel_slides || 3,
        is_active: true,
        type: 'daily',
      })
      .select()
      .single();

    console.log('error in daily', error);

    if (error) throw error;

    res.json({
      success: true,
      schedule: data,
      message: 'Schedule created. Posts will be generated automatically by cron job.'
    });
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

// Get all schedules for a user
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
