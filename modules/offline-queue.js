// OfflineQueue - Operation message queue for offline-first sync
// Replaces snapshot-based localStorage sync with FIFO operation queue

class OfflineQueue {
    constructor() {
        this._queue = [];
        this._userId = null;
        this._flushing = false;
    }

    // Valid operation types
    static VALID_TYPES = ['insert_reading', 'update_reading', 'delete_reading', 'update_session'];

    // Max queue size
    static MAX_QUEUE_SIZE = 500;

    /**
     * Sets active user and loads their existing queue from localStorage
     */
    setUserId(userId) {
        this._userId = userId;
        this._queue = [];

        if (!userId) return;

        const key = `offlineQueue_${userId}`;
        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    this._queue = parsed;
                }
            }
        } catch (e) {
            // Corrupt JSON or localStorage error — start with empty queue
            console.error('[OfflineQueue] Failed to load queue from localStorage:', e);
            this._queue = [];
        }
    }

    /**
     * Appends an Operation_Message to the queue with validation
     */
    enqueue(message) {
        // Validate message type
        if (!message || !OfflineQueue.VALID_TYPES.includes(message.type)) {
            console.error('[OfflineQueue] Invalid message type:', message?.type);
            return;
        }

        // Validate required fields per type
        if (!this._validateMessage(message)) {
            console.error('[OfflineQueue] Invalid message structure:', message);
            return;
        }

        // Enforce 500-message cap
        if (this._queue.length >= OfflineQueue.MAX_QUEUE_SIZE) {
            console.warn('[OfflineQueue] Queue at capacity (500 messages), skipping enqueue');
            return;
        }

        // Append to queue
        this._queue.push(message);

        // Persist to localStorage
        this._persist();

        // Dev mode logging
        if (Utils.isDevelopmentMode()) {
            console.log(`[OfflineQueue] enqueue: ${message.type}, queue length: ${this._queue.length}`);
        }

        // Show snackbar (2s auto-dismiss is default behavior)
        showSnackbar('Saved offline \u2014 will sync when connected', 'info');

        // Register background sync for later replay
        registerBackgroundSync();
    }

    /**
     * Processes queue FIFO, executing each message's Supabase call sequentially.
     * Stops on first error. Guards against concurrent flushes.
     */
    async flush() {
        // Guard against concurrent flushes
        if (this._flushing) return;
        if (this._queue.length === 0) return;

        this._flushing = true;
        const startCount = this._queue.length;

        // Dev mode logging
        if (Utils.isDevelopmentMode()) {
            console.log(`[OfflineQueue] flush-start: ${startCount} messages to process`);
        }

        // Show persistent "Syncing..." snackbar
        const syncingSnackbar = this._createPersistentSnackbar('Syncing offline changes...');

        let processed = 0;
        let error = null;

        try {
            while (this._queue.length > 0) {
                const message = this._queue[0];

                try {
                    await this._executeMessage(message);
                    // Success — remove from queue
                    this._queue.shift();
                    processed++;
                    this._persist();
                } catch (e) {
                    error = e;
                    // Log error details
                    console.error(
                        `[OfflineQueue] Flush error on ${message.type}:`, e.message,
                        `| ${this._queue.length} messages remaining`
                    );
                    break;
                }
            }
        } finally {
            this._flushing = false;

            // Remove persistent syncing snackbar
            this._removePersistentSnackbar(syncingSnackbar);

            if (error) {
                // Show failure snackbar (4s per requirement 4.3)
                this._showTimedSnackbar('Sync failed \u2014 will retry when connected', 'error', 4000);
                // Re-register background sync for retry
                registerBackgroundSync();
            } else if (processed > 0) {
                // Show success snackbar (2s default)
                showSnackbar('All changes synced', 'success');
                // Remove offline badge if device is online
                if (navigator.onLine) {
                    const indicator = document.getElementById('offlineIndicator');
                    if (indicator) {
                        indicator.style.display = 'none';
                    }
                }
            }

            // Dev mode logging
            if (Utils.isDevelopmentMode()) {
                console.log(`[OfflineQueue] flush-complete: ${processed} processed, ${this._queue.length} remaining`);
            }
        }
    }

    /**
     * Returns the number of pending messages
     */
    count() {
        return this._queue.length;
    }

    /**
     * Returns a shallow copy of the queue for debugging
     */
    peek() {
        return [...this._queue];
    }

    // --- Private methods ---

    /**
     * Validates message structure based on type
     */
    _validateMessage(message) {
        if (!message.createdAt) return false;

        switch (message.type) {
            case 'insert_reading':
                return !!(message.sessionId && message.payload);
            case 'update_reading':
                return !!(message.readingId && message.payload && message.payload.field !== undefined);
            case 'delete_reading':
                return !!message.readingId;
            case 'update_session':
                return !!(message.sessionId && message.payload);
            default:
                return false;
        }
    }

    /**
     * Persists queue to localStorage, handling quota errors
     */
    _persist() {
        if (!this._userId) return;

        const key = `offlineQueue_${this._userId}`;
        try {
            localStorage.setItem(key, JSON.stringify(this._queue));
        } catch (e) {
            // Quota error — queue remains in memory unchanged
            console.error('[OfflineQueue] localStorage quota error:', e);
        }
    }

    /**
     * Executes a single operation message against Supabase
     */
    async _executeMessage(message) {
        let result;

        switch (message.type) {
            case 'insert_reading':
                result = await supabaseClient
                    .from('blacksheep_reading_tracker_readings')
                    .insert([{
                        session_id: message.sessionId,
                        timestamp: message.payload.timestamp,
                        tip: message.payload.tip,
                        price: message.payload.price,
                        payment: message.payload.payment,
                        source: message.payload.source,
                        tz_offset: message.payload.tz_offset
                    }])
                    .select();
                break;

            case 'update_reading':
                result = await supabaseClient
                    .from('blacksheep_reading_tracker_readings')
                    .update({ [message.payload.field]: message.payload.value })
                    .eq('id', message.readingId);
                break;

            case 'delete_reading':
                result = await supabaseClient
                    .from('blacksheep_reading_tracker_readings')
                    .delete()
                    .eq('id', message.readingId);
                break;

            case 'update_session':
                result = await supabaseClient
                    .from('blacksheep_reading_tracker_sessions')
                    .update(message.payload)
                    .eq('id', message.sessionId);
                break;
        }

        // Check for Supabase error response
        if (result && result.error) {
            throw new Error(result.error.message || 'Supabase error');
        }

        return result;
    }

    /**
     * Creates a persistent snackbar that stays until manually removed
     */
    _createPersistentSnackbar(text) {
        const snackbar = document.createElement('div');
        snackbar.className = 'snackbar info';
        snackbar.textContent = text;
        snackbar.style.zIndex = '3000';
        document.body.appendChild(snackbar);
        return snackbar;
    }

    /**
     * Removes a persistent snackbar element
     */
    _removePersistentSnackbar(snackbar) {
        if (snackbar && snackbar.parentElement) {
            snackbar.remove();
        }
    }

    /**
     * Shows a timed snackbar with custom duration
     */
    _showTimedSnackbar(message, type, duration) {
        const snackbar = document.createElement('div');
        snackbar.className = `snackbar ${type}`;
        snackbar.textContent = message;
        snackbar.style.zIndex = '3000';
        document.body.appendChild(snackbar);

        setTimeout(() => {
            if (snackbar.parentElement) {
                snackbar.remove();
            }
        }, duration);
    }
}

// Expose as window.offlineQueue
window.offlineQueue = new OfflineQueue();
