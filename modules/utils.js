// Utils.js - Utility functions for the app
// Extracted from index.html for better modularity

class Utils {
    // Sanitize user input to prevent XSS
    static sanitize(str) {
        if (!str) return '';
        return String(str).replace(/[<>;]/g, '');
    }

    // Date normalization utility
    static normalizeDate(dateStr) {
        if (!dateStr) return null;
        // Convert YYYY-MM-DD or YY-MM-DD to MM/DD/YYYY
        if (dateStr.match(/^\d{2,4}-\d{2}-\d{2}$/)) {
            let [year, month, day] = dateStr.split('-');
            if (year.length === 2) year = '20' + year;
            return `${parseInt(month)}/${parseInt(day)}/${year}`;
        }
        return dateStr; // Already in MM/DD/YYYY or other format
    }

    // Convert Date to YYYY-MM-DD format in local timezone
    static toISODate(date = new Date()) {
        const d = date instanceof Date ? date : new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Development mode detection
    static isDevelopmentMode() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.hostname.startsWith('192.168.') ||
               window.location.hostname.startsWith('10.') ||
               window.location.port === '8080' ||
               window.location.protocol === 'file:' ||
               window.location.search.includes('dev=true');
    }

    // Haptic feedback
    static vibrate(pattern) {
        if (navigator.vibrate && window.settings?.get('haptic')) {
            navigator.vibrate(pattern);
        }
    }

    // Toast notification
    static showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span>${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 3000);
    }

    // Snackbar notification
    static showSnackbar(message, type = 'info', duration = 3000) {
        const snackbar = document.createElement('div');
        snackbar.className = `snackbar ${type}`;
        snackbar.textContent = message;
        document.body.appendChild(snackbar);
        
        setTimeout(() => {
            if (snackbar.parentElement) {
                snackbar.remove();
            }
        }, duration);
    }

    // Smart date formatting for session display
    // Input: YYYY-MM-DD strings. Does NOT use new Date() to avoid timezone issues.
    static formatSessionDate(startDate, endDate) {
        if (!startDate) return '';
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        
        const sParts = startDate.split('-');
        const sYear = parseInt(sParts[0]);
        const sMonth = parseInt(sParts[1]);
        const sDay = parseInt(sParts[2]);
        
        // Single day or no end date
        if (!endDate || startDate === endDate) {
            return String(sMonth).padStart(2, '0') + '/' + String(sDay).padStart(2, '0');
        }
        
        const eParts = endDate.split('-');
        const eYear = parseInt(eParts[0]);
        const eMonth = parseInt(eParts[1]);
        const eDay = parseInt(eParts[2]);
        
        // Cross-year: "Dec 31, 2025–Jan 1, 2026"
        if (sYear !== eYear) {
            return `${months[sMonth-1]} ${sDay}, ${sYear}\u2013${months[eMonth-1]} ${eDay}, ${eYear}`;
        }
        
        // Same month: "Jun 20–22"
        if (sMonth === eMonth) {
            return `${months[sMonth-1]} ${sDay}\u2013${eDay}`;
        }
        
        // Different months: "Jun 30–Jul 2"
        return `${months[sMonth-1]} ${sDay}\u2013${months[eMonth-1]} ${eDay}`;
    }

    // Sheet management
    static showSheet(overlayId, sheetId) {
        document.getElementById(overlayId).style.display = 'block';
        document.getElementById(sheetId).style.display = 'block';
    }

    static hideSheet(overlayId, sheetId) {
        document.getElementById(overlayId).style.display = 'none';
        document.getElementById(sheetId).style.display = 'none';
    }
}

// Expose to window
window.Utils = Utils;
