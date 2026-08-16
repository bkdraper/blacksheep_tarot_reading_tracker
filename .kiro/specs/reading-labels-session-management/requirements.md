# Requirements: Reading Labels & Session Management

## Introduction

Three related capabilities bundled into one release: (1) optional name/label on individual readings for private sessions, (2) soft-delete for sessions, and (3) the ability to change session type after creation. All three are full-stack changes touching the database, views, frontend UI, MCP tools, and the Bedrock Agent.

## Glossary

- **Label**: An optional text field on a reading record identifying who the reading was for (typically a client name). Only meaningful for private sessions.
- **Soft_Delete**: A deletion pattern where a `deleted_at` timestamp is set rather than removing the row. Soft-deleted records remain in the database for recovery but are excluded from all views and queries.
- **Session_Type**: The `type` column on a session record, with values `'event'` or `'private'`. Determines which formats and sources are applicable.
- **Session_Store**: The frontend module (`session-store.js`) managing session state, cloud sync, and UI updates.
- **Readings_Manager**: The frontend module (`readings-manager.js`) managing reading CRUD and payment/source sheet UI.
- **Offline_Queue**: The frontend module (`offline-queue.js`) that queues failed Supabase operations for later replay.
- **MCP_Server**: The Lambda-based tool server (`server.js`) exposing tools to the Bedrock Agent and IDE MCP clients.
- **Bedrock_Agent**: The AWS Bedrock Agent (Gpsy/ChatGPSY) that queries session and reading data for Amanda.
- **Format_Validation**: The rule that event formats (Expo, Shop, Party) differ from private formats (In-Person, Phone) and a type change may invalidate the current format.

## Requirements

### Requirement 1: Reading Label — Database Column

**User Story:** As a tarot reader, I want each reading to optionally store a client name/label, so that I can identify who each private reading was for.

#### Acceptance Criteria

1. THE database SHALL have a nullable `label` text column on the `blacksheep_reading_tracker_readings` table
2. THE `readings_with_context` view SHALL include the `label` column from the readings table
3. THE `get_session_with_readings` function SHALL include the `label` field in each reading object returned
4. WHEN a reading has no label set, THE database SHALL store NULL for that reading's label column

### Requirement 2: Reading Label — Frontend UI

**User Story:** As a tarot reader using a private session, I want a text input for each reading's label that defaults to the session client name, so that single-client sessions require zero extra taps.

#### Acceptance Criteria

1. WHILE the active session type is `'private'`, THE Readings_Manager SHALL display a label text input field on each reading item in the readings list
2. WHILE the active session type is `'event'`, THE Readings_Manager SHALL hide the label input field on all reading items
3. WHEN a new reading is added to a private session, THE Session_Store SHALL set the reading's label to the session location value as the default
4. WHEN the user edits a reading's label field, THE Session_Store SHALL display the updated label immediately in the UI and persist the value to the database via the `updateReading` method
5. WHEN a label update fails due to network error, THE Session_Store SHALL revert the label to its previously saved value, display an error message, and THE Offline_Queue SHALL enqueue an `update_reading` operation with the label field and value
6. THE label input field SHALL accept any text value including an empty string
7. THE label input field SHALL have a minimum touch target of 44px height

### Requirement 3: Reading Label — MCP Tools and Bedrock Agent

**User Story:** As the Bedrock Agent, I want to see and filter by reading labels, so that Amanda can ask questions like "how much did Sarah tip?" or "show me readings for John."

#### Acceptance Criteria

1. THE `list_readings_v2` tool SHALL include the `label` field in each reading object returned
2. THE `list_readings_v2` search_by filter SHALL support a `label` field that performs a case-insensitive partial match (ILIKE) on reading labels
3. THE `get_session_details_v2` tool SHALL include the `label` field in each reading object returned
4. THE `calculate_stats` tool's `search_by` filter SHALL support a `label` field for filtering statistics by client name
5. THE `calculate_stats` tool SHALL support `group_by: 'label'` to produce per-client breakdowns
6. THE Bedrock action group schema SHALL document the `label` filter in the `search_by` description for applicable tools
7. THE Bedrock system prompt SHALL instruct the agent that `label` contains client names and is only populated for private session readings

### Requirement 4: Session Soft Delete — Database

**User Story:** As a tarot reader, I want to delete accidentally-created sessions, so that my session list stays clean without permanently losing data.

#### Acceptance Criteria

1. THE `blacksheep_reading_tracker_sessions` table SHALL have a nullable `deleted_at` timestamp column defaulting to NULL
2. THE `session_summaries` view SHALL include a `WHERE deleted_at IS NULL` filter to exclude soft-deleted sessions
3. THE `readings_with_context` view SHALL include a join condition or filter that excludes readings belonging to soft-deleted sessions
4. THE `get_user_summary` function SHALL exclude soft-deleted sessions from all aggregate calculations
5. THE `calculate_reading_stats` function SHALL exclude readings from soft-deleted sessions
6. WHEN a session is soft-deleted, THE associated readings SHALL remain in the database unchanged (no cascade delete of reading rows)

### Requirement 5: Session Soft Delete — Frontend UI

**User Story:** As a tarot reader, I want a delete button with a confirmation dialog, so that I can remove sessions I no longer need while being protected from accidental deletion.

#### Acceptance Criteria

1. THE Session_Store SHALL provide a `deleteSession` method that sets `deleted_at` to the current ISO timestamp on the session record
2. WHEN the user triggers session delete, THE frontend SHALL display a confirmation dialog stating the session location and date; THE delete operation SHALL only be invocable from the dialog's confirm button (not from the initial trigger)
3. WHEN the user confirms deletion via the dialog confirm button, THE Session_Store SHALL update the session's `deleted_at` column via Supabase
4. WHEN the soft-delete update succeeds, THE Session_Store SHALL call `startOver()` to return to the no-session state
5. WHEN the soft-delete update fails due to network error, THE Session_Store SHALL keep the user in the current session and display an error message
6. THE delete action SHALL be accessible from either the session edit sheet or the hamburger menu
7. WHEN viewing the load-session list, THE frontend SHALL NOT display sessions where `deleted_at` is not NULL

### Requirement 6: Session Type Change — Database and Views

**User Story:** As a tarot reader, I want to change a session's type between 'event' and 'private' after creation, so that I can correct mistakes without recreating the session.

#### Acceptance Criteria

1. THE `blacksheep_reading_tracker_sessions` table's `type` column SHALL accept updates from `'event'` to `'private'` and from `'private'` to `'event'` on existing records
2. WHEN a session's type changes from `'event'` to `'private'` and the current format is not valid for private sessions, THE system SHALL clear the format to NULL
3. WHEN a session's type changes from `'private'` to `'event'` and the current format is not valid for event sessions, THE system SHALL clear the format to NULL
4. THE `session_summaries` view SHALL reflect the updated type immediately after a type change (no stale cache)
5. THE `readings_with_context` view SHALL reflect the updated session type for all readings in the changed session

### Requirement 7: Session Type Change — Frontend UI

**User Story:** As a tarot reader, I want a type selector in the session edit interface, so that I can switch a session between event and private after creation.

#### Acceptance Criteria

1. THE session edit interface SHALL display a type selector allowing the user to toggle between `'event'` and `'private'`
2. WHEN the user selects a session type different from the current type, THE Session_Store SHALL update the `type` column on the session record via Supabase; WHEN the selected type matches the current type, THE Session_Store SHALL skip the database update
3. WHEN a type change causes the current format to be invalid for the new type, THE Session_Store SHALL clear the format field and display a notification informing the user that the format was invalidated by the type change
4. WHEN the type changes, THE source filtering in the readings UI SHALL update immediately to show sources matching the new type
5. WHEN the type changes to `'private'`, THE label input fields SHALL become visible on existing readings
6. WHEN the type changes to `'event'`, THE label input fields SHALL become hidden on existing readings
7. WHEN the type change update fails due to network error, THE Offline_Queue SHALL enqueue an `update_session` operation with the `type` field

### Requirement 8: Session Type Change — MCP Tools

**User Story:** As the Bedrock Agent, I want session type changes to be reflected immediately in query results, so that Amanda sees accurate data after fixing a session type.

#### Acceptance Criteria

1. THE `list_sessions_v2` tool SHALL return the current session type value (reflecting any type changes)
2. THE `list_readings_v2` tool SHALL return the current session type for each reading (reflecting parent session type changes)
3. THE `get_session_details_v2` tool SHALL return the current session type in the session object
4. THE Bedrock system prompt SHALL document that session type can be changed after creation and queries always reflect the current type

### Requirement 9: Offline Queue — New Operation Support

**User Story:** As a tarot reader using the app with poor connectivity, I want session delete and type change operations to be queued offline, so that my changes sync when connectivity returns.

#### Acceptance Criteria

1. THE Offline_Queue SHALL support the existing `update_session` operation type for soft-delete (payload: `{ field: 'deleted_at', value: '<ISO timestamp>' }`)
2. THE Offline_Queue SHALL support the existing `update_session` operation type for type changes (payload: `{ field: 'type', value: 'event'|'private' }`)
3. WHEN flushing a queued `update_session` with field `deleted_at`, THE Offline_Queue SHALL update the session record's `deleted_at` column
4. WHEN flushing a queued `update_session` with field `type`, THE Offline_Queue SHALL update the session record's `type` column
5. WHEN a queued operation fails during flush, THE Offline_Queue SHALL retry up to 3 times before declaring failure
6. WHEN a failed operation has dependent messages in the queue, THE Offline_Queue SHALL halt processing and retain remaining messages for the next flush cycle
7. WHEN a failed operation has no dependent messages, THE Offline_Queue SHALL move it to a dead-letter queue and display a summary notification to the user
