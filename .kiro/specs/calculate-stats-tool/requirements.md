# Requirements: calculate_stats Tool

## Introduction

Gpsy (the Bedrock AI assistant) is bad at arithmetic. When it receives individual readings from tools, it tries to sum prices/tips itself and gets wrong answers (observed: reporting $527.50 when DB has $554.00, reporting $538 when DB has $507). This tool gives Gpsy a way to get pre-computed aggregates from the database — all math happens in Postgres, the LLM just reports numbers verbatim.

## Glossary

- **calculate_stats**: A new Bedrock Agent tool that returns pre-computed aggregates (counts, sums, averages, breakdowns) for any filtered set of readings
- **group_by**: Optional parameter that splits results into groups (e.g., by day_of_week, location, payment method) for comparison queries
- **search_by**: JSON string of filter field:value pairs — same pattern used by list_sessions_v2 and list_readings_v2

## Requirements

### Requirement 1: DB Function — calculate_reading_stats

**User Story:** As the Lambda server, I need a Postgres function that computes all aggregates so that no math ever happens in Lambda or in the LLM.

#### Acceptance Criteria

1. THE database SHALL have a function `calculate_reading_stats(p_user_id uuid, p_filters jsonb DEFAULT '{}', p_group_by text DEFAULT NULL)` that returns JSONB
2. THE function SHALL compute from the `readings_with_context` view: reading_count, total_earnings, total_tips, total_base, avg_tip, avg_price, min_tip, max_tip, busiest_hour, busiest_time_of_day
3. WHEN p_filters contains `start_date`, THE function SHALL include only readings where `reading_date >= p_filters->>'start_date'`
4. WHEN p_filters contains `end_date`, THE function SHALL include only readings where `reading_date <= p_filters->>'end_date'`
5. WHEN p_filters contains `location`, THE function SHALL include only readings where location ILIKE the filter value (partial match)
6. WHEN p_filters contains `day_of_week`, THE function SHALL include only readings where `day_of_week_name` ILIKE the filter value
7. WHEN p_filters contains `payment`, THE function SHALL include only readings where `payment` matches exactly
8. WHEN p_filters contains `source`, THE function SHALL include only readings where `source` matches exactly
9. WHEN p_filters contains `time_of_day`, THE function SHALL include only readings where `time_of_day` matches exactly
10. WHEN p_filters contains `format`, THE function SHALL include only readings where `session_format` ILIKE the filter value
11. WHEN p_filters contains `session_duration_days`, THE function SHALL include only readings from sessions with that duration
12. WHEN p_group_by is NULL, THE function SHALL return a single stats object
13. WHEN p_group_by is one of ('day_of_week', 'location', 'date', 'payment', 'source', 'time_of_day', 'format'), THE function SHALL return both overall stats AND an array of per-group stats
14. EACH group entry SHALL contain the group label and the same stat fields as the overall stats
15. THE function SHALL return `{"error": "no_data"}` when no readings match the filters

### Requirement 2: Lambda Tool — calculateStats

**User Story:** As the Bedrock Agent, I need a tool I can call to get computed statistics without doing any arithmetic myself.

#### Acceptance Criteria

1. THE server.js SHALL expose a `calculate_stats` tool with inputs: user_id (string), search_by (string, JSON), group_by (string, optional)
2. THE tool SHALL parse the search_by JSON and pass it as the p_filters parameter to the `calculate_reading_stats` RPC
3. THE tool SHALL pass group_by directly to the RPC as p_group_by
4. THE tool SHALL return the RPC result as-is (no additional processing or math in Lambda)
5. WHEN the RPC returns `{"error": "no_data"}`, THE tool SHALL return a user-friendly message indicating no readings matched the filters
6. WHEN the RPC returns any other error (connection failures, invalid parameters), THE tool SHALL return the technical error details as-is for debugging
7. IF generating a user-friendly message for the no_data case fails, THE tool SHALL fall back to returning the raw RPC error response
8. THE tool SHALL be available in both MCP (IDE) and Bedrock (agent) interfaces

### Requirement 3: Bedrock Action Group Schema

**User Story:** As the Bedrock Agent runtime, I need the calculate_stats tool defined in the action group schema so the agent knows it exists and how to call it.

#### Acceptance Criteria

1. THE action-group-schema.json SHALL include a `calculate_stats` function with parameters: user_id (string), search_by (string), group_by (string, optional)
2. THE search_by description SHALL list all available filter fields with examples
3. THE group_by description SHALL list all valid group_by values
4. THE tool description SHALL state that this tool returns pre-computed statistics and the agent should use it for any question involving counts, totals, averages, or comparisons

### Requirement 4: System Prompt Update

**User Story:** As Gpsy, I need to know when and how to use calculate_stats, and I need to be explicitly told not to do arithmetic myself.

#### Acceptance Criteria

1. THE system prompt SHALL include a section stating: "You are BAD at arithmetic. NEVER add, subtract, multiply, divide, count items, or compute percentages yourself. For ANY question about totals, averages, counts, comparisons, or percentages — call calculate_stats. Report numbers EXACTLY as returned."
2. THE system prompt SHALL document calculate_stats with all available search_by fields and group_by options
3. THE system prompt SHALL include examples: "How was Friday?" → calculate_stats with day_of_week filter; "Best day at Denver?" → calculate_stats with location filter and group_by=day_of_week
4. THE system prompt SHALL instruct the agent to prefer calculate_stats over list_readings_v2 when the user's question is about aggregates, and to use list_readings_v2 only when the user wants to see individual readings

### Requirement 5: Backward Compatibility

**User Story:** As an existing tool user, I need the new tool to coexist with existing tools without breaking anything.

#### Acceptance Criteria

1. THE calculate_stats tool SHALL NOT replace or modify get_user_summary_v2 — both tools coexist
2. THE existing tools (list_sessions_v2, list_readings_v2, get_session_details_v2, get_user_summary_v2) SHALL continue to function unchanged
3. THE Bedrock Agent SHALL have access to all 5 tools simultaneously
