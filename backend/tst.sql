-- ============================================
-- VseVotTak Database Schema
-- ============================================

-- Включаем расширение для UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Таблица users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Instagram credentials
  ig_user_id TEXT,
  ig_access_token TEXT,
  ig_token_expires_at TIMESTAMPTZ,
  
  -- User settings
  timezone TEXT DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT true
);

-- Индексы для users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_ig_user_id ON users(ig_user_id);
CREATE INDEX IF NOT EXISTS idx_users_token_expires ON users(ig_token_expires_at);

-- ============================================
-- Таблица schedules (расписания)
-- ============================================
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Schedule settings
  time_of_day TIME NOT NULL,
  topic TEXT NOT NULL,
  bg_color TEXT DEFAULT '#FFFFFF',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_bg_color CHECK (bg_color ~* '^#[0-9A-F]{6}$')
);

-- Индексы для schedules
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_active ON schedules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_schedules_time ON schedules(time_of_day);

-- ============================================
-- Таблица posts (посты)
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
  
  -- Post content
  topic TEXT NOT NULL,
  bg_color TEXT NOT NULL DEFAULT '#FFFFFF',
  image_url TEXT,
  caption TEXT,
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  
  -- Instagram data
  instagram_media_id TEXT,
  instagram_container_id TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'published', 'failed')),
  CONSTRAINT valid_bg_color CHECK (bg_color ~* '^#[0-9A-F]{6}$')
);

-- Индексы для posts
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_schedule_id ON posts(schedule_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at ON posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at);
CREATE INDEX IF NOT EXISTS idx_posts_pending ON posts(status, scheduled_at) 
  WHERE status = 'pending';

-- ============================================
-- Таблица analytics (аналитика)
-- ============================================
CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Instagram metrics
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  
  -- Timestamps
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для analytics
CREATE INDEX IF NOT EXISTS idx_analytics_post_id ON analytics(post_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_fetched_at ON analytics(fetched_at);

-- ============================================
-- Функции и триггеры
-- ============================================

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at 
  BEFORE UPDATE ON schedules 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at 
  BEFORE UPDATE ON posts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Включаем RLS для всех таблиц
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Политики для users
CREATE POLICY "Users can view own data" 
  ON users FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data" 
  ON users FOR UPDATE 
  USING (auth.uid() = id);

-- Политики для schedules
CREATE POLICY "Users can view own schedules" 
  ON schedules FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedules" 
  ON schedules FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules" 
  ON schedules FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedules" 
  ON schedules FOR DELETE 
  USING (auth.uid() = user_id);

-- Политики для posts
CREATE POLICY "Users can view own posts" 
  ON posts FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own posts" 
  ON posts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" 
  ON posts FOR UPDATE 
  USING (auth.uid() = user_id);

-- Политики для analytics
CREATE POLICY "Users can view own analytics" 
  ON analytics FOR SELECT 
  USING (auth.uid() = user_id);

-- ============================================
-- Вспомогательные функции
-- ============================================

-- Функция для получения статистики пользователя
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE (
  total_posts BIGINT,
  published_posts BIGINT,
  pending_posts BIGINT,
  failed_posts BIGINT,
  active_schedules BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_posts,
    COUNT(*) FILTER (WHERE status = 'published')::BIGINT AS published_posts,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending_posts,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT AS failed_posts,
    (SELECT COUNT(*)::BIGINT FROM schedules WHERE user_id = p_user_id AND is_active = true) AS active_schedules
  FROM posts
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Тестовые данные (опционально)
-- ============================================

-- Раскомментируйте для добавления тестовых данных
/*
INSERT INTO users (email, ig_user_id) VALUES
('test@example.com', '17841478350028816');

INSERT INTO schedules (user_id, time_of_day, topic, bg_color) VALUES
((SELECT id FROM users WHERE email = 'test@example.com'), '12:00', 'Психология и отношения', '#FF5733');
*/

-- ============================================
-- Комментарии к таблицам
-- ============================================

COMMENT ON TABLE users IS 'Пользователи приложения с Instagram credentials';
COMMENT ON TABLE schedules IS 'Расписания автоматической публикации постов';
COMMENT ON TABLE posts IS 'Посты для публикации в Instagram';
COMMENT ON TABLE analytics IS 'Аналитика по опубликованным постам';

COMMENT ON COLUMN users.ig_user_id IS 'Instagram Business Account ID';
COMMENT ON COLUMN users.ig_access_token IS 'Long-lived Instagram access token';
COMMENT ON COLUMN users.ig_token_expires_at IS 'Дата истечения токена';

COMMENT ON COLUMN posts.status IS 'Статус: pending, processing, published, failed';
COMMENT ON COLUMN posts.retry_count IS 'Количество попыток публикации';

-- ============================================
-- Завершение
-- ============================================

-- Выводим информацию о созданных таблицах
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('users', 'schedules', 'posts', 'analytics')
ORDER BY table_name;
