import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const root = process.cwd();
const outputDir = path.join(root, 'data', 'store-csv');
const sourceFiles = {
  store: fs.readFileSync(path.join(root, 'src/services/store.ts'), 'utf8'),
  auth: fs.readFileSync(path.join(root, 'src/services/auth.ts'), 'utf8'),
};

function evaluateInitializer(source, name, context = {}) {
  const declaration = new RegExp(`\\bconst\\s+${name}\\b[^=]*=\\s*`).exec(source);
  if (!declaration) throw new Error(`Could not find ${name} in its TypeScript source.`);
  const start = declaration.index + declaration[0].length;
  const opener = source[start];
  const closer = opener === '[' ? ']' : opener === '{' ? '}' : null;
  if (!closer) throw new Error(`Expected an array or object initializer for ${name}.`);

  const stack = [];
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) { if (char === '\n') lineComment = false; continue; }
    if (blockComment) { if (char === '*' && next === '/') { blockComment = false; index += 1; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '/' && next === '/') { lineComment = true; index += 1; continue; }
    if (char === '/' && next === '*') { blockComment = true; index += 1; continue; }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '[' || char === '{' || char === '(') stack.push(char);
    if (char === ']' || char === '}' || char === ')') {
      stack.pop();
      if (stack.length === 0) {
        return vm.runInNewContext(`(${source.slice(start, index + 1)})`, { ...context, Date });
      }
    }
  }
  throw new Error(`Could not parse initializer for ${name}.`);
}

const rolePermissions = evaluateInitializer(sourceFiles.auth, 'ROLE_PERMISSIONS_MAP');
const demoUsers = evaluateInitializer(sourceFiles.auth, 'DEMO_USERS', { ROLE_PERMISSIONS_MAP: rolePermissions });
const users = evaluateInitializer(sourceFiles.auth, 'INITIAL_USER_ACCOUNTS', {
  ROLE_PERMISSIONS_MAP: rolePermissions,
  DEMO_USERS: demoUsers,
});
const categories = evaluateInitializer(sourceFiles.store, 'INITIAL_CATEGORIES');
const menuItems = evaluateInitializer(sourceFiles.store, 'INITIAL_MENU_ITEMS');
const orders = evaluateInitializer(sourceFiles.store, 'INITIAL_ORDERS');
const permissionDefinitions = evaluateInitializer(sourceFiles.auth, 'SYSTEM_PERMISSIONS');

const idMap = {
  'cat-specials': '11111111-1111-1111-1111-111111111111',
  'cat-idli-vade': '22222222-2222-2222-2222-222222222222',
  'cat-dosa-baths': '33333333-3333-3333-3333-333333333333',
  'cat-beverages': '44444444-4444-4444-4444-444444444444',
  'cat-sweets': '55555555-5555-5555-5555-555555555555',
  'item-thatte-idli': 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'item-habbe-vade': 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'item-kaayi-idli': 'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'item-filter-coffee': 'a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'item-tea': 'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'item-idli-combo': 'a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'item-vade-combo': 'a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'item-chow-chow-bath': 'a8888888-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'item-benne-dosa': 'a9999999-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'item-mysore-pak': 'baaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
};

function stableUuid(value) {
  const bytes = createHash('sha256').update(String(value)).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function csvCell(value) {
  if (value === undefined || value === null) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeCsv(fileName, columns, rows) {
  const body = [columns, ...rows.map(row => columns.map(column => row[column]))]
    .map(row => row.map(csvCell).join(','))
    .join('\r\n');
  fs.writeFileSync(path.join(outputDir, fileName), `\uFEFF${body}\r\n`, 'utf8');
}

fs.mkdirSync(outputDir, { recursive: true });

writeCsv('categories.csv',
  ['id', 'name', 'name_kn', 'description', 'display_order', 'active'],
  categories.map(c => ({
    id: idMap[c.id] || stableUuid(c.id), name: c.name, name_kn: c.nameKn,
    description: c.description, display_order: c.displayOrder, active: c.active,
  })));

writeCsv('menu_items.csv',
  ['id', 'category_id', 'name', 'name_kn', 'description', 'description_kn', 'price', 'image_url', 'is_veg', 'available', 'featured', 'preparation_time_minutes'],
  menuItems.map(item => ({
    id: idMap[item.id] || stableUuid(item.id), category_id: idMap[item.categoryId] || stableUuid(item.categoryId),
    name: item.name, name_kn: item.nameKn, description: item.description, description_kn: item.descriptionKn,
    price: item.price, image_url: item.imageUrl, is_veg: item.isVeg, available: item.available,
    featured: item.featured, preparation_time_minutes: item.preparationTimeMinutes,
  })));

const orderRows = orders.map(order => ({
  id: stableUuid(order.id), token_number: order.tokenNumber, token_date: order.tokenDate,
  tracking_token: order.trackingToken, customer_id: '', customer_name: order.customerName,
  customer_mobile: order.customerMobile, order_type: order.orderType, table_number: order.tableNumber || '',
  subtotal: order.subtotal, tax_amount: order.taxAmount, total_amount: order.totalAmount,
  payment_method: order.paymentMethod, payment_status: order.paymentStatus, order_status: order.orderStatus,
  notes: order.notes || '', estimated_prep_time_minutes: order.estimatedPrepTimeMinutes,
  created_at: order.createdAt, updated_at: order.updatedAt,
}));
writeCsv('orders.csv',
  ['id', 'token_number', 'token_date', 'tracking_token', 'customer_id', 'customer_name', 'customer_mobile', 'order_type', 'table_number', 'subtotal', 'tax_amount', 'total_amount', 'payment_method', 'payment_status', 'order_status', 'notes', 'estimated_prep_time_minutes', 'created_at', 'updated_at'],
  orderRows);

writeCsv('order_items.csv',
  ['id', 'order_id', 'menu_item_id', 'item_name', 'item_name_kn', 'quantity', 'unit_price', 'total_price', 'created_at'],
  orders.flatMap(order => order.items.map((item, index) => ({
    id: stableUuid(`${order.id}:item:${index}`), order_id: stableUuid(order.id),
    menu_item_id: idMap[item.menuItemId] || stableUuid(item.menuItemId), item_name: item.name,
    item_name_kn: item.nameKn || '', quantity: item.quantity, unit_price: item.unitPrice,
    total_price: item.totalPrice, created_at: order.createdAt,
  }))));

const roleDescriptions = {
  SUPER_ADMIN: 'Platform Owner with full system and administrative control',
  ADMIN: 'Restaurant Manager managing operations, menu, prices and reports',
  STAFF: 'Counter Operator handling live orders, payments, tokens and receipts',
  KITCHEN_STAFF: 'Kitchen Food Preparation team managing order preparation queue',
  CUSTOMER: 'Guest or registered customer browsing and tracking own orders',
};
const roleIds = Object.fromEntries(Object.keys(rolePermissions).map(role => [role, stableUuid(`role:${role}`)]));
const permissionIds = Object.fromEntries(permissionDefinitions.map(p => [p.key, stableUuid(`permission:${p.key}`)]));
writeCsv('roles.csv', ['id', 'name', 'description'], Object.entries(roleDescriptions).map(([name, description]) => ({ id: roleIds[name], name, description })));
writeCsv('permissions.csv', ['id', 'permission_key', 'description'], permissionDefinitions.map(p => ({ id: permissionIds[p.key], permission_key: p.key, description: p.description })));
writeCsv('role_permissions.csv', ['role_id', 'permission_id'], Object.entries(rolePermissions)
  .flatMap(([role, permissions]) => permissions.map(permission => ({
    role_id: roleIds[role], permission_id: permissionIds[permission],
  }))));

// These app accounts are browser-demo accounts, not Supabase Auth users. Passwords are intentionally omitted.
writeCsv('local_demo_users.csv', ['id', 'full_name', 'email', 'mobile', 'roles', 'permissions', 'is_active', 'created_at'], users.map(user => ({
  id: user.id, full_name: user.fullName, email: user.email, mobile: user.mobile || '',
  roles: user.roles, permissions: user.permissions, is_active: user.isActive, created_at: user.createdAt,
})));

writeCsv('user_profiles.csv', ['id', 'full_name', 'mobile', 'email', 'is_active'], []);
writeCsv('user_roles.csv', ['user_id', 'role_id', 'assigned_by'], []);
writeCsv('payments.csv', ['id', 'order_id', 'payment_provider', 'transaction_id', 'amount', 'payment_status', 'signature', 'verified_at', 'created_at'], []);
writeCsv('order_status_history.csv', ['id', 'order_id', 'previous_status', 'new_status', 'changed_by', 'changed_by_name', 'reason', 'created_at'], []);
writeCsv('audit_logs.csv', ['id', 'actor_id', 'actor_name', 'action', 'entity_type', 'entity_id', 'old_values', 'new_values', 'ip_address', 'created_at'], [{
  id: stableUuid('initial-audit-log'), actor_id: '', actor_name: 'System Setup', action: 'SYSTEM_INITIALIZATION',
  entity_type: 'SETTING', entity_id: stableUuid('outlet-balagere'), old_values: '',
  new_values: { message: 'Datta Prasada Outlet initialized with Sakleshpur Menu' }, ip_address: '', created_at: new Date().toISOString(),
}]);
writeCsv('daily_token_sequences.csv', ['token_date', 'last_sequence'], [{ token_date: orders[0].tokenDate, last_sequence: orders.length }]);

const readme = `# CSV exports generated from the store seed data\n\nGenerated by \`npm run export:store-csv\` from \`src/services/store.ts\` and \`src/services/auth.ts\`. Re-run the command after changing the seeded data.\n\n## Supabase import order\n\n1. For a fresh schema without seeded role data: \`roles.csv\` and \`permissions.csv\`, then \`role_permissions.csv\`. The migration already seeds these tables and junctions, so skip all three when using the supplied migration.\n2. \`categories.csv\`.\n3. \`menu_items.csv\`.\n4. \`orders.csv\`.\n5. \`order_items.csv\`.\n6. \`daily_token_sequences.csv\` and \`audit_logs.csv\` if desired.\n7. \`payments.csv\`, \`order_status_history.csv\`, \`user_profiles.csv\`, and \`user_roles.csv\` are header-only because the store seed has no corresponding rows.\n\nImport each file from Supabase Table Editor using the matching table. The app's current local demo session is not a Supabase Auth session; database row-level security may reject writes from the app, so use the Supabase dashboard for these CSV imports.\n\n## Important data notes\n\n- The seeded categories and menu items use the UUIDs from the database migration, so their references line up.\n- The role and permission CSVs include deterministic IDs, and \`role_permissions.csv\` uses those IDs. Import all three together only when their target tables are empty; they will not match IDs already generated by the migration.\n- \`local_demo_users.csv\` contains browser-only demo accounts and deliberately omits passwords. It is not a Supabase \`user_profiles\` import. Create users in Supabase Auth first, then use their actual Auth UUIDs in \`user_profiles.csv\` and \`user_roles.csv\`.\n- Order IDs are generated deterministically as UUIDs because the app's local order IDs are not valid PostgreSQL UUIDs. The sample tracking tokens and order data are demo records.\n- Empty CSVs contain only a header row. The store source does not seed payments or order status history.\n`;
fs.writeFileSync(path.join(outputDir, 'README.md'), readme, 'utf8');

console.log(`Generated CSV exports in ${path.relative(root, outputDir)}.`);
