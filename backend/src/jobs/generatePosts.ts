// // backend/src/jobs/generatePosts.ts
// import {supabase} from '../lib/supabase';
//
// async function startGeneratingPosts() {
//   console.log('🔄 Checking for active schedules to generate posts...');
//
//   try {
//     // Получаем все активные расписания
//     const { data: schedules, error } = await supabase
//       .from('schedules')
//       .select('*')
//       .eq('is_active', true)
//       .eq('type', 'daily');
//
//     if (error) throw error;
//
//     if (!schedules || schedules.length === 0) {
//       console.log('No active schedules found');
//       return;
//     }
//
//     console.log(`Found ${schedules.length} active schedule(s)`);
//
//     for (const schedule of schedules) {
//       // Проверяем, есть ли уже сгенерированные посты на сегодня
//       const today = new Date();
//       today.setHours(0, 0, 0, 0);
//       const tomorrow = new Date(today);
//       tomorrow.setDate(tomorrow.getDate() + 1);
//
//       const { data: existingPosts } = await supabase
//         .from('posts')
//         .select('id')
//         .eq('schedule_id', schedule.id)
//         .gte('scheduled_at', today.toISOString())
//         .lt('scheduled_at', tomorrow.toISOString());
//
//       if (existingPosts && existingPosts.length > 0) {
//         console.log(`Posts already generated for schedule ${schedule.id} today`);
//         continue;
//       }
//
//       // Генерируем пост на сегодня
//       console.log(`📝 Generating post for schedule ${schedule.id}: ${schedule.topic}`);
//
//       const [hours, minutes] = schedule.time_of_day.split(':');
//       const scheduledAt = new Date();
//       scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
//
//       // Если время уже прошло, генерируем на завтра
//       if (scheduledAt < new Date()) {
//         scheduledAt.setDate(scheduledAt.getDate() + 1);
//       }
//
//       // Создаем временное расписание для одного дня
//       const tempSchedule = {
//         ...schedule,
//         start_date: scheduledAt.toISOString().split('T')[0],
//         end_date: scheduledAt.toISOString().split('T')[0],
//         post_time: schedule.time_of_day
//       };
//
//       // await generateDailyPosts(tempSchedule);
//       console.log(`✅ Post generated successfully for schedule ${schedule.id}`);
//     }
//   } catch (error: any) {
//     console.error('❌ Error generating posts:', error.message);
//   }
// }
