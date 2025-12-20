# Yes! Drag Changes Reflect on Landing Site ✅

## Complete Flow: Admin Console → Database → Landing Site

When you drag and reorder policy sections in the admin console, those changes **will appear on the landing site** after you save. Here's the complete flow:

---

## Step-by-Step Flow

### 1️⃣ Admin Console - Edit Policy
```
┌─────────────────────────────────────────┐
│  Admin Console (localhost:3000)         │
│  /policies → Edit Policy                │
│                                          │
│  Policy Sections:                       │
│  ┌───────────────────────────────┐     │
│  │ ⋮⋮ Section A                  │  ← Position 1
│  └───────────────────────────────┘     │
│  ┌───────────────────────────────┐     │
│  │ ⋮⋮ Section B                  │  ← Position 2
│  └───────────────────────────────┘     │
│  ┌───────────────────────────────┐     │
│  │ ⋮⋮ Section C                  │  ← Position 3
│  └───────────────────────────────┘     │
└─────────────────────────────────────────┘
```

### 2️⃣ Drag to Reorder
```
User drags Section C to the top:

┌─────────────────────────────────────────┐
│  ┌───────────────────────────────┐     │
│  │ ⋮⋮ Section C                  │  ← New Position 1
│  └───────────────────────────────┘     │
│  ┌───────────────────────────────┐     │
│  │ ⋮⋮ Section A                  │  ← New Position 2
│  └───────────────────────────────┘     │
│  ┌───────────────────────────────┐     │
│  │ ⋮⋮ Section B                  │  ← New Position 3
│  └───────────────────────────────┘     │
│                                          │
│  [Cancel]  [Save Changes] ← Click Save!│
└─────────────────────────────────────────┘
```

### 3️⃣ Save to Database
```
When you click "Save Changes":

editedPolicy.sections = [
  { id: "section-c", title: "Section C", ... },  // Position 0
  { id: "section-a", title: "Section A", ... },  // Position 1
  { id: "section-b", title: "Section B", ... }   // Position 2
]

↓ PUT/POST Request ↓

Backend API: /api/policies/{doc_id}
    ↓
MongoDB: db.policies.update()
    ↓
✅ Saved with new order!
```

### 4️⃣ Landing Site Fetches Data
```
Landing Site (Landing URL)
    ↓
GET /api/legal/{doc_id}
    ↓
MongoDB: db.policies.find_one({"doc_id": doc_id})
    ↓
Returns: {
  "sections": [
    { "id": "section-c", "title": "Section C", ... },
    { "id": "section-a", "title": "Section A", ... },
    { "id": "section-b", "title": "Section B", ... }
  ]
}
    ↓
Landing Site Renders Sections IN NEW ORDER!
```

### 5️⃣ Landing Site Display
```
┌─────────────────────────────────────────┐
│  Landing Site - Legal Document          │
│  /legal/cookie-policy                   │
│                                          │
│  📄 Cookie Policy                       │
│                                          │
│  Section C  ← Appears First!           │
│  ─────────────────────────────────      │
│  Content of section C...                │
│                                          │
│  Section A  ← Appears Second           │
│  ─────────────────────────────────      │
│  Content of section A...                │
│                                          │
│  Section B  ← Appears Third            │
│  ─────────────────────────────────      │
│  Content of section B...                │
└─────────────────────────────────────────┘
```

---

## Code Evidence

### Admin Console Save Function
**File:** `/app/scrapi-admin-console/src/pages/Policies.tsx` (Line ~195-226)

```typescript
const handleSave = async () => {
  if (!editedPolicy) return;

  const token = localStorage.getItem('scrapi_admin_token');
  const url = isCreating 
    ? `${BACKEND_URL}/api/policies`
    : `${BACKEND_URL}/api/policies/${editedPolicy.doc_id}`;
  
  const method = isCreating ? 'POST' : 'PUT';

  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(editedPolicy)  // ← Includes reordered sections!
  });

  // Success!
  fetchPolicies();
};
```

### Landing Site Fetch Function
**File:** `/app/landing-site/src/components/LegalDocument.jsx` (Line ~136-163)

```javascript
useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    
    const response = await fetch(`/api/legal/${currentDoc}`);
    if (response.ok) {
      const result = await response.json();
      setData(result);  // ← Gets sections in saved order!
    }
    
    setLoading(false);
  };

  fetchData();
}, [currentDoc]);
```

### Landing Site Render Function
**File:** `/app/landing-site/src/components/LegalDocument.jsx` (Line ~193-246)

```javascript
{data.sections.map((section) => (
  <section key={section.id} id={section.id}>
    <h2>{section.title}</h2>
    <p>{section.content}</p>
    
    {/* Subsections */}
    {section.subsections && section.subsections.map(...)}
    
    {/* Tables */}
    {section.table && section.table.length > 0 && ...}
  </section>
))}
```

**The `.map()` iterates through sections IN THE ORDER they're stored!**

---

## Backend API Endpoint
**File:** `/app/backend/routes/routes.py`

```python
@router.get("/legal/{doc_id}")
async def get_legal_document(doc_id: str):
    """Get content for a specific legal document (public endpoint)."""
    
    # Fetch from database
    policy = await db.policies.find_one({"doc_id": doc_id})
    
    if policy:
        # Remove MongoDB _id field
        if "_id" in policy:
            del policy["_id"]
        return policy  # ← Returns with sections in saved order!
    
    # Fallback to mock data if not found
    return mock_data
```

---

## Complete Test Flow

### Step 1: Edit in Admin Console
1. Go to http://localhost:3000
2. Login with owner credentials
3. Navigate to **Policies** page
4. Click **Edit** on any policy (e.g., "Cookie Policy")
5. Scroll to **Policy Sections**

### Step 2: Drag to Reorder
1. Click and hold on any section
2. Drag it to a new position
3. See the visual feedback (opacity, borders)
4. Release to drop

### Step 3: Save Changes
1. Click **"Save Changes"** button at the top
2. Wait for success message: "Policy updated successfully"

### Step 4: Verify on Landing Site
1. Open the landing site (check your landing site URL)
2. Navigate to the policy you just edited
   - Example: `/legal/cookie-policy`
3. **Verify the sections appear in the NEW ORDER!**

---

## Important Notes

### ✅ What Persists
- Section order (position in array)
- Section titles
- Section content
- Section IDs
- Subsections
- Tables

### ⚠️ Requirements for Changes to Show
1. **Must click "Save Changes"** in admin console
2. **Landing site may need refresh** to fetch latest data
3. **Changes are immediate** after save (no deployment needed)

### 🔄 Data Synchronization
```
Admin Console → MongoDB → Landing Site
     ↓              ↓          ↓
   (Edit)       (Storage)   (Display)
```

All three parts use the **same database**, so changes in admin console **immediately affect** what the landing site displays (after refresh).

---

## Visual Comparison

### Before Reordering
**Admin Console:**
```
1. What are Cookies?
2. Types of Cookies
3. Consent & Control
4. Cookie Duration
```

**Landing Site:**
```
1. What are Cookies?
2. Types of Cookies
3. Consent & Control
4. Cookie Duration
```

### After Dragging & Saving
**Admin Console:**
```
1. Consent & Control      ← Dragged to top
2. Cookie Duration        ← Moved up
3. What are Cookies?      ← Moved down
4. Types of Cookies       ← Moved down
```

**Landing Site (after refresh):**
```
1. Consent & Control      ← Updated!
2. Cookie Duration        ← Updated!
3. What are Cookies?      ← Updated!
4. Types of Cookies       ← Updated!
```

---

## Summary

✅ **YES!** Dragging sections in the admin console **WILL** change the order on the landing site

✅ Changes are **persisted** to the database

✅ Landing site **automatically displays** the new order

✅ No manual data migration needed

✅ Works for **all policy documents**

Just remember to:
1. **Drag** sections to reorder
2. **Save** the changes
3. **Refresh** the landing site page

The new order will be visible immediately! 🎉

---

## Testing Checklist

- [ ] Login to admin console
- [ ] Edit a policy
- [ ] Drag sections to reorder
- [ ] Click "Save Changes"
- [ ] Open landing site in new tab
- [ ] Navigate to the edited policy
- [ ] Verify sections appear in new order
- [ ] Refresh page to confirm persistence
- [ ] Try with multiple policies

**All changes are real-time and persistent!** 🚀
