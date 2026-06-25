class SessionStore {
            constructor() {
                this._sessionId = null;
                this._location = '';
                this._sessionDate = '';
                this._price = 40;
                this._type = 'event';
                this._readings = [];
                this.saveTimeout = null;
                this._format = null;
                this._loading = false;
                this._loadedSessions = [];
                this._sessionFilter = 'all';
                this._sessionFormatFilter = 'all';
            }

            // Getters - read from auth
            get sessionId() { return this._sessionId; }
            get userId() { return window.auth?.userId || null; }
            get userName() { return window.auth?.getUserName() || ''; }
            get location() { return this._location; }
            get sessionDate() { return this._sessionDate; }
            get price() { return this._price; }
            get readings() { return this._readings; }
            get type() { return this._type || 'event'; }
            get format() { return this._format; }

            // Computed properties
            get canCreateSession() {
                return this.userId && this._location.trim() && this._sessionDate && this._price;
            }
            get hasValidSession() {
                return this._sessionId && this.userId && this._location.trim() && this._sessionDate;
            }
            get sessionPhase() {
                if (this.hasValidSession) return 'ACTIVE';
                if (this.canCreateSession) return 'READY_TO_CREATE';
                return 'SETUP';
            }

            // Setters with side effects
            set sessionId(value) {
                this._sessionId = value;
                this.updateUI();
                this.save();
            }
            set location(value) {
                this._location = value;
                this.updateUI();
                this.debouncedSave();
            }
            set sessionDate(value) {
                this._sessionDate = value;
                this.updateUI();
                this.debouncedSave();
            }
            set price(value) {
                this._price = value;
                this.updateUI();
                this.debouncedSave();
            }
            set type(value) {
                this._type = (value === 'private') ? 'private' : 'event';
                this.updateUI();
                this.save();
            }
            set format(value) {
                this._format = value || null;
                this.updateUI();
                this.debouncedSave();
            }
            set readings(value) {
                this._readings = value;
                this.updateReadingsList();
                this.updateTotals();
                this.save();
            }

            // Methods
            async addReading(reading) {
                this._readings.push(reading);
                this.updateReadingsList();
                this.updateTotals();
                
                if (this._sessionId) {
                    try {
                        const { data } = await supabaseClient
                            .from('blacksheep_reading_tracker_readings')
                            .insert([{
                                session_id: this._sessionId,
                                timestamp: reading.timestamp,
                                tip: reading.tip || 0,
                                price: reading.price,
                                payment: reading.payment,
                                source: reading.source
                            }])
                            .select();
                        
                        if (data && data[0]) {
                            reading.id = data[0].id;
                        }
                    } catch (error) {
                        console.error('Failed to insert reading:', error);
                        registerBackgroundSync();
                    }
                }
                
                this.saveToLocalStorage();
            }
            async removeReading(index) {
                const reading = this._readings[index];
                
                if (reading.id) {
                    try {
                        await supabaseClient
                            .from('blacksheep_reading_tracker_readings')
                            .delete()
                            .eq('id', reading.id);
                    } catch (error) {
                        console.error('Failed to delete reading:', error);
                        registerBackgroundSync();
                    }
                }
                
                this._readings.splice(index, 1);
                this.updateReadingsList();
                this.updateTotals();
                this.saveToLocalStorage();
            }
            async updateReading(index, field, value) {
                this._readings[index][field] = value;
                this.updateReadingsList();
                this.updateTotals();
                
                const reading = this._readings[index];
                if (reading.id) {
                    try {
                        await supabaseClient
                            .from('blacksheep_reading_tracker_readings')
                            .update({ [field]: value })
                            .eq('id', reading.id);
                    } catch (error) {
                        console.error('Failed to update reading:', error);
                        registerBackgroundSync();
                    }
                }
                
                this.debouncedSaveToLocalStorage();
            }

            startOver() {
                this._loading = true;
                this.sessionId = null;
                this.location = '';
                this.sessionDate = '';
                this.price = 40;
                this.readings = [];
                this._loading = false;
                this.clearUserData();
                this.updateUI();
            }

            clear() {
                this.startOver();
            }

            updateUI() {
                // Only update if authenticated
                if (!this.userId) {
                    const readingsButtons = document.getElementById('container-readings-buttons');
                    const readingsTotals = document.getElementById('container-readings-totals');
                    const readingsList = document.getElementById('container-readings-list');
                    const sessionBar = document.getElementById('session-bar');
                    
                    if (readingsButtons) readingsButtons.style.setProperty('display', 'none');
                    if (readingsTotals) readingsTotals.style.setProperty('display', 'none');
                    if (readingsList) readingsList.style.setProperty('display', 'none');
                    if (sessionBar) sessionBar.style.setProperty('display', 'none');
                    return;
                }
                
                // Session bar always visible when authenticated
                const sessionBar = document.getElementById('session-bar');
                if (sessionBar) sessionBar.style.removeProperty('display');
                
                // Readings section visibility controlled by updateSections based on session state
                this.updateButtons();
                this.updateSections();
                this.updateSessionBar();
            }

            updateButtons() {
                const createBtn = document.querySelector('.btn-create-session');
                const newBtn = document.querySelector('.btn-new-session');
                const loadBtn = document.querySelector('.btn-load-session');
                const locationInput = document.getElementById('location');
                const sessionDateInput = document.getElementById('sessionDate');
                const requiredNote = document.getElementById('requiredFieldsNote');
                
                // Load Session button - disabled if no user
                if (loadBtn) {
                    if (!this.userId) {
                        loadBtn.classList.add('disabled');
                        loadBtn.disabled = true;
                    } else {
                        loadBtn.classList.remove('disabled');
                        loadBtn.disabled = false;
                    }
                }
                
                // Create Session button - only visible in setup phase
                if (createBtn) {
                    if (this.sessionPhase === 'SETUP' || this.sessionPhase === 'READY_TO_CREATE') {
                        createBtn.style.display = 'block';
                        if (this.sessionPhase === 'READY_TO_CREATE') {
                            createBtn.classList.remove('inactive');
                            createBtn.classList.add('active');
                        } else {
                            createBtn.classList.remove('active');
                            createBtn.classList.add('inactive');
                        }
                    } else {
                        createBtn.style.display = 'none';
                    }
                }
                
                // Show/hide required fields note
                if (requiredNote) {
                    requiredNote.style.display = this.sessionPhase === 'SETUP' ? 'block' : 'none';
                }
                
                // Highlight required fields when in setup mode
                if (locationInput && sessionDateInput) {
                    if (this.sessionPhase === 'SETUP') {
                        if (!this._location.trim()) {
                            locationInput.classList.add('required-field');
                        } else {
                            locationInput.classList.remove('required-field');
                        }
                        
                        if (!this._sessionDate) {
                            sessionDateInput.classList.add('required-field');
                        } else {
                            sessionDateInput.classList.remove('required-field');
                        }
                    } else {
                        locationInput.classList.remove('required-field');
                        sessionDateInput.classList.remove('required-field');
                    }
                }
                
                // New Session button - only show when session is active
                if (newBtn) {
                    newBtn.style.display = this.sessionPhase === 'ACTIVE' ? 'block' : 'none';
                }
            }

            updateSections() {
                if (!this.userId) return;
                
                // Use both class selectors and IDs for robustness
                const buttonsDiv = document.querySelector('.buttons');
                const totalsDiv = document.querySelector('.totals');
                const readingsDiv = document.querySelector('.readings-list');
                const readingsButtons = document.getElementById('container-readings-buttons');
                const readingsTotals = document.getElementById('container-readings-totals');
                const readingsList = document.getElementById('container-readings-list');
                
                const showSections = this.sessionPhase === 'ACTIVE';
                if (buttonsDiv) buttonsDiv.style.display = showSections ? 'flex' : 'none';
                if (totalsDiv) totalsDiv.style.display = showSections ? 'block' : 'none';
                if (readingsDiv) readingsDiv.style.display = showSections ? 'block' : 'none';
                // Also set by ID in case class selectors miss them
                if (readingsButtons && readingsButtons !== buttonsDiv) readingsButtons.style.display = showSections ? 'flex' : 'none';
                if (readingsTotals && readingsTotals !== totalsDiv) readingsTotals.style.display = showSections ? 'block' : 'none';
                if (readingsList && readingsList !== readingsDiv) readingsList.style.display = showSections ? 'block' : 'none';
            }

            updateReadingsList() {
                const list = document.getElementById('readingsList');
                list.innerHTML = this._readings.map((reading, index) => {
                    const displayTime = this.formatTimestamp(reading.timestamp);
                    return `
                    <div class="reading-item" data-index="${index}">
                        <div class="reading-left">
                            <button class="delete-btn btn btn-danger btn-small" onclick="readingsManager.deleteReading(${index})">×</button>
                            <div style="border-left: 2px solid #ddd; padding-left: 10px;">
                                <span class="index">${index + 1}.</span>
                                <span class="timestamp">${displayTime}</span>
                            </div>
                        </div>
                        <div class="reading-right">
                            <div class="reading-field">
                                <span class="field-label">Price:</span>
                                <div class="field-input-container">
                                    <span class="dollar-sign">$</span>
                                    <input type="number" class="price-input" placeholder="${this._price}" 
                                           value="${reading.price || ''}" step="0.01" min="0" inputmode="decimal"
                                           onchange="session.updateReading(${index}, 'price', parseFloat(this.value) || null)"
                                           onkeydown="if(event.key==='Enter') this.blur()">
                                </div>
                            </div>
                            <div class="reading-field">
                                <span class="field-label">Tip:</span>
                                <div class="field-input-container">
                                    <span class="dollar-sign">$</span>
                                    <input type="number" class="tip-input" placeholder="0" 
                                           value="${reading.tip || ''}" step="0.01" min="0" inputmode="decimal"
                                           onchange="session.updateReading(${index}, 'tip', parseFloat(this.value) || 0)"
                                           onkeydown="if(event.key==='Enter') this.blur()">
                                </div>
                            </div>
                            <div class="reading-field">
                                <span class="field-label">Pay:</span>
                                <button class="field-button btn btn-ghost btn-small ${reading.payment ? 'selected' : ''}" 
                                        onclick="readingsManager.openPaymentSheet(${index})">
                                    ${Utils.sanitize(reading.payment) || 'Method'}
                                </button>
                            </div>
                            <div class="reading-field">
                                <span class="field-label">From:</span>
                                <button class="field-button btn btn-ghost btn-small ${reading.source ? 'selected' : ''}" 
                                        onclick="readingsManager.openSourceSheet(${index})">
                                    ${Utils.sanitize(reading.source) || 'Source'}
                                </button>
                            </div>
                        </div>
                    </div>
                `}).join('');
            }

            formatTimestamp(timestamp) {
                if (!timestamp) return '';
                if (timestamp.includes('T')) {
                    return new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                }
                return timestamp; // Legacy format
            }

            updateTotals() {
                const count = this._readings.length;
                const baseTotal = this._readings.reduce((sum, reading) => sum + (reading.price || this._price), 0);
                const tipsTotal = this._readings.reduce((sum, reading) => sum + (reading.tip || 0), 0);
                const grandTotal = baseTotal + tipsTotal;

                document.getElementById('readingCount').textContent = count;
                document.getElementById('baseTotal').textContent = baseTotal.toFixed(2);
                document.getElementById('tipsTotal').textContent = tipsTotal.toFixed(2);
                document.getElementById('grandTotal').textContent = grandTotal.toFixed(2);
            }

            async save() {
                if (!this.userId || this._loading) return;
                
                this.saveToLocalStorage();

                if (this._sessionId) {
                    try {
                        const updateData = {
                            user_id: this.userId,
                            user_name: this.userName,
                            location: this._location,
                            reading_price: this._price
                        };
                        
                        if (this._sessionDate && this._sessionDate.trim()) {
                            updateData.session_date = this._sessionDate;
                        }
                        
                        await supabaseClient
                            .from('blacksheep_reading_tracker_sessions')
                            .update(updateData)
                            .eq('id', this._sessionId);
                    } catch (error) {
                        console.error('Supabase update error:', error);
                        registerBackgroundSync();
                    }
                }
            }

            saveToLocalStorage() {
                if (!this.userId) return;
                
                const state = {
                    sessionId: this._sessionId,
                    location: this._location,
                    sessionDate: this._sessionDate,
                    price: this._price,
                    type: this._type || 'event',
                    format: this._format,
                    readings: this._readings
                };
                localStorage.setItem(`readingTracker_${this.userId}`, JSON.stringify(state));
            }

            debouncedSave() {
                clearTimeout(this.saveTimeout);
                this.saveTimeout = setTimeout(() => this.save(), 500);
            }
            
            debouncedSaveToLocalStorage() {
                clearTimeout(this.saveTimeout);
                this.saveTimeout = setTimeout(() => this.saveToLocalStorage(), 500);
            }

            loadFromStorage() {
                if (!this.userId) return;
                
                const saved = localStorage.getItem(`readingTracker_${this.userId}`);
                if (saved) {
                    const state = JSON.parse(saved);
                    this._sessionId = state.sessionId || null;
                    this._location = state.location || '';
                    this._sessionDate = state.sessionDate || state.selectedDay || '';
                    this._price = state.price || 40;
                    if (state.type !== 'event' && state.type !== 'private') {
                        console.log(`[SessionStore] loadFromStorage: type "${state.type}" is missing or invalid, defaulting to "event"`);
                    }
                    this._type = (state.type === 'private') ? 'private' : 'event';
                    this._format = state.format || null;
                    this._readings = state.readings || [];
                    
                    this.updateReadingsList();
                    this.updateTotals();
                    this.updateUI();
                }
            }

            promptRestoreSession() {
                if (!this.userId) return;

                const saved = localStorage.getItem(`readingTracker_${this.userId}`);
                if (!saved) {
                    this.updateUI();
                    return;
                }

                const state = JSON.parse(saved);
                // Only prompt if there's an actual session to restore
                if (!state.sessionId) {
                    this.updateUI();
                    return;
                }

                const location = state.location || 'Unknown location';
                const date = state.sessionDate || state.selectedDay || 'Unknown date';
                const readingCount = (state.readings || []).length;
                const message = `Your last session was "${location}" on ${date} (${readingCount} reading${readingCount !== 1 ? 's' : ''}). Restore it?`;

                if (confirm(message)) {
                    this.loadFromStorage();
                } else {
                    this.startOver();
                }
            }
            
            clearUserData() {
                if (this.userId) {
                    localStorage.removeItem(`readingTracker_${this.userId}`);
                }
            }
            
            // Admin user switching
            async showUserSelection() {
                if (!window.auth?.isAdmin()) return;
                
                vibrate([50]);
                const { data } = await supabaseClient
                    .from('blacksheep_reading_tracker_user_profiles')
                    .select('user_id, user_name, role')
                    .order('user_name', { ascending: true });
                
                if (data && data.length > 0) {
                    const userList = document.getElementById('list-users');
                    userList.innerHTML = data.map(profile => `
                        <div class="session-item" onclick="auth.setActiveUser('${profile.user_id}', '${Utils.sanitize(profile.user_name || profile.user_id)}'); session.hideUserSelection();">
                            <div class="session-info">${Utils.sanitize(profile.user_name || profile.user_id)}</div>
                            <div class="session-details">${profile.role}</div>
                        </div>
                    `).join('');
                    showSheet('overlay-user-selection', 'sheet-user-selection');
                }
            }
            
            hideUserSelection() {
                vibrate([30]);
                hideSheet('overlay-user-selection', 'sheet-user-selection');
            }
            
            // Deprecated methods
            selectUser() {}
            addNewUser() {}
            loadUsers() { return []; }
            
            handleCreateSession() {
                const createBtn = document.querySelector('.btn-create-session');
                if (createBtn.classList.contains('inactive')) {
                    showSnackbar('Location and date are required', 'error');
                    vibrate([50]);
                } else {
                    this.createSession();
                }
            }

            async createSession() {
                if (!this.canCreateSession) {
                    showSnackbar('Location and date are required', 'error');
                    return;
                }
                
                vibrate([50]);
                const btn = document.querySelector('.btn-create-session');
                const originalText = btn.textContent;
                btn.innerHTML = '<span class="spinner inline"></span>Creating...';
                btn.classList.add('loading');
                
                try {
                    const { data } = await supabaseClient
                        .from('blacksheep_reading_tracker_sessions')
                        .select('*')
                        .eq('session_date', this._sessionDate)
                        .eq('user_id', this.userId)
                        .eq('location', this._location)
                        .limit(1);
                    
                    if (data && data[0]) {
                        btn.textContent = originalText;
                        btn.classList.remove('loading');
                        
                        const message = `${data[0].location} on ${data[0].session_date} already exists`;
                        showSnackbar(message);
                        if (confirm(`${message}. Load existing session?`)) {
                            await this.loadExistingSession(data[0]);
                        } else {
                            this.location = '';
                            this.sessionDate = '';
                        }
                        return;
                    }
                    
                    const { data: newData } = await supabaseClient
                        .from('blacksheep_reading_tracker_sessions')
                        .insert([{
                            session_date: this._sessionDate,
                            user_id: this.userId,
                            user_name: this.userName,
                            location: this._location,
                            reading_price: this._price,
                            type: this._type || 'event'
                        }])
                        .select();
                    
                    if (newData && newData[0]) {
                        this.sessionId = newData[0].id;
                        this.readings = [];
                        showSnackbar('Session created successfully!');
                    }
                } catch (error) {
                    showSnackbar('Database error, using offline mode', 'error');
                    registerBackgroundSync();
                } finally {
                    btn.textContent = originalText;
                    btn.classList.remove('loading');
                    this.updateUI();
                }
            }

            startNewSession() {
                vibrate([100, 50, 100]);
                if (confirm('Start a new session? This will unload the current session.')) {
                    this.startOver();
                    window.timer.reset();
                    document.getElementById('timerInput').value = window.settings.get('defaultTimer');
                    showSnackbar('Ready to create new session', 'success');
                }
            }

            async showLoadSession() {
                this.closeHamburgerMenu();
                if (!this.userId) return;
                
                vibrate([50]);
                const btn = document.querySelector('.btn-load-session');
                let originalText;
                if (btn) {
                    originalText = btn.textContent;
                    btn.innerHTML = '<span class="spinner inline"></span>Loading...';
                    btn.classList.add('loading');
                }
                
                try {
                    const { data } = await supabaseClient
                        .from('session_summaries')
                        .select('*')
                        .eq('user_id', this.userId)
                        .order('session_date', { ascending: false })
                        .order('created_at', { ascending: false });
                    
                    if (data && data.length > 0) {
                        this._loadedSessions = data;
                        this._sessionFilter = 'all';
                        this._sessionFormatFilter = 'all';
                        // Reset search input and filter buttons
                        const searchInput = document.getElementById('session-search');
                        if (searchInput) searchInput.value = '';
                        const filterBtns = document.querySelectorAll('.session-filter-btn');
                        filterBtns.forEach(btn => {
                            btn.classList.toggle('active', btn.dataset.filter === 'all');
                        });
                        const formatFilterBtns = document.querySelectorAll('.session-format-filter-btn');
                        formatFilterBtns.forEach(btn => {
                            btn.classList.toggle('active', btn.dataset.format === 'all');
                        });
                        this.filterLoadedSessions();
                        showSheet('sessionOverlay', 'sessionSheet');
                    } else {
                        showSnackbar('No existing sessions found', 'error');
                    }
                } catch (error) {
                    showSnackbar('Failed to load sessions', 'error');
                } finally {
                    if (btn) {
                        btn.textContent = originalText;
                        btn.classList.remove('loading');
                    }
                }
            }

            filterLoadedSessions(typeFilter, btnElement) {
                // If called with a type filter (from button click), update the active filter
                if (typeFilter) {
                    this._sessionFilter = typeFilter;
                    // Update active class on filter buttons
                    const filterBtns = document.querySelectorAll('.session-filter-btn');
                    filterBtns.forEach(btn => btn.classList.remove('active'));
                    if (btnElement) {
                        btnElement.classList.add('active');
                    } else {
                        // Find the button with matching data-filter
                        filterBtns.forEach(btn => {
                            if (btn.dataset.filter === typeFilter) btn.classList.add('active');
                        });
                    }
                }

                const searchInput = document.getElementById('session-search');
                const searchText = (searchInput ? searchInput.value : '').toLowerCase();
                const activeFilter = this._sessionFilter;
                const activeFormatFilter = this._sessionFormatFilter;
                const knownFormats = ['expo', 'shop', 'party', 'phone', 'in-person'];

                const filtered = this._loadedSessions.filter(sessionData => {
                    // Type filter
                    if (activeFilter !== 'all' && sessionData.type !== activeFilter) return false;
                    // Format filter
                    if (activeFormatFilter !== 'all') {
                        const sessionFormat = (sessionData.format || '').toLowerCase();
                        if (activeFormatFilter === 'other') {
                            // "Other" matches formats not in the known list, including null/empty
                            if (sessionFormat && knownFormats.includes(sessionFormat)) return false;
                        } else {
                            // Match case-insensitively against the selected format
                            if (sessionFormat !== activeFormatFilter) return false;
                        }
                    }
                    // Search filter - case-insensitive substring match against location
                    if (searchText && !(sessionData.location || '').toLowerCase().includes(searchText)) return false;
                    return true;
                });

                const sessionsList = document.getElementById('sessionsList');
                if (filtered.length > 0) {
                    sessionsList.innerHTML = filtered.map(sessionData => {
                        const readingCount = sessionData.readings_count || 0;
                        const date = new Date(normalizeDate(sessionData.session_date)).toLocaleDateString();
                        const dayOfWeek = new Date(normalizeDate(sessionData.session_date)).toLocaleDateString('en-US', { weekday: 'short' });
                        const grandTotal = sessionData.total_earnings || 0;
                        const typeBadge = sessionData.type === 'private'
                            ? '<span class="session-type-badge session-type-private"><i class="fas fa-user"></i> Private</span>'
                            : '<span class="session-type-badge session-type-event"><i class="fas fa-store"></i> Event</span>';
                        const formatBadge = sessionData.format
                            ? `<span class="session-format-badge">${Utils.sanitize(sessionData.format)}</span>`
                            : '';
                        return `
                            <div class="session-item" onclick="session.selectSession('${sessionData.id}', event)">
                                <div class="session-info">${Utils.sanitize(sessionData.location) || 'No location'} - ${dayOfWeek} ${date} ${typeBadge}${formatBadge}</div>
                                <div class="session-details">${readingCount} readings  $${grandTotal.toFixed(2)}</div>
                            </div>
                        `;
                    }).join('');
                } else {
                    sessionsList.innerHTML = '<div class="no-sessions-message">No matching sessions</div>';
                }
            }

            setSessionFilter(type) {
                this._sessionFilter = type;
                const filterBtns = document.querySelectorAll('.session-filter-btn');
                filterBtns.forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.filter === type);
                });
                this.filterLoadedSessions();
            }

            setSessionFormatFilter(format, btnElement) {
                this._sessionFormatFilter = format;
                const formatBtns = document.querySelectorAll('.session-format-filter-btn');
                formatBtns.forEach(btn => btn.classList.remove('active'));
                if (btnElement) {
                    btnElement.classList.add('active');
                } else {
                    formatBtns.forEach(btn => {
                        if (btn.dataset.format === format) btn.classList.add('active');
                    });
                }
                this.filterLoadedSessions();
            }

            closeSessionSheet() {
                vibrate([30]);
                hideSheet('sessionOverlay', 'sessionSheet');
            }

            async selectSession(sessionId, event) {
                vibrate([50]);
                const sessionItem = event.target.closest('.session-item');
                const originalHTML = sessionItem.innerHTML;
                sessionItem.innerHTML = '<div class="session-info"><span class="spinner"></span>Loading session...</div>';
                sessionItem.style.pointerEvents = 'none';
                
                try {
                    const { data } = await supabaseClient
                        .from('blacksheep_reading_tracker_sessions')
                        .select('*')
                        .eq('id', sessionId)
                        .single();
                    
                    if (data) {
                        await this.loadExistingSession(data);
                        this.closeSessionSheet();
                    } else {
                        showSnackbar('Session not found', 'error');
                    }
                } catch (error) {
                    showSnackbar('Failed to load session', 'error');
                } finally {
                    sessionItem.innerHTML = originalHTML;
                    sessionItem.style.pointerEvents = 'auto';
                }
            }

            async loadExistingSession(sessionData) {
                this._loading = true;
                this._sessionId = sessionData.id;
                this._location = sessionData.location || '';
                this._sessionDate = sessionData.session_date || '';
                this._price = sessionData.reading_price || 40;
                this._type = (sessionData.type === 'private') ? 'private' : 'event';
                this._format = sessionData.format || null;
                
                try {
                    const { data: readings } = await supabaseClient
                        .from('blacksheep_reading_tracker_readings')
                        .select('*')
                        .eq('session_id', sessionData.id)
                        .order('timestamp', { ascending: true });
                    
                    this._readings = readings || [];
                } catch (error) {
                    console.error('Failed to load readings:', error);
                    this._readings = [];
                }
                
                this._loading = false;
                
                this.updateReadingsList();
                this.updateTotals();
                this.updateUI();
                this.saveToLocalStorage();
                
                showSnackbar(`Loaded session: ${sessionData.location} on ${sessionData.session_date}`);
            }

            updateSessionBar() {
                const locationEl = document.getElementById('session-bar-location');
                const typeEl = document.getElementById('session-bar-type');
                const formatEl = document.getElementById('session-bar-format');
                const badgesEl = document.getElementById('session-bar-badges');
                const priceEl = document.getElementById('session-bar-price');
                const dateEl = document.getElementById('session-bar-date');
                const editBtn = document.getElementById('btn-session-edit');
                
                if (!locationEl) return;
                
                if (!this.hasValidSession) {
                    // No active session state
                    locationEl.textContent = '(no active session)';
                    locationEl.classList.add('no-session');
                    if (badgesEl) badgesEl.style.display = 'none';
                    if (formatEl) formatEl.style.display = 'none';
                    priceEl.style.display = 'none';
                    dateEl.style.display = 'none';
                    editBtn.style.display = 'none';
                } else {
                    // Location name (plain text, no icon)
                    locationEl.textContent = this._location;
                    locationEl.classList.remove('no-session');
                    
                    // Badges row
                    if (badgesEl && typeEl) {
                        const type = this._type || 'event';
                        typeEl.innerHTML = type === 'private'
                            ? '<span class="session-type-badge session-type-private"><i class="fas fa-user"></i> Private</span>'
                            : '<span class="session-type-badge session-type-event"><i class="fas fa-store"></i> Event</span>';
                        
                        if (formatEl) {
                            if (this._format) {
                                const display = this._format.length > 20 
                                    ? Utils.sanitize(this._format.substring(0, 20)) + '…' 
                                    : Utils.sanitize(this._format);
                                formatEl.innerHTML = `<span class="session-format-badge">${display}</span>`;
                                formatEl.style.display = '';
                            } else {
                                formatEl.style.display = 'none';
                            }
                        }
                        badgesEl.style.display = '';
                    }
                    
                    priceEl.textContent = '· $' + this._price;
                    priceEl.style.display = '';
                    
                    // Format date as MM/DD from YYYY-MM-DD
                    if (this._sessionDate) {
                        const parts = this._sessionDate.split('-');
                        const mmdd = parts[1] + '/' + parts[2];
                        dateEl.textContent = '· ' + mmdd;
                        dateEl.style.display = '';
                    } else {
                        dateEl.style.display = 'none';
                    }
                    
                    editBtn.style.display = '';
                    editBtn.onclick = () => {
                        this.openSessionSheet('edit', this._type || 'event');
                    };
                }
            }

            // === Hamburger Menu Methods ===
            
            toggleHamburgerMenu() {
                const overlay = document.getElementById('hamburger-overlay');
                const menu = document.getElementById('hamburger-menu');
                if (!overlay || !menu) return;
                
                const isVisible = menu.style.display === 'block';
                if (isVisible) {
                    this.closeHamburgerMenu();
                } else {
                    // Update "End Session" disabled state
                    const endItem = document.getElementById('hamburger-end-session');
                    if (endItem) {
                        if (!this.hasValidSession) {
                            endItem.classList.add('disabled');
                        } else {
                            endItem.classList.remove('disabled');
                        }
                    }
                    overlay.style.display = 'block';
                    menu.style.display = 'block';
                }
            }

            closeHamburgerMenu() {
                const overlay = document.getElementById('hamburger-overlay');
                const menu = document.getElementById('hamburger-menu');
                if (overlay) overlay.style.display = 'none';
                if (menu) menu.style.display = 'none';
            }

            newEvent() {
                this.closeHamburgerMenu();
                this.openSessionSheet('create', 'event');
            }

            newPrivateReading() {
                this.closeHamburgerMenu();
                this.openSessionSheet('create', 'private');
            }

            openSessionSheet(mode, type) {
                this._sheetMode = mode;
                this._sheetType = type;
                this._sheetSelectedPrice = null;
                this._sheetSelectedSource = null;
                this._sheetSelectedFormat = null;

                // Set title
                const titleEl = document.getElementById('sessionSheetTitle');
                if (titleEl) {
                    if (mode === 'edit') {
                        const editIcon = type === 'private' ? 'fas fa-user' : 'fas fa-store';
                        titleEl.innerHTML = `<i class="${editIcon}" style="margin-right: 8px;"></i>Edit Session`;
                    } else if (type === 'private') {
                        titleEl.innerHTML = '<i class="fas fa-user" style="margin-right: 8px;"></i>New Private Reading';
                    } else {
                        titleEl.innerHTML = '<i class="fas fa-store" style="margin-right: 8px;"></i>New Event';
                    }
                }

                const fieldsContainer = document.getElementById('sessionSheetFields');
                if (!fieldsContainer) return;

                const today = new Date().toISOString().split('T')[0];
                const dateValue = mode === 'edit' ? (this._sessionDate || today) : today;
                const editLocation = mode === 'edit' ? Utils.sanitize(this._location) : '';
                const priceValue = mode === 'edit' ? this._price : this._price;

                if (type === 'event') {
                    fieldsContainer.innerHTML = `
                        <div class="input-group">
                            <label>Location</label>
                            <input type="text" id="sessionSheetLocation" maxlength="100" placeholder="Event Name / Location" value="${editLocation}">
                        </div>
                        <div class="input-group">
                            <label>Date</label>
                            <input type="date" id="sessionSheetDate" value="${dateValue}" onclick="this.showPicker()">
                        </div>
                        <div class="input-group">
                            <label>Price</label>
                            <div class="price-input-container">
                                <span class="dollar-sign">$</span>
                                <input type="number" id="sessionSheetPrice" step="0.01" min="0" value="${priceValue}">
                            </div>
                        </div>`;
                } else {
                    // Private type
                    const presets = window.settings ? window.settings.get('privatePricePresets') : [];
                    const sources = window.settings ? window.settings.get('sources') : [];
                    const filteredSources = sources.filter(s => s.scope === 'private' || s.scope === 'all');

                    let priceHtml = '';
                    if (presets && presets.length > 0) {
                        const selectedPrice = mode === 'edit' ? this._price : null;
                        this._sheetSelectedPrice = selectedPrice;
                        priceHtml = `
                            <div class="input-group">
                                <label>Price</label>
                                <div class="price-presets" id="sessionSheetPricePresets">
                                    ${presets.map(p => `<button class="preset-btn${p === selectedPrice ? ' active' : ''}" onclick="session.selectPresetPrice(${p})">$${p}</button>`).join('')}
                                </div>
                            </div>`;
                    } else {
                        priceHtml = `
                            <div class="input-group">
                                <label>Price</label>
                                <div class="price-input-container">
                                    <span class="dollar-sign">$</span>
                                    <input type="number" id="sessionSheetPrice" step="0.01" min="0" value="${priceValue}">
                                </div>
                            </div>`;
                    }

                    let sourcesHtml = '';
                    if (mode !== 'edit' && filteredSources.length > 0) {
                        const selectedSource = '';
                        this._sheetSelectedSource = null;
                        sourcesHtml = `
                            <div class="input-group">
                                <label>Source</label>
                                <div class="source-toggles" id="sessionSheetSourceToggles">
                                    ${filteredSources.map(s => `<button class="source-toggle-btn" onclick="session.selectSessionSource('${Utils.sanitize(s.name)}')">${Utils.sanitize(s.name)}</button>`).join('')}
                                </div>
                            </div>`;
                    }

                    fieldsContainer.innerHTML = `
                        <div class="input-group">
                            <label>Client</label>
                            <input type="text" id="sessionSheetLocation" maxlength="100" placeholder="Client Name" value="${editLocation}">
                        </div>
                        <div class="input-group">
                            <label>Date</label>
                            <input type="date" id="sessionSheetDate" value="${dateValue}" onclick="this.showPicker()">
                        </div>
                        ${priceHtml}
                        ${sourcesHtml}`;
                }

                // Render format selector
                this._renderFormatSelector(type, mode);

                showSheet('sessionSheetOverlay', 'sessionCreationSheet');
            }

            _renderFormatSelector(type, mode) {
                const fieldsContainer = document.getElementById('sessionSheetFields');
                if (!fieldsContainer) return;

                const formats = window.settings ? window.settings.get('formats') : [];
                const matchingFormats = formats.filter(f => f.scope === type || f.scope === 'all');

                // In edit mode, include the session's current format even if not in settings
                let editFormat = null;
                if (mode === 'edit' && this._format) {
                    editFormat = this._format;
                    const alreadyIncluded = matchingFormats.some(f => f.name === editFormat);
                    if (!alreadyIncluded) {
                        matchingFormats.push({ name: editFormat, scope: type });
                    }
                }

                if (matchingFormats.length === 0) return;

                // Determine default selection
                let defaultFormat = null;
                if (mode === 'edit' && this._format) {
                    defaultFormat = this._format;
                } else if (type === 'event') {
                    defaultFormat = 'Expo';
                } else {
                    defaultFormat = 'In-Person';
                }
                this._sheetSelectedFormat = defaultFormat;

                const label = type === 'event' ? 'Kind of event' : 'Kind of reading';
                const buttonsHtml = matchingFormats.map(f => {
                    const active = f.name === defaultFormat ? ' active' : '';
                    return `<button class="format-toggle-btn${active}" onclick="session.selectSessionFormat('${Utils.sanitize(f.name)}')">${Utils.sanitize(f.name)}</button>`;
                }).join('');

                const formatHtml = `
                    <div class="input-group format-group" id="formatSelectorGroup">
                        <label>${label}</label>
                        <div class="format-toggles" id="sessionSheetFormatToggles">
                            ${buttonsHtml}
                        </div>
                    </div>`;

                fieldsContainer.insertAdjacentHTML('beforeend', formatHtml);
            }

            selectSessionFormat(name) {
                this._sheetSelectedFormat = name;
                const container = document.getElementById('sessionSheetFormatToggles');
                if (container) {
                    container.querySelectorAll('.format-toggle-btn').forEach(btn => {
                        btn.classList.toggle('active', btn.textContent === name);
                    });
                }
            }

            selectPresetPrice(value) {
                this._sheetSelectedPrice = value;
                const container = document.getElementById('sessionSheetPricePresets');
                if (container) {
                    container.querySelectorAll('.preset-btn').forEach(btn => {
                        btn.classList.toggle('active', btn.textContent === '$' + value);
                    });
                }
            }

            selectSessionSource(name) {
                this._sheetSelectedSource = name;
                const container = document.getElementById('sessionSheetSourceToggles');
                if (container) {
                    container.querySelectorAll('.source-toggle-btn').forEach(btn => {
                        btn.classList.toggle('active', btn.textContent === name);
                    });
                }
            }

            async saveSessionSheet() {
                vibrate([50]);

                // Read values from form
                const locationInput = document.getElementById('sessionSheetLocation');
                const dateInput = document.getElementById('sessionSheetDate');
                const priceInput = document.getElementById('sessionSheetPrice');

                const location = locationInput ? locationInput.value.trim() : '';
                const date = dateInput ? dateInput.value : '';

                // For private type with presets, use selected preset price; otherwise use input
                let price;
                if (this._sheetType === 'private' && this._sheetSelectedPrice !== null) {
                    price = this._sheetSelectedPrice;
                } else if (priceInput) {
                    price = parseFloat(priceInput.value) || 0;
                } else {
                    price = this._price || 40;
                }

                // Validation
                let hasError = false;

                // Clear previous errors first
                const fields = document.getElementById('sessionSheetFields');
                if (fields) {
                    fields.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
                    fields.querySelectorAll('input').forEach(el => el.style.border = '');
                }

                // Location/Client name: must have ≥1 non-whitespace char
                if (!location || location.trim().length === 0) {
                    if (locationInput) {
                        locationInput.classList.add('input-error');
                    }
                    hasError = true;
                }

                // Date: must be a valid date (YYYY-MM-DD format)
                if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(date + 'T00:00:00').getTime())) {
                    if (dateInput) {
                        dateInput.classList.add('input-error');
                    }
                    hasError = true;
                }

                // Format: must be selected (required field)
                if (!this._sheetSelectedFormat) {
                    const formatGroup = document.getElementById('formatSelectorGroup');
                    if (formatGroup) {
                        formatGroup.classList.add('input-error');
                    }
                    hasError = true;
                }

                if (hasError) {
                    showSnackbar('Please fill in required fields', 'error');
                    return;
                }

                // Disable save button during operation
                const saveBtn = document.getElementById('btn-session-save');
                if (saveBtn) {
                    saveBtn.disabled = true;
                    saveBtn.innerHTML = '<span class="spinner inline"></span>Saving...';
                }

                try {
                    if (this._sheetMode === 'edit') {
                        // UPDATE existing session (type is locked - never changed on edit)
                        if (this._sessionId) {
                            await supabaseClient
                                .from('blacksheep_reading_tracker_sessions')
                                .update({
                                    location: location,
                                    session_date: date,
                                    reading_price: price,
                                    format: this._sheetSelectedFormat || null
                                })
                                .eq('id', this._sessionId);
                        }

                        // Update local state
                        this._loading = true;
                        this._location = location;
                        this._sessionDate = date;
                        this._price = price;
                        this._format = this._sheetSelectedFormat || null;
                        this._loading = false;

                        this.saveToLocalStorage();
                        this.closeSessionCreationSheet();
                        this.updateSessionBar();
                        this.updateUI();
                        showSnackbar('Session updated', 'success');

                    } else {
                        // CREATE new session
                        // Check for duplicate first
                        const { data: existing } = await supabaseClient
                            .from('blacksheep_reading_tracker_sessions')
                            .select('*')
                            .eq('session_date', date)
                            .eq('user_id', this.userId)
                            .eq('location', location)
                            .limit(1);

                        if (existing && existing[0]) {
                            if (saveBtn) {
                                saveBtn.disabled = false;
                                saveBtn.textContent = 'Save';
                            }
                            const message = `${existing[0].location} on ${existing[0].session_date} already exists`;
                            showSnackbar(message);
                            if (confirm(`${message}. Load existing session?`)) {
                                await this.loadExistingSession(existing[0]);
                                this.closeSessionCreationSheet();
                            }
                            return;
                        }

                        // Insert new session with type
                        const { data: newData } = await supabaseClient
                            .from('blacksheep_reading_tracker_sessions')
                            .insert([{
                                session_date: date,
                                user_id: this.userId,
                                user_name: this.userName,
                                location: location,
                                reading_price: price,
                                type: this._sheetType,
                                format: this._sheetSelectedFormat || null
                            }])
                            .select();

                        if (newData && newData[0]) {
                            this._loading = true;
                            this._sessionId = newData[0].id;
                            this._location = location;
                            this._sessionDate = date;
                            this._price = price;
                            this._type = this._sheetType;
                            this._format = this._sheetSelectedFormat || null;
                            this._readings = [];
                            this._loading = false;

                            // For private sessions, auto-create the first reading with selected price and source
                            if (this._sheetType === 'private') {
                                const readingData = {
                                    timestamp: new Date().toISOString(),
                                    tip: 0,
                                    price: price
                                };
                                if (this._sheetSelectedSource) {
                                    readingData.source = this._sheetSelectedSource;
                                }
                                await this.addReading(readingData);
                            }

                            this.saveToLocalStorage();
                            this.closeSessionCreationSheet();
                            this.updateReadingsList();
                            this.updateTotals();
                            this.updateSessionBar();
                            this.updateUI();
                            showSnackbar('Session created!', 'success');
                        }
                    }
                } catch (error) {
                    console.error('Save session sheet error:', error);
                    showSnackbar('Database error, using offline mode', 'error');

                    // Offline fallback: save locally anyway
                    this._loading = true;
                    this._location = location;
                    this._sessionDate = date;
                    this._price = price;
                    this._type = this._sheetType;
                    this._format = this._sheetSelectedFormat || null;
                    if (this._sheetMode === 'create') {
                        this._sessionId = 'offline_' + Date.now();
                        this._readings = [];
                    }
                    this._loading = false;

                    // For private sessions, auto-create the first reading with selected price and source
                    if (this._sheetMode === 'create' && this._sheetType === 'private') {
                        const readingData = {
                            timestamp: new Date().toISOString(),
                            tip: 0,
                            price: price
                        };
                        if (this._sheetSelectedSource) {
                            readingData.source = this._sheetSelectedSource;
                        }
                        await this.addReading(readingData);
                    }

                    this.saveToLocalStorage();
                    this.closeSessionCreationSheet();
                    this.updateReadingsList();
                    this.updateTotals();
                    this.updateSessionBar();
                    this.updateUI();
                    registerBackgroundSync();
                } finally {
                    if (saveBtn) {
                        saveBtn.disabled = false;
                        saveBtn.textContent = 'Save';
                    }
                }
            }

            endSession() {
                this.closeHamburgerMenu();
                if (!this.hasValidSession) return;

                if (!confirm('End the current session? This will clear all active session data.')) return;

                // Clear all session state
                this._loading = true;
                this._sessionId = null;
                this._location = '';
                this._sessionDate = '';
                this._price = 40;
                this._readings = [];
                this._type = 'event';
                this._format = null;
                this._loading = false;

                // Persist cleared state
                this.saveToLocalStorage();

                // Update full UI (handles session bar + readings section visibility)
                this.updateUI();

                showSnackbar('Session ended', 'success');
            }

            closeSessionCreationSheet() {
                vibrate([30]);
                hideSheet('sessionSheetOverlay', 'sessionCreationSheet');

                // Clear error indicators
                const fields = document.getElementById('sessionSheetFields');
                if (fields) {
                    fields.querySelectorAll('.input-error').forEach(el => {
                        el.classList.remove('input-error');
                    });
                    fields.querySelectorAll('input').forEach(el => {
                        el.style.border = '';
                    });
                }
            }

        }
