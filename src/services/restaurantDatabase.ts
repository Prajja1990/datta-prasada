import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Order, Category, MenuItem } from '../types';

function requireDatabase() {
  if (!isSupabaseConfigured) throw new Error('Connect Supabase to load reports and restaurant settings.');
}

export interface OperationalSettings {
  restaurant_name: string;
  home_content: Record<string, string>;
  opening_hours: string;
  tagline: string;
  tagline_kn: string;
  address: string;
  phone: string;
  upi_vpa: string;
  token_prefix: string;
  gst_rate: number;
  thermal_width: '80mm' | '58mm';
}

function mapDatabaseOrder(row: any, items = row.order_items || row.items || []): Order {
  return {
    id: row.id,
    tokenNumber: row.token_number,
    tokenDate: row.token_date,
    trackingToken: row.tracking_token,
    customerId: row.customer_id || undefined,
    customerName: row.customer_name,
    customerMobile: row.customer_mobile,
    orderType: row.order_type,
    tableNumber: row.table_number || undefined,
    subtotal: Number(row.subtotal),
    taxAmount: Number(row.tax_amount),
    totalAmount: Number(row.total_amount),
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    orderStatus: row.order_status,
    notes: row.notes || undefined,
    estimatedPrepTimeMinutes: row.estimated_prep_time_minutes || 10,
    items: items.map((item: any) => ({
      id: item.id,
      menuItemId: item.menu_item_id || '',
      name: item.item_name,
      nameKn: item.item_name_kn || undefined,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
      totalPrice: Number(item.total_price),
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadReportOrders(): Promise<Order[]> {
  requireDatabase();
  const orders: Order[] = [];
  // Explicit pagination avoids the Supabase default 1,000-row response limit.
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('orders')
      .select('*, order_items(*)').order('created_at', { ascending: false })
      .order('id').range(offset, offset + 499);
    if (error) throw error;
    orders.push(...(data || []).map((row: any) => mapDatabaseOrder(row)));
    if (!data || data.length < 500) return orders;
  }
}

export async function loadRestaurantSettings(): Promise<OperationalSettings> {
  requireDatabase();
  const { data, error } = await supabase.from('restaurant_settings').select('*').eq('id', 1).single();
  if (error) throw error;
  return { ...data, gst_rate: Number(data.gst_rate) };
}

export async function saveRestaurantSettings(settings: OperationalSettings) {
  requireDatabase();
  const { error } = await supabase.rpc('save_restaurant_settings', { p_settings: settings });
  if (error) throw error;
}

export type SalesReportRange = 'TODAY' | 'WEEK' | 'MONTH' | 'ALL';
export interface SalesReport {
  totalRevenue: number;
  totalOrdersCount: number;
  paidOrdersCount: number;
  aov: number;
  cashTotal: number;
  upiTotal: number;
  itemSales: { name: string; quantity: number; revenue: number; share: number }[];
  orders: Order[];
}
export async function loadSalesReport(range: SalesReportRange): Promise<SalesReport> {
  requireDatabase();
  const { data, error } = await supabase.rpc('get_sales_report', { p_range: range });
  if (error) throw error;
  return { ...data, orders: (data.orders || []).map((row: any) => mapDatabaseOrder(row)) };
}

export async function loadHomeMenu(): Promise<{ categories: Category[]; menuItems: MenuItem[] }> {
  requireDatabase();
  const readAll = async (table: string, column: string) => {
    const rows: any[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from(table).select('*').order(column).order('id').range(offset, offset + 499);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < 500) return rows;
    }
  };
  const [categories, menuItems] = await Promise.all([readAll('categories', 'display_order'), readAll('menu_items', 'name')]);
  return {
    categories: categories.filter(c => c.active).map(c => ({
      id: c.id, name: c.name, nameKn: c.name_kn, description: c.description,
      displayOrder: c.display_order, active: c.active, createdAt: c.created_at,
    })),
    menuItems: menuItems.map(m => ({
      id: m.id, categoryId: m.category_id, name: m.name, nameKn: m.name_kn,
      description: m.description, descriptionKn: m.description_kn,
      price: Number(m.price), imageUrl: m.image_url, isVeg: m.is_veg,
      available: m.available, featured: m.featured, preparationTimeMinutes: m.preparation_time_minutes,
      createdAt: m.created_at, updatedAt: m.updated_at,
    })),
  };
}
