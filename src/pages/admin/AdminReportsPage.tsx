import React, { useState, useEffect } from 'react';
import { loadSalesReport, SalesReport, SalesReportRange } from '../../services/restaurantDatabase';
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
  const [report, setReport] = useState<SalesReport | null>(null);
  const [dateRange, setDateRange] = useState<SalesReportRange>('TODAY');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let pending = false;
    const load = async () => {
      if (pending) return;
      pending = true;
      try {
        if (dateRange === 'CUSTOM' && (!startDate || !endDate || startDate > endDate)) {
          throw new Error('Select a valid start and end date.');
        }
        const data = await loadSalesReport(dateRange, startDate, endDate);
        if (active) { setReport(data); setLoadError(null); }
      } catch (error: any) {
        if (active) { setLoadError(error.message || 'Unable to load database report.'); setReport(null); }
      } finally { pending = false; if (active) setLoading(false); }
    };
    setLoading(true);
    setReport(null);
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [dateRange, startDate, endDate]);

  const {
    totalRevenue = 0, totalOrdersCount = 0, paidOrdersCount = 0,
    aov = 0, cashTotal = 0, upiTotal = 0, itemSales = [], orders: filteredOrders = [], dailySales = [],
  } = report || {};

  // CSV Export
  const exportCSV = () => {
    const headers = ['Order ID', 'Token', 'Date', 'Customer', 'Mobile', 'Type', 'Table', 'Subtotal', 'Tax', 'Parcel Charge', 'Total', 'Payment Method', 'Payment Status', 'Order Status'];
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
      o.parcelCharge || 0,
      o.totalAmount,
      o.paymentMethod,
      o.paymentStatus,
      o.orderStatus,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DattaPrasada_Sales_Report_${dateRange === 'CUSTOM' ? startDate + '_to_' + endDate : dateRange + '_' + today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto pb-28">
      {loadError && <p role="alert" className="p-4 bg-red-50 text-red-800 rounded-xl">{loadError}</p>}
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

        <div className="flex flex-wrap items-center gap-3">
          {/* Date range selector */}
          <div className="flex bg-stone-200 p-1 rounded-xl text-xs font-bold">
            {(['TODAY', 'WEEK', 'MONTH', 'ALL', 'CUSTOM'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  dateRange === r ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {r === 'TODAY' ? 'Today' : r === 'WEEK' ? '7 Days' : r === 'MONTH' ? '30 Days' : r === 'ALL' ? 'All Time' : 'By Date'}
              </button>
            ))}
          </div>

          <button
            onClick={exportCSV}
            disabled={loading || !report}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-temple-700 hover:bg-temple-800 text-white font-bold text-xs shadow-sm transition active:scale-95"
          >
            <Download className="w-4 h-4 text-gold-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {dateRange === 'CUSTOM' && (
        <div className="flex flex-wrap gap-4 items-end">
          <label className="text-sm font-semibold">From date
            <input type="date" aria-label="Report start date" value={startDate} onChange={e => setStartDate(e.target.value)} className="block border rounded-lg p-2 mt-1" />
          </label>
          <label className="text-sm font-semibold">To date
            <input type="date" aria-label="Report end date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} className="block border rounded-lg p-2 mt-1" />
          </label>
          <p className="text-sm text-stone-500">Select the same date for a single-day report. Dates use India time (IST).</p>
        </div>
      )}
      {loading && <p role="status">Loading sales analytics…</p>}
      {report && <>
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

      <section className="bg-white rounded-2xl border border-stone-200 p-6 overflow-x-auto">
        <h3 className="font-serif font-bold text-lg mb-4">Date-wise Sales (IST)</h3>
        {dailySales.length === 0 ? <p className="text-sm text-stone-500">No sales recorded for these dates.</p> : (
          <table className="w-full text-left text-sm">
            <thead><tr>{['Date', 'Orders', 'Paid Orders', 'Revenue', 'Cash', 'UPI'].map(label => <th key={label} className="p-3 border-b">{label}</th>)}</tr></thead>
            <tbody>{dailySales.map(day => (
              <tr key={day.date}>
                <td className="p-3">{day.date}</td><td className="p-3">{day.orders}</td><td className="p-3">{day.paid_orders}</td>
                <td className="p-3">₹{Number(day.revenue).toFixed(2)}</td><td className="p-3">₹{Number(day.cash).toFixed(2)}</td><td className="p-3">₹{Number(day.upi).toFixed(2)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </section>
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
                  const share = item.share;

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
      </>}
    </div>
  );
};
