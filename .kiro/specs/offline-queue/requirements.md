# Requirements Document

## Introduction

Replace the current snapshot-based localStorage sync (full session state saved on every change, reconciled via background sync) with a proper operations queue. When Supabase calls fail or the device is offline, operations are queued as typed messages in localStorage and replayed in FIFO order when connectivity returns. This eliminates the fragile diff/reconcile logic and makes offline behavior predictable and debuggable.

## Glossary

- **Queue**: A FIFO localStorage array holding typed operation messages that failed to reach Supabase
- **OfflineQueue**: The standalone module (`modules/offline-queue.js`) that owns all queue storage, enqueue, flush, retry, and inspection logic; exposed globally as `window.offlineQueue`
- **Operation_Message**: A JSON object representing a single Supabase mutation (insert, update, or delete) with a type, timestamp, and payload
- **Flush**: The process of replaying all queued Operation_Messages to Supabase in chronological order
- **Flush_Trigger**: An event that initiates a Flush — specifically the browser 'online' event, the service worker Background Sync event, or app load after authentication
- **Session_Store**: The existing SessionStore class that manages session state, readings, and cloud persistence; acts as the producer of Operation_Messages by calling OfflineQueue on mutation failure
- **Supabase_Client**: The global `supabaseClient` instance used for all database operations

## Requirements

### Requirement 1: Queue Storage and Message Structure

**User Story:** As a reader using the app at a festival with spotty internet, I want failed database operations to be stored locally in a structured format, so that they can be replayed reliably when connectivity returns.

#### Acceptance Criteria

1. THE OfflineQueue SHALL be implemented as a standalone module at `modules/offline-queue.js`, separate from Session_Store, responsible for all queue storage, enqueue, flush, retry, and inspection logic
2. THE OfflineQueue SHALL store Operation_Messages as a JSON array in localStorage under the key `offlineQueue_{userId}`, where `{userId}` is the authenticated user's ID from `window.auth.userId`
3. IF a Supabase mutation throws an error or `navigator.onLine` is false at the time of the operation, THEN THE Session_Store SHALL call `window.offlineQueue.enqueue(message)` to append an Operation_Message to the Queue
3. THE Operation_Message SHALL contain a `type` field with one of: `insert_reading`, `update_reading`, `delete_reading`, `update_session`
4. THE Operation_Message SHALL contain a `createdAt` field with an ISO 8601 timestamp (e.g., `2025-06-01T14:30:00.000Z`) representing when the operation was originally attempted
5. WHEN the type is `insert_reading`, THE Operation_Message SHALL contain `sessionId` and a `payload` object with fields: `timestamp` (ISO 8601 string), `tip` (number or 0), `price` (number or null), `payment` (string or null), `source` (string or null)
6. WHEN the type is `update_reading`, THE Operation_Message SHALL contain `readingId` and a `payload` object with fields: `field` (string matching the column name being updated) and `value` (the new value for that column)
7. WHEN the type is `delete_reading`, THE Operation_Message SHALL contain `readingId` (the UUID of the reading to delete)
8. WHEN the type is `update_session`, THE Operation_Message SHALL contain `sessionId` and a `payload` object containing only the changed fields, where valid keys are: `location`, `session_date`, `reading_price`, `format`
9. THE OfflineQueue SHALL be loaded via a `<script>` tag in index.html before session-store.js so that `window.offlineQueue` is available when SessionStore initializes
10. IF appending an Operation_Message to the Queue causes a localStorage quota error, THEN THE OfflineQueue SHALL retain the existing queue contents unchanged and log the error to the console
11. THE Queue SHALL store a maximum of 500 Operation_Messages; IF the Queue already contains 500 messages when an enqueue is attempted, THEN THE OfflineQueue SHALL log a warning to the console and skip the enqueue

### Requirement 2: Queue Enqueue Behavior

**User Story:** As a reader, I want the app to seamlessly queue operations when I lose signal mid-session, so that I never lose recorded readings.

#### Acceptance Criteria

1. WHEN `addReading` receives a network error or timeout from Supabase, THE Session_Store SHALL call `window.offlineQueue.enqueue()` with an `insert_reading` Operation_Message containing the session_id, timestamp, tip, price, payment, and source fields
2. WHEN `updateReading` receives a network error or timeout from Supabase, THE Session_Store SHALL call `window.offlineQueue.enqueue()` with an `update_reading` Operation_Message containing the reading ID, field name, and new value
3. WHEN `removeReading` receives a network error or timeout from Supabase, THE Session_Store SHALL call `window.offlineQueue.enqueue()` with a `delete_reading` Operation_Message containing the reading ID
4. WHEN `save` receives a network error or timeout from Supabase, THE Session_Store SHALL call `window.offlineQueue.enqueue()` with an `update_session` Operation_Message containing the session ID and the changed fields object
5. WHEN a Supabase mutation is requested, THE Session_Store SHALL always attempt the Supabase call regardless of `navigator.onLine` status, and SHALL enqueue the operation only if the call fails with a network error, timeout, or Supabase error response
6. THE Queue SHALL persist enqueued Operation_Messages to localStorage so that queued operations survive page refreshes and app restarts
7. THE Queue SHALL preserve insertion order so that operations replay in the exact sequence they were performed

### Requirement 3: Queue Flush Mechanism

**User Story:** As a reader, I want queued operations to automatically sync when my phone gets signal again, so that I don't have to manually trigger anything.

#### Acceptance Criteria

1. WHEN the browser fires the 'online' event, THE OfflineQueue SHALL initiate a Flush
2. WHEN the service worker fires a 'sync' event with tag `background-sync-readings`, THE OfflineQueue SHALL initiate a Flush
3. WHEN the app loads and `checkAuth` completes successfully, THE app SHALL call `window.offlineQueue.flush()` to initiate a Flush
4. WHILE a Flush is in progress, THE OfflineQueue SHALL process Operation_Messages in FIFO order (oldest first)
5. WHILE a Flush is in progress, THE OfflineQueue SHALL process each Operation_Message sequentially (one at a time, awaiting completion before the next)
6. WHEN a Flush completes all operations successfully, THE OfflineQueue SHALL remove all processed messages from localStorage; IF the localStorage removal itself fails after all sync operations succeeded, THEN THE Flush SHALL still be considered successful and THE OfflineQueue SHALL log the removal error to the console
7. IF a Flush is already in progress when a new Flush_Trigger fires, THEN THE OfflineQueue SHALL ignore the duplicate trigger

### Requirement 4: Flush Error Handling

**User Story:** As a reader, I want the queue to handle partial failures gracefully, so that successful operations aren't lost and failed ones get retried later.

#### Acceptance Criteria

1. IF an individual Operation_Message receives a network error or a Supabase error response during Flush, THEN THE OfflineQueue SHALL stop processing and retain the failed message and all subsequent messages in localStorage, and SHALL schedule a retry via the next Flush_Trigger (online event, Background Sync, or app reload)
2. WHEN a Flush stops due to an error, THE OfflineQueue SHALL log to the console the error message, the failing Operation_Message type, and the number of remaining unprocessed messages
3. WHEN a Flush stops due to an error, THE OfflineQueue SHALL display a snackbar notification with text "Sync failed — will retry when connected" that remains visible for 4 seconds
4. WHEN a Flush stops due to an error, THE OfflineQueue SHALL re-register Background Sync with tag `background-sync-readings` so the next connectivity event retries
5. WHEN a Flush successfully processes one or more messages before encountering an error, THE OfflineQueue SHALL remove only the successfully processed messages from localStorage and persist the remaining messages
6. IF an individual Operation_Message fails with any error (including HTTP 4xx client errors), THEN THE OfflineQueue SHALL retain that message, stop processing, and re-register Background Sync for retry on the next connectivity event

### Requirement 5: Removal of Legacy Sync Infrastructure

**User Story:** As a developer, I want the old snapshot-based sync removed, so that there is only one offline strategy and no conflicting behavior.

#### Acceptance Criteria

1. THE Session_Store SHALL NOT expose a `saveToLocalStorage` method, and all internal callers that previously invoked `saveToLocalStorage` (including `addReading`, `removeReading`, `save`, `loadExistingSession`, session creation, and session editing flows) SHALL be updated to remove those calls without introducing a replacement localStorage persist
2. THE Session_Store SHALL NOT expose a `loadFromStorage` method, and the constructor or initialization path SHALL NOT read session snapshots from localStorage
3. THE Session_Store SHALL NOT expose a `debouncedSaveToLocalStorage` method, and the `updateReading` method SHALL no longer invoke a debounced localStorage persist
4. THE index.html SHALL NOT contain the `handleBackgroundSync` function, and the `updateOnlineStatus` function SHALL no longer invoke diff-based reconciliation when connectivity is restored
5. THE index.html SHALL NOT contain the `handleBackgroundBackup` function, and the `visibilitychange` event listener that triggers background backup SHALL be removed
6. THE Session_Store SHALL NOT expose a `promptRestoreSession` method
7. WHEN the legacy sync methods are removed, THE Session_Store SHALL retain the `clearUserData` method so that sign-out can still remove the user's localStorage key `readingTracker_${userId}`; THE implementation SHALL explicitly verify that `clearUserData` remains functional after the removal of legacy methods
8. IF any test file references `saveToLocalStorage`, `loadFromStorage`, `debouncedSaveToLocalStorage`, or `promptRestoreSession`, THEN THE test suite SHALL be updated to remove or replace those tests, and the full test suite SHALL pass with 0 failures

### Requirement 6: Offline UX Indicators

**User Story:** As a reader, I want to know when I'm offline and when my queued readings are syncing, so that I have confidence my data is safe.

#### Acceptance Criteria

1. WHILE the device is offline, THE app SHALL display the existing red "Offline" badge in the header
2. WHEN an operation is enqueued to the Queue, THE app SHALL display a snackbar with text "Saved offline — will sync when connected" that auto-dismisses after 2 seconds
3. WHILE a Flush is in progress, THE app SHALL display a persistent snackbar with text "Syncing offline changes..." that remains visible until the Flush completes or fails
4. WHEN a Flush completes successfully, THE app SHALL immediately replace any existing snackbar with a snackbar with text "All changes synced" that auto-dismisses after 2 seconds
5. IF a Flush fails, THEN THE app SHALL replace the syncing snackbar with a snackbar with text "Sync failed — will retry when connected" that auto-dismisses after 3 seconds
6. WHEN a Flush completes successfully with operations processed, THE app SHALL remove the "Offline" badge if the device is online

### Requirement 7: Queue Inspection for Debugging

**User Story:** As a developer, I want to be able to inspect the queue state, so that I can debug sync issues in the field.

#### Acceptance Criteria

1. THE OfflineQueue SHALL expose a `count()` method to return the current count of pending Operation_Messages as an integer (0 when empty)
2. THE OfflineQueue SHALL expose a `peek()` method to return a shallow copy of the pending Operation_Messages array for console debugging, so that modifications to the returned array do not affect the actual Queue
3. THE OfflineQueue SHALL be accessible from the browser DevTools console via `window.offlineQueue`
4. WHILE the app is in development mode, WHEN an Operation_Message is enqueued, THE OfflineQueue SHALL log to the console with a `[OfflineQueue]` prefix, the Operation_Message type, and the resulting queue length, regardless of whether the resulting queue length is zero
5. WHILE the app is in development mode, WHEN a Flush starts or completes, THE OfflineQueue SHALL log to the console with a `[OfflineQueue]` prefix, the event (flush-start or flush-complete), the number of messages processed, and the remaining queue length
