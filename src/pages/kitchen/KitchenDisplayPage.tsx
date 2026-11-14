import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { store } from '../../services/store';
import { Order, OrderStatus } from '../../types';
import { ThermalReceiptModal } from '../../components/printer/ThermalReceiptModal';
import { 
  ChefHat, 
  Clock, 
  Flame, 
  CheckCircle2, 
  Printer, 
  BellRing, 
  Play, 
  AlertTriangle,
  RefreshCw,
  Maximize2
} from 'lucide-react';

export const KitchenDisplayPage: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguage();

  const [orders, setOrders] = useState<Order[]>([]);
  const [activeKOTOrder, setActiveKOTOrder] = useState<Order | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const loadOrders = () => {
    // Only display active kitchen orders (ACCEPTED, PREPARING, READY, and PLACED)
    const all = store.getOrders();
    const active = all.filter(o => ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.orderStatus));
    setOrders(active);
  };

  useEffect(() => {
    loadOrders();
    const unsub = store.subscribe((eventType) => {
      loadOrders();
    });
    return unsub;
  }, []);

  const handleAdvanceStatus = (orderId: string, nextStatus: OrderStatus) => {
    const actorName = user?.fullName || 'Kitchen Chef';
    const actorRole = user?.roles[0] || 'KITCHEN_STAFF';
    const res = store.updateOrderStatus(orderId, nextStatus, actorName, actorRole);
    if (!res.success && res.error) {
      alert(res.error);
    }
  };

  const getElapsedMinutes = (createdAt: string) => {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    return Math.floor(diffMs / (1000 * 60));
  };

  // Group columns
  const newOrders = orders.filter(o => o.orderStatus === 'PLACED' || o.orderStatus === 'ACCEPTED');
  const preparingOrders = orders.filter(o => o.orderStatus === 'PREPARING');
  const readyOrders = orders.filter(o => o.orderStatus === 'READY');

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 p-4 sm:p-6 space-y-6">
      {/* Top KDS Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-sm">
            <ChefHat className="w-7 h-7" />
          </div>
          <div>
            <h1 className="font-serif font-black text-2xl sm:text-3xl text-amber-400 tracking-wide">
              DATTA PRASADA — KITCHEN DISPLAY (KDS)
            </h1>
            <p className="text-stone-400 text-xs">
              Live Cooking Queue • Balagere Outlet • Auto-Refreshing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-stone-800 text-stone-300 text-xs font-mono">
            Active Tickets: <span className="text-amber-400 font-bold">{orders.length}</span>
          </div>

          <button
            onClick={loadOrders}
            className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3-Column Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Column 1: New / Accepted */}
        <div className="space-y-4">
          <div className="bg-amber-950/60 border border-amber-700/60 p-3.5 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
              <h2 className="font-serif font-bold text-lg text-amber-300">
                1. New / Pending ({newOrders.length})
              </h2>
            </div>
          </div>

          <div className="space-y-4">
            {newOrders.map((order) => {
              const elapsed = getElapsedMinutes(order.createdAt);
              const isUrgent = elapsed > 10;

              return (
                <div
                  key={order.id}
                  className={`bg-stone-800/90 rounded-2xl border ${
                    isUrgent ? 'border-red-500/80 ring-2 ring-red-500/20' : 'border-amber-700/40'
                  } p-5 space-y-4 shadow-lg`}
                >
                  <div className="flex items-center justify-between border-b border-stone-700 pb-3">
                    <span className="font-mono font-black text-3xl text-amber-400 tracking-tight">
                      {order.tokenNumber}
                    </span>
                    <div className="text-right">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-stone-700 text-stone-300 block">
                        {order.orderType === 'DINE_IN' ? `Table ${order.tableNumber || 'Self'}` : 'Takeaway'}
                      </span>
                      <span className={`text-[11px] font-mono mt-1 block ${isUrgent ? 'text-red-400 font-bold' : 'text-stone-400'}`}>
                        {elapsed}m ago
                      </span>
                    </div>
                  </div>

                  {/* Items to Cook */}
                  <div className="space-y-2 py-1 text-sm font-medium">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-white">
                        <span className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs">
                            {item.quantity}
                          </span>
                          <span className="font-semibold text-base">
                            {language === 'kn' && item.nameKn ? item.nameKn : item.name}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-600/40 text-amber-300 text-xs font-semibold">
                      Note: {order.notes}
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-stone-700">
                    <button
                      onClick={() => setActiveKOTOrder(order)}
                      className="p-2 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-300 transition"
                      title="Print KOT"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleAdvanceStatus(order.id, 'PREPARING')}
                      className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-sm transition flex items-center justify-center gap-2 active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-stone-950" />
                      <span>Start Cooking</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: In Preparation */}
        <div className="space-y-4">
          <div className="bg-blue-950/60 border border-blue-700/60 p-3.5 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-blue-400" />
              <h2 className="font-serif font-bold text-lg text-blue-300">
                2. Cooking / Steamer ({preparingOrders.length})
              </h2>
            </div>
          </div>

          <div className="space-y-4">
            {preparingOrders.map((order) => {
              const elapsed = getElapsedMinutes(order.createdAt);

              return (
                <div
                  key={order.id}
                  className="bg-stone-800/90 rounded-2xl border border-blue-600/50 p-5 space-y-4 shadow-lg ring-1 ring-blue-500/20"
                >
                  <div className="flex items-center justify-between border-b border-stone-700 pb-3">
                    <span className="font-mono font-black text-3xl text-blue-400 tracking-tight">
                      {order.tokenNumber}
                    </span>
                    <div className="text-right">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-900/60 text-blue-200 block">
                        {order.orderType === 'DINE_IN' ? `Table ${order.tableNumber || 'Self'}` : 'Takeaway'}
                      </span>
                      <span className="text-[11px] font-mono text-stone-400 mt-1 block">
                        Elapsed: {elapsed}m
                      </span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-2 py-1 text-sm font-medium">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-white">
                        <span className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-blue-500/20 text-blue-300 font-bold flex items-center justify-center text-xs">
                            {item.quantity}
                          </span>
                          <span className="font-semibold text-base">
                            {language === 'kn' && item.nameKn ? item.nameKn : item.name}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-600/40 text-blue-300 text-xs font-semibold">
                      Note: {order.notes}
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-stone-700">
                    <button
                      onClick={() => setActiveKOTOrder(order)}
                      className="p-2 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-300 transition"
                      title="Print KOT"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleAdvanceStatus(order.id, 'READY')}
                      className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-stone-950 font-black text-sm transition flex items-center justify-center gap-2 active:scale-95"
                    >
                      <BellRing className="w-4 h-4" />
                      <span>Dish Ready (Call Counter)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 3: Ready for Counter Call */}
        <div className="space-y-4">
          <div className="bg-emerald-950/60 border border-emerald-700/60 p-3.5 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h2 className="font-serif font-bold text-lg text-emerald-300">
                3. At Counter Pickup ({readyOrders.length})
              </h2>
            </div>
          </div>

          <div className="space-y-4">
            {readyOrders.map((order) => (
              <div
                key={order.id}
                className="bg-stone-800/90 rounded-2xl border border-emerald-500/40 p-5 space-y-4 shadow-lg opacity-90"
              >
                <div className="flex items-center justify-between border-b border-stone-700 pb-3">
                  <span className="font-mono font-black text-3xl text-emerald-400 tracking-tight">
                    {order.tokenNumber}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-900/60 text-emerald-300 uppercase">
                    Ready
                  </span>
                </div>

                <div className="text-xs text-stone-300 space-y-1">
                  <div>Customer: <strong className="text-white">{order.customerName}</strong></div>
                  <div>Items: {order.items.length} dishes</div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-2 border-t border-stone-700">
                  <button
                    onClick={() => handleAdvanceStatus(order.id, 'COMPLETED')}
                    className="w-full py-2.5 px-4 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200 font-bold text-xs transition"
                  >
                    Dispatched / Picked Up
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KOT Modal */}
      {activeKOTOrder && (
        <ThermalReceiptModal
          order={activeKOTOrder}
          mode="KOT"
          isOpen={!!activeKOTOrder}
          onClose={() => setActiveKOTOrder(null)}
        />
      )}
    </div>
  );
};
