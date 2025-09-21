# Tarot Reading Tracker

## Overview
A mobile-optimized single page application for tracking tarot readings and tips during events or sessions. Built with pure HTML, CSS, and JavaScript - no external libraries or frameworks.

## Purpose
- Track individual tarot readings with timestamps
- Record tips for each reading
- Calculate totals (base earnings + tips)
- Manage readings log with add/remove functionality

## Technical Requirements
- **Pure web technologies**: HTML/CSS/JS only, no libraries
- **Mobile-first**: Optimized for mobile browsers and touch interfaces
- **Offline capable**: Works without internet connection
- **Single file**: Self-contained HTML file for easy deployment

## Design Rules Established

### Mobile Optimization
- Touch targets minimum 44px height for easy tapping
- Font sizes 16px+ to prevent mobile zoom
- System fonts for better mobile performance
- `touch-action: manipulation` to prevent double-tap zoom
- `-webkit-appearance: none` to override mobile browser defaults
- Use `!important` declarations when mobile browsers override styles

### Layout Principles
- Compact design to maximize screen real estate
- Inline layouts for infrequently changed inputs (reading price)
- Table layouts for data that needs alignment (totals)
- Prominent display of most important information (grand total)

### User Experience
- Confirmation dialogs for destructive actions (delete readings)
- Specific confirmation messages showing what's being deleted
- Auto-numbering of readings (1., 2., 3., etc.)
- Enter key handling for quick tip input
- Time-only timestamps (no seconds) for cleaner display

### Input Sizing
- Reading price: 80px width (rarely changes)
- Tip inputs: 70px width (frequent use, sized for 4-5 characters)
- All inputs center-aligned for better readability

## Features

### Core Functionality
1. **Add Reading**: Creates new reading entry with current time
2. **Remove Reading**: Removes last reading from list
3. **Individual Delete**: Delete any specific reading with confirmation
4. **Tip Tracking**: Enter tips for each reading
5. **Real-time Totals**: Automatic calculation of all totals

### Display Elements
- **Reading Price**: Inline input, defaults to $40
- **Add/Remove Buttons**: Large touch-friendly buttons
- **Totals Table**: Compact table showing readings count, base total, tips total
- **Grand Total**: Prominent green total with border
- **Readings Log**: Numbered list with timestamps, tip inputs, and delete buttons

### Data Structure
Each reading contains:
- `timestamp`: Time in HH:MM AM/PM format
- `tip`: Numeric tip amount (default 0)

## File Structure
- `index.html`: Main application file
- `server.js`: Node.js server for local hosting
- `package.json`: Node.js project configuration
- `README.md`: This documentation file

## Deployment
- **Hosted on AWS Amplify** under the `reading-tracker` app
- **Live URL**: https://tracker.blacksheep-gypsies.com
- **Custom Domain Setup**: 
  - Subdomain configured in AWS Amplify console
  - CNAME record added in Squarespace: Settings > Domains > blacksheep-gypsies.com > DNS > Custom Records
- **Updates**: Deploy new versions by uploading zip file to Amplify console

## Development Notes
- Version timestamp in upper right corner for cache-busting during development
- Cache-control meta tags to prevent browser caching during development
- Server runs on port 8080, accessible at http://192.168.5.62:8080 on local network

## Usage
1. Set reading price (defaults to $40)
2. Click "+ Add Reading" for each tarot reading performed
3. Enter tip amounts in the tip input boxes
4. View real-time totals in the summary table
5. Delete individual readings using the red × button if needed
6. Use the "-" button to remove the most recent reading

## Browser Compatibility
Designed for modern mobile browsers with support for:
- CSS Flexbox
- ES6 JavaScript features
- HTML5 input types
- Touch events