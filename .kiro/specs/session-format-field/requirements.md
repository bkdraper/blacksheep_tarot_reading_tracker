# Requirements Document

## Introduction

Add a `format` field to sessions to capture *what kind* of event or private reading a session represents. Currently "Phone" and "In-Person" are stored as sources, but they describe the session's form — not why the client came. Event formats (expo, fair, shop, party, market, festival) have no home at all. This feature introduces a new dimension to the data model, distinct from type, source, and location.

- **DB column**: `format` (text, nullable)
- **UI label (event)**: "Kind of event"
- **UI label (private)**: "Kind of reading"
- **Settings section**: "Kinds of events/readings"
- The word "format" stays internal (code/DB only). Users see "kind".

## Glossary

- **Session**: A single working event or private reading day, stored in `blacksheep_reading_tracker_sessions`
- **Format**: A text field on a session indicating what kind of event or reading it is (e.g., expo, fair, phone, in-person)
- **Type**: The broad session bucket — either `event` or `private`
- **Source**: Why a client came (e.g., referral, repeat, walk-up) — remains unchanged
- **SettingsStore**: The client-side module managing user preferences in localStorage
- **Session_Sheet**: The bottom sheet UI used to create or edit sessions
- **Session_Bar**: The slim read-only bar displaying current session info
- **MCP_Server**: The backend Lambda service exposing v2 query tools
- **Bedrock_Agent**: The AWS Bedrock AI agent providing natural language queries via ChatGPSY
- **Scope**: A property on format/source objects indicating which session type they apply to (`event`, `private`, or `all`)

## Requirements

### Requirement 1: Database Schema Extension

**User Story:** As a developer, I want a `format` column on the sessions table, so that session kind can be stored and queried.

#### Acceptance Criteria

1. THE Database SHALL have a `format` column of type `text` on the `blacksheep_reading_tracker_sessions` table
2. THE Database SHALL allow null values in the `format` column
3. THE Database SHALL NOT enforce a default value for the `format` column
4. THE `session_summaries` view SHALL include the `format` column in its output
5. THE `readings_with_context` view SHALL include the session `format` column in its output

### Requirement 2: Data Backfill for Legacy Sessions

**User Story:** As a user, I want existing sessions that used "Phone" or "In-Person" as sources to have their format automatically set, so that historical data is correctly categorized.

#### Acceptance Criteria

1. WHEN the migration runs, THE Database SHALL set `format = 'Phone'` for sessions where `type = 'private'` and at least one reading in `blacksheep_reading_tracker_readings` has `source = 'Phone'` (case-sensitive match)
2. WHEN the migration runs, THE Database SHALL set `format = 'In-Person'` for sessions where `type = 'private'` and at least one reading in `blacksheep_reading_tracker_readings` has `source = 'In-Person'` (case-sensitive match)
3. IF a session has readings with both `source = 'Phone'` and `source = 'In-Person'`, THEN THE Database SHALL set format based on the source of the most recent reading by timestamp
4. IF the `format` column already contains a non-null value for a session, THEN THE Database SHALL NOT overwrite that value during backfill
5. WHEN the migration encounters an error partway through processing, THE Database SHALL allow partial completion using smaller transaction batches rather than rolling back all changes

### Requirement 3: Format Settings Management

**User Story:** As a user, I want to manage my list of available formats in settings, so that I can customize what kinds of events and readings are available.

#### Acceptance Criteria

1. THE SettingsStore SHALL store a `formats` setting as an array of objects with `name` (string, 1–30 characters after trimming) and `scope` (string: `event`, `private`, or `all`) properties
2. THE SettingsStore SHALL provide default event formats: Expo, Fair, Festival, Shop, Party, Market (scope: `event`)
3. THE SettingsStore SHALL provide default private formats: Phone, In-Person, Video (scope: `private`)
4. WHEN the user opens the formats settings sheet, THE SettingsStore SHALL display all formats with their name and scope, ordered by array position
5. WHEN the user adds a format, THE SettingsStore SHALL append a new format object with a placeholder name and scope `all` to the `formats` array without enforcing a maximum entry limit
6. WHEN the user edits a format name or scope, THE SettingsStore SHALL trim the name, update the corresponding format object, and persist the change
7. WHEN the user deletes a format, THE SettingsStore SHALL remove the format from the array and persist the change
8. IF the user submits a format name that is empty after trimming, THEN THE SettingsStore SHALL remove that format entry from the array
9. IF the user submits a format name that duplicates an existing format name (case-insensitive) within the same scope, THEN THE SettingsStore SHALL reject the change and display an error message indicating the name is already in use
10. IF the SettingsStore fails to initialize or load settings, THEN THE SettingsStore SHALL default the active format for event sessions to "Expo" and for private sessions to "In-Person"

### Requirement 4: Source Cleanup

**User Story:** As a user, I want "Phone" and "In-Person" removed from the default sources list, so that the data model correctly separates format from source.

#### Acceptance Criteria

1. THE SettingsStore SHALL NOT include "Phone" or "In-Person" in the default `sources` array
2. WHEN the SettingsStore loads settings containing a source object whose `name` property exactly equals "Phone" or "In-Person" (case-sensitive), THE SettingsStore SHALL remove those entries from the `sources` array before returning settings
3. WHEN migrating legacy sources, THE SettingsStore SHALL match only source objects whose `name` property is exactly "Phone" or "In-Person" and SHALL NOT remove sources where those words appear as substrings of a longer name (e.g., "iPhone Reading" or "In-Person Deluxe")
4. IF the SettingsStore loads settings that have already had "Phone" and "In-Person" removed, THEN THE SettingsStore SHALL leave the `sources` array unchanged

### Requirement 5: Session Sheet Format Selector

**User Story:** As a user, I want to select the kind of event or reading when creating or editing a session, so that my sessions are properly categorized.

#### Acceptance Criteria

1. WHEN the session creation sheet opens for an event, THE Session_Sheet SHALL display a format selector labeled "Kind of event"
2. WHEN the session creation sheet opens for a private reading, THE Session_Sheet SHALL display a format selector labeled "Kind of reading"
3. WHILE the session type is set, THE Session_Sheet SHALL filter format options to show only formats whose scope matches the current session type or scope `all`
4. IF no formats in the SettingsStore match the current session type or scope `all`, THEN THE Session_Sheet SHALL hide the format selector
5. WHEN the user selects a format, THE Session_Sheet SHALL visually indicate the selected button and hold the format value in the session state
6. THE Session_Sheet SHALL require a format to be selected before allowing session creation or save
7. WHEN the session sheet opens for a new event session, THE Session_Sheet SHALL default the format selection to "Expo"
8. WHEN the session sheet opens for a new private session, THE Session_Sheet SHALL default the format selection to "In-Person"
9. WHEN the session sheet opens in edit mode, THE Session_Sheet SHALL pre-fill the format selector with the session's current format value, even if that format no longer exists in the SettingsStore list
10. THE Session_Sheet SHALL render format selector buttons with a minimum touch target of 44px

### Requirement 6: Session Persistence with Format

**User Story:** As a user, I want the format to be saved with my session to both local storage and the database, so that my selection persists.

#### Acceptance Criteria

1. WHEN a session is created, THE SessionStore SHALL include the `format` value (or null if unselected) in the Supabase insert payload
2. WHEN a session is updated, THE SessionStore SHALL include the `format` value (or null if unselected) in the Supabase update payload
3. THE SessionStore SHALL include the `format` value as a `format` key in the localStorage session state object
4. WHEN a session is loaded from localStorage and the stored state does not contain a `format` key, THE SessionStore SHALL default format to null
5. WHEN an existing session is loaded from the database, THE SessionStore SHALL read the `format` column value and apply it, defaulting to null if the column is absent or null
6. WHEN the format value changes, THE SessionStore SHALL persist the updated format to both localStorage and the database within the existing save cycle

### Requirement 7: Session Bar Display

**User Story:** As a user, I want to see the session's format in the session bar, so that I can quickly identify what kind of session is active.

#### Acceptance Criteria

1. WHILE a session with a non-null, non-empty format is active, THE Session_Bar SHALL display the format value as a text tag positioned after the location text and before the price
2. WHILE a session with a null or empty-string format is active, THE Session_Bar SHALL NOT display any format indicator
3. IF the format value exceeds 20 characters, THEN THE Session_Bar SHALL truncate the displayed format text to 20 characters followed by an ellipsis

### Requirement 8: MCP Server Format Support

**User Story:** As a developer, I want the MCP server v2 tools to expose the format field, so that AI queries can access and filter by session kind.

#### Acceptance Criteria

1. THE MCP_Server `list_sessions_v2` tool SHALL include the `format` field (string or null) in its response object for each session
2. THE MCP_Server `list_sessions_v2` tool SHALL accept an optional `format` filter parameter of type string in its input schema
3. WHEN a `format` filter is provided with a non-empty value, THE MCP_Server SHALL return only sessions whose format matches the filter value using case-insensitive comparison, excluding sessions with a null format
4. IF the `format` filter parameter is provided as an empty string or whitespace-only value, THEN THE MCP_Server SHALL treat it as no filter applied and return sessions regardless of their format value
5. THE MCP_Server `list_readings_v2` tool SHALL include the session `format` field (string or null) in its response object for each reading
6. THE MCP_Server `get_session_details_v2` tool SHALL include the `format` field (string or null) in its response

### Requirement 9: Bedrock Agent Format Awareness

**User Story:** As a user, I want to ask Gpsy about sessions by their kind (e.g., "show me all my expo events"), so that I can query my data by format.

#### Acceptance Criteria

1. THE Bedrock_Agent system prompt SHALL document the `format` field including its purpose (kind of event or reading), its relationship to session type (event formats vs private formats), and example values (e.g., expo, fair, phone, in-person)
2. THE Bedrock_Agent action group schema SHALL include `format` as an optional string parameter on the `list_sessions_v2` action with a description indicating it filters by kind of event or reading (case-insensitive match)
3. WHEN a user asks about session kinds using terms such as event type names, reading type names, or phrases like "expo events" or "phone readings", THE Bedrock_Agent SHALL pass the corresponding format value to the `list_sessions_v2` format filter to retrieve matching sessions
4. THE Bedrock_Agent system prompt SHALL always include instructions about the format field and instruct the agent to include the format value when presenting session results that have a non-null format

### Requirement 10: Settings UI for Formats

**User Story:** As a user, I want a "Kinds" section in the settings drawer, so that I can add, edit, and delete format options.

#### Acceptance Criteria

1. THE Settings_Drawer SHALL display a "Kinds of events/readings" section with a "Customize" button
2. WHEN the user taps "Customize", THE Settings_Drawer SHALL open a bottom sheet listing all format entries, each with a name text input (maximum 30 characters), a scope dropdown with options "Event", "Private", and "All", and a delete button
3. WHEN the user taps the "Add" button, THE Settings_Drawer SHALL append a new format entry with the name "New Format" and scope "all" to the list
4. THE Settings_Drawer SHALL render all interactive elements within the formats bottom sheet with a minimum touch target of 44px and font size of 16px or larger
5. WHEN the user changes a format name or scope value, THE Settings_Drawer SHALL persist the updated formats array via SettingsStore and display a success snackbar on successful persistence or a failure snackbar if persistence fails
6. WHEN the user taps a format's delete button, THE Settings_Drawer SHALL remove that format entry, persist the updated formats array via SettingsStore, and re-render the format list immediately to reflect the deletion
7. IF the user clears a format name input to empty or whitespace-only, THEN THE Settings_Drawer SHALL remove that format entry from the array on the next change event

### Requirement 11: Legacy Source Migration in Settings

**User Story:** As a developer, I want the SettingsStore to gracefully handle users who have "Phone" and "In-Person" as sources, so that the transition to formats is seamless.

#### Acceptance Criteria

1. WHEN SettingsStore loads settings containing a source with name exactly equal to "Phone" and scope `private`, THE SettingsStore SHALL remove that entry from the `sources` array
2. WHEN SettingsStore loads settings containing a source with name exactly equal to "In-Person" and scope `private`, THE SettingsStore SHALL remove that entry from the `sources` array
3. WHEN removing "Phone" from sources, THE SettingsStore SHALL add `{ name: "Phone", scope: "private" }` to the `formats` array if no format with name "Phone" is already present
4. WHEN removing "In-Person" from sources, THE SettingsStore SHALL add `{ name: "In-Person", scope: "private" }` to the `formats` array if no format with name "In-Person" is already present
5. IF the `formats` array does not yet exist in the loaded settings, THEN THE SettingsStore SHALL initialize it with the default formats before checking for duplicates
6. WHEN migration completes, THE SettingsStore SHALL set a `legacySourcesMigrated` flag to `true` in the persisted settings and skip migration on subsequent loads; IF the flag-setting fails while the migration itself succeeds, THEN THE SettingsStore SHALL retry the migration on the next load
7. THE SettingsStore SHALL persist the migrated settings to localStorage immediately after completing the source-to-format migration
