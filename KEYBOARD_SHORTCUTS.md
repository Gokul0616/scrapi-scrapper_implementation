# Scrapi Keyboard Shortcuts

This document provides a comprehensive list of all keyboard shortcuts available in the Scrapi application.

---

## 🚀 Navigation Shortcuts

Navigate quickly between different sections using the **S + Key** pattern.

Press `S` followed by one of these keys:

| Shortcut | Action | Description |
|----------|--------|-------------|
| `S` `H` | **Home** | Go to Home page |
| `S` `O` | **Scrapi Store** | Open Scrapi Store |
| `S` `A` | **Actors** | View all Actors |
| `S` `R` | **Runs** | View all Runs |
| `S` `T` | **Saved Tasks** | Access saved tasks |
| `S` `I` | **Integrations** | Manage integrations |
| `S` `C` | **Schedules** | View and manage schedules |

### Development Section

| Shortcut | Action | Description |
|----------|--------|-------------|
| `S` `M` | **My Actors** | View your custom actors |
| `S` `N` | **Insights** | View analytics and insights |
| `S` `E` | **Messaging** | Access messaging center |

### Settings & Management

| Shortcut | Action | Description |
|----------|--------|-------------|
| `S` `P` | **Proxy** | Manage proxy settings |
| `S` `D` | **Storage** | View storage usage |
| `S` `B` | **Billing** | Access billing information |
| `S` `G` | **Settings** | Open application settings |

---

## 🎯 Global Shortcuts

These shortcuts work from anywhere in the application.

### Windows / Linux

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl` + `K` | **Search** | Open global search modal |
| `Ctrl` + `B` | **Toggle Sidebar** | Collapse or expand the sidebar |
| `Ctrl` + `L` | **Toggle Theme** | Switch between dark and light mode |
| `Shift` + `?` | **Show Shortcuts** | Display keyboard shortcuts guide |

### macOS

| Shortcut | Action | Description |
|----------|--------|-------------|
| `⌘` + `K` | **Search** | Open global search modal |
| `⌘` + `B` | **Toggle Sidebar** | Collapse or expand the sidebar |
| `⌘` + `L` | **Toggle Theme** | Switch between dark and light mode |
| `Shift` + `?` | **Show Shortcuts** | Display keyboard shortcuts guide |

---

## 💡 Tips & Tricks

### Navigation Pattern
1. Press and release `S`
2. Within 1 second, press the destination key (e.g., `H` for Home)
3. You'll be instantly navigated to that section

### Sidebar States
- **Expanded State**: Hover over any sidebar item to see its name and keyboard shortcut (appears after 500ms)
- **Collapsed State**: Hover over icons to see tooltips with shortcuts (appears after 500ms)
- Use `Ctrl/⌘ + B` to quickly toggle between states

### Search Modal
- Press `Ctrl/⌘ + K` to open search
- Navigate through suggestions with arrow keys
- Press `Enter` to select
- Press `Esc` or click outside to close

### Theme Switching
- Quickly switch between dark and light modes using `Ctrl/⌘ + L`
- Your preference is automatically saved
- **Note:** Theme toggle is only available via keyboard shortcut (no button in UI)

### Shortcuts Guide
- Press `Shift + ?` to view the complete shortcuts guide at any time
- The guide displays all available shortcuts organized by category
- Press `Esc` or click outside to close the guide

---

## 🎨 Tooltip Information

All sidebar items display helpful tooltips on hover that show:
- **Item name** (e.g., "Actors", "Runs")
- **Keyboard shortcut** (displayed in styled key badges)
- **Animation delay**: Tooltips appear after 500ms for a smooth experience

Tooltips appear in both collapsed and expanded sidebar states for consistent user experience.

---

## 📱 Platform Support

| Platform | Search | Sidebar Toggle | Theme Toggle | Shortcuts Guide |
|----------|--------|----------------|--------------|-----------------|
| Windows  | `Ctrl + K` | `Ctrl + B` | `Ctrl + L` | `Shift + ?` |
| Linux    | `Ctrl + K` | `Ctrl + B` | `Ctrl + L` | `Shift + ?` |
| macOS    | `⌘ + K` | `⌘ + B` | `⌘ + L` | `Shift + ?` |

---

## 🔧 Technical Details

### Keyboard Shortcut Implementation
- All shortcuts use **preventDefault()** to avoid browser conflicts
- Navigation shortcuts (`S + Key`) have a 1-second timeout window
- Theme toggle prevents browser's default address bar focus behavior
- Shortcuts work globally across all authenticated pages
- Tooltips use a 500ms delay for smooth user experience

### Accessibility
- Visual feedback provided through animated tooltips
- Keyboard navigation fully supported
- Compatible with screen readers
- No mouse required for navigation
- Shortcuts guide accessible via `Shift + ?`

---

## 📝 Notes

- Press `Shift + ?` to view the shortcuts modal at any time
- All shortcuts are case-insensitive for the second key in `S + Key` combinations
- Shortcuts will not work on login or registration pages
- Browser-native shortcuts (like `Ctrl/⌘ + T` for new tab) are preserved
- The primary navigation key has been changed from `G` to `S` for consistency

---

**Last Updated**: January 2025  
**Version**: 2.0  
**Application**: Scrapi - Web Scraping Platform
