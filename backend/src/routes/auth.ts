import express from 'express';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { logAuthEvent } from '../utils/authLogger';

const router = express.Router();

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID;
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/auth/callback';

// Start OAuth flow
router.get('/instagram', (req, res) => {
  const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${INSTAGRAM_APP_ID}&redirect_uri=${REDIRECT_URI}&scope=instagram_basic,instagram_content_publish&response_type=code`;
  res.redirect(authUrl);
});

// Callback after authorization
router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code not provided' });
  }

  try {
    // Exchange code for short-lived token
    const tokenResponse = await axios.post(
      'https://api.instagram.com/oauth/access_token',
      new URLSearchParams({
        client_id: INSTAGRAM_APP_ID!,
        client_secret: INSTAGRAM_APP_SECRET!,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        code: code as string
      })
    );

    const shortLivedToken = tokenResponse.data.access_token;
    const igUserId = tokenResponse.data.user_id;

    // Exchange for long-lived token
    const longLivedResponse = await axios.get(
      `https://graph.instagram.com/access_token`,
      {
        params: {
          grant_type: 'ig_exchange_token',
          client_secret: INSTAGRAM_APP_SECRET,
          access_token: shortLivedToken
        }
      }
    );

    const longLivedToken = longLivedResponse.data.access_token;
    const expiresIn = longLivedResponse.data.expires_in; // 60 days in seconds
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Save or update user
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('ig_user_id', igUserId)
      .single();

    let userId: string;

    if (existingUser) {
      // Update token
      await supabase
        .from('users')
        .update({
          ig_access_token: longLivedToken,
          ig_token_expires_at: expiresAt
        })
        .eq('ig_user_id', igUserId);

      userId = existingUser.id;

      // Log token refresh
      await logAuthEvent(userId, 'instagram_token_refresh', {
        action: 'oauth_callback',
        status: 'success',
        token_expires: expiresAt,
        instagram_user_id: igUserId
      });
    } else {
      // Create new user
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          ig_user_id: igUserId,
          ig_access_token: longLivedToken,
          ig_token_expires_at: expiresAt
        })
        .select()
        .single();

      userId = newUser!.id;

      // Log first authorization
      await logAuthEvent(userId, 'instagram_auth_first', {
        action: 'oauth_callback',
        status: 'success',
        token_expires: expiresAt,
        instagram_user_id: igUserId
      });
    }

    res.json({
      message: 'Authorization successful',
      user_id: userId,
      ig_user_id: igUserId,
      token_expires_at: expiresAt
    });
  } catch (error: any) {
    console.error('OAuth error:', error.response?.data || error.message);

    // Log OAuth error (no user_id since not authorized)
    await logAuthEvent(null, 'instagram_auth_error', {
      action: 'oauth_callback',
      status: 'error',
      error: error.response?.data?.error_message || error.message
    });

    res.status(500).json({ error: 'Authorization failed' });
  }
});

// Manual token refresh (for long-lived tokens)
router.post('/refresh-token', async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  try {
    // Get current token
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('ig_access_token, ig_user_id')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      await logAuthEvent(user_id, 'token_refresh_error', {
        action: 'refresh_token',
        status: 'error',
        error: 'User not found'
      });
      return res.status(404).json({ error: 'User not found' });
    }

    // Refresh token
    const refreshResponse = await axios.get(
      `https://graph.instagram.com/refresh_access_token`,
      {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: user.ig_access_token
        }
      }
    );

    const newToken = refreshResponse.data.access_token;
    const expiresIn = refreshResponse.data.expires_in;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Update in database
    await supabase
      .from('users')
      .update({
        ig_access_token: newToken,
        ig_token_expires_at: expiresAt
      })
      .eq('id', user_id);

    // Log successful refresh
    await logAuthEvent(user_id, 'instagram_token_refresh', {
      action: 'refresh_token',
      status: 'success',
      token_expires: expiresAt,
      instagram_user_id: user.ig_user_id
    });

    res.json({
      message: 'Token refreshed successfully',
      token_expires_at: expiresAt
    });
  } catch (error: any) {
    console.error('Token refresh error:', error.response?.data || error.message);

    await logAuthEvent(user_id, 'token_refresh_error', {
      action: 'refresh_token',
      status: 'error',
      error: error.response?.data?.error?.message || error.message
    });

    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

export default router;
