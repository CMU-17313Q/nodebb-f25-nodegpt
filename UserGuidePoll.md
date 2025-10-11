# NodeBB Poll Feature - User Guide

## Overview
This guide explains how to use the interactive poll demo and understand the poll feature implementation for NodeBB posts.

## Getting Started

### Accessing the Demo
The poll feature includes an interactive demo that showcases the complete polling experience without requiring a full NodeBB installation.

**Demo Location:** `poll-demo.html`

### Opening the Demo
You can access the demo in several ways:

#### Method 1: Direct File Access
1. Navigate to your project directory
2. Open `poll-demo.html` in any modern web browser
3. The demo will load with sample polls

#### Method 2: Local Server (Recommended)
```bash
# Using Python (if available)
python3 -m http.server 8080

# Using Node.js (if available)
npx http-server

# Using VS Code Live Server extension
# Right-click poll-demo.html → "Open with Live Server"
```

#### Method 3: NodeBB Integration
If you have NodeBB running:
1. Place `poll-demo.html` in the `public/` directory
2. Access via `http://your-nodebb-url/poll-demo.html`

## Using the Interactive Demo

### Demo Layout
The demo page contains two main sections:

1. **Voting Demo** - Shows the poll before a user has voted
2. **Results Demo** - Shows the poll after voting is complete

### Voting Demo Section

**What You'll See:**
- Poll question with a chart icon
- Multiple radio button options (JavaScript, Python, Java)
- A "Vote" button
- Poll expiration information

**How to Test:**
1. **Select an Option**: Click on any radio button to choose your preference
2. **Submit Vote**: Click the blue "Vote" button
3. **Watch the Animation**: The interface will show a loading spinner
4. **See Results**: After ~800ms, the poll transforms to show results

**Expected Behavior:**
- Selecting no option and clicking "Vote" shows a warning message
- After voting, the interface changes to results view
- Your selection is highlighted in blue with a checkmark
- Vote counts and percentages are updated
- The vote button disappears (single-vote enforcement)

### Results Demo Section

**What You'll See:**
- Same poll question with chart icon
- Results display with progress bars
- Vote counts and percentages for each option
- User's selection highlighted in blue
- Total vote count at the bottom

**Features Demonstrated:**
- **Visual Hierarchy**: Selected option stands out with primary color
- **Progress Bars**: Visual representation of vote distribution
- **Vote Counts**: Exact numbers and percentages
- **Responsive Design**: Adapts to different screen sizes

## Understanding Poll States

### Before Voting (Voting State)
```
┌─────────────────────────────────────┐
│ 📊 Poll Question                    │
├─────────────────────────────────────┤
│ ○ Option A                          │
│ ○ Option B                          │ 
│ ○ Option C                          │
│                                     │
│ [Vote] Poll closes in X days        │
└─────────────────────────────────────┘
```

### After Voting (Results State)  
```
┌─────────────────────────────────────┐
│ 📊 Poll Question                    │
├─────────────────────────────────────┤
│ ✓ Option A          15 votes (60%)  │
│ ████████████░░░░░░░░                │
│                                     │
│   Option B           8 votes (32%)  │
│ ████████░░░░░░░░░░░░                │
│                                     │
│   Option C           2 votes (8%)   │ 
│ ██░░░░░░░░░░░░░░░░░░                │
│                                     │
│ 👥 25 votes total • Ends in 3 days │
└─────────────────────────────────────┘
```

## Key Features Demonstrated

### 1. Single Vote Enforcement
- Once you vote, you cannot vote again
- The voting interface is permanently replaced with results
- No way to change your vote (simulates real poll behavior)

### 2. Real-time Updates  
- No page refresh required
- Smooth animations between states
- Immediate visual feedback

### 3. Responsive Design
- Works on desktop and mobile devices
- Progress bars scale appropriately
- Text remains readable at all sizes

### 4. Error Handling
- Clear warning if no option is selected
- User-friendly error messages
- Visual feedback for all actions

### 5. Accessibility Features
- Proper ARIA labels for screen readers
- Keyboard navigation support
- High contrast colors for visibility
- Semantic HTML structure

## Technical Notes for Developers

### Mock Data System
The demo uses hardcoded data to simulate backend responses:
- Vote counts are predetermined
- Percentages are calculated dynamically
- User's vote increments the selected option

### Integration Ready
The demo code demonstrates how the real implementation will work:
- Same HTML structure as NodeBB templates
- Same CSS classes and styling
- Same JavaScript event handling
- Same component architecture

### Browser Compatibility
**Supported Browsers:**
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

**Required Features:**
- ES6 JavaScript support
- CSS Grid and Flexbox
- Modern event handling

## Troubleshooting

### Demo Not Loading
1. **Check File Path**: Ensure `poll-demo.html` is in the correct directory
2. **Browser Console**: Open DevTools and check for JavaScript errors
3. **File Permissions**: Make sure the file is readable
4. **Internet Connection**: Demo uses CDN resources (Bootstrap, jQuery)

### Voting Not Working
1. **JavaScript Enabled**: Ensure JavaScript is enabled in your browser
2. **Console Errors**: Check browser console for error messages
3. **Click Target**: Make sure you're clicking on the radio buttons, not labels

### Styling Related Information
1. **CDN Access**: Demo requires internet for Bootstrap and Font Awesome
2. **CSS Loading**: Check if external stylesheets are blocked
3. **Browser Zoom**: Try resetting browser zoom to 100%

**Demo URL**: Open `poll-demo.html` in your browser  
**Documentation**: See `README-polls.md` for technical details  
**Implementation**: See `IMPLEMENTATION-SUMMARY.md` for complete overview