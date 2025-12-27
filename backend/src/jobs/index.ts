import cron from 'node-cron';
import { publishScheduledPosts } from './publishPosts';
import { refreshExpiringTokens } from './refreshTokens';

export function startCronJobs() {
  // Проверка и публикация постов каждые 5 минут
  cron.schedule('*/1 * * * *', publishScheduledPosts);
  console.log('📅 Cron: Publishing posts every 1 minutes');

  // Обновление токенов каждый день в 3:00 AM
  cron.schedule('0 3 * * *', refreshExpiringTokens);
  console.log('🔄 Cron: Refreshing tokens daily at 3:00 AM');
}
