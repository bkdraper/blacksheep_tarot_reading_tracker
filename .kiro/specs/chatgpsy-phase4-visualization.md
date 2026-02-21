# ChatGPSY Phase 4: Data Visualization

## Overview
Add inline charts and sparklines to ChatGPSY responses for visual data representation.

## Context
- ChatGPSY currently returns text and tables
- Mobile-first design requires touch-optimized charts
- Apache ECharts chosen for best mobile UX
- Charts render inside chat bubbles

## Requirements

### #9: Inline Charts
**Priority**: Medium | **Effort**: Large

Integrate Apache ECharts for data visualization.

**Acceptance Criteria**:
- Charts render in chat bubbles
- Touch interactions work smoothly on mobile
- Support bar, line, and pie charts
- Charts are responsive to screen size
- Dark mode support
- Charts don't break on small screens

**Chart Types**:
- Bar: Location comparisons, payment method breakdown
- Line: Earnings over time, trend analysis
- Pie: Source distribution, payment method split

**Technical Notes**:
- Library: Apache ECharts (300KB / 100KB gzipped)
- CDN: `https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js`
- Add method: `renderChart(data, type, options)`
- Charts must be mobile-optimized (touch targets, font sizes)
- Use ECharts mobile theme

**Implementation Details**:
```javascript
// Chart container in message
<div class="bedrock-chart" id="chart-${timestamp}"></div>

// Initialize chart
const chart = echarts.init(container, theme);
chart.setOption({
  // Mobile-optimized options
  grid: { left: 40, right: 20, top: 40, bottom: 40 },
  tooltip: { trigger: 'axis' },
  // ... chart config
});
```

**Bedrock Response Format**:
Agent must return chart data in structured format:
```json
{
  "type": "chart",
  "chartType": "bar",
  "data": {
    "labels": ["Denver", "Boulder", "Fort Collins"],
    "values": [1250, 980, 750]
  },
  "title": "Top Locations by Earnings"
}
```

### #10a: Sparklines
**Priority**: Low | **Effort**: Medium

Add tiny inline trend indicators.

**Acceptance Criteria**:
- Show earnings trends in text responses
- Lightweight implementation (no heavy library)
- Inline with text (not separate element)
- Up/down arrows with percentage
- Color-coded (green up, red down)

**Examples**:
- "Denver earnings: $1,250 ↑ 15%"
- "This week: $450 ↓ 8%"
- "Average tip: $12 ↑ 22%"

**Technical Notes**:
- Use SVG for sparkline graphics
- Add method: `renderSparkline(values)`
- CSS classes: `.sparkline-up`, `.sparkline-down`
- Max width: 60px
- Height: 20px

**Implementation**:
```javascript
// Sparkline SVG
<svg class="sparkline" width="60" height="20">
  <polyline points="..." stroke="#10b981" fill="none"/>
</svg>
<span class="sparkline-change up">↑ 15%</span>
```

## Implementation Plan

### Step 1: ECharts Integration
1. Add ECharts CDN to index.html
2. Create chart rendering method in GpsyChat
3. Define mobile-optimized chart options
4. Test on various screen sizes
5. Add dark mode theme support

### Step 2: Bedrock Response Handling
1. Update Lambda to detect chart requests
2. Format chart data in structured JSON
3. Update GpsyChat to parse chart responses
4. Render charts in chat bubbles
5. Test with various chart types

### Step 3: Sparklines
1. Create SVG sparkline generator
2. Add sparkline CSS styles
3. Integrate with text responses
4. Test inline rendering
5. Add color coding

### Step 4: Mobile Optimization
1. Test touch interactions
2. Verify font sizes (16px+ for labels)
3. Test on small screens (320px width)
4. Optimize chart padding/margins
5. Test dark mode

### Step 5: Testing
- Test all chart types (bar, line, pie)
- Test on various screen sizes
- Test touch interactions
- Test dark mode
- Test with long labels
- Verify performance (no lag)

## Files to Modify

### Frontend
- `index.html` - Add ECharts CDN
- `modules/gpsy-chat.js` - Add chart rendering methods
- `styles.css` - Add chart and sparkline styles

### Backend (Lambda)
- `mcp-server/bedrock-handler.js` - Format chart data
- `mcp-server/bedrock-agent-system-prompt.txt` - Add chart instructions
- Note: Both MCP and Bedrock lambdas share tool logic, only response format differs

## Technical Specifications

### ECharts Mobile Options
```javascript
{
  grid: {
    left: 40,
    right: 20,
    top: 40,
    bottom: 40,
    containLabel: true
  },
  tooltip: {
    trigger: 'axis',
    confine: true  // Keep tooltip in container
  },
  xAxis: {
    axisLabel: {
      fontSize: 12,
      rotate: 45  // Prevent label overlap
    }
  },
  yAxis: {
    axisLabel: { fontSize: 12 }
  }
}
```

### Chart Sizing
- Container width: 100% (responsive)
- Min height: 200px
- Max height: 400px
- Aspect ratio: 16:9 for landscape data

### Dark Mode Colors
- Background: `#1e293b` (slate-800)
- Text: `#e2e8f0` (slate-200)
- Grid: `#334155` (slate-700)
- Primary: `#8b5cf6` (purple-500)

## Success Metrics
- Charts render without lag on mobile
- Touch interactions feel natural
- Users engage with visual data
- No layout breaks on small screens
- Dark mode charts are readable

## Dependencies
- Phase 3 (context awareness) recommended first
- ECharts CDN availability
- Lambda access for response formatting

## Risks
- ECharts bundle size (300KB) may slow initial load
- Complex charts may not fit on small screens
- Touch targets may be too small for precise interaction
- Chart data formatting errors could break rendering

## Alternatives Considered
- Chart.js: Limited features, less mobile polish
- uPlot: Lightweight but less visual polish
- D3.js: Too complex, large bundle size
- Canvas API: Too much custom code

## References
- ROADMAP.md: Phase 4 details
- Apache ECharts docs: https://echarts.apache.org/
- Mobile optimization guide: https://echarts.apache.org/handbook/en/how-to/mobile
