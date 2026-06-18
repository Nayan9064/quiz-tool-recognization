# QuizNova 🚀

A full-stack interactive quiz platform for job preparation, built with React, Node.js, Express, and MongoDB.

## Features

- 🎨 **Modern Glassmorphism UI** - Dark theme with purple/blue gradients, smooth animations
- 🔐 **JWT Authentication** - Secure signup/login with profile setup
- 📝 **Smart Quiz Engine** - Category-based quizzes with timer, instant feedback
- 📊 **Performance Analytics** - Strong/weak area analysis, streaks, progress tracking
- 🏆 **Leaderboard** - Compete with other learners
- ⚙️ **Admin Panel** - Full CRUD for quiz questions
- 📱 **Fully Responsive** - Works on mobile and desktop

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Styling | Vanilla CSS (Glassmorphism) |

## Project Structure

```
quiz tool/
├── client/                      # React frontend
│   ├── src/
│   │   ├── components/          # Navbar
│   │   ├── context/             # Auth context
│   │   ├── pages/               # All pages (Login, Signup, Dashboard, Quiz, etc.)
│   │   ├── utils/               # API client
│   │   ├── App.jsx              # Router & routes
│   │   └── index.css            # Design system
│   ├── index.html
│   └── vite.config.js
├── server/                      # Express backend
│   ├── config/db.js             # MongoDB connection
│   ├── controllers/             # Auth, User, Quiz, Admin controllers
│   ├── middleware/auth.js       # JWT middleware
│   ├── models/                  # User, Question, QuizAttempt models
│   ├── routes/                  # API routes
│   ├── seed/seedData.js         # 50 seed questions
│   ├── server.js                # Express entry point
│   └── .env                     # Environment variables
└── README.md
```

## Setup & Installation

### Prerequisites
- Node.js v18+ 
- MongoDB (local or Atlas)

### 1. Install Dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 2. Configure Environment

Edit `server/.env`:
```env
MONGO_URI=mongodb://127.0.0.1:27017/quiznova
JWT_SECRET=your_super_secret_key
PORT=5000
```

### 3. Start MongoDB

Make sure MongoDB is running locally or use MongoDB Atlas.

### 4. Seed Database

```bash
cd server
npm run seed
```

This creates:
- **Admin**: admin@quiznova.com / admin123
- **Demo User**: demo@quiznova.com / demo123
- **50 quiz questions** across all categories

### 5. Start Development Servers

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/signup` | Register | No |
| POST | `/api/auth/login` | Login | No |
| GET | `/api/auth/me` | Current user | Yes |
| PUT | `/api/users/profile` | Update profile | Yes |
| GET | `/api/users/stats` | User statistics | Yes |
| GET | `/api/quiz/categories` | List categories | Yes |
| POST | `/api/quiz/generate` | Generate quiz | Yes |
| POST | `/api/quiz/submit` | Submit answers | Yes |
| GET | `/api/quiz/history` | Quiz history | Yes |
| GET | `/api/quiz/attempt/:id` | Attempt details | Yes |
| GET | `/api/quiz/leaderboard` | Leaderboard | No |
| GET | `/api/admin/questions` | List questions | Admin |
| POST | `/api/admin/questions` | Create question | Admin |
| PUT | `/api/admin/questions/:id` | Update question | Admin |
| DELETE | `/api/admin/questions/:id` | Delete question | Admin |

## Database Schema

### User
- username, email, password (bcrypt)
- profile: age, educationLevel, fieldOfStudy, interests[], avatarColor
- role: user | admin

### Question
- category (Aptitude/Reasoning/Technical/Career)
- subcategory, difficulty (Easy/Medium/Hard)
- questionText, options[4], correctAnswer (index)
- explanation, careerPath

### QuizAttempt
- userId, category, subcategory
- questions[]: questionId, selectedAnswer, isCorrect, timeTaken
- score, totalQuestions, percentage, timeSpent

## Quiz Categories

- **Aptitude**: Number System, Percentage, Time & Work, Speed & Distance, Probability
- **Reasoning**: Logical, Pattern Recognition, Verbal, Analytical, Data Interpretation
- **Technical**: DSA, Programming, Database, OS, Networking, Web Dev, AI/ML
- **Career**: Software Engineer, Data Analyst, DevOps Engineer
