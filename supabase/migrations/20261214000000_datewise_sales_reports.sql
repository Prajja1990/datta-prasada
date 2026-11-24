BEGIN;
DROP FUNCTION IF EXISTS public.get_sales_report(TEXT);
CREATE OR REPLACE FUNCTION public.get_sales_report(p_range TEXT DEFAULT 'TODAY', p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_since TIMESTAMPTZ;
    v_until TIMESTAMPTZ := NOW();
    v_result JSONB;
BEGIN
    IF NOT public.auth_has_permission('reports.view') THEN
        RAISE EXCEPTION 'Permission denied: reports.view is required' USING ERRCODE = '42501';
    END IF;
    CASE p_range
        WHEN 'TODAY' THEN v_since := date_trunc('day', NOW() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata';
        WHEN 'WEEK' THEN v_since := NOW() - INTERVAL '7 days';
        WHEN 'MONTH' THEN v_since := NOW() - INTERVAL '30 days';
        WHEN 'CUSTOM' THEN
            IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN
                RAISE EXCEPTION 'Select a valid start and end date' USING ERRCODE = '22023';
            END IF;
            v_since := p_start_date::TIMESTAMP AT TIME ZONE 'Asia/Kolkata';
            v_until := (p_end_date + 1)::TIMESTAMP AT TIME ZONE 'Asia/Kolkata';
        WHEN 'ALL' THEN v_since := '-infinity'::TIMESTAMPTZ;
        ELSE RAISE EXCEPTION 'Invalid report date range' USING ERRCODE = '22023';
    END CASE;

    WITH selected_orders AS MATERIALIZED (
        SELECT * FROM public.orders WHERE created_at >= v_since AND created_at < v_until
    ), totals AS (
        SELECT COUNT(*) AS order_count,
            COUNT(*) FILTER (WHERE payment_status = 'PAID') AS paid_count,
            COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'PAID'), 0) AS revenue,
            COALESCE(AVG(total_amount) FILTER (WHERE payment_status = 'PAID'), 0) AS aov,
            COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'PAID' AND payment_method = 'CASH'), 0) AS cash,
            COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'PAID' AND payment_method = 'UPI'), 0) AS upi
        FROM selected_orders
    ), dishes AS (
        SELECT oi.item_name AS name, SUM(oi.quantity) AS quantity, SUM(oi.total_price) AS revenue
        FROM public.order_items oi JOIN selected_orders o ON o.id = oi.order_id
        WHERE o.payment_status = 'PAID'
        GROUP BY oi.item_name
    )
    SELECT jsonb_build_object(
        'totalRevenue', t.revenue, 'totalOrdersCount', t.order_count,
        'paidOrdersCount', t.paid_count, 'aov', t.aov,
        'cashTotal', t.cash, 'upiTotal', t.upi,
        'itemSales', COALESCE((SELECT jsonb_agg(jsonb_build_object(
            'name', d.name, 'quantity', d.quantity, 'revenue', d.revenue,
            'share', CASE WHEN t.revenue > 0 THEN d.revenue * 100 / t.revenue ELSE 0 END
        ) ORDER BY d.revenue DESC, d.name) FROM dishes d), '[]'::JSONB),
        'orders', COALESCE((SELECT jsonb_agg(to_jsonb(o) ORDER BY o.created_at DESC, o.id) FROM selected_orders o), '[]'::JSONB),
        'dailySales', COALESCE((
            SELECT jsonb_agg(to_jsonb(daily) ORDER BY daily.date DESC)
            FROM (
                SELECT (o.created_at AT TIME ZONE 'Asia/Kolkata')::DATE AS date,
                    COUNT(*) AS orders,
                    COUNT(*) FILTER (WHERE o.payment_status = 'PAID') AS paid_orders,
                    COALESCE(SUM(o.total_amount) FILTER (WHERE o.payment_status = 'PAID'), 0) AS revenue,
                    COALESCE(SUM(o.total_amount) FILTER (WHERE o.payment_status = 'PAID' AND o.payment_method = 'CASH'), 0) AS cash,
                    COALESCE(SUM(o.total_amount) FILTER (WHERE o.payment_status = 'PAID' AND o.payment_method = 'UPI'), 0) AS upi
                FROM selected_orders o GROUP BY (o.created_at AT TIME ZONE 'Asia/Kolkata')::DATE
            ) daily
        ), '[]'::JSONB),
        'generatedAt', NOW()
    ) INTO v_result FROM totals t;
    RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_sales_report(TEXT, DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sales_report(TEXT, DATE, DATE) TO authenticated;
COMMIT;
