import React, { useState, useEffect } from 'react';
import { store } from '../../services/store';
import { Order } from '../../types';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  TrendingUp, 
  ShoppingBag, 
  CreditCard, 
  Banknote,
  DollarSign
} from 'lucide-react';

export const AdminReportsPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [dateRange, setDateRange] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('TODAY');

  const loadData = () => {
    setOrders(store.getOrders());
  };

  useEffect(() => {
    loadData();
    const unsub = store.subscribe(() => loadData());
    return unsub;
  }, []);

  // Filter orders by date range
  const now = new Date();
  const filteredOrders = orders.filter((o) => {
    const oDate = new Date(o.createdAt);
    if (dateRange === 'TODAY') {
      return oDate.toDateString() === now.toDateString();
    }
    if (dateRange === 'WEEK') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return oDate >= weekAgo;
    }
    if (dateRange === 'MONTH') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return oDate >= monthAgo;
    }
    return true;
  });

  const totalRevenue = filteredOrders
    .filter(o => o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const totalOrdersCount = filteredOrders.length;
  const paidOrdersCount = filteredOrders.filter(o => o.paymentStatus === 'PAID').length;
  const aov = paidOrdersCount > 0 ? totalRevenue / paidOrdersCount : 0;

  const cashTotal = filteredOrders
    .filter(o => o.paymentMethod === 'CASH' && o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const upiTotal = filteredOrders
    .filter(o => o.paymentMethod === 'UPI' && o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  // Item wise sales
  const itemMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
  filteredOrders.forEach((o) => {
    o.items.forEach((it) => {
      if (!itemMap[it.name]) {
        itemMap[it.name] = { name: it.name, quantity: 0, revenue: 0 };
      }
      itemMap[it.name].quantity += it.quantity;
      itemMap[it.name].revenue += it.totalPrice;
    });
  });
  const itemSales = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue);

  // CSV Export
  const exportCSV = () => {
    const headers = ['Order ID', 'Token', 'Date', 'Customer', 'Mobile', 'Type', 'Table', 'Subtotal', 'Tax', 'Total', 'Payment Method', 'Payment Status', 'Order Status'];
    const rows = filteredOrders.map(o => [
      o.id,
      o.tokenNumber,
      o.createdAt,
      `"${o.customerName}"`,
      o.customerMobile,
      o.orderType,
      o.tableNumber || '',
      o.subtotal,
      o.taxAmount,
      o.totalAmount,
      o.paymentMethod,
      o.paymentStatus,
      o.orderStatus,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DattaPrasada_Sales_Report_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto pb-28">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h1 className="font-serif font-black text-3xl text-stone-900">
            Sales & Revenue Analytics
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-0.5">
            Performance metrics, payment breakdown, and official CSV exports
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date range selector */}
          <div className="flex bg-stone-200 p-1 rounded-xl text-xs font-bold">
            {(['TODAY', 'WEEK', 'MONTH', 'ALL'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  dateRange === r ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {r === 'TODAY' ? 'Today' : r === 'WEEK' ? '7 Days' : r === 'MONTH' ? '30 Days' : 'All Time'}
              </button>
            ))}
          </div>

          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-temple-700 hover:bg-temple-800 text-white font-bold text-xs shadow-sm transition active:scale-95"
          >
            <Download className="w-4 h-4 text-gold-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-2">
          <div className="text-xs font-bold text-stone-500 uppercase">Gross Revenue</div>
          <div className="font-serif font-black text-3xl text-temple-800">
            ₹{totalRevenue.toFixed(2)}
          </div>
          <div className="text-[11px] text-stone-500">Across {paidOrdersCount} paid transactions</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-2">
          <div className="text-xs font-bold text-stone-500 uppercase">Total Orders</div>
          <div className="font-serif font-black text-3xl text-stone-900">
            {totalOrdersCount}
          </div>
          <div className="text-[11px] text-stone-500">Dine-in and takeaway combined</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-2">
          <div className="text-xs font-bold text-stone-500 uppercase">Average Order Value (AOV)</div>
          <div className="font-serif font-black text-3xl text-stone-900">
            ₹{aov.toFixed(2)}
          </div>
          <div className="text-[11px] text-stone-500">Revenue per paid customer order</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-2">
          <div className="text-xs font-bold text-stone-500 uppercase">Payment Mix</div>
          <div className="flex items-center gap-3 pt-1">
            <div>
              <div className="text-[10px] text-stone-500">UPI</div>
              <div className="font-mono font-bold text-blue-700 text-base">₹{upiTotal.toFixed(0)}</div>
            </div>
            <div className="border-l border-stone-200 pl-3">
              <div className="text-[10px] text-stone-500">Cash</div>
              <div className="font-mono font-bold text-amber-700 text-base">₹{cashTotal.toFixed(0)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Item-wise Performance Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden space-y-4 p-6">
        <h3 className="font-serif font-bold text-lg text-stone-900 border-b border-stone-100 pb-3">
          Dish-Wise Sales Breakdown
        </h3>

        {itemSales.length === 0 ? (
          <p className="text-stone-500 text-xs py-4">No dish sales recorded in this date range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-800 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3">Rank</th>
                  <th className="p-3">Dish Name</th>
                  <th className="p-3">Quantity Sold</th>
                  <th className="p-3">Gross Revenue (₹)</th>
                  <th className="p-3 text-right">Revenue Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {itemSales.map((item, idx) => {
                  const share = totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0;

                  return (
                    <tr key={idx} className="hover:bg-cream-50/50">
                      <td className="p-3 font-mono font-bold text-stone-500">#{idx + 1}</td>
                      <td className="p-3 font-bold text-stone-900 text-sm">{item.name}</td>
                      <td className="p-3 font-mono font-bold text-stone-700">{item.quantity} portions</td>
                      <td className="p-3 font-mono font-bold text-temple-800">₹{item.revenue.toFixed(2)}</td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-16 bg-stone-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-gold-500 h-full rounded-full" style={{ width: `${Math.min(100, share)}%` }} />
                          </div>
                          <span className="font-mono text-stone-700 w-10 text-right">{share.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
