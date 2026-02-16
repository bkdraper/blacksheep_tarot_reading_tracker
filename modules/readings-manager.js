// ReadingsManager.js - Manages reading operations
// Extracted from index.html for better modularity

class ReadingsManager {
    constructor() {
        this.currentPaymentIndex = null;
        this.currentSourceIndex = null;
    }

    // Add reading
    async addReading() {
        if (!window.session.hasValidSession) {
            Utils.showSnackbar('Create session first', 'error');
            return;
        }
        
        Utils.vibrate([50]);
        const now = new Date();
        const timestamp = now.toISOString();
        window.session.addReading({ timestamp, tip: 0, price: window.session.price });
        
        // Trigger background backup after adding reading
        if (window.handleBackgroundBackup) {
            window.handleBackgroundBackup();
        }
    }

    // Remove reading
    removeReading() {
        Utils.vibrate([50]);
        if (window.session.readings.length > 0) {
            const lastReading = window.session.readings[window.session.readings.length - 1];
            if (confirm(`Delete the ${lastReading.timestamp} reading?`)) {
                Utils.vibrate([100, 50, 100]);
                window.session.removeReading(window.session.readings.length - 1);
            }
        }
    }

    // Delete specific reading
    deleteReading(index) {
        Utils.vibrate([50]);
        const reading = window.session.readings[index];
        const displayTime = window.session.formatTimestamp(reading.timestamp);
        if (confirm(`Delete the ${displayTime} reading?`)) {
            Utils.vibrate([100, 50, 100]);
            window.session.removeReading(index);
        }
    }

    // Payment sheet management
    openPaymentSheet(index) {
        Utils.vibrate([30]);
        this.currentPaymentIndex = index;
        
        const paymentOptions = document.getElementById('paymentOptions');
        const methods = window.settings.get('paymentMethods');
        paymentOptions.innerHTML = methods.map(method => 
            `<button class="payment-option btn btn-ghost btn-small" onclick="readingsManager.selectPaymentMethod('${method}')">${method}</button>`
        ).join('') + '<button class="payment-option btn btn-ghost btn-small" onclick="readingsManager.selectCustomPayment()">Other</button>';
        
        Utils.showSheet('paymentOverlay', 'paymentSheet');
    }

    closePaymentSheet() {
        Utils.vibrate([30]);
        Utils.hideSheet('paymentOverlay', 'paymentSheet');
        this.currentPaymentIndex = null;
    }

    selectPaymentMethod(method) {
        Utils.vibrate([30]);
        if (this.currentPaymentIndex !== null) {
            window.session.updateReading(this.currentPaymentIndex, 'payment', method);
            this.closePaymentSheet();
        }
    }

    selectCustomPayment() {
        Utils.vibrate([30]);
        const currentValue = this.currentPaymentIndex !== null && window.session.readings[this.currentPaymentIndex].payment ? 
            window.session.readings[this.currentPaymentIndex].payment : '';
        const newValue = prompt('Enter payment method:', currentValue);
        if (newValue !== null && newValue.trim()) {
            window.session.updateReading(this.currentPaymentIndex, 'payment', newValue.trim());
            this.closePaymentSheet();
        }
    }

    // Source sheet management
    openSourceSheet(index) {
        Utils.vibrate([30]);
        this.currentSourceIndex = index;
        
        const sourceOptions = document.getElementById('sourceOptions');
        const sources = window.settings.get('sources');
        sourceOptions.innerHTML = sources.map(source => 
            `<button class="payment-option btn btn-ghost btn-small" onclick="readingsManager.selectSource('${source}')">${source}</button>`
        ).join('') + '<button class="payment-option btn btn-ghost btn-small" onclick="readingsManager.selectCustomSource()">Other</button>';
        
        Utils.showSheet('sourceOverlay', 'sourceSheet');
    }

    closeSourceSheet() {
        Utils.vibrate([30]);
        Utils.hideSheet('sourceOverlay', 'sourceSheet');
        this.currentSourceIndex = null;
    }

    selectSource(source) {
        Utils.vibrate([30]);
        if (this.currentSourceIndex !== null) {
            window.session.updateReading(this.currentSourceIndex, 'source', source);
            this.closeSourceSheet();
        }
    }

    selectCustomSource() {
        Utils.vibrate([30]);
        const currentValue = this.currentSourceIndex !== null && window.session.readings[this.currentSourceIndex].source ? 
            window.session.readings[this.currentSourceIndex].source : '';
        const newValue = prompt('Enter source:', currentValue);
        if (newValue !== null && newValue.trim()) {
            window.session.updateReading(this.currentSourceIndex, 'source', newValue.trim());
            this.closeSourceSheet();
        }
    }
}
