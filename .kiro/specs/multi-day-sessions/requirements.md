# Requirements Document

## Introduction

Multi-Day Sessions allows Amanda to create a single session that spans multiple days (e.g., a 3-day Renaissance Faire weekend) instead of creating separate sessions per day. Per-day analytics remain accurate because each reading's timestamp determines which day it belongs to, not the session's date range. This feature includes schema changes (replacing `session_date` with `start_date`/`end_date`), a timestamp storage fix (UTC → local clock time), a one-time data migration to collapse existing multi-day events into single sessions, frontend updates for date range entry and display, and MCP/Bedrock tool updates for date-range-aware querying.

## Glossary

- **Session**: A logical grouping of tarot readings at a specific location over one or more days
- **Reading**: An individual tarot reading within a session, with its own timestamp, price, tip, payment method, and source
- **Reading_Timestamp**: The local clock time recorded when a reading is created, stored as `timestamp without time zone`; the authoritative source for determining which calendar day a reading occurred on. "What time did the clock say?" is the source of truth.
- **Start_Date**: The first calendar day (YYYY-MM-DD) of a session's date range
- **End_Date**: The last calendar day (YYYY-MM-DD) of a session's date range
- **Single_Day_Session**: A session where Start_Date equals End_Date
- **Multi_Day_Session**: A session where Start_Date is earlier than End_Date
- **Collapse_Migration**: A one-time irreversible migration that merges consecutive-day sessions at the same location into a single multi-day session
- **TZ_Offset**: The UTC offset in whole hours (e.g., -7 for PDT, -6 for MDT, -5 for CDT, -4 for EDT) stored on each reading for reference; not used in display math since timestamps are stored as local clock time
- **Session_Store**: The frontend module (`modules/session-store.js`) managing session state, cloud sync, and UI updates
- **MCP_Server**: The Lambda-based tool server providing data query tools to both the IDE (MCP protocol) and Bedrock Agent (REST)
- **Bedrock_Agent**: The AWS Bedrock-powered AI assistant (Gpsy) that answers natural-language questions about reading data
- **Session_Summaries_View**: The database view providing pre-aggregated session data for list queries
- **Readings_With_Context_View**: The database view joining readings with their session metadata
- **Offline_Queue**: The FIFO operation-message queue for offline-first sync of session and reading changes

## Requirements

### Requirement 1: Session Date Range Schema

**User Story:** As a reader, I want sessions to support a date range (start and end date), so that I can create one session spanning a multi-day event.

#### Acceptance Criteria

1. THE Sessions_Table SHALL store Start_Date and End_Date columns as date type (YYYY-MM-DD format)
2. WHEN a session is created, THE Sessions_Table SHALL require both Start_Date and End_Date to be non-null
3. THE Sessions_Table SHALL enforce via CHECK constraint that End_Date is greater than or equal to Start_Date
4. IF an INSERT or UPDATE would set End_Date earlier than Start_Date, THEN THE Sessions_Table SHALL reject the operation and return a constraint violation error
5. WHEN Start_Date equals End_Date, THE Session SHALL represent a Single_Day_Session
6. WHEN Start_Date is earlier than End_Date, THE Session SHALL represent a Multi_Day_Session

### Requirement 2: Schema Migration from session_date

**User Story:** As a developer, I want existing session_date values migrated to the new start_date/end_date columns, so that all historical data uses the new schema without data loss — while keeping the old column intact for production backwards compatibility.

#### Acceptance Criteria

1. WHEN the migration runs, THE Migration SHALL copy each existing session_date value into both Start_Date and End_Date (creating Single_Day_Sessions as a placeholder), preserving the total row count of the sessions table
2. IF any row fails to migrate, THEN THE Migration SHALL roll back all changes and leave the session_date column and all views/functions in their original state
3. IF a session has a NULL session_date value, THEN THE Migration SHALL skip that row and report it as a warning without halting the migration
4. THE Migration SHALL NOT drop the session_date column; it SHALL be retained for backwards compatibility with the production app until the full feature is deployed and verified
5. THE Migration SHALL process sessions individually (one session at a time) rather than in a single bulk operation, to reduce error surface and enable per-session validation
6. AFTER the migration completes, THE Migration SHALL be validated session-by-session using live database queries to confirm: (a) start_date and end_date are populated correctly, (b) reading counts match pre-migration counts, (c) no readings were lost or orphaned
7. THE Migration SHALL update the Session_Summaries_View to reference Start_Date and End_Date (in addition to session_date for backwards compatibility)
8. THE Migration SHALL update the Readings_With_Context_View to derive day-of-week from Reading_Timestamp instead of session date
9. THE Migration SHALL update the get_session_with_readings database function to return Start_Date and End_Date (alongside session_date for backwards compatibility)
10. THE Migration SHALL update the get_user_summary database function to use Start_Date and End_Date for date range overlap filtering

### Requirement 3: Collapse Migration for Multi-Day Events

**User Story:** As a reader, I want my existing consecutive-day sessions at the same location (like 3 Denver Faire sessions on Fri/Sat/Sun) merged into single multi-day sessions, so that my session list is cleaner and reflects how I think about those events.

#### Acceptance Criteria

1. BEFORE any collapse operations begin, THE Collapse_Migration SHALL create backup snapshot tables (`sessions_backup` and `readings_backup`) as frozen copies of production data, and SHALL create temp workspace tables (`sessions_temp` and `readings_temp`) as full copies to operate on
2. THE Collapse_Migration SHALL perform ALL merge operations (session_id reassignment, end_date updates, session deletions) exclusively in the temp workspace tables — production tables SHALL NOT be modified until validation passes
3. THE Collapse_Migration SHALL iterate sessions one at a time to determine each session's correct end_date by examining its readings' timestamps (latest reading timestamp date becomes end_date)
4. WHEN two or more sessions for the same user exist with an exact case-sensitive location match on consecutive calendar days and share the same format value and the same type value, THE Collapse_Migration SHALL merge them into one session with Start_Date set to the earliest date and End_Date set to the latest date, retaining the session record that has the earliest Start_Date as the surviving session
5. THE Collapse_Migration SHALL process one merge group at a time (session-by-session), NOT as a single bulk operation — each group is identified, merged, and validated before moving to the next
6. WHEN sessions are collapsed in the temp workspace, THE Collapse_Migration SHALL reassign all readings from the removed sessions to the surviving session by updating each reading's session_id in `readings_temp`
7. WHEN readings are moved, THE Collapse_Migration SHALL preserve each reading's original timestamp unchanged
8. AFTER each merge group is processed in temp, THE Collapse_Migration SHALL validate that: (a) the surviving session's reading count equals the sum of all original sessions' reading counts, (b) no reading timestamps were modified, (c) the surviving session's start_date and end_date are correct
9. WHEN sessions are collapsed in temp, THE Collapse_Migration SHALL delete the now-empty duplicate sessions from `sessions_temp` only after per-group validation passes
10. WHEN consecutive-day sessions at the same location have different format values, THE Collapse_Migration SHALL NOT merge those sessions
11. WHEN consecutive-day sessions at the same location have different type values, THE Collapse_Migration SHALL NOT merge those sessions
12. WHEN a consecutive-day chain of 3 or more sessions is interrupted by a format or type mismatch, THE Collapse_Migration SHALL merge only the contiguous sub-chains that share the same format and type values (e.g., days 1-2 merge separately from days 4-5 if day 3 differs)
13. IF the Collapse_Migration encounters a database error while processing a merge group in temp, THEN THE Collapse_Migration SHALL roll back changes for that group and report the failure without affecting other groups
14. AFTER all collapse operations complete in temp and validation passes, THE Collapse_Migration SHALL perform a delta reconciliation: identify any readings or sessions added to production after the snapshot timestamp and incorporate them into the promotion step
15. WHEN promoting temp results back to production, THE Collapse_Migration SHALL apply changes as a diff: (a) update session_id on production readings that were reassigned, (b) update start_date/end_date on surviving sessions, (c) delete merged-away sessions from production — in that order (children first, then parents)
16. THE Collapse_Migration SHALL NOT delete the backup snapshot tables (`sessions_backup` and `readings_backup`) — they SHALL be retained for burn-in verification and removed in a future project
17. AFTER all collapse operations complete, THE Collapse_Migration SHALL produce a summary report listing: merge groups processed, sessions merged, readings reassigned, delta items reconciled, and any failures

### Requirement 4: Frontend Session Creation with Date Range

**User Story:** As a reader, I want to specify a start and end date when creating a session, so that I can set up a multi-day session for an upcoming weekend event.

#### Acceptance Criteria

1. WHEN creating or editing a session, THE Session_Sheet SHALL display separate Start_Date and End_Date date input fields in YYYY-MM-DD format
2. WHEN the session sheet opens for a new session, THE Session_Sheet SHALL default both Start_Date and End_Date to today's date (YYYY-MM-DD)
3. WHEN a user sets End_Date earlier than Start_Date, THE Session_Sheet SHALL display a validation error indicating that End_Date must be on or after Start_Date, and SHALL prevent saving until corrected
4. WHEN an existing session is loaded, THE Session_Sheet SHALL populate Start_Date and End_Date from the session's stored values
5. WHEN the user saves a session, THE Session_Store SHALL persist Start_Date and End_Date to the sessions table; IF the save fails, THEN THE Session_Store SHALL enqueue the update to the Offline_Queue
6. THE Session_Store SHALL replace the sessionDate property with startDate and endDate properties, and SHALL require both startDate and endDate to be non-empty before allowing session creation
7. WHEN a session update is queued offline, THE Offline_Queue SHALL include Start_Date and End_Date in the update_session payload

### Requirement 5: Frontend Session Bar Date Display

**User Story:** As a reader, I want the session bar to show a date range for multi-day sessions and a single date for single-day sessions, so that I can see at a glance whether I'm in a multi-day event.

#### Acceptance Criteria

1. WHEN the active session is a Single_Day_Session, THE Session_Bar SHALL display the date in MM/DD format (e.g., "06/20")
2. WHEN the active session is a Multi_Day_Session and Start_Date and End_Date are in the same month, THE Session_Bar SHALL display the date range as "Mon DD–DD" using a 3-letter month abbreviation and en-dash separator (e.g., "Jun 20–22")
3. WHEN the active session is a Multi_Day_Session and Start_Date and End_Date are in different months, THE Session_Bar SHALL display the date range as "Mon DD–Mon DD" using 3-letter month abbreviations and en-dash separator (e.g., "Jun 30–Jul 2")
4. WHEN viewing the Load Session list, THE Session_List SHALL display date ranges for Multi_Day_Sessions using the same abbreviated format as the Session_Bar and single dates for Single_Day_Sessions in MM/DD format
5. IF Start_Date and End_Date span different calendar years, THEN THE Session_Bar SHALL include the year on both dates in the format "Mon DD, YYYY–Mon DD, YYYY" (e.g., "Dec 31, 2025–Jan 1, 2026")

### Requirement 6: MCP Tools Date Range Support

**User Story:** As a user querying data through Gpsy, I want the tools to return start_date and end_date for sessions and to filter by date ranges correctly, so that multi-day sessions appear in results when any part of their range overlaps my query.

#### Acceptance Criteria

1. THE list_sessions_v2 and list_readings_v2 tools SHALL be refactored to accept a single `search_by` JSON parameter containing field:value pairs, replacing individual filter parameters — solving Bedrock's 5-parameter-per-tool limit
2. THE MCP_Server SHALL dynamically build Supabase queries from `search_by` field:value pairs using an allowlist/filterMap; unknown fields SHALL be silently ignored; all filtering SHALL be DB-side (Lambda SHALL NOT download and filter locally)
3. THE list_sessions_v2 tool SHALL return start_date, end_date, and session_duration_days fields in each session object
4. WHEN a date range filter is applied to list_sessions_v2 with both start_date and end_date in search_by, THE MCP_Server SHALL return sessions where session.start_date is less than or equal to filter.end_date AND session.end_date is greater than or equal to filter.start_date
5. WHEN a date range filter is applied to list_sessions_v2 with only a start_date in search_by, THE MCP_Server SHALL return sessions where session.end_date is greater than or equal to the filter start_date
6. WHEN a date range filter is applied to list_sessions_v2 with only an end_date in search_by, THE MCP_Server SHALL return sessions where session.start_date is less than or equal to the filter end_date
7. THE get_session_details_v2 tool SHALL return start_date and end_date in the session object
8. WHEN start_date and end_date filter parameters are provided to get_user_summary_v2, THE MCP_Server SHALL include a session's readings in the summary if the session's date range overlaps the filter range (session.start_date less than or equal to filter.end_date AND session.end_date greater than or equal to filter.start_date)
9. THE MCP_Server SHALL maintain backward compatibility: if old-style individual params are passed (from MCP IDE client), they SHALL be mapped into the filterMap internally

### Requirement 7: Per-Day Querying via Reading Timestamp

**User Story:** As a user asking Gpsy "how was Friday vs Saturday?", I want per-day grouping and filtering to use each reading's own timestamp, so that MCP tool responses accurately reflect which day a reading happened regardless of session date range.

#### Acceptance Criteria

1. WHEN the MCP_Server groups or filters readings by day (in list_readings_v2, aggregate_readings, or get_user_summary_v2), it SHALL derive the calendar day from Reading_Timestamp (not from session Start_Date or End_Date)
2. WHEN the day_of_week filter is applied in list_sessions_v2, THE MCP_Server SHALL return a session if it contains at least one reading whose Reading_Timestamp falls on the specified day of week
3. THE Readings_With_Context_View SHALL derive day_of_week_num (0=Sunday through 6=Saturday) and reading_date (YYYY-MM-DD) directly from Reading_Timestamp (no timezone conversion needed — timestamps are stored as local clock time)
4. WHEN aggregate_readings groups by day, THE MCP_Server SHALL use Reading_Timestamp as the source for day determination (timestamps are already local clock time)
5. WHEN a Multi_Day_Session contains readings on more than one calendar day, THE day_of_week filter in list_sessions_v2 SHALL match that session for any day on which it has at least one reading

### Requirement 8: Bedrock Agent Schema and Prompt Update

**User Story:** As the Gpsy AI assistant, I need my action group schema and system prompt updated to understand multi-day sessions, so that I can correctly answer questions about date ranges and per-day breakdowns.

#### Acceptance Criteria

1. THE Bedrock_Agent action group schema SHALL replace session_date references with start_date and end_date in tool descriptions and return field documentation
2. THE Bedrock_Agent system prompt SHALL replace all session_date references in tool return descriptions with start_date and end_date (including list_sessions_v2 returns, get_session_details_v2 returns, and the day_of_week parameter description which SHALL state that day_of_week is derived from Reading_Timestamp)
3. THE Bedrock_Agent system prompt SHALL include a multi-day session section explaining that sessions can span multiple days (Start_Date through End_Date) and that Reading_Timestamp is the sole source of truth for determining which calendar day a reading belongs to
4. THE Bedrock_Agent system prompt SHALL instruct the agent to use date range overlap logic when filtering sessions by date, where a session overlaps a query range when the session's Start_Date is on or before the query end date AND the session's End_Date is on or after the query start date
5. WHEN a user asks about a specific day within a multi-day session, THE Bedrock_Agent SHALL call list_readings_v2 with date filters derived from Reading_Timestamp rather than relying on session-level date fields

### Requirement 9: Reading Timestamp Local Clock Storage

**User Story:** As a reader, I want my reading timestamps stored as the local clock time when the reading happened, so that 9:38pm always displays as 9:38pm regardless of what timezone I'm currently viewing from.

#### Acceptance Criteria

1. THE Readings_Table SHALL store the `timestamp` column as `timestamp without time zone` (not `timestamptz`), representing the reader's local clock time at the moment the reading was created
2. THE Readings_Table SHALL add a `tz_offset` integer column representing the UTC offset in whole hours at the time of creation (e.g., -7 for PDT, -6 for MDT, -5 for CDT, -4 for EDT), stored for reference
3. WHEN a new reading is created, THE Frontend SHALL send the local clock time (e.g., `2026-07-04T21:38:00`) without UTC conversion and SHALL include the device's current UTC offset in hours
4. THE Reading_Timestamp SHALL be the single source of truth for all date and time display — UI, Gpsy, and MCP tools SHALL all display the same time value with no timezone conversion
5. WHEN existing UTC timestamps are backfilled, THE Migration SHALL convert each reading's UTC timestamp to local time using a per-session timezone offset determined by the session's location
6. THE Backfill_Migration SHALL query all distinct session locations, determine the correct UTC offset for each location (with user confirmation for ambiguous locations), and apply the offset to convert each reading's timestamp from UTC to local clock time
7. THE Backfill_Migration SHALL process one session location at a time, presenting timezone guesses for user confirmation before applying conversions
8. AFTER backfill, THE Readings_With_Context_View SHALL derive `reading_date`, `day_of_week_num`, and `hour_local` directly from the stored timestamp (no AT TIME ZONE conversion needed since timestamps are already local)
9. THE Frontend SHALL stop using `new Date().toISOString()` for reading creation and SHALL instead generate a local time string without timezone suffix (no 'Z', no offset)
10. THE Frontend SHALL stop using `new Date(timestamp).toLocaleTimeString()` for display and SHALL instead display the stored timestamp value directly (it is already local time)
