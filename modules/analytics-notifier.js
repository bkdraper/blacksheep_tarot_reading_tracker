class AnalyticsNotifier {
    constructor() {
        this.lastNotificationCheck = localStorage.getItem('lastNotificationCheck') || null;
    }
    
    async checkAndSendNotifications() {
        const today = new Date().toDateString();
        if (this.lastNotificationCheck === today) return;
        
        const sessions = await this.getRecentSessions();
        if (!sessions.length) return;
        
        this.checkDailySummary(sessions, today);
        this.checkWeekendGoals(sessions);
        this.checkBestDay(sessions);
        this.checkTipTrends(sessions);
        this.checkPeakTimes(sessions);
        
        this.lastNotificationCheck = today;
        localStorage.setItem('lastNotificationCheck', today);
    }
    
    async getRecentSessions() {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const { data } = await supabaseClient
                .from('blacksheep_reading_tracker_sessions')
                .select('*')
                .gte('session_date', thirtyDaysAgo.toISOString().split('T')[0])
                .order('session_date', { ascending: false });
            
            return data || [];
        } catch (error) {
            return [];
        }
    }
    
    checkDailySummary(sessions, today) {
        if (!window.settings.get('dailySummary')) return;
        
        const todaySessions = sessions.filter(s => 
            new Date(s.session_date).toDateString() === today && 
            s.readings && s.readings.length > 0
        );
        
        if (todaySessions.length === 0) return;
        
        const totalReadings = todaySessions.reduce((sum, s) => sum + (s.readings?.length || 0), 0);
        const totalEarnings = todaySessions.reduce((sum, s) => {
            const baseTotal = (s.readings?.length || 0) * (s.reading_price || 40);
            const tipsTotal = s.readings?.reduce((tipSum, r) => tipSum + (r.tip || 0), 0) || 0;
            return sum + baseTotal + tipsTotal;
        }, 0);
        
        if (totalReadings > 0) {
            this.sendNotification(
                '<i class="fas fa-chart-bar"></i> Daily Summary',
                `Today: ${totalReadings} readings, $${totalEarnings.toFixed(2)} earned!`
            );
        }
    }
    
    checkWeekendGoals(sessions) {
        if (!window.settings.get('weekendGoals')) return;
        
        const today = new Date();
        const isWeekend = today.getDay() === 0 || today.getDay() === 6;
        if (!isWeekend) return;
        
        const weekendSessions = sessions.filter(s => {
            const sessionDate = new Date(s.session_date);
            const dayOfWeek = sessionDate.getDay();
            return (dayOfWeek === 0 || dayOfWeek === 6) && s.readings && s.readings.length > 0;
        });
        
        if (weekendSessions.length === 0) return;
        
        const currentWeekend = weekendSessions.filter(s => {
            const sessionDate = new Date(s.session_date);
            const startOfWeekend = new Date(today);
            startOfWeekend.setDate(today.getDate() - (today.getDay() === 0 ? 1 : today.getDay() - 6));
            return sessionDate >= startOfWeekend;
        });
        
        const totalReadings = currentWeekend.reduce((sum, s) => sum + (s.readings?.length || 0), 0);
        const totalEarnings = currentWeekend.reduce((sum, s) => {
            const baseTotal = (s.readings?.length || 0) * (s.reading_price || 40);
            const tipsTotal = s.readings?.reduce((tipSum, r) => tipSum + (r.tip || 0), 0) || 0;
            return sum + baseTotal + tipsTotal;
        }, 0);
        
        if (totalEarnings >= 500 && totalEarnings < 1000) {
            this.sendNotification('<i class="fas fa-bullseye"></i> Weekend Goal', `$${totalEarnings.toFixed(2)} earned! $${(1000 - totalEarnings).toFixed(2)} to reach $1000 goal!`);
        } else if (totalEarnings >= 1000) {
            this.sendNotification('<i class="fas fa-bullseye"></i> Weekend Goal', `Amazing! $${totalEarnings.toFixed(2)} earned this weekend!`);
        }
        
        if (totalReadings >= 10 && totalReadings < 15) {
            this.sendNotification('<i class="fas fa-book"></i> Reading Goal', `${totalReadings} readings done! ${15 - totalReadings} more to reach 15!`);
        } else if (totalReadings >= 15) {
            this.sendNotification('<i class="fas fa-book"></i> Reading Goal', `Fantastic! ${totalReadings} readings this weekend!`);
        }
    }
    
    checkBestDay(sessions) {
        if (!window.settings.get('bestDay')) return;
        
        const dayEarnings = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        sessions.forEach(s => {
            if (!s.readings || s.readings.length === 0) return;
            const dayOfWeek = new Date(s.session_date).getDay();
            const baseTotal = s.readings.length * (s.reading_price || 40);
            const tipsTotal = s.readings.reduce((sum, r) => sum + (r.tip || 0), 0);
            dayEarnings[dayOfWeek].push(baseTotal + tipsTotal);
        });
        
        let bestDay = null;
        let bestAverage = 0;
        
        Object.keys(dayEarnings).forEach(day => {
            const earnings = dayEarnings[day];
            if (earnings.length >= 2) {
                const average = earnings.reduce((sum, e) => sum + e, 0) / earnings.length;
                if (average > bestAverage) {
                    bestAverage = average;
                    bestDay = parseInt(day);
                }
            }
        });
        
        if (bestDay !== null) {
            this.sendNotification(
                '<i class="fas fa-star"></i> Best Day Alert',
                `${dayNames[bestDay]} is your highest earning day - $${bestAverage.toFixed(2)} average!`
            );
        }
    }
    
    checkTipTrends(sessions) {
        if (!window.settings.get('tipTrends')) return;
        
        const recentSessions = sessions.slice(0, 10);
        const olderSessions = sessions.slice(10, 20);
        
        if (recentSessions.length < 3 || olderSessions.length < 3) return;
        
        const recentAvgTip = this.calculateAverageTip(recentSessions);
        const olderAvgTip = this.calculateAverageTip(olderSessions);
        
        if (olderAvgTip === 0) return;
        
        const change = ((recentAvgTip - olderAvgTip) / olderAvgTip) * 100;
        
        if (Math.abs(change) >= 15) {
            const trend = change > 0 ? 'increased' : 'decreased';
            this.sendNotification(
                '<i class="fas fa-chart-line"></i> Tip Trends',
                `Your average tip ${trend} ${Math.abs(change).toFixed(1)}% recently!`
            );
        }
    }
    
    checkPeakTimes(sessions) {
        if (!window.settings.get('peakTime')) return;
        
        const timeSlots = {};
        let totalReadings = 0;
        
        sessions.forEach(s => {
            if (!s.readings) return;
            s.readings.forEach(r => {
                totalReadings++;
                const hour = this.parseTimeToHour(r.timestamp);
                if (hour !== null) {
                    timeSlots[hour] = (timeSlots[hour] || 0) + 1;
                }
            });
        });
        
        if (totalReadings < 20) return;
        
        const timeSlotKeys = Object.keys(timeSlots);
        if (timeSlotKeys.length === 0) return;
        
        const peakHour = timeSlotKeys.reduce((peak, hour) => 
            timeSlots[hour] > (timeSlots[peak] || 0) ? hour : peak
        );
        
        const peakCount = timeSlots[peakHour];
        const peakPercentage = (peakCount / totalReadings) * 100;
        
        if (peakPercentage >= 20) {
            const timeRange = `${peakHour}:00-${parseInt(peakHour) + 1}:00`;
            this.sendNotification(
                '<i class="fas fa-clock"></i> Peak Time Alert',
                `${timeRange} is your busiest time - ${peakPercentage.toFixed(1)}% of readings!`
            );
        }
    }
    
    calculateAverageTip(sessions) {
        let totalTips = 0;
        let totalReadings = 0;
        
        sessions.forEach(s => {
            if (!s.readings) return;
            s.readings.forEach(r => {
                totalReadings++;
                totalTips += r.tip || 0;
            });
        });
        
        return totalReadings > 0 ? totalTips / totalReadings : 0;
    }
    
    parseTimeToHour(timestamp) {
        const match = timestamp.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!match) return null;
        
        let hour = parseInt(match[1]);
        const period = match[3].toUpperCase();
        
        if (period === 'PM' && hour !== 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;
        
        return hour;
    }
    
    sendNotification(title, body) {
        if ('serviceWorker' in navigator && Notification.permission === 'granted') {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, {
                    body: body,
                    icon: window.APP_LOGO,
                    badge: window.APP_LOGO,
                    tag: 'analytics-notification',
                    vibrate: [100, 50, 100]
                });
            });
        }
    }
}
