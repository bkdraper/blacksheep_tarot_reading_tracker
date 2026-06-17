# Requirements Document

## Introduction

Redesign the session management UX for the Tarot Reading Tracker app. Replace the current collapsible "Event Settings" panel with a slim read-only session bar, a hamburger popup menu for session actions, and a bottom sheet for session creation/editing. Introduce two session types (Event and Private) driven by a new `type` column in the database, with type-specific field behavior and source options.

## Glossary

- **Session_Bar**: A slim, single-line read-only display bar at the top of the main content area that shows session status information
- **Hamburger_Menu**: A popup menu (not a drawer) triggered by a hamburger icon in the header, containing session action items
- **Session_Sheet**: A bottom sheet component that slides up from the bottom of the screen for creating or editing sessions
- **Session_Store**: The `SessionStore` class in `modules/session-store.js` that manages session state, cloud sync, and UI updates
- **Settings_Store**: The `SettingsStore` class in `modules/settings-store.js` that manages app preferences and customizable options
- **App**: The Tarot Reading Tracker web application (Pure HTML/CSS/JS PWA)
- **Active_Session**: A session state where a valid session ID exists and session data is loaded
- **Readings_Section**: The UI section containing the Add Reading button, totals table, and readings log list
- **Source_Picker**: The bottom sheet that displays source options for a reading entry

## Requirements

### Requirement 1: Session Bar Display

**User Story:** As a reader, I want to see my current session info at a glance in a slim bar, so that I always know what session is active without expanding a panel.

#### Acceptance Criteria

1. WHILE no Active_Session exists, THE Session_Bar SHALL display the text "(no active session)" in reduced-opacity styling visually distinct from active-session text
2. WHILE an Active_Session of type "event" exists, THE Session_Bar SHALL display the location (truncated with ellipsis if exceeding 20 characters), price prefixed with "$", and date in MM/DD format, separated by middle-dot characters (e.g., "📍 Va Beach BMSE · $65 · 10/15")
3. WHILE an Active_Session of type "private" exists, THE Session_Bar SHALL display the client name (truncated with ellipsis if exceeding 20 characters), price prefixed with "$", and date in MM/DD format, separated by middle-dot characters (e.g., "👤 Sarah M. · $120 · 10/15")
4. WHILE an Active_Session exists, THE Session_Bar SHALL display an edit pencil icon on the right side
5. WHEN the edit pencil icon is tapped, THE Session_Bar SHALL open the Session_Sheet pre-filled with the active session's location, price, date, and type fields
6. THE Session_Bar SHALL replace the existing collapsible "Event Settings" panel header
7. WHEN the Session_Bar text area (excluding the edit pencil icon) is tapped, THE Session_Bar SHALL perform no action, not navigate, not open any sheet, and not propagate the tap event to any underlying UI elements

### Requirement 2: Hamburger Menu

**User Story:** As a reader, I want quick access to session actions from a popup menu, so that I can start new sessions or manage existing ones without navigating a clunky panel.

#### Acceptance Criteria

1. THE App SHALL display a hamburger menu icon in the upper-left corner of the header area
2. WHEN the hamburger icon is tapped, THE Hamburger_Menu SHALL open as a popup overlay (not a drawer)
3. THE Hamburger_Menu SHALL contain exactly four items in order: "New Event", "New Private Reading", "Load Session", and "End Session"
4. WHEN "New Event" is selected, THE Hamburger_Menu SHALL close and open the Session_Sheet configured for event type creation
5. WHEN "New Private Reading" is selected, THE Hamburger_Menu SHALL close and open the Session_Sheet configured for private type creation
6. WHEN "Load Session" is selected, THE Hamburger_Menu SHALL close and open the existing Load Session sheet
7. WHEN "End Session" is selected, THE Hamburger_Menu SHALL display a confirmation dialog before clearing the Active_Session
8. IF the user confirms the "End Session" dialog, THEN THE App SHALL clear the Active_Session and return the Session_Bar to the no-session state
9. IF the user cancels the "End Session" dialog, THEN THE Hamburger_Menu SHALL close the dialog and take no further action
10. WHILE no Active_Session exists, THE Hamburger_Menu SHALL display the "End Session" item in a visually distinct disabled state that does not respond to tap input
11. WHEN the user taps outside the Hamburger_Menu popup, THE Hamburger_Menu SHALL close without triggering any menu action

### Requirement 3: Session Creation and Editing Bottom Sheet

**User Story:** As a reader, I want a consistent bottom sheet for creating and editing sessions, so that the session form is clean and type-aware.

#### Acceptance Criteria

1. WHEN opened for a new event session, THE Session_Sheet SHALL display fields for Location (text, maximum 100 characters), Date (date, defaulting to today), and Price (number, defaulting to the price from the user's most recently created session of any type, or 40 if no prior session exists)
2. WHEN opened for a new private session, THE Session_Sheet SHALL display fields for Client Name (text, maximum 100 characters), Date (date, defaulting to today), Price (toggle preset buttons from the privatePricePresets setting), and Source (optional toggle buttons showing sources with scope "private" or "all" from the unified sources setting)
3. IF the privatePricePresets setting contains no entries or no sources match scope "private" or "all" when the Session_Sheet is opened for a new private session, THEN THE Session_Sheet SHALL display the Price field as a free-form number input or omit the Source toggle respectively
4. WHEN opened for editing an existing session, THE Session_Sheet SHALL pre-fill all fields with the current session data and retain the session type (event or private) without allowing type change
5. WHEN the save button is tapped with valid required fields, THE Session_Sheet SHALL create or update the session in the database and dismiss the sheet
6. WHEN the save button is tapped with valid required fields, THE Session_Bar SHALL update to reflect the new or modified session data within 1 second of the sheet dismissing
7. IF the save button is tapped and Location (or Client Name for private sessions) is empty or Date is not set, THEN THE Session_Sheet SHALL prevent the save operation, apply a visual indicator to each missing required field, and remain open until all required fields are filled
8. THE Session_Sheet SHALL require Location (for event type) or Client Name (for private type) to contain at least 1 non-whitespace character, and Date to be a valid date, for all session types

### Requirement 4: App Mode Behavior

**User Story:** As a reader, I want the app to clearly differentiate between having an active session and not, so that I only see reading controls when they are relevant.

#### Acceptance Criteria

1. WHILE no Active_Session exists, THE App SHALL hide the Readings_Section (add button, totals, readings log) by removing them from the visible display
2. WHILE an Active_Session exists, THE App SHALL display the Readings_Section (add button, totals, readings log) as visible and interactive
3. WHILE no Active_Session exists, THE App SHALL keep the timer section visible and interactive
4. WHEN a session is created via the Session_Sheet, THE App SHALL transition to active-session mode by displaying the Readings_Section within 1 second of session creation completing
5. WHEN "End Session" is confirmed via the Hamburger_Menu, THE App SHALL transition to no-session mode by hiding the Readings_Section and clearing the current session data from the active view within 1 second of confirmation
6. WHEN the App loads and a previously saved Active_Session exists in persisted storage, THE App SHALL display the Readings_Section in active-session mode without requiring the user to re-create the session

### Requirement 5: Session Type Database Migration

**User Story:** As a developer, I want the sessions table to store a type field, so that the app can distinguish between event and private sessions.

#### Acceptance Criteria

1. THE App SHALL add a `type` text column to the `blacksheep_reading_tracker_sessions` table with a NOT NULL constraint and allowed values limited to "event" and "private"
2. THE App SHALL set the default value of the `type` column to "event"
3. THE App SHALL assign type "event" to all existing sessions that have no type value as part of the migration, before the NOT NULL constraint is applied
4. WHEN creating a new session, THE Session_Store SHALL include the `type` field (either "event" or "private") in the insert payload and persist it to the database
5. WHEN loading an existing session, THE Session_Store SHALL read the `type` field and store it in the in-memory session state so that downstream UI components can branch on session type
6. IF a session record contains a `type` value that is not "event" or "private", THEN THE Session_Store SHALL treat it as "event"
7. WHEN saving session state to localStorage, THE Session_Store SHALL include the `type` field in the serialized state object so that offline access preserves session type

### Requirement 6: Session Type in Local State

**User Story:** As a reader, I want my session type preserved across page refreshes, so that the app restores the correct type-specific behavior.

#### Acceptance Criteria

1. WHEN saving session state to localStorage, THE Session_Store SHALL include the `type` field with a value of either "event" or "private" in the persisted data alongside the existing session fields
2. WHEN restoring session state from localStorage, THE Session_Store SHALL read the `type` field and configure the source picker options and price input mode to match the restored type
3. IF the `type` field is missing or contains a value other than "event" or "private" in restored localStorage data, THEN THE Session_Store SHALL default to "event" and log the fallback to the console for debugging purposes

### Requirement 7: Type-Driven Source Picker

**User Story:** As a reader, I want the source options to change based on session type, so that I see relevant source choices for events vs private readings.

#### Acceptance Criteria

1. WHILE an Active_Session of type "event" exists, THE Source_Picker SHALL display sources where scope is "event" or "all", in the order they appear in the `sources` setting
2. WHILE an Active_Session of type "private" exists, THE Source_Picker SHALL display sources where scope is "private" or "all", in the order they appear in the `sources` setting
3. IF no sources match the active session type (after filtering by scope), THEN THE Source_Picker SHALL display a message indicating no sources are configured and SHALL NOT allow source selection
4. THE Settings_Store SHALL store sources as an array of objects with `name` (string) and `scope` (string: "event", "private", or "all") properties
5. THE Settings_Store SHALL include default sources: [{name: "Referral", scope: "event"}, {name: "Renu", scope: "event"}, {name: "POG", scope: "event"}, {name: "Repeat", scope: "all"}, {name: "Phone", scope: "private"}, {name: "In-Person", scope: "private"}]
6. THE Settings_Store SHALL include a `privatePricePresets` default value of [60, 120, 150]

### Requirement 8: Unified Sources and Price Presets Settings

**User Story:** As a reader, I want to manage all my sources in one place with scope tags, so that I can easily see and control which sources appear for events, private readings, or both.

#### Acceptance Criteria

1. THE Settings_Store SHALL provide a single UI section in the settings drawer for customizing sources (add, edit, delete), where each source row displays the source name and a scope selector (dropdown or toggle) with options "Event", "Private", and "All"
2. THE Settings_Store SHALL provide a UI section in the settings drawer for customizing private price presets (add, edit, delete)
3. WHEN a source's scope is modified, THE Source_Picker SHALL reflect the updated scope filtering for sessions opened after the modification
4. WHEN a private price preset is modified, THE Session_Sheet SHALL reflect the updated presets on next open
5. WHEN migrating from the legacy flat `sources` array (string[]) to the new scoped format (object[]), THE Settings_Store SHALL convert each existing source string to an object with scope "event" to preserve existing behavior

### Requirement 9: Remove Legacy Event Settings Panel

**User Story:** As a reader, I want the old collapsible event settings panel removed, so that the UI is not cluttered with redundant controls.

#### Acceptance Criteria

1. THE App SHALL remove the `#event-settings` element and all its child elements from the DOM, including the `.settings-header`, `#settings-content`, `#session-summary`, and all input fields and buttons contained within
2. THE App SHALL remove the `toggleSettings`, `collapseSettings`, and `expandSettings` methods from the Session_Store, and remove the corresponding `toggleSettings` and `collapseSettings` wrapper methods from the Settings_Store
3. THE App SHALL retain the following functionality previously accessed through the panel: loading an existing session (via the Hamburger_Menu "Load Session" item), creating a new session with location, date, and price fields (via the Session_Sheet), editing the active session (via the Session_Bar edit icon opening the Session_Sheet), starting a new session (via the Hamburger_Menu "New Event" and "New Private Reading" items), and admin user switching (via the Hamburger_Menu or existing admin controls)
4. IF any code references the removed `toggleSettings`, `collapseSettings`, or `expandSettings` methods, THEN THE App SHALL remove or update those references so that no runtime errors occur
