# Apify-Style Organization & Personal Account Management System

## Implementation Status: Phase 1 Complete ✅

### Overview
This system allows users to have both personal and organization accounts simultaneously, with the ability to switch between them seamlessly - just like Apify's implementation.

---

## Phase 1: Backend Implementation ✅ COMPLETED

### 1. Database Models Created

#### Organization Model (`/app/backend/models/organization.py`)
- **Organization**: Main organization/workspace entity
  - Fields: id, name, display_name, description, owner_id, plan, is_active, settings, billing_email
  - Up to 5 organizations per user
  
- **OrganizationMembership**: Links users to organizations
  - Fields: id, organization_id, user_id, role, invited_by, joined_at, is_active
  - Roles: owner, admin, member
  
- **WorkspaceContext**: Represents current active workspace
  - workspace_type: "personal" or "organization"
  - workspace_id: user_id for personal, org_id for organization
  
### 2. API Endpoints Created (`/app/backend/routes/organization_routes.py`)

#### Workspace Management
```
GET  /api/organizations/workspaces
```
- Returns all available workspaces (personal + organizations)
- Response: { workspaces: [], current_workspace: {} }

#### Organization CRUD
```
POST /api/organizations
```
- Create new organization (max 5 per user)
- Automatic owner membership creation
- Request: { name, display_name, description, billing_email }

```
GET  /api/organizations
```
- List all organizations user is member of
- Includes role and member count

```
GET  /api/organizations/{org_id}
```
- Get specific organization details
- Requires membership

```
PATCH /api/organizations/{org_id}
```
- Update organization details
- Requires owner or admin role

```
DELETE /api/organizations/{org_id}
```
- Soft delete organization
- Only owner can delete

#### Membership Management
```
GET  /api/organizations/{org_id}/members
```
- List all members of organization
- Requires membership

```
POST /api/organizations/{org_id}/members
```
- Invite user to organization by email
- Requires owner or admin role
- Request: { email, role: "admin" | "member" }

```
PATCH /api/organizations/{org_id}/members/{member_id}
```
- Update member's role
- Requires owner or admin role
- Cannot change owner role

```
DELETE /api/organizations/{org_id}/members/{member_id}
```
- Remove member from organization
- Requires owner or admin role
- Cannot remove owner

```
POST /api/organizations/{org_id}/leave
```
- Leave organization
- Owner must transfer ownership first

```
POST /api/organizations/{org_id}/transfer-ownership
```
- Transfer organization ownership
- Only owner can transfer
- Request: { new_owner_id }

### 3. Middleware (`/app/backend/middleware/workspace.py`)
- **WorkspaceMiddleware**: Extracts workspace context from headers
  - X-Workspace-Type: "personal" | "organization"
  - X-Workspace-Id: user_id or org_id

### 4. User Model Updates
- Removed: `account_type`, `organization_name` fields
- Users now always have a personal account
- Organizations are separate entities

### 5. Server Integration
- Organization routes registered at `/api/organizations`
- Workspace middleware added
- All routes properly configured

---

## Phase 2: Frontend Implementation 🚧 PENDING

### Components to Create

#### 1. Account Switcher Component (Top-Left Dropdown)
Location: `/app/frontend/src/components/AccountSwitcher.jsx`

Features:
- Dropdown in top-left corner (like Apify)
- Shows current workspace
- Lists all available workspaces (personal + organizations)
- Click to switch workspace
- Visual indicators for workspace type
- Role badge for organizations

```jsx
<AccountSwitcher>
  Current: Personal / Organization Name
  ↓
  • Personal Workspace
  • Org 1 (Owner)
  • Org 2 (Admin)
  • Org 3 (Member)
  + Create Organization
</AccountSwitcher>
```

#### 2. Organization Management Pages

**a. Organizations List Page**
- Path: `/organizations`
- List all organizations
- Show role, member count, plan
- Create new organization button
- Actions: View, Settings, Leave

**b. Organization Details Page**
- Path: `/organizations/{org_id}`
- Organization overview
- Members list
- Settings tab
- Billing tab

**c. Create Organization Modal**
- Organization name (unique, lowercase, hyphens only)
- Display name
- Description
- Billing email

**d. Member Management Interface**
- Members table with role, joined date
- Invite member modal (email + role selection)
- Role change dropdown
- Remove member confirmation

### API Integration Requirements

#### Update Axios Instance
Add workspace context to all API calls:
```javascript
axios.interceptors.request.use(config => {
  const workspace = getActiveWorkspace();
  config.headers['X-Workspace-Type'] = workspace.type;
  config.headers['X-Workspace-Id'] = workspace.id;
  return config;
});
```

#### Create Organization API Service
```javascript
// organizationService.js
export const getWorkspaces = () => api.get('/organizations/workspaces');
export const createOrganization = (data) => api.post('/organizations', data);
export const getOrganizations = () => api.get('/organizations');
export const inviteMember = (orgId, data) => api.post(`/organizations/${orgId}/members`, data);
// ... etc
```

---

## Phase 3: Workspace Isolation 🚧 PENDING

### Update Existing APIs to Support Workspace Context

#### 1. Actor Routes
Need to filter actors by workspace:
- Personal workspace: `user_id` = current user
- Organization workspace: `user_id` = NULL AND `organization_id` = current org

```python
# Example in routes/routes.py
@router.get("/actors")
async def get_actors(request: Request, current_user: dict = Depends(get_current_user)):
    workspace = get_workspace_context(request)
    
    if workspace['workspace_type'] == 'personal':
        query = {"user_id": current_user['id'], "organization_id": None}
    else:
        query = {"organization_id": workspace['workspace_id']}
    
    actors = await db.actors.find(query).to_list(1000)
    return actors
```

#### 2. Run Routes
Filter runs by workspace

#### 3. Dataset Routes
Filter datasets by workspace

#### 4. Schedule Routes
Filter schedules by workspace

### Migration Script
Update Actor model to include `organization_id`:
```python
class Actor(BaseModel):
    user_id: Optional[str] = None  # For personal workspaces
    organization_id: Optional[str] = None  # For organization workspaces
    # ... rest of fields
```

---

## Testing Checklist

### Backend API Testing
- [ ] Create organization with valid data
- [ ] Try creating 6th organization (should fail)
- [ ] Create organization with duplicate name (should fail)
- [ ] Get workspaces (should show personal + orgs)
- [ ] Invite member to organization
- [ ] Update member role
- [ ] Remove member from organization
- [ ] Leave organization as member
- [ ] Try leaving as owner (should fail)
- [ ] Transfer ownership
- [ ] Delete organization as owner
- [ ] Try organization actions without permission (should fail with 403)

### Frontend Testing
- [ ] Account switcher shows all workspaces
- [ ] Switching workspace updates context
- [ ] Create organization flow works
- [ ] Organization list displays correctly
- [ ] Member invitation works
- [ ] Role updates work
- [ ] Leave organization works
- [ ] Workspace isolation works (actors only show for current workspace)

### Integration Testing
- [ ] Create org, invite member, member accepts
- [ ] Member creates actor in org workspace
- [ ] Owner sees actor in org workspace
- [ ] Member switches to personal, actor not visible
- [ ] Transfer ownership, new owner has full access
- [ ] Remove member, they lose access

---

## Database Collections

### New Collections
1. `organizations` - Organization documents
2. `organization_memberships` - User-organization relationships

### Updated Collections
1. `users` - Removed account_type, organization_name
2. `actors` - Need to add organization_id field
3. `runs` - Need to add organization_id field
4. `datasets` - Need to add organization_id field
5. `schedules` - Need to add organization_id field

---

## Security Considerations

### Role-Based Permissions
- **Owner**: Full access (update, delete, invite, remove, transfer)
- **Admin**: Manage members, update settings (cannot delete or transfer)
- **Member**: View only, can use resources

### Validation
- Organization names must be unique
- Organization names: lowercase, numbers, hyphens only
- Max 5 organizations per user
- Cannot remove/change owner role (must transfer first)
- Membership required for all organization actions

---

## Next Steps

1. **Implement Frontend Components**
   - Start with AccountSwitcher component
   - Create organization management pages
   - Add workspace context to all API calls

2. **Update Existing Routes for Workspace Isolation**
   - Add organization_id to Actor, Run, Dataset, Schedule models
   - Update all CRUD operations to respect workspace context
   - Migration script for existing data

3. **Testing**
   - Manual testing of all flows
   - Test workspace isolation thoroughly
   - Test permission boundaries

4. **Documentation**
   - User guide for organization management
   - API documentation updates
   - Admin guide for organization limits

---

## API Usage Examples

### Create Organization
```bash
curl -X POST http://localhost:8001/api/organizations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-company",
    "display_name": "My Company",
    "description": "Company workspace",
    "billing_email": "billing@company.com"
  }'
```

### Get Workspaces
```bash
curl http://localhost:8001/api/organizations/workspaces \
  -H "Authorization: Bearer $TOKEN"
```

### Invite Member
```bash
curl -X POST http://localhost:8001/api/organizations/{org_id}/members \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "member@example.com",
    "role": "admin"
  }'
```

### Switch Workspace (Frontend)
```javascript
// Store in localStorage/context
localStorage.setItem('activeWorkspace', JSON.stringify({
  type: 'organization',
  id: 'org-uuid-here',
  name: 'My Company',
  role: 'owner'
}));

// All subsequent API calls will include workspace headers
```

---

## Implementation Complete! ✅

Phase 1 (Backend) is fully implemented and ready for testing.
Ready to proceed with Phase 2 (Frontend) implementation.
