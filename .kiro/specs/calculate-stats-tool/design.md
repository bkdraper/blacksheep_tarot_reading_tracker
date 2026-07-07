# Design: calculate_stats Tool

## Overview

A dedicated aggregation tool that performs all arithmetic in Postgres and returns pre-computed statistics. The LLM never does math — it calls this tool and reports the numbers verbatim.

## Architecture

```
User asks "How was Saturday at Denver?"
    ↓
Bedrock Agent decides: this needs numbers → call calculate_stats
    ↓
Lambda: parse search_by, call RPC
    ↓
Postgres: calculate_reading_stats() queries readings_with_context view, 
          computes all aggregates, returns JSONB
    ↓
Lambda: return as-is
    ↓
Agent: "Saturday at Denver: 17 readings, $554.00 earned..." (verbatim from tool)
```

## DB Function

```sql
CREATE OR REPLACE FUNCTION calculate_reading_stats(
    p_user_id uuid,
    p_filters jsonb DEFAULT '{}',
    p_group_by text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_query text;
    v_where text := 'WHERE r.user_id = $1';
    v_result jsonb;
    v_groups jsonb;
    v_overall jsonb;
BEGIN
    -- Build WHERE clause from filters
    IF p_filters->>'start_date' IS NOT NULL THEN
        v_where := v_where || ' AND r.reading_date >= ''' || (p_filters->>'start_date') || '''::date';
    END IF;
    IF p_filters->>'end_date' IS NOT NULL THEN
        v_where := v_where || ' AND r.reading_date <= ''' || (p_filters->>'end_date') || '''::date';
    END IF;
    IF p_filters->>'location' IS NOT NULL THEN
        v_where := v_where || ' AND r.location ILIKE ''%' || (p_filters->>'location') || '%''';
    END IF;
    IF p_filters->>'day_of_week' IS NOT NULL THEN
        v_where := v_where || ' AND LOWER(r.day_of_week_name) = LOWER(''' || (p_filters->>'day_of_week') || ''')';
    END IF;
    IF p_filters->>'payment' IS NOT NULL THEN
        v_where := v_where || ' AND r.payment = ''' || (p_filters->>'payment') || '''';
    END IF;
    IF p_filters->>'source' IS NOT NULL THEN
        v_where := v_where || ' AND r.source = ''' || (p_filters->>'source') || '''';
    END IF;
    IF p_filters->>'time_of_day' IS NOT NULL THEN
        v_where := v_where || ' AND r.time_of_day = ''' || (p_filters->>'time_of_day') || '''';
    END IF;
    IF p_filters->>'format' IS NOT NULL THEN
        v_where := v_where || ' AND r.session_format ILIKE ''%' || (p_filters->>'format') || '%''';
    END IF;
    IF p_filters->>'session_duration_days' IS NOT NULL THEN
        v_where := v_where || ' AND r.session_duration_days = ' || (p_filters->>'session_duration_days')::int;
    END IF;

    -- Compute overall stats
    EXECUTE format('
        SELECT jsonb_build_object(
            ''reading_count'', COUNT(*)::int,
            ''total_earnings'', COALESCE(SUM(r.total_earnings), 0)::numeric(10,2),
            ''total_tips'', COALESCE(SUM(COALESCE(r.tip, 0)), 0)::numeric(10,2),
            ''total_base'', COALESCE(SUM(r.effective_price), 0)::numeric(10,2),
            ''avg_tip'', COALESCE(AVG(COALESCE(r.tip, 0)), 0)::numeric(10,2),
            ''avg_price'', COALESCE(AVG(r.effective_price), 0)::numeric(10,2),
            ''min_tip'', COALESCE(MIN(COALESCE(r.tip, 0)), 0)::numeric(10,2),
            ''max_tip'', COALESCE(MAX(COALESCE(r.tip, 0)), 0)::numeric(10,2),
            ''busiest_hour'', mode() WITHIN GROUP (ORDER BY r.hour_local),
            ''busiest_time_of_day'', mode() WITHIN GROUP (ORDER BY r.time_of_day)
        )
        FROM readings_with_context r
        %s
    ', v_where)
    INTO v_overall
    USING p_user_id;

    -- Check for no data
    IF (v_overall->>'reading_count')::int = 0 THEN
        RETURN jsonb_build_object('error', 'no_data');
    END IF;

    -- If no group_by, return just stats
    IF p_group_by IS NULL THEN
        RETURN jsonb_build_object('stats', v_overall);
    END IF;

    -- Compute grouped stats
    -- Map group_by to actual column
    DECLARE
        v_group_col text;
    BEGIN
        v_group_col := CASE p_group_by
            WHEN 'day_of_week' THEN 'r.day_of_week_name'
            WHEN 'location' THEN 'r.location'
            WHEN 'date' THEN 'r.reading_date::text'
            WHEN 'payment' THEN 'r.payment'
            WHEN 'source' THEN 'r.source'
            WHEN 'time_of_day' THEN 'r.time_of_day'
            WHEN 'format' THEN 'r.session_format'
            ELSE NULL
        END;

        IF v_group_col IS NULL THEN
            RETURN jsonb_build_object('stats', v_overall, 'error', 'invalid_group_by');
        END IF;

        EXECUTE format('
            SELECT COALESCE(jsonb_agg(row_data ORDER BY (row_data->>''total_earnings'')::numeric DESC), ''[]''::jsonb)
            FROM (
                SELECT jsonb_build_object(
                    ''group'', %s,
                    ''reading_count'', COUNT(*)::int,
                    ''total_earnings'', COALESCE(SUM(r.total_earnings), 0)::numeric(10,2),
                    ''total_tips'', COALESCE(SUM(COALESCE(r.tip, 0)), 0)::numeric(10,2),
                    ''total_base'', COALESCE(SUM(r.effective_price), 0)::numeric(10,2),
                    ''avg_tip'', COALESCE(AVG(COALESCE(r.tip, 0)), 0)::numeric(10,2),
                    ''avg_price'', COALESCE(AVG(r.effective_price), 0)::numeric(10,2),
                    ''min_tip'', COALESCE(MIN(COALESCE(r.tip, 0)), 0)::numeric(10,2),
                    ''max_tip'', COALESCE(MAX(COALESCE(r.tip, 0)), 0)::numeric(10,2)
                ) AS row_data
                FROM readings_with_context r
                %s
                GROUP BY %s
            ) sub
        ', v_group_col, v_where, v_group_col)
        INTO v_groups
        USING p_user_id;
    END;

    RETURN jsonb_build_object('stats', v_overall, 'groups', v_groups);
END;
$$;
```

## Lambda Tool (server.js)

```javascript
// In tools array:
{
    name: 'calculate_stats',
    description: 'Calculate pre-computed statistics for readings. Use this for ANY question about totals, averages, counts, or comparisons. Returns exact numbers computed by the database.',
    inputSchema: {
        type: 'object',
        properties: {
            user_id: { type: 'string', description: 'User UUID' },
            search_by: { type: 'string', description: 'JSON with filters: location, start_date, end_date, day_of_week, payment, source, time_of_day, format, session_duration_days' },
            group_by: { type: 'string', description: 'Group results by: day_of_week, location, date, payment, source, time_of_day, format' }
        },
        required: ['user_id']
    }
}

// Handler:
async calculateStats({ user_id, search_by, group_by }) {
    let filters = {};
    if (search_by) {
        try { filters = typeof search_by === 'string' ? JSON.parse(search_by) : search_by; }
        catch { filters = {}; }
    }
    
    const { data, error } = await supabase.rpc('calculate_reading_stats', {
        p_user_id: user_id,
        p_filters: filters,
        p_group_by: group_by || null
    });
    
    if (error) return { error: error.message };
    if (data?.error === 'no_data') return { message: 'No readings found matching those filters.' };
    return data;
}
```

## Action Group Schema

```json
{
    "name": "calculate_stats",
    "description": "Calculate pre-computed statistics (totals, averages, breakdowns) for readings. Agent MUST use this for any question involving numbers, counts, totals, averages, or comparisons. Never compute numbers yourself.",
    "parameters": {
        "user_id": {
            "description": "User UUID from current_user_id session attribute.",
            "required": "False",
            "type": "string"
        },
        "search_by": {
            "description": "JSON string with field:value filter pairs. Available: location, start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), day_of_week (friday, saturday...), payment, source, time_of_day (morning|afternoon|evening), format, session_duration_days",
            "required": "False",
            "type": "string"
        },
        "group_by": {
            "description": "Split results into groups for comparison. Values: day_of_week, location, date, payment, source, time_of_day, format. Example: group_by=day_of_week returns stats per day.",
            "required": "False",
            "type": "string"
        }
    },
    "requireConfirmation": "DISABLED"
}
```

## System Prompt Addition

```
## ARITHMETIC RULE (CRITICAL)
You are BAD at arithmetic. NEVER add, subtract, multiply, divide, count items, or compute percentages yourself.
For ANY question about totals, averages, counts, comparisons, or percentages — call calculate_stats.
Report numbers EXACTLY as returned by the tool. Do not round, adjust, or recalculate them.

## calculate_stats Tool
Use this tool whenever the user asks about:
- How much they earned (totals)
- How many readings they did (counts)
- Average tips or prices
- Best/worst day, location, or time
- Comparisons between days, locations, or formats

Inputs:
- search_by: JSON filter (same fields as list_readings_v2)
- group_by: Optional grouping for comparison queries

Examples:
- "How was Friday?" → calculate_stats with search_by: {"day_of_week": "friday"}
- "Best day at Denver?" → calculate_stats with search_by: {"location": "denver"}, group_by: "day_of_week"
- "How much did I make in June?" → calculate_stats with search_by: {"start_date": "2026-06-01", "end_date": "2026-06-30"}
- "Cash vs Venmo?" → calculate_stats with group_by: "payment"

When calculate_stats returns grouped results, present them as a comparison table.
When it returns overall stats only, weave the numbers into a conversational response.
```

## Error Handling

| Scenario | Handling |
|----------|----------|
| No readings match filters | Return `{"message": "No readings found matching those filters."}` |
| Invalid group_by value | Return stats without groups, include error note |
| Malformed search_by JSON | Parse error → treat as empty filters (return all) |
| RPC failure | Return `{"error": "Database error"}` |

## Testing

- Mock supabase.rpc('calculate_reading_stats') in tests
- Verify search_by parsing (valid JSON, invalid JSON, string, object)
- Verify group_by passthrough
- Verify no math happens in Lambda (just passes through RPC result)
