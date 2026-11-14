# Datta Prasada (ದತ್ತ ಪ್ರಸಾದ)
### Full-Stack Food Ordering, Token Management & Enterprise RBAC System
**Authentic Sakleshpur Taste in Balagere, Bangalore**

[![React](https://img.shields.io/badge/React-19.3-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Pure Vegetarian](https://img.shields.io/badge/100%25-Pure%20Veg-1B4332.svg)]()

---

## 1. Project Overview

**Datta Prasada** is a production-ready, mobile-first food ordering and token management application designed specifically for traditional South Indian breakfast and snacks outlets. The restaurant specializes in authentic Sakleshpur (Malnad) culinary heritage:

* **Thatte Idli (ತಟ್ಟೆ ಇಡ್ಲಿ)** — Signature plate-sized fluffy steamed idlis with fresh farm butter and spicy red chutney.
* **Habbe Vade (ಹಬ್ಬೆ ವಡೆ)** — Traditional Malnad-style steamed lentil dumplings spiced with ginger, green chilies, and coconut.
* **Kaayi Idli (ಕಾಯಿ ಇಡ್ಲಿ)** — Sakleshpur heritage tender coconut steamed delicacy.
* **Degree Filter Coffee (ಫಿಲ್ಟರ್ ಕಾಫಿ)** — Estate-roasted Chikmagalur & Sakleshpur plantation brew.
* **Idli-Vade Combos, Chow Chow Bath, Benne Masala Dosa, Desi Ghee Mysore Pak**.

The application eliminates counter congestion by providing seamless customer ordering, automated sequential daily token generation (`DP-001`, `DP-002`, `DP-003`...), a dedicated Kitchen Display System (KDS), counter cashier order settlement, thermal slip printing (58mm/80mm), and enterprise Role-Based Access Control (RBAC).

---

## 2. Enterprise RBAC & Security Architecture

The application strictly implements the required 5-tier role hierarchy with 27 granular permission keys:

### Role Hierarchy & Permissions Matrix

| Feature / Permission Key | Super Admin | Admin (Manager) | Staff (Counter) | Kitchen Staff | Customer |
|---|:---:|:---:|:---:|:---:|:---:|
| **View Dashboard** (`dashboard.view`) | Full | Yes | Limited | No | No |
| **Create Orders** (`orders.create`) | Yes | Yes | Yes | No | Yes |
| **View All Orders** (`orders.view_all`) | Yes | Yes | Yes | Kitchen Queue | No |
| **View Own Orders** (`orders.view_own`) | Yes | Yes | Yes | No | Yes |
| **Order Preparation** (`orders.prepare`, `orders.mark_ready`) | Yes | Yes | No | **Yes** | No |
| **Counter Settlement** (`orders.accept`, `orders.complete`) | Yes | Yes | **Yes** | No | No |
| **Order Cancellation** (`orders.cancel`) | Yes | Yes | Limited | No | No |
| **Manage Menu Items** (`menu.create`, `menu.update`, `menu.delete`) | Yes | Yes | No | No | No |
| **Manage Prices** (`menu.manage_price`) | Yes | Yes | No | No | No |
| **Manage Personnel** (`users.view`, `users.create`, `users.update`) | Yes | Limited | No | No | No |
| **Assign / Manage Roles** (`roles.assign`, `roles.manage`) | **Yes** | No | No | No | No |
| **View Financial Reports** (`reports.view`, `reports.export`) | Yes | Yes | No | No | No |
| **Verify / Settle Payments** (`payments.view`, `payments.verify`) | Yes | Yes | Yes | No | No |
| **View Security Audit Trail** (`audit_logs.view`) | Yes | Yes | No | No | No |
| **Restaurant Configuration** (`settings.manage`) | Yes | No | No | No | No |

### Order Status State Machine

```
PLACED ──► ACCEPTED ──► PREPARING ──► READY ──► COMPLETED
  │                         │           │
  └─────────────► CANCELLED ◄───────────┘
```

* **Kitchen Staff can only advance:** `ACCEPTED` ➔ `PREPARING` ➔ `READY`
* **Counter Staff can only advance:** `PLACED` ➔ `ACCEPTED`, `READY` ➔ `COMPLETED`, process cancellations, or mark Cash as `PAID`.
* **Admins:** Can override state transitions with an audit reason logged in `audit_logs`.

---

## 3. Key Application Features

### 3.1 Customer Storefront (Mobile-First)
- **Home Page (`/`)**: Traditional South Indian aesthetic (ivory `#FDFBF7`, warm cream, golden accents, and temple green `#1B4332`), Today's Sakleshpur Special banner, categories grid, featured items with 1-click add, outlet timings (6:30 AM – 10:30 PM), location map info.
- **Bilingual Support (English & ಕನ್ನಡ)**: Instant 1-tap language toggle in the header. All dish names, descriptions, statuses, and buttons update reactively.
- **Interactive Menu (`/menu`)**: Category tabs, search bar, 100% Pure Veg badge, Today's Special badges, preparation times, quantity selectors, out-of-stock overlay, and sticky bottom cart drawer for mobile devices.
- **Shopping Basket (`/cart`)**: Real-time quantity adjustments, special kitchen instructions textarea, subtotal, 5% GST calculation, and total payable.
- **Express Guest Checkout (`/checkout`)**: Name, 10-digit mobile number, Order Type (Dine-in with optional Table Number vs. Takeaway/Parcel), and Payment Method (UPI / Online via Razorpay vs. Cash at Counter).
- **Celebratory Order Confirmation (`/order/:orderId`)**: Festive confetti animation, prominent daily token badge (`DP-025`), estimated prep time, order summary, thermal slip preview, and link to live tracking.
- **Real-Time Order Tracking (`/track/:token`)**: 5-step visual progress stepper, direct token search lookup, and **audible chime alert with banner** when the order status transitions to `READY` (*"Your order is ready! Please collect it at the counter."*).

### 3.2 Counter Staff Portal (`/staff/orders`)
- Live incoming order queue with real-time updates across open tabs without refreshing.
- Status filters: All, New (Placed), Accepted, Preparing, Ready, Completed, Cancelled.
- Cash payment settlement: 1-click **"Collect Cash & Mark as PAID"** button.
- Status advancement buttons with RBAC permission enforcement.
- **Thermal Slip & KOT Printing**: 1-click print buttons for 58mm and 80mm thermal receipt printers.

### 3.3 Kitchen Display System (KDS) (`/kitchen`)
- High-contrast, dark-mode 3-column Kanban interface tailored for kitchen tablets and wall monitors:
  1. **New / Pending (Yellow)**
  2. **In Preparation / Steamer (Blue)**
  3. **At Counter Pickup (Emerald Green)**
- Large bold token numbers, portion multipliers, preparation timers, elapsed order time alerts (>10 mins marked urgent), and 1-click status advances (**"Start Cooking"**, **"Dish Ready"**).

### 3.4 Manager & Admin Suite (`/admin/*`)
- **Overview Dashboard (`/admin/dashboard`)**: Today's orders count, gross revenue, cash drawer collections, UPI collections, pipeline queue counters, and top-selling dishes ranking.
- **Menu Management (`/admin/menu`)**: Full CRUD operations for dishes, price management (guarded by `menu.manage_price`), instant stock availability toggle, Today's Special badge, and English/Kannada bilingual inputs.
- **Category Management (`/admin/categories`)**: Create, reorder, and configure categories with bilingual names.
- **Sales Analytics (`/admin/reports`)**: Date filters (Today, 7 Days, 30 Days, All-time), Average Order Value (AOV), payment method breakdown, dish-wise volume, and **1-click CSV Export**.
- **Immutable Security Audit Trail (`/admin/audit-logs`)**: Complete audit history with actor, action, entity, timestamp, and expandable JSON old/new value diffs.
- **Personnel & Roles (`/admin/users`)**: Super Admin interface for managing staff accounts, activating/deactivating users, and assigning authorization roles.
- **Restaurant Settings (`/admin/settings`)**: Tax rate (5% GST), UPI VPA address, daily token prefix (`DP-`), and 58mm/80mm thermal receipt width presets.

### 3.5 Thermal Printer Support (58mm / 80mm)
- Dedicated print preview modal (`ThermalReceiptModal`) formatted to native 72mm/58mm printable width via `@media print`.
- Generates both:
  - **Kitchen Order Tickets (KOT)**: Large token, quantities, items, kitchen instructions.
  - **Customer Tax Invoices**: Full restaurant header ("DATTA PRASADA - Balagere"), GSTIN, token number, itemized pricing, taxes, payment status, and traditional blessing (*"ಶ್ರೀ ಗುರುದೇವ ದತ್ತ"*).

---

## 4. Technology Stack

- **Frontend**: React 19, TypeScript
- **Bundler & Dev Server**: Vite 6
- **Styling**: Tailwind CSS 3.4, PostCSS, Custom South Indian Palette (Ivory, Cream, Gold, Temple Green)
- **Icons**: Lucide React
- **Animations & Effects**: Canvas Confetti, Web Audio API Sound Chimes
- **Routing**: React Router 7
- **State Management**: TanStack React Query & Reactive Multi-Tab Broadcast Channels
- **Forms & Validation**: Controlled Forms & Strict Client-Side Input Sanitization
- **Backend & Database**: PostgreSQL & Supabase (Full RLS Policies, Stored Procedures, and Atomic Token Sequence Functions)
- **Payment Gateway**: Razorpay Checkout SDK + Fallback Simulated Gateway for immediate offline testing

---

## 5. Getting Started

### 5.1 Installation & Setup
```bash
# Clone or navigate to the repository
cd DattaPrasada

# Install dependencies (automatically runs patch-rollup hook)
npm install

# Start the development server
npm run dev
```

Open your browser at `http://localhost:5173/`.

### 5.2 Fast Role Evaluation (1-Click Switcher)
To evaluate different role permissions without creating accounts:
1. Navigate to `/staff/login` (or click the shield icon in the header).
2. Click any of the pre-configured quick role cards:
   - **Counter Staff** (`counter@dattaprasada.com`) — Handles live orders and cash collection.
   - **Kitchen Chef** (`kitchen@dattaprasada.com`) — Opens the full-screen Kitchen Display System.
   - **Restaurant Admin** (`manager@dattaprasada.com`) — Access to reports, menu, categories, and audit logs.
   - **Super Admin** (`superadmin@dattaprasada.com`) — Platform owner with full user & role assignment authority.

### 5.3 Building for Production
```bash
npm run build
```
The output will be placed in the `dist/` directory, ready to deploy to Vercel, Netlify, or Lovable.

---

## 6. Supabase Database Migration

The complete PostgreSQL migration script with RLS policies, tables, constraints, seed categories, Sakleshpur menu items, and atomic stored procedures is located at:

```
supabase/migrations/20261112000000_init_datta_prasada.sql
```

To deploy to your Supabase project:
1. Open the [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor**.
3. Paste the contents of `supabase/migrations/20261112000000_init_datta_prasada.sql` and run.
4. Copy your `Project URL` and `Anon Key` into your `.env` file:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

---

## 7. License & Credits

Developed with traditional craftsmanship for **Datta Prasada**, Balagere Main Road, Bangalore.  
*॥ ಶ್ರೀ ಗುರುದೇವ ದತ್ತ ॥*
