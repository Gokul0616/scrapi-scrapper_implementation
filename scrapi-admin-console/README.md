# Scrapi Admin Console - Phase 1

AWS-style admin dashboard for managing the Scrapi web scraping platform.

## 🚀 Features (Phase 1)

✅ **Authentication**
- Simple login system with mock authentication
- Session persistence with localStorage
- Protected routes

✅ **Dashboard**
- Key metrics cards (Total Users, Active Users, Total Runs, Success Rate)
- Recent activity feed
- AWS-inspired design

✅ **User Management**
- User list with search functionality
- User details view
- Suspend/Activate users
- Role and plan badges
- Pagination support

✅ **Navigation**
- Responsive sidebar navigation
- AWS-style color scheme
- Clean, professional UI

## 🛠️ Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **Routing**: React Router v6
- **Icons**: Lucide React
- **State**: React Context API

## 📦 Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔐 Login

For Phase 1, authentication is mocked. Simply enter any email address to log in as the platform owner.

**Example credentials:**
- Email: `admin@scrapi.com`
- Password: (any password)

## 📁 Project Structure

```
scrapi-admin-console/
├── src/
│   ├── components/
│   │   └── Layout.tsx          # Main layout with sidebar
│   ├── context/
│   │   └── AuthContext.tsx     # Authentication context
│   ├── pages/
│   │   ├── Login.tsx           # Login page
│   │   ├── Dashboard.tsx       # Dashboard overview
│   │   ├── Users.tsx           # User management
│   │   ├── Actors.tsx          # Placeholder
│   │   ├── Runs.tsx            # Placeholder
│   │   └── Settings.tsx        # Placeholder
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces
│   ├── App.tsx                 # Main app component
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles + Tailwind
├── postcss.config.js
└── package.json
```

## 🎨 Design System

### Colors (AWS-inspired)

- **Navigation**: `#232f3e` (Dark blue-gray)
- **Dark**: `#191e2a` (Darker variant)
- **Light**: `#f2f3f3` (Background)
- **Blue**: `#0071ce` (Primary actions)
- **Orange**: `#ff9900` (Accents)
- **Hover**: `#374151` (Hover states)

### Typography

- Clean, modern sans-serif fonts
- Clear hierarchy with font weights
- Consistent spacing

## 📋 Phase 1 Checklist

- [x] Project setup with Vite + React + TypeScript
- [x] Tailwind CSS v4 configuration
- [x] Authentication system (mock)
- [x] Layout with sidebar navigation
- [x] Dashboard with metrics
- [x] User management page
- [x] Responsive design
- [x] AWS-style theming

## 🔜 Coming in Phase 2

- Analytics dashboard with charts
- Actor feature/verify system
- Run monitoring and control
- System settings management
- Enhanced audit logs with filters
- Real backend integration

## 🚀 Deployment

```bash
# Build for production
npm run build

# The dist/ folder contains the production-ready files
# Deploy to any static hosting service (Vercel, Netlify, AWS S3, etc.)
```

## 📝 Notes

- This is Phase 1 implementation with mock data
- Backend integration will be added in future phases
- All data is currently stored in component state/localStorage
- Production deployment requires backend API endpoints

## 🤝 Contributing

This is an internal admin console. For feature requests or issues, please contact the development team.

---

**Built with ❤️ for Scrapi Platform**
