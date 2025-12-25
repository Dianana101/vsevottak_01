import express from 'express';
import axios from 'axios';
import { supabase } from '../lib/supabase';

const router = express.Router();

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID!;
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET!;
const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI!;
const FRONTEND_URL = process.env.FRONTEND_URL!;

// Инициация OAuth
router.get('/instagram/login', (req, res) => {
  const userId = req.query.user_id;
  
  const scopes = [
    'pages_show_list',
    'pages_read_engagement',
    'instagram_basic',
    'instagram_content_publish',
    'business_management'
  ].join(',');

  const authUrl = `https://www.facebook.com/v24.0/dialog/oauth?` +
    `client_id=${INSTAGRAM_APP_ID}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `scope=${scopes}&` +
    `state=${userId}&` +
    `response_type=code`;

  res.redirect(authUrl);
});

// Обработка callback
router.get('/instagram/callback', async (req, res) => {
  try {
    const { code, state: userId } = req.query;

    if (!code) {
      return res.redirect(`${FRONTEND_URL}/settings?auth=failed`);
    }

    // 1. Обмен code на short-lived token
    const tokenResponse = await axios.get(
      `https://graph.facebook.com/v24.0/oauth/access_token`,
      {
        params: {
          client_id: INSTAGRAM_APP_ID,
          client_secret: INSTAGRAM_APP_SECRET,
          redirect_uri: REDIRECT_URI,
          code: code,
        },
      }
    );

    const shortToken = tokenResponse.data.access_token;

    // 2. Обмен на long-lived token
    const longTokenResponse = await axios.get(
      `https://graph.facebook.com/v24.0/oauth/access_token`,
      {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: INSTAGRAM_APP_ID,
          client_secret: INSTAGRAM_APP_SECRET,
          fb_exchange_token: shortToken,
        },
      }
    );

    const longToken = longTokenResponse.data.access_token;
    const expiresIn = longTokenResponse.data.expires_in;

    // 3. Получаем Instagram Business Account ID
    const pagesResponse = await axios.get(
      `https://graph.facebook.com/v24.0/me/accounts`,
      {
        params: {
          fields: 'instagram_business_account',
          access_token: longToken,
        },
      }
    );

    const page = pagesResponse.data.data[0];
    const igUserId = page?.instagram_business_account?.id;

    if (!igUserId) {
      return res.redirect(`${FRONTEND_URL}/settings?auth=no_instagram`);
    }

    // 4. Сохраняем в Supabase
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await supabase
      .from('users')
      .update({
        ig_user_id: igUserId,
        ig_access_token: longToken,
        ig_token_expires_at: expiresAt.toISOString(),
      })
      .eq('id', userId);

    res.redirect(`${FRONTEND_URL}/settings?auth=success`);
  } catch (error) {
    console.error('OAuth error:', error);
    res.redirect(`${FRONTEND_URL}/settings?auth=error`);
  }
});

export default router;
