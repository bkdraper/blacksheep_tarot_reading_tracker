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
            sources: [
                { name: 'Referral', scope: 'event' },
                { name: 'Renu', scope: 'event' },
                { name: 'POG', scope: 'event' },
                { name: 'Repeat', scope: 'all' }
            ],
            formats: [
                { name: 'Expo', scope: 'event' },
                { name: 'Fair', scope: 'event' },
                { name: 'Festival', scope: 'event' },
                { name: 'Shop', scope: 'event' },
                { name: 'Party', scope: 'event' },
                { name: 'Market', scope: 'event' },
                { name: 'Phone', scope: 'private' },
                { name: 'In-Person', scope: 'private' }
            ],
            privatePricePresets: [60, 120, 150]
        };
        this.settings = this.loadSettings();
        this.applySettings();
    }

    loadSettings() {
        const saved = localStorage.getItem('tarotTrackerSettings');
        const settings = saved ? { ...this.defaults, ...JSON.parse(saved) } : { ...this.defaults };
        const migrated = this.migrateSources(settings);
        if (migrated) {
            localStorage.setItem('tarotTrackerSettings', JSON.stringify(settings));
        }
        const formatsMigrated = this.migrateSourcesFormats(settings);
        if (formatsMigrated) {
            localStorage.setItem('tarotTrackerSettings', JSON.stringify(settings));
        }
        return settings;
    }

    /**
     * Migrate legacy flat string array sources to scoped object format.
     * Returns true if migration was performed, false otherwise.
     */
    migrateSources(settings) {
        if (Array.isArray(settings.sources) && settings.sources.length > 0 && typeof settings.sources[0] === 'string') {
            settings.sources = settings.sources.map(name => ({ name, scope: 'event' }));
            return true;
        }
        return false;
    }

    /**
     * Migrate "Phone" and "In-Person" from sources to formats.
     * Removes exact matches only (not substrings), adds them to formats as private scope,
     * and sets legacySourcesMigrated flag to prevent re-running.
     * Returns true if any changes were made, false otherwise.
     */
    migrateSourcesFormats(settings) {
        if (settings.legacySourcesMigrated === true) {
            return false;
        }

        let changed = false;

        // Initialize formats from defaults if not present
        if (!settings.formats) {
            settings.formats = [...this.defaults.formats.map(f => ({ ...f }))];
            changed = true;
        }

        // Find and remove sources with exact name "Phone" or "In-Person"
        const legacyNames = ['Phone', 'In-Person'];
        const removedSources = [];

        if (Array.isArray(settings.sources)) {
            const originalLength = settings.sources.length;
            settings.sources = settings.sources.filter(source => {
                const name = typeof source === 'object' ? source.name : source;
                if (legacyNames.indexOf(name) !== -1) {
                    removedSources.push(name);
                    return false;
                }
                return true;
            });
            if (settings.sources.length < originalLength) {
                changed = true;
            }
        }

        // Add removed sources to formats if not already present (case-insensitive check)
        removedSources.forEach(name => {
            const exists = settings.formats.some(f => f.name.toLowerCase() === name.toLowerCase());
            if (!exists) {
                settings.formats.push({ name, scope: 'private' });
            }
        });

        settings.legacySourcesMigrated = true;
        return changed || removedSources.length > 0;
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
                <button class="payment-method-delete btn btn-danger btn-small" onclick="settings.deletePaymentMethod(${index})">Delete</button>
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
        
        list.innerHTML = sources.map((source, index) => {
            const name = typeof source === 'object' ? source.name : source;
            const scope = typeof source === 'object' ? source.scope : 'event';
            return `
            <div class="payment-method-item source-item">
                <input type="text" class="payment-method-input" value="${name}" 
                       onchange="settings.updateSource(${index}, 'name', this.value)">
                <select class="source-scope-select" onchange="settings.updateSource(${index}, 'scope', this.value)">
                    <option value="event"${scope === 'event' ? ' selected' : ''}>Event</option>
                    <option value="private"${scope === 'private' ? ' selected' : ''}>Private</option>
                    <option value="all"${scope === 'all' ? ' selected' : ''}>All</option>
                </select>
                <button class="payment-method-delete btn btn-danger btn-small" onclick="settings.deleteSource(${index})">Delete</button>
            </div>
        `}).join('');
        showSheet('sourcesOverlay', 'sourcesSheet');
    }
    
    closeSourcesSheet() {
        if (this.get('haptic')) vibrate([30]);
        hideSheet('sourcesOverlay', 'sourcesSheet');
    }
    
    updateSource(index, field, value) {
        if (this.get('haptic')) vibrate([30]);
        const sources = [...this.get('sources')].map(s => typeof s === 'object' ? { ...s } : { name: s, scope: 'event' });
        if (field === 'name') {
            sources[index].name = value.trim();
        } else if (field === 'scope') {
            sources[index].scope = value;
        }
        this.set('sources', sources.filter(s => s.name));
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
        sources.push({ name: 'New Source', scope: 'all' });
        this.set('sources', sources);
        this.showSourcesSheet();
    }

    customizeFormats() {
        if (this.get('haptic')) vibrate([50]);
        this.showFormatsSheet();
    }

    showFormatsSheet() {
        const formats = this.get('formats');
        const list = document.getElementById('formatsList');
        if (!list) return;

        list.innerHTML = formats.map((format, index) => {
            const name = typeof format === 'object' ? format.name : format;
            const scope = typeof format === 'object' ? format.scope : 'all';
            return `
            <div class="payment-method-item source-item">
                <input type="text" class="payment-method-input" value="${name}" maxlength="30"
                       style="font-size: 16px"
                       onchange="settings.updateFormat(${index}, 'name', this.value)">
                <select class="source-scope-select" style="font-size: 16px" onchange="settings.updateFormat(${index}, 'scope', this.value)">
                    <option value="event"${scope === 'event' ? ' selected' : ''}>Event</option>
                    <option value="private"${scope === 'private' ? ' selected' : ''}>Private</option>
                    <option value="all"${scope === 'all' ? ' selected' : ''}>All</option>
                </select>
                <button class="payment-method-delete btn btn-danger btn-small" onclick="settings.deleteFormat(${index})">Delete</button>
            </div>
        `}).join('');
        showSheet('formatsOverlay', 'formatsSheet');
    }

    closeFormatsSheet() {
        if (this.get('haptic')) vibrate([30]);
        hideSheet('formatsOverlay', 'formatsSheet');
    }

    updateFormat(index, field, value) {
        if (this.get('haptic')) vibrate([30]);
        const formats = [...this.get('formats')].map(f => typeof f === 'object' ? { ...f } : { name: f, scope: 'all' });
        if (field === 'name') {
            const trimmed = value.trim();
            if (!trimmed) {
                formats.splice(index, 1);
                this.set('formats', formats);
                this.showFormatsSheet();
                return;
            }
            if (trimmed.length > 30) {
                showSnackbar('Name must be 30 characters or less', 'error');
                return;
            }
            const isDuplicate = formats.some((f, i) =>
                i !== index &&
                f.name.toLowerCase() === trimmed.toLowerCase() &&
                f.scope === formats[index].scope
            );
            if (isDuplicate) {
                showSnackbar('Name already in use', 'error');
                return;
            }
            formats[index].name = trimmed;
        } else if (field === 'scope') {
            formats[index].scope = value;
        }
        this.set('formats', formats);
        showSnackbar('Setting saved', 'success');
    }

    deleteFormat(index) {
        if (this.get('haptic')) vibrate([50]);
        const formats = [...this.get('formats')];
        formats.splice(index, 1);
        this.set('formats', formats);
        this.showFormatsSheet();
    }

    addFormat() {
        if (this.get('haptic')) vibrate([50]);
        const formats = [...this.get('formats')];
        formats.push({ name: 'New Format', scope: 'all' });
        this.set('formats', formats);
        this.showFormatsSheet();
    }

    customizePrivatePricePresets() {
        if (this.get('haptic')) vibrate([50]);
        this.showPrivatePricePresetsSheet();
    }

    showPrivatePricePresetsSheet() {
        const presets = this.get('privatePricePresets');
        const list = document.getElementById('privatePricePresetsList');
        if (!list) return;

        list.innerHTML = presets.map((preset, index) => `
            <div class="payment-method-item">
                <input type="number" class="payment-method-input" value="${preset}" min="0" step="1"
                       onchange="settings.updatePrivatePricePreset(${index}, this.value)">
                <button class="payment-method-delete btn btn-danger btn-small" onclick="settings.deletePrivatePricePreset(${index})">Delete</button>
            </div>
        `).join('');
        showSheet('privatePricePresetsOverlay', 'privatePricePresetsSheet');
    }

    closePrivatePricePresetsSheet() {
        if (this.get('haptic')) vibrate([30]);
        hideSheet('privatePricePresetsOverlay', 'privatePricePresetsSheet');
    }

    updatePrivatePricePreset(index, value) {
        if (this.get('haptic')) vibrate([30]);
        const presets = [...this.get('privatePricePresets')];
        const numValue = parseInt(value);
        if (!isNaN(numValue) && numValue >= 0) {
            presets[index] = numValue;
            this.set('privatePricePresets', presets);
            showSnackbar('Setting saved', 'success');
        }
    }

    deletePrivatePricePreset(index) {
        if (this.get('haptic')) vibrate([50]);
        const presets = [...this.get('privatePricePresets')];
        presets.splice(index, 1);
        this.set('privatePricePresets', presets);
        this.showPrivatePricePresetsSheet();
    }

    addPrivatePricePreset() {
        if (this.get('haptic')) vibrate([50]);
        const presets = [...this.get('privatePricePresets')];
        presets.push(0);
        this.set('privatePricePresets', presets);
        this.showPrivatePricePresetsSheet();
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

    closePaymentMethodsSheet() {
        if (this.get('haptic')) vibrate([30]);
        hideSheet('paymentMethodsOverlay', 'paymentMethodsSheet');
    }

    closeSourcesSheet() {
        if (this.get('haptic')) vibrate([30]);
        hideSheet('sourcesOverlay', 'sourcesSheet');
    }
}