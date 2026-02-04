// Timer.js - Canvas-based countdown timer with audio alarms
// Extracted from index.html for better modularity

class Timer {
    constructor() {
        this._seconds = 900; // 15 minutes default
        this._totalSeconds = 900;
        this._isRunning = false;
        this._isBlinking = false;
        this._interval = null;
        this._alarmInterval = null;
        this._canvasAnimationId = null;
        this._wakeLock = null;
        this._silentAudio = null;
        this._canvas = null;
        this._ctx = null;
        this._audioContext = null;
    }

    // Getters
    get seconds() { return this._seconds; }
    get totalSeconds() { return this._totalSeconds; }
    get isRunning() { return this._isRunning; }
    get isBlinking() { return this._isBlinking; }
    get canvas() { return this._canvas; }
    get ctx() { return this._ctx; }

    // Setters
    set seconds(value) {
        this._seconds = value;
        this.updateDisplay();
    }

    // Methods
    start() {
        vibrate([80]);
        if (!this._isRunning && this._seconds > 0) {
            this._isRunning = true;
            this._totalSeconds = this._seconds;
            this.stopBlinking();
            this.requestWakeLock();
            
            if (this._canvas) {
                this.drawTimer();
            }
            
            this._interval = setInterval(() => {
                this._seconds--;
                this.updateDisplay();
                
                if (this._seconds === 10) {
                    this.startWarningBlink();
                }
                
                if (this._seconds <= 0) {
                    this.pause();
                    this.stopWarningBlink();
                    this.startBlinking();
                    this.startAlarm();
                    this.sendTimerNotification();
                }
            }, 1000);
        }
    }

    pause() {
        vibrate([50]);
        this._isRunning = false;
        this.releaseWakeLock();
        
        if (this._canvasAnimationId) {
            cancelAnimationFrame(this._canvasAnimationId);
            this._canvasAnimationId = null;
        }
        
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
        }
    }

    reset(showToast = false) {
        vibrate([100]);
        this.pause();
        this.stopBlinking();
        this.stopWarningBlink();
        this.stopAlarm();
        this.releaseWakeLock();

        const minutes = parseInt(document.getElementById('timerInput').value);
        this._seconds = minutes * 60;
        this._totalSeconds = this._seconds;
        this.updateDisplay();
        
        if (showToast) {
            showSnackbar(`Timer reset to ${minutes} minutes`, 'success');
        }
    }

    adjustTime(minutes) {
        vibrate([30]);
        if (!this._isRunning) {
            const input = document.getElementById('timerInput');
            let newValue = parseInt(input.value) + minutes;
            if (newValue < 0) newValue = 0;
            if (newValue > 99) newValue = 99;
            input.value = newValue;
            this._seconds = newValue * 60;
            this.updateDisplay();
        }
    }

    updateDisplay() {
        const minutes = Math.floor(this._seconds / 60);
        const seconds = this._seconds % 60;
        document.getElementById('timerDisplay').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (this._canvas) {
            this.drawTimer();
        }
    }

    startBlinking() {
        this._isBlinking = true;
        document.getElementById('timerDisplay').classList.add('blink');
    }

    stopBlinking() {
        this._isBlinking = false;
        document.getElementById('timerDisplay').classList.remove('blink');
    }

    startWarningBlink() {
        document.getElementById('timerDisplay').classList.add('warning');
    }

    stopWarningBlink() {
        document.getElementById('timerDisplay').classList.remove('warning');
    }

    startAlarm() {
        this.playAlarmSequence();
        this._alarmInterval = setInterval(() => {
            this.playAlarmSequence();
        }, 1500);
    }

    stopAlarm() {
        if (this._alarmInterval) {
            clearInterval(this._alarmInterval);
            this._alarmInterval = null;
        }
    }

    async requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                this._wakeLock = await navigator.wakeLock.request('screen');
            }
        } catch (err) {}
        
        try {
            this.initAudio();
            const buffer = this._audioContext.createBuffer(1, 1, 22050);
            this._silentAudio = this._audioContext.createBufferSource();
            this._silentAudio.buffer = buffer;
            this._silentAudio.loop = true;
            const gainNode = this._audioContext.createGain();
            this._silentAudio.connect(gainNode);
            gainNode.connect(this._audioContext.destination);
            gainNode.gain.setValueAtTime(0.001, this._audioContext.currentTime);
            this._silentAudio.start();
        } catch (audioErr) {}
    }

    releaseWakeLock() {
        if (this._wakeLock) {
            this._wakeLock.release();
            this._wakeLock = null;
        }
        if (this._silentAudio) {
            this._silentAudio.stop();
            this._silentAudio = null;
        }
    }

    initCanvas() {
        this._canvas = document.getElementById('timerCanvas');
        this._ctx = this._canvas.getContext('2d');
        this._ctx.imageSmoothingEnabled = false;
        this.drawTimer();
    }

    drawTimer() {
        if (!this._ctx) return;
        
        const centerX = 150;
        const centerY = 150;
        const radius = 120;
        
        this._ctx.clearRect(0, 0, 300, 300);
        
        // Background circle
        this._ctx.beginPath();
        this._ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this._ctx.strokeStyle = '#e0e0e0';
        this._ctx.lineWidth = 12;
        this._ctx.stroke();
        
        // Progress arc
        if (this._isRunning) {
            const progress = this._seconds / this._totalSeconds;
            if (progress > 0) {
                this._ctx.beginPath();
                this._ctx.arc(centerX, centerY, radius, -Math.PI/2, -Math.PI/2 + (2 * Math.PI * progress));
                
                const red = Math.round(220 * (1 - progress) + 40 * progress);
                const green = Math.round(167 * progress + 53 * (1 - progress));
                const blue = Math.round(69 * (1 - progress));
                this._ctx.strokeStyle = `rgb(${red}, ${green}, ${blue})`;
                
                this._ctx.lineWidth = 12;
                this._ctx.lineCap = 'round';
                this._ctx.stroke();
            }
        } else {
            this._ctx.beginPath();
            this._ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            this._ctx.strokeStyle = '#28a745';
            this._ctx.lineWidth = 12;
            this._ctx.stroke();
        }
        
        // Time text
        const minutes = Math.floor(this._seconds / 60);
        const seconds = this._seconds % 60;
        const timeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (this._isRunning) {
            const progress = this._seconds / this._totalSeconds;
            const red = Math.round(51 * (1 - progress) + 220 * (1 - progress));
            const green = Math.round(51 * progress + 53 * (1 - progress));
            const blue = Math.round(51 * (1 - progress));
            this._ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        } else {
            this._ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#f4e4a6' : '#333';
        }
        this._ctx.font = 'bold 72px monospace';
        this._ctx.textAlign = 'center';
        this._ctx.textBaseline = 'middle';
        this._ctx.fillText(timeText, centerX, centerY);
        
        if (this._isRunning) {
            this._canvasAnimationId = requestAnimationFrame(() => this.drawTimer());
        }
    }

    // Timer notification
    sendTimerNotification() {
        if (!window.settings.get('timerNotifications')) return;
        
        if ('serviceWorker' in navigator && Notification.permission === 'granted') {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification('🔔 Timer Finished!', {
                    body: 'Your tarot reading timer has expired.',
                    icon: window.APP_LOGO,
                    badge: window.APP_LOGO,
                    tag: 'timer-expired',
                    requireInteraction: true,
                    vibrate: [200, 100, 200, 100, 200],
                    actions: [
                        {
                            action: 'reset-timer',
                            title: 'Reset Timer',
                            icon: window.APP_LOGO
                        }
                    ]
                }).then(() => {
                    if (isDevelopmentMode()) {
                        setTimeout(() => {
                            try {
                                new Notification('🔔 Timer Finished!', {
                                    body: 'Your tarot reading timer has expired.',
                                    icon: window.APP_LOGO
                                });
                            } catch (err) {}
                        }, 100);
                    }
                }).catch(() => {});
            }).catch(() => {});
        }
    }

    // Timer reset from notification
    handleTimerReset() {
        this.reset(true);
    }

    // Audio functions
    initAudio() {
        if (!this._audioContext) {
            this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playBeep(frequency = 1000, duration = 0.15) {
        if (!window.settings.get('sound')) return;
        
        this.initAudio();
        const oscillator = this._audioContext.createOscillator();
        const gainNode = this._audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this._audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, this._audioContext.currentTime);
        oscillator.type = 'square';
        
        gainNode.gain.setValueAtTime(0.3, this._audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this._audioContext.currentTime + duration);
        
        oscillator.start(this._audioContext.currentTime);
        oscillator.stop(this._audioContext.currentTime + duration);
    }

    playAlarmSequence() {
        if (!window.settings.get('sound')) return;
        
        this.playBeep(1000, 0.1);
        setTimeout(() => this.playBeep(1000, 0.1), 150);
        setTimeout(() => this.playBeep(1000, 0.1), 300);
        setTimeout(() => this.playBeep(1000, 0.4), 600);
    }
}
