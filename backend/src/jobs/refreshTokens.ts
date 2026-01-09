import {supabase} from '../lib/supabase';
import axios from 'axios';

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID!;
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET!;

export async function refreshExpiringTokens() {
    try {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        const {data: users, error} = await supabase
            .from('users')
            .select('*')
            .lt('ig_token_expires_at', sevenDaysFromNow.toISOString())
            .not('ig_access_token', 'is', null);

        if (error) throw error;

        for (const user of users || []) {
            try {
                const response = await axios.get(
                    `https://graph.facebook.com/v24.0/oauth/access_token`,
                    {
                        params: {
                            grant_type: 'fb_exchange_token',
                            client_id: INSTAGRAM_APP_ID,
                            client_secret: INSTAGRAM_APP_SECRET,
                            fb_exchange_token: user.ig_access_token,
                        },
                    }
                );

                const newToken = response.data.access_token;
                const expiresIn = response.data.expires_in;
                const newExpiresAt = new Date(Date.now() + expiresIn * 1000);

                await supabase
                    .from('users')
                    .update({
                        ig_access_token: newToken,
                        ig_token_expires_at: newExpiresAt.toISOString(),
                    })
                    .eq('id', user.id);

                console.log(`✓ Refreshed token for user ${user.id}`);
            } catch (err) {
                console.error(`✗ Failed to refresh token for user ${user.id}:`, err);
            }
        }
    } catch (error) {
        console.error('Token refresh job failed:', error);
    }
}
