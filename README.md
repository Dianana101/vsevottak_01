# VseVotTak - Instagram Auto-Posting App

🚀 An automated application for creating and publishing Instagram posts with AI-generated images and captions on a schedule.

## 📋 Overview

VseVotTak is a full-stack application for automatically generating and publishing engaging content on Instagram. The app creates beautiful text-image posts and publishes them on a predefined schedule (for example, every day at 12:00).

## ✨ Key Features:

- ✅ **OAuth Authorization** via Facebook for Instagram Business API
- ✅ **Automatic Token Refresh** (long-lived tokens)
- ✅ **Post Scheduler** with flexible scheduling options
- ✅ **Image Generation** with custom text, fonts, and colors
- ✅ **Analytics & Statistics** for published posts
- ✅ **Multi-schedule Support** for different topics
- ✅ **Telegram Bot** for management (optional)

## 🏗️ Architecture

```
vsevottak_01/
├── backend/               # Node.js + TypeScript API
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic
│   │   ├── lib/           # Utilities and helpers
│   │   ├── jobs/          # Scheduled tasks
│   │   └── utils/         # Common utilities
│   └── package.json
├── frontend/              # React + TypeScript UI
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   └── utils/         # Frontend utilities
│   └── package.json
└── .env                   # Environment variables
```

## 🛠️ Tech Stack

### Backend:
- **Node.js** with TypeScript
- **Express.js** - Web framework
- **Supabase** - PostgreSQL database & auth
- **Axios** - HTTP client
- **Perplexity AI API** - Text generation
- **Hugging Face** - Image generation
- **node-cron** - Job scheduling

### Frontend:
- **React 18** with TypeScript
- **React Router** - Navigation
- **Axios** - API communication
- **Tailwind CSS** - Styling

### Infrastructure:
- **Supabase** - Database, Auth, Storage
- **Docker** - Containerization
- **GitHub Actions** - CI/CD

## 🚀 Installation & Setup

### Prerequisites:

- Node.js 18+
- npm or yarn
- Supabase account
- Perplexity API key
- Hugging Face API key
- Facebook Developer account with Instagram Business API access

### Step 1: Clone the Repository

```bash
git clone https://github.com/Dianana101/vsevottak_01.git
cd vsevottak_01
```

### Step 2: Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file:

```env
PORRT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
PERPLEXITY_API_KEY=your_perplexity_key
HUGGING_FACE_API_KEY=your_hugging_face_key
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_REDIRECT_URI=http://localhost:3000/callback
```

### Step 3: Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file:

```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_FACEBOOK_APP_ID=your_facebook_app_id
```

### Step 4: Database Setup

Connect to Supabase and run the SQL migrations:

```sql
-- Tables creation scripts (see backend/tst.sql)
```

### Step 5: Start the Application

```bash
# Terminal 1: Start Backend
cd backend
npm start

# Terminal 2: Start Frontend
cd frontend
npm start
```

## 📚 API Documentation

### Auth Endpoints

#### `GET /api/auth/instagram/login`
Initiate Instagram OAuth login flow.

**Response:**
```json
{
  "authUrl": "https://www.instagram.com/oauth/authorize?..."
}
```

#### `GET /api/auth/instagram/callback`
Handle Instagram OAuth callback.

**Query Parameters:**
- `code` - Authorization code from Instagram
- `state` - State parameter for verification

**Response:**
```json
{
  "accessToken": "token",
  "userId": "instagram_user_id"
}
```

### Schedule Endpoints

#### `POST /api/schedule/daily`
Create a daily posting schedule.

**Request Body:**
```json
{
  "topic": "Morning Motivation",
  "time": "09:00",
  "slides": 3,
  "timezone": "UTC"
}
```

**Response:**
```json
{
  "scheduleId": "uuid",
  "status": "active"
}
```

#### `POST /api/schedule/custom`
Create a custom schedule.

**Request Body:**
```json
{
  "topic": "Weekly Tips",
  "cronExpression": "0 9 * * 1",
  "slides": 5
}
```

#### `GET /api/analytics`
Get analytics for published posts.

**Response:**
```json
{
  "totalPosts": 42,
  "totalLikes": 1250,
  "totalComments": 89,
  "averageEngagement": "3.2%"
}
```

## 🔧 Development

### Project Structure (Detailed)

```
backend/src/
├── routes/
│   ├── auth.ts            # Authentication routes
│   ├── schedule.ts        # Schedule management
│   └── analytics.ts       # Analytics endpoints
├── services/
│   ├── contentGenerator.ts # AI content generation
│   ├── instagramService.ts # Instagram API integration
│   └── scheduler.ts       # Job scheduling
├── lib/
│   ├── supabase.ts        # Supabase client
│   └── instagram.ts       # Instagram API wrapper
├── jobs/
│   └── postPublisher.ts   # Background post publishing
└── utils/
    ├── logger.ts          # Logging
    └── errors.ts          # Error handling
```

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
```

## 📊 Usage Examples

### 1. Connecting Your Instagram Account

```bash
POST /api/auth/instagram/login
```

### 2. Creating a Daily Schedule

```bash
POST /api/schedule/daily
Body: {
  "topic": "Daily Inspiration",
  "time": "09:00",
  "slides": 3
}
```

### 3. Viewing Analytics

```bash
GET /api/analytics
```

## 🔐 Security

- All sensitive data is stored encrypted in Supabase
- OAuth tokens are securely managed with automatic refresh
- Environment variables are used for API keys
- Input validation on all endpoints
- CORS protection enabled
- SQL injection prevention through parameterized queries

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the [GPL-3.0 License](./LICENSE) - see the LICENSE file for details.

## 👤 Author

[@Dianana101](https://github.com/Dianana101) - Full-stack developer

## 🙏 Acknowledgments

- [Instagram Content Publishing API](https://developers.facebook.com/docs/instagram-api) - Meta Platform
- [Supabase](https://supabase.com/) - Database & Backend-as-a-Service
- [React](https://react.dev/) - UI Framework
- [Perplexity AI](https://www.perplexity.ai/) - Text Generation
- [Hugging Face](https://huggingface.co/) - Image Generation Models
