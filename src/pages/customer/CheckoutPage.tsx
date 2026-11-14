import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import { store } from '../../services/store';
import { paymentService } from '../../services/payment';
import { OrderType, PaymentMethod } from '../../types';
import { 
  User, 
  Phone, 
  Utensils, 
  Package, 
  CreditCard, 
  Banknote, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle,
  Sparkles
} from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const { language, t } = useLanguage();
  const { items, orderNotes, subtotal, taxAmount, totalAmount, clearCart } = useCart();
  const navigate = useNavigate();

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
  const [tableNumber, setTableNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  
  // Submission & Validation State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If cart is empty, redirect to menu
  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif font-bold text-2xl text-stone-900">Your basket is empty</h2>
        <p className="text-stone-500 text-sm">Please add some offerings to checkout.</p>
        <Link
          to="/menu"
          className="inline-block px-6 py-2.5 rounded-xl bg-temple-700 text-white font-bold text-sm"
        >
          Go to Menu
        </Link>
      </div>
    );
  }

  const validateForm = (): boolean => {
    if (!customerName.trim()) {
      setErrorMessage(language === 'kn' ? 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಹೆಸರು ನಮೂದಿಸಿ' : 'Please enter your name.');
      return false;
    }
    const cleanMobile = customerMobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      setErrorMessage(language === 'kn' ? 'ದಯವಿಟ್ಟು ೧೦-ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ' : 'Please enter a valid 10-digit mobile number.');
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Process Payment
      await paymentService.initiatePayment({
        orderAmount: totalAmount,
        customerName,
        customerMobile,
        paymentMethod,
        onSuccess: (payResult) => {
          // 2. Atomically create order with sequential token (DP-001, DP-002...)
          const orderItems = items.map(i => ({
            menuItemId: i.menuItem.id,
            name: i.menuItem.name,
            nameKn: i.menuItem.nameKn,
            quantity: i.quantity,
            unitPrice: i.menuItem.price,
            totalPrice: i.menuItem.price * i.quantity,
          }));

          const createdOrder = store.createOrder({
            customerName,
            customerMobile,
            orderType,
            tableNumber: orderType === 'DINE_IN' ? tableNumber : undefined,
            paymentMethod,
            paymentStatus: payResult.paymentStatus,
            notes: orderNotes,
            items: orderItems,
          });

          // 3. Clear cart and navigate to confirmation screen
          clearCart();
          navigate(`/order/${createdOrder.id}`);
        },
        onFailure: (err) => {
          setIsSubmitting(false);
          setErrorMessage(err);
        },
      });
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Failed to place order. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-28">
      {/* Page Title */}
      <div className="border-b border-gold-200/60 pb-4">
        <Link
          to="/cart"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-temple-800 mb-2 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Basket</span>
        </Link>
        <h1 className="font-serif font-black text-3xl text-temple-900">
          {t.checkout.title}
        </h1>
        <p className="text-stone-500 text-xs sm:text-sm mt-0.5">
          {t.checkout.subtitle}
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Form Steps */}
        <div className="md:col-span-7 space-y-6">
          {/* Step 1: Contact Details */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
            <h2 className="font-serif font-bold text-lg text-stone-900">
              {t.checkout.customerDetails}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  {t.checkout.fullName} *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={t.checkout.fullNamePlaceholder}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  {t.checkout.mobileNumber} *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="tel"
                    maxLength={10}
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    placeholder={t.checkout.mobilePlaceholder}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 transition font-mono"
                  />
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Used for token lookup and ready alerts.
                </p>
              </div>
            </div>
          </div>

          {/* Step 2: Order Type */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
            <h2 className="font-serif font-bold text-lg text-stone-900">
              {t.checkout.orderTypeTitle}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setOrderType('DINE_IN')}
                className={`p-4 rounded-xl border text-left transition flex flex-col justify-between space-y-2 ${
                  orderType === 'DINE_IN'
                    ? 'border-temple-700 bg-cream-50 ring-2 ring-temple-700/20'
                    : 'border-stone-200 hover:border-gold-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Utensils className={`w-5 h-5 ${orderType === 'DINE_IN' ? 'text-temple-700' : 'text-stone-400'}`} />
                  {orderType === 'DINE_IN' && <div className="w-2.5 h-2.5 rounded-full bg-temple-700" />}
                </div>
                <div>
                  <div className="font-bold text-sm text-stone-900">{t.checkout.dineIn}</div>
                  <div className="text-[11px] text-stone-500 leading-tight">{t.checkout.dineInDesc}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOrderType('TAKEAWAY')}
                className={`p-4 rounded-xl border text-left transition flex flex-col justify-between space-y-2 ${
                  orderType === 'TAKEAWAY'
                    ? 'border-temple-700 bg-cream-50 ring-2 ring-temple-700/20'
                    : 'border-stone-200 hover:border-gold-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Package className={`w-5 h-5 ${orderType === 'TAKEAWAY' ? 'text-temple-700' : 'text-stone-400'}`} />
                  {orderType === 'TAKEAWAY' && <div className="w-2.5 h-2.5 rounded-full bg-temple-700" />}
                </div>
                <div>
                  <div className="font-bold text-sm text-stone-900">{t.checkout.takeaway}</div>
                  <div className="text-[11px] text-stone-500 leading-tight">{t.checkout.takeawayDesc}</div>
                </div>
              </button>
            </div>

            {orderType === 'DINE_IN' && (
              <div className="pt-2">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  {t.checkout.tableNumber}
                </label>
                <input
                  type="text"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder={t.checkout.tablePlaceholder}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 transition"
                />
              </div>
            )}
          </div>

          {/* Step 3: Payment Method */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
            <h2 className="font-serif font-bold text-lg text-stone-900">
              {t.checkout.paymentMethodTitle}
            </h2>

            <div className="space-y-3">
              <label
                className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition ${
                  paymentMethod === 'UPI'
                    ? 'border-temple-700 bg-cream-50 ring-2 ring-temple-700/20'
                    : 'border-stone-200 hover:border-gold-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'UPI'}
                  onChange={() => setPaymentMethod('UPI')}
                  className="mt-1 text-temple-700 focus:ring-temple-700"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-gold-600" />
                    <span className="font-bold text-sm text-stone-900">{t.checkout.upi}</span>
                    <span className="text-[10px] bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded-full">
                      Fastest
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">{t.checkout.upiDesc}</p>
                </div>
              </label>

              <label
                className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition ${
                  paymentMethod === 'CASH'
                    ? 'border-temple-700 bg-cream-50 ring-2 ring-temple-700/20'
                    : 'border-stone-200 hover:border-gold-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'CASH'}
                  onChange={() => setPaymentMethod('CASH')}
                  className="mt-1 text-temple-700 focus:ring-temple-700"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-gold-600" />
                    <span className="font-bold text-sm text-stone-900">{t.checkout.cash}</span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">{t.checkout.cashDesc}</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Summary Column */}
        <div className="md:col-span-5 bg-white rounded-2xl border border-gold-200/80 shadow-traditional p-6 space-y-6">
          <h3 className="font-serif font-bold text-lg text-stone-900 border-b border-stone-100 pb-3">
            {t.checkout.orderSummary}
          </h3>

          <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
            {items.map(({ menuItem, quantity }) => (
              <div key={menuItem.id} className="flex justify-between text-xs py-1">
                <span className="text-stone-700">
                  {quantity}x {language === 'kn' ? menuItem.nameKn : menuItem.name}
                </span>
                <span className="font-mono font-medium text-stone-900">
                  ₹{menuItem.price * quantity}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-stone-100 pt-3 space-y-2 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal:</span>
              <span className="font-mono">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>GST (5%):</span>
              <span className="font-mono">₹{taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-serif font-black text-lg text-temple-900 pt-2 border-t border-dashed border-stone-200">
              <span>Total Payable:</span>
              <span className="text-gold-700">₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-cream-100/70 p-3 rounded-xl border border-gold-200/70 text-[11px] text-stone-600 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
            <span>
              Your food token will be generated immediately with real-time live kitchen preparation status.
            </span>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={isSubmitting}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-temple-700 to-temple-800 hover:from-temple-800 hover:to-temple-900 disabled:opacity-50 text-white font-serif font-bold text-lg shadow-traditional hover:shadow-gold transition flex items-center justify-center gap-2 active:scale-95"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t.checkout.processing}</span>
              </div>
            ) : (
              <>
                <span>{t.checkout.placeOrder}</span>
                <ArrowRight className="w-5 h-5 text-gold-400" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
