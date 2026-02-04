// Utils.js - Utility functions for the app
// Extracted from index.html for better modularity

class Utils {
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
    static showSnackbar(message, type = 'info') {
        const snackbar = document.createElement('div');
        snackbar.className = `snackbar ${type}`;
        snackbar.textContent = message;
        document.body.appendChild(snackbar);
        
        setTimeout(() => {
            if (snackbar.parentElement) {
                snackbar.remove();
            }
        }, 2000);
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
