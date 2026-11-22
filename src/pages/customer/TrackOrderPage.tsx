import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { store } from '../../services/store';
import { Order, OrderStatus } from '../../types';
import { ThermalReceiptModal } from '../../components/printer/ThermalReceiptModal';
import { 
  Search, 
  Clock, 
  CheckCircle2, 
  ChefHat, 
  BellRing, 
  Printer, 
  AlertCircle,
  Sparkles,
  Flame,
  ArrowRight
} from 'lucide-react';

const ORDER_STEPS: { status: OrderStatus; labelEn: string; labelKn: string }[] = [
  { status: 'PLACED', labelEn: 'Order Placed', labelKn: 'ಆರ್ಡರ್ ಸ್ವೀಕರಿಸಲಾಗಿದೆ' },
  { status: 'ACCEPTED', labelEn: 'Accepted', labelKn: 'ದೃಢಪಡಿಸಲಾಗಿದೆ' },
  { status: 'PREPARING', labelEn: 'In Kitchen', labelKn: 'ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ' },
  { status: 'READY', labelEn: 'Ready for Pickup', labelKn: 'ತಿಂಡಿ ಸಿದ್ಧವಾಗಿದೆ' },
  { status: 'COMPLETED', labelEn: 'Completed', labelKn: 'ಪೂರ್ಣಗೊಂಡಿದೆ' },
];

export const TrackOrderPage: React.FC = () => {
  const { token } = useParams<{ token?: string }>();
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const [inputToken, setInputToken] = useState(token || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [hasPlayedChime, setHasPlayedChime] = useState(false);

  // Play audio chime when order turns READY
  const playReadyChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
      // AudioContext may be restricted by browser policy before user gesture
    }
  };

  const lookupOrder = async (lookupKey: string) => {
    if (!lookupKey.trim()) return;
    const clean = lookupKey.trim();
    try {
      const found = await store.findDatabaseOrder(clean);
      if (found) {
        setOrder(found);
        setSearchError(null);
        return;
      }
      setOrder(null);
      setSearchError(language === 'kn' ? 'ಆರ್ಡರ್ ಅಥವಾ ಟೋಕನ್ ಕಂಡುಬಂದಿಲ್ಲ' : 'No order found with this Token or Reference.');
    } catch (error) {
      console.error('Order tracking lookup failed:', error);
      setOrder(null);
      setSearchError(language === 'kn' ? 'ಆರ್ಡರ್ ಹುಡುಕಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ' : 'Could not load this order. Please retry.');
    }
  };

  useEffect(() => {
    if (token) {
      void lookupOrder(token);
    }
  }, [token]);

  // Real-time listener for status changes
  useEffect(() => {
    if (!order?.trackingToken) return;
    const timer = window.setInterval(() => {
      void store.getDatabaseOrderByTrackingToken(order.trackingToken).then((freshOrder) => {
        if (!freshOrder) return;
        setOrder(freshOrder);
        if (freshOrder.orderStatus === 'READY' && !hasPlayedChime) {
          playReadyChime();
          setHasPlayedChime(true);
        }
      }).catch((error) => console.error('Order tracking refresh failed:', error));
    }, 5000);
    return () => window.clearInterval(timer);
  }, [order?.trackingToken, hasPlayedChime]);

  useEffect(() => {
    const unsub = store.subscribe((eventType, payload) => {
      if (order && (eventType === 'ORDER_UPDATED' || eventType === 'ORDER_STATUS_READY')) {
        if (payload.id === order.id || payload.trackingToken === order.trackingToken) {
          setOrder(payload);
          if (payload.orderStatus === 'READY' && !hasPlayedChime) {
            playReadyChime();
            setHasPlayedChime(true);
          }
        }
      }
    });
    return unsub;
  }, [order, hasPlayedChime]);

  // Determine current active step index
  const getCurrentStepIndex = (status: OrderStatus) => {
    if (status === 'CANCELLED') return -1;
    return ORDER_STEPS.findIndex(s => s.status === status);
  };

  const currentStepIdx = order ? getCurrentStepIndex(order.orderStatus) : -1;
  const isReady = order?.orderStatus === 'READY';
  const isCancelled = order?.orderStatus === 'CANCELLED';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="font-serif font-black text-3xl sm:text-4xl text-temple-900">
          {t.tracking.title}
        </h1>
        <p className="text-stone-500 text-sm">
          {t.tracking.subtitle}
        </p>
      </div>

      {/* Token Search Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookupOrder(inputToken);
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              placeholder="Enter Token (e.g., DP-001) or Tracking ID"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 text-stone-900 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-gold-500 transition"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-temple-700 hover:bg-temple-800 text-white font-bold text-sm rounded-xl shadow-xs transition active:scale-95"
          >
            Track
          </button>
        </form>

        {searchError && (
          <div className="mt-3 text-red-600 text-xs flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {/* Order Status Display */}
      {order && (
        <div className="space-y-6">
          {/* Prominent Ready Banner if READY */}
          {isReady && (
            <div className="bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-2xl p-6 shadow-xl animate-bounce duration-1000 text-center space-y-2 border-2 border-gold-300">
              <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                <BellRing className="w-4 h-4 text-gold-300 animate-spin" />
                <span>Collection Alert</span>
              </div>
              <h2 className="font-serif font-black text-2xl sm:text-3xl text-gold-200">
                {t.tracking.readyCallout}
              </h2>
              <p className="text-cream-100 text-sm">
                {t.tracking.readySubtitle}
              </p>
            </div>
          )}

          {/* Cancelled Banner */}
          {isCancelled && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-6 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
              <h3 className="font-serif font-bold text-xl">Order Cancelled</h3>
              <p className="text-xs text-red-600">Please talk to our counter supervisor for assistance or refund.</p>
            </div>
          )}

          {/* Token Card */}
          <div className="bg-white rounded-3xl border border-gold-300/80 shadow-traditional p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-stone-100 pb-6">
              <div className="text-center sm:text-left">
                <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                  TOKEN NUMBER
                </div>
                <div className="font-serif font-black text-4xl sm:text-5xl text-temple-900 tracking-tight">
                  {order.tokenNumber}
                </div>
              </div>

              <div className="text-center sm:text-right space-y-1">
                <div className="inline-block px-3 py-1 rounded-full bg-cream-100 text-temple-900 font-bold text-xs">
                  {order.orderType === 'DINE_IN' ? `Dine-In • Table ${order.tableNumber || 'Self'}` : 'Takeaway'}
                </div>
                <div className="text-xs text-stone-500">
                  {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* Visual Progress Stepper */}
            {!isCancelled && (
              <div className="pt-2 pb-4">
                <div className="relative">
                  {/* Connecting Line */}
                  <div className="absolute top-5 left-6 right-6 h-1 bg-stone-200 -z-0">
                    <div
                      className="h-full bg-temple-600 transition-all duration-700"
                      style={{
                        width: `${Math.max(0, (currentStepIdx / (ORDER_STEPS.length - 1)) * 100)}%`,
                      }}
                    />
                  </div>

                  {/* Steps */}
                  <div className="flex justify-between items-start relative z-10">
                    {ORDER_STEPS.map((step, idx) => {
                      const isPast = idx < currentStepIdx;
                      const isCurrent = idx === currentStepIdx;

                      return (
                        <div key={step.status} className="flex flex-col items-center text-center w-16 sm:w-24">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition shadow-sm ${
                              isCurrent
                                ? 'bg-gold-500 text-temple-950 ring-4 ring-gold-200 scale-110'
                                : isPast
                                ? 'bg-temple-700 text-white'
                                : 'bg-white border-2 border-stone-300 text-stone-400'
                            }`}
                          >
                            {isPast ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                          </div>

                          <div className="mt-2 space-y-0.5">
                            <span
                              className={`text-[11px] sm:text-xs font-bold block ${
                                isCurrent
                                  ? 'text-temple-900 font-black'
                                  : isPast
                                  ? 'text-stone-800'
                                  : 'text-stone-400'
                              }`}
                            >
                              {language === 'kn' ? step.labelKn : step.labelEn}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Order Items Snapshot */}
            <div className="border-t border-stone-100 pt-4 space-y-2">
              <h4 className="font-serif font-bold text-sm text-stone-900">
                Items in this order:
              </h4>
              <div className="divide-y divide-stone-100 text-xs">
                {order.items.map((item, idx) => (
                  <div key={idx} className="py-2 flex justify-between text-stone-700">
                    <span>
                      <strong className="text-temple-800 mr-2">{item.quantity}x</strong>
                      {language === 'kn' && item.nameKn ? item.nameKn : item.name}
                    </span>
                    <span className="font-mono">₹{item.totalPrice}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="border-t border-stone-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-stone-500">
                Total: <span className="font-bold text-stone-900 text-sm">₹{order.totalAmount.toFixed(2)}</span> ({order.paymentMethod} • {order.paymentStatus})
              </div>
              <button
                onClick={() => setShowPrintModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-bold transition"
              >
                <Printer className="w-3.5 h-3.5 text-gold-600" />
                <span>Print Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Modal */}
      {order && (
        <ThermalReceiptModal
          order={order}
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};
