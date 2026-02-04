class SessionStore {
            constructor() {
                this._sessionId = null;
                this._user = '';
                this._location = '';
                this._sessionDate = '';
                this._price = 40;
                this._readings = [];
                this.saveTimeout = null;
                this._loading = false;
            }

            // Getters
            get sessionId() { return this._sessionId; }
            get user() { return this._user; }
            get location() { return this._location; }
            get sessionDate() { return this._sessionDate; }
            get price() { return this._price; }
            get readings() { return this._readings; }

            // Computed properties
            get canCreateSession() {
                return this._user.trim() && this._location.trim() && this._sessionDate && this._price;
            }
            get hasValidSession() {
                return this._sessionId && this._user.trim() && this._location.trim() && this._sessionDate;
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
            set user(value) {
                const wasActiveSession = this.hasValidSession;
                const previousUser = this._user;
                
                this._user = value;
                const userBtn = document.getElementById('userBtn');
                userBtn.textContent = value || 'Select User...';
                userBtn.classList.toggle('selected', !!value);
                
                // If switching users during active session, clear session
                if (wasActiveSession && previousUser && previousUser !== value) {
                    this._sessionId = null;
                    this._location = '';
                    this._sessionDate = '';
                    this._price = 40;
                    this._readings = [];
                    document.getElementById('location').value = '';
                    document.getElementById('price').value = '40';
                    document.getElementById('sessionDate').value = '';
                    this.updateReadingsList();
                    this.updateTotals();
                    showSnackbar(`Switched to ${value}. Ready to create new session or load existing.`, 'success');
                }
                
                this.updateUI();
                this.debouncedSave();
            }
            set location(value) {
                this._location = value;
                document.getElementById('location').value = value;
                this.updateUI();
                this.debouncedSave();
            }
            set sessionDate(value) {
                this._sessionDate = value;
                document.getElementById('sessionDate').value = value;
                this.updateUI();
                this.debouncedSave();
            }
            set price(value) {
                this._price = value;
                document.getElementById('price').value = value;
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
            addReading(reading) {
                this._readings.push(reading);
                this.updateReadingsList();
                this.updateTotals();
                this.save();
            }
            removeReading(index) {
                this._readings.splice(index, 1);
                this.updateReadingsList();
                this.updateTotals();
                this.save();
            }
            updateReading(index, field, value) {
                this._readings[index][field] = value;
                this.updateReadingsList();
                this.updateTotals();
                this.debouncedSave();
            }

            startOver() {
                this._sessionId = null;
                this._location = '';
                this._sessionDate = '';
                this._price = 40;
                this._readings = [];
                document.getElementById('location').value = '';
                document.getElementById('price').value = '40';
                document.getElementById('sessionDate').value = '';
                this.clearUserData();
                this.updateUI();
            }

            clear() {
                this.startOver();
            }

            updateUI() {
                this.updateButtons();
                this.updateSections();
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
                    if (!this._user.trim()) {
                        loadBtn.classList.add('disabled');
                        loadBtn.disabled = true;
                    } else {
                        loadBtn.classList.remove('disabled');
                        loadBtn.disabled = false;
                    }
                }
                
                // Create Session button - only visible in setup phase
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
                
                // Show/hide required fields note
                if (requiredNote) {
                    requiredNote.style.display = this.sessionPhase === 'SETUP' ? 'block' : 'none';
                }
                
                // Highlight required fields and auto-expand when in setup mode
                if (this.sessionPhase === 'SETUP') {
                    // Auto-expand settings panel
                    const content = document.getElementById('settingsContent');
                    const icon = document.querySelector('.collapse-icon');
                    if (!content.classList.contains('open')) {
                        content.classList.add('open');
                        icon.classList.add('open');
                    }
                    
                    const userBtn = document.getElementById('userBtn');
                    if (!this._user.trim()) {
                        userBtn.classList.add('required-field');
                    } else {
                        userBtn.classList.remove('required-field');
                    }
                    
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
                    const userBtn = document.getElementById('userBtn');
                    userBtn.classList.remove('required-field');
                    locationInput.classList.remove('required-field');
                    sessionDateInput.classList.remove('required-field');
                }
                
                // New Session button - only show when session is active
                newBtn.style.display = this.sessionPhase === 'ACTIVE' ? 'block' : 'none';
                
                // Auto-expand settings when create button becomes ready
                if (this.sessionPhase === 'READY_TO_CREATE') {
                    const content = document.getElementById('settingsContent');
                    const icon = document.querySelector('.collapse-icon');
                    if (!content.classList.contains('open')) {
                        content.classList.add('open');
                        icon.classList.add('open');
                    }
                }
            }

            updateSections() {
                const buttonsDiv = document.querySelector('.buttons');
                const totalsDiv = document.querySelector('.totals');
                const readingsDiv = document.querySelector('.readings-list');
                
                const showSections = this.sessionPhase === 'ACTIVE';
                buttonsDiv.style.display = showSections ? 'flex' : 'none';
                totalsDiv.style.display = showSections ? 'block' : 'none';
                readingsDiv.style.display = showSections ? 'block' : 'none';
            }

            updateReadingsList() {
                const list = document.getElementById('readingsList');
                list.innerHTML = this._readings.map((reading, index) => {
                    const displayTime = this.formatTimestamp(reading.timestamp);
                    return `
                    <div class="reading-item" data-index="${index}">
                        <div class="reading-left">
                            <button class="delete-btn" onclick="readingsManager.deleteReading(${index})">×</button>
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
                                <button class="field-button ${reading.payment ? 'selected' : ''}" 
                                        onclick="readingsManager.openPaymentSheet(${index})">
                                    ${reading.payment || 'Method'}
                                </button>
                            </div>
                            <div class="reading-field">
                                <span class="field-label">From:</span>
                                <button class="field-button ${reading.source ? 'selected' : ''}" 
                                        onclick="readingsManager.openSourceSheet(${index})">
                                    ${reading.source || 'Source'}
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
                if (!this._user || this._loading) return; // Don't save without user or during loading
                
                const state = {
                    sessionId: this._sessionId,
                    user: this._user,
                    location: this._location,
                    sessionDate: this._sessionDate,
                    price: this._price,
                    readings: this._readings
                };
                localStorage.setItem(`readingTracker_${this._user}`, JSON.stringify(state));

                if (this._sessionId) {
                    try {
                        const updateData = {
                            user_name: this._user,
                            location: this._location,
                            reading_price: this._price,
                            readings: this._readings
                        };
                        
                        // Only include session_date if it's not empty
                        if (this._sessionDate && this._sessionDate.trim()) {
                            updateData.session_date = this._sessionDate;
                        }
                        
                        await supabaseClient
                            .from('blacksheep_reading_tracker_sessions')
                            .update(updateData)
                            .eq('id', this._sessionId);
                    } catch (error) {
                        console.error('Supabase update error:', error);
                        console.error('Error details:', error.details, error.hint, error.code);
                        console.error('Data being sent:', {
                            user_name: this._user,
                            location: this._location,
                            session_date: this._sessionDate,
                            reading_price: this._price,
                            readings: this._readings
                        });
                        // Register for background sync on network failure
                        registerBackgroundSync();
                    }
                }
            }

            debouncedSave() {
                clearTimeout(this.saveTimeout);
                this.saveTimeout = setTimeout(() => this.save(), 500);
            }

            loadFromStorage() {
                if (!this._user) return;
                
                const saved = localStorage.getItem(`readingTracker_${this._user}`);
                if (saved) {
                    const state = JSON.parse(saved);
                    this._sessionId = state.sessionId || null;
                    this._location = state.location || '';
                    this._sessionDate = state.sessionDate || state.selectedDay || '';
                    this._price = state.price || 40;
                    this._readings = state.readings || [];
                    
                    // Update DOM without triggering saves
                    const userBtn = document.getElementById('userBtn');
                    userBtn.textContent = this._user || 'Select User...';
                    userBtn.classList.toggle('selected', !!this._user);
                    document.getElementById('location').value = this._location;
                    document.getElementById('price').value = this._price;
                    document.getElementById('sessionDate').value = this._sessionDate;
                    
                    // Update readings display and totals
                    this.updateReadingsList();
                    this.updateTotals();
                    this.updateUI();
                }
            }
            
            async loadUsers() {
                try {
                    const { data } = await supabaseClient
                        .from('blacksheep_reading_tracker_sessions')
                        .select('user_name')
                        .not('user_name', 'is', null);
                    
                    const uniqueUsers = [...new Set(data?.map(row => row.user_name) || [])];
                    const userList = document.getElementById('userList');
                    if (userList) {
                        userList.innerHTML = uniqueUsers.map(user => `
                            <div class="user-item" onclick="session.selectUser('${user}')">${user}</div>
                        `).join('');
                    }
                    return uniqueUsers;
                } catch (error) {
                    return [];
                }
            }
            
            clearUserData() {
                if (this._user) {
                    localStorage.removeItem(`readingTracker_${this._user}`);
                }
            }
            
            // UI Methods
            showUserSelection() {
                vibrate([30]);
                showSheet('userOverlay', 'userSheet');
                
                const userList = document.getElementById('userList');
                userList.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="spinner"></div></div>';
                
                this.loadUsers();
            }
            
            hideUserSelection() {
                vibrate([30]);
                hideSheet('userOverlay', 'userSheet');
            }
            
            selectUser(userName) {
                vibrate([50]);
                
                // Check if switching users during active session
                if (this.hasValidSession && this._user && this._user !== userName) {
                    const message = `Switching users will unload the current session (${this._location} on ${this._sessionDate}). Continue?`;
                    if (!confirm(message)) {
                        return;
                    }
                }
                
                // Overwrite localStorage with clean user object
                localStorage.setItem(`readingTracker_${userName}`, JSON.stringify({
                    user: userName,
                    sessionId: null,
                    location: '',
                    selectedDay: null,
                    price: 40,
                    readings: []
                }));
                
                this.user = userName;
                this.loadFromStorage();
                this.hideUserSelection();
            }
            
            addNewUser() {
                vibrate([50]);
                const userName = prompt('Enter new user name:');
                if (userName && userName.trim()) {
                    const trimmedName = userName.trim();
                    this.user = trimmedName;
                    this.hideUserSelection();
                }
            }
            
            handleCreateSession() {
                const createBtn = document.querySelector('.btn-create-session');
                if (createBtn.classList.contains('inactive')) {
                    showSnackbar('User, location and date are required', 'error');
                    vibrate([50]);
                } else {
                    this.createSession();
                }
            }

            async createSession() {
                if (!this.canCreateSession) {
                    showSnackbar('User, location and date are required', 'error');
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
                        .eq('user_name', this._user)
                        .eq('location', this._location)
                        .limit(1);
                    
                    if (data && data[0]) {
                        btn.textContent = originalText;
                        btn.classList.remove('loading');
                        const message = `${this._location} on ${this._sessionDate} already exists. Load existing session?`;
                        if (confirm(message)) {
                            await this.loadExistingSession(data[0]);
                        } else {
                            this._location = '';
                            this._sessionDate = '';
                            showSnackbar('Location and date must be unique', 'error');
                        }
                        return;
                    }
                    
                    const { data: newData } = await supabaseClient
                        .from('blacksheep_reading_tracker_sessions')
                        .insert([{
                            session_date: this._sessionDate,
                            user_name: this._user,
                            location: this._location,
                            reading_price: this._price,
                            readings: this._readings
                        }])
                        .select();
                    
                    if (newData && newData[0]) {
                        this._sessionId = newData[0].id;
                        this._readings = [];
                        this.collapseSettings();
                        showSnackbar('Session created successfully!');
                        
                        if ('serviceWorker' in navigator && Notification.permission === 'granted' && !isDevelopmentMode()) {
                            setTimeout(() => {
                                sendTestNotification();
                            }, 4 * 60 * 60 * 1000);
                        }
                    }
                } catch (error) {
                    showSnackbar('Database error, using offline mode', 'error');
                    registerBackgroundSync();
                } finally {
                    btn.textContent = originalText;
                    btn.classList.remove('loading');
                }
            }

            startNewSession() {
                vibrate([100, 50, 100]);
                if (confirm('Start a new session? This will unload all current data and start over.')) {
                    this.startOver();
                    window.timer.reset();
                    document.getElementById('timerInput').value = window.settings.get('defaultTimer');
                    showSnackbar('Ready to create new session', 'success');
                }
            }

            async showLoadSession() {
                if (!this._user) {
                    return;
                }
                
                vibrate([50]);
                const btn = document.querySelector('.btn-load-session');
                const originalText = btn.textContent;
                btn.innerHTML = '<span class="spinner inline"></span>Loading...';
                btn.classList.add('loading');
                
                try {
                    const { data, error } = await supabaseClient
                        .from('blacksheep_reading_tracker_sessions')
                        .select('*')
                        .eq('user_name', this._user)
                        .order('session_date', { ascending: false })
                        .order('created_at', { ascending: false });
                    
                    if (data && data.length > 0) {
                        const sessionsList = document.getElementById('sessionsList');
                        sessionsList.innerHTML = data.map(sessionData => {
                            const readingCount = sessionData.readings ? sessionData.readings.length : 0;
                            const date = new Date(normalizeDate(sessionData.session_date)).toLocaleDateString();
                            const dayOfWeek = new Date(normalizeDate(sessionData.session_date)).toLocaleDateString('en-US', { weekday: 'short' });
                            const baseTotal = sessionData.readings ? sessionData.readings.reduce((sum, r) => sum + (r.price || sessionData.reading_price || 0), 0) : 0;
                            const tipsTotal = sessionData.readings ? sessionData.readings.reduce((sum, reading) => sum + (reading.tip || 0), 0) : 0;
                            const grandTotal = baseTotal + tipsTotal;
                            return `
                                <div class="session-item" onclick="session.selectSession('${sessionData.id}')">
                                    <div class="session-info">${sessionData.location || 'No location'} - ${dayOfWeek} ${date}</div>
                                    <div class="session-details">${readingCount} readings  $${grandTotal.toFixed(2)}</div>
                                </div>
                            `;
                        }).join('');
                        showSheet('sessionOverlay', 'sessionSheet');
                    } else {
                        showSnackbar('No existing sessions found', 'error');
                    }
                } catch (error) {
                    showSnackbar('Failed to load sessions', 'error');
                } finally {
                    btn.textContent = originalText;
                    btn.classList.remove('loading');
                }
            }

            closeSessionSheet() {
                vibrate([30]);
                hideSheet('sessionOverlay', 'sessionSheet');
            }

            async selectSession(sessionId) {
                vibrate([50]);
                const sessionItem = event.target.closest('.session-item');
                const originalHTML = sessionItem.innerHTML;
                sessionItem.innerHTML = '<div class="session-info"><span class="spinner"></span>Loading session...</div>';
                sessionItem.style.pointerEvents = 'none';
                
                try {
                    const { data, error } = await supabaseClient
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
                this._user = sessionData.user_name || '';
                this._location = sessionData.location || '';
                this._sessionDate = sessionData.session_date || '';
                this._price = sessionData.reading_price || 40;
                this._readings = sessionData.readings || [];
                this._loading = false;
                
                // Update UI after loading
                this.updateReadingsList();
                this.updateTotals();
                this.updateUI();
                
                this.collapseSettings();
                showSnackbar(`Loaded session: ${sessionData.location} on ${sessionData.session_date}`);
            }

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
        }
