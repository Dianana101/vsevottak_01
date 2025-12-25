import express from 'express';
import { supabase } from '../lib/supabase';

const router = express.Router();

router.get('/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const stats = {
      total: data.length,
      published: data.filter(p => p.status === 'published').length,
      pending: data.filter(p => p.status === 'pending').length,
      failed: data.filter(p => p.status === 'failed').length,
    };

    res.json({ posts: data, stats });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

export default router;
