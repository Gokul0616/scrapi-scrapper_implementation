# Admin Console Implementation Plan
## Scrapi - Web Scraping Platform

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Deep Code Analysis](#deep-code-analysis)
3. [Admin Console Requirements](#admin-console-requirements)
4. [Architecture & Design](#architecture--design)
5. [Implementation Plan](#implementation-plan)
6. [Security Considerations](#security-considerations)
7. [Testing Strategy](#testing-strategy)
8. [Rollout Plan](#rollout-plan)

---

## 1. Project Overview

### 1.1 Current Application Structure

**Technology Stack:**
- **Backend:** FastAPI (Python)
- **Frontend:** React.js
- **Database:** MongoDB
- **Authentication:** JWT-based authentication
- **Real-time Features:** WebSockets for live updates

**Core Features:**
- User authentication & management
- Web scraping engine (Playwright-based)
- Multiple pre-built scrapers (Google Maps, Amazon, Indeed)
- Visual scraper builder
- Actor/Run management system
- Marketplace for scrapers
- AI-powered chat assistants (Lead Chat & Global Chat)
- Dataset management with export capabilities
- Proxy rotation system

### 1.2 Current User Model

```python
class User(BaseModel):
    id: str
    username: str
    email: str
    hashed_password: str
    organization_name: Optional[str] = None
    plan: str = "Free"  # Current: Free plan only
    last_path: Optional[str] = None
    created_at: datetime
```

**Key Observation:** Currently, there is NO role-based access control (RBAC) system. All users have the same permissions.

---

## 2. Deep Code Analysis

### 2.1 Backend Architecture Analysis

#### 2.1.1 Entry Point (`backend/server.py`)
```
Main responsibilities:
- FastAPI application initialization
- MongoDB connection setup
- CORS configuration
- API routes registration
- Startup events (creates default actors)
- Static file serving for frontend
```

#### 2.1.2 Authentication System (`backend/auth.py`)
```python
Current implementation:
- JWT token generation with HS256 algorithm
- Token expiration: 7 days
- Password hashing: bcrypt
- HTTPBearer security scheme
- get_current_user() dependency for protected routes

Missing:
❌ Role-based access control
❌ Permission system
❌ Admin user identification
❌ Super admin capabilities
```

#### 2.1.3 API Routes (`backend/routes.py` - 1229 lines)
```
Existing endpoints categorized:

AUTH ROUTES:
- POST /auth/register
- POST /auth/login
- GET /auth/me
- PATCH /auth/last-path
- GET /auth/last-path

ACTOR ROUTES:
- GET /actors (list all actors)
- GET /actors/{id}
- POST /actors (create actor)
- PATCH /actors/{id}
- DELETE /actors/{id}
- GET /actors-used
- POST /actors/{id}/fork

RUN ROUTES:
- POST /runs (create run)
- GET /runs (list runs with pagination)
- GET /runs/{id}
- DELETE /runs/{id}/abort
- POST /runs/abort-multiple
- POST /runs/abort-all

DATASET ROUTES:
- GET /datasets/{run_id}
- GET /datasets/{run_id}/export (JSON/CSV)

MARKETPLACE ROUTES:
- GET /marketplace
- GET /templates
- POST /actors/validate-schema
- PATCH /actors/{id}/publish

CHAT ROUTES:
- POST /chat/global
- GET /chat/global/history
- DELETE /chat/global/history
- POST /leads/{lead_id}/chat
- GET /leads/{lead_id}/chat

PROXY ROUTES:
- GET /proxies
- POST /proxies
- DELETE /proxies/{id}
- GET /proxies/health-check
- POST /proxies/fetch-free

Missing:
❌ Admin-only endpoints
❌ User management endpoints
❌ System monitoring endpoints
❌ Analytics endpoints
❌ Audit log endpoints
```

#### 2.1.4 Data Models (`backend/models.py`)
```
Current Collections in MongoDB:
1. users - User accounts
2. actors - Scraper definitions
3. runs - Scraping executions
4. datasets - Scraped data storage
5. dataset_items - Individual data records
6. proxies - Proxy configurations
7. lead_chats - AI chat history for leads
8. global_chat_history - Global assistant chat history

Missing Collections:
❌ admin_settings - System configurations
❌ audit_logs - Activity tracking
❌ user_sessions - Session management
❌ system_metrics - Performance tracking
```

### 2.2 Frontend Architecture Analysis

#### 2.2.1 Application Structure (`frontend/src/App.js`)
```javascript
Current Routes:
- /login - Public
- /register - Public
- / - Redirects to last path or /home
- /home - Dashboard
- /actors - Actor listing
- /actor/:id - Actor details
- /runs - Run history
- /datasets/:runId - Dataset viewer
- /marketplace - Scraper marketplace
- /store - Actor store
- /actor-code-editor/:id - Code editor

Missing Routes:
❌ /admin - Admin console
❌ /admin/users - User management
❌ /admin/system - System settings
❌ /admin/analytics - Analytics dashboard
❌ /admin/audit-logs - Audit trail
```

#### 2.2.2 Authentication Context (`frontend/src/contexts/AuthContext.js`)
```javascript
Current Auth Context:
- user: Current user object
- login(): User login function
- logout(): User logout function
- register(): User registration function
- loading: Loading state
- lastPath: Last visited path
- updateLastPath(): Update last path

Missing:
❌ isAdmin: Admin role check
❌ hasPermission(): Permission checking
❌ userRole: User role information
```

#### 2.2.3 Sidebar Navigation (`frontend/src/components/Sidebar.js`)
```javascript
Current Menu Items:
- Home
- Actors
- Runs
- Store
- Marketplace

Missing:
❌ Admin Console (conditional rendering for admin users)
```

### 2.3 Database Structure Analysis

**MongoDB Collections Schema:**

```javascript
// users collection
{
  _id: ObjectId,
  id: "uuid",
  username: "string",
  email: "string",
  hashed_password: "string",
  organization_name: "string",
  plan: "Free",
  last_path: "string",
  created_at: "ISODate"
}

// actors collection
{
  _id: ObjectId,
  id: "uuid",
  user_id: "uuid",
  name: "string",
  description: "string",
  icon: "emoji",
  category: "string",
  type: "prebuilt|custom",
  code: "string",
  input_schema: {},
  is_public: boolean,
  is_starred: boolean,
  runs_count: number,
  status: "draft|published|archived",
  tags: [],
  created_at: "ISODate",
  // ... more fields
}

// runs collection
{
  _id: ObjectId,
  id: "uuid",
  user_id: "uuid",
  actor_id: "uuid",
  actor_name: "string",
  status: "queued|running|succeeded|failed|aborted",
  input_data: {},
  started_at: "ISODate",
  finished_at: "ISODate",
  duration_seconds: number,
  results_count: number,
  dataset_id: "uuid",
  error_message: "string",
  logs: [],
  cost: number,
  created_at: "ISODate"
}
```

### 2.4 Key Findings & Gaps

#### ✅ Strengths:
1. Well-structured codebase with clear separation of concerns
2. Robust authentication system (JWT-based)
3. Comprehensive API endpoints for core functionality
4. Modern React frontend with good component structure
5. MongoDB flexible schema allows easy extension

#### ❌ Gaps for Admin Console:
1. **No Role System:** No concept of admin, user, or other roles
2. **No Admin Routes:** No backend endpoints for admin operations
3. **No User Management:** Cannot manage users from the application
4. **No System Monitoring:** No visibility into system health
5. **No Audit Logs:** No tracking of admin actions
6. **No Analytics:** No system-wide statistics or insights
7. **No Permission Checks:** All authenticated users have same access

---

## 3. Admin Console Requirements

### 3.1 Access Control

**Owner Definition:**
- The FIRST registered user in the system (user with earliest `created_at` timestamp)
- OR users with `role: "owner"` or `role: "admin"` field in database
- Alternative: Use environment variable to define owner email

**Access Levels:**
1. **Owner/Super Admin** - Full system control
2. **Regular User** - Standard application features only

### 3.2 Functional Requirements

#### 3.2.1 User Management
- View all registered users (paginated list)
- Search users by username, email, or organization
- View user details (profile, statistics, activity)
- Suspend/activate user accounts
- Reset user passwords
- Delete user accounts (with confirmation)
- View user's runs, actors, and datasets
- Modify user plan (Free → Premium → Enterprise)
- View user activity timeline

#### 3.2.2 System Analytics Dashboard
- **User Metrics:**
  - Total users
  - Active users (logged in last 7 days)
  - New registrations (today, this week, this month)
  - User growth chart (line graph)
  
- **Scraping Metrics:**
  - Total runs executed
  - Successful runs vs failed runs (pie chart)
  - Average run duration
  - Top 5 most used actors
  - Scraping activity timeline (bar chart)
  
- **Resource Usage:**
  - Database size
  - Total datasets stored
  - Total dataset items
  - Storage per user (top 10 users)
  
- **System Health:**
  - API response times
  - Error rates
  - Currently running scrapes
  - Queued jobs count

#### 3.2.3 Actor Management (Admin View)
- View all actors (system-wide, not just user's)
- View actor usage statistics
- Feature/unfeature actors in marketplace
- Verify actors (add verified badge)
- Delete inappropriate actors
- View actor code/configuration
- Monitor actor performance metrics

#### 3.2.4 Run Management (Admin View)
- View all runs across all users
- Filter runs by status, user, actor, date range
- Abort any running job
- View detailed run logs
- Identify expensive/long-running operations
- Export run data for analysis

#### 3.2.5 System Settings
- Configure system-wide settings:
  - Maximum concurrent runs per user
  - Maximum dataset storage per user
  - Default proxy settings
  - Email notifications settings
  - Maintenance mode toggle
  - Rate limiting configurations

#### 3.2.6 Audit Logs
- Track all admin actions with timestamps
- Track critical user actions (registration, deletions)
- View logs with filters (action type, user, date range)
- Export audit logs for compliance

#### 3.2.7 Database Management
- View database statistics
- Run database cleanup tasks
- Export database backups (trigger)
- View collection sizes
- Monitor query performance

### 3.3 Non-Functional Requirements

#### 3.3.1 Security
- **Authentication:** Only owner can access admin console
- **Authorization:** All admin endpoints protected with role check
- **Audit Trail:** All admin actions must be logged
- **Session Management:** Admin sessions timeout after inactivity
- **API Security:** Rate limiting on admin endpoints

#### 3.3.2 Performance
- Admin queries should not impact regular user performance
- Pagination for large data sets
- Caching for dashboard metrics
- Lazy loading for heavy components

#### 3.3.3 Usability
- Clean, professional admin UI (similar to Vercel/Netlify admin)
- Responsive design for mobile/tablet
- Search and filter capabilities on all lists
- Confirm dialogs for destructive actions
- Toast notifications for actions

---

## 4. Architecture & Design

### 4.1 Database Schema Extensions

#### 4.1.1 Updated User Model
```python
class User(BaseModel):
    id: str
    username: str
    email: str
    hashed_password: str
    organization_name: Optional[str] = None
    plan: str = "Free"
    
    # NEW FIELDS FOR ADMIN SYSTEM
    role: str = "user"  # user, admin, owner
    is_active: bool = True  # For account suspension
    is_email_verified: bool = False
    last_login_at: Optional[datetime] = None
    login_count: int = 0
    last_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    suspended_at: Optional[datetime] = None
    suspended_by: Optional[str] = None  # Admin user_id
    suspension_reason: Optional[str] = None
```

#### 4.1.2 New Audit Log Model
```python
class AuditLog(BaseModel):
    id: str
    admin_id: str  # User who performed action
    admin_username: str
    action_type: str  # user_created, user_suspended, user_deleted, etc.
    target_type: str  # user, actor, run, system
    target_id: Optional[str] = None
    description: str  # Human-readable description
    metadata: Dict[str, Any]  # Additional context
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime
```

#### 4.1.3 New System Settings Model
```python
class SystemSettings(BaseModel):
    id: str = "system_settings"  # Singleton document
    max_concurrent_runs_per_user: int = 5
    max_dataset_size_mb: int = 1000
    maintenance_mode: bool = False
    maintenance_message: str = ""
    rate_limit_per_minute: int = 60
    email_notifications_enabled: bool = True
    default_proxy_enabled: bool = False
    updated_at: datetime
    updated_by: str  # Admin user_id
```

### 4.2 Backend Architecture

#### 4.2.1 New Middleware: Admin Auth Middleware
```python
# backend/admin_auth.py

async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Dependency to verify user is an admin/owner.
    Raises HTTPException if user is not admin.
    """
    user_doc = await db.users.find_one({"id": current_user["id"]})
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_doc.get("role") not in ["admin", "owner"]:
        raise HTTPException(
            status_code=403, 
            detail="Access denied. Admin privileges required."
        )
    
    return user_doc

async def check_is_owner() -> bool:
    """Check if there's an owner in the system."""
    owner = await db.users.find_one({"role": "owner"})
    return owner is not None

async def assign_first_user_as_owner():
    """Assign owner role to the first registered user."""
    # Find user with earliest created_at
    first_user = await db.users.find_one(
        {},
        sort=[("created_at", 1)]
    )
    
    if first_user and first_user.get("role") != "owner":
        await db.users.update_one(
            {"id": first_user["id"]},
            {"$set": {"role": "owner"}}
        )
        logger.info(f"Assigned owner role to first user: {first_user['username']}")
```

#### 4.2.2 New Routes: Admin Routes
```python
# backend/admin_routes.py

router = APIRouter(prefix="/admin", tags=["admin"])

# ========== User Management ==========
@router.get("/users")
async def get_all_users(
    page: int = 1,
    limit: int = 20,
    search: str = None,
    role: str = None,
    admin: dict = Depends(get_admin_user)
)

@router.get("/users/{user_id}")
async def get_user_details(user_id: str, admin: dict = Depends(get_admin_user))

@router.patch("/users/{user_id}/suspend")
async def suspend_user(user_id: str, reason: str, admin: dict = Depends(get_admin_user))

@router.patch("/users/{user_id}/activate")
async def activate_user(user_id: str, admin: dict = Depends(get_admin_user))

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(get_admin_user))

@router.patch("/users/{user_id}/plan")
async def update_user_plan(user_id: str, plan: str, admin: dict = Depends(get_admin_user))

# ========== Analytics ==========
@router.get("/analytics/overview")
async def get_analytics_overview(admin: dict = Depends(get_admin_user))

@router.get("/analytics/users")
async def get_user_analytics(
    period: str = "week",  # day, week, month, year
    admin: dict = Depends(get_admin_user)
)

@router.get("/analytics/runs")
async def get_run_analytics(
    period: str = "week",
    admin: dict = Depends(get_admin_user)
)

# ========== Actor Management ==========
@router.get("/actors")
async def get_all_actors(
    page: int = 1,
    limit: int = 20,
    admin: dict = Depends(get_admin_user)
)

@router.patch("/actors/{actor_id}/feature")
async def toggle_actor_featured(actor_id: str, admin: dict = Depends(get_admin_user))

@router.patch("/actors/{actor_id}/verify")
async def toggle_actor_verified(actor_id: str, admin: dict = Depends(get_admin_user))

# ========== Audit Logs ==========
@router.get("/audit-logs")
async def get_audit_logs(
    page: int = 1,
    limit: int = 50,
    action_type: str = None,
    admin: dict = Depends(get_admin_user)
)

# ========== System Settings ==========
@router.get("/settings")
async def get_system_settings(admin: dict = Depends(get_admin_user))

@router.patch("/settings")
async def update_system_settings(
    settings: SystemSettingsUpdate,
    admin: dict = Depends(get_admin_user)
)
```

#### 4.2.3 Service Layer: Admin Service
```python
# backend/admin_service.py

class AdminService:
    """Service for admin-related operations."""
    
    def __init__(self, db):
        self.db = db
    
    async def get_user_statistics(self) -> dict:
        """Get comprehensive user statistics."""
        total_users = await self.db.users.count_documents({})
        
        # Active users (logged in last 7 days)
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        active_users = await self.db.users.count_documents({
            "last_login_at": {"$gte": seven_days_ago}
        })
        
        # New users today, this week, this month
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        new_today = await self.db.users.count_documents({
            "created_at": {"$gte": today}
        })
        
        new_week = await self.db.users.count_documents({
            "created_at": {"$gte": week_ago}
        })
        
        new_month = await self.db.users.count_documents({
            "created_at": {"$gte": month_ago}
        })
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "new_today": new_today,
            "new_this_week": new_week,
            "new_this_month": new_month
        }
    
    async def get_run_statistics(self) -> dict:
        """Get comprehensive run statistics."""
        total_runs = await self.db.runs.count_documents({})
        
        pipeline = [
            {
                "$group": {
                    "_id": "$status",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        status_counts = {}
        async for doc in self.db.runs.aggregate(pipeline):
            status_counts[doc["_id"]] = doc["count"]
        
        # Average duration
        avg_pipeline = [
            {
                "$match": {"duration_seconds": {"$ne": None}}
            },
            {
                "$group": {
                    "_id": None,
                    "avg_duration": {"$avg": "$duration_seconds"}
                }
            }
        ]
        
        avg_result = await self.db.runs.aggregate(avg_pipeline).to_list(1)
        avg_duration = avg_result[0]["avg_duration"] if avg_result else 0
        
        return {
            "total_runs": total_runs,
            "status_breakdown": status_counts,
            "average_duration_seconds": avg_duration
        }
    
    async def log_admin_action(
        self,
        admin_id: str,
        admin_username: str,
        action_type: str,
        target_type: str,
        target_id: str,
        description: str,
        metadata: dict = None
    ):
        """Log an admin action to audit trail."""
        from models import AuditLog
        
        log = AuditLog(
            admin_id=admin_id,
            admin_username=admin_username,
            action_type=action_type,
            target_type=target_type,
            target_id=target_id,
            description=description,
            metadata=metadata or {}
        )
        
        doc = log.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await self.db.audit_logs.insert_one(doc)
```

### 4.3 Frontend Architecture

#### 4.3.1 New Routes in App.js
```javascript
// Admin routes (protected by AdminRoute component)
<Route
  path="/admin"
  element={
    <AdminRoute>
      <DashboardLayout>
        <AdminDashboard />
      </DashboardLayout>
    </AdminRoute>
  }
/>
<Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
<Route path="/admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
<Route path="/admin/actors" element={<AdminRoute><AdminActors /></AdminRoute>} />
<Route path="/admin/runs" element={<AdminRoute><AdminRuns /></AdminRoute>} />
<Route path="/admin/audit-logs" element={<AdminRoute><AdminAuditLogs /></AdminRoute>} />
<Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
```

#### 4.3.2 AdminRoute Component
```javascript
// frontend/src/components/AdminRoute.js

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      try {
        const response = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}/api/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        const data = await response.json();
        setIsAdmin(data.role === 'admin' || data.role === 'owner');
      } catch (error) {
        console.error('Failed to check admin status:', error);
        setIsAdmin(false);
      } finally {
        setChecking(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  if (loading || checking) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/home" replace />;
  }

  return children;
};
```

#### 4.3.3 Admin Console Pages Structure

```
frontend/src/admin/
├── AdminDashboard.js        # Main dashboard with key metrics
├── AdminUsers.js             # User management page
├── AdminUserDetail.js        # Individual user details
├── AdminAnalytics.js         # Analytics & charts
├── AdminActors.js            # Actor management
├── AdminRuns.js              # Run management
├── AdminAuditLogs.js         # Audit trail
├── AdminSettings.js          # System settings
└── components/
    ├── StatCard.js           # Metric card component
    ├── UserTable.js          # User list table
    ├── ChartCard.js          # Chart wrapper
    └── ActionConfirmModal.js # Confirmation modal
```

#### 4.3.4 Admin Dashboard UI Mockup (AdminDashboard.js)

```javascript
const AdminDashboard = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Admin Console</h1>
        <p className="text-gray-600">System overview and management</p>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          change="+12%"
          icon={<Users />}
        />
        <StatCard
          title="Active Users"
          value={stats.activeUsers}
          change="+5%"
          icon={<Activity />}
        />
        <StatCard
          title="Total Runs"
          value={stats.totalRuns}
          change="+24%"
          icon={<Play />}
        />
        <StatCard
          title="Success Rate"
          value={stats.successRate + "%"}
          change="+2%"
          icon={<CheckCircle />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartCard title="User Growth">
          <LineChart data={userGrowthData} />
        </ChartCard>
        <ChartCard title="Run Status Distribution">
          <PieChart data={runStatusData} />
        </ChartCard>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
        <RecentActivityTable activities={recentActivities} />
      </div>
    </div>
  );
};
```

---

## 5. Implementation Plan

### Phase 1: Backend Foundation (Week 1)

#### Day 1-2: Database & Models
- [ ] Update User model with role field
- [ ] Create migration script to add role to existing users
- [ ] Assign owner role to first user
- [ ] Create AuditLog model
- [ ] Create SystemSettings model
- [ ] Add indexes for performance

#### Day 3-4: Admin Authentication & Middleware
- [ ] Create `admin_auth.py` with get_admin_user dependency
- [ ] Update `auth.py` to include role in JWT token
- [ ] Update `/auth/me` endpoint to return role
- [ ] Write tests for admin authentication

#### Day 5-7: Admin API Routes
- [ ] Create `admin_routes.py` file
- [ ] Implement user management endpoints
- [ ] Implement analytics endpoints
- [ ] Implement audit log endpoints
- [ ] Implement system settings endpoints
- [ ] Create AdminService class
- [ ] Write comprehensive tests

### Phase 2: Frontend Foundation (Week 2)

#### Day 1-2: Admin Route Protection
- [ ] Update AuthContext to fetch and store user role
- [ ] Create AdminRoute component
- [ ] Add admin routes to App.js
- [ ] Update Sidebar to show Admin menu (conditional)

#### Day 3-4: Admin Layout & Dashboard
- [ ] Create admin folder structure
- [ ] Build AdminDashboard.js with metrics
- [ ] Create reusable components (StatCard, ChartCard)
- [ ] Implement API calls for dashboard data
- [ ] Add loading states and error handling

#### Day 5-7: User Management UI
- [ ] Build AdminUsers.js page
- [ ] Create user list table with pagination
- [ ] Implement search and filter
- [ ] Add suspend/activate actions
- [ ] Add delete user with confirmation
- [ ] Build AdminUserDetail.js page

### Phase 3: Analytics & Monitoring (Week 3)

#### Day 1-3: Analytics Implementation
- [ ] Build AdminAnalytics.js page
- [ ] Integrate charting library (recharts or chart.js)
- [ ] Implement user growth chart
- [ ] Implement run statistics charts
- [ ] Add date range filters
- [ ] Add export functionality

#### Day 4-5: Actor & Run Management
- [ ] Build AdminActors.js page
- [ ] Add feature/verify actor actions
- [ ] Build AdminRuns.js page
- [ ] Add global run monitoring
- [ ] Add run abort capabilities

#### Day 6-7: Audit Logs
- [ ] Build AdminAuditLogs.js page
- [ ] Implement log filtering
- [ ] Add export functionality
- [ ] Create log detail view

### Phase 4: System Settings & Polish (Week 4)

#### Day 1-2: System Settings
- [ ] Build AdminSettings.js page
- [ ] Implement settings form
- [ ] Add validation
- [ ] Test settings persistence

#### Day 3-4: Security Hardening
- [ ] Implement rate limiting on admin endpoints
- [ ] Add CSRF protection
- [ ] Audit all admin actions are logged
- [ ] Add IP tracking for admin actions

#### Day 5-7: Testing & Documentation
- [ ] Write comprehensive unit tests
- [ ] Write integration tests
- [ ] Write E2E tests for critical flows
- [ ] Create admin user documentation
- [ ] Create API documentation for admin endpoints

---

## 6. Security Considerations

### 6.1 Authentication & Authorization

**✅ Implemented:**
- JWT-based authentication
- Password hashing with bcrypt
- Token expiration

**🔒 To Implement:**
1. **Role-Based Access Control (RBAC)**
   ```python
   # Only allow owner/admin roles
   async def get_admin_user(current_user = Depends(get_current_user)):
       user = await db.users.find_one({"id": current_user["id"]})
       if user.get("role") not in ["admin", "owner"]:
           raise HTTPException(403, "Admin access required")
       return user
   ```

2. **Admin Session Timeout**
   - Shorter token expiry for admin sessions (1 hour instead of 7 days)
   - Require re-authentication for sensitive actions

3. **Two-Factor Authentication (Future)**
   - TOTP-based 2FA for admin accounts
   - Backup codes for recovery

### 6.2 Data Protection

1. **Sensitive Data Handling**
   - Never expose hashed passwords in API responses
   - Mask sensitive user data in logs
   - Encrypt audit logs at rest

2. **Input Validation**
   - Validate all admin inputs with Pydantic
   - Sanitize user search queries to prevent injection
   - Rate limit admin endpoints

3. **Audit Logging**
   - Log ALL admin actions with timestamps
   - Include IP address and user agent
   - Immutable logs (no deletion, only archival)

### 6.3 API Security

1. **Rate Limiting**
   ```python
   # Stricter rate limits for admin endpoints
   @limiter.limit("10/minute")
   @router.delete("/users/{user_id}")
   async def delete_user(...):
       ...
   ```

2. **CORS Configuration**
   - Ensure admin endpoints are only accessible from trusted origins
   - No wildcard CORS for admin routes

3. **Error Handling**
   - Generic error messages to prevent information leakage
   - Detailed errors only in logs

### 6.4 Database Security

1. **Query Protection**
   - Use parameterized queries
   - Prevent MongoDB injection
   - Validate all ObjectIds

2. **Backup Strategy**
   - Regular automated backups
   - Test backup restoration
   - Encrypted backup storage

---

## 7. Testing Strategy

### 7.1 Backend Testing

#### Unit Tests
```python
# test_admin_auth.py
async def test_admin_middleware_allows_owner():
    # Test that owner role can access admin routes
    pass

async def test_admin_middleware_blocks_regular_user():
    # Test that regular user gets 403 on admin routes
    pass

async def test_first_user_becomes_owner():
    # Test owner assignment logic
    pass

# test_admin_routes.py
async def test_get_all_users():
    # Test user listing endpoint
    pass

async def test_suspend_user():
    # Test user suspension
    pass

async def test_analytics_overview():
    # Test analytics data calculation
    pass
```

#### Integration Tests
```python
# test_admin_integration.py
async def test_full_user_management_flow():
    # Register -> View -> Suspend -> Activate -> Delete
    pass

async def test_audit_log_creation():
    # Perform admin action -> Verify audit log created
    pass
```

### 7.2 Frontend Testing

#### Component Tests (Jest + React Testing Library)
```javascript
// AdminDashboard.test.js
test('displays user statistics correctly', () => {
  render(<AdminDashboard />);
  expect(screen.getByText('Total Users')).toBeInTheDocument();
});

// AdminRoute.test.js
test('redirects non-admin users', () => {
  // Mock non-admin user
  // Expect redirect to /home
});
```

#### E2E Tests (Playwright)
```javascript
// admin-console.spec.js
test('admin can view and manage users', async ({ page }) => {
  // Login as admin
  // Navigate to /admin/users
  // Verify user list loads
  // Suspend a user
  // Verify suspension
});
```

### 7.3 Security Testing

1. **Authorization Tests**
   - Verify regular users cannot access admin endpoints
   - Test token tampering
   - Test role escalation attempts

2. **Rate Limiting Tests**
   - Verify rate limits on admin endpoints
   - Test behavior when limits exceeded

3. **Audit Log Tests**
   - Verify all admin actions are logged
   - Verify logs cannot be deleted

---

## 8. Rollout Plan

### 8.1 Pre-Deployment Checklist

- [ ] All tests passing (unit, integration, E2E)
- [ ] Security audit completed
- [ ] Code review by team
- [ ] Documentation complete
- [ ] Backup and rollback plan ready
- [ ] Monitoring and alerts configured

### 8.2 Deployment Steps

#### Step 1: Database Migration
```bash
# Run migration script to add role to existing users
python scripts/migrate_add_roles.py

# Verify first user has owner role
python scripts/verify_owner.py
```

#### Step 2: Backend Deployment
```bash
# Deploy backend with admin routes
# Verify admin endpoints are protected
# Test with owner account
```

#### Step 3: Frontend Deployment
```bash
# Build and deploy frontend with admin console
# Verify admin menu appears for owner
# Verify regular users don't see admin menu
```

#### Step 4: Post-Deployment Verification
- [ ] Owner can access admin console
- [ ] Regular users cannot access admin console
- [ ] All admin actions create audit logs
- [ ] Analytics dashboard displays correct data
- [ ] User management functions work correctly

### 8.3 Rollback Plan

If issues are discovered:
1. Revert frontend deployment
2. Revert backend deployment
3. Restore database from backup if needed
4. Investigate and fix issues in staging
5. Re-deploy with fixes

### 8.4 Monitoring

**Key Metrics to Monitor:**
- Admin endpoint response times
- Admin authentication success/failure rate
- Number of admin actions per day
- Error rates on admin endpoints
- Database query performance

**Alerts to Set Up:**
- Failed admin authentication attempts (> 5 in 5 minutes)
- Slow admin queries (> 5 seconds)
- High error rate on admin endpoints (> 5%)
- Unexpected admin action patterns

---

## 9. Future Enhancements

### Phase 5 (Future)

1. **Advanced Analytics**
   - Real-time dashboard with WebSocket updates
   - Predictive analytics for resource usage
   - Cost analysis and optimization recommendations

2. **Multi-Tenancy**
   - Organization-level admin roles
   - Team management within organizations
   - Resource quotas per organization

3. **Notifications**
   - Email notifications for admin alerts
   - Slack/Discord integration for system events
   - Custom notification rules

4. **API Keys Management**
   - Generate API keys for users
   - Track API key usage
   - Revoke compromised keys

5. **Advanced Permissions**
   - Granular permission system
   - Custom roles beyond owner/admin/user
   - Role-based feature flags

6. **Compliance & Reporting**
   - GDPR compliance tools (data export, right to be forgotten)
   - Automated compliance reports
   - Data retention policies

---

## 10. Appendix

### A. Database Indexes to Add

```javascript
// Improve query performance
db.users.createIndex({ "role": 1 });
db.users.createIndex({ "created_at": -1 });
db.users.createIndex({ "last_login_at": -1 });
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });

db.audit_logs.createIndex({ "created_at": -1 });
db.audit_logs.createIndex({ "admin_id": 1 });
db.audit_logs.createIndex({ "action_type": 1 });

db.runs.createIndex({ "created_at": -1 });
db.runs.createIndex({ "user_id": 1 });
db.runs.createIndex({ "status": 1 });

db.actors.createIndex({ "user_id": 1 });
db.actors.createIndex({ "is_featured": 1 });
db.actors.createIndex({ "is_verified": 1 });
```

### B. Environment Variables to Add

```bash
# .env additions for admin console

# Admin Configuration
ADMIN_EMAIL=owner@scrapi.com  # Optional: Use email to identify owner
ADMIN_SESSION_TIMEOUT_MINUTES=60  # Shorter timeout for admin sessions

# Security
ENABLE_2FA=false  # Future: Enable 2FA for admin
RATE_LIMIT_ADMIN_REQUESTS=10  # Per minute

# Monitoring
ENABLE_ADMIN_ALERTS=true
ALERT_EMAIL=alerts@scrapi.com
```

### C. API Endpoint Summary

#### Admin Endpoints (All require admin authentication)

**User Management:**
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/{user_id}` - Get user details
- `PATCH /api/admin/users/{user_id}/suspend` - Suspend user
- `PATCH /api/admin/users/{user_id}/activate` - Activate user
- `DELETE /api/admin/users/{user_id}` - Delete user
- `PATCH /api/admin/users/{user_id}/plan` - Update user plan
- `PATCH /api/admin/users/{user_id}/role` - Update user role

**Analytics:**
- `GET /api/admin/analytics/overview` - System overview
- `GET /api/admin/analytics/users` - User analytics
- `GET /api/admin/analytics/runs` - Run analytics
- `GET /api/admin/analytics/storage` - Storage analytics

**Actor Management:**
- `GET /api/admin/actors` - List all actors
- `PATCH /api/admin/actors/{actor_id}/feature` - Toggle featured
- `PATCH /api/admin/actors/{actor_id}/verify` - Toggle verified
- `DELETE /api/admin/actors/{actor_id}` - Delete actor

**Run Management:**
- `GET /api/admin/runs` - List all runs
- `DELETE /api/admin/runs/{run_id}` - Delete run

**Audit Logs:**
- `GET /api/admin/audit-logs` - List audit logs
- `GET /api/admin/audit-logs/{log_id}` - Get log details

**System Settings:**
- `GET /api/admin/settings` - Get system settings
- `PATCH /api/admin/settings` - Update settings

**Database:**
- `GET /api/admin/database/stats` - Database statistics
- `POST /api/admin/database/cleanup` - Run cleanup tasks

---

## Summary

This implementation plan provides a comprehensive roadmap for building an owner-only admin console for the Scrapi web scraping platform. The plan covers:

1. **Deep code analysis** of the existing application
2. **Complete requirements** for admin functionality
3. **Detailed architecture** for backend and frontend
4. **Phase-by-phase implementation plan** (4 weeks)
5. **Security considerations** and best practices
6. **Testing strategy** across all layers
7. **Deployment and rollback plans**

**Key Features:**
- ✅ Owner-only access control
- ✅ Comprehensive user management
- ✅ System analytics and monitoring
- ✅ Audit logging for compliance
- ✅ Actor and run management
- ✅ System settings configuration

**Next Steps:**
1. Review and approve this plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Regular progress reviews and adjustments
