-- ============================================================================
-- Datta Prasada - Full Database Schema & RBAC Migration
-- Location: Balagere, Bangalore | Sakleshpur-style Traditional South Indian
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. RBAC & Security Tables
-- ----------------------------------------------------------------------------

-- Roles table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    name_kn TEXT NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
SET search_path = public
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_seq INT;
    v_token_str TEXT;
    v_tracking_token TEXT;
    v_order_id UUID;
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
        p_customer_id,
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
        'dashboard.view', 'orders.create', 'orders.view_all', 'orders.view_own',
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
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND r.name = p_role
    );
$$;

-- Categories & Menu Items: Anyone (including unauthenticated guests) can view active items
CREATE POLICY "Public can view active categories" ON public.categories
    FOR SELECT USING (active = true OR public.auth_has_permission('menu.update'));

CREATE POLICY "Admins can manage categories" ON public.categories
    FOR ALL USING (public.auth_has_permission('menu.create') OR public.auth_has_permission('menu.update'));

CREATE POLICY "Public can view menu items" ON public.menu_items
    FOR SELECT USING (available = true OR public.auth_has_permission('menu.update'));

CREATE POLICY "Admins can manage menu items" ON public.menu_items
    FOR ALL USING (public.auth_has_permission('menu.create') OR public.auth_has_permission('menu.update'));

-- Orders:
-- 1. Anyone can insert an order via create_order_with_token function (SECURITY DEFINER)
-- 2. Staff/Admins with 'orders.view_all' can view all orders
-- 3. Customers can view their own orders if authenticated
-- 4. Tracking order via tracking_token is supported for guests
CREATE POLICY "Staff can view all orders" ON public.orders
    FOR SELECT USING (
        public.auth_has_permission('orders.view_all')
        OR (auth.uid() IS NOT NULL AND customer_id = auth.uid())
    );

CREATE POLICY "Staff can update orders" ON public.orders
    FOR UPDATE USING (
        public.auth_has_permission('orders.accept')
        OR public.auth_has_permission('orders.prepare')
        OR public.auth_has_permission('orders.mark_ready')
        OR public.auth_has_permission('orders.complete')
    );

-- Order Items: Viewable if parent order is viewable
CREATE POLICY "Order items viewable with order" ON public.order_items
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id)
    );

-- Audit logs: Read-only for authorized managers, never modified by normal clients
CREATE POLICY "Authorized users can view audit logs" ON public.audit_logs
    FOR SELECT USING (public.auth_has_permission('audit_logs.view'));
