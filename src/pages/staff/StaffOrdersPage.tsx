import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { store } from '../../services/store';
import { Order, OrderStatus } from '../../types';
import { ThermalReceiptModal } from '../../components/printer/ThermalReceiptModal';
import { 
  Search, 
  Filter, 
  Printer, 
  Check, 
  Clock, 
  Utensils, 
  Package, 
  Banknote, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  Play, 
  ChefHat,
  RefreshCw,
  Bell
} from 'lucide-react';

export const StaffOrdersPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { language, t } = useLanguage();

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Printing modal state
  const [activePrintOrder, setActivePrintOrder] = useState<Order | null>(null);
  const [printMode, setPrintMode] = useState<'RECEIPT' | 'KOT'>('RECEIPT');

  const loadOrders = () => {
    setOrders(store.getOrders());
  };

  useEffect(() => {
    loadOrders();
    const unsub = store.subscribe(() => {
      loadOrders();
    });
    return unsub;
  }, []);

  // Filter orders
  const filteredOrders = orders.filter(o => {
    const matchesFilter = selectedFilter === 'ALL' || o.orderStatus === selectedFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      o.tokenNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerMobile.includes(q)
    );
    return matchesFilter && matchesSearch;
  });

  const handleStatusChange = (orderId: string, nextStatus: OrderStatus) => {
    if (!user) return;
    const res = store.updateOrderStatus(
      orderId,
      nextStatus,
      user.fullName,
      user.roles[0]
    );
    if (!res.success && res.error) {
      alert(res.error);
    }
  };

  const handleMarkCashPaid = (orderId: string) => {
    if (!user) return;
    store.updatePaymentStatus(orderId, 'PAID', user.fullName, user.roles[0]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-28">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gold-200/60 pb-4">
        <div>
          <h1 className="font-serif font-black text-3xl text-temple-900">
            Counter Orders Management
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm">
            Live order processing, payment settlement and token calls
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadOrders}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Token (e.g. DP-001) or Mobile..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 transition"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'ALL', label: 'All Orders' },
            { id: 'PLACED', label: 'New' },
            { id: 'ACCEPTED', label: 'Accepted' },
            { id: 'PREPARING', label: 'Preparing' },
            { id: 'READY', label: 'Ready' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedFilter === tab.id
                  ? 'bg-temple-700 text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 p-8 space-y-2">
          <p className="text-stone-500 text-sm">No orders found matching this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => {
            const isCashPending = order.paymentMethod === 'CASH' && order.paymentStatus === 'PENDING';

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-traditional transition flex flex-col justify-between overflow-hidden"
              >
                {/* Order Top Bar */}
                <div className="p-4 bg-cream-50/70 border-b border-stone-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-black text-2xl text-temple-900">
                      {order.tokenNumber}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                      {order.orderType === 'DINE_IN' ? `Table ${order.tableNumber || 'Self'}` : 'Takeaway'}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                      order.orderStatus === 'READY'
                        ? 'bg-green-100 text-green-800 animate-pulse'
                        : order.orderStatus === 'PREPARING'
                        ? 'bg-blue-100 text-blue-800'
                        : order.orderStatus === 'PLACED'
                        ? 'bg-amber-100 text-amber-800'
                        : order.orderStatus === 'COMPLETED'
                        ? 'bg-stone-100 text-stone-600'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {order.orderStatus}
                  </span>
                </div>

                {/* Customer & Items Content */}
                <div className="p-5 space-y-4 flex-1">
                  {/* Customer info */}
                  <div className="flex justify-between text-xs text-stone-600">
                    <span className="font-semibold text-stone-900">{order.customerName}</span>
                    <span className="font-mono">{order.customerMobile}</span>
                  </div>

                  {/* Items */}
                  <div className="bg-stone-50 rounded-xl p-3 divide-y divide-stone-200/60 text-xs">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="py-1 flex justify-between">
                        <span className="text-stone-800">
                          <strong className="text-temple-800 mr-2">{item.quantity}x</strong>
                          {language === 'kn' && item.nameKn ? item.nameKn : item.name}
                        </span>
                        <span className="font-mono text-stone-600">₹{item.totalPrice}</span>
                      </div>
                    ))}
                  </div>

                  {/* Kitchen Instructions */}
                  {order.notes && (
                    <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-xs font-medium">
                      Note: {order.notes}
                    </div>
                  )}

                  {/* Payment Bar */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100">
                    <div className="flex items-center gap-1.5">
                      {order.paymentMethod === 'UPI' ? (
                        <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <Banknote className="w-3.5 h-3.5 text-amber-600" />
                      )}
                      <span className="font-bold">{order.paymentMethod}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          order.paymentStatus === 'PAID'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </div>

                    <div className="font-serif font-black text-base text-temple-900">
                      ₹{order.totalAmount.toFixed(2)}
                    </div>
                  </div>

                  {/* Cash Settle CTA if pending */}
                  {isCashPending && (
                    <button
                      onClick={() => handleMarkCashPaid(order.id)}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Banknote className="w-4 h-4" />
                      <span>Collect Cash & Mark as PAID</span>
                    </button>
                  )}
                </div>

                {/* Footer Controls & Print */}
                <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setActivePrintOrder(order);
                        setPrintMode('KOT');
                      }}
                      className="p-2 rounded-lg border border-stone-300 text-stone-600 hover:bg-white text-xs font-bold transition"
                      title="Print KOT"
                    >
                      <ChefHat className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setActivePrintOrder(order);
                        setPrintMode('RECEIPT');
                      }}
                      className="p-2 rounded-lg border border-stone-300 text-stone-600 hover:bg-white text-xs font-bold transition"
                      title="Print Customer Slip"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Status Advancer Buttons */}
                  <div className="flex items-center gap-1.5">
                    {order.orderStatus === 'PLACED' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'ACCEPTED')}
                        className="px-3 py-1.5 bg-temple-700 hover:bg-temple-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                    )}

                    {order.orderStatus === 'ACCEPTED' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'PREPARING')}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Cook</span>
                      </button>
                    )}

                    {order.orderStatus === 'PREPARING' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'READY')}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>Ready</span>
                      </button>
                    )}

                    {order.orderStatus === 'READY' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'COMPLETED')}
                        className="px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete</span>
                      </button>
                    )}

                    {order.orderStatus !== 'COMPLETED' && order.orderStatus !== 'CANCELLED' && (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to cancel this order?')) {
                            handleStatusChange(order.id, 'CANCELLED');
                          }
                        }}
                        className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                        title="Cancel Order"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Thermal Print Modal */}
      {activePrintOrder && (
        <ThermalReceiptModal
          order={activePrintOrder}
          mode={printMode}
          isOpen={!!activePrintOrder}
          onClose={() => setActivePrintOrder(null)}
        />
      )}
    </div>
  );
};
