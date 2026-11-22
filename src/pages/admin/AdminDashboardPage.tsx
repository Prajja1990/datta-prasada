import React, { useState, useEffect } from 'react';
import { loadReportOrders } from '../../services/restaurantDatabase';
import { Order } from '../../types';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  ShoppingBag, 
  Clock, 
  ChefHat, 
  CheckCircle2, 
  Banknote, 
  CreditCard, 
  ArrowUpRight,
  Sparkles,
  RefreshCw
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  const [loadError, setLoadError] = useState<string | null>(null);
  const loadData = async () => {
    try {
      setOrders(await loadReportOrders());
      setLoadError(null);
    } catch (error: any) {
      setLoadError(error.message || 'Unable to load database orders.');
    }
  };

  useEffect(() => {
    void loadData();
    const timer = window.setInterval(() => void loadData(), 15000);
    return () => { window.clearInterval(timer); };
  }, []);

  // Today's orders
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const todayOrders = orders.filter(o => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(o.createdAt)) === todayStr);

  // Metrics
  const totalRevenue = todayOrders.reduce((sum, o) => o.paymentStatus === 'PAID' ? sum + o.totalAmount : sum, 0);
  const cashCollections = todayOrders.filter(o => o.paymentMethod === 'CASH' && o.paymentStatus === 'PAID').reduce((sum, o) => sum + o.totalAmount, 0);
  const upiCollections = todayOrders.filter(o => o.paymentMethod === 'UPI' && o.paymentStatus === 'PAID').reduce((sum, o) => sum + o.totalAmount, 0);

  const pendingCount = todayOrders.filter(o => o.orderStatus === 'PLACED' || o.orderStatus === 'ACCEPTED').length;
  const preparingCount = todayOrders.filter(o => o.orderStatus === 'PREPARING').length;
  const readyCount = todayOrders.filter(o => o.orderStatus === 'READY').length;
  const completedCount = todayOrders.filter(o => o.orderStatus === 'COMPLETED').length;

  // Item popular counts
  const itemMap: Record<string, { name: string; count: number; revenue: number }> = {};
  todayOrders.forEach(o => {
    o.items.forEach(it => {
      if (!itemMap[it.name]) itemMap[it.name] = { name: it.name, count: 0, revenue: 0 };
      itemMap[it.name].count += it.quantity;
      itemMap[it.name].revenue += it.totalPrice;
    });
  });
  const popularItems = Object.values(itemMap).sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {loadError && <p role="alert" className="p-4 bg-red-50 text-red-800 rounded-xl">{loadError}</p>}
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif font-black text-3xl text-stone-900">
            Manager Overview Dashboard
          </h1>
          <p className="text-stone-500 text-sm mt-0.5">
            Real-time business performance for Datta Prasada (Balagere)
          </p>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold rounded-xl shadow-xs transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Live Metrics</span>
        </button>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Orders */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Today's Orders
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="font-serif font-black text-3xl text-stone-900">
            {todayOrders.length}
          </div>
          <div className="text-xs text-stone-500">
            {completedCount} completed • {pendingCount + preparingCount} in queue
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Today's Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="font-serif font-black text-3xl text-temple-800">
            ₹{totalRevenue.toFixed(2)}
          </div>
          <div className="text-xs text-stone-500">
            From verified settled payments
          </div>
        </div>

        {/* Cash Collections */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Cash at Counter
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div className="font-serif font-black text-3xl text-stone-900">
            ₹{cashCollections.toFixed(2)}
          </div>
          <div className="text-xs text-stone-500">
            Physical drawer cash
          </div>
        </div>

        {/* Online / UPI Collections */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              UPI / Online
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="font-serif font-black text-3xl text-stone-900">
            ₹{upiCollections.toFixed(2)}
          </div>
          <div className="text-xs text-stone-500">
            Razorpay & UPI direct settlement
          </div>
        </div>
      </div>

      {/* Operational Pipeline Grid */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
        <h3 className="font-serif font-bold text-lg text-stone-900 border-b border-stone-100 pb-3">
          Live Operational Pipeline
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-center space-y-1">
            <div className="text-xs font-bold text-amber-800 uppercase">New / Pending</div>
            <div className="font-mono font-black text-3xl text-amber-900">{pendingCount}</div>
            <div className="text-[11px] text-amber-700">Awaiting kitchen</div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-center space-y-1">
            <div className="text-xs font-bold text-blue-800 uppercase">Cooking in Kitchen</div>
            <div className="font-mono font-black text-3xl text-blue-900">{preparingCount}</div>
            <div className="text-[11px] text-blue-700">Currently in wok</div>
          </div>

          <div className="p-4 rounded-xl bg-green-50/70 border border-green-200 text-center space-y-1">
            <div className="text-xs font-bold text-green-800 uppercase">Ready at Counter</div>
            <div className="font-mono font-black text-3xl text-green-900">{readyCount}</div>
            <div className="text-[11px] text-green-700">Calling customers</div>
          </div>

          <div className="p-4 rounded-xl bg-stone-100 border border-stone-200 text-center space-y-1">
            <div className="text-xs font-bold text-stone-700 uppercase">Completed</div>
            <div className="font-mono font-black text-3xl text-stone-900">{completedCount}</div>
            <div className="text-[11px] text-stone-500">Picked up & enjoyed</div>
          </div>
        </div>
      </div>

      {/* Popular Items & Quick Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Ordered Dishes */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="font-serif font-bold text-lg text-stone-900">
              Top Selling Sakleshpur Specialties
            </h3>
            <Sparkles className="w-4 h-4 text-gold-600" />
          </div>

          {popularItems.length === 0 ? (
            <p className="text-xs text-stone-500 py-4">No order items recorded yet today.</p>
          ) : (
            <div className="space-y-3">
              {popularItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-2 border-b border-stone-50">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-cream-100 text-gold-900 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-stone-900 text-sm">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-temple-800 font-mono">{item.count} orders</span>
                    <span className="text-stone-400 text-[10px] block">₹{item.revenue}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links Card */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
          <h3 className="font-serif font-bold text-lg text-stone-900 border-b border-stone-100 pb-3">
            Quick Actions
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/admin/orders"
              className="p-4 rounded-xl border border-stone-200 hover:border-gold-400 hover:bg-cream-50 transition space-y-1"
            >
              <div className="font-bold text-sm text-stone-900">Manage Orders</div>
              <div className="text-xs text-stone-500">Live order counter</div>
            </Link>

            <Link
              to="/admin/menu"
              className="p-4 rounded-xl border border-stone-200 hover:border-gold-400 hover:bg-cream-50 transition space-y-1"
            >
              <div className="font-bold text-sm text-stone-900">Menu & Prices</div>
              <div className="text-xs text-stone-500">Edit dishes & toggle stocks</div>
            </Link>

            <Link
              to="/admin/reports"
              className="p-4 rounded-xl border border-stone-200 hover:border-gold-400 hover:bg-cream-50 transition space-y-1"
            >
              <div className="font-bold text-sm text-stone-900">Sales Reports</div>
              <div className="text-xs text-stone-500">Export CSV & daily trends</div>
            </Link>

            <Link
              to="/kitchen"
              className="p-4 rounded-xl border border-stone-200 hover:border-gold-400 hover:bg-cream-50 transition space-y-1"
            >
              <div className="font-bold text-sm text-stone-900">Kitchen KDS</div>
              <div className="text-xs text-stone-500">Full screen cooking queue</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
