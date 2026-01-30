CREATE OR REPLACE FUNCTION query_readings(
  p_user_name TEXT,
  p_group_by TEXT[] DEFAULT '{}',
  p_filters JSONB DEFAULT '{}',
  p_aggregate TEXT[] DEFAULT ARRAY['count', 'sum_earnings'],
  p_sort_by TEXT DEFAULT NULL,
  p_limit INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
  v_query TEXT;
  v_group_clause TEXT := '';
  v_select_fields TEXT := '';
  v_where_clause TEXT := 'WHERE LOWER(user_name) = LOWER($1)';
  v_order_clause TEXT := '';
BEGIN
  -- Build GROUP BY fields
  IF array_length(p_group_by, 1) > 0 THEN
    v_select_fields := array_to_string(
      ARRAY(
        SELECT CASE 
          WHEN field = 'location' THEN 's.location'
          WHEN field = 'session_date' THEN 's.session_date'
          ELSE 'r.value->>''' || field || ''''
        END || ' AS ' || field
        FROM unnest(p_group_by) AS field
      ),
      ', '
    ) || ', ';
    v_group_clause := 'GROUP BY ' || array_to_string(
      ARRAY(
        SELECT CASE 
          WHEN field = 'location' THEN 's.location'
          WHEN field = 'session_date' THEN 's.session_date'
          ELSE 'r.value->>''' || field || ''''
        END
        FROM unnest(p_group_by) AS field
      ),
      ', '
    );
  END IF;

  -- Build aggregation fields
  v_select_fields := v_select_fields || array_to_string(
    ARRAY(
      SELECT CASE agg
        WHEN 'count' THEN 'COUNT(*) AS count'
        WHEN 'sum_earnings' THEN 'SUM(COALESCE((r.value->>''price'')::numeric, s.reading_price, 40) + COALESCE((r.value->>''tip'')::numeric, 0)) AS sum_earnings'
        WHEN 'sum_tips' THEN 'SUM(COALESCE((r.value->>''tip'')::numeric, 0)) AS sum_tips'
        WHEN 'sum_base' THEN 'SUM(COALESCE((r.value->>''price'')::numeric, s.reading_price, 40)) AS sum_base'
        WHEN 'avg_tip' THEN 'ROUND(AVG(COALESCE((r.value->>''tip'')::numeric, 0)), 2) AS avg_tip'
        WHEN 'avg_price' THEN 'ROUND(AVG(COALESCE((r.value->>''price'')::numeric, s.reading_price, 40)), 2) AS avg_price'
        WHEN 'min_tip' THEN 'MIN(COALESCE((r.value->>''tip'')::numeric, 0)) AS min_tip'
        WHEN 'max_tip' THEN 'MAX(COALESCE((r.value->>''tip'')::numeric, 0)) AS max_tip'
      END
      FROM unnest(p_aggregate) AS agg
    ),
    ', '
  );

  -- Build WHERE clause from filters
  IF p_filters ? 'start_date' THEN
    v_where_clause := v_where_clause || ' AND s.session_date >= ''' || (p_filters->>'start_date') || '''';
  END IF;
  IF p_filters ? 'end_date' THEN
    v_where_clause := v_where_clause || ' AND s.session_date <= ''' || (p_filters->>'end_date') || '''';
  END IF;
  IF p_filters ? 'location' THEN
    v_where_clause := v_where_clause || ' AND LOWER(s.location) LIKE LOWER(''%' || (p_filters->>'location') || '%'')';
  END IF;
  IF p_filters ? 'payment' THEN
    v_where_clause := v_where_clause || ' AND r.value->>''payment'' = ''' || (p_filters->>'payment') || '''';
  END IF;
  IF p_filters ? 'source' THEN
    v_where_clause := v_where_clause || ' AND r.value->>''source'' = ''' || (p_filters->>'source') || '''';
  END IF;
  IF p_filters ? 'min_tip' THEN
    v_where_clause := v_where_clause || ' AND COALESCE((r.value->>''tip'')::numeric, 0) >= ' || (p_filters->>'min_tip');
  END IF;
  IF p_filters ? 'max_tip' THEN
    v_where_clause := v_where_clause || ' AND COALESCE((r.value->>''tip'')::numeric, 0) <= ' || (p_filters->>'max_tip');
  END IF;
  IF p_filters ? 'min_price' THEN
    v_where_clause := v_where_clause || ' AND COALESCE((r.value->>''price'')::numeric, s.reading_price, 40) >= ' || (p_filters->>'min_price');
  END IF;
  IF p_filters ? 'max_price' THEN
    v_where_clause := v_where_clause || ' AND COALESCE((r.value->>''price'')::numeric, s.reading_price, 40) <= ' || (p_filters->>'max_price');
  END IF;

  -- Build ORDER BY clause
  IF p_sort_by IS NOT NULL THEN
    IF LEFT(p_sort_by, 1) = '-' THEN
      v_order_clause := 'ORDER BY ' || SUBSTRING(p_sort_by FROM 2) || ' DESC';
    ELSE
      v_order_clause := 'ORDER BY ' || p_sort_by || ' ASC';
    END IF;
  END IF;

  -- Build final query
  v_query := format(
    'SELECT jsonb_agg(row_to_json(t)::jsonb) FROM (
      SELECT %s
      FROM blacksheep_reading_tracker_sessions s
      CROSS JOIN LATERAL jsonb_array_elements(s.readings) AS r(value)
      %s
      %s
      %s
      %s
    ) t',
    v_select_fields,
    v_where_clause,
    v_group_clause,
    v_order_clause,
    CASE WHEN p_limit IS NOT NULL THEN 'LIMIT ' || p_limit ELSE '' END
  );

  EXECUTE v_query INTO v_result USING p_user_name;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;
