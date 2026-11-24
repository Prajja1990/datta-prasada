-- Datta Prasada: consolidated database schema, seeds, Auth bridge,
-- orders, reports, restaurant settings and configurable home page.
-- Run this file in Supabase SQL Editor.
-- Edge Functions must still be deployed separately (see README).
-- Replaces the historical migration files; no live migration history is edited.
BEGIN;


-- Source: 20261201000000_full_schema_and_seed.sql
-- ============================================================================
-- Datta Prasada - Consolidated Supabase schema, RBAC, and seed migration
-- Canonical setup file. Combines the four historical migrations and is safe to rerun.
-- ============================================================================

-- Enable UUID extension if available
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- ----------------------------------------------------------------------------
-- 1. RBAC & Security Tables
-- ----------------------------------------------------------------------------

-- Roles table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_key TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    mobile TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Roles junction table
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.user_profiles(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY(user_id, role_id)
);

-- Role Permissions junction table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY(role_id, permission_id)
);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,
    actor_name TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. Menu & Category Tables
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_kn TEXT NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    name_kn TEXT NOT NULL,
    description TEXT,
    description_kn TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    image_url TEXT,
    is_veg BOOLEAN DEFAULT TRUE,
    available BOOLEAN DEFAULT TRUE,
    featured BOOLEAN DEFAULT FALSE,
    preparation_time_minutes INT DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON public.menu_items(available);

-- ----------------------------------------------------------------------------
-- 3. Daily Token Sequences & Order Tables
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.daily_token_sequences (
    token_date DATE PRIMARY KEY,
    last_sequence INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_number TEXT NOT NULL,
    token_date DATE NOT NULL DEFAULT CURRENT_DATE,
    tracking_token TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_mobile TEXT NOT NULL,
    order_type TEXT NOT NULL CHECK (order_type IN ('DINE_IN', 'TAKEAWAY')),
    table_number TEXT,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('UPI', 'CASH')),
    payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
    order_status TEXT NOT NULL DEFAULT 'PLACED' CHECK (order_status IN ('PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED')),
    notes TEXT,
    estimated_prep_time_minutes INT DEFAULT 15,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_token ON public.orders(token_date, token_number);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON public.orders(tracking_token);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    item_name_kn TEXT,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    payment_provider TEXT NOT NULL DEFAULT 'RAZORPAY',
    transaction_id TEXT,
    amount DECIMAL(10,2) NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
    signature TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES public.user_profiles(id),
    changed_by_name TEXT,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON public.order_status_history(order_id);

-- ----------------------------------------------------------------------------
-- 4. Atomic Token & Order Creation Function
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_order_with_token(
    p_customer_name TEXT,
    p_customer_mobile TEXT,
    p_order_type TEXT,
    p_table_number TEXT,
    p_subtotal DECIMAL,
    p_tax_amount DECIMAL,
    p_total_amount DECIMAL,
    p_payment_method TEXT,
    p_payment_status TEXT,
    p_notes TEXT,
    p_items JSONB,
    p_customer_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_seq INT;
    v_token_str TEXT;
    v_tracking_token TEXT;
    v_order_id UUID;
    v_customer_id UUID := auth.uid();
    v_item JSONB;
BEGIN
    -- Atomic sequence increment using SELECT FOR UPDATE
    INSERT INTO public.daily_token_sequences (token_date, last_sequence)
    VALUES (v_today, 1)
    ON CONFLICT (token_date)
    DO UPDATE SET last_sequence = daily_token_sequences.last_sequence + 1
    RETURNING last_sequence INTO v_seq;

    -- Format token: DP-001, DP-002, etc.
    v_token_str := 'DP-' || LPAD(v_seq::TEXT, 3, '0');

    -- Generate secure unguessable tracking token (32 hex characters)
    v_tracking_token := encode(gen_random_bytes(16), 'hex');

    -- Create order
    INSERT INTO public.orders (
        token_number,
        token_date,
        tracking_token,
        customer_id,
        customer_name,
        customer_mobile,
        order_type,
        table_number,
        subtotal,
        tax_amount,
        total_amount,
        payment_method,
        payment_status,
        order_status,
        notes
    ) VALUES (
        v_token_str,
        v_today,
        v_tracking_token,
        v_customer_id,
        p_customer_name,
        p_customer_mobile,
        p_order_type,
        p_table_number,
        p_subtotal,
        p_tax_amount,
        p_total_amount,
        p_payment_method,
        p_payment_status,
        'PLACED',
        p_notes
    ) RETURNING id INTO v_order_id;

    -- Insert snapshot items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.order_items (
            order_id,
            menu_item_id,
            item_name,
            item_name_kn,
            quantity,
            unit_price,
            total_price
        ) VALUES (
            v_order_id,
            (v_item->>'menu_item_id')::UUID,
            v_item->>'name',
            v_item->>'name_kn',
            (v_item->>'quantity')::INT,
            (v_item->>'price')::DECIMAL,
            ((v_item->>'price')::DECIMAL * (v_item->>'quantity')::INT)
        );
    END LOOP;

    -- Record status history
    INSERT INTO public.order_status_history (
        order_id,
        previous_status,
        new_status,
        changed_by_name,
        reason
    ) VALUES (
        v_order_id,
        NULL,
        'PLACED',
        'Customer Checkout',
        'Order created successfully'
    );

    -- Return JSON summary
    RETURN jsonb_build_object(
        'order_id', v_order_id,
        'token_number', v_token_str,
        'tracking_token', v_tracking_token,
        'status', 'PLACED',
        'total_amount', p_total_amount
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. Seed Data (Roles, Permissions, Categories, Sakleshpur Menu)
-- ----------------------------------------------------------------------------

-- Seed Roles
INSERT INTO public.roles (name, description) VALUES
('SUPER_ADMIN', 'Platform Owner with full system and administrative control'),
('ADMIN', 'Restaurant Manager managing operations, menu, prices and reports'),
('STAFF', 'Counter Operator handling live orders, payments, tokens and receipts'),
('KITCHEN_STAFF', 'Kitchen Food Preparation team managing order preparation queue'),
('CUSTOMER', 'Guest or registered customer browsing and tracking own orders')
ON CONFLICT (name) DO NOTHING;

-- Seed Permissions
INSERT INTO public.permissions (permission_key, description) VALUES
('dashboard.view', 'View operational overview metrics'),
('orders.create', 'Create food orders'),
('orders.view_all', 'View all incoming and past orders'),
('orders.view_own', 'View own orders'),
('orders.accept', 'Accept new orders at counter'),
('orders.prepare', 'Start food preparation'),
('orders.mark_ready', 'Mark order as ready for pickup'),
('orders.complete', 'Complete and dispatch order'),
('orders.cancel', 'Cancel an active order'),
('menu.view', 'View active menu items'),
('menu.create', 'Add new dishes to menu'),
('menu.update', 'Update dishes, descriptions and images'),
('menu.delete', 'Remove dishes from menu'),
('menu.manage_price', 'Change food prices'),
('users.view', 'View staff and user accounts'),
('users.create', 'Create staff accounts'),
('users.update', 'Edit staff accounts'),
('users.deactivate', 'Activate or deactivate accounts'),
('roles.assign', 'Assign roles to staff'),
('roles.manage', 'Manage role definitions and permissions'),
('reports.view', 'View revenue and sales analytics'),
('reports.export', 'Export sales data to CSV'),
('payments.view', 'View payments and collection breakdowns'),
('payments.verify', 'Verify online transactions'),
('payments.refund', 'Authorize customer refunds'),
('settings.manage', 'Manage restaurant configuration and operational settings'),
('audit_logs.view', 'View security audit trail')
ON CONFLICT (permission_key) DO NOTHING;

-- Map Permissions to Roles
DO $$
DECLARE
    r_super UUID;
    r_admin UUID;
    r_staff UUID;
    r_kitchen UUID;
    r_customer UUID;
BEGIN
    IF to_regclass('public.security_hardening_applied') IS NOT NULL THEN
        RETURN;
    END IF;

    SELECT id INTO r_super FROM public.roles WHERE name = 'SUPER_ADMIN';
    SELECT id INTO r_admin FROM public.roles WHERE name = 'ADMIN';
    SELECT id INTO r_staff FROM public.roles WHERE name = 'STAFF';
    SELECT id INTO r_kitchen FROM public.roles WHERE name = 'KITCHEN_STAFF';
    SELECT id INTO r_customer FROM public.roles WHERE name = 'CUSTOMER';


    -- Super Admin gets all permissions
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r_super, id FROM public.permissions
    ON CONFLICT DO NOTHING;

    -- Admin Permissions
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r_admin, id FROM public.permissions
    WHERE permission_key IN (
        'dashboard.view', 'orders.create', 'orders.view_all', 'orders.view_own',
        'orders.accept', 'orders.prepare', 'orders.mark_ready', 'orders.complete', 'orders.cancel',
        'menu.view', 'menu.create', 'menu.update', 'menu.delete', 'menu.manage_price',
        'users.view', 'users.create', 'users.update', 'users.deactivate',
        'reports.view', 'reports.export', 'payments.view', 'payments.verify', 'payments.refund',
        'audit_logs.view'
    ) ON CONFLICT DO NOTHING;

    -- Staff (Counter Operator) Permissions
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r_staff, id FROM public.permissions
    WHERE permission_key IN (
        'orders.create', 'orders.view_all', 'orders.view_own',
        'orders.accept', 'orders.mark_ready', 'orders.complete', 'orders.cancel',
        'menu.view', 'payments.view', 'payments.verify'
    ) ON CONFLICT DO NOTHING;

    -- Kitchen Staff Permissions
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r_kitchen, id FROM public.permissions
    WHERE permission_key IN (
        'orders.view_all', 'orders.prepare', 'orders.mark_ready', 'menu.view'
    ) ON CONFLICT DO NOTHING;

    -- Customer Permissions
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r_customer, id FROM public.permissions
    WHERE permission_key IN (
        'orders.create', 'orders.view_own', 'menu.view'
    ) ON CONFLICT DO NOTHING;
END $$;

-- Drop permission aliases from the obsolete seed draft (the app uses these canonical keys).
DELETE FROM public.permissions
WHERE permission_key IN ('users.manage', 'menus.manage', 'orders.process', 'audit.view');

-- Seed Categories
INSERT INTO public.categories (id, name, name_kn, description, display_order, active) VALUES
('11111111-1111-1111-1111-111111111111', 'Sakleshpur Specials', 'ಸಕಲೇಶಪುರ ಸ್ಪೆಷಲ್ಸ್', 'Traditional Malnad & Sakleshpur heritage recipes made with aromatic spices and desi ghee', 1, true),
('22222222-2222-2222-2222-222222222222', 'Idli & Vade', 'ಇಡ್ಲಿ ಮತ್ತು ವಡೆ', 'Steamed soft idlis and crispy vades served with authentic coconut chutney and piping hot sambar', 2, true),
('33333333-3333-3333-3333-333333333333', 'Dosa & Baths', 'ದೋಸೆ ಮತ್ತು ಬಾತ್', 'Golden crisp butter dosas, traditional Chow Chow Bath and spicy Akki Roti', 3, true),
('44444444-4444-4444-4444-444444444444', 'Beverages', 'ಪಾನೀಯಗಳು', 'Authentic Chikmagalur & Sakleshpur estate filter coffee and tea', 4, true),
('55555555-5555-5555-5555-555555555555', 'Sweets & Snacks', 'ಸಿಹಿ ಮತ್ತು ತಿಂಡಿಗಳು', 'Traditional melt-in-mouth Mysore Pak, Kesari Bath and Malnad special snacks', 5, true)
ON CONFLICT (id) DO NOTHING;

-- Seed Menu Items
INSERT INTO public.menu_items (id, category_id, name, name_kn, description, description_kn, price, image_url, is_veg, available, featured, preparation_time_minutes) VALUES
(
    'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '22222222-2222-2222-2222-222222222222',
    'Thatte Idli',
    'ತಟ್ಟೆ ಇಡ್ಲಿ',
    'Signature plate-sized fluffy steamed idli topped with fresh butter, served with spicy red chutney and fragrant hotel sambar.',
    'ತಾಜಾ ಬೆಣ್ಣೆ, ಕೆಂಪು ಚಟ್ನಿ ಮತ್ತು ಘಮಘಮಿಸುವ ಸಾಂಬಾರ್ ಜೊತೆಗೆ ಬಡಿಸುವ ಪ್ರಸಿದ್ಧ ಮೃದುವಾದ ತಟ್ಟೆ ಇಡ್ಲಿ.',
    40.00,
    'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
    true, true, true, 8
),
(
    'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '22222222-2222-2222-2222-222222222222',
    'Habbe Vade',
    'ಹಬ್ಬೆ ವಡೆ',
    'Traditional Malnad-style steamed lentil dumpling gently spiced with ginger, green chilies, curry leaves and fresh coconut.',
    'ಶುಂಠಿ, ಹಸಿಮೆಣಸು, ಕರಿಬೇವು ಮತ್ತು ತೆಂಗಿನಕಾಯಿಯೊಂದಿಗೆ ಸಾಂಪ್ರದಾಯಿಕ ಶೈಲಿಯಲ್ಲಿ ಹಬೆಯಲ್ಲಿ ಬೇಯಿಸಿದ ಪೌಷ್ಟಿಕ ವಡೆ.',
    30.00,
    'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800&auto=format&fit=crop&q=80',
    true, true, true, 10
),
(
    'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'Kaayi Idli',
    'ಕಾಯಿ ಇಡ್ಲಿ',
    'Special Sakleshpur heritage idli made with fresh grated tender coconut batter, steamed to delicate softness.',
    'ಸಕಲೇಶಪುರದ ಸಾಂಪ್ರದಾಯಿಕ ಖಾದ್ಯ, ತಾಜಾ ತೆಂಗಿನಕಾಯಿ ತುರಿಯಿಂದ ಸಿದ್ಧಪಡಿಸಿದ ಸುವಾಸನಾಯುಕ್ತ ಮೃದು ಇಡ್ಲಿ.',
    50.00,
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80',
    true, true, true, 10
),
(
    'a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '44444444-4444-4444-4444-444444444444',
    'Filter Coffee',
    'ಫಿಲ್ಟರ್ ಕಾಫಿ',
    'Authentic South Indian degree filter coffee brewed from freshly roasted Sakleshpur plantation beans and frothy milk.',
    'ಸಕಲೇಶಪುರದ ತೋಟದ ಕಾಫಿ ಪುಡಿಯಿಂದ ತಾಜಾ ಡಿಕಾಕ್ಷನ್ ಮತ್ತು ಕೆನೆ ಹಾಲಿನೊಂದಿಗೆ ತಯಾರಿಸಿದ ಅಸಲಿ ಫಿಲ್ಟರ್ ಕಾಫಿ.',
    20.00,
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
    true, true, true, 5
),
(
    'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '44444444-4444-4444-4444-444444444444',
    'Estate Special Tea',
    'ಚಹಾ',
    'Aromatic hill-grown tea infused with fresh crushed cardamom and ginger.',
    'ಏಲಕ್ಕಿ ಮತ್ತು ಶುಂಠಿ ಪರಿಮಳಯುಕ್ತ ಬೆಟ್ಟದ ಸುವಾಸನೆಯ ತಾಜಾ ಚಹಾ.',
    15.00,
    'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=80',
    true, true, false, 5
),
(
    'a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '22222222-2222-2222-2222-222222222222',
    'Idli Vade Combo',
    'ಇಡ್ಲಿ ವಡೆ ಕಾಂಬೊ',
    '1 Soft Thatte Idli and 1 Crispy Uddina Vade served with generous dollops of butter, two chutneys and hot sambar.',
    '೧ ಮೃದು ತಟ್ಟೆ ಇಡ್ಲಿ ಮತ್ತು ೧ ಗರಿಗರಿ ಉದ್ದಿನ ವಡೆ ಜೊತೆಗೆ ಬೆಣ್ಣೆ, ೨ ಚಟ್ನಿ ಮತ್ತು ಬಿಸಿ ಸಾಂಬಾರ್.',
    60.00,
    'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
    true, true, true, 8
),
(
    'a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '22222222-2222-2222-2222-222222222222',
    'Vade Combo (2 Pcs)',
    'ವಡೆ ಕಾಂಬೊ (೨ ಪೀಸ್)',
    'Pair of golden crispy Habbe and Uddina Vades served with mint chutney and spiced coconut chutney.',
    'ಗರಿಗರಿಯಾದ ೨ ವಡೆಗಳು ಪುದೀನಾ ಮತ್ತು ತೆಂಗಿನಕಾಯಿ ಚಟ್ನಿ ಜೊತೆಗೆ.',
    50.00,
    'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800&auto=format&fit=crop&q=80',
    true, true, false, 8
),
(
    'a8888888-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '33333333-3333-3333-3333-333333333333',
    'Chow Chow Bath',
    'ಚೌ ಚೌ ಬಾತ್',
    'Classic Karnataka breakfast pair: savory spicy Khara Bath loaded with veggies and sweet melt-in-mouth Kesari Bath with pure ghee.',
    'ತುಪ್ಪದ ಸವಿ ಕೀಸರಿ ಬಾತ್ ಮತ್ತು ಖಾರವಾದ ಉಪ್ಪಿಟ್ಟು ಜೊತೆಯಾಗಿ ಬಡಿಸುವ ಸಾಂಪ್ರದಾಯಿಕ ಚೌ ಚೌ ಬಾತ್.',
    55.00,
    'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
    true, true, true, 8
),
(
    'a9999999-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '33333333-3333-3333-3333-333333333333',
    'Benne Masala Dosa',
    'ಬೆಣ್ಣೆ ಮಸಾಲೆ ದೋಸೆ',
    'Crisp golden dosa roasted with dollops of fresh white butter, stuffed with fragrant potato palya.',
    'ತಾಜಾ ಬಿಳಿ ಬೆಣ್ಣೆಯಲ್ಲಿ ಹುರಿದ ಗರಿಗರಿ ದೋಸೆ, ರುಚಿಕರ ಆಲೂಗೆಡ್ಡೆ ಪಲ್ಯದೊಂದಿಗೆ.',
    70.00,
    'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
    true, true, true, 12
),
(
    'baaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '55555555-5555-5555-5555-555555555555',
    'Desi Ghee Mysore Pak',
    'ತುಪ್ಪದ ಮೈಸೂರು ಪಾಕ್',
    'Authentic royal melt-in-mouth gram flour sweet prepared with rich cow ghee and cardamom.',
    'ಶುದ್ಧ ಹಸುವಿನ ತುಪ್ಪ ಮತ್ತು ಕಡಲೆಹಿಟ್ಟಿನಿಂದ ಸಿದ್ಧಪಡಿಸಿದ ನಾಲಿಗೆಯಲ್ಲಿ ಕರಗುವ ಮೈಸೂರು ಪಾಕ್.',
    35.00,
    'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=800&auto=format&fit=crop&q=80',
    true, true, false, 2
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. Row Level Security (RLS) Policies
-- ----------------------------------------------------------------------------

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_token_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user has a specific permission
CREATE OR REPLACE FUNCTION public.auth_has_permission(p_perm TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.user_profiles up ON up.id = ur.user_id AND up.is_active = TRUE
        JOIN public.role_permissions rp ON ur.role_id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid()
          AND p.permission_key = p_perm
    );
$$;

-- Helper function to check role
CREATE OR REPLACE FUNCTION public.auth_has_role(p_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.user_profiles up ON up.id = ur.user_id AND up.is_active = TRUE
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND r.name = p_role
    );
$$;

-- Categories & Menu Items: Anyone (including unauthenticated guests) can view active items
DROP POLICY IF EXISTS "Public can view active categories" ON public.categories;
CREATE POLICY "Public can view active categories" ON public.categories
    FOR SELECT USING (active = true OR public.auth_has_permission('menu.update'));

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories
    FOR ALL USING (public.auth_has_permission('menu.create') OR public.auth_has_permission('menu.update') OR public.auth_has_permission('menu.delete'))
    WITH CHECK (public.auth_has_permission('menu.create') OR public.auth_has_permission('menu.update'));

DROP POLICY IF EXISTS "Public can view menu items" ON public.menu_items;
CREATE POLICY "Public can view menu items" ON public.menu_items
    FOR SELECT USING (available = true OR public.auth_has_permission('menu.update'));

DROP POLICY IF EXISTS "Admins can manage menu items" ON public.menu_items;
CREATE POLICY "Admins can manage menu items" ON public.menu_items
    FOR ALL USING (public.auth_has_permission('menu.create') OR public.auth_has_permission('menu.update') OR public.auth_has_permission('menu.delete'))
    WITH CHECK (public.auth_has_permission('menu.create') OR public.auth_has_permission('menu.update'));

-- Orders:
-- 1. Anyone can insert an order via create_order_with_token function (SECURITY DEFINER)
-- 2. Staff/Admins with 'orders.view_all' can view all orders
-- 3. Customers can view their own orders if authenticated
-- 4. Tracking order via tracking_token is supported for guests
DROP POLICY IF EXISTS "Staff can view all orders" ON public.orders;
CREATE POLICY "Staff can view all orders" ON public.orders
    FOR SELECT USING (
        public.auth_has_permission('orders.view_all')
        OR (auth.uid() IS NOT NULL AND customer_id = auth.uid())
    );

DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;
CREATE POLICY "Staff can update orders" ON public.orders
    FOR UPDATE USING (
        public.auth_has_permission('orders.accept')
        OR public.auth_has_permission('orders.prepare')
        OR public.auth_has_permission('orders.mark_ready')
        OR public.auth_has_permission('orders.complete')
    );

-- Order Items: Viewable if parent order is viewable
DROP POLICY IF EXISTS "Order items viewable with order" ON public.order_items;
CREATE POLICY "Order items viewable with order" ON public.order_items
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id)
    );

-- Audit logs: Read-only for authorized managers, never modified by normal clients
DROP POLICY IF EXISTS "Authorized users can view audit logs" ON public.audit_logs;
CREATE POLICY "Authorized users can view audit logs" ON public.audit_logs
    FOR SELECT USING (public.auth_has_permission('audit_logs.view'));

-- ----------------------------------------------------------------------------
-- 7. User accounts, secure authentication RPCs, and role management
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL CHECK (length(trim(full_name)) >= 2),
    email TEXT NOT NULL,
    mobile TEXT,
    roles JSONB NOT NULL DEFAULT '["STAFF"]'::jsonb,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_accounts_email_lower ON public.user_accounts (lower(email));
CREATE INDEX IF NOT EXISTS idx_user_accounts_active ON public.user_accounts (is_active);
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_accounts FROM anon, authenticated;
DROP POLICY IF EXISTS "Allow public read user_accounts" ON public.user_accounts;
DROP POLICY IF EXISTS "Allow public insert user_accounts" ON public.user_accounts;
DROP POLICY IF EXISTS "Allow public update user_accounts" ON public.user_accounts;
DROP POLICY IF EXISTS "Allow public delete user_accounts" ON public.user_accounts;

-- Never expose password hashes through PostgREST. Credentials are checked in this RPC,
-- which returns only the account fields needed by the client after a valid password.
CREATE OR REPLACE FUNCTION public.authenticate_user(p_email TEXT, p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_user public.user_accounts%ROWTYPE;
BEGIN
    IF p_email IS NULL OR p_password IS NULL OR length(p_password) = 0 THEN
        RETURN NULL;
    END IF;

    SELECT * INTO v_user
    FROM public.user_accounts
    WHERE lower(email) = lower(trim(p_email))
      AND is_active = TRUE
      AND password_hash = crypt(p_password, password_hash)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN jsonb_build_object(
        'id', v_user.id,
        'full_name', v_user.full_name,
        'email', v_user.email,
        'mobile', v_user.mobile,
        'roles', v_user.roles,
        'permissions', v_user.permissions,
        'is_active', v_user.is_active,
        'created_at', v_user.created_at,
        'updated_at', v_user.updated_at
    );
END;
$$;

REVOKE ALL ON FUNCTION public.authenticate_user(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.authenticate_user(TEXT, TEXT) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_user_accounts()
RETURNS SETOF JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.auth_has_permission('users.view') THEN
        RAISE EXCEPTION 'Permission denied: users.view is required' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT jsonb_build_object(
        'id', u.id, 'full_name', u.full_name, 'email', u.email, 'mobile', u.mobile,
        'roles', u.roles, 'permissions', u.permissions, 'is_active', u.is_active,
        'created_at', u.created_at, 'updated_at', u.updated_at
    )
    FROM public.user_accounts u
    ORDER BY u.full_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_user_account(
    p_full_name TEXT,
    p_email TEXT,
    p_mobile TEXT,
    p_password TEXT,
    p_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_email TEXT := lower(trim(p_email));
    v_permissions JSONB;
    v_account public.user_accounts%ROWTYPE;
BEGIN
    IF NOT public.auth_has_permission('users.create') THEN
        RAISE EXCEPTION 'Permission denied: users.create is required' USING ERRCODE = '42501';
    END IF;
    IF p_role = 'SUPER_ADMIN' AND NOT public.auth_has_role('SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Only a Super Admin can create another Super Admin' USING ERRCODE = '42501';
    END IF;
    IF p_full_name IS NULL OR length(trim(p_full_name)) < 2
       OR v_email IS NULL OR v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
       OR p_password IS NULL OR length(p_password) < 8 THEN
        RAISE EXCEPTION 'Name, valid email, and password of at least 8 characters are required' USING ERRCODE = '22023';
    END IF;

    SELECT COALESCE(jsonb_agg(p.permission_key ORDER BY p.permission_key), '[]'::jsonb)
      INTO v_permissions
    FROM public.roles r
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE r.name = p_role;
    IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.roles WHERE name = p_role) THEN
        RAISE EXCEPTION 'Unknown role: %', p_role USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.user_accounts (full_name, email, mobile, roles, permissions, password_hash)
    VALUES (trim(p_full_name), v_email, NULLIF(trim(p_mobile), ''), jsonb_build_array(p_role),
            v_permissions, crypt(p_password, gen_salt('bf', 12)))
    RETURNING * INTO v_account;

    RETURN jsonb_build_object('id', v_account.id, 'full_name', v_account.full_name,
      'email', v_account.email, 'mobile', v_account.mobile, 'roles', v_account.roles,
      'permissions', v_account.permissions, 'is_active', v_account.is_active,
      'created_at', v_account.created_at, 'updated_at', v_account.updated_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_user_account_role(p_user_id UUID, p_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_permissions JSONB;
BEGIN
    IF NOT public.auth_has_permission('roles.assign') THEN
        RAISE EXCEPTION 'Permission denied: roles.assign is required' USING ERRCODE = '42501';
    END IF;
    IF p_role = 'SUPER_ADMIN' AND NOT public.auth_has_role('SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Only a Super Admin can assign the Super Admin role' USING ERRCODE = '42501';
    END IF;

    SELECT COALESCE(jsonb_agg(p.permission_key ORDER BY p.permission_key), '[]'::jsonb)
      INTO v_permissions
    FROM public.roles r
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE r.name = p_role;
    IF NOT EXISTS (SELECT 1 FROM public.roles WHERE name = p_role) THEN
        RAISE EXCEPTION 'Unknown role: %', p_role USING ERRCODE = '22023';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.user_accounts
        WHERE id = p_user_id AND roles @> '["SUPER_ADMIN"]'::jsonb
    ) AND p_role <> 'SUPER_ADMIN' AND NOT public.auth_has_role('SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Only a Super Admin can modify a Super Admin role' USING ERRCODE = '42501';
    END IF;

    UPDATE public.user_accounts
    SET roles = jsonb_build_array(p_role), permissions = v_permissions, updated_at = NOW()
    WHERE id = p_user_id;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_user_account_active(p_user_id UUID, p_is_active BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.auth_has_permission('users.deactivate') THEN
        RAISE EXCEPTION 'Permission denied: users.deactivate is required' USING ERRCODE = '42501';
    END IF;
    IF EXISTS (SELECT 1 FROM public.user_accounts WHERE id = p_user_id AND roles @> '["SUPER_ADMIN"]'::jsonb)
       AND NOT public.auth_has_role('SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Only a Super Admin can modify a Super Admin account' USING ERRCODE = '42501';
    END IF;
    IF p_is_active = FALSE AND EXISTS (
        SELECT 1 FROM public.user_accounts target
        WHERE target.id = p_user_id AND target.is_active
          AND target.roles @> '["SUPER_ADMIN"]'::jsonb
          AND (SELECT count(*) FROM public.user_accounts active_owner
               WHERE active_owner.is_active AND active_owner.roles @> '["SUPER_ADMIN"]'::jsonb) <= 1
    ) THEN
        RAISE EXCEPTION 'Cannot deactivate the last active Super Admin' USING ERRCODE = '42501';
    END IF;
    UPDATE public.user_accounts SET is_active = p_is_active, updated_at = NOW() WHERE id = p_user_id;
    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_account(
    p_user_id UUID,
    p_full_name TEXT,
    p_email TEXT,
    p_mobile TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.auth_has_permission('users.update') THEN
        RAISE EXCEPTION 'Permission denied: users.update is required' USING ERRCODE = '42501';
    END IF;
    IF EXISTS (SELECT 1 FROM public.user_accounts WHERE id = p_user_id AND roles @> '["SUPER_ADMIN"]'::jsonb)
       AND NOT public.auth_has_role('SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Only a Super Admin can modify a Super Admin account' USING ERRCODE = '42501';
    END IF;
    IF p_full_name IS NULL OR length(trim(p_full_name)) < 2
       OR p_email IS NULL OR trim(p_email) !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
        RAISE EXCEPTION 'Name and valid email are required' USING ERRCODE = '22023';
    END IF;
    UPDATE public.user_accounts
    SET full_name = trim(p_full_name), email = lower(trim(p_email)),
        mobile = NULLIF(trim(p_mobile), ''), updated_at = NOW()
    WHERE id = p_user_id;
    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_user_account_password(p_user_id UUID, p_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF NOT public.auth_has_permission('users.update') THEN
        RAISE EXCEPTION 'Permission denied: users.update is required' USING ERRCODE = '42501';
    END IF;
    IF EXISTS (SELECT 1 FROM public.user_accounts WHERE id = p_user_id AND roles @> '["SUPER_ADMIN"]'::jsonb)
       AND NOT public.auth_has_role('SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Only a Super Admin can change a Super Admin password' USING ERRCODE = '42501';
    END IF;
    IF p_password IS NULL OR length(p_password) < 8 THEN
        RAISE EXCEPTION 'Password must contain at least 8 characters' USING ERRCODE = '22023';
    END IF;
    UPDATE public.user_accounts
    SET password_hash = crypt(p_password, gen_salt('bf', 12)), updated_at = NOW()
    WHERE id = p_user_id;
    RETURN FOUND;
END;
$$;

-- Guest order tracking uses the unguessable token as a capability. Direct table reads
-- remain protected by RLS; this function only returns the row matching that token.
CREATE OR REPLACE FUNCTION public.get_order_by_tracking_token(p_tracking_token TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT jsonb_build_object(
        'order', to_jsonb(o),
        'items', COALESCE((
            SELECT jsonb_agg(to_jsonb(oi) ORDER BY oi.created_at, oi.id)
            FROM public.order_items oi WHERE oi.order_id = o.id
        ), '[]'::jsonb)
    )
    FROM public.orders o
    WHERE o.tracking_token = p_tracking_token
    LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_order_by_tracking_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_by_tracking_token(TEXT) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_user_accounts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_user_account(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_account_role(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_account_active(UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_user_account(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_account_password(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_accounts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_account(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_account_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_account_active(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_account(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_account_password(UUID, TEXT) TO authenticated;

-- Production setup does not seed known demo credentials.
-- Existing user_accounts records are retained but are not a login authority.

-- ----------------------------------------------------------------------------
-- 8. Complete RLS policy coverage and automatic Supabase Auth profiles
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.roles;
CREATE POLICY "Authenticated users can view roles" ON public.roles FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "Authenticated users can view permissions" ON public.permissions;
CREATE POLICY "Authenticated users can view permissions" ON public.permissions FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "Authenticated users can view role permissions" ON public.role_permissions;
CREATE POLICY "Authenticated users can view role permissions" ON public.role_permissions FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "Authorized admins manage roles" ON public.roles;
CREATE POLICY "Authorized admins manage roles" ON public.roles FOR ALL TO authenticated
  USING (public.auth_has_permission('roles.manage')) WITH CHECK (public.auth_has_permission('roles.manage'));
DROP POLICY IF EXISTS "Authorized admins manage permissions" ON public.permissions;
CREATE POLICY "Authorized admins manage permissions" ON public.permissions FOR ALL TO authenticated
  USING (public.auth_has_permission('roles.manage')) WITH CHECK (public.auth_has_permission('roles.manage'));
DROP POLICY IF EXISTS "Authorized admins manage role permissions" ON public.role_permissions;
CREATE POLICY "Authorized admins manage role permissions" ON public.role_permissions FOR ALL TO authenticated
  USING (public.auth_has_permission('roles.manage')) WITH CHECK (public.auth_has_permission('roles.manage'));

DROP POLICY IF EXISTS "Users can view own profile or authorized users" ON public.user_profiles;
CREATE POLICY "Users can view own profile or authorized users" ON public.user_profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.auth_has_permission('users.view'));
DROP POLICY IF EXISTS "Users can update own profile or authorized users" ON public.user_profiles;
CREATE POLICY "Users can update own profile or authorized users" ON public.user_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.auth_has_permission('users.update'))
  WITH CHECK (id = auth.uid() OR public.auth_has_permission('users.update'));
DROP POLICY IF EXISTS "Authorized users manage user roles" ON public.user_roles;
CREATE POLICY "Authorized users manage user roles" ON public.user_roles FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.auth_has_permission('roles.assign'))
  WITH CHECK (public.auth_has_permission('roles.assign'));

DROP POLICY IF EXISTS "Authorized users view order payments" ON public.payments;
CREATE POLICY "Authorized users view order payments" ON public.payments FOR SELECT TO authenticated
  USING (public.auth_has_permission('payments.view') OR EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = payments.order_id AND o.customer_id = auth.uid()
  ));
DROP POLICY IF EXISTS "Authorized users verify payments" ON public.payments;
CREATE POLICY "Authorized users verify payments" ON public.payments FOR ALL TO authenticated
  USING (public.auth_has_permission('payments.verify')) WITH CHECK (public.auth_has_permission('payments.verify'));

DROP POLICY IF EXISTS "Users can view related order history" ON public.order_status_history;
CREATE POLICY "Users can view related order history" ON public.order_status_history FOR SELECT TO authenticated
  USING (public.auth_has_permission('orders.view_all') OR EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = order_status_history.order_id AND o.customer_id = auth.uid()
  ));
DROP POLICY IF EXISTS "Authorized users append order history" ON public.order_status_history;
CREATE POLICY "Authorized users append order history" ON public.order_status_history FOR INSERT TO authenticated
  WITH CHECK (public.auth_has_permission('orders.accept') OR public.auth_has_permission('orders.prepare')
    OR public.auth_has_permission('orders.mark_ready') OR public.auth_has_permission('orders.complete'));

DROP POLICY IF EXISTS "Users can append own audit logs" ON public.audit_logs;
CREATE POLICY "Users can append own audit logs" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- Customers created through Supabase Auth receive a profile and the CUSTOMER role.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_customer_role UUID;
BEGIN
    INSERT INTO public.user_profiles (id, full_name, email, is_active)
    VALUES (NEW.id,
      COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), NULLIF(split_part(COALESCE(NEW.email, NEW.phone, ''), '@', 1), ''), 'New user'),
      NEW.email, TRUE)
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

    SELECT id INTO v_customer_role FROM public.roles WHERE name = 'CUSTOMER';
    IF v_customer_role IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role_id) VALUES (NEW.id, v_customer_role)
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Backfill profiles and the least-privileged role for Auth users that predate this file.
INSERT INTO public.user_profiles (id, full_name, email, is_active)
SELECT u.id,
  COALESCE(NULLIF(trim(u.raw_user_meta_data->>'full_name'), ''), NULLIF(split_part(COALESCE(u.email, u.phone, ''), '@', 1), ''), 'New user'),
  u.email, TRUE
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM auth.users u
CROSS JOIN public.roles r
WHERE r.name = 'CUSTOMER'
ON CONFLICT DO NOTHING;

-- Run from the Supabase SQL editor after creating the owner's Auth account.
-- Example: SELECT public.assign_initial_super_admin('<auth.users UUID>');
CREATE OR REPLACE FUNCTION public.assign_initial_super_admin(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role_id UUID;
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
        WHERE r.name = 'SUPER_ADMIN'
    ) THEN
        RAISE EXCEPTION 'A Super Admin is already assigned';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'Create this user in Supabase Auth before assigning the first Super Admin';
    END IF;
    SELECT id INTO STRICT v_role_id FROM public.roles WHERE name = 'SUPER_ADMIN';
    DELETE FROM public.user_roles WHERE user_id = p_user_id;
    INSERT INTO public.user_roles (user_id, role_id) VALUES (p_user_id, v_role_id)
    ON CONFLICT DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.assign_initial_super_admin(UUID) FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- End of consolidated setup
-- ----------------------------------------------------------------------------


-- Source: 20261202000000_auth_profile_role_sync.sql
-- Keep Auth identities and the application's profile / RBAC tables in sync.
-- This also backfills Auth users created before the trigger was installed.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_customer_role UUID;
BEGIN
    INSERT INTO public.user_profiles (id, full_name, mobile, email, is_active)
    VALUES (
        NEW.id,
        COALESCE(
            NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
            NULLIF(split_part(COALESCE(NEW.email, NEW.phone, ''), '@', 1), ''),
            'New user'
        ),
        NULLIF(trim(NEW.raw_user_meta_data->>'mobile'), ''),
        NEW.email,
        TRUE
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        mobile = COALESCE(EXCLUDED.mobile, public.user_profiles.mobile),
        email = EXCLUDED.email;

    SELECT id INTO v_customer_role FROM public.roles WHERE name = 'CUSTOMER';
    IF v_customer_role IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role_id)
        VALUES (NEW.id, v_customer_role)
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

INSERT INTO public.user_profiles (id, full_name, mobile, email, is_active)
SELECT
    u.id,
    COALESCE(
        NULLIF(trim(u.raw_user_meta_data->>'full_name'), ''),
        NULLIF(split_part(COALESCE(u.email, u.phone, ''), '@', 1), ''),
        'New user'
    ),
    NULLIF(trim(u.raw_user_meta_data->>'mobile'), ''),
    u.email,
    TRUE
FROM auth.users AS u
ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(NULLIF(public.user_profiles.full_name, ''), EXCLUDED.full_name),
    mobile = COALESCE(public.user_profiles.mobile, EXCLUDED.mobile),
    email = EXCLUDED.email;

INSERT INTO public.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM auth.users AS u
CROSS JOIN public.roles AS r
WHERE r.name = 'CUSTOMER'
ON CONFLICT DO NOTHING;

-- The first account created in Auth starts as CUSTOMER through the trigger.
-- Promoting that account must replace CUSTOMER so its primary role is unambiguous.
CREATE OR REPLACE FUNCTION public.assign_initial_super_admin(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role_id UUID;
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE r.name = 'SUPER_ADMIN'
    ) THEN
        RAISE EXCEPTION 'A Super Admin is already assigned';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'Create this user in Supabase Auth before assigning the first Super Admin';
    END IF;
    SELECT id INTO STRICT v_role_id FROM public.roles WHERE name = 'SUPER_ADMIN';
    DELETE FROM public.user_roles WHERE user_id = p_user_id;
    INSERT INTO public.user_roles (user_id, role_id) VALUES (p_user_id, v_role_id);
END;
$$;
REVOKE ALL ON FUNCTION public.assign_initial_super_admin(UUID) FROM PUBLIC, anon, authenticated;


-- Source: 20261203000000_order_persistence.sql
-- Persist checkout orders atomically and make database prices authoritative.
CREATE OR REPLACE FUNCTION public.create_order_with_token(
    p_customer_name TEXT,
    p_customer_mobile TEXT,
    p_order_type TEXT,
    p_table_number TEXT,
    p_subtotal DECIMAL,
    p_tax_amount DECIMAL,
    p_total_amount DECIMAL,
    p_payment_method TEXT,
    p_payment_status TEXT,
    p_notes TEXT,
    p_items JSONB,
    p_customer_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_seq INT;
    v_token_str TEXT;
    v_tracking_token TEXT;
    v_order_id UUID;
    v_customer_id UUID := auth.uid();
    v_item JSONB;
    v_menu_item public.menu_items%ROWTYPE;
    v_quantity INT;
    v_subtotal NUMERIC(10,2) := 0;
    v_tax_amount NUMERIC(10,2);
    v_total_amount NUMERIC(10,2);
    v_max_prep INT := 10;
BEGIN
    IF NULLIF(trim(p_customer_name), '') IS NULL OR length(regexp_replace(COALESCE(p_customer_mobile, ''), '[^0-9]', '', 'g')) < 10 THEN
        RAISE EXCEPTION 'Customer name and a valid mobile number are required' USING ERRCODE = '22023';
    END IF;
    IF p_order_type NOT IN ('DINE_IN', 'TAKEAWAY') OR p_payment_method NOT IN ('UPI', 'CASH') THEN
        RAISE EXCEPTION 'Invalid order type or payment method' USING ERRCODE = '22023';
    END IF;
    IF p_payment_status NOT IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED') THEN
        RAISE EXCEPTION 'Invalid payment status' USING ERRCODE = '22023';
    END IF;
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 100 THEN
        RAISE EXCEPTION 'An order must contain between 1 and 100 items' USING ERRCODE = '22023';
    END IF;

    -- Validate availability and calculate totals from current database menu prices.
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
        IF COALESCE(v_item->>'menu_item_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            RAISE EXCEPTION 'Invalid menu item reference' USING ERRCODE = '22023';
        END IF;
        v_quantity := (v_item->>'quantity')::INT;
        IF v_quantity < 1 OR v_quantity > 100 THEN
            RAISE EXCEPTION 'Item quantity must be between 1 and 100' USING ERRCODE = '22023';
        END IF;
        SELECT * INTO v_menu_item FROM public.menu_items
        WHERE id = (v_item->>'menu_item_id')::UUID AND available = TRUE
        FOR SHARE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'A selected menu item is unavailable' USING ERRCODE = '22023';
        END IF;
        v_subtotal := v_subtotal + (v_menu_item.price * v_quantity);
        v_max_prep := GREATEST(v_max_prep, COALESCE(v_menu_item.preparation_time_minutes, 10));
    END LOOP;
    v_tax_amount := round(v_subtotal * 0.05, 2);
    v_total_amount := v_subtotal + v_tax_amount;

    INSERT INTO public.daily_token_sequences (token_date, last_sequence)
    VALUES (v_today, 1)
    ON CONFLICT (token_date)
    DO UPDATE SET last_sequence = daily_token_sequences.last_sequence + 1
    RETURNING last_sequence INTO v_seq;

    v_token_str := 'DP-' || LPAD(v_seq::TEXT, 3, '0');
    v_tracking_token := encode(gen_random_bytes(16), 'hex');

    INSERT INTO public.orders (
        token_number, token_date, tracking_token, customer_id, customer_name,
        customer_mobile, order_type, table_number, subtotal, tax_amount,
        total_amount, payment_method, payment_status, order_status, notes,
        estimated_prep_time_minutes
    ) VALUES (
        v_token_str, v_today, v_tracking_token, v_customer_id, trim(p_customer_name),
        regexp_replace(p_customer_mobile, '[^0-9]', '', 'g'), p_order_type,
        CASE WHEN p_order_type = 'DINE_IN' THEN NULLIF(trim(p_table_number), '') ELSE NULL END,
        v_subtotal, v_tax_amount, v_total_amount, p_payment_method, p_payment_status,
        'PLACED', NULLIF(trim(p_notes), ''), v_max_prep
    ) RETURNING id INTO v_order_id;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
        SELECT * INTO STRICT v_menu_item FROM public.menu_items
        WHERE id = (v_item->>'menu_item_id')::UUID AND available = TRUE;
        v_quantity := (v_item->>'quantity')::INT;
        INSERT INTO public.order_items (
            order_id, menu_item_id, item_name, item_name_kn, quantity, unit_price, total_price
        ) VALUES (
            v_order_id, v_menu_item.id, v_menu_item.name, v_menu_item.name_kn,
            v_quantity, v_menu_item.price, v_menu_item.price * v_quantity
        );
    END LOOP;

    INSERT INTO public.order_status_history (order_id, previous_status, new_status, changed_by, changed_by_name, reason)
    VALUES (v_order_id, NULL, 'PLACED', v_customer_id, trim(p_customer_name), 'Order created successfully');

    RETURN jsonb_build_object(
        'order_id', v_order_id, 'token_number', v_token_str,
        'token_date', v_today, 'tracking_token', v_tracking_token,
        'status', 'PLACED', 'subtotal', v_subtotal,
        'tax_amount', v_tax_amount, 'total_amount', v_total_amount
    );
END;
$$;
REVOKE ALL ON FUNCTION public.create_order_with_token(TEXT, TEXT, TEXT, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_with_token(TEXT, TEXT, TEXT, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, JSONB, UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.advance_order_status(
    p_order_id UUID,
    p_new_status TEXT,
    p_actor_name TEXT,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order public.orders%ROWTYPE;
    v_permission TEXT;
BEGIN
    v_permission := CASE p_new_status
        WHEN 'ACCEPTED' THEN 'orders.accept'
        WHEN 'PREPARING' THEN 'orders.prepare'
        WHEN 'READY' THEN 'orders.mark_ready'
        WHEN 'COMPLETED' THEN 'orders.complete'
        WHEN 'CANCELLED' THEN 'orders.cancel'
        ELSE NULL
    END;
    IF v_permission IS NULL OR NOT public.auth_has_permission(v_permission) THEN
        RAISE EXCEPTION 'Not authorized to make this order status change' USING ERRCODE = '42501';
    END IF;
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN RETURN FALSE; END IF;

    IF NOT (
        (v_order.order_status = 'PLACED' AND p_new_status IN ('ACCEPTED', 'CANCELLED')) OR
        (v_order.order_status = 'ACCEPTED' AND p_new_status IN ('PREPARING', 'CANCELLED')) OR
        (v_order.order_status = 'PREPARING' AND p_new_status IN ('READY', 'CANCELLED')) OR
        (v_order.order_status = 'READY' AND p_new_status IN ('COMPLETED', 'CANCELLED'))
    ) THEN
        RAISE EXCEPTION 'Invalid order status transition: % -> %', v_order.order_status, p_new_status USING ERRCODE = '22023';
    END IF;

    UPDATE public.orders SET order_status = p_new_status, updated_at = NOW() WHERE id = p_order_id;
    INSERT INTO public.order_status_history (order_id, previous_status, new_status, changed_by, changed_by_name, reason)
    VALUES (p_order_id, v_order.order_status, p_new_status, auth.uid(), NULLIF(trim(p_actor_name), ''), NULLIF(trim(p_reason), ''));
    RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.advance_order_status(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.advance_order_status(UUID, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_order_payment_status(
    p_order_id UUID,
    p_payment_status TEXT,
    p_actor_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order public.orders%ROWTYPE;
BEGIN
    IF p_payment_status = 'PAID' THEN
        IF NOT public.auth_has_permission('payments.verify') THEN
            RAISE EXCEPTION 'Payment verification permission is required' USING ERRCODE = '42501';
        END IF;
    ELSIF p_payment_status = 'REFUNDED' THEN
        IF NOT public.auth_has_permission('payments.refund') THEN
            RAISE EXCEPTION 'Payment refund permission is required' USING ERRCODE = '42501';
        END IF;
    ELSE
        RAISE EXCEPTION 'Only payment settlement or refund is supported' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    IF p_payment_status = 'PAID' AND v_order.payment_method <> 'CASH' THEN
        RAISE EXCEPTION 'Only cash orders can be settled from the counter' USING ERRCODE = '22023';
    END IF;

    UPDATE public.orders SET payment_status = p_payment_status, updated_at = NOW() WHERE id = p_order_id;
    INSERT INTO public.payments (order_id, payment_provider, amount, payment_status, verified_at)
    VALUES (p_order_id, CASE WHEN v_order.payment_method = 'CASH' THEN 'CASH' ELSE 'RAZORPAY' END,
        v_order.total_amount, p_payment_status, CASE WHEN p_payment_status = 'PAID' THEN NOW() ELSE NULL END);
    INSERT INTO public.order_status_history (order_id, previous_status, new_status, changed_by, changed_by_name, reason)
    VALUES (p_order_id, v_order.order_status, v_order.order_status, auth.uid(), NULLIF(trim(p_actor_name), ''), 'PAYMENT_' || p_payment_status);
    RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.set_order_payment_status(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_order_payment_status(UUID, TEXT, TEXT) TO authenticated;

-- Order mutations must go through the validated SECURITY DEFINER functions above.
REVOKE UPDATE ON public.orders FROM anon, authenticated;


-- Source: 20261204000000_fix_order_pgcrypto_search_path.sql
-- Ensure the order RPC can resolve pgcrypto when the extension is installed
-- in Supabase's extensions schema.
ALTER FUNCTION public.create_order_with_token(
    TEXT, TEXT, TEXT, TEXT, DECIMAL, DECIMAL, DECIMAL,
    TEXT, TEXT, TEXT, JSONB, UUID
) SET search_path TO public, extensions, pg_temp;


-- Legacy account/profile imports are retired. Auth and RBAC are authoritative.
-- Provision accounts using user-admin; do not overwrite profiles/roles from legacy rows.

-- Source: 20261207000000_legacy_auth_bridge.sql
-- Rate-limit legacy credential verification performed by the legacy-login
-- Edge Function. Password hashes are verified in that server function using
-- bcryptjs so existing $2b$ hashes are handled consistently.

CREATE TABLE IF NOT EXISTS public.legacy_auth_login_attempts (
    email TEXT PRIMARY KEY,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_until TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.legacy_auth_login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.legacy_auth_login_attempts FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.allow_legacy_auth_attempt(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_email TEXT := lower(trim(COALESCE(p_email, '')));
    v_attempts INTEGER;
    v_locked_until TIMESTAMPTZ;
BEGIN
    IF v_email = '' THEN RETURN FALSE; END IF;

    SELECT failed_attempts, locked_until
    INTO v_attempts, v_locked_until
    FROM public.legacy_auth_login_attempts
    WHERE email = v_email;

    IF v_locked_until IS NOT NULL AND v_locked_until > NOW() THEN
        RETURN FALSE;
    END IF;

    INSERT INTO public.legacy_auth_login_attempts (email, failed_attempts, window_started_at, locked_until, updated_at)
    VALUES (v_email, 1, NOW(), NULL, NOW())
    ON CONFLICT (email) DO UPDATE SET
        failed_attempts = CASE
            WHEN NOW() - public.legacy_auth_login_attempts.window_started_at > INTERVAL '15 minutes'
                THEN 1
            ELSE public.legacy_auth_login_attempts.failed_attempts + 1
        END,
        window_started_at = CASE
            WHEN NOW() - public.legacy_auth_login_attempts.window_started_at > INTERVAL '15 minutes'
                THEN NOW()
            ELSE public.legacy_auth_login_attempts.window_started_at
        END,
        locked_until = CASE
            WHEN NOW() - public.legacy_auth_login_attempts.window_started_at > INTERVAL '15 minutes'
                THEN NULL
            WHEN public.legacy_auth_login_attempts.failed_attempts + 1 >= 8
                THEN NOW() + INTERVAL '15 minutes'
            ELSE NULL
        END,
        updated_at = NOW()
    RETURNING failed_attempts, locked_until INTO v_attempts, v_locked_until;

    RETURN v_attempts <= 8 AND (v_locked_until IS NULL OR v_locked_until <= NOW());
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_legacy_auth_attempts(p_email TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    DELETE FROM public.legacy_auth_login_attempts
    WHERE email = lower(trim(COALESCE(p_email, '')));
$$;

-- The older RPC exposed account details and had no throttling.
REVOKE ALL ON FUNCTION public.authenticate_user(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.allow_legacy_auth_attempt(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clear_legacy_auth_attempts(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.allow_legacy_auth_attempt(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.clear_legacy_auth_attempts(TEXT) TO service_role;

COMMENT ON FUNCTION public.allow_legacy_auth_attempt(TEXT) IS
    'Atomically limits legacy-login attempts; called only by the legacy-login Edge Function.';


-- Source: 20261208000000_database_reports_and_settings.sql
-- Database-only operational settings and sales report access.

CREATE TABLE IF NOT EXISTS public.restaurant_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    restaurant_name TEXT NOT NULL CHECK (length(trim(restaurant_name)) > 0),
    tagline TEXT NOT NULL,
    tagline_kn TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT NOT NULL,
    upi_vpa TEXT NOT NULL,
    token_prefix TEXT NOT NULL CHECK (length(trim(token_prefix)) BETWEEN 1 AND 12),
    gst_rate NUMERIC(5,2) NOT NULL CHECK (gst_rate BETWEEN 0 AND 28),
    thermal_width TEXT NOT NULL CHECK (thermal_width IN ('58mm', '80mm')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
INSERT INTO public.restaurant_settings
(id, restaurant_name, tagline, tagline_kn, address, phone, upi_vpa, token_prefix, gst_rate, thermal_width)
VALUES (1, 'Datta Prasada', 'Authentic Sakleshpur Taste in Bangalore',
'ಬೆಂಗಳೂರಿನಲ್ಲಿ ಸಕಲೇಶಪುರದ ಅಸಲಿ ರುಚಿ',
'Balagere Main Road, Near Panathur Railway Bridge, Bangalore - 560087',
'+91 98450 12345', 'dattaprasada@icici', 'DP-', 5, '80mm')
ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.restaurant_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.restaurant_settings TO authenticated;
DROP POLICY IF EXISTS settings_read ON public.restaurant_settings;
CREATE POLICY settings_read ON public.restaurant_settings FOR SELECT TO authenticated
USING (public.auth_has_permission('settings.manage'));

CREATE OR REPLACE FUNCTION public.save_restaurant_settings(p_settings JSONB)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_old JSONB;
    v_new JSONB;
BEGIN
    IF NOT public.auth_has_permission('settings.manage') THEN
        RAISE EXCEPTION 'Permission denied: settings.manage is required' USING ERRCODE = '42501';
    END IF;
    SELECT to_jsonb(s) INTO v_old FROM public.restaurant_settings s WHERE id = 1 FOR UPDATE;
    UPDATE public.restaurant_settings SET
        restaurant_name = trim(p_settings->>'restaurant_name'),
        tagline = p_settings->>'tagline',
        tagline_kn = p_settings->>'tagline_kn',
        address = p_settings->>'address',
        phone = p_settings->>'phone',
        upi_vpa = p_settings->>'upi_vpa',
        token_prefix = trim(p_settings->>'token_prefix'),
        gst_rate = (p_settings->>'gst_rate')::NUMERIC,
        thermal_width = p_settings->>'thermal_width',
        updated_at = NOW(), updated_by = auth.uid()
    WHERE id = 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Restaurant settings have not been initialized'; END IF;
    SELECT to_jsonb(s) INTO v_new FROM public.restaurant_settings s WHERE id = 1;
    INSERT INTO public.audit_logs (actor_id, actor_name, action, entity_type, old_values, new_values)
    VALUES (auth.uid(), (SELECT full_name FROM public.user_profiles WHERE id = auth.uid()),
        'SETTINGS_UPDATED', 'SETTING', v_old, v_new);
END;
$$;
REVOKE ALL ON FUNCTION public.save_restaurant_settings(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_restaurant_settings(JSONB) TO authenticated;

-- Reports/dashboard use persisted order snapshots, with their own read grants.
DROP POLICY IF EXISTS reports_read_orders ON public.orders;
CREATE POLICY reports_read_orders ON public.orders FOR SELECT TO authenticated
USING (public.auth_has_permission('reports.view') OR public.auth_has_permission('dashboard.view'));
DROP POLICY IF EXISTS reports_read_order_items ON public.order_items;
CREATE POLICY reports_read_order_items ON public.order_items FOR SELECT TO authenticated
USING (public.auth_has_permission('reports.view') OR public.auth_has_permission('dashboard.view'));


-- Source: 20261209000000_database_sales_analytics.sql
-- PostgreSQL owns report filtering, totals and dish analytics.
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


-- Source: 20261210000000_public_restaurant_profile.sql
-- Expose only customer-facing details, keeping operational settings private.
ALTER TABLE public.restaurant_settings ADD COLUMN IF NOT EXISTS opening_hours TEXT NOT NULL
DEFAULT 'Open Everyday: 6:30 AM – 10:30 PM';

CREATE OR REPLACE FUNCTION public.get_public_restaurant_profile()
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT jsonb_build_object(
        'restaurant_name', restaurant_name, 'tagline', tagline,
        'tagline_kn', tagline_kn, 'address', address,
        'phone', phone, 'opening_hours', opening_hours
    )
    FROM public.restaurant_settings WHERE id = 1;
$$;
REVOKE ALL ON FUNCTION public.get_public_restaurant_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_restaurant_profile() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.save_restaurant_settings(p_settings JSONB)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_old JSONB;
    v_new JSONB;
BEGIN
    IF NOT public.auth_has_permission('settings.manage') THEN
        RAISE EXCEPTION 'Permission denied: settings.manage is required' USING ERRCODE = '42501';
    END IF;
    SELECT to_jsonb(s) INTO v_old FROM public.restaurant_settings s WHERE id = 1 FOR UPDATE;
    UPDATE public.restaurant_settings SET
        restaurant_name = trim(p_settings->>'restaurant_name'),
        opening_hours = COALESCE(p_settings->>'opening_hours', opening_hours),
        tagline = p_settings->>'tagline',
        tagline_kn = p_settings->>'tagline_kn',
        address = p_settings->>'address',
        phone = p_settings->>'phone',
        upi_vpa = p_settings->>'upi_vpa',
        token_prefix = trim(p_settings->>'token_prefix'),
        gst_rate = (p_settings->>'gst_rate')::NUMERIC,
        thermal_width = p_settings->>'thermal_width',
        updated_at = NOW(), updated_by = auth.uid()
    WHERE id = 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Restaurant settings have not been initialized'; END IF;
    SELECT to_jsonb(s) INTO v_new FROM public.restaurant_settings s WHERE id = 1;
    INSERT INTO public.audit_logs (actor_id, actor_name, action, entity_type, old_values, new_values)
    VALUES (auth.uid(), (SELECT full_name FROM public.user_profiles WHERE id = auth.uid()),
        'SETTINGS_UPDATED', 'SETTING', v_old, v_new);
END;
$$;
REVOKE ALL ON FUNCTION public.save_restaurant_settings(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_restaurant_settings(JSONB) TO authenticated;


-- Source: 20261211000000_configurable_home_content.sql
ALTER TABLE public.restaurant_settings ADD COLUMN IF NOT EXISTS home_content JSONB NOT NULL DEFAULT '{}'::JSONB
CHECK (jsonb_typeof(home_content) = 'object');
UPDATE public.restaurant_settings SET home_content =
$home${"home_addressLabel": "Address", "home_addressLabel_kn": "ವಿಳಾಸ", "home_categoriesTitle": "Sacred Offerings", "home_categoriesTitle_kn": "ನಮ್ಮ ವಿಭಾಗಗಳು", "home_featuredTitle": "Customer Favorites", "home_featuredTitle_kn": "ಗ್ರಾಹಕರ ಅಚ್ಚುಮೆಚ್ಚಿನ ತಿಂಡಿಗಳು", "home_hoursLabel": "Service Timings", "home_hoursLabel_kn": "ಸಮಯಾವಧಿ", "home_locationTitle": "Visit Our Outlet", "home_locationTitle_kn": "ನಮ್ಮ ಉಪಾಹಾರ ಗೃಹಕ್ಕೆ ಭೇಟಿ ನೀಡಿ", "home_orderNow": "Order Food Now", "home_orderNow_kn": "ಈಗಲೇ ಆರ್ಡರ್ ಮಾಡಿ", "home_ourStoryP1": "Rooted in the lush hills of Sakleshpur and blessed by Lord Dattatreya, Datta Prasada brings time-honored Malnad breakfast culinary traditions straight to Balagere, Bangalore.", "home_ourStoryP1_kn": "ಸಕಲೇಶಪುರದ ಹಸಿರು ಬೆಟ್ಟಗಳ ಮಣ್ಣಿನ ರುಚಿ ಹಾಗೂ ದತ್ತಾತ್ರೇಯರ ಕೃಪೆಯೊಂದಿಗೆ, ದತ್ತ ಪ್ರಸಾದ ಮಲೆನಾಡಿನ ಪಾರಂಪರಿಕ ಉಪಹಾರಗಳನ್ನು ಬೆಂಗಳೂರಿನ ಬಾಲಗೆರೆಗೆ ತಂದಿದೆ.", "home_ourStoryP2": "Every batter is naturally stone-ground, every idli is steamed on clean cloth and fresh leaves, and our pure cow ghee is sourced from trusted local dairies. 100% Pure Vegetarian.", "home_ourStoryP2_kn": "ನೈಸರ್ಗಿಕ ಕಲ್ಲಿನಲ್ಲಿ ಬೀಸಿದ ಹಿಟ್ಟು, ಸ್ವಚ್ಛವಾದ ಬಟ್ಟೆ ಮತ್ತು ಬಾಳೆ ಎಲೆಯಲ್ಲಿ ಬೆಂದ ಇಡ್ಲಿಗಳು, ಮತ್ತು ಅಪ್ಪಟ ಹಸುವಿನ ತುಪ್ಪ. ೧೦೦% ಶುದ್ಧ ಸಸ್ಯಾಹಾರಿ.", "home_ourStoryTitle": "The Sakleshpur Heritage", "home_ourStoryTitle_kn": "ಸಕಲೇಶಪುರದ ಹಿನ್ನೆಲೆ", "home_phoneLabel": "Helpline & WhatsApp", "home_phoneLabel_kn": "ಸಹಾಯವಾಣಿ & ವಾಟ್ಸಾಪ್", "home_todaysSpecial": "Today's Sakleshpur Special", "home_todaysSpecial_kn": "ಇಂದಿನ ಸಕಲೇಶಪುರ ಸ್ಪೆಷಲ್", "home_viewMenu": "Explore Full Menu", "home_viewMenu_kn": "ಪೂರ್ಣ ಮೆನು ನೋಡಿ", "home_welcome": "Welcome to Datta Prasada", "home_welcome_kn": "ದತ್ತ ಪ್ರಸಾದಕ್ಕೆ ಆತ್ಮೀಯ ಸ್ವಾಗತ", "menu_addToCart": "Add to Cart", "menu_addToCart_kn": "ಸೇರಿಸಿ", "menu_prepTime": "mins prep", "menu_prepTime_kn": "ನಿಮಿಷ ತಯಾರಿ", "menu_subtitle": "Prepared fresh daily with traditional recipes and pure ingredients", "menu_subtitle_kn": "ಶುದ್ಧ ಸಾಮಗ್ರಿಗಳಿಂದ ಪ್ರತಿದಿನ ತಾಜಾವಾಗಿ ಸಿದ್ಧಪಡಿಸಲಾಗುವ ಖಾದ್ಯಗಳು", "nav_track": "Track Order", "nav_track_kn": "ಆರ್ಡರ್ ಟ್ರ್ಯಾಕ್", "hero_dish_title": "Steaming Thatte Idli", "hero_dish_title_kn": "ಬಿಸಿ ಬಿಸಿ ತಟ್ಟೆ ಇಡ್ಲಿ", "hero_dish_description": "Served with fresh farm butter, spicy red chutney, and fragrant sambar.", "hero_dish_description_kn": "ತಾಜಾ ಬಿಳಿ ಬೆಣ್ಣೆ ಮತ್ತು ಸಕಲೇಶಪುರದ ಕೆಂಪು ಚಟ್ನಿ ಜೊತೆಗೆ", "categories_description": "Explore authentic preparations by category", "categories_description_kn": "ನಮ್ಮ ಸಾಂಪ್ರದಾಯಿಕ ಉಪಹಾರ ವಿಭಾಗಗಳು", "featured_description": "Most ordered South Indian breakfast specialties", "featured_description_kn": "ಗ್ರಾಹಕರ ಅಚ್ಚುಮೆಚ್ಚಿನ ತಿನಿಸುಗಳು", "badge_1_title": "100% Pure Veg", "badge_1_title_kn": "100% Pure Veg", "badge_1_description": "Traditional Kitchen", "badge_1_description_kn": "Traditional Kitchen", "badge_2_title": "Pure Desi Ghee", "badge_2_title_kn": "Pure Desi Ghee", "badge_2_description": "Authentic Recipe", "badge_2_description_kn": "Authentic Recipe", "badge_3_title": "Instant Token", "badge_3_title_kn": "Instant Token", "badge_3_description": "Live Preparation", "badge_3_description_kn": "Live Preparation", "hero_badge": "Sakleshpur Heritage Recipe", "hero_badge_kn": "Sakleshpur Heritage Recipe", "special_price_label": "Special Price", "special_price_label_kn": "Special Price", "veg_label": "Pure Veg", "veg_label_kn": "Pure Veg", "story_badge": "Sakleshpur Food Heritage", "story_badge_kn": "Sakleshpur Food Heritage", "stat_1_value": "0%", "stat_1_value_kn": "0%", "stat_1_label": "Soda or Artificial Colors", "stat_1_label_kn": "Soda or Artificial Colors", "stat_2_value": "100%", "stat_2_value_kn": "100%", "stat_2_label": "Stone Ground Batter", "stat_2_label_kn": "Stone Ground Batter", "stat_3_value": "Desi", "stat_3_value_kn": "Desi", "stat_3_label": "Pure Cow Butter & Ghee", "stat_3_label_kn": "Pure Cow Butter & Ghee", "stat_4_value": "Degree", "stat_4_value_kn": "Degree", "stat_4_label": "Estate Filter Coffee", "stat_4_label_kn": "Estate Filter Coffee", "location_description": "Visit us or place your order online for counter pickup and dine-in.", "location_description_kn": "Visit us or place your order online for counter pickup and dine-in.", "logo_url": "/logo.jpg", "hero_image_url": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=1000&auto=format&fit=crop&q=80", "hero_image_alt": "Authentic Thatte Idli", "hero_image_alt_kn": "Authentic Thatte Idli", "special_menu_item_id": "", "hero_heading": "Sacred Flavors from the Mist of Sakleshpur", "hero_description": "Handcrafted Thatte Idlis, Steamed Habbe Vades, and Estate Degree Filter Coffee served with traditional warmth.", "hero_heading_kn": "ಸಕಲೇಶಪುರದ ಮಂಜಿನ ಸಾಂಪ್ರದಾಯಿಕ ಸವಿಯ ಸಿರಿ", "hero_description_kn": "ಮೃದು ತಟ್ಟೆ ಇಡ್ಲಿಗಳು, ಹಬೆಯಲ್ಲಿ ಬೆಂದ ಹಬ್ಬೆ ವಡೆಗಳು, ಮತ್ತು ಎಸ್ಟೇಟ್ ಫಿಲ್ಟರ್ ಕಾಫಿಯ ಶುದ್ಧ ದೈವಿಕ ರುಚಿ."}$home$::JSONB || home_content WHERE id = 1;
CREATE OR REPLACE FUNCTION public.get_public_restaurant_profile()
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT jsonb_build_object(
        'restaurant_name', restaurant_name, 'tagline', tagline,
        'tagline_kn', tagline_kn, 'address', address,
        'phone', phone, 'opening_hours', opening_hours, 'home_content', home_content
    )
    FROM public.restaurant_settings WHERE id = 1;
$$;
REVOKE ALL ON FUNCTION public.get_public_restaurant_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_restaurant_profile() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.save_restaurant_settings(p_settings JSONB)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_old JSONB;
    v_new JSONB;
BEGIN
    IF NOT public.auth_has_permission('settings.manage') THEN
        RAISE EXCEPTION 'Permission denied: settings.manage is required' USING ERRCODE = '42501';
    END IF;
    IF p_settings ? 'home_content' AND (
        jsonb_typeof(p_settings->'home_content') IS DISTINCT FROM 'object'
        OR EXISTS (SELECT 1 FROM jsonb_each(p_settings->'home_content') WHERE jsonb_typeof(value) <> 'string')
    ) THEN RAISE EXCEPTION 'Home content must contain text fields only'; END IF;
    SELECT to_jsonb(s) INTO v_old FROM public.restaurant_settings s WHERE id = 1 FOR UPDATE;
    UPDATE public.restaurant_settings SET
        home_content = COALESCE(p_settings->'home_content', home_content),
        restaurant_name = trim(p_settings->>'restaurant_name'),
        opening_hours = COALESCE(p_settings->>'opening_hours', opening_hours),
        tagline = p_settings->>'tagline',
        tagline_kn = p_settings->>'tagline_kn',
        address = p_settings->>'address',
        phone = p_settings->>'phone',
        upi_vpa = p_settings->>'upi_vpa',
        token_prefix = trim(p_settings->>'token_prefix'),
        gst_rate = (p_settings->>'gst_rate')::NUMERIC,
        thermal_width = p_settings->>'thermal_width',
        updated_at = NOW(), updated_by = auth.uid()
    WHERE id = 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Restaurant settings have not been initialized'; END IF;
    SELECT to_jsonb(s) INTO v_new FROM public.restaurant_settings s WHERE id = 1;
    INSERT INTO public.audit_logs (actor_id, actor_name, action, entity_type, old_values, new_values)
    VALUES (auth.uid(), (SELECT full_name FROM public.user_profiles WHERE id = auth.uid()),
        'SETTINGS_UPDATED', 'SETTING', v_old, v_new);
END;
$$;
REVOKE ALL ON FUNCTION public.save_restaurant_settings(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_restaurant_settings(JSONB) TO authenticated;



-- Security hardening (also available as incremental migration).

-- Persist a marker so rerunning setup does not restore removed baseline grants.
CREATE TABLE IF NOT EXISTS public.security_hardening_applied (id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id));
ALTER TABLE public.security_hardening_applied ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.security_hardening_applied FROM PUBLIC, anon, authenticated;
INSERT INTO public.security_hardening_applied VALUES (TRUE) ON CONFLICT DO NOTHING;

-- No direct profile writes, including edits to identity email or is_active.
REVOKE UPDATE ON public.user_profiles FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Users can update own profile or authorized users" ON public.user_profiles;

-- Never allow legacy credential/role administration to bypass the Auth service.
REVOKE ALL ON FUNCTION public.authenticate_user(TEXT,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_user_account(TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_user_account_role(UUID,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_user_account_active(UUID,BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_user_account(UUID,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_user_account_password(UUID,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.allow_legacy_auth_attempt(TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.clear_legacy_auth_attempts(TEXT) FROM PUBLIC, anon, authenticated, service_role;
-- Invalidate legacy credentials without deleting account metadata.
UPDATE public.user_accounts SET password_hash = '', updated_at = NOW() WHERE password_hash <> '';

-- Mutating role grants must go through the audited, permission-checked RPCs.
REVOKE INSERT, UPDATE, DELETE ON public.role_permissions FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS public.default_role_permissions (
    role_name TEXT NOT NULL REFERENCES public.roles(name),
    permission_key TEXT NOT NULL REFERENCES public.permissions(permission_key),
    PRIMARY KEY (role_name, permission_key)
);
ALTER TABLE public.default_role_permissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.default_role_permissions FROM PUBLIC, anon, authenticated;
INSERT INTO public.default_role_permissions VALUES
('SUPER_ADMIN', 'dashboard.view'),
('SUPER_ADMIN', 'orders.create'),
('SUPER_ADMIN', 'orders.view_all'),
('SUPER_ADMIN', 'orders.view_own'),
('SUPER_ADMIN', 'orders.accept'),
('SUPER_ADMIN', 'orders.prepare'),
('SUPER_ADMIN', 'orders.mark_ready'),
('SUPER_ADMIN', 'orders.complete'),
('SUPER_ADMIN', 'orders.cancel'),
('SUPER_ADMIN', 'menu.view'),
('SUPER_ADMIN', 'menu.create'),
('SUPER_ADMIN', 'menu.update'),
('SUPER_ADMIN', 'menu.delete'),
('SUPER_ADMIN', 'menu.manage_price'),
('SUPER_ADMIN', 'users.view'),
('SUPER_ADMIN', 'users.create'),
('SUPER_ADMIN', 'users.update'),
('SUPER_ADMIN', 'users.deactivate'),
('SUPER_ADMIN', 'roles.assign'),
('SUPER_ADMIN', 'roles.manage'),
('SUPER_ADMIN', 'reports.view'),
('SUPER_ADMIN', 'reports.export'),
('SUPER_ADMIN', 'payments.view'),
('SUPER_ADMIN', 'payments.verify'),
('SUPER_ADMIN', 'payments.refund'),
('SUPER_ADMIN', 'settings.manage'),
('SUPER_ADMIN', 'audit_logs.view'),
('ADMIN', 'dashboard.view'),
('ADMIN', 'orders.create'),
('ADMIN', 'orders.view_all'),
('ADMIN', 'orders.view_own'),
('ADMIN', 'orders.accept'),
('ADMIN', 'orders.prepare'),
('ADMIN', 'orders.mark_ready'),
('ADMIN', 'orders.complete'),
('ADMIN', 'orders.cancel'),
('ADMIN', 'menu.view'),
('ADMIN', 'menu.create'),
('ADMIN', 'menu.update'),
('ADMIN', 'menu.delete'),
('ADMIN', 'menu.manage_price'),
('ADMIN', 'users.view'),
('ADMIN', 'users.create'),
('ADMIN', 'users.update'),
('ADMIN', 'users.deactivate'),
('ADMIN', 'reports.view'),
('ADMIN', 'reports.export'),
('ADMIN', 'payments.view'),
('ADMIN', 'payments.verify'),
('ADMIN', 'payments.refund'),
('ADMIN', 'audit_logs.view'),
('STAFF', 'dashboard.view'),
('STAFF', 'orders.create'),
('STAFF', 'orders.view_all'),
('STAFF', 'orders.view_own'),
('STAFF', 'orders.accept'),
('STAFF', 'orders.mark_ready'),
('STAFF', 'orders.complete'),
('STAFF', 'orders.cancel'),
('STAFF', 'menu.view'),
('STAFF', 'payments.view'),
('STAFF', 'payments.verify'),
('KITCHEN_STAFF', 'orders.view_all'),
('KITCHEN_STAFF', 'orders.prepare'),
('KITCHEN_STAFF', 'orders.mark_ready'),
('KITCHEN_STAFF', 'menu.view'),
('CUSTOMER', 'orders.create'),
('CUSTOMER', 'orders.view_own'),
('CUSTOMER', 'menu.view')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_role_permission_matrix()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE result JSONB;
BEGIN
    IF NOT public.auth_has_permission('roles.manage') THEN
        RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
    END IF;
    SELECT jsonb_object_agg(name, grants) INTO result FROM (
        SELECT r.name, COALESCE(jsonb_agg(p.permission_key ORDER BY p.permission_key)
          FILTER (WHERE p.permission_key IS NOT NULL), '[]'::JSONB) AS grants
        FROM public.roles r LEFT JOIN public.role_permissions rp ON rp.role_id = r.id
        LEFT JOIN public.permissions p ON p.id = rp.permission_id GROUP BY r.name
    ) matrix;
    RETURN result;
END;
$$;
CREATE OR REPLACE FUNCTION public.set_role_permission(p_role TEXT, p_permission TEXT, p_enabled BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE role_uuid UUID; permission_uuid UUID;
BEGIN
    IF NOT public.auth_has_role('SUPER_ADMIN') OR NOT public.auth_has_permission('roles.manage') THEN
        RAISE EXCEPTION 'Only an active Super Admin may manage permissions' USING ERRCODE = '42501';
    END IF;
    IF p_role = 'SUPER_ADMIN' AND p_permission IN ('roles.manage','roles.assign','users.view','users.update') AND p_enabled IS NOT TRUE THEN
        RAISE EXCEPTION 'Owner recovery permissions cannot be removed';
    END IF;
    SELECT id INTO STRICT role_uuid FROM public.roles WHERE name = p_role FOR UPDATE;
    SELECT id INTO STRICT permission_uuid FROM public.permissions WHERE permission_key = p_permission;
    IF p_enabled IS NULL THEN RAISE EXCEPTION 'Enabled is required'; END IF;
    IF p_enabled THEN
        INSERT INTO public.role_permissions VALUES (role_uuid, permission_uuid) ON CONFLICT DO NOTHING;
    ELSE
        DELETE FROM public.role_permissions WHERE role_id = role_uuid AND permission_id = permission_uuid;
    END IF;
    INSERT INTO public.audit_logs(actor_id, action, entity_type, new_values)
    VALUES (auth.uid(), 'ROLE_PERMISSION_UPDATED', 'ROLE', jsonb_build_object('role',p_role,'permission',p_permission,'enabled',p_enabled));
END;
$$;
CREATE OR REPLACE FUNCTION public.reset_role_permissions()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.auth_has_role('SUPER_ADMIN') OR NOT public.auth_has_permission('roles.manage') THEN
        RAISE EXCEPTION 'Only an active Super Admin may reset permissions' USING ERRCODE = '42501';
    END IF;
    PERFORM id FROM public.roles ORDER BY id FOR UPDATE;
    DELETE FROM public.role_permissions rp USING public.roles r
    WHERE rp.role_id = r.id AND r.name IN ('SUPER_ADMIN','ADMIN','STAFF','KITCHEN_STAFF','CUSTOMER');
    INSERT INTO public.role_permissions(role_id, permission_id)
    SELECT r.id, p.id FROM public.default_role_permissions d
    JOIN public.roles r ON r.name=d.role_name JOIN public.permissions p ON p.permission_key=d.permission_key
    ON CONFLICT DO NOTHING;
    INSERT INTO public.audit_logs(actor_id, action, entity_type)
    VALUES (auth.uid(), 'ROLE_PERMISSIONS_RESET', 'ROLE');
END;
$$;
REVOKE ALL ON FUNCTION public.get_role_permission_matrix() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_role_permission(TEXT,TEXT,BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reset_role_permissions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_role_permission_matrix() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_role_permission(TEXT,TEXT,BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_role_permissions() TO authenticated;
CREATE OR REPLACE FUNCTION public.create_order_with_token(
    p_customer_name TEXT,
    p_customer_mobile TEXT,
    p_order_type TEXT,
    p_table_number TEXT,
    p_subtotal DECIMAL,
    p_tax_amount DECIMAL,
    p_total_amount DECIMAL,
    p_payment_method TEXT,
    p_payment_status TEXT,
    p_notes TEXT,
    p_items JSONB,
    p_customer_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_seq INT;
    v_token_str TEXT;
    v_tracking_token TEXT;
    v_order_id UUID;
    v_customer_id UUID := auth.uid();
    v_item JSONB;
    v_menu_item public.menu_items%ROWTYPE;
    v_quantity INT;
    v_subtotal NUMERIC(10,2) := 0;
    v_tax_amount NUMERIC(10,2);
    v_total_amount NUMERIC(10,2);
    v_max_prep INT := 10;
BEGIN
    IF NULLIF(trim(p_customer_name), '') IS NULL OR length(regexp_replace(COALESCE(p_customer_mobile, ''), '[^0-9]', '', 'g')) < 10 THEN
        RAISE EXCEPTION 'Customer name and a valid mobile number are required' USING ERRCODE = '22023';
    END IF;
    IF p_order_type NOT IN ('DINE_IN', 'TAKEAWAY') OR p_payment_method NOT IN ('UPI', 'CASH') THEN
        RAISE EXCEPTION 'Invalid order type or payment method' USING ERRCODE = '22023';
    END IF;
    IF p_payment_status IS DISTINCT FROM 'PENDING' THEN
        RAISE EXCEPTION 'Invalid payment status' USING ERRCODE = '22023';
    END IF;
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 100 THEN
        RAISE EXCEPTION 'An order must contain between 1 and 100 items' USING ERRCODE = '22023';
    END IF;

    -- Validate availability and calculate totals from current database menu prices.
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
        IF COALESCE(v_item->>'menu_item_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            RAISE EXCEPTION 'Invalid menu item reference' USING ERRCODE = '22023';
        END IF;
        v_quantity := (v_item->>'quantity')::INT;
        IF v_quantity < 1 OR v_quantity > 100 THEN
            RAISE EXCEPTION 'Item quantity must be between 1 and 100' USING ERRCODE = '22023';
        END IF;
        SELECT * INTO v_menu_item FROM public.menu_items
        WHERE id = (v_item->>'menu_item_id')::UUID AND available = TRUE
        FOR SHARE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'A selected menu item is unavailable' USING ERRCODE = '22023';
        END IF;
        v_subtotal := v_subtotal + (v_menu_item.price * v_quantity);
        v_max_prep := GREATEST(v_max_prep, COALESCE(v_menu_item.preparation_time_minutes, 10));
    END LOOP;
    v_tax_amount := round(v_subtotal * 0.05, 2);
    v_total_amount := v_subtotal + v_tax_amount;

    INSERT INTO public.daily_token_sequences (token_date, last_sequence)
    VALUES (v_today, 1)
    ON CONFLICT (token_date)
    DO UPDATE SET last_sequence = daily_token_sequences.last_sequence + 1
    RETURNING last_sequence INTO v_seq;

    v_token_str := 'DP-' || LPAD(v_seq::TEXT, 3, '0');
    v_tracking_token := encode(gen_random_bytes(16), 'hex');

    INSERT INTO public.orders (
        token_number, token_date, tracking_token, customer_id, customer_name,
        customer_mobile, order_type, table_number, subtotal, tax_amount,
        total_amount, payment_method, payment_status, order_status, notes,
        estimated_prep_time_minutes
    ) VALUES (
        v_token_str, v_today, v_tracking_token, v_customer_id, trim(p_customer_name),
        regexp_replace(p_customer_mobile, '[^0-9]', '', 'g'), p_order_type,
        CASE WHEN p_order_type = 'DINE_IN' THEN NULLIF(trim(p_table_number), '') ELSE NULL END,
        v_subtotal, v_tax_amount, v_total_amount, p_payment_method, 'PENDING',
        'PLACED', NULLIF(trim(p_notes), ''), v_max_prep
    ) RETURNING id INTO v_order_id;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
        SELECT * INTO STRICT v_menu_item FROM public.menu_items
        WHERE id = (v_item->>'menu_item_id')::UUID AND available = TRUE;
        v_quantity := (v_item->>'quantity')::INT;
        INSERT INTO public.order_items (
            order_id, menu_item_id, item_name, item_name_kn, quantity, unit_price, total_price
        ) VALUES (
            v_order_id, v_menu_item.id, v_menu_item.name, v_menu_item.name_kn,
            v_quantity, v_menu_item.price, v_menu_item.price * v_quantity
        );
    END LOOP;

    INSERT INTO public.order_status_history (order_id, previous_status, new_status, changed_by, changed_by_name, reason)
    VALUES (v_order_id, NULL, 'PLACED', v_customer_id, trim(p_customer_name), 'Order created successfully');

    RETURN jsonb_build_object(
        'order_id', v_order_id, 'token_number', v_token_str,
        'token_date', v_today, 'tracking_token', v_tracking_token,
        'status', 'PLACED', 'subtotal', v_subtotal,
        'tax_amount', v_tax_amount, 'total_amount', v_total_amount
    );
END;
$$;
REVOKE ALL ON FUNCTION public.create_order_with_token(TEXT, TEXT, TEXT, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_with_token(TEXT, TEXT, TEXT, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, JSONB, UUID) TO anon, authenticated;





-- Takeaway parcel charges

-- A fixed charge per takeaway order, inclusive of any applicable packing tax.
-- Default zero avoids imposing an unapproved charge; configure in Settings.
ALTER TABLE public.restaurant_settings ADD COLUMN IF NOT EXISTS parcel_charge NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (parcel_charge >= 0);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS parcel_charge NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (parcel_charge >= 0);
CREATE OR REPLACE FUNCTION public.save_restaurant_settings(p_settings JSONB)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_old JSONB;
    v_new JSONB;
BEGIN
    IF NOT public.auth_has_permission('settings.manage') THEN
        RAISE EXCEPTION 'Permission denied: settings.manage is required' USING ERRCODE = '42501';
    END IF;
    IF p_settings ? 'home_content' AND (
        jsonb_typeof(p_settings->'home_content') IS DISTINCT FROM 'object'
        OR EXISTS (SELECT 1 FROM jsonb_each(p_settings->'home_content') WHERE jsonb_typeof(value) <> 'string')
    ) THEN RAISE EXCEPTION 'Home content must contain text fields only'; END IF;
    SELECT to_jsonb(s) INTO v_old FROM public.restaurant_settings s WHERE id = 1 FOR UPDATE;
    UPDATE public.restaurant_settings SET
        parcel_charge = COALESCE((p_settings->>'parcel_charge')::NUMERIC, parcel_charge),
        home_content = COALESCE(p_settings->'home_content', home_content),
        restaurant_name = trim(p_settings->>'restaurant_name'),
        opening_hours = COALESCE(p_settings->>'opening_hours', opening_hours),
        tagline = p_settings->>'tagline',
        tagline_kn = p_settings->>'tagline_kn',
        address = p_settings->>'address',
        phone = p_settings->>'phone',
        upi_vpa = p_settings->>'upi_vpa',
        token_prefix = trim(p_settings->>'token_prefix'),
        gst_rate = (p_settings->>'gst_rate')::NUMERIC,
        thermal_width = p_settings->>'thermal_width',
        updated_at = NOW(), updated_by = auth.uid()
    WHERE id = 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Restaurant settings have not been initialized'; END IF;
    SELECT to_jsonb(s) INTO v_new FROM public.restaurant_settings s WHERE id = 1;
    INSERT INTO public.audit_logs (actor_id, actor_name, action, entity_type, old_values, new_values)
    VALUES (auth.uid(), (SELECT full_name FROM public.user_profiles WHERE id = auth.uid()),
        'SETTINGS_UPDATED', 'SETTING', v_old, v_new);
END;
$$;
CREATE OR REPLACE FUNCTION public.get_public_restaurant_profile()
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT jsonb_build_object(
        'restaurant_name', restaurant_name, 'tagline', tagline,
        'tagline_kn', tagline_kn, 'address', address,
        'phone', phone, 'opening_hours', opening_hours, 'home_content', home_content, 'parcel_charge', parcel_charge
    )
    FROM public.restaurant_settings WHERE id = 1;
$$;
CREATE OR REPLACE FUNCTION public.create_order_with_token(
    p_customer_name TEXT,
    p_customer_mobile TEXT,
    p_order_type TEXT,
    p_table_number TEXT,
    p_subtotal DECIMAL,
    p_tax_amount DECIMAL,
    p_total_amount DECIMAL,
    p_payment_method TEXT,
    p_payment_status TEXT,
    p_notes TEXT,
    p_items JSONB,
    p_customer_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_seq INT;
    v_token_str TEXT;
    v_tracking_token TEXT;
    v_order_id UUID;
    v_customer_id UUID := auth.uid();
    v_item JSONB;
    v_menu_item public.menu_items%ROWTYPE;
    v_quantity INT;
    v_subtotal NUMERIC(10,2) := 0;
    v_tax_amount NUMERIC(10,2);
    v_parcel_charge NUMERIC(10,2) := 0;
    v_total_amount NUMERIC(10,2);
    v_max_prep INT := 10;
BEGIN
    IF NULLIF(trim(p_customer_name), '') IS NULL OR length(regexp_replace(COALESCE(p_customer_mobile, ''), '[^0-9]', '', 'g')) < 10 THEN
        RAISE EXCEPTION 'Customer name and a valid mobile number are required' USING ERRCODE = '22023';
    END IF;
    IF p_order_type NOT IN ('DINE_IN', 'TAKEAWAY') OR p_payment_method NOT IN ('UPI', 'CASH') THEN
        RAISE EXCEPTION 'Invalid order type or payment method' USING ERRCODE = '22023';
    END IF;
    IF p_payment_status IS DISTINCT FROM 'PENDING' THEN
        RAISE EXCEPTION 'Invalid payment status' USING ERRCODE = '22023';
    END IF;
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 100 THEN
        RAISE EXCEPTION 'An order must contain between 1 and 100 items' USING ERRCODE = '22023';
    END IF;

    -- Validate availability and calculate totals from current database menu prices.
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
        IF COALESCE(v_item->>'menu_item_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            RAISE EXCEPTION 'Invalid menu item reference' USING ERRCODE = '22023';
        END IF;
        v_quantity := (v_item->>'quantity')::INT;
        IF v_quantity < 1 OR v_quantity > 100 THEN
            RAISE EXCEPTION 'Item quantity must be between 1 and 100' USING ERRCODE = '22023';
        END IF;
        SELECT * INTO v_menu_item FROM public.menu_items
        WHERE id = (v_item->>'menu_item_id')::UUID AND available = TRUE
        FOR SHARE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'A selected menu item is unavailable' USING ERRCODE = '22023';
        END IF;
        v_subtotal := v_subtotal + (v_menu_item.price * v_quantity);
        v_max_prep := GREATEST(v_max_prep, COALESCE(v_menu_item.preparation_time_minutes, 10));
    END LOOP;
    v_tax_amount := round(v_subtotal * 0.05, 2);
    IF p_order_type = 'TAKEAWAY' THEN
        SELECT parcel_charge INTO STRICT v_parcel_charge FROM public.restaurant_settings WHERE id = 1;
    END IF;
    v_total_amount := v_subtotal + v_tax_amount + v_parcel_charge;

    INSERT INTO public.daily_token_sequences (token_date, last_sequence)
    VALUES (v_today, 1)
    ON CONFLICT (token_date)
    DO UPDATE SET last_sequence = daily_token_sequences.last_sequence + 1
    RETURNING last_sequence INTO v_seq;

    v_token_str := 'DP-' || LPAD(v_seq::TEXT, 3, '0');
    v_tracking_token := encode(gen_random_bytes(16), 'hex');

    INSERT INTO public.orders (
        token_number, token_date, tracking_token, customer_id, customer_name,
        customer_mobile, order_type, table_number, subtotal, tax_amount,
        total_amount, parcel_charge, payment_method, payment_status, order_status, notes,
        estimated_prep_time_minutes
    ) VALUES (
        v_token_str, v_today, v_tracking_token, v_customer_id, trim(p_customer_name),
        regexp_replace(p_customer_mobile, '[^0-9]', '', 'g'), p_order_type,
        CASE WHEN p_order_type = 'DINE_IN' THEN NULLIF(trim(p_table_number), '') ELSE NULL END,
        v_subtotal, v_tax_amount, v_total_amount, v_parcel_charge, p_payment_method, 'PENDING',
        'PLACED', NULLIF(trim(p_notes), ''), v_max_prep
    ) RETURNING id INTO v_order_id;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
        SELECT * INTO STRICT v_menu_item FROM public.menu_items
        WHERE id = (v_item->>'menu_item_id')::UUID AND available = TRUE;
        v_quantity := (v_item->>'quantity')::INT;
        INSERT INTO public.order_items (
            order_id, menu_item_id, item_name, item_name_kn, quantity, unit_price, total_price
        ) VALUES (
            v_order_id, v_menu_item.id, v_menu_item.name, v_menu_item.name_kn,
            v_quantity, v_menu_item.price, v_menu_item.price * v_quantity
        );
    END LOOP;

    INSERT INTO public.order_status_history (order_id, previous_status, new_status, changed_by, changed_by_name, reason)
    VALUES (v_order_id, NULL, 'PLACED', v_customer_id, trim(p_customer_name), 'Order created successfully');

    RETURN jsonb_build_object(
        'order_id', v_order_id, 'token_number', v_token_str,
        'token_date', v_today, 'tracking_token', v_tracking_token,
        'status', 'PLACED', 'subtotal', v_subtotal,
        'tax_amount', v_tax_amount, 'parcel_charge', v_parcel_charge, 'total_amount', v_total_amount
    );
END;
$$;

COMMIT;
