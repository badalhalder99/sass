# Multi-Tenant SaaS Application

A full-stack multi-tenant SaaS application built with Express.js, MongoDB, MySQL, and React.

## 📁 Folder Structure

```
VITAL/
├── backend/                 # Node.js/Express server
│   ├── config/
│   │   ├── database.js     # Multi-database configuration
│   │   └── passport.js     # Authentication strategies
│   ├── middleware/
│   │   ├── auth.js         # Authentication middleware
│   │   └── tenant.js       # Multi-tenant middleware
│   ├── migrations/         # Database migrations
│   │   ├── index.js        # Migration manager
│   │   ├── 001_create_tenants_table.js
│   │   ├── 002_create_users_table.js
│   │   └── 003_create_subscriptions_table.js
│   ├── models/
│   │   ├── User.js         # Multi-tenant user model
│   │   ├── Tenant.js       # Tenant management model
│   │   └── Subscription.js # Subscription model
│   ├── routes/
│   │   ├── auth.js         # Authentication routes
│   │   ├── users.js        # User management
│   │   ├── tenants.js      # Tenant management
│   │   └── subscriptions.js # Subscription management
│   ├── scripts/
│   │   ├── migrate.js      # Migration CLI
│   │   └── seed.js         # Seeding script
│   └── server.js           # Main application
├── frontend/               # React application
└── README.md              # This file
```

## 🚦 How to Run the Project

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- MySQL (v8.0 or higher)
- npm and yarn

### Installation & Setup

1. **Clone or navigate to the project directory**
   ```bash
   git clone https://github.com/badalhalder99/rest-api-node.git
   cd "VITAL - Copy"
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Database Setup**
   ```bash
   # Run migrations
   npm run migrate:up
   
   # Seed with demo data (optional)
   npm run seed
   ```

4. **Frontend Setup**
   ```bash
   cd ../frontend
   yarn install
   ```

### Running the Application

**Terminal 1 - Backend Server:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend Development Server:**
```bash
cd frontend
yarn start
```

### Access URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3002

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Server
PORT=3002
NODE_ENV=development
SESSION_SECRET=your-session-secret

# Databases
MONGODB_URI=mongodb://localhost:27017
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USERNAME=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=multi_tenant_saas

# OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```