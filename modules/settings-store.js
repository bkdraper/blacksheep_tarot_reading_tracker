// SettingsStore.js - App settings management with localStorage persistence
// Extracted from index.html for better modularity

class SettingsStore {
    constructor() {
        this.defaults = {
            sound: true,
            haptic: true,
            darkMode: false,
            defaultTimer: 15,
            timerNotifications: true,
            dailySummary: true,
            weekendGoals: true,
            bestDay: true,
            tipTrends: true,
            peakTime: true,
            paymentMethods: ['Cash', 'CC', 'Venmo', 'PayPal', 'Cash App'],
            sources: ['Referral', 'Renu', 'POG', 'Repeat']
        };
        this.settings = this.loadSettings();
        this.applySettings();
    }

    loadSettings() {
        const saved = localStorage.getItem('tarotTrackerSettings');
        return saved ? { ...this.defaults, ...JSON.parse(saved) } : { ...this.defaults };
    }

    saveSettings() {
        localStorage.setItem('tarotTrackerSettings', JSON.stringify(this.settings));
    }

    get(key) {
        return this.settings[key];
    }

    set(key, value) {
        this.settings[key] = value;
        this.saveSettings();
        this.applySettings();
    }

    toggle(key) {
        this.set(key, !this.get(key));
    }

    applySettings() {
        // Apply dark mode
        if (this.get('darkMode')) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }

        // Redraw timer canvas for color changes
        if (window.timer && window.timer.canvas) {
            window.timer.drawTimer();
        }

        // Update UI toggles
        this.updateToggleUI();
    }

    updateToggleUI() {
        const toggles = {
            'soundToggle': 'sound',
            'hapticToggle': 'haptic',
            'darkModeToggle': 'darkMode',
            'timerNotificationsToggle': 'timerNotifications',
            'dailySummaryToggle': 'dailySummary',
            'weekendGoalsToggle': 'weekendGoals',
            'bestDayToggle': 'bestDay',
            'tipTrendsToggle': 'tipTrends',
            'peakTimeToggle': 'peakTime'
        };

        Object.entries(toggles).forEach(([elementId, settingKey]) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.classList.toggle('active', this.get(settingKey));
            }
        });

        // Update default timer select
        const timerSelect = document.getElementById('defaultTimer');
        if (timerSelect) {
            timerSelect.value = this.get('defaultTimer');
        }
    }

    // UI Methods
    openDrawer() {
        vibrate([50]);
        document.getElementById('settingsOverlay').classList.add('open');
        document.getElementById('settingsDrawer').classList.add('open');
        this.updateToggleUI();
    }

    closeDrawer() {
        vibrate([30]);
        document.getElementById('settingsOverlay').classList.remove('open');
        document.getElementById('settingsDrawer').classList.remove('open');
        this.closePaymentMethodsSheet();
    }

    toggleSetting(key) {
        if (this.get('haptic')) vibrate([30]);
        this.toggle(key);
        
        if (key === 'defaultTimer') {
            const minutes = this.get('defaultTimer');
            document.getElementById('timerInput').value = minutes;
            if (window.timer) window.timer.seconds = minutes * 60;
        }
    }

    updateSetting(key, value) {
        if (this.get('haptic')) vibrate([30]);
        if (key === 'defaultTimer') {
            this.set(key, parseInt(value));
            document.getElementById('timerInput').value = value;
            if (window.timer) window.timer.seconds = parseInt(value) * 60;
        } else {
            this.set(key, value);
        }
    }

    customizePaymentMethods() {
        if (this.get('haptic')) vibrate([50]);
        this.showPaymentMethodsSheet();
    }
    
    showPaymentMethodsSheet() {
        const methods = this.get('paymentMethods');
        const list = document.getElementById('paymentMethodsList');
        if (!list) return;
        
        list.innerHTML = methods.map((method, index) => `
            <div class="payment-method-item">
                <input type="text" class="payment-method-input" value="${method}" 
                       onchange="settings.updatePaymentMethod(${index}, this.value)">
                <button class="payment-method-delete" onclick="settings.deletePaymentMethod(${index})">Delete</button>
            </div>
        `).join('');
        showSheet('paymentMethodsOverlay', 'paymentMethodsSheet');
    }
    
    closePaymentMethodsSheet() {
        if (this.get('haptic')) vibrate([30]);
        hideSheet('paymentMethodsOverlay', 'paymentMethodsSheet');
    }
    
    updatePaymentMethod(index, value) {
        if (this.get('haptic')) vibrate([30]);
        const methods = [...this.get('paymentMethods')];
        methods[index] = value.trim();
        this.set('paymentMethods', methods.filter(m => m));
        showSnackbar('Setting saved', 'success');
    }
    
    deletePaymentMethod(index) {
        if (this.get('haptic')) vibrate([50]);
        const methods = [...this.get('paymentMethods')];
        methods.splice(index, 1);
        this.set('paymentMethods', methods);
        this.showPaymentMethodsSheet();
    }
    
    addPaymentMethod() {
        if (this.get('haptic')) vibrate([50]);
        const methods = [...this.get('paymentMethods')];
        methods.push('New Method');
        this.set('paymentMethods', methods);
        this.showPaymentMethodsSheet();
    }

    customizeSources() {
        if (this.get('haptic')) vibrate([50]);
        this.showSourcesSheet();
    }
    
    showSourcesSheet() {
        const sources = this.get('sources');
        const list = document.getElementById('sourcesList');
        if (!list) return;
        
        list.innerHTML = sources.map((source, index) => `
            <div class="payment-method-item">
                <input type="text" class="payment-method-input" value="${source}" 
                       onchange="settings.updateSource(${index}, this.value)">
                <button class="payment-method-delete" onclick="settings.deleteSource(${index})">Delete</button>
            </div>
        `).join('');
        showSheet('sourcesOverlay', 'sourcesSheet');
    }
    
    closeSourcesSheet() {
        if (this.get('haptic')) vibrate([30]);
        hideSheet('sourcesOverlay', 'sourcesSheet');
    }
    
    updateSource(index, value) {
        if (this.get('haptic')) vibrate([30]);
        const sources = [...this.get('sources')];
        sources[index] = value.trim();
        this.set('sources', sources.filter(s => s));
        showSnackbar('Setting saved', 'success');
    }
    
    deleteSource(index) {
        if (this.get('haptic')) vibrate([50]);
        const sources = [...this.get('sources')];
        sources.splice(index, 1);
        this.set('sources', sources);
        this.showSourcesSheet();
    }
    
    addSource() {
        if (this.get('haptic')) vibrate([50]);
        const sources = [...this.get('sources')];
        sources.push('New Source');
        this.set('sources', sources);
        this.showSourcesSheet();
    }

    async exportData() {
        if (!window.session.user) {
            showSnackbar('Select a user first', 'error');
            return;
        }
        
        if (this.get('haptic')) vibrate([50]);
        
        try {
            const { data } = await supabaseClient
                .from('blacksheep_reading_tracker_sessions')
                .select('*')
                .eq('user_name', window.session.user)
                .order('session_date', { ascending: false });
            
            if (!data || data.length === 0) {
                showSnackbar('No data to export', 'error');
                return;
            }
            
            const csvData = [];
            csvData.push(['Date', 'User', 'Location', 'Day', 'Reading Price', 'Readings Count', 'Base Total', 'Tips Total', 'Grand Total']);
            
            data.forEach(sessionData => {
                const readingCount = sessionData.readings ? sessionData.readings.length : 0;
                const baseTotal = readingCount * (sessionData.reading_price || 0);
                const tipsTotal = sessionData.readings ? sessionData.readings.reduce((sum, r) => sum + (r.tip || 0), 0) : 0;
                const grandTotal = baseTotal + tipsTotal;
                
                csvData.push([
                    sessionData.session_date,
                    sessionData.user_name,
                    sessionData.location,
                    sessionData.session_date,
                    sessionData.reading_price,
                    readingCount,
                    baseTotal.toFixed(2),
                    tipsTotal.toFixed(2),
                    grandTotal.toFixed(2)
                ]);
            });
            
            const csvContent = csvData.map(row => row.join(',')).join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `tarot-sessions-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            
            URL.revokeObjectURL(url);
            showSnackbar('Data exported successfully', 'success');
        } catch (error) {
            showSnackbar('Export failed', 'error');
        }
    }

    // Settings UI functions
    collapseSettings() {
        const content = document.getElementById('settingsContent');
        const icon = document.querySelector('.collapse-icon');
        content.classList.remove('open');
        icon.classList.remove('open');
    }

    toggleSettings() {
        vibrate([50]);
        const content = document.getElementById('settingsContent');
        const icon = document.querySelector('.collapse-icon');
        content.classList.toggle('open');
        icon.classList.toggle('open');
    }

    closePaymentMethodsSheet() {
        if (this.get('haptic')) vibrate([30]);
        hideSheet('paymentMethodsOverlay', 'paymentMethodsSheet');
    }

    closeSourcesSheet() {
        if (this.get('haptic')) vibrate([30]);
        hideSheet('sourcesOverlay', 'sourcesSheet');
    }
}