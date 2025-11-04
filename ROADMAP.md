# 🚀 Apify-Like Scraper Platform - Complete Roadmap

## Vision: "Enterprise Web Scraping Platform"
> A production-ready, no-code + code hybrid platform where users can create, test, run, schedule, and monetize web scrapers at scale.

---

## Current Implementation Status ✅

### Already Built
- ✅ JWT Authentication System
- ✅ Google Maps Scraper with Playwright
- ✅ Basic Visual Scraper Builder (cookie management, preview, selectors)
- ✅ Run Management & Execution
- ✅ Dataset Storage & Export (JSON/CSV)
- ✅ Proxy Rotation System
- ✅ AI Chat Assistant with Function Calling
- ✅ FastAPI Backend + React Frontend
- ✅ MongoDB Database
- ✅ Actor System (CRUD, publish/fork basic)

### To Be Implemented
- ⏳ Monaco Code Editor
- ⏳ Docker-based Sandboxed Execution
- ⏳ Redis Task Queue & Worker Pool
- ⏳ Advanced Scheduling System
- ⏳ Actor Marketplace
- ⏳ Webhook System
- ⏳ Usage Limits & Tiers
- ⏳ Live Monitoring & Logs
- ⏳ Pre-built Actor Templates Library

---

## System Architecture (Hybrid Model)

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                            │
│  (Visual Builder + Monaco Editor + Dashboard + Marketplace)     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                              │
│  • Auth (JWT)                                                    │
│  • Actor Management                                              │
│  • Run Orchestration                                             │
│  • Dataset API                                                   │
│  • Webhook Handler                                               │
└────────┬────────────────────────────┬────────────────────────────┘
         │                            │
         ▼                            ▼
┌─────────────────────┐    ┌──────────────────────────┐
│   MongoDB           │    │    Redis Queue (RQ)      │
│  • Users            │    │  • Job Queue             │
│  • Actors           │    │  • Task Status           │
│  • Runs             │    │  • Worker Health         │
│  • Datasets         │    └──────────┬───────────────┘
│  • Schedules        │               │
└─────────────────────┘               ▼
                           ┌──────────────────────────┐
                           │   Worker Pool (3-10)     │
                           │  • Pull jobs from queue  │
                           │  • Route to executors    │
                           └──────┬──────────┬────────┘
                                  │          │
                    ┌─────────────┘          └─────────────┐
                    ▼                                       ▼
         ┌──────────────────────┐              ┌──────────────────────┐
         │  Visual Scraper      │              │  Code Scraper        │
         │  Executor            │              │  (Docker Sandbox)    │
         │  (FastAPI Process)   │              │  • Python/JS Runner  │
         │  • Playwright        │              │  • Resource Limits   │
         │  • No-code Config    │              │  • Seccomp Profile   │
         └──────────────────────┘              └──────────────────────┘
                    │                                       │
                    └───────────────┬───────────────────────┘
                                    ▼
                          ┌──────────────────────┐
                          │   Target Websites    │
                          └──────────────────────┘
                                    │
                                    ▼
                          ┌──────────────────────┐
                          │  Dataset Storage     │
                          │  • MongoDB (JSONB)   │
                          │  • S3/MinIO (files)  │
                          └──────────────────────┘
```

---

## 📋 PHASE 1: Enhanced Visual Builder + Code Editor Foundation

**Duration:** Week 1 (5-7 days)
**Goal:** Users can create scrapers visually OR with code, save templates

### ✅ Implementation Checklist

#### 🔹 Subphase 1.1: Monaco Code Editor Integration (Day 1-2)
**Status:** ✅ COMPLETED

**Tasks:**
- [x] **1.1.1** Install Monaco Editor dependencies
  - `@monaco-editor/react` package installed
  - Configure webpack for Monaco assets
  - Test basic editor rendering

- [x] **1.1.2** Create CodeEditorComponent.js
  - Monaco editor with Python/JavaScript syntax highlighting
  - Theme support (dark theme)
  - Auto-save functionality (debounced 2s)
  - Error highlighting integration
  - Line numbers and minimap
  - Fullscreen mode, format code, download file

- [x] **1.1.3** Create Actor Code Templates
  - Python template with `start()`, `parse()`, `paginate()` functions ✅
  - JavaScript/Node.js template ✅
  - Templates stored in `/app/backend/templates/`
  - Helper functions included (make_request, clean_text, etc.)

- [x] **1.1.4** Backend: Code Validation API
  - `POST /api/actors/validate-code` endpoint ✅
  - Python AST syntax validation ✅
  - Security checks for dangerous imports (os, sys, subprocess, eval, exec) ✅
  - Check for required functions (start, parse) ✅
  - Return errors with line numbers ✅

- [x] **1.1.5** Full IDE Interface - ActorCodeEditor.js
  - Professional Apify-like code editor interface ✅
  - File explorer sidebar with multiple files ✅
  - Tab system for switching files ✅
  - Console output panel with logs ✅
  - Toolbar with Save, Run, Validate, Settings buttons ✅
  - Settings modal for actor metadata ✅
  - Real-time auto-save with visual indicators ✅

**Deliverable:** ✅ Professional code editor with full IDE experience - COMPLETE

---

#### 🔹 Subphase 1.2: Enhanced Visual Builder (Day 2-3)
**Status:** ⏳ Not Started

**Tasks:**
- [ ] **1.2.1** Improve Selector Detection
  - Click-to-select element on preview page
  - Auto-generate CSS selector (optimized)
  - Auto-generate XPath selector
  - Show selector test results count
  - Highlight matched elements on preview

- [ ] **1.2.2** Advanced Pagination Handling
  - Pagination type selector: Next button, Load more, Infinite scroll, URL pattern
  - Max pages input with validation
  - Wait conditions (selector, time, network idle)
  - Preview pagination flow
  - Test pagination before saving

- [ ] **1.2.3** Form Filling & Interactions
  - Add interaction steps: Click, Type, Select dropdown, Wait
  - Interaction builder UI (drag-drop steps)
  - Store interaction sequence in config
  - Test interactions on preview
  - Support for login flows

- [ ] **1.2.4** Input Schema Builder
  - Define input fields for actor (text, number, boolean, select)
  - Field validation rules (required, min/max, regex)
  - Default values
  - Help text for each field
  - Generate JSON schema automatically

**Deliverable:** Enhanced visual builder with advanced features

---

#### 🔹 Subphase 1.3: Actor Template System (Day 3-4)
**Status:** ⏳ Not Started

**Tasks:**
- [ ] **1.3.1** Database Schema for Templates
  - Create `actor_templates` collection
  - Fields: name, description, category, icon, code/config, input_schema, author, downloads, rating
  - Indexes for search and filtering

- [ ] **1.3.2** Backend: Template API
  - `GET /api/templates` - List all templates (with filters)
  - `GET /api/templates/:id` - Get template details
  - `POST /api/templates` - Create template (admin only)
  - `POST /api/actors/from-template/:id` - Create actor from template
  - Template categories: E-commerce, Social Media, Business Data, News, Jobs, Real Estate

- [ ] **1.3.3** Frontend: Template Library Page
  - Grid view with template cards
  - Search and filter by category
  - Template detail modal (preview code, input schema, example output)
  - "Use Template" button → create new actor
  - Template popularity badges

- [ ] **1.3.4** Pre-built Templates (Create 5-7)
  - ✅ Google Maps Scraper (already exists)
  - Amazon Product Scraper (enhanced)
  - LinkedIn Jobs Scraper
  - Twitter/X Profile Scraper
  - Instagram Profile Scraper
  - Generic Website Scraper (article content)
  - Pagination Example Template

**Deliverable:** Template library with 5-7 working templates

---

#### 🔹 Subphase 1.4: Actor Type Selection & Unified Interface (Day 4-5)
**Status:** ⏳ Not Started

**Tasks:**
- [ ] **1.4.1** Actor Type System
  - Add `actor_type` field to Actor model: 'visual', 'code', 'template'
  - Visual actors: Store scraper_config with selectors
  - Code actors: Store Python/JS code
  - Update Actor creation flow to choose type

- [ ] **1.4.2** Unified Actor Editor Page
  - Tab switcher: Visual Builder | Code Editor | Settings | Input Schema
  - Auto-switch tabs based on actor_type
  - Save button updates correct fields
  - Show actor type badge

- [ ] **1.4.3** Actor Settings Panel
  - Name, description, icon picker
  - Visibility: Private, Public, Team
  - Tags for discovery
  - README documentation field (Markdown)
  - Proxy settings toggle
  - Browser settings (headless, viewport)

- [ ] **1.4.4** Input Schema UI (for both types)
  - JSON Schema editor (visual form builder)
  - Preview input form
  - Validate schema on save
  - Use schema in run creation form

**Deliverable:** Unified interface for creating any type of actor

---

#### 🔹 Subphase 1.5: Testing & Polish (Day 5-6)
**Status:** ⏳ Not Started

**Tasks:**
- [ ] **1.5.1** Test Code Editor
  - Test Python code execution (backend validation)
  - Test JavaScript code (syntax check)
  - Test template insertion
  - Test auto-save functionality

- [ ] **1.5.2** Test Visual Builder Enhancements
  - Test selector detection on various websites
  - Test pagination on different site types
  - Test form filling and interactions
  - Test input schema generation

- [ ] **1.5.3** Test Template System
  - Test template creation and publishing
  - Test creating actors from templates
  - Test template search and filtering
  - Verify all 5-7 templates work correctly

- [ ] **1.5.4** UI/UX Polish
  - Loading states for all async actions
  - Error messages with clear guidance
  - Success notifications
  - Responsive design check
  - Accessibility improvements

**Deliverable:** Stable, tested Phase 1 features ready for production

---

## 📋 PHASE 2: Docker Sandbox + Worker Queue System

**Duration:** Week 2 (6-8 days)
**Goal:** Secure, scalable execution engine for custom code scrapers

### ✅ Implementation Checklist

#### 🔹 Subphase 2.1: Redis Setup & Task Queue (Day 7-8)
**Status:** ⏳ Not Started

**Tasks:**
- [ ] **2.1.1** Install Redis
  - Add Redis to docker-compose.yml
  - Install `redis` and `rq` Python packages
  - Configure Redis connection in backend
  - Test Redis connectivity

- [ ] **2.1.2** Create Task Queue System
  - Create `backend/queue/worker.py` with RQ worker
  - Create `backend/queue/tasks.py` for job definitions
  - Job types: `execute_visual_scraper`, `execute_code_scraper`
  - Job metadata: user_id, actor_id, run_id, input_data
  - Job status tracking in MongoDB

- [ ] **2.1.3** Update Run Execution
  - Modify `POST /api/runs` to enqueue jobs instead of direct execution
  - Visual scrapers: Enqueue to high-priority queue (fast)
  - Code scrapers: Enqueue to standard queue (Docker)
  - Return run_id immediately (status: 'queued')

- [ ] **2.1.4** Worker Health Monitoring
  - Worker heartbeat system (Redis key expiry)
  - `/api/admin/workers` endpoint (list active workers)
  - Worker crash recovery (re-queue failed jobs)
  - Graceful shutdown handling

**Deliverable:** Redis task queue with worker pool foundation

---

#### 🔹 Subphase 2.2: Docker Sandbox Infrastructure (Day 8-10)
**Status:** ⏳ Not Started

**Tasks:**
- [ ] **2.2.1** Create Docker Sandbox Image
  - `backend/sandbox/Dockerfile` with Python 3.11-slim
  - Pre-install common libraries: requests, beautifulsoup4, lxml, playwright
  - No unnecessary tools (no gcc, no pip install in runtime)
  - User: non-root (`scraper` user with UID 1000)
  - Filesystem: Read-only except `/tmp`

- [ ] **2.2.2** Create Sandbox Runner Script
  - `backend/sandbox/runner.py` (entry point)
  - Load user code from stdin or env variable
  - Execute code with timeout (60-300 seconds)
  - Capture stdout/stderr
  - Return JSON results to stdout
  - Handle exceptions gracefully

- [ ] **2.2.3** Docker Execution Manager
  - `backend/sandbox/docker_executor.py` class
  - `run_code(code, input_data, timeout, memory_limit, cpu_limit)`
  - Create container with security flags:
    - `--network none` (no internet from container, use HTTP proxy)
    - `--memory 256m --cpus 0.5`
    - `--read-only` filesystem
    - `--security-opt no-new-privileges`
    - `--cap-drop ALL`
  - Stream logs in real-time
  - Cleanup containers after execution

- [ ] **2.2.4** HTTP Proxy for Containers
  - Install `mitmproxy` or `tinyproxy`
  - Configure proxy in worker host
  - Containers use proxy for HTTP requests
  - Rate limiting per container
  - Log all requests for monitoring

**Deliverable:** Secure Docker sandbox that can execute Python code

---

#### 🔹 Subphase 2.3: Restricted Python Execution (Day 10-11)
**Status:** ⏳ Not Started

**Tasks:**
- [ ] **2.3.1** Safe Execution Environment
  - Whitelist allowed imports: requests, bs4, lxml, json, re, time, datetime, urllib
  - Blacklist dangerous modules: os, sys, subprocess, eval, exec, open, __import__
  - Use `RestrictedPython` library for AST manipulation
  - Sandbox `__builtins__` dictionary

- [ ] **2.3.2** Resource Limits in Code
  - `timeout-decorator` for function timeout
  - Memory profiler to track usage
  - Max file size for output (10MB)
  - Max items per run (10,000)
  - Kill on excessive resource usage

- [ ] **2.3.3** User Code Interface
  - Required functions: `start(input_data)` returns list of URLs
  - `parse(url, html)` returns list of dict
  - Optional: `paginate(url, html)` returns next URL or None
  - Provide helper utilities: `download_image()`, `make_request()`
  - Auto-inject Playwright context for advanced users

- [ ] **2.3.4** Error Handling & Logging
  - Catch all exceptions in runner
  - Return detailed error messages (safe, no code leakage)
  - Log errors to MongoDB with stack trace
  - User-friendly error display in UI

**Deliverable:** Restricted Python execution with safety guarantees

---

#### 🔹 Subphase 2.4: Worker Integration & Testing (Day 11-12)
**Status:** ⏳ Not Started

**Tasks:**
- [ ] **2.4.1** Integrate Docker Executor in Worker
  - Update `execute_code_scraper()` task in worker
  - Load actor code from database
  - Pass input_data to Docker container
  - Store results in dataset
  - Update run status (running → succeeded/failed)

- [ ] **2.4.2** Worker Scaling
  - Run 3-5 worker processes using Supervisor
  - Each worker pulls from queue
  - CPU/memory allocation per worker
  - Auto-restart crashed workers

- [ ] **2.4.3** Job Priority System
  - High priority: Visual scrapers (fast, no Docker overhead)
  - Normal priority: Code scrapers
  - Low priority: Scheduled jobs
  - Separate queues or priority scoring

- [ ] **2.4.4** Comprehensive Testing
  - Test visual scraper execution (should use existing Playwright)
  - Test code scraper execution (should use Docker sandbox)
  - Test concurrent job execution (10+ jobs at once)
  - Test timeout handling
  - Test memory limit enforcement
  - Test malicious code attempts (file access, network abuse)

**Deliverable:** Production-ready worker system executing both scraper types

---

## 📋 PHASE 3: Scheduling + Advanced Features

**Duration:** Week 3 (6-8 days)
**Goal:** Automation, monitoring, webhooks

### ✅ Implementation Checklist

#### 🔹 Subphase 3.1: Scheduling System (Day 13-14)
**Status:** ⏳ Not Started

**Tasks:**
- [ ] **3.1.1** Database Schema for Schedules
  - Create `schedules` collection
  - Fields: actor_id, user_id, cron_expression, input_data, enabled, last_run, next_run, timezone
  - Indexes on next_run and enabled

- [ ] **3.1.2** APScheduler Integration
  - Install `apscheduler` package
  - Configure BackgroundScheduler in FastAPI
  - Load schedules on startup
  - Dynamically add/remove jobs

- [ ] **3.1.3** Schedule API Endpoints
  - `POST /api/schedules` - Create schedule
  - `GET /api/schedules` - List user's schedules
  - `GET /api/schedules/:id` - Get schedule details
  - `PATCH /api/schedules/:id` - Update schedule (cron, input)
  - `DELETE /api/schedules/:id` - Remove schedule
  - `POST /api/schedules/:id/toggle` - Enable/disable

- [ ] **3.1.4** Frontend: Schedule Manager
  - Schedule list page (table view)
  - Create schedule modal with cron builder
  - Visual cron expression builder (daily, weekly, custom)
  - Test schedule execution (manual trigger)
  - Schedule run history

**Deliverable:** Automated scheduling with cron expressions

---

#### 🔹 Subphase 3.2: Webhook System (Day 14-15)
**Status:** ⏳ Not Started

**Tasks:**
- [ ] **3.2.1** Database Schema for Webhooks
  - Create `webhooks` collection
  - Fields: actor_id, user_id, url, events (on_success, on_failure, on_start), headers, payload_template, retry_config
  - Indexes on actor_id

- [ ] **3.2.2** Webhook Delivery System
  - `backend/webhooks/sender.py` module
  - Trigger webhooks on run status change
  - POST request with run data (id, status, results_url, duration, error)
  - Custom headers support (Authorization, etc.)
  - Jinja2 template for payload customization

- [ ] **3.2.3** Retry Logic
  - Retry failed webhooks: 3 attempts with exponential backoff (1s, 5s, 30s)
  - Store delivery attempts in database
  - Webhook delivery status dashboard
  - Manual retry button

- [ ] **3.2.4** Webhook API & UI
  - `POST /api/webhooks` - Create webhook
  - `GET /api/webhooks` - List webhooks
  - `DELETE /api/webhooks/:id` - Remove webhook
  - `POST /api/webhooks/:id/test` - Test webhook delivery
  - Frontend: Webhook manager page (CRUD)

**Deliverable:** Webhook system with retry logic

---

#### 🔹 Subphase 3.3: Enhanced Dataset Management (Day 15-16)
**Status:** ⏳ Not Started

**Tasks:**
- [ ] **3.3.1** Dataset Versioning
  - Track dataset changes (append vs overwrite)
  - Dataset version history (snapshot IDs)
  - Diff between versions
  - Restore previous version

- [ ] **3.3.2** Advanced Export Formats
  - CSV export (already exists, enhance with custom delimiter)
  - Excel export (.xlsx with multiple sheets)
  - XML export
  - Google Sheets integration (OAuth + API)
  - S3/MinIO export (large datasets)

- [ ] **3.3.3** Dataset API
  - `GET /api/datasets/:id/items` - Paginated items (offset, limit)
  - `GET /api/datasets/:id/fields` - Get unique fields/columns
  - `GET /api/datasets/:id/stats` - Count, size, created_at
  - `GET /api/datasets/:id/download` - Pre-signed URL for large files
  - API key authentication for external access

- [ ] **3.3.4** Dataset Preview & Analytics
  - Frontend: Dataset preview with column filtering
  - Search within dataset (text search)
  - Sort by any column
  - Basic analytics: Charts for numeric fields, distribution graphs
  - Export subset of data (filtered results)

**Deliverable:** Advanced dataset management with multiple export formats

---

#### 🔹 Subphase 3.4: Live Monitoring & Logs (Day 16-17)
**Status:** ⏳ Not Started

**Tasks:**
- [ ] **3.4.1** WebSocket Integration
  - Install `python-socketio` or use FastAPI WebSockets
  - Create WebSocket endpoint `/ws/runs/:run_id`
  - Stream logs in real-time from worker
  - Broadcast run status changes

- [ ] **3.4.2** Structured Logging
  - Use `structlog` for JSON logs
  - Log levels: DEBUG, INFO, WARNING, ERROR
  - Include: timestamp, run_id, actor_id, user_id, message, context
  - Store logs in MongoDB (logs collection) with TTL index (7 days)

- [ ] **3.4.3** Frontend: Live Logs Viewer
  - Real-time log streaming in Run detail page
  - Color-coded log levels
  - Auto-scroll to bottom
  - Pause/resume streaming
  - Download logs as text file

- [ ] **3.4.4** Resource Monitoring
  - Track CPU, memory, duration per run
  - Store metrics in MongoDB
  - Dashboard charts: Run duration over time, Success rate, Resource usage
  - Alert on high resource usage (email/webhook)

**Deliverable:** Live monitoring with real-time logs

---

## 📋 PHASE 4: Marketplace + Polish

**Duration:** Week 4 (6-8 days)
**Goal:** Public marketplace, usage limits, production readiness

### ✅ Implementation Checklist

#### 🔹 Subphase 4.1: Actor Marketplace (Day 18-19)
**Status:** ⏳ Not Started

**Tasks:**
- [ ] **4.1.1** Actor Publishing System
  - Actor visibility field: 'private', 'public', 'team'
  - `POST /api/actors/:id/publish` - Publish to marketplace
  - Review process (optional, manual approval)
  - Unpublish option

- [ ] **4.1.2** Marketplace Discovery Page
  - Frontend: `/marketplace` route
  - Grid view of public actors
  - Search by name, description, tags
  - Filter by category (E-commerce, Social Media, etc.)
  - Sort by: Popularity, Recent, Rating
  - Featured actors section

- [ ] **4.1.3** Actor Detail Page (Public View)
  - README documentation (Markdown)
  - Input schema display (what inputs it needs)
  - Example output (sample dataset)
  - Metrics: Total runs, Success rate, Avg duration
  - "Try Actor" button (requires auth)
  - "Fork Actor" button (clone to own account)

- [ ] **4.1.4** Rating & Reviews
  - Add `marketplace_ratings` collection
  - Fields: actor_id, user_id, rating (1-5 stars), review_text, created_at
  - `POST /api/actors/:id/rate` endpoint
  - Display avg rating on actor cards
  - Review moderation (flag inappropriate reviews)

**Deliverable:** Functional marketplace with discovery and ratings

---

#### 🔹 Subphase 4.2: Usage Limits & Tiers (Day 19-20)
**Status:** ⏳ Not Started

**Tasks:**
- [ ] **4.2.1** User Tiers System
  - Add `tier` field to User model: 'free', 'pro', 'enterprise'
  - Define tier limits in config:
    - Free: 10 runs/day, 100 pages/run, 1 schedule, no priority
    - Pro: 1000 runs/day, 10,000 pages/run, 10 schedules, high priority
    - Enterprise: Unlimited
  - Middleware to check limits before run creation

- [ ] **4.2.2** Usage Tracking
  - Track daily run count per user (Redis counter with expiry)
  - Track page count per run (increment in scraper)
  - Store usage history in MongoDB (usage_logs collection)
  - Reset counters at midnight

- [ ] **4.2.3** Quota API
  - `GET /api/users/me/usage` - Current usage vs limits
  - `GET /api/users/me/quota` - Remaining quota
  - Display quota in dashboard UI
  - Warning when approaching limits

- [ ] **4.2.4** Upgrade Flow (UI Only)
  - Pricing page with tier comparison
  - "Upgrade to Pro" button (links to payment - not implemented)
  - Tier badge on user profile
  - Lock features for free users (grayed out with upgrade prompt)

**Deliverable:** Usage-based tier system with limits enforcement

---

#### 🔹 Subphase 4.3: Additional Actor Templates (Day 20-21)
**Status:** ⏳ Not Started

**Tasks:**
- [ ] **4.3.1** E-commerce Templates
  - Amazon Product Scraper (enhanced with reviews, Q&A)
  - eBay Listings Scraper
  - Shopify Store Scraper
  - AliExpress Product Scraper

- [ ] **4.3.2** Social Media Templates
  - Twitter/X Profile Scraper (public tweets)
  - LinkedIn Jobs Scraper (enhanced)
  - Instagram Profile Scraper (posts, followers)
  - Facebook Page Scraper (public posts)

- [ ] **4.3.3** Business Data Templates
  - ✅ Google Maps Scraper (already exists)
  - Yelp Business Scraper
  - Yellow Pages Scraper
  - Crunchbase Company Scraper

- [ ] **4.3.4** Other Templates
  - News Article Scraper (generic)
  - YouTube Video Metadata Scraper
  - GitHub Repository Scraper
  - Indeed Jobs Scraper (enhanced)

**Goal:** 15-20 pre-built templates covering major use cases

**Deliverable:** Comprehensive template library

---

#### 🔹 Subphase 4.4: Testing, Security & Performance (Day 21-23)
**Status:** ⏳ Not Started

**Tasks:**
- [ ] **4.4.1** Security Audit
  - Test Docker sandbox escape attempts
  - Test code injection vulnerabilities
  - Test authentication bypass attempts
  - Test rate limiting effectiveness
  - Input validation on all endpoints
  - SQL/NoSQL injection tests

- [ ] **4.4.2** Performance Optimization
  - Database query optimization (indexes, aggregation pipelines)
  - Redis caching for frequently accessed data
  - Lazy loading in frontend (paginated lists)
  - Image optimization (lazy load, WebP format)
  - Bundle size optimization (code splitting)

- [ ] **4.4.3** Load Testing
  - Simulate 100 concurrent runs
  - Test worker scaling (add/remove workers dynamically)
  - Test Redis queue under load
  - Test database connection pooling
  - Monitor memory leaks

- [ ] **4.4.4** Error Handling & Logging
  - Comprehensive error logging (Sentry integration optional)
  - User-friendly error messages
  - Retry logic for transient failures
  - Graceful degradation (if Redis down, queue jobs in DB)
  - Health check endpoint (`/api/health`)

**Deliverable:** Production-ready, secure, performant platform

---

#### 🔹 Subphase 4.5: Documentation & Deployment (Day 23-24)
**Status:** ⏳ Not Started

**Tasks:**
- [ ] **4.5.1** User Documentation
  - Getting started guide
  - Visual builder tutorial (with screenshots)
  - Code editor guide (Python API reference)
  - Template usage guide
  - API documentation (auto-generated with FastAPI)
  - FAQ section

- [ ] **4.5.2** Developer Documentation
  - Architecture overview
  - Database schema documentation
  - Worker system explanation
  - Docker sandbox details
  - Deployment guide (Docker Compose, Kubernetes)

- [ ] **4.5.3** Admin Dashboard
  - `/admin` route (admin-only)
  - User management (view, ban, change tier)
  - Actor moderation (approve/reject marketplace submissions)
  - System health (worker status, queue size, error rate)
  - Usage analytics (total runs, top actors, active users)

- [ ] **4.5.4** Production Deployment
  - Docker Compose for single-server deployment
  - Kubernetes manifests for cluster deployment (optional)
  - Environment variable configuration
  - Database backup strategy
  - Log aggregation (ELK stack or CloudWatch)
  - Monitoring (Prometheus + Grafana)

**Deliverable:** Complete documentation and deployment guides

---

## 🎯 Success Metrics

| Metric | Target |
|--------|--------|
| Actor Creation Time | < 5 minutes (visual), < 15 minutes (code) |
| Run Success Rate | > 95% |
| Code Scraper Execution Time | < 2 minutes for simple scrapers |
| Concurrent Runs | 50-100+ (with 5 workers) |
| Marketplace Templates | 15-20 working templates |
| API Response Time | < 200ms (p95) |
| System Uptime | > 99.5% |

---

## 🔒 Security Considerations

### Docker Sandbox
- ✅ Read-only filesystem
- ✅ No new privileges
- ✅ Drop all capabilities
- ✅ Network isolation (proxy-only)
- ✅ Resource limits (CPU, memory)
- ✅ Timeout enforcement

### Code Execution
- ✅ Whitelist allowed imports
- ✅ AST manipulation to block dangerous calls
- ✅ No filesystem access
- ✅ No subprocess execution
- ✅ Max output size limit

### API Security
- ✅ JWT authentication
- ✅ Rate limiting per user/IP
- ✅ Input validation (Pydantic)
- ✅ CORS configuration
- ✅ Helmet.js for frontend security
- ✅ SQL injection prevention (parameterized queries)

---

## 🛠 Tech Stack (Final)

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | React 19 + TypeScript | UI framework |
| Code Editor | Monaco Editor | Browser-based code editor |
| Styling | Tailwind CSS | Utility-first CSS |
| Backend | FastAPI 0.110.1 | API framework |
| Database | MongoDB 4.5.0 | NoSQL database |
| Queue | Redis + RQ | Task queue |
| Workers | Python 3.11 | Job processors |
| Sandbox | Docker | Isolated execution |
| Scheduler | APScheduler | Cron jobs |
| Browser Automation | Playwright 1.45.0 | Web scraping |
| Auth | JWT + OAuth2 | Authentication |
| Storage | MinIO / S3 (optional) | File storage |
| Monitoring | WebSocket + structlog | Real-time logs |
| Deployment | Docker Compose / K8s | Container orchestration |

---

## 📦 Folder Structure (Target)

```
/app/
├── backend/
│   ├── api/
│   │   ├── routes.py                 # Main API routes
│   │   ├── auth.py                   # Authentication
│   │   ├── actors.py                 # Actor endpoints
│   │   ├── runs.py                   # Run endpoints
│   │   ├── datasets.py               # Dataset endpoints
│   │   ├── schedules.py              # Scheduling endpoints
│   │   ├── webhooks.py               # Webhook endpoints
│   │   └── templates.py              # Template endpoints
│   │
│   ├── models/
│   │   ├── user.py                   # User model
│   │   ├── actor.py                  # Actor model
│   │   ├── run.py                    # Run model
│   │   ├── dataset.py                # Dataset model
│   │   ├── schedule.py               # Schedule model
│   │   ├── webhook.py                # Webhook model
│   │   └── template.py               # Template model
│   │
│   ├── queue/
│   │   ├── worker.py                 # RQ worker
│   │   ├── tasks.py                  # Task definitions
│   │   └── scheduler.py              # APScheduler integration
│   │
│   ├── sandbox/
│   │   ├── Dockerfile                # Sandbox Docker image
│   │   ├── runner.py                 # Code execution entry point
│   │   ├── docker_executor.py        # Docker container manager
│   │   ├── restricted_python.py      # Safe execution
│   │   └── http_proxy.py             # Proxy for containers
│   │
│   ├── scrapers/
│   │   ├── scraper_engine.py         # Playwright scraper
│   │   ├── google_maps_scraper_v3.py # Google Maps scraper
│   │   ├── scraper_builder.py        # Visual scraper executor
│   │   └── proxy_manager.py          # Proxy rotation
│   │
│   ├── webhooks/
│   │   ├── sender.py                 # Webhook delivery
│   │   └── retry_logic.py            # Retry handler
│   │
│   ├── utils/
│   │   ├── logging.py                # Structured logging
│   │   ├── monitoring.py             # Metrics collection
│   │   └── validators.py             # Input validation
│   │
│   ├── templates/                    # Pre-built actor templates
│   │   ├── amazon_scraper.py
│   │   ├── linkedin_jobs.py
│   │   ├── twitter_profile.py
│   │   └── ...
│   │
│   ├── server.py                     # FastAPI app
│   ├── requirements.txt              # Python dependencies
│   └── .env                          # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CodeEditor.js         # Monaco editor component
│   │   │   ├── SelectorPicker.js     # Visual selector tool
│   │   │   ├── CronBuilder.js        # Cron expression builder
│   │   │   ├── LiveLogs.js           # Real-time log viewer
│   │   │   └── ...
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.js               # Dashboard
│   │   │   ├── Store.js              # Template marketplace
│   │   │   ├── ActorsV2.js           # Actor list
│   │   │   ├── ActorDetail.js        # Actor detail/run
│   │   │   ├── ActorEditor.js        # Create/edit actor (NEW)
│   │   │   ├── RunsV3.js             # Run history
│   │   │   ├── RunDetail.js          # Run detail with live logs
│   │   │   ├── DatasetV2.js          # Dataset viewer
│   │   │   ├── Schedules.js          # Schedule manager
│   │   │   ├── Webhooks.js           # Webhook manager
│   │   │   ├── Marketplace.js        # Public marketplace
│   │   │   ├── TemplateLibrary.js    # Template browser
│   │   │   └── Settings.js           # User settings
│   │   │
│   │   ├── contexts/
│   │   │   └── AuthContext.js        # Auth state
│   │   │
│   │   ├── services/
│   │   │   └── api.js                # Axios API client
│   │   │
│   │   └── App.js                    # Main app
│   │
│   ├── package.json
│   └── .env                          # Frontend env vars
│
├── docker-compose.yml                # Local development
├── docker-compose.prod.yml           # Production deployment
├── README.md                         # Project README
├── ROADMAP.md                        # This file
└── test_result.md                    # Testing data
```

---

## 🚢 Deployment Strategy

### Development (Current)
- Supervisor-based process management
- Hot reload for backend and frontend
- MongoDB local instance

### Production (Target)
- **Option 1: Single Server (Docker Compose)**
  - All services in containers
  - Nginx reverse proxy
  - Automated SSL with Certbot

- **Option 2: Kubernetes Cluster**
  - Separate pods for: API, Workers, Redis, MongoDB
  - Horizontal scaling for workers
  - Load balancer for API
  - Persistent volumes for data

---

## 📊 Monitoring & Analytics (Future)

- **Prometheus** for metrics
- **Grafana** dashboards
- **Sentry** for error tracking
- **ELK Stack** for log aggregation
- **Uptime monitoring** (Pingdom, UptimeRobot)

---

## 💰 Monetization (Future Phase)

| Feature | Implementation |
|---------|----------------|
| Subscription Tiers | Stripe integration |
| Pay-per-run | Credit system |
| Marketplace Commission | 20-30% on paid actors |
| API Access | Rate-limited API keys |
| White-label | Enterprise custom branding |

---

## 🎓 Learning Resources

- **Apify Platform**: https://apify.com
- **Playwright Docs**: https://playwright.dev
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **RQ (Redis Queue)**: https://python-rq.org
- **Docker Security**: https://docs.docker.com/engine/security/
- **RestrictedPython**: https://github.com/zopefoundation/RestrictedPython

---

## 🤝 Contributing (Future)

Once open-sourced:
- Fork repository
- Create feature branch
- Submit pull request
- Follow coding standards (Black, ESLint)

---

## 📝 Notes

- This roadmap is a living document - update as features are completed
- Mark tasks as completed with ✅ checkbox
- Add new phases as requirements evolve
- Refer to `test_result.md` for implementation testing results

---

**Last Updated:** 2025-01-04
**Version:** 1.0
**Status:** Phase 1 Ready to Start 🚀
