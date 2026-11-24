import { 
  Category, 
  MenuItem, 
  Order, 
  OrderItem, 
  OrderStatus, 
  OrderStatusHistory, 
  AuditLog, 
  PaymentRecord, 
  OrderType, 
  PaymentMethod,
  PaymentStatus,
  UserRoleType,
  PermissionKey,
  UserAccount
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { INITIAL_USER_ACCOUNTS, ROLE_PERMISSIONS_MAP } from './auth';

// Initial pre-seeded categories
const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-specials',
    name: 'Sakleshpur Specials',
    nameKn: 'ಸಕಲೇಶಪುರ ಸ್ಪೆಷಲ್ಸ್',
    description: 'Traditional Malnad & Sakleshpur heritage recipes made with aromatic spices and desi ghee',
    displayOrder: 1,
    active: true,
  },
  {
    id: 'cat-idli-vade',
    name: 'Idli & Vade',
    nameKn: 'ಇಡ್ಲಿ ಮತ್ತು ವಡೆ',
    description: 'Steamed soft idlis and crispy vades served with authentic coconut chutney and piping hot sambar',
    displayOrder: 2,
    active: true,
  },
  {
    id: 'cat-dosa-baths',
    name: 'Dosa & Baths',
    nameKn: 'ದೋಸೆ ಮತ್ತು ಬಾತ್',
    description: 'Golden crisp butter dosas, traditional Chow Chow Bath and spicy Akki Roti',
    displayOrder: 3,
    active: true,
  },
  {
    id: 'cat-beverages',
    name: 'Beverages',
    nameKn: 'ಪಾನೀಯಗಳು',
    description: 'Authentic Chikmagalur & Sakleshpur estate filter coffee and tea',
    displayOrder: 4,
    active: true,
  },
  {
    id: 'cat-sweets',
    name: 'Sweets & Snacks',
    nameKn: 'ಸಿಹಿ ಮತ್ತು ತಿಂಡಿಗಳು',
    description: 'Traditional melt-in-mouth Mysore Pak, Kesari Bath and Malnad special snacks',
    displayOrder: 5,
    active: true,
  },
];

// Initial pre-seeded menu items
const INITIAL_MENU_ITEMS: MenuItem[] = [
  {
    id: 'item-thatte-idli',
    categoryId: 'cat-idli-vade',
    name: 'Thatte Idli',
    nameKn: 'ತಟ್ಟೆ ಇಡ್ಲಿ',
    description: 'Signature plate-sized fluffy steamed idli topped with fresh butter, served with spicy red chutney and fragrant hotel sambar.',
    descriptionKn: 'ತಾಜಾ ಬೆಣ್ಣೆ, ಕೆಂಪು ಚಟ್ನಿ ಮತ್ತು ಘಮಘಮಿಸುವ ಸಾಂಬಾರ್ ಜೊತೆಗೆ ಬಡಿಸುವ ಪ್ರಸಿದ್ಧ ಮೃದುವಾದ ತಟ್ಟೆ ಇಡ್ಲಿ.',
    price: 40,
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
    isVeg: true,
    available: true,
    featured: true,
    preparationTimeMinutes: 8,
  },
  {
    id: 'item-habbe-vade',
    categoryId: 'cat-idli-vade',
    name: 'Habbe Vade',
    nameKn: 'ಹಬ್ಬೆ ವಡೆ',
    description: 'Traditional Malnad-style steamed lentil dumpling gently spiced with ginger, green chilies, curry leaves and fresh coconut.',
    descriptionKn: 'ಶುಂಠಿ, ಹಸಿಮೆಣಸು, ಕರಿಬೇವು ಮತ್ತು ತೆಂಗಿನಕಾಯಿಯೊಂದಿಗೆ ಸಾಂಪ್ರದಾಯಿಕ ಶೈಲಿಯಲ್ಲಿ ಹಬೆಯಲ್ಲಿ ಬೇಯಿಸಿದ ಪೌಷ್ಟಿಕ ವಡೆ.',
    price: 30,
    imageUrl: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800&auto=format&fit=crop&q=80',
    isVeg: true,
    available: true,
    featured: true,
    preparationTimeMinutes: 10,
  },
  {
    id: 'item-kaayi-idli',
    categoryId: 'cat-specials',
    name: 'Kaayi Idli',
    nameKn: 'ಕಾಯಿ ಇಡ್ಲಿ',
    description: 'Special Sakleshpur heritage idli made with fresh grated tender coconut batter, steamed to delicate softness.',
    descriptionKn: 'ಸಕಲೇಶಪುರದ ಸಾಂಪ್ರದಾಯಿಕ ಖಾದ್ಯ, ತಾಜಾ ತೆಂಗಿನಕಾಯಿ ತುರಿಯಿಂದ ಸಿದ್ಧಪಡಿಸಿದ ಸುವಾಸನಾಯುಕ್ತ ಮೃದು ಇಡ್ಲಿ.',
    price: 50,
    imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80',
    isVeg: true,
    available: true,
    featured: true,
    preparationTimeMinutes: 10,
  },
  {
    id: 'item-filter-coffee',
    categoryId: 'cat-beverages',
    name: 'Filter Coffee',
    nameKn: 'ಫಿಲ್ಟರ್ ಕಾಫಿ',
    description: 'Authentic South Indian degree filter coffee brewed from freshly roasted Sakleshpur plantation beans and frothy milk.',
    descriptionKn: 'ಸಕಲೇಶಪುರದ ತೋಟದ ಕಾಫಿ ಪುಡಿಯಿಂದ ತಾಜಾ ಡಿಕಾಕ್ಷನ್ ಮತ್ತು ಕೆನೆ ಹಾಲಿನೊಂದಿಗೆ ತಯಾರಿಸಿದ ಅಸಲಿ ಫಿಲ್ಟರ್ ಕಾಫಿ.',
    price: 20,
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
    isVeg: true,
    available: true,
    featured: true,
    preparationTimeMinutes: 5,
  },
  {
    id: 'item-tea',
    categoryId: 'cat-beverages',
    name: 'Estate Special Tea',
    nameKn: 'ಚಹಾ',
    description: 'Aromatic hill-grown tea infused with fresh crushed cardamom and ginger.',
    descriptionKn: 'ಏಲಕ್ಕಿ ಮತ್ತು ಶುಂಠಿ ಪರಿಮಳಯುಕ್ತ ಬೆಟ್ಟದ ಸುವಾಸನೆಯ ತಾಜಾ ಚಹಾ.',
    price: 15,
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=80',
    isVeg: true,
    available: true,
    featured: false,
    preparationTimeMinutes: 5,
  },
  {
    id: 'item-idli-combo',
    categoryId: 'cat-idli-vade',
    name: 'Idli Vade Combo',
    nameKn: 'ಇಡ್ಲಿ ವಡೆ ಕಾಂಬೊ',
    description: '1 Soft Thatte Idli and 1 Crispy Uddina Vade served with generous dollops of butter, two chutneys and hot sambar.',
    descriptionKn: '೧ ಮೃದು ತಟ್ಟೆ ಇಡ್ಲಿ ಮತ್ತು ೧ ಗರಿಗರಿ ಉದ್ದಿನ ವಡೆ ಜೊತೆಗೆ ಬೆಣ್ಣೆ, ೨ ಚಟ್ನಿ ಮತ್ತು ಬಿಸಿ ಸಾಂಬಾರ್.',
    price: 60,
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
    isVeg: true,
    available: true,
    featured: true,
    preparationTimeMinutes: 8,
  },
  {
    id: 'item-vade-combo',
    categoryId: 'cat-idli-vade',
    name: 'Vade Combo (2 Pcs)',
    nameKn: 'ವಡೆ ಕಾಂಬೊ (೨ ಪೀಸ್)',
    description: 'Pair of golden crispy Habbe and Uddina Vades served with mint chutney and spiced coconut chutney.',
    descriptionKn: 'ಗರಿಗರಿಯಾದ ೨ ವಡೆಗಳು ಪುದೀನಾ ಮತ್ತು ತೆಂಗಿನಕಾಯಿ ಚಟ್ನಿ ಜೊತೆಗೆ.',
    price: 50,
    imageUrl: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800&auto=format&fit=crop&q=80',
    isVeg: true,
    available: true,
    featured: false,
    preparationTimeMinutes: 8,
  },
  {
    id: 'item-chow-chow-bath',
    categoryId: 'cat-dosa-baths',
    name: 'Chow Chow Bath',
    nameKn: 'ಚೌ ಚೌ ಬಾತ್',
    description: 'Classic Karnataka breakfast pair: savory spicy Khara Bath loaded with veggies and sweet melt-in-mouth Kesari Bath with pure ghee.',
    descriptionKn: 'ತುಪ್ಪದ ಸವಿ ಕೀಸರಿ ಬಾತ್ ಮತ್ತು ಖಾರವಾದ ಉಪ್ಪಿಟ್ಟು ಜೊತೆಯಾಗಿ ಬಡಿಸುವ ಸಾಂಪ್ರದಾಯಿಕ ಚೌ ಚೌ ಬಾತ್.',
    price: 55,
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
    isVeg: true,
    available: true,
    featured: true,
    preparationTimeMinutes: 8,
  },
  {
    id: 'item-benne-dosa',
    categoryId: 'cat-dosa-baths',
    name: 'Benne Masala Dosa',
    nameKn: 'ಬೆಣ್ಣೆ ಮಸಾಲೆ ದೋಸೆ',
    description: 'Crisp golden dosa roasted with dollops of fresh white butter, stuffed with fragrant potato palya.',
    descriptionKn: 'ತಾಜಾ ಬಿಳಿ ಬೆಣ್ಣೆಯಲ್ಲಿ ಹುರಿದ ಗರಿಗರಿ ದೋಸೆ, ರುಚಿಕರ ಆಲೂಗೆಡ್ಡೆ ಪಲ್ಯದೊಂದಿಗೆ.',
    price: 70,
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
    isVeg: true,
    available: true,
    featured: true,
    preparationTimeMinutes: 12,
  },
  {
    id: 'item-mysore-pak',
    categoryId: 'cat-sweets',
    name: 'Desi Ghee Mysore Pak',
    nameKn: 'ತುಪ್ಪದ ಮೈಸೂರು ಪಾಕ್',
    description: 'Authentic royal melt-in-mouth gram flour sweet prepared with rich cow ghee and cardamom.',
    descriptionKn: 'ಶುದ್ಧ ಹಸುವಿನ ತುಪ್ಪ ಮತ್ತು ಕಡಲೆಹಿಟ್ಟಿನಿಂದ ಸಿದ್ಧಪಡಿಸಿದ ನಾಲಿಗೆಯಲ್ಲಿ ಕರಗುವ ಮೈಸೂರು ಪಾಕ್.',
    price: 35,
    imageUrl: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=800&auto=format&fit=crop&q=80',
    isVeg: true,
    available: true,
    featured: false,
    preparationTimeMinutes: 2,
  },
];

// Initial seed orders for demonstration
const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-101',
    tokenNumber: 'DP-001',
    tokenDate: new Date().toISOString().split('T')[0],
    trackingToken: 'tr_sample_001_datta',
    customerName: 'Prajwal Gowda',
    customerMobile: '9845012345',
    orderType: 'DINE_IN',
    tableNumber: 'T-04',
    subtotal: 120,
    taxAmount: 6,
    totalAmount: 126,
    paymentMethod: 'UPI',
    paymentStatus: 'PAID',
    orderStatus: 'PREPARING',
    notes: 'Extra hot sambar please',
    estimatedPrepTimeMinutes: 10,
    items: [
      { menuItemId: 'item-thatte-idli', name: 'Thatte Idli', nameKn: 'ತಟ್ಟೆ ಇಡ್ಲಿ', quantity: 2, unitPrice: 40, totalPrice: 80 },
      { menuItemId: 'item-filter-coffee', name: 'Filter Coffee', nameKn: 'ಫಿಲ್ಟರ್ ಕಾಫಿ', quantity: 2, unitPrice: 20, totalPrice: 40 },
    ],
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: 'ord-102',
    tokenNumber: 'DP-002',
    tokenDate: new Date().toISOString().split('T')[0],
    trackingToken: 'tr_sample_002_datta',
    customerName: 'Shruti Hegde',
    customerMobile: '9900188223',
    orderType: 'TAKEAWAY',
    subtotal: 100,
    taxAmount: 5,
    totalAmount: 105,
    paymentMethod: 'CASH',
    paymentStatus: 'PENDING',
    orderStatus: 'ACCEPTED',
    notes: 'Pack chutneys separately in eco cups',
    estimatedPrepTimeMinutes: 12,
    items: [
      { menuItemId: 'item-kaayi-idli', name: 'Kaayi Idli', nameKn: 'ಕಾಯಿ ಇಡ್ಲಿ', quantity: 2, unitPrice: 50, totalPrice: 100 },
    ],
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
  },
  {
    id: 'ord-103',
    tokenNumber: 'DP-003',
    tokenDate: new Date().toISOString().split('T')[0],
    trackingToken: 'tr_sample_003_datta',
    customerName: 'Anand Murthy',
    customerMobile: '9740523456',
    orderType: 'DINE_IN',
    tableNumber: 'T-02',
    subtotal: 60,
    taxAmount: 3,
    totalAmount: 63,
    paymentMethod: 'UPI',
    paymentStatus: 'PAID',
    orderStatus: 'READY',
    notes: 'Mild spicy',
    estimatedPrepTimeMinutes: 8,
    items: [
      { menuItemId: 'item-idli-combo', name: 'Idli Vade Combo', nameKn: 'ಇಡ್ಲಿ ವಡೆ ಕಾಂಬೊ', quantity: 1, unitPrice: 60, totalPrice: 60 },
    ],
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
];

// Broadcast channel for multi-tab realtime events
const bc = typeof window !== 'undefined' && 'BroadcastChannel' in window 
  ? new BroadcastChannel('datta_prasada_realtime')
  : null;

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
    parcelCharge: Number(row.parcel_charge || 0),
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

class StoreService {
  private categoriesKey = 'dp_categories';
  private menuKey = 'dp_menu_items';
  private ordersKey = 'dp_orders';
  private auditKey = 'dp_audit_logs';
  private sequenceKey = 'dp_daily_sequence';
  private usersKey = 'dp_user_accounts';

  constructor() {
    this.initStorage();
  }

  private initStorage() {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem(this.categoriesKey)) {
      localStorage.setItem(this.categoriesKey, JSON.stringify(INITIAL_CATEGORIES));
    }
    if (!localStorage.getItem(this.menuKey)) {
      localStorage.setItem(this.menuKey, JSON.stringify(INITIAL_MENU_ITEMS));
    }
    if (!localStorage.getItem(this.ordersKey)) {
      localStorage.setItem(this.ordersKey, JSON.stringify(INITIAL_ORDERS));
    }
    if (!localStorage.getItem(this.usersKey)) {
      localStorage.setItem(this.usersKey, JSON.stringify(INITIAL_USER_ACCOUNTS));
    }
    if (!localStorage.getItem(this.auditKey)) {
      const initialLogs: AuditLog[] = [
        {
          id: 'log-init-1',
          actorName: 'System Setup',
          action: 'SYSTEM_INITIALIZATION',
          entityType: 'SETTING',
          entityId: 'outlet-balagere',
          newValues: { message: 'Datta Prasada Outlet initialized with Sakleshpur Menu' },
          createdAt: new Date().toISOString(),
        }
      ];
      localStorage.setItem(this.auditKey, JSON.stringify(initialLogs));
    }
  }

  // Realtime notification dispatcher
  private notifySubscribers(eventType: string, payload: any) {
    if (typeof window === 'undefined') return;
    const event = new CustomEvent('dp_store_event', { detail: { eventType, payload } });
    window.dispatchEvent(event);
    if (bc) {
      bc.postMessage({ eventType, payload });
    }
  }

  // Subscribe to realtime changes
  public subscribe(callback: (eventType: string, payload: any) => void): () => void {
    const handleCustom = (e: any) => callback(e.detail.eventType, e.detail.payload);
    const handleBc = (msg: MessageEvent) => callback(msg.data.eventType, msg.data.payload);

    window.addEventListener('dp_store_event', handleCustom);
    if (bc) bc.addEventListener('message', handleBc);

    return () => {
      window.removeEventListener('dp_store_event', handleCustom);
      if (bc) bc.removeEventListener('message', handleBc);
    };
  }

  // --------------------------------------------------------------------------
  // Categories
  // --------------------------------------------------------------------------
  public getCategories(): Category[] {
    const raw = localStorage.getItem(this.categoriesKey);
    return raw ? JSON.parse(raw) : INITIAL_CATEGORIES;
  }

  public saveCategory(category: Category, actorName: string = 'Admin'): void {
    const cats = this.getCategories();
    const index = cats.findIndex(c => c.id === category.id);
    let oldVal: any = undefined;
    if (index >= 0) {
      oldVal = cats[index];
      cats[index] = category;
    } else {
      cats.push(category);
    }
    localStorage.setItem(this.categoriesKey, JSON.stringify(cats));
    this.addAuditLog({
      actorName,
      action: index >= 0 ? 'CATEGORY_UPDATED' : 'CATEGORY_CREATED',
      entityType: 'CATEGORY',
      entityId: category.id,
      oldValues: oldVal,
      newValues: category,
    });
    this.notifySubscribers('CATEGORIES_UPDATED', cats);
  }

  // --------------------------------------------------------------------------
  // Menu Items
  // --------------------------------------------------------------------------
  public getMenuItems(): MenuItem[] {
    const raw = localStorage.getItem(this.menuKey);
    return raw ? JSON.parse(raw) : INITIAL_MENU_ITEMS;
  }

  public getMenuItemById(id: string): MenuItem | undefined {
    return this.getMenuItems().find(item => item.id === id);
  }

  public saveMenuItem(item: MenuItem, actorName: string = 'Admin'): void {
    const items = this.getMenuItems();
    const index = items.findIndex(i => i.id === item.id);
    let oldVal: any = undefined;
    if (index >= 0) {
      oldVal = items[index];
      items[index] = { ...item, updatedAt: new Date().toISOString() };
    } else {
      items.push({ ...item, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    localStorage.setItem(this.menuKey, JSON.stringify(items));
    
    this.addAuditLog({
      actorName,
      action: index >= 0 ? 'MENU_ITEM_UPDATED' : 'MENU_ITEM_CREATED',
      entityType: 'MENU_ITEM',
      entityId: item.id,
      oldValues: oldVal,
      newValues: item,
    });

    this.notifySubscribers('MENU_UPDATED', items);
  }

  public deleteMenuItem(id: string, actorName: string = 'Admin'): void {
    const items = this.getMenuItems();
    const oldItem = items.find(i => i.id === id);
    const updated = items.filter(i => i.id !== id);
    localStorage.setItem(this.menuKey, JSON.stringify(updated));

    this.addAuditLog({
      actorName,
      action: 'MENU_ITEM_DELETED',
      entityType: 'MENU_ITEM',
      entityId: id,
      oldValues: oldItem,
    });

    this.notifySubscribers('MENU_UPDATED', updated);
  }

  public toggleItemAvailability(id: string, available: boolean, actorName: string = 'Admin'): void {
    const item = this.getMenuItemById(id);
    if (!item) return;
    this.saveMenuItem({ ...item, available }, actorName);
  }

  // --------------------------------------------------------------------------
  // Atomic Token Generation & Order Creation
  // --------------------------------------------------------------------------
  private getNextDailyToken(): { tokenNumber: string; tokenDate: string } {
    const today = new Date().toISOString().split('T')[0];
    const rawSeq = localStorage.getItem(this.sequenceKey);
    let seqData = rawSeq ? JSON.parse(rawSeq) : { date: today, seq: 3 };

    if (seqData.date !== today) {
      seqData = { date: today, seq: 1 };
    } else {
      seqData.seq += 1;
    }

    localStorage.setItem(this.sequenceKey, JSON.stringify(seqData));
    const tokenNumber = `DP-${String(seqData.seq).padStart(3, '0')}`;
    return { tokenNumber, tokenDate: today };
  }

  // Generate secure unguessable tracking token (32 random hex)
  private generateTrackingToken(): string {
    const arr = new Uint8Array(16);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(arr);
    } else {
      for (let i = 0; i < 16; i++) arr[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  public createOrder(params: {
    customerName: string;
    customerMobile: string;
    orderType: OrderType;
    tableNumber?: string;
    paymentMethod: PaymentMethod;
    paymentStatus?: PaymentStatus;
    notes?: string;
    items: OrderItem[];
  }): Promise<Order> {
    if (isSupabaseConfigured && supabase) return this.createDatabaseOrder(params);
    const { tokenNumber, tokenDate } = this.getNextDailyToken();
    const trackingToken = this.generateTrackingToken();

    const subtotal = params.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const taxAmount = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST
    const totalAmount = subtotal + taxAmount;

    // Calculate max prep time
    const menuItems = this.getMenuItems();
    let maxPrep = 10;
    params.items.forEach(it => {
      const found = menuItems.find(m => m.id === it.menuItemId);
      if (found && found.preparationTimeMinutes > maxPrep) {
        maxPrep = found.preparationTimeMinutes;
      }
    });

    const newOrder: Order = {
      id: `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tokenNumber,
      tokenDate,
      trackingToken,
      customerName: params.customerName.trim(),
      customerMobile: params.customerMobile.trim(),
      orderType: params.orderType,
      tableNumber: params.tableNumber?.trim() || undefined,
      subtotal,
      taxAmount,
      totalAmount,
      paymentMethod: params.paymentMethod,
      paymentStatus: params.paymentStatus || (params.paymentMethod === 'UPI' ? 'PAID' : 'PENDING'),
      orderStatus: 'PLACED',
      notes: params.notes?.trim() || undefined,
      estimatedPrepTimeMinutes: maxPrep,
      items: params.items,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const orders = this.getOrders();
    orders.unshift(newOrder);
    localStorage.setItem(this.ordersKey, JSON.stringify(orders));

    this.addAuditLog({
      actorName: params.customerName,
      action: 'ORDER_PLACED',
      entityType: 'ORDER',
      entityId: newOrder.id,
      newValues: {
        tokenNumber,
        totalAmount,
        paymentMethod: params.paymentMethod,
        orderType: params.orderType,
      },
    });

    this.notifySubscribers('ORDER_CREATED', newOrder);
    return Promise.resolve(newOrder);
  }

  private async createDatabaseOrder(params: {
    customerName: string;
    customerMobile: string;
    orderType: OrderType;
    tableNumber?: string;
    paymentMethod: PaymentMethod;
    paymentStatus?: PaymentStatus;
    notes?: string;
    items: OrderItem[];
  }): Promise<Order> {
    const itemNames = [...new Set(params.items.map((item) => item.name))];
    const { data: dbMenuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('id, name, price, preparation_time_minutes, available')
      .in('name', itemNames);
    if (menuError) throw new Error(`Could not verify menu items: ${menuError.message}`);
    const menuByName = new Map((dbMenuItems || []).map((item: any) => [String(item.name).trim().toLowerCase(), item]));
    const rpcItems = params.items.map((item) => {
      const dbItem = menuByName.get(item.name.trim().toLowerCase()) as any;
      if (!dbItem || !dbItem.available) throw new Error(`${item.name} is no longer available. Refresh the menu and try again.`);
      return { menu_item_id: dbItem.id, name: dbItem.name, quantity: item.quantity, price: Number(dbItem.price) };
    });
    const subtotal = rpcItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxAmount = Math.round(subtotal * 0.05 * 100) / 100;
    const { data, error } = await supabase.rpc('create_order_with_token', {
      p_customer_name: params.customerName.trim(),
      p_customer_mobile: params.customerMobile.trim(),
      p_order_type: params.orderType,
      p_table_number: params.tableNumber?.trim() || null,
      p_subtotal: subtotal,
      p_tax_amount: taxAmount,
      p_total_amount: subtotal + taxAmount,
      p_payment_method: params.paymentMethod,
      p_payment_status: params.paymentStatus || (params.paymentMethod === 'UPI' ? 'PAID' : 'PENDING'),
      p_notes: params.notes?.trim() || null,
      p_items: rpcItems,
    });
    if (error) throw new Error(`Order was not saved: ${error.message}`);
    const order = await this.queryDatabaseOrderByTrackingToken(data.tracking_token);
    if (!order) throw new Error('The order was submitted but could not be loaded for confirmation. Save tracking token: ' + data.tracking_token);
    this.notifySubscribers('ORDER_CREATED', order);
    return order;
  }

  public async getDatabaseOrders(): Promise<Order[]> {
    if (!isSupabaseConfigured || !supabase) return this.getOrders();
    const { data, error } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
    if (error) throw new Error(`Could not load orders: ${error.message}`);
    return (data || []).map((row: any) => mapDatabaseOrder(row));
  }

  public async getDatabaseOrderById(id: string): Promise<Order | undefined> {
    if (!isSupabaseConfigured || !supabase) return this.getOrderById(id);
    const { data, error } = await supabase.from('orders').select('*, order_items(*)').eq('id', id).maybeSingle();
    if (error) throw new Error(`Could not load order: ${error.message}`);
    return data ? mapDatabaseOrder(data) : undefined;
  }

  public async getDatabaseOrderByTrackingToken(token: string): Promise<Order | undefined> {
    if (!isSupabaseConfigured || !supabase) return this.getOrderByTrackingToken(token);
    return this.queryDatabaseOrderByTrackingToken(token);
  }

  public async findDatabaseOrder(reference: string): Promise<Order | undefined> {
    if (!isSupabaseConfigured || !supabase) {
      return this.getOrderByTrackingToken(reference) || this.getOrderByTokenNumber(reference) || this.getOrderById(reference);
    }
    const byTrackingToken = await this.queryDatabaseOrderByTrackingToken(reference);
    if (byTrackingToken) return byTrackingToken;
    const staffOrders = await this.getDatabaseOrders();
    const clean = reference.trim().toUpperCase();
    return staffOrders.find((order) => order.tokenNumber.toUpperCase() === clean || order.id.toUpperCase() === clean);
  }

  private async queryDatabaseOrderByTrackingToken(token: string): Promise<Order | undefined> {
    const { data, error } = await supabase.rpc('get_order_by_tracking_token', { p_tracking_token: token });
    if (error) throw new Error(`Could not load tracked order: ${error.message}`);
    if (!data?.order) return undefined;
    return mapDatabaseOrder(data.order, data.items || []);
  }

  public async updateDatabaseOrderStatus(orderId: string, newStatus: OrderStatus, actorName: string, actorRole: UserRoleType, reason?: string) {
    if (!isSupabaseConfigured || !supabase) return this.updateOrderStatus(orderId, newStatus, actorName, actorRole, reason);
    const { data, error } = await supabase.rpc('advance_order_status', {
      p_order_id: orderId,
      p_new_status: newStatus,
      p_actor_name: actorName,
      p_reason: reason || null,
    });
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: 'Order not found.' };
    const updatedOrder = await this.getDatabaseOrderById(orderId);
    if (updatedOrder) this.notifySubscribers('ORDER_UPDATED', updatedOrder);
    return { success: true };
  }

  public async updateDatabasePaymentStatus(orderId: string, status: PaymentStatus, actorName: string, actorRole: UserRoleType) {
    if (!isSupabaseConfigured || !supabase) return { success: this.updatePaymentStatus(orderId, status, actorName, actorRole) };
    const { data, error } = await supabase.rpc('set_order_payment_status', {
      p_order_id: orderId,
      p_payment_status: status,
      p_actor_name: actorName,
    });
    if (error) return { success: false, error: error.message };
    const updatedOrder = await this.getDatabaseOrderById(orderId);
    if (updatedOrder) this.notifySubscribers('ORDER_UPDATED', updatedOrder);
    return { success: !!data, error: data ? undefined : 'Order not found.' };
  }

  // --------------------------------------------------------------------------
  // Orders Query & Status State Machine
  // --------------------------------------------------------------------------
  public getOrders(): Order[] {
    const raw = localStorage.getItem(this.ordersKey);
    return raw ? JSON.parse(raw) : INITIAL_ORDERS;
  }

  public getOrderById(id: string): Order | undefined {
    return this.getOrders().find(o => o.id === id);
  }

  public getOrderByTrackingToken(token: string): Order | undefined {
    return this.getOrders().find(o => o.trackingToken === token || o.id === token);
  }

  public getOrderByTokenNumber(tokenNumber: string): Order | undefined {
    const clean = tokenNumber.toUpperCase().trim();
    return this.getOrders().find(o => o.tokenNumber.toUpperCase() === clean);
  }

  /**
   * Order Status State Machine Transition Validator
   * Permitted Flow: PLACED -> ACCEPTED -> PREPARING -> READY -> COMPLETED
   * Cancellations allowed with appropriate permission.
   */
  public updateOrderStatus(
    orderId: string, 
    newStatus: OrderStatus, 
    actorName: string, 
    actorRole: UserRoleType,
    reason?: string
  ): { success: boolean; error?: string; order?: Order } {
    const orders = this.getOrders();
    const index = orders.findIndex(o => o.id === orderId);
    if (index === -1) {
      return { success: false, error: 'Order not found' };
    }

    const order = orders[index];
    const prevStatus = order.orderStatus;

    // Check Role vs Transition permissions
    if (actorRole === 'KITCHEN_STAFF') {
      const allowedKitchenTransitions = [
        { from: 'ACCEPTED', to: 'PREPARING' },
        { from: 'PREPARING', to: 'READY' },
      ];
      const valid = allowedKitchenTransitions.some(t => t.from === prevStatus && t.to === newStatus);
      if (!valid) {
        return { 
          success: false, 
          error: `Kitchen staff can only advance orders from ACCEPTED -> PREPARING and PREPARING -> READY.` 
        };
      }
    } else if (actorRole === 'STAFF') {
      const allowedStaffTransitions = [
        { from: 'PLACED', to: 'ACCEPTED' },
        { from: 'READY', to: 'COMPLETED' },
        { from: 'PLACED', to: 'CANCELLED' },
      ];
      const valid = allowedStaffTransitions.some(t => t.from === prevStatus && t.to === newStatus);
      if (!valid) {
        return {
          success: false,
          error: `Counter staff can only accept placed orders or mark ready orders as completed.`
        };
      }
    }

    // Apply update
    order.orderStatus = newStatus;
    order.updatedAt = new Date().toISOString();
    orders[index] = order;
    localStorage.setItem(this.ordersKey, JSON.stringify(orders));

    this.addAuditLog({
      actorName,
      actorRole,
      action: `ORDER_STATUS_${newStatus}`,
      entityType: 'ORDER',
      entityId: order.id,
      oldValues: { orderStatus: prevStatus },
      newValues: { orderStatus: newStatus, reason },
    });

    this.notifySubscribers('ORDER_UPDATED', order);
    return { success: true, order };
  }

  public updatePaymentStatus(orderId: string, status: PaymentStatus, actorName: string, actorRole: UserRoleType): boolean {
    const orders = this.getOrders();
    const index = orders.findIndex(o => o.id === orderId);
    if (index === -1) return false;

    const order = orders[index];
    const oldStatus = order.paymentStatus;
    order.paymentStatus = status;
    order.updatedAt = new Date().toISOString();
    orders[index] = order;
    localStorage.setItem(this.ordersKey, JSON.stringify(orders));

    this.addAuditLog({
      actorName,
      actorRole,
      action: `PAYMENT_${status}`,
      entityType: 'PAYMENT',
      entityId: order.id,
      oldValues: { paymentStatus: oldStatus },
      newValues: { paymentStatus: status },
    });

    this.notifySubscribers('ORDER_UPDATED', order);
    return true;
  }

  // --------------------------------------------------------------------------
  // Audit Logs
  // --------------------------------------------------------------------------
  public getAuditLogs(): AuditLog[] {
    const raw = localStorage.getItem(this.auditKey);
    return raw ? JSON.parse(raw) : [];
  }

  public addAuditLog(entry: Omit<AuditLog, 'id' | 'createdAt'>): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      ...entry,
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    logs.unshift(newLog);
    // Keep last 500 logs in local storage
    if (logs.length > 500) logs.pop();
    localStorage.setItem(this.auditKey, JSON.stringify(logs));
  }

  // --------------------------------------------------------------------------
  // User Management & RBAC Administration
  // --------------------------------------------------------------------------
  public getUsers(): UserAccount[] {
    if (typeof window === 'undefined') return INITIAL_USER_ACCOUNTS;
    const raw = localStorage.getItem(this.usersKey);
    if (!raw) {
      localStorage.setItem(this.usersKey, JSON.stringify(INITIAL_USER_ACCOUNTS));
      return INITIAL_USER_ACCOUNTS;
    }
    try {
      const parsed: UserAccount[] = JSON.parse(raw);
      let needsResave = false;
      parsed.forEach(u => {
        const primaryRole = u.roles[0];
        // Enforce RBAC policy: Counter staff must not have dashboard.view
        if (primaryRole === 'STAFF' && u.permissions.includes('dashboard.view')) {
          u.permissions = u.permissions.filter(p => p !== 'dashboard.view');
          needsResave = true;
        }
      });
      if (needsResave) {
        localStorage.setItem(this.usersKey, JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return INITIAL_USER_ACCOUNTS;
    }
  }

  public getUserById(id: string): UserAccount | undefined {
    return this.getUsers().find(u => u.id === id);
  }

  public getUserByEmail(email: string): UserAccount | undefined {
    const clean = email.toLowerCase().trim();
    return this.getUsers().find(u => u.email.toLowerCase().trim() === clean);
  }

  public createUser(
    params: {
      fullName: string;
      email: string;
      mobile?: string;
      role: UserRoleType;
      password: string;
      isActive?: boolean;
    },
    actor: { name: string; role: UserRoleType }
  ): { success: boolean; error?: string; user?: UserAccount } {
    if (actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Authorization error: Only Super Admin can create new user accounts.' };
    }

    const cleanEmail = params.email.toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (!params.fullName || params.fullName.trim().length < 2) {
      return { success: false, error: 'Full name must be at least 2 characters.' };
    }

    if (!params.password || params.password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const users = this.getUsers();
    if (users.some(u => u.email.toLowerCase().trim() === cleanEmail)) {
      return { success: false, error: `A user with email "${cleanEmail}" already exists.` };
    }

    const newUserId = `usr-${params.role.toLowerCase().replace('_', '-')}-${Date.now().toString(36)}`;
    const permissions = ROLE_PERMISSIONS_MAP[params.role] || [];

    const newUser: UserAccount = {
      id: newUserId,
      fullName: params.fullName.trim(),
      email: cleanEmail,
      mobile: params.mobile?.trim() || undefined,
      roles: [params.role],
      permissions,
      isActive: params.isActive !== undefined ? params.isActive : true,
      password: params.password,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem(this.usersKey, JSON.stringify(users));

    this.addAuditLog({
      actorName: actor.name,
      actorRole: actor.role,
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: newUser.id,
      newValues: {
        id: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: params.role,
        isActive: newUser.isActive,
      },
    });

    this.notifySubscribers('USERS_UPDATED', users);
    return { success: true, user: newUser };
  }

  public updateUserRole(
    userId: string,
    newRole: UserRoleType,
    actor: { name: string; role: UserRoleType }
  ): { success: boolean; error?: string; user?: UserAccount } {
    if (actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Only Super Admin can reassign user roles.' };
    }

    const users = this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) return { success: false, error: 'User account not found' };

    const oldRole = users[index].roles[0];
    users[index].roles = [newRole];
    users[index].permissions = ROLE_PERMISSIONS_MAP[newRole] || [];
    users[index].updatedAt = new Date().toISOString();

    localStorage.setItem(this.usersKey, JSON.stringify(users));

    this.addAuditLog({
      actorName: actor.name,
      actorRole: actor.role,
      action: 'ROLE_REASSIGNED',
      entityType: 'USER',
      entityId: userId,
      oldValues: { role: oldRole },
      newValues: { role: newRole },
    });

    this.notifySubscribers('USERS_UPDATED', users);
    return { success: true, user: users[index] };
  }

  public toggleUserActive(
    userId: string,
    actor: { name: string; role: UserRoleType }
  ): { success: boolean; error?: string; user?: UserAccount } {
    if (actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Only Super Admin can activate or deactivate accounts.' };
    }

    const users = this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) return { success: false, error: 'User account not found' };

    const prevActive = users[index].isActive;
    users[index].isActive = !prevActive;
    users[index].updatedAt = new Date().toISOString();

    localStorage.setItem(this.usersKey, JSON.stringify(users));

    this.addAuditLog({
      actorName: actor.name,
      actorRole: actor.role,
      action: prevActive ? 'USER_DEACTIVATED' : 'USER_ACTIVATED',
      entityType: 'USER',
      entityId: userId,
      oldValues: { isActive: prevActive },
      newValues: { isActive: !prevActive },
    });

    this.notifySubscribers('USERS_UPDATED', users);
    return { success: true, user: users[index] };
  }

  public changeUserPassword(
    userId: string,
    newPassword: string,
    actor: { name: string; role: UserRoleType; userId?: string },
    oldPassword?: string
  ): { success: boolean; error?: string } {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) return { success: false, error: 'User account not found.' };

    const targetUser = users[index];

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long.' };
    }

    const isSuperAdminReset = actor.role === 'SUPER_ADMIN' && actor.userId !== userId;

    if (!isSuperAdminReset) {
      // Self-change or non-super-admin: must verify old password
      if (!oldPassword) {
        return { success: false, error: 'Current password is required.' };
      }
      if (targetUser.password && targetUser.password !== oldPassword) {
        return { success: false, error: 'Incorrect current password.' };
      }
    }

    if (targetUser.password === newPassword) {
      return { success: false, error: 'New password must be different from current password.' };
    }

    targetUser.password = newPassword;
    targetUser.updatedAt = new Date().toISOString();
    users[index] = targetUser;

    localStorage.setItem(this.usersKey, JSON.stringify(users));

    this.addAuditLog({
      actorName: actor.name,
      actorRole: actor.role,
      action: isSuperAdminReset ? 'USER_PASSWORD_RESET_BY_SUPER_ADMIN' : 'USER_PASSWORD_SELF_UPDATED',
      entityType: 'USER',
      entityId: userId,
      newValues: {
        targetUser: targetUser.fullName,
        targetEmail: targetUser.email,
        targetRole: targetUser.roles[0],
        resetBy: actor.name,
      },
    });

    this.notifySubscribers('USERS_UPDATED', users);
    return { success: true };
  }

  public getRolePermissionsMap(): Record<UserRoleType, PermissionKey[]> {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('dp_role_permissions') : null;
    return stored ? JSON.parse(stored) : { ...ROLE_PERMISSIONS_MAP };
  }

  public getRolePermissions(role: UserRoleType): PermissionKey[] {
    return this.getRolePermissionsMap()[role] || [];
  }

  public toggleRolePermission(role: UserRoleType, permission: PermissionKey, enabled: boolean, actor: { name: string; role: UserRoleType }) {
    const map = this.getRolePermissionsMap();
    const current = new Set(map[role] || []);
    enabled ? current.add(permission) : current.delete(permission);
    map[role] = [...current];
    localStorage.setItem('dp_role_permissions', JSON.stringify(map));
    this.notifySubscribers('ROLE_PERMISSIONS_UPDATED', { role, permission, enabled, actor });
    return { success: true, error: undefined as string | undefined };
  }

  public resetRolePermissionsToDefault(_actor: { name: string; role: UserRoleType }) {
    localStorage.setItem('dp_role_permissions', JSON.stringify(ROLE_PERMISSIONS_MAP));
    this.notifySubscribers('ROLE_PERMISSIONS_UPDATED', null);
    return { success: true, error: undefined as string | undefined };
  }
}

export const store = new StoreService();
