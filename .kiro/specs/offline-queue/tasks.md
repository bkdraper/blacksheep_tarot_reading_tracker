# Implementation Plan: Offline Queue

## Overview

Replace the snapshot-based localStorage sync with an operation-message queue. Create `modules/offline-queue.js` as a standalone module, wire it into SessionStore error paths, remove legacy sync methods, update index.html handlers, and add UX indicators. Implementation is vanilla JS with Jest tests (all Supabase mocked).

## Tasks

- [x] 1. Create the OfflineQueue module
  - [x] 1.1 Create `modules/offline-queue.js` with queue storage and core API
    - Implement OfflineQueue class with `_queue`, `_userId`, `_flushing` internal state
    - Implement `setUserId(userId)` — sets active user, loads existing queue from `localStorage` key `offlineQueue_{userId}`, handles missing/corrupt JSON gracefully
    - Implement `enqueue(message)` — appends Operation_Message with validation, persists to localStorage, enforces 500-message cap, handles quota errors, shows snackbar "Saved offline — will sync when connected" (2s auto-dismiss), registers background sync
    - Implement `flush()` — processes queue FIFO, executes each message's Supabase call sequentially, removes successful messages, stops on first error, shows snackbar states (syncing/success/failure), re-registers background sync on error, guards against concurrent flushes with `_flushing` flag
    - Implement `count()` — returns `_queue.length`
    - Implement `peek()` — returns shallow copy of `_queue` array
    - Implement dev-mode logging with `[OfflineQueue]` prefix for enqueue/flush-start/flush-complete events
    - Expose as `window.offlineQueue`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2. Add OfflineQueue script tag to index.html
  - [x] 2.1 Add `<script src="modules/offline-queue.js"></script>` between `utils.js` and `auth.js`
    - Must load after utils.js (for snackbar helpers) and before auth.js/session-store.js
    - _Requirements: 1.9_

- [x] 3. Wire OfflineQueue into SessionStore error paths
  - [x] 3.1 Modify `addReading` to enqueue `insert_reading` on Supabase error
    - Replace `registerBackgroundSync()` call with `window.offlineQueue.enqueue()` passing `{ type: 'insert_reading', createdAt: new Date().toISOString(), sessionId: this._sessionId, payload: { timestamp, tip, price, payment, source } }`
    - _Requirements: 2.1, 2.5_

  - [x] 3.2 Modify `removeReading` to enqueue `delete_reading` on Supabase error
    - Replace `registerBackgroundSync()` call with `window.offlineQueue.enqueue()` passing `{ type: 'delete_reading', createdAt: new Date().toISOString(), readingId: reading.id }`
    - _Requirements: 2.3, 2.5_

  - [x] 3.3 Modify `updateReading` to enqueue `update_reading` on Supabase error
    - Replace `registerBackgroundSync()` call with `window.offlineQueue.enqueue()` passing `{ type: 'update_reading', createdAt: new Date().toISOString(), readingId: reading.id, payload: { field, value } }`
    - _Requirements: 2.2, 2.5_

  - [x] 3.4 Modify `save` to enqueue `update_session` on Supabase error
    - Replace `registerBackgroundSync()` call with `window.offlineQueue.enqueue()` passing `{ type: 'update_session', createdAt: new Date().toISOString(), sessionId: this._sessionId, payload: { location, session_date, reading_price, format } }` containing only changed fields
    - Remove `this.saveToLocalStorage()` call from `save()`
    - _Requirements: 2.4, 2.5, 2.6, 2.7_

- [x] 4. Remove legacy sync infrastructure from SessionStore
  - [x] 4.1 Remove `saveToLocalStorage`, `loadFromStorage`, `debouncedSaveToLocalStorage`, and `promptRestoreSession` methods
    - Delete the method bodies entirely from session-store.js
    - Remove `this.saveToLocalStorage()` calls from `addReading`, `removeReading`, and anywhere else they appear
    - Remove `this.debouncedSaveToLocalStorage()` call from `updateReading`
    - Verify `clearUserData()` still removes `readingTracker_${userId}` and functions correctly
    - _Requirements: 5.1, 5.2, 5.3, 5.6, 5.7_

- [x] 5. Remove legacy sync infrastructure from index.html
  - [x] 5.1 Remove `handleBackgroundSync` function and update service worker message handler
    - Remove the entire `handleBackgroundSync()` function
    - In the service worker message listener, change `SYNC_READINGS` handler to call `window.offlineQueue.flush()`
    - Remove `BACKUP_READINGS` handler entirely
    - _Requirements: 5.4, 3.2_

  - [x] 5.2 Remove `handleBackgroundBackup` function and visibilitychange listener
    - Remove the entire `handleBackgroundBackup()` function
    - Remove the `visibilitychange` event listener that triggers background backup
    - _Requirements: 5.4, 5.5_

  - [x] 5.3 Update `updateOnlineStatus` to use OfflineQueue flush
    - Replace `handleBackgroundSync()` call in the online branch with `window.offlineQueue.flush()`
    - Keep existing offline badge display behavior
    - _Requirements: 3.1, 6.1, 6.6_

  - [x] 5.4 Wire post-auth initialization to OfflineQueue
    - After `checkAuth` succeeds, call `window.offlineQueue.setUserId(auth.userId)` then `window.offlineQueue.flush()`
    - _Requirements: 3.3_

- [x] 6. Checkpoint - Verify manual functionality
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Update existing tests and write new test suites
  - [x] 7.1 Update `__tests__/session-store.test.js` for offline queue integration
    - Remove tests referencing `saveToLocalStorage`, `loadFromStorage`, `debouncedSaveToLocalStorage`, `promptRestoreSession`
    - Add `window.offlineQueue = { enqueue: jest.fn(), flush: jest.fn(), count: jest.fn(), peek: jest.fn(), setUserId: jest.fn() }` to test setup
    - Add tests verifying `addReading` calls `window.offlineQueue.enqueue()` with correct `insert_reading` message on Supabase error
    - Add tests verifying `removeReading` calls enqueue with `delete_reading` message on error
    - Add tests verifying `updateReading` calls enqueue with `update_reading` message on error
    - Add tests verifying `save` calls enqueue with `update_session` message on error
    - Verify `clearUserData` still removes `readingTracker_${userId}`
    - Replace `global.registerBackgroundSync` mock with `window.offlineQueue` mock
    - _Requirements: 5.8, 2.1, 2.2, 2.3, 2.4, 5.7_

  - [x] 7.2 Create `__tests__/offline-queue.test.js` unit tests for OfflineQueue module
    - Test enqueue: messages appended, localStorage updated, insertion order preserved
    - Test enqueue edge cases: quota error handling, 500-message cap, warning logged
    - Test flush happy path: all messages processed FIFO, localStorage cleared
    - Test flush partial failure: first N succeed then error → only first N removed
    - Test flush concurrency guard: second flush while first in progress returns immediately
    - Test flush re-registers background sync on error
    - Test `count()` and `peek()` return correct values, `peek()` returns copy not reference
    - Test `setUserId`: loads existing queue from localStorage, handles missing/corrupt data
    - Test dev-mode logging: verify console.log calls with `[OfflineQueue]` prefix
    - Test user isolation: switching userId loads independent queue
    - Mock supabaseClient, localStorage, navigator.onLine
    - _Requirements: 1.2, 1.4, 1.10, 1.11, 2.6, 2.7, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.5, 7.1, 7.2, 7.4, 7.5_

  - [x] 7.3 Create `__tests__/offline-queue-integration.test.js` for flush triggers and UX
    - Test online event triggers `window.offlineQueue.flush()`
    - Test service worker `SYNC_READINGS` message triggers flush
    - Test post-auth calls `setUserId` then `flush`
    - Test snackbar notifications: correct messages and durations for enqueue, flush start, flush success, flush failure
    - Test offline badge removal on successful flush when online
    - _Requirements: 3.1, 3.2, 3.3, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 7.4 Update other test files that reference `registerBackgroundSync`
    - Update `__tests__/integration.test.js`: replace `registerBackgroundSync` mock with `window.offlineQueue` mock, update assertions
    - Update `__tests__/hamburger-menu.test.js`: replace global mock
    - Update `__tests__/gpsy-chat.test.js`: replace global mock
    - Update `__tests__/app-mode-behavior.test.js`: replace global mock
    - _Requirements: 5.8_

- [x] 8. Final checkpoint - Ensure full test suite passes
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All Supabase calls are mocked in tests — no live DB interactions per project rules
- No property-based testing — example-based Jest tests only per steering rules
- Version bump required after implementation (update index.html meta, README.md, development-rules.md)
- The `registerBackgroundSync` function in index.html is reused internally by OfflineQueue for re-registering sync on flush error — do NOT delete it, only remove calls from SessionStore
- Service worker itself (`serviceWorker.js`) requires no changes — it already posts `SYNC_READINGS` messages

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "3.2", "3.3", "3.4"] },
    { "id": 2, "tasks": ["4.1", "5.1", "5.2"] },
    { "id": 3, "tasks": ["5.3", "5.4"] },
    { "id": 4, "tasks": ["7.1", "7.2", "7.3", "7.4"] }
  ]
}
```
