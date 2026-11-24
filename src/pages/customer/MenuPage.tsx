import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import { loadHomeMenu } from '../../services/restaurantDatabase';
import { MenuItem, Category } from '../../types';
import { 
  Search, 
  Plus, 
  Minus, 
  Clock, 
  ShoppingBag, 
  Sparkles, 
  SlidersHorizontal,
  ArrowRight
} from 'lucide-react';

export const MenuPage: React.FC = () => {
  const { language, t } = useLanguage();
  const { items: cartItems, addToCart, updateQuantity, itemCount, totalAmount } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const data = await loadHomeMenu();
        if (active) {
          setCategories(data.categories);
          setMenuItems(data.menuItems.filter(item => data.categories.some(category => category.id === item.categoryId)));
          setError(null);
        }
      } catch (e: any) { if (active) setError(e.message || 'Unable to load menu.'); }
      finally { if (active) setLoading(false); }
    };
    void loadData();
    const timer = window.setInterval(() => void loadData(), 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  // Update URL param when category changes
  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId);
    if (catId === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', catId);
    }
    setSearchParams(searchParams);
  };

  // Filter items
  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      item.name.toLowerCase().includes(q) ||
      item.nameKn.includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.descriptionKn.includes(q)
    );
    return matchesCategory && matchesSearch;
  });

  const getItemQuantity = (id: string) => {
    const found = cartItems.find(ci => ci.menuItem.id === id);
    return found ? found.quantity : 0;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
      {error && <p role="alert" className="p-4 bg-red-50 text-red-700 rounded-xl">{error}</p>}
      {loading && <p role="status">Loading menu…</p>}
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gold-200/60 pb-6">
        <div>
          <h1 className="font-serif font-black text-3xl sm:text-4xl text-temple-900">
            {t.menu.title}
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            {t.menu.subtitle}
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.menu.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gold-300 bg-white text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 transition shadow-xs"
          />
        </div>
      </div>

      {/* Category Pills (Horizontal scroll on mobile) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => handleCategorySelect('all')}
          className={`shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition shadow-xs ${
            selectedCategory === 'all'
              ? 'bg-temple-700 text-white shadow-sm'
              : 'bg-white border border-stone-200 text-stone-700 hover:border-gold-300'
          }`}
        >
          {t.menu.allCategories}
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategorySelect(cat.id)}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition shadow-xs ${
              selectedCategory === cat.id
                ? 'bg-temple-700 text-white shadow-sm'
                : 'bg-white border border-stone-200 text-stone-700 hover:border-gold-300'
            }`}
          >
            {language === 'kn' ? cat.nameKn : cat.name}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 p-8 space-y-3">
          <p className="text-stone-500 text-base">{t.menu.noItemsFound}</p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
            className="text-gold-700 hover:underline text-sm font-bold"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const qty = getItemQuantity(item.id);
            const isAvailable = item.available;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-traditional transition flex flex-col justify-between ${
                  !isAvailable ? 'opacity-70 grayscale-[0.3]' : ''
                }`}
              >
                {/* Top Image & Badges */}
                <div className="relative aspect-[16/10] overflow-hidden bg-stone-100">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />

                  {/* Pure Veg Indicator */}
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1.5 border border-green-600 shadow-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-600" />
                    <span className="text-[10px] font-bold text-green-900">VEG</span>
                  </div>

                  {/* Today's Special / Featured Tag */}
                  {item.featured && (
                    <div className="absolute top-3 right-3 bg-gold-500 text-temple-950 font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>{t.menu.featured}</span>
                    </div>
                  )}

                  {/* Out of Stock Overlay */}
                  {!isAvailable && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                      <span className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider shadow-md">
                        {t.menu.outOfStock}
                      </span>
                    </div>
                  )}

                  {/* Prep Duration */}
                  <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gold-300" />
                    <span>{item.preparationTimeMinutes} {t.menu.prepTime}</span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-serif font-bold text-stone-900 text-lg">
                      {language === 'kn' ? item.nameKn : item.name}
                    </h3>
                    <p className="text-stone-500 text-xs line-clamp-2 leading-relaxed">
                      {language === 'kn' ? item.descriptionKn : item.description}
                    </p>
                  </div>

                  {/* Footer Price & Add Button */}
                  <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                    <div>
                      <span className="font-serif font-black text-2xl text-temple-900">
                        ₹{item.price}
                      </span>
                    </div>

                    {isAvailable ? (
                      qty > 0 ? (
                        /* Quantity Selector (+ / -) */
                        <div className="flex items-center border border-gold-400 bg-gold-50 rounded-xl overflow-hidden shadow-xs">
                          <button
                            onClick={() => updateQuantity(item.id, qty - 1)}
                            className="p-2 text-temple-900 hover:bg-gold-200 transition active:scale-95"
                            title="Decrease"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 font-bold text-xs text-temple-950 font-mono">
                            {qty}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, qty + 1)}
                            className="p-2 text-temple-900 hover:bg-gold-200 transition active:scale-95"
                            title="Increase"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        /* Add to Cart CTA */
                        <button
                          onClick={() => addToCart(item)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-temple-950 font-bold text-xs shadow-xs transition active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t.menu.addToCart}</span>
                        </button>
                      )
                    ) : (
                      <span className="text-xs text-red-600 font-semibold">
                        {t.menu.outOfStock}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Cart Bar for Mobile & Quick Checkout */}
      {itemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-30 max-w-lg mx-auto">
          <Link
            to="/cart"
            className="flex items-center justify-between p-4 bg-temple-800 hover:bg-temple-900 text-white rounded-2xl shadow-2xl border-2 border-gold-400 backdrop-blur-md transition transform active:scale-98"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold-500 text-temple-950 font-black flex items-center justify-center text-sm">
                {itemCount}
              </div>
              <div>
                <div className="text-xs text-gold-300 font-medium">
                  {itemCount} {t.cart.itemsCount} in basket
                </div>
                <div className="font-serif font-black text-lg">
                  ₹{totalAmount.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 font-bold text-sm text-gold-300">
              <span>{t.cart.proceedToCheckout}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>
      )}
    </div>
  );
};
