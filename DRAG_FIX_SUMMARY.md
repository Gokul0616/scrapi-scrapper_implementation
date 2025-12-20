# Drag and Drop Fix for Policy Sections

## Problem
The drag handle (GripVertical icon) in the Policy Sections editor was not working. When users tried to drag sections to reorder them, it would just toggle the section open/closed instead.

## Root Cause
1. The GripVertical icon was inside a clickable div that had an `onClick` handler to toggle sections
2. No actual drag-and-drop functionality was implemented
3. The entire section header was clickable, preventing drag interactions

## Solution Implemented

### 1. Added Drag State Management
```typescript
const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);
const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
```

### 2. Implemented HTML5 Drag-and-Drop Handlers
- `handleDragStart`: Initiates drag operation and sets visual feedback
- `handleDragEnd`: Cleans up after drag completes
- `handleDragOver`: Handles drag hover effects
- `handleDragLeave`: Removes hover effects
- `handleDrop`: Actually reorders the sections array

### 3. Separated Click Areas
- **Drag Handle**: GripVertical icon with `onMouseDown` to stop click propagation
- **Toggle Button**: ChevronDown icon with its own `onClick` handler
- **Section Title**: Also clickable to toggle section
- **Delete Button**: Has `stopPropagation` to prevent unwanted behavior

### 4. Visual Feedback
- Dragging section becomes semi-transparent (opacity: 0.5)
- Drop target section gets highlighted border (border-aws-orange, border-2)
- Cursor changes to indicate draggable area
- Smooth animations for all state changes

### 5. Section Reordering Logic
When a section is dropped:
1. Remove section from original position
2. Insert at new position
3. Update expanded state indices to match new positions
4. Update the policy with reordered sections

## How to Test

1. **Navigate to Policies Page**: Go to http://localhost:3000 and login
2. **Edit a Policy**: Click edit button on any policy
3. **Scroll to Policy Sections**: Find the "Policy Sections" card
4. **Test Drag**: 
   - Hover over the grip handle (⋮⋮) on any section
   - Click and hold on the entire section card
   - Drag up or down to reorder
   - Watch for visual feedback (opacity change, border highlight)
   - Release to drop in new position
5. **Test Toggle**: Click the chevron (▼) or section title to expand/collapse
6. **Verify Order**: The section order should persist in the edit view

## Key Changes Made

### File: `/app/scrapi-admin-console/src/pages/Policies.tsx`

**Line ~104-107**: Added drag state variables
```typescript
const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);
const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
```

**Line ~298-370**: Added complete drag-and-drop implementation
- Full set of drag event handlers
- Section reordering logic
- Expanded state index remapping

**Line ~716-753**: Updated section rendering
- Made sections draggable with proper attributes
- Separated drag handle from toggle functionality
- Added visual feedback classes
- Proper event propagation control

## Technical Details

### Event Propagation Control
```typescript
// Drag handle - stops click from bubbling to toggle handler
<div 
  className="cursor-move hover:bg-gray-200 p-1 rounded"
  title="Drag to reorder"
  onMouseDown={(e) => e.stopPropagation()}
>
  <GripVertical size={16} className="text-gray-400" />
</div>

// Toggle areas - have their own click handlers
<div onClick={() => toggleSection(index)}>
  <ChevronDown />
</div>
```

### Drag Attributes
```typescript
draggable={true}
onDragStart={(e) => handleDragStart(e, index)}
onDragEnd={handleDragEnd}
onDragOver={(e) => handleDragOver(e, index)}
onDragLeave={handleDragLeave}
onDrop={(e) => handleDrop(e, index)}
```

## Result
✅ Users can now drag sections to reorder them
✅ Visual feedback during drag operations
✅ Toggle functionality still works as expected
✅ Smooth animations and transitions
✅ No conflicts between drag and toggle actions
