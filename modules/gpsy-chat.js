// ========================================
// GPSY CHAT MODULE
// ========================================

class GpsyChat {
    constructor() {
        this.messages = [];
        this.sessionId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
            ? crypto.randomUUID() 
            : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                const r = Math.random() * 16 | 0;
                return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
            });
        this.apiEndpoint = 'https://57h2jhw5tcjn35yzuitv4zjmfu0snuom.lambda-url.us-east-2.on.aws/';
    }
    
    addMessage(role, content) {
        this.messages.push({ role, content, timestamp: new Date() });
        this.renderMessages();
        this.updateQuickActions();
    }
    
    renderMessages(updateLastOnly = false) {
        const container = document.getElementById('gpsyMessages');
        
        // Show empty state if no messages
        if (this.messages.length < 2) {
            container.innerHTML = `
                <div class="gpsy-empty-state">
                    <div class="gpsy-avatar" style="width: 64px; height: 64px; margin: 0 auto 16px;">
                        <img src="logo192.png" alt="Gpsy">
                    </div>
                    <h3 style="margin: 0 0 8px; font-size: 18px; font-weight: 600;">Hi, I'm Gpsy. Ask me anything about your readings</h3>
                    <p style="margin: 0 0 24px; color: #666; font-size: 14px;">You can ask things like this for example:</p>
                    <div class="gpsy-example-queries">
                        <button class="gpsy-example-query" data-prompt="What were my best two locations?">What were my best two locations?</button>
                        <button class="gpsy-example-query" data-prompt="Show me my earnings this month">Show me my earnings this month</button>
                        <button class="gpsy-example-query" data-prompt="Which payment method do I use most?">Which payment method do I use most?</button>
                        <button class="gpsy-example-query" data-prompt="How did I do in Denver?">How did I do in Denver?</button>
                    </div>
                </div>
            `;
            
            // Attach click handlers to example queries
            container.querySelectorAll('.gpsy-example-query').forEach(btn => {
                btn.addEventListener('click', () => {
                    const prompt = btn.getAttribute('data-prompt');
                    document.getElementById('gpsy-input').value = prompt;
                    this.send();
                });
            });
            
            return;
        }
        
        if (updateLastOnly && this.messages.length > 0) {
            // Optimize: only update last message bubble
            const lastBubble = container.querySelector('.gpsy-message:last-child .gpsy-bubble');
            if (lastBubble) {
                const lastMsg = this.messages[this.messages.length - 1];
                lastBubble.innerHTML = this.formatContent(lastMsg.content);
                this.attachSuggestionHandlers(lastBubble);
                container.scrollTop = container.scrollHeight;
                return;
            }
        }
        
        // Full render
        container.innerHTML = this.messages.map(msg => {
            const isUser = msg.role === 'user';
            const avatar = isUser 
                ? '👤' 
                : `<img src="${window.APP_LOGO}" alt="Gpsy">`;
            return `
                <div class="gpsy-message ${isUser ? 'user' : 'assistant'}">
                    <div class="gpsy-avatar">${avatar}</div>
                    <div class="gpsy-bubble">${this.formatContent(msg.content)}</div>
                </div>
            `;
        }).join('');
        
        this.attachSuggestionHandlers(container);
        container.scrollTop = container.scrollHeight;
    }

    updateQuickActions() {
        // Quick actions not implemented yet - placeholder for future feature
    }
    
    attachSuggestionHandlers(element) {
        element.querySelectorAll('.bedrock-suggestion').forEach(btn => {
            btn.onclick = () => {
                const prompt = btn.getAttribute('data-prompt');
                if (prompt) {
                    document.getElementById('gpsy-input').value = prompt;
                    this.send();
                }
            };
        });
    }
    
    formatContent(content) {
        // Validate HTML before rendering to prevent DOM corruption
        const sanitized = this.validateHTML(content);
        return `<div style="max-height: 400px; overflow-y: auto;">${sanitized}</div>`;
    }
    
    validateHTML(html) {
        // Check for unclosed tags that could corrupt the DOM
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const errors = doc.querySelector('parsererror');
        
        if (errors) {
            console.error('Invalid HTML from Gpsy:', html);
            return `<div class="bedrock-response"><div class="bedrock-insight" style="color: #dc3545;">⚠️ Response contained invalid HTML and was blocked to prevent chat corruption. Please try again.</div></div>`;
        }
        
        // Check for common unclosed tags
        const openTags = (html.match(/<(table|tbody|thead|tr|td|th|ul|ol|li|div|span)(?:\s|>)/gi) || []).length;
        const closeTags = (html.match(/<\/(table|tbody|thead|tr|td|th|ul|ol|li|div|span)>/gi) || []).length;
        
        if (openTags !== closeTags) {
            console.error('Mismatched HTML tags from Gpsy. Open:', openTags, 'Close:', closeTags);
            return `<div class="bedrock-response"><div class="bedrock-insight" style="color: #dc3545;">⚠️ Response had mismatched HTML tags (${openTags} open, ${closeTags} close) and was blocked. Please try again.</div></div>`;
        }
        
        return html;
    }
    
    showThinking() {
        const container = document.getElementById('gpsyMessages');
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'gpsy-message assistant';
        thinkingDiv.id = 'gpsy-thinking';
        thinkingDiv.innerHTML = `
            <div class="gpsy-avatar thinking"><img src="${window.APP_LOGO}" alt="Gpsy"></div>
            <div class="gpsy-bubble gpsy-thinking">
                <span></span><span></span><span></span>
            </div>
        `;
        container.appendChild(thinkingDiv);
        container.scrollTop = container.scrollHeight;
    }
    
    hideThinking() {
        const thinking = document.getElementById('gpsy-thinking');
        if (thinking) thinking.remove();
    }
    
    open() {
        window.vibrate([50]);
        document.getElementById('gpsyOverlay').classList.add('open');
        document.getElementById('gpsyDrawer').classList.add('open');
        
        if (this.messages.length === 0) {
            this.renderMessages();
        }
        
        const input = document.getElementById('gpsy-input');
        input.addEventListener('focus', () => {
            setTimeout(() => input.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
        });
    }
    
    close() {
        window.vibrate([30]);
        document.getElementById('gpsyOverlay').classList.remove('open');
        document.getElementById('gpsyDrawer').classList.remove('open');
    }
    
    send() {
        window.vibrate([30]);
        
        const input = document.getElementById('gpsy-input');
        const sendBtn = document.getElementById('gpsy-send-btn');
        const message = input.value.trim();
        
        if (!message) return;
        
        input.value = '';
        input.disabled = true;
        sendBtn.disabled = true;
        
        this.sendMessage(message).finally(() => {
            input.disabled = false;
            sendBtn.disabled = false;
            input.focus();
        });
    }
    
    async sendMessage(userMessage) {
        if (!userMessage.trim()) return;
        
        if (!window.session.user) {
            this.addMessage('user', userMessage);
            this.addMessage('assistant', 'Please select a user first before asking questions.');
            return;
        }
        
        this.addMessage('user', userMessage);
        
        // Test keywords for UI testing
        const lowerMessage = userMessage.toLowerCase();
        
        if (lowerMessage === 'table') {
            const testTable = `<div class="bedrock-response">
                <div class="bedrock-section">Top 3 Locations by Earnings</div>
                <table class="bedrock-table">
                    <thead>
                        <tr>
                            <th class="bedrock-header">Location</th>
                            <th class="bedrock-header">Earnings</th>
                            <th class="bedrock-header">Readings</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="bedrock-cell">Va Beach BMSE Fall 25</td>
                            <td class="bedrock-cell bedrock-currency">$1,148.71</td>
                            <td class="bedrock-cell">19</td>
                        </tr>
                        <tr>
                            <td class="bedrock-cell">Cincinnati Fall 25</td>
                            <td class="bedrock-cell bedrock-currency">$365.00</td>
                            <td class="bedrock-cell">8</td>
                        </tr>
                        <tr>
                            <td class="bedrock-cell">Denver Fall 25</td>
                            <td class="bedrock-cell bedrock-currency">$337.50</td>
                            <td class="bedrock-cell">10</td>
                        </tr>
                    </tbody>
                </table>
                <div class="bedrock-suggestions">
                    <button class="bedrock-suggestion" data-prompt="Show me worst performing locations">Worst locations</button>
                    <button class="bedrock-suggestion" data-prompt="Break down by payment method">Payment methods</button>
                    <button class="bedrock-suggestion" data-prompt="Show me this month's total">Monthly total</button>
                </div>
            </div>`;
            this.addMessage('assistant', testTable);
            return;
        }
        
        if (lowerMessage === 'list') {
            const testList = `<div class="bedrock-response">
                <div class="bedrock-section">Your Recent Sessions</div>
                <ul class="bedrock-list">
                    <li class="bedrock-item">Cincinnati Fall 25 - 24 readings - $1,013.00</li>
                    <li class="bedrock-item">Denver Spring 25 - 15 readings - $678.50</li>
                    <li class="bedrock-item">Schaumburg Fall 25 - 18 readings - $942.25</li>
                </ul>
                <div class="bedrock-suggestions">
                    <button class="bedrock-suggestion" data-prompt="Show me earnings by location">Location breakdown</button>
                    <button class="bedrock-suggestion" data-prompt="What was my best session?">Best session</button>
                    <button class="bedrock-suggestion" data-prompt="Show total for this year">Year total</button>
                </div>
            </div>`;
            this.addMessage('assistant', testList);
            return;
        }
        
        if (lowerMessage === 'summary') {
            const testSummary = `<div class="bedrock-response">
                <div class="bedrock-insight">
                    You've completed <span class="bedrock-highlight">146</span> readings and earned <span class="bedrock-currency bedrock-total">$6,688.06</span> total.
                </div>
                <div class="bedrock-suggestions">
                    <button class="bedrock-suggestion" data-prompt="Show me breakdown by location">By location</button>
                    <button class="bedrock-suggestion" data-prompt="What were my top 3 locations?">Top 3 locations</button>
                    <button class="bedrock-suggestion" data-prompt="Show me earnings by month">Monthly breakdown</button>
                </div>
            </div>`;
            this.addMessage('assistant', testSummary);
            return;
        }
        
        this.showThinking();
        
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    sessionId: this.sessionId,
                    userName: window.session.user
                })
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const contentType = response.headers.get('content-type');
            const isStreaming = contentType?.includes('text/event-stream');
            
            this.hideThinking();
            
            if (isStreaming) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let fullResponse = '';
                let bubbleCreated = false;
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop();
                    
                    for (const line of lines) {
                        if (!line.trim() || !line.startsWith('data: ')) continue;
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.chunk) {
                                fullResponse += parsed.chunk;
                                
                                if (!bubbleCreated) {
                                    this.addMessage('assistant', fullResponse);
                                    bubbleCreated = true;
                                } else {
                                    const bubbles = document.querySelectorAll('.gpsy-bubble');
                                    const lastBubble = bubbles[bubbles.length - 1];
                                    if (lastBubble) {
                                        lastBubble.innerHTML = this.formatContent(fullResponse);
                                        this.attachSuggestionHandlers(lastBubble);
                                    }
                                }
                                document.getElementById('gpsyMessages').scrollTop = document.getElementById('gpsyMessages').scrollHeight;
                            }
                        } catch (e) {
                            console.error('SSE parse error:', e, 'Data:', data);
                        }
                    }
                }
                
                // Process remaining buffer
                if (buffer.trim() && buffer.startsWith('data: ')) {
                    const data = buffer.slice(6);
                    if (data !== '[DONE]') {
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.chunk) {
                                fullResponse += parsed.chunk;
                                
                                if (!bubbleCreated) {
                                    this.addMessage('assistant', fullResponse);
                                    bubbleCreated = true;
                                } else {
                                    const bubbles = document.querySelectorAll('.gpsy-bubble');
                                    const lastBubble = bubbles[bubbles.length - 1];
                                    if (lastBubble) {
                                        lastBubble.innerHTML = this.formatContent(fullResponse);
                                        this.attachSuggestionHandlers(lastBubble);
                                    }
                                }
                                document.getElementById('gpsyMessages').scrollTop = document.getElementById('gpsyMessages').scrollHeight;
                            }
                        } catch (e) {
                            console.error('SSE buffer parse error:', e, 'Data:', data);
                        }
                    }
                }
                
                // Update messages array with final content
                if (bubbleCreated) {
                    this.messages[this.messages.length - 1].content = fullResponse;
                }
            } else {
                const data = await response.json();
                this.addMessage('assistant', data.response || 'No response received');
            }
            
        } catch (error) {
            this.hideThinking();
            this.addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
        }
    }
}
