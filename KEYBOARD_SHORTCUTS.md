# Scrapi Keyboard Shortcuts

This document provides a comprehensive list of all keyboard shortcuts available in the Scrapi application.

---

## 🚀 Navigation Shortcuts

Navigate quickly between different sections using the **G + Key** pattern (similar to Apify).

Press `G` followed by one of these keys:

| Shortcut | Action | Description |
|----------|--------|-------------|
| `G` `H` | **Home** | Go to Home page |
| `G` `O` | **Scrapi Store** | Open Scrapi Store |
| `G` `A` | **Actors** | View all Actors |
| `G` `R` | **Runs** | View all Runs |
| `G` `T` | **Saved Tasks** | Access saved tasks |
| `G` `I` | **Integrations** | Manage integrations |
| `G` `C` | **Schedules** | View and manage schedules |

### Development Section

| Shortcut | Action | Description |
|----------|--------|-------------|
| `G` `M` | **My Actors** | View your custom actors |
| `G` `N` | **Insights** | View analytics and insights |
| `G` `E` | **Messaging** | Access messaging center |

### Settings & Management

| Shortcut | Action | Description |
|----------|--------|-------------|
| `G` `P` | **Proxy** | Manage proxy settings |
| `G` `D` | **Storage** | View storage usage |
| `G` `B` | **Billing** | Access billing information |
| `G` `S` | **Settings** | Open application settings |

---

## 🎯 Global Shortcuts

These shortcuts work from anywhere in the application.

### Windows / Linux

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl` + `K` | **Search** | Open global search modal |
| `Ctrl` + `B` | **Toggle Sidebar** | Collapse or expand the sidebar |
| `Ctrl` + `L` | **Toggle Theme** | Switch between dark and light mode |

### macOS

| Shortcut | Action | Description |
|----------|--------|-------------|
| `⌘` + `K` | **Search** | Open global search modal |
| `⌘` + `B` | **Toggle Sidebar** | Collapse or expand the sidebar |
| `⌘` + `L` | **Toggle Theme** | Switch between dark and light mode |

---

## 💡 Tips & Tricks

### Navigation Pattern
1. Press and release `G`
2. Within 1 second, press the destination key (e.g., `H` for Home)
3. You'll be instantly navigated to that section

### Sidebar States
- **Expanded State**: Hover over any sidebar item to see its name and keyboard shortcut
- **Collapsed State**: Hover over icons to see tooltips with shortcuts
- Use `Ctrl/⌘ + B` to quickly toggle between states

### Search Modal
- Press `Ctrl/⌘ + K` to open search
- Navigate through suggestions with arrow keys
- Press `Enter` to select
- Press `Esc` or click outside to close

### Theme Switching
- Quickly switch between dark and light modes using `Ctrl/⌘ + L`
- Your preference is automatically saved

---

## 🎨 Tooltip Information

All sidebar items display helpful tooltips on hover that show:
- **Item name** (e.g., "Actors", "Runs")
- **Keyboard shortcut** (displayed in styled key badges)

Tooltips appear in both collapsed and expanded sidebar states for consistent user experience.

---

## 📱 Platform Support

| Platform | Search | Sidebar Toggle | Theme Toggle |
|----------|--------|----------------|--------------|
| Windows  | `Ctrl + K` | `Ctrl + B` | `Ctrl + L` |
| Linux    | `Ctrl + K` | `Ctrl + B` | `Ctrl + L` |
| macOS    | `⌘ + K` | `⌘ + B` | `⌘ + L` |

---

## 🔧 Technical Details

### Keyboard Shortcut Implementation
- All shortcuts use **preventDefault()** to avoid browser conflicts
- Navigation shortcuts (`G + Key`) have a 1-second timeout window
- Theme toggle prevents browser's default address bar focus behavior
- Shortcuts work globally across all authenticated pages

### Accessibility
- Visual feedback provided through tooltips
- Keyboard navigation fully supported
- Compatible with screen readers
- No mouse required for navigation

---

## 📝 Notes

- Press `Shift + ?` to view the shortcuts modal (search modal with shortcut hints)
- All shortcuts are case-insensitive for the second key in `G + Key` combinations
- Shortcuts will not work on login or registration pages
- Browser-native shortcuts (like `Ctrl/⌘ + T` for new tab) are preserved

---

**Last Updated**: December 2024  
**Version**: 1.0  
**Application**: Scrapi - Web Scraping Platform
