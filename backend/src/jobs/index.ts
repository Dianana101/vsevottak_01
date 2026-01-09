import cron from 'node-cron';
import {refreshExpiringTokens} from './refreshTokens';
import {startPublishingJob} from "./publishPosts";

// import { startGeneratingPosts } from './generatePosts';

export function startCronJobs() {
    // Проверка и публикация постов каждые 5 минут


    cron.schedule('*/5 * * * *', startPublishingJob);
    console.log('📅 Cron: Publishing posts every 5 minutes');

    // Обновление токенов каждый день в 3:00 AM
    cron.schedule('0 3 * * *', refreshExpiringTokens);
    console.log('🔄 Cron: Refreshing tokens daily at 3:00 AM');

    // Генерация постов для активных расписаний каждый день в 2:00 AM
    // cron.schedule('0 2 * * *', startGeneratingPosts);
    console.log('📅 Cron: Generating posts for schedules daily at 2:00 AM');
}
