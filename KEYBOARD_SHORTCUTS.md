# Scrapi - Keyboard Shortcuts Reference

This document lists all keyboard shortcuts available in the Scrapi application, similar to Apify's shortcut system.

## 🚀 Quick Reference

### Navigation Shortcuts (G + Key)

All navigation shortcuts follow the pattern: Press `G` then press the corresponding letter key.

| Shortcut | Action | Path |
|----------|--------|------|
| `G` `H` | Go to Home | /home |
| `G` `O` | Go to Scrapi Store | /store |
| `G` `A` | Go to Actors | /actors |
| `G` `R` | Go to Runs | /runs |
| `G` `T` | Go to Saved Tasks | /tasks |
| `G` `I` | Go to Integrations | /integrations |
| `G` `C` | Go to Schedules | /schedules |
| `G` `M` | Go to My Actors | /my-actors |
| `G` `N` | Go to Insights | /insights |
| `G` `E` | Go to Messaging | /messaging |
| `G` `P` | Go to Proxy | /proxy |
| `G` `D` | Go to Storage | /storage |
| `G` `B` | Go to Billing | /billing |
| `G` `S` | Go to Settings | /settings |

### Global Shortcuts

| Windows/Linux | macOS | Action |
|---------------|-------|--------|
| `Ctrl` + `K` | `⌘` + `K` | Open Search Modal |
| `Ctrl` + `B` | `⌘` + `B` | Toggle Sidebar (Collapse/Expand) |

## 📖 How to Use

### Navigation Shortcuts
1. Press the `G` key (you'll have 1 second to press the next key)
2. Press the corresponding letter key for your destination
3. You'll be instantly navigated to that page

**Example:** To go to Actors page:
- Press `G`
- Then press `A`
- You're now on the Actors page!

### Sidebar Toggle
- **Windows/Linux:** Press `Ctrl + B` to collapse or expand the sidebar
- **macOS:** Press `⌘ + B` to collapse or expand the sidebar

### Search
- **Windows/Linux:** Press `Ctrl + K` to open the search modal
- **macOS:** Press `⌘ + K` to open the search modal

## 🎯 UI Features

### Expanded Sidebar
- Clean interface without visible shortcut badges
- **Hover over any menu item** to see a tooltip with:
  - The full name of the menu item
  - The keyboard shortcut to access it
- Visual indicators for active routes
- Minimal distraction while keeping shortcuts discoverable

### Collapsed Sidebar
- Hover over any icon to see a tooltip with:
  - The full name of the menu item
  - The keyboard shortcut to access it
- Improved tooltip styling with dark theme support
- Shortcuts displayed in an easy-to-read format

### Tooltip Improvements
- **Instant display (no delay)** for better UX
- **Always visible on hover** in both collapsed and expanded states
- Consistent styling across light and dark themes
- Keyboard shortcut badges styled as `<kbd>` elements
- Proper spacing and alignment
- Right-side positioning for optimal visibility

## 🎨 Icon Reference

### Sidebar Controls
- **Collapse Icon:** Panel with left arrow (PanelLeftClose)
- **Expand Icon:** Panel icon (PanelLeft)
- Shows tooltip with shortcut (`Ctrl+B` / `⌘+B`) when hovering

### Additional Icons
- **Theme Toggle:** Sun (light mode) / Moon (dark mode)
- **Notifications:** Bell icon
- **Search:** Magnifying glass with shortcut badge
- **Help:** Question mark in circle

## 💡 Best Practices

1. **Learn by Hovering:** When sidebar is collapsed, hover over icons to see shortcuts
2. **Muscle Memory:** Practice common routes like `G H` (Home) and `G A` (Actors)
3. **Quick Search:** Use `Ctrl/Cmd + K` to quickly search and navigate
4. **Sidebar Toggle:** Use `Ctrl/Cmd + B` to maximize screen space when needed

## 🔧 Technical Implementation

### Keyboard Event Handling
- Uses native browser keyboard events
- Prevents conflicts with browser shortcuts
- 1-second window for two-key combinations (G + Letter)
- Platform detection for displaying correct modifier keys (Ctrl vs ⌘)

### Accessibility
- All shortcuts work regardless of sidebar state
- Visual indicators in tooltips and badges
- Consistent with web application accessibility standards
- No conflicts with screen readers

## 📱 Platform Compatibility

| Feature | Windows | macOS | Linux |
|---------|---------|-------|-------|
| Navigation (G+Key) | ✅ | ✅ | ✅ |
| Search (Ctrl/Cmd+K) | ✅ | ✅ | ✅ |
| Sidebar Toggle (Ctrl/Cmd+B) | ✅ | ✅ | ✅ |
| Tooltip Display | ✅ | ✅ | ✅ |

## 🎓 Shortcuts Inspiration

This implementation is inspired by:
- **Apify Console:** G+Key navigation pattern
- **GitHub:** Keyboard-first navigation
- **Linear:** Cmd+K search pattern
- **Notion:** Sidebar toggle shortcuts

---

**Last Updated:** January 2025
**Version:** 1.0.0
