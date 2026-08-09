# Sarkari Update Hub

A modern, responsive, full-stack government jobs, results, admit cards, and exams notifications portal.

🌐 **Live Website:** [client-omega-plum.vercel.app](https://client-omega-plum.vercel.app)

---

## 🚀 Tech Stack
- **Frontend**: React (Vite) + Tailwind CSS + Lucide Icons
- **Backend**: Node.js + Express
- **Database**: MongoDB (Mongoose schemas)
- **Authentication**: JWT (JSON Web Tokens) with Bcrypt hashing

---

## 📁 Repository Structure
```text
sarkari-update-hub/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Header, Footer, PostCard
│   │   ├── context/        # LangContext, AuthContext
│   │   ├── pages/          # Home, CategoryPage, ImportantDates, PostDetail, Admin panels
│   │   ├── App.jsx         # Routes definition
│   │   └── main.jsx        # Mounting entry point
│   ├── index.html
│   ├── tailwind.config.js
│   └── package.json
├── server/                 # Express backend
│   ├── config/             # Mongoose db connection
│   ├── controllers/        # Auth, Post, and Subscriber API logic
│   ├── middleware/         # JWT verification middleware
│   ├── models/             # Mongoose Schemas (User, Post, Subscriber)
│   ├── routes/             # API routes definition
│   ├── scripts/            # Database seed script
│   ├── server.js           # Server startup script
│   └── package.json
└── README.md               # Setup documentation
```

---

## ⚙️ Getting Started & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A running [MongoDB](https://www.mongodb.com/try/download/community) instance locally, or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) Connection URI.

### 1. Backend Setup
1. Open your terminal and navigate to the `server/` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your environment variables. Rename/create `.env` and fill in your connection details:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/sarkari
   JWT_SECRET=supersecretjwtkey12345!
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=adminpassword123
   ```
4. **Seed the database**: Run the seed script to populates 10 realistic sample job notifications (UPSC CSE, SSC CGL, B.Ed CET, Railway NTPC, etc.) and register the initial admin user:
   ```bash
   npm run seed
   ```
5. Start the Express server:
   ```bash
   npm run dev
   ```
   *(The server will start listening on port `5000`)*.

---

### 2. Frontend Setup
1. Open a new terminal window and navigate to the `client/` directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
   *(Vite will spin up the client dev server on port `3000` and proxy all `/api/*` calls to `http://localhost:5000`)*.

---

## 🔒 Admin Access
- To login to the admin dashboard, visit `/admin` on your browser.
- Log in with the credentials set in your server's `.env` (default is **username**: `admin`, **password**: `adminpassword123`).
- From the dashboard, you can monitor posting analytics, list posts, publish new announcements, edit details, and delete entries.
