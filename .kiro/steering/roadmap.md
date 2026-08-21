---
inclusion: manual
---

# Development Roadmap

## Current Version: v4.7.0

## Completed Phases

### Phase 1: ChatGPSY Quick Wins ✅
- Empty state with example queries
- Input feedback during send
- Mobile keyboard handling

### Phase 6: Auth & DB Normalization ✅ (v4.0.0)
- Google OAuth via Supabase Auth
- Normalized readings table (no more JSONB)
- Database views and functions (session_summaries, readings_with_context)
- V2 MCP tools (list_sessions_v2, list_readings_v2, get_session_details_v2, get_user_summary_v2)
- Role-based access control (admin/user)
- 223 tests passing

### Refactoring: Module Extraction ✅ (8/8 complete, index.html → 876 lines)
- All core classes extracted to modules/
- Remaining (optional): app-lifecycle functions (checkForUpdates, clearCache, background sync)

---

## Active / Upcoming Phases

### Phase 2: Conversation Enhancements (0/3)
- **#3 Message Persistence**: Store Bedrock sessionId in localStorage, restore on reload
- **#5 Error Handling**: User-friendly errors, retry button, timeout handling (30s)
- **#2 Typing Indicators**: ✅ Already implemented via showThinking()

### Phase 3: Advanced Features (3/4 complete)
- ✅ #8 Context Awareness — session data injected into prompts
- ✅ #13 Multi-Turn Context — Bedrock maintains via sessionId
- ⚠️ #6 Quick Actions — HTML/CSS exists, `updateQuickActions()` is a stub (not functional)
- **#7 Voice Input** — Web Speech API, microphone button (Low priority, Large effort)

### Phase 4: Data Visualization (0/2)
- **#9 Gpsy Chart Responses** — Gpsy returns structured JSON in a `<chart>` tag when data lends itself to a visual. Frontend intercepts, renders with Chart.js (single CDN script, canvas-based). Falls back to bedrock-table if JSON malformed. Gpsy still provides narrative alongside chart. Data comes from calculate_stats (already chart-ready shape with groups/labels).
  - **Prompt addition:** Tell Gpsy to emit `<chart type="bar|line|pie|stack" title="...">` with a flat JSON array body when grouped data has 3+ items or user explicitly asks for a visual. Only 4 chart types — keeps renderer simple.
  - **Frontend:** `<gpsy-chart>` web component (custom element, no Shadow DOM). gpsy-chat.js scans response for `<chart>` tags, replaces with `<gpsy-chart type="bar" data='[...]'>`. The custom element handles its own Chart.js canvas lifecycle (connectedCallback → render, disconnectedCallback → destroy). Encapsulated, no global state, works naturally with innerHTML insertion. Styled from main styles.css using element-tag namespace (`gpsy-chart .chart-container`, `gpsy-chart canvas`, `gpsy-chart .chart-title`) — no Shadow DOM needed since tag name provides sufficient isolation.
  - **Why web component:** Fits the vanilla JS stack. No framework needed. Self-contained rendering. Survives DOM manipulation (chat clearing, scrolling). Can lazy-load Chart.js on first use.
  - **JSON contract:** `[{"group":"Friday","total_earnings":507}, ...]` — flat array of objects, same shape as calculate_stats groups output. LLM doesn't need to learn Chart.js config.
  - **Fallback:** bedrock-table always emitted alongside for accessibility + if chart parsing fails.
  - **Rules for Gpsy:** Only emit chart when 3+ comparable items. Two items → sentence. Explicit "show me a chart" → always emit. Proactive on group_by results.
- **#10a Sparklines** — tiny inline trend indicators

### Phase 5: Polish & Refinement (0/4)
- **#12 Message Actions** — copy, share, regenerate buttons
- **#14 Conversation Management** — clear, export, history
- **#15 Accessibility** — screen reader, keyboard nav, ARIA labels, high contrast
- **#16 Performance** — lazy load messages, debounce, bundle size

### Phase 7: Gpsy Enhancements (0/5)
- Multi-user support in Gpsy (admin asks about other users)
- Conversation persistence (Bedrock sessionId in localStorage)
- Streaming responses (waiting on AWS support)
- Response quality audit
- **Tool schema cleanup: user_id required, user_name deprecated** — Flip all v2 tool schemas (list_sessions_v2, list_readings_v2, get_session_details_v2, get_user_summary_v2) to require `user_id` and make `user_name` optional fallback. Update server.js inputSchema, action-group-schema.json, and remove v1 dead code if still present. Small change, aligns with how calculate_stats already works and how the system prompt already instructs. Prevents breakage from user_name changes (amanda → amanda madden).

---

## Session UX Redesign (Pre-Implementation)

See `session-ux-spec` steering doc for full details. Key changes:
- Replace collapsible "Event Settings" panel with slim session bar
- Add hamburger menu (New Event, New Private Reading, Load, End Session)
- Support two session types: Event vs Private
- New/Edit bottom sheet for session creation
- DB change: add `type` column ('event'|'private')

---

## Version Strategy

- Stay on v4.x.x for: bug fixes, UI improvements, non-breaking features
- Bump to v5.0.0 when: schema breaks, localStorage format changes, public API removed

## Estimated Time Remaining: 23-30 hours
- Phase 2: 3-4h | Phase 4: 8-10h | Phase 5: 6-8h | Phase 7: 6-8h
