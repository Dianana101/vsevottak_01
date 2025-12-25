# VseVotTak - Instagram Auto-Posting App

🚀 Автоматизированное приложение для создания и публикации постов в Instagram с текстовыми изображениями по расписанию.

## 📋 Описание

VseVotTak — это full-stack приложение для автоматической генерации и публикации контента в Instagram. Приложение создаёт красивые текстовые изображения и публикует их по заданному расписанию (например, каждый день в 12:00).

### Основные возможности:

- ✅ **OAuth авторизация** через Facebook для Instagram Business API
- ✅ **Автоматическое обновление токенов** (long-lived tokens)
- ✅ **Планировщик постов** с гибким расписанием
- ✅ **Генерация изображений** с кастомным текстом, шрифтами и цветами
- ✅ **Аналитика** и статистика публикаций
- ✅ **Одновременные расписания** для разных тем
- ✅ **Telegram-бот** для управления (опционально)

## 🏗️ Архитектура

```
vsevottak_01/
├── backend/          # Node.js + TypeScript API
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic
│   │   ├── jobs/         # Cron jobs
│   │   ├── lib/          # Utilities
│   │   └── types/        # TypeScript types
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/         # React + TypeScript
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Pages
│   │   ├── hooks/        # Custom hooks
│   │   ├── lib/          # Utilities
│   │   └── types/        # TypeScript types
│   ├── package.json
│   └── vite.config.ts
│
├── docs/             # Документация
└── .env.example      # Environment variables template
```

## 🛠️ Технологический стек

### Backend:
- **Node.js** + **TypeScript**
- **Express.js** - API server
- **Supabase** - PostgreSQL database & auth
- **Node-cron** - Job scheduling
- **Canvas/Sharp** - Image generation
- **Axios** - HTTP client for Instagram API

### Frontend:
- **React** + **TypeScript**
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **React Router** - Navigation
- **Axios** - API calls

### Infrastructure:
- **Instagram Content Publishing API**
- **Facebook OAuth**
- **Google Cloud / Firebase** (for deployment)

## 🚀 Установка и запуск

### Предварительные требования:

1. **Node.js** >= 18.x
2. **npm** или **yarn**
3. **Supabase** аккаунт
4. **Facebook Developer** аккаунт с настроенным приложением
5. **Instagram Business Account** связанный с Facebook Page

### Шаг 1: Клонирование репозитория

```bash
git clone https://github.com/Dianana101/vsevottak_01.git
cd vsevottak_01
```

### Шаг 2: Настройка Backend

```bash
cd backend
npm install
cp .env.example .env
```

Отредактируйте `.env`:

```env
# Instagram API
INSTAGRAM_APP_ID=your_app_id
INSTAGRAM_APP_SECRET=your_app_secret
INSTAGRAM_REDIRECT_URI=https://your-domain.com/api/auth/instagram/callback

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Server
PORT=3001
NODE_ENV=development
```

### Шаг 3: Настройка Frontend

```bash
cd ../frontend
npm install
cp .env.example .env
```

Отредактируйте `.env`:

```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Шаг 4: Настройка базы данных

Выполните миграции в Supabase:

```sql
-- Создание таблицы users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Instagram credentials
  ig_user_id TEXT,
  ig_access_token TEXT,
  ig_token_expires_at TIMESTAMPTZ
);

-- Создание таблицы schedules
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  time_of_day TIME NOT NULL,
  topic TEXT NOT NULL,
  bg_color TEXT DEFAULT '#FFFFFF',
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Создание таблицы posts
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
  
  scheduled_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  
  topic TEXT NOT NULL,
  bg_color TEXT NOT NULL,
  image_url TEXT,
  
  instagram_media_id TEXT,
  status TEXT DEFAULT 'pending', -- pending, published, failed
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Шаг 5: Запуск приложения

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

Откройте браузер: `http://localhost:5173`

## 📚 Документация API

### Auth Endpoints

#### `GET /api/auth/instagram/login`
Инициирует OAuth flow для Instagram

**Query params:**
- `user_id` - ID пользователя

**Response:** Redirect to Facebook OAuth

#### `GET /api/auth/instagram/callback`
Обрабатывает OAuth callback

**Query params:**
- `code` - Authorization code
- `state` - User ID

**Response:** Redirect to frontend with auth status

### Schedule Endpoints

#### `POST /api/schedule/daily`
Создаёт ежедневное расписание

**Body:**
```json
{
  "time_of_day": "12:00",
  "topic": "Психология и отношения",
  "bg_color": "#FF5733",
  "user_id": "uuid"
}
```

#### `POST /api/schedule/custom`
Создаёт одноразовый пост

**Body:**
```json
{
  "scheduled_at": "2025-01-01T12:00:00Z",
  "topic": "Новогоднее поздравление",
  "bg_color": "#00FF00",
  "user_id": "uuid"
}
```

#### `GET /api/analytics`
Возвращает статистику постов

## 🔧 Разработка

### Структура проекта (детально)

**Backend:**
```
backend/
├── src/
│   ├── routes/
│   │   ├── auth.ts           # OAuth endpoints
│   │   ├── schedule.ts       # Schedule management
│   │   └── analytics.ts      # Stats endpoints
│   ├── services/
│   │   ├── instagram.ts      # Instagram API
│   │   ├── imageGenerator.ts # Image creation
│   │   └── scheduler.ts      # Post scheduling
│   ├── jobs/
│   │   ├── publishPosts.ts   # Cron: publish scheduled posts
│   │   └── refreshTokens.ts  # Cron: refresh expiring tokens
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client
│   │   └── utils.ts          # Helper functions
│   └── index.ts              # Server entry point
```

**Frontend:**
```
frontend/
├── src/
│   ├── components/
│   │   ├── ScheduleForm.tsx
│   │   ├── PostCard.tsx
│   │   └── Analytics.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Settings.tsx
│   │   └── Analytics.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── usePosts.ts
│   ├── lib/
│   │   ├── api.ts
│   │   └── supabase.ts
│   └── App.tsx
```

## 📊 Примеры использования

### 1. Подключение Instagram аккаунта

1. Перейдите в Settings
2. Нажмите "Connect Instagram Account"
3. Авторизуйтесь через Facebook
4. Выберите Instagram Business аккаунт

### 2. Создание ежедневного расписания

1. Перейдите на главную страницу
2. Заполните форму:
   - Время: 12:00
   - Тема: "Психология"
   - Цвет фона: #FF5733
3. Нажмите "Create Schedule"

### 3. Просмотр аналитики

1. Перейдите в Analytics
2. Смотрите статистику по опубликованным постам

## 🔐 Безопасность

- **Токены Instagram** хранятся в Supabase с шифрованием
- **Environment variables** не коммитятся в Git
- **API endpoints** защищены аутентификацией
- **CORS** настроен только для доверенных доменов

## 🤝 Содействие

Приветствуются Pull Requests! Для больших изменений сначала откройте Issue.

## 📄 Лицензия

GPL-3.0 - см. [LICENSE](LICENSE)

## 👤 Автор

**Dianana101**

- GitHub: [@Dianana101](https://github.com/Dianana101)

## 🙏 Благодарности

- [Instagram Content Publishing API](https://developers.facebook.com/docs/instagram-api)
- [Supabase](https://supabase.com)
- [React](https://react.dev)

---

**Статус разработки:** 🚧 В активной разработке
