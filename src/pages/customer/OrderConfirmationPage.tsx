import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useLanguage } from '../../context/LanguageContext';
import { store } from '../../services/store';
import { Order } from '../../types';
import { ThermalReceiptModal } from '../../components/printer/ThermalReceiptModal';
import { 
  CheckCircle2, 
  Clock, 
  Printer, 
  ArrowRight, 
  ShoppingBag, 
  MapPin, 
  Coffee, 
  ChefHat,
  Sparkles
} from 'lucide-react';

export const OrderConfirmationPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    void store.getDatabaseOrderByTrackingToken(orderId).then((found) => {
      if (active && found) {
        setOrder(found);
        try {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#D97706', '#1B4332', '#FBBF24', '#CCA86E'] });
        } catch {
          // Ignore when browser animation APIs are unavailable.
        }
      }
    }).catch((error) => console.error('Order confirmation lookup failed:', error));
    return () => { active = false; };
  }, [orderId]);

  if (!order) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif font-bold text-2xl text-stone-900">Order Not Found</h2>
        <p className="text-stone-500 text-sm">We could not locate this order reference.</p>
        <Link to="/" className="inline-block px-6 py-2.5 rounded-xl bg-temple-700 text-white font-bold text-sm">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 pb-28">
      {/* Success Badge */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-temple-50 border-2 border-temple-600 text-temple-700 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <h1 className="font-serif font-black text-3xl sm:text-4xl text-temple-900">
          {t.confirmation.placedSuccess}
        </h1>
        <p className="text-stone-600 text-sm">
          {t.confirmation.dailyNotice}
        </p>
      </div>

      {/* Prominent Golden Token Card */}
      <div className="bg-gradient-to-b from-amber-400 via-gold-500 to-amber-600 p-1 rounded-3xl shadow-gold text-center">
        <div className="bg-cream-50 rounded-[22px] p-6 sm:p-8 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-100 text-gold-900 text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.confirmation.tokenBanner}</span>
          </div>

          {/* Huge Token Display */}
          <div className="font-serif font-black text-5xl sm:text-6xl text-temple-900 tracking-tight">
            {order.tokenNumber}
          </div>

          <div className="text-xs font-semibold text-stone-600 uppercase tracking-wide">
            {order.orderType === 'DINE_IN' 
              ? `Dine-In • Table ${order.tableNumber || 'Self'}` 
              : 'Takeaway / Parcel'}
          </div>

          <div className="pt-2 flex items-center justify-center gap-2 text-temple-800 text-sm font-bold">
            <Clock className="w-4 h-4 text-gold-600" />
            <span>{t.confirmation.estimatedPrep}: ~{order.estimatedPrepTimeMinutes} mins</span>
          </div>
        </div>
      </div>

      {/* Primary Actions: Live Track & Print */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to={`/track/${order.trackingToken}`}
          className="flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-temple-700 hover:bg-temple-800 text-white font-serif font-bold text-base shadow-traditional transition active:scale-95 text-center"
        >
          <Clock className="w-5 h-5 text-gold-400" />
          <span>{t.confirmation.trackOrderCTA}</span>
          <ArrowRight className="w-4 h-4 text-gold-400" />
        </Link>

        <button
          onClick={() => setShowPrintModal(true)}
          className="flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl border border-gold-400 bg-white hover:bg-gold-50 text-temple-900 font-bold text-sm shadow-xs transition active:scale-95"
        >
          <Printer className="w-5 h-5 text-gold-600" />
          <span>{t.confirmation.printSlip}</span>
        </button>
      </div>

      {/* Order Summary Breakdown */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
        <h3 className="font-serif font-bold text-lg text-stone-900 border-b border-stone-100 pb-3">
          {t.confirmation.detailsTitle}
        </h3>

        <div className="divide-y divide-stone-100">
          {order.items.map((item, idx) => (
            <div key={idx} className="py-2.5 flex justify-between text-sm">
              <span className="text-stone-800">
                <span className="font-bold text-temple-800 mr-2">{item.quantity}x</span>
                {language === 'kn' && item.nameKn ? item.nameKn : item.name}
              </span>
              <span className="font-mono font-medium text-stone-900">
                ₹{item.totalPrice}
              </span>
            </div>
          ))}
        </div>

        {order.notes && (
          <div className="p-3 bg-cream-50 border border-gold-200 rounded-xl text-xs text-stone-700">
            <span className="font-bold text-temple-900">Kitchen Instructions: </span>
            <span>{order.notes}</span>
          </div>
        )}

        <div className="border-t border-dashed border-stone-300 pt-3 space-y-1.5 text-xs">
          <div className="flex justify-between text-stone-600">
            <span>Subtotal:</span>
            <span className="font-mono">₹{order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>GST (5%):</span>
            <span className="font-mono">₹{order.taxAmount.toFixed(2)}</span>
          </div>
          {order.orderType === 'TAKEAWAY' && <div className="flex justify-between text-xs"><span>Parcel charge:</span><span>₹{(order.parcelCharge || 0).toFixed(2)}</span></div>}
          <div className="flex justify-between font-serif font-black text-lg text-temple-900 pt-2 border-t border-stone-100">
            <span>Total Amount:</span>
            <span className="text-gold-700">₹{order.totalAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="pt-2 text-xs text-stone-500 flex justify-between border-t border-stone-100">
          <span>Payment: {order.paymentMethod}</span>
          <span className="font-bold text-temple-800">{order.paymentStatus}</span>
        </div>
      </div>

      {/* Another order link */}
      <div className="text-center pt-2">
        <Link
          to="/menu"
          className="text-gold-700 hover:text-gold-800 text-sm font-bold hover:underline"
        >
          {t.confirmation.orderAnother}
        </Link>
      </div>

      {/* Thermal Slip Modal */}
      <ThermalReceiptModal
        order={order}
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
      />
    </div>
  );
};
