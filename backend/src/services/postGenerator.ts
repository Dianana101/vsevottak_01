import {supabase} from '../lib/supabase';

interface Schedule {
  id: string;
  user_id: string;
  topic: string;
  start_date: string;
  end_date: string;
  post_time: string;
}

// Основная функция генерации постов
async function generateDailyPosts(schedule: Schedule): Promise<any[]> {
    console.log('generateDailyPosts', schedule);
  const startDate = new Date(schedule.start_date);
  const endDate = new Date(schedule.end_date);
  const posts: any[] = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    try {
      console.log(`\n📝 Generating post for ${currentDate.toLocaleDateString('ru-RU')}`);

        // const [caption, imageUrl] = await Promise.all([
        //   //generateCaption(schedule.topic, currentDate),
        //   //generateImage(schedule.topic)
        // ]);


      const [hours, minutes] = schedule.post_time.split(':');
      const scheduledAt = new Date(currentDate);
      scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const { data: post, error } = await supabase
        .from('posts')
        .insert({
          schedule_id: schedule.id,
            image_url: null,
            caption: null,
          scheduled_at: scheduledAt.toISOString(),
          status: 'pending',
          topic: schedule.topic,
          bg_color: '#000000',
          retry_count: 0
        })
        .select()
        .single();

      if (error) throw error;

      posts.push(post);
      console.log(`✅ Post created successfully`);

      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`❌ Error for ${currentDate.toLocaleDateString('ru-RU')}:`, error.message);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return posts;
}
