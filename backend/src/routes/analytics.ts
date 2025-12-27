import express from 'express';
import axios from 'axios';
import { supabase } from '../lib/supabase';

const router = express.Router();

// Получение метрик для конкретного поста из Instagram API
router.get('/fetch/:post_id', async (req, res) => {
  try {
    const { post_id } = req.params;
    console.log('fetch post', post_id);

    // Получаем информацию о посте
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(`
        *,
        schedules!inner (
          user_id,
          users!inner (
            ig_access_token
          )
        )
      `)
      .eq('id', post_id)
      .single();
      console.log('postError', postError, post);

    if (postError || !post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (!post.instagram_media_id) {
      return res.status(400).json({ error: 'Post not published to Instagram yet' });
    }

    const accessToken = post.schedules.users.ig_access_token;
    const mediaId = post.instagram_media_id;

    // Получаем insights из Instagram API
    const insightsResponse = await axios.get(
      `https://graph.facebook.com/v24.0/${mediaId}/insights`,
      {
        params: {
          metric: 'engagement,impressions,reach,saved',
          access_token: accessToken
        }
      }
    );

    // Получаем базовые метрики (likes, comments)
    const mediaResponse = await axios.get(
      `https://graph.facebook.com/v24.0/${mediaId}`,
      {
        params: {
          fields: 'like_count,comments_count',
          access_token: accessToken
        }
      }
    );

    console.log('mediaResponse', mediaResponse);

    // Парсим данные
    const insights = insightsResponse.data.data;
    const media = mediaResponse.data;

    const likes = media.like_count || 0;
    const comments = media.comments_count || 0;
    const impressions = insights.find((i: any) => i.name === 'impressions')?.values[0]?.value || 0;
    const reach = insights.find((i: any) => i.name === 'reach')?.values[0]?.value || 0;
    const saved = insights.find((i: any) => i.name === 'saved')?.values[0]?.value || 0;
    const engagement = insights.find((i: any) => i.name === 'engagement')?.values[0]?.value || 0;

    // Вычисляем engagement rate
    const engagementRate = reach > 0 ? ((engagement / reach) * 100).toFixed(2) : 0;

    // Сохраняем в базу
    const { data: analytics, error: analyticsError } = await supabase
      .from('analytics')
      .insert({
        post_id: post.id,
        instagram_media_id: mediaId,
        likes,
        comments,
        saves: saved,
        reach,
        impressions,
        engagement_rate: engagementRate,
        fetched_at: new Date().toISOString()
      })
      .select()
      .single();

    if (analyticsError) {
      throw analyticsError;
    }



    res.json({
      message: 'Analytics fetched successfully',
      analytics
    });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);

    const postId = req.params.post_id;


    res.status(500).json({
      error: 'Failed to fetch analytics',
      details: error.response?.data || error.message
    });
  }
});

// Получение аналитики для всех опубликованных постов пользователя
router.get('/user/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    console.log('analytics user', user_id)
    const { data: analytics, error } = await supabase
      .from('analytics')
      .select(`
        *,
        posts!inner (
          id,
          caption,
          scheduled_at,
          published_at,
          topic,
          schedules!inner (
            user_id
          )
        )
      `)
      .eq('posts.schedules.user_id', user_id)
      .order('fetched_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(analytics || []);
  } catch (error: any) {
    console.error('Error getting user analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получение последней аналитики для поста
router.get('/post/:post_id/latest', async (req, res) => {
  try {
    const { post_id } = req.params;
    console.log('analytics latest post', post_id)

    const { data: analytics, error } = await supabase
      .from('analytics')
      .select('*')
      .eq('post_id', post_id)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json(analytics || null);
  } catch (error: any) {
    console.error('Error getting post analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получение истории аналитики для поста (все замеры)
router.get('/post/:post_id/history', async (req, res) => {
  try {
    const { post_id } = req.params;
    console.log('analytics history post', post_id)

    const { data: analytics, error } = await supabase
      .from('analytics')
      .select('*')
      .eq('post_id', post_id)
      .order('fetched_at', { ascending: true });

    if (error) {
      throw error;
    }

    res.json(analytics || []);
  } catch (error: any) {
    console.error('Error getting post analytics history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получение сводной аналитики по расписанию
router.get('/schedule/:schedule_id/summary', async (req, res) => {
  try {
    const { schedule_id } = req.params;
    console.log('analytics schedule', schedule_id)

    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        id,
        analytics (
          likes,
          comments,
          saves,
          reach,
          impressions,
          engagement_rate
        )
      `)
      .eq('schedule_id', schedule_id)
      .eq('status', 'published');

    if (postsError) {
      throw postsError;
    }

    // Агрегируем данные
    let totalLikes = 0;
    let totalComments = 0;
    let totalSaves = 0;
    let totalReach = 0;
    let totalImpressions = 0;
    let avgEngagementRate = 0;
    let postsWithAnalytics = 0;

    posts?.forEach((post: any) => {
      if (post.analytics && post.analytics.length > 0) {
        const latest = post.analytics[post.analytics.length - 1];
        totalLikes += latest.likes || 0;
        totalComments += latest.comments || 0;
        totalSaves += latest.saves || 0;
        totalReach += latest.reach || 0;
        totalImpressions += latest.impressions || 0;
        avgEngagementRate += parseFloat(latest.engagement_rate) || 0;
        postsWithAnalytics++;
      }
    });

    if (postsWithAnalytics > 0) {
      avgEngagementRate = avgEngagementRate / postsWithAnalytics;
    }

    res.json({
      schedule_id,
      total_posts: posts?.length || 0,
      posts_with_analytics: postsWithAnalytics,
      total_likes: totalLikes,
      total_comments: totalComments,
      total_saves: totalSaves,
      total_reach: totalReach,
      total_impressions: totalImpressions,
      avg_engagement_rate: avgEngagementRate.toFixed(2)
    });
  } catch (error: any) {
    console.error('Error getting schedule summary:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
