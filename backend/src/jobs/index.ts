import cron from 'node-cron';
import {refreshExpiringTokens} from './refreshTokens';
import {startPublishingJob} from "./publishPosts";
import {startGeneratingPosts} from './generatePosts';

export function startCronJobs() {
  // Проверка и публикация постов каждые 5 минут
  // cron.schedule('*/5 * * * *', startPublishingJob);
  console.log('📅 Cron: Publishing posts every 5 minutes');

  // Обновление токенов каждый день в 3:00 AM
  cron.schedule('0 3 * * *', refreshExpiringTokens);
  console.log('🔄 Cron: Refreshing tokens daily at 3:00 AM');

  // Генерация постов для активных расписаний
  cron.schedule('50 21 * * *', startGeneratingPosts); // moscow tz
  console.log('📝 Cron: Generating posts for schedules daily at 2:00 AM');
}

//
// |------------------------------- Minute (0-59)
// |     |------------------------- Hour (0-23)
// |     |     |------------------- Day of the month (1-31)
// |     |     |     |------------- Month (1-12; or JAN to DEC)
// |     |     |     |     |------- Day of the week (0-6; or SUN to SAT; or 7 for Sunday)
//   |     |     |     |     |
// |     |     |     |     |
// *     *     *     *     *
