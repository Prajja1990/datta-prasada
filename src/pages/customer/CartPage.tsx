import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight, 
  ArrowLeft, 
  Receipt, 
  ChefHat,
  MessageSquare
} from 'lucide-react';

export const CartPage: React.FC = () => {
  const { language, t } = useLanguage();
  const { 
    items, 
    updateQuantity, 
    removeFromCart, 
    clearCart, 
    orderNotes, 
    setOrderNotes,
    subtotal, 
    taxAmount, 
    totalAmount,
    itemCount 
  } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-cream-100 border-2 border-gold-300 flex items-center justify-center mx-auto text-gold-700 shadow-sm">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="font-serif font-bold text-3xl text-temple-900">
            {t.cart.emptyTitle}
          </h2>
          <p className="text-stone-500 text-sm max-w-sm mx-auto">
            {t.cart.emptySubtitle}
          </p>
        </div>
        <Link
          to="/menu"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-temple-700 hover:bg-temple-800 text-white font-serif font-bold text-base shadow-traditional transition active:scale-95"
        >
          <span>{t.cart.browseMenu}</span>
          <ArrowRight className="w-4 h-4 text-gold-400" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gold-200/60 pb-4">
        <div>
          <h1 className="font-serif font-black text-3xl text-temple-900">
            {t.cart.title}
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-0.5">
            {itemCount} {t.cart.itemsCount} selected
          </p>
        </div>
        <button
          onClick={clearCart}
          className="text-stone-400 hover:text-red-600 text-xs font-bold transition flex items-center gap-1 p-2"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{t.cart.clearCart}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Items List & Kitchen Notes */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 shadow-sm overflow-hidden">
            {items.map(({ menuItem, quantity }) => (
              <div key={menuItem.id} className="p-4 sm:p-5 flex items-center gap-4">
                {/* Thumb */}
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                  <img
                    src={menuItem.imageUrl}
                    alt={menuItem.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-600 shrink-0" />
                    <h3 className="font-serif font-bold text-stone-900 text-base truncate">
                      {language === 'kn' ? menuItem.nameKn : menuItem.name}
                    </h3>
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    ₹{menuItem.price} each
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center border border-gold-400 bg-gold-50 rounded-xl overflow-hidden">
                  <button
                    onClick={() => updateQuantity(menuItem.id, quantity - 1)}
                    className="p-1.5 text-temple-900 hover:bg-gold-200 transition"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2.5 font-bold text-xs text-temple-950 font-mono">
                    {quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(menuItem.id, quantity + 1)}
                    className="p-1.5 text-temple-900 hover:bg-gold-200 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Subtotal */}
                <div className="text-right font-serif font-black text-base text-temple-900 w-16">
                  ₹{menuItem.price * quantity}
                </div>
              </div>
            ))}
          </div>

          {/* Kitchen Instructions / Notes Box */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-temple-800 font-bold text-sm">
              <MessageSquare className="w-4 h-4 text-gold-600" />
              <span>{t.cart.orderNotes}</span>
            </div>
            <textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder={t.cart.orderNotesPlaceholder}
              rows={2}
              className="w-full p-3 rounded-xl border border-stone-200 text-stone-800 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-gold-500 transition"
            />
          </div>

          {/* Back to menu button */}
          <div>
            <Link
              to="/menu"
              className="inline-flex items-center gap-2 text-gold-700 hover:text-gold-800 text-sm font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{language === 'kn' ? 'ಇನ್ನಷ್ಟು ತಿಂಡಿಗಳನ್ನು ಸೇರಿಸಿ' : 'Add more items from menu'}</span>
            </Link>
          </div>
        </div>

        {/* Right Column: Bill Summary */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gold-200/80 shadow-traditional p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-4">
            <Receipt className="w-5 h-5 text-gold-600" />
            <h3 className="font-serif font-bold text-lg text-stone-900">
              Bill Summary
            </h3>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between text-stone-600">
              <span>{t.cart.itemTotal}</span>
              <span className="font-mono font-medium">₹{subtotal.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-stone-600">
              <span className="text-xs">{t.cart.gstLabel}</span>
              <span className="font-mono font-medium">₹{taxAmount.toFixed(2)}</span>
            </div>

            <div className="border-t border-dashed border-stone-300 pt-3 flex items-center justify-between font-serif font-black text-xl text-temple-900">
              <span>{t.cart.grandTotal}</span>
              <span className="text-gold-700">₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-cream-100/70 p-3.5 rounded-xl border border-gold-200/70 text-xs text-stone-600 space-y-1">
            <div className="font-bold text-temple-900 flex items-center gap-1.5">
              <ChefHat className="w-3.5 h-3.5 text-gold-700" />
              <span>Sakleshpur Fresh Preparation</span>
            </div>
            <p>Every dish is made fresh to order. An instant daily token will be assigned at checkout.</p>
          </div>

          <button
            onClick={() => navigate('/checkout')}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-temple-700 to-temple-800 hover:from-temple-800 hover:to-temple-900 text-white font-serif font-bold text-lg shadow-traditional hover:shadow-gold transition flex items-center justify-center gap-2 active:scale-95"
          >
            <span>{t.cart.proceedToCheckout}</span>
            <ArrowRight className="w-5 h-5 text-gold-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
