import {supabase} from '../lib/supabase';
import {generatePostContent} from '../services/contentGenerator';

const CAROUSEL_IMAGE_COUNT = 3;

interface Schedule {
  id: string;
  user_id: string;
  topic: string;
  time_of_day: string;
  bg_description: string;
  carousel_slides: number;
}

export async function startGeneratingPosts() {
  console.log('🔄 Checking for active schedules to generate posts...');

  try {
    // Получаем все активные расписания
    const { data: schedules, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('is_active', true)
      .eq('type', 'daily');

    if (error) throw error;

    if (!schedules || schedules.length === 0) {
      console.log('No active schedules found');
      return;
    }

    console.log(`Found ${schedules.length} active schedule(s)`);

    for (const schedule of schedules as Schedule[]) {
      // Проверяем, есть ли уже сгенерированные посты на сегодня
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: existingPosts } = await supabase
        .from('posts')
        .select('id')
        .eq('schedule_id', schedule.id)
        .gte('scheduled_at', today.toISOString())
        .lt('scheduled_at', tomorrow.toISOString());

      if (existingPosts && existingPosts.length > 0) {
        console.log(`Posts already generated for schedule ${schedule.id} today: ${existingPosts.length}`);
        continue;
      }

      // Генерируем пост на сегодня
      console.log(`📝 Generating post for schedule ${schedule.id}: ${schedule.topic}`);

      // Генерируем контент (текст + изображения)
      const postContent = await generatePostContent(
        schedule.topic,
        new Date(),
          schedule.carousel_slides || CAROUSEL_IMAGE_COUNT
      );

      console.log(`✅ Content generated: caption length=${postContent.caption.length}, images=${postContent.imageUrl.length}`);

      // Вычисляем время публикации
      const [hours, minutes] = schedule.time_of_day.split(':');
      const scheduledAt = new Date();
      scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Если время уже прошло, генерируем на завтра
      if (scheduledAt < new Date()) {
        scheduledAt.setDate(scheduledAt.getDate() + 1);
      }

      // Создаем пост в базе данных
      const {data: post, error: postError} = await supabase
        .from('posts')
        .insert({
          user_id: schedule.user_id,
          schedule_id: schedule.id,
          topic: schedule.topic,
          bg_description: schedule.bg_description,
          caption: postContent.caption,
          image_url: postContent.imageUrl.join(','),
          status: 'pending',
          scheduled_at: scheduledAt.toISOString(),
          created_at: new Date().toISOString(),
          retry_count: 0
        })
        .select()
        .single();

      if (postError) {
        console.error(`❌ Error creating post for schedule ${schedule.id}:`, postError);
      } else {
        console.log(`✅ Post created successfully for schedule ${schedule.id}, scheduled at ${scheduledAt.toISOString()}`);
      }
    }
  } catch (error: any) {
    console.error('❌ Error generating posts:', error.message);
  }
}
