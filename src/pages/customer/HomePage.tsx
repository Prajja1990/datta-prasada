import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import { usePublicRestaurantProfile } from '../../services/publicRestaurantProfile';
import { loadHomeMenu } from '../../services/restaurantDatabase';
import { Category, MenuItem } from '../../types';
import { 
  ArrowRight, 
  Sparkles, 
  Clock, 
  MapPin, 
  Phone, 
  Plus, 
  Check, 
  ShieldCheck, 
  Utensils, 
  Coffee,
  Heart
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { language } = useLanguage();
  const { profile, error: profileError } = usePublicRestaurantProfile();
  const { addToCart } = useCart();
  const copy = (key: string) => profile?.home_content[language === 'kn' ? key + '_kn' : key] ?? profile?.home_content[key] ?? '';
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuError, setMenuError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await loadHomeMenu();
        if (active) { setCategories(result.categories); setMenuItems(result.menuItems); setMenuError(null); }
      } catch (error: any) { if (active) setMenuError(error.message || 'Unable to load menu.'); }
    };
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const featuredItems = menuItems.filter(i => i.featured && i.available);
  const selectedId = profile?.home_content.special_menu_item_id;
  const todaysSpecial = selectedId
    ? menuItems.find(item => item.id === selectedId && item.available)
    : featuredItems[0] || menuItems.find(item => item.available);

  return (
    <div className="space-y-16 pb-20">
      {profileError && <p role="status" className="px-4 text-stone-600">{profileError}</p>}
      {menuError && <p role="alert" className="px-4 text-red-700">{menuError}</p>}
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-cream-100 via-ivory to-cream-50 pt-8 pb-16 sm:pb-24 border-b border-gold-200/50">
        {/* Subtle decorative background ring */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-gold-200/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-temple-500/10 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white overflow-hidden p-1 border-2 border-gold-400 shadow-traditional shrink-0">
                  <img
                    src={profile?.home_content.logo_url || undefined}
                    alt={profile?.restaurant_name || 'Restaurant logo'}
                    className="w-full h-full object-contain object-center"
                  />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold-100/80 border border-gold-300 text-gold-900 text-xs font-bold shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 text-gold-600" />
                    <span>{copy('home_welcome')}</span>
                  </div>
                  <div className="text-xs text-gold-700 font-bold mt-1 tracking-wider uppercase">
                    {language === 'kn' ? profile?.tagline_kn : profile?.tagline}
                  </div>
                </div>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-black text-temple-900 tracking-tight leading-[1.15]">
                {copy('hero_heading')}
              </h1>

              <p className="text-stone-600 text-base sm:text-lg max-w-2xl leading-relaxed">
                {copy('hero_description')}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  to="/menu"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-temple-700 to-temple-800 hover:from-temple-800 hover:to-temple-900 text-white font-serif font-bold text-lg shadow-traditional hover:shadow-gold transition-all duration-200 active:scale-95"
                >
                  <span>{copy('home_orderNow')}</span>
                  <ArrowRight className="w-5 h-5 text-gold-400" />
                </Link>

                <Link
                  to="/track"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-gold-400 bg-white/80 hover:bg-gold-50 text-temple-900 font-bold text-base shadow-xs transition"
                >
                  <Clock className="w-4 h-4 text-gold-600" />
                  <span>{copy('nav_track')}</span>
                </Link>
              </div>

              {/* Key Trust Badges */}
              <div className="grid grid-cols-3 gap-3 pt-6 border-t border-gold-200/60 max-w-lg mx-auto lg:mx-0">
                <div className="text-center lg:text-left">
                  <div className="text-temple-800 font-bold text-sm">{copy('badge_1_title')}</div>
                  <div className="text-stone-500 text-xs">{copy('badge_1_description')}</div>
                </div>
                <div className="text-center lg:text-left border-x border-stone-200 px-2">
                  <div className="text-temple-800 font-bold text-sm">{copy('badge_2_title')}</div>
                  <div className="text-stone-500 text-xs">{copy('badge_2_description')}</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-temple-800 font-bold text-sm">{copy('badge_3_title')}</div>
                  <div className="text-stone-500 text-xs">{copy('badge_3_description')}</div>
                </div>
              </div>
            </div>

            {/* Right Food Visual Card */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-md">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white aspect-square group">
                  <img
                    src={profile?.home_content.hero_image_url || undefined}
                    alt={copy('hero_image_alt')}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* Floating Tag */}
                  <div className="absolute top-4 left-4 bg-temple-900/90 backdrop-blur-md text-gold-300 border border-gold-400 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                    <span>{copy('hero_badge')}</span>
                  </div>

                  {/* Bottom Dish Information */}
                  <div className="absolute bottom-6 left-6 right-6 text-white space-y-1">
                    <div className="font-serif font-bold text-2xl text-gold-300">
                      {copy('hero_dish_title')}
                    </div>
                    <div className="text-xs text-stone-200 line-clamp-2">
                      {copy('hero_dish_description')}
                    </div>
                    <div className="pt-2 flex items-center justify-between">
                      <span className="font-serif font-black text-xl text-white">{todaysSpecial ? `₹${todaysSpecial.price}` : ''}</span>
                      <button
                        disabled={!todaysSpecial}
                        onClick={() => { if (todaysSpecial) addToCart(todaysSpecial); }}
                        className="px-4 py-1.5 bg-gold-500 hover:bg-gold-600 text-temple-950 rounded-full font-bold text-xs flex items-center gap-1 shadow-sm transition active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{copy('menu_addToCart')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Today's Special Banner */}
      {todaysSpecial && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-amber-500 via-gold-500 to-amber-600 rounded-2xl p-1 shadow-gold">
            <div className="bg-cream-50 rounded-[14px] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 shadow-md border-2 border-gold-400">
                  <img
                    src={todaysSpecial.imageUrl}
                    alt={todaysSpecial.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-gold-100 text-gold-900 text-[10px] font-black uppercase tracking-wider mb-1">
                    {copy('home_todaysSpecial')}
                  </div>
                  <h3 className="font-serif font-bold text-2xl text-stone-900">
                    {language === 'kn' ? todaysSpecial.nameKn : todaysSpecial.name}
                  </h3>
                  <p className="text-stone-600 text-xs sm:text-sm max-w-lg mt-0.5 line-clamp-1">
                    {language === 'kn' ? todaysSpecial.descriptionKn : todaysSpecial.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 w-full md:w-auto justify-between md:justify-end">
                <div className="text-right">
                  <span className="text-xs text-stone-500 block">{copy('special_price_label')}</span>
                  <span className="font-serif font-black text-2xl text-temple-800">
                    ₹{todaysSpecial.price}
                  </span>
                </div>
                <button
                  onClick={() => addToCart(todaysSpecial)}
                  className="px-6 py-3 bg-temple-700 hover:bg-temple-800 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm transition active:scale-95"
                >
                  <Plus className="w-4 h-4 text-gold-400" />
                  <span>{copy('menu_addToCart')}</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-end justify-between border-b border-gold-200/60 pb-4">
          <div>
            <h2 className="font-serif font-bold text-3xl text-temple-900">
              {copy('home_categoriesTitle')}
            </h2>
            <p className="text-stone-500 text-sm mt-1">
              {copy('categories_description')}
            </p>
          </div>
          <Link
            to="/menu"
            className="text-gold-700 hover:text-gold-800 font-bold text-sm inline-flex items-center gap-1"
          >
            <span>{copy('home_viewMenu')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/menu?category=${cat.id}`}
              className="group p-5 bg-white rounded-2xl border border-stone-200 hover:border-gold-400 shadow-sm hover:shadow-traditional transition flex flex-col items-center text-center space-y-3"
            >
              <div className="w-14 h-14 rounded-full bg-cream-100 flex items-center justify-center text-temple-700 group-hover:bg-gold-100 group-hover:scale-110 transition">
                <Utensils className="w-6 h-6 text-gold-600" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-stone-900 group-hover:text-temple-800 text-base">
                  {language === 'kn' ? cat.nameKn : cat.name}
                </h4>
                <p className="text-[11px] text-stone-500 mt-1 line-clamp-2">
                  {cat.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Items Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-end justify-between border-b border-gold-200/60 pb-4">
          <div>
            <h2 className="font-serif font-bold text-3xl text-temple-900">
              {copy('home_featuredTitle')}
            </h2>
            <p className="text-stone-500 text-sm mt-1">
              {copy('featured_description')}
            </p>
          </div>
          <Link
            to="/menu"
            className="text-gold-700 hover:text-gold-800 font-bold text-sm inline-flex items-center gap-1"
          >
            <span>{copy('menu_subtitle')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {featuredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-traditional transition flex flex-col justify-between group"
            >
              {/* Image & Badges */}
              <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Pure Veg Badge */}
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 border border-green-600">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-600" />
                  <span className="text-[10px] font-bold text-green-800 uppercase">{copy('veg_label')}</span>
                </div>

                {/* Prep time */}
                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 text-gold-300" />
                  <span>{item.preparationTimeMinutes} {copy('menu_prepTime')}</span>
                </div>
              </div>

              {/* Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-serif font-bold text-stone-900 text-lg group-hover:text-temple-700 transition">
                    {language === 'kn' ? item.nameKn : item.name}
                  </h3>
                  <p className="text-stone-500 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                    {language === 'kn' ? item.descriptionKn : item.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                  <div>
                    <span className="font-serif font-black text-xl text-temple-900">
                      ₹{item.price}
                    </span>
                  </div>

                  <button
                    onClick={() => addToCart(item)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-temple-950 font-bold text-xs shadow-xs transition active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{copy('menu_addToCart')}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sakleshpur Heritage Story */}
      <section className="bg-gradient-to-r from-temple-900 via-temple-800 to-temple-900 text-cream-100 py-16 border-y-2 border-gold-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/20 border border-gold-400 text-gold-300 text-xs font-bold">
                <Heart className="w-3.5 h-3.5 text-gold-400 fill-gold-400" />
                <span>{copy('story_badge')}</span>
              </div>
              <h2 className="font-serif font-bold text-3xl sm:text-4xl text-gold-400">
                {copy('home_ourStoryTitle')}
              </h2>
              <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
                {copy('home_ourStoryP1')}
              </p>
              <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
                {copy('home_ourStoryP2')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-gold-500/30 rounded-2xl p-6 text-center space-y-2">
                <div className="font-serif font-black text-3xl text-gold-400">{copy('stat_1_value')}</div>
                <div className="text-xs text-stone-300 font-semibold uppercase tracking-wider">
                  {copy('stat_1_label')}
                </div>
              </div>
              <div className="bg-white/5 border border-gold-500/30 rounded-2xl p-6 text-center space-y-2">
                <div className="font-serif font-black text-3xl text-gold-400">{copy('stat_2_value')}</div>
                <div className="text-xs text-stone-300 font-semibold uppercase tracking-wider">
                  {copy('stat_2_label')}
                </div>
              </div>
              <div className="bg-white/5 border border-gold-500/30 rounded-2xl p-6 text-center space-y-2">
                <div className="font-serif font-black text-3xl text-gold-400">{copy('stat_3_value')}</div>
                <div className="text-xs text-stone-300 font-semibold uppercase tracking-wider">
                  {copy('stat_3_label')}
                </div>
              </div>
              <div className="bg-white/5 border border-gold-500/30 rounded-2xl p-6 text-center space-y-2">
                <div className="font-serif font-black text-3xl text-gold-400">{copy('stat_4_value')}</div>
                <div className="text-xs text-stone-300 font-semibold uppercase tracking-wider">
                  {copy('stat_4_label')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Outlet Location & Timings */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-gold-300/80 shadow-traditional p-8 sm:p-12">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
            <h2 className="font-serif font-bold text-3xl text-temple-900">
              {copy('home_locationTitle')}
            </h2>
            <p className="text-stone-600 text-sm">
              {copy('location_description')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-cream-50 border border-gold-200">
              <div className="w-12 h-12 rounded-xl bg-gold-100 flex items-center justify-center shrink-0 text-gold-800">
                <MapPin className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-serif font-bold text-stone-900 text-base">{copy('home_addressLabel')}</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {profile?.address}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-2xl bg-cream-50 border border-gold-200">
              <div className="w-12 h-12 rounded-xl bg-gold-100 flex items-center justify-center shrink-0 text-gold-800">
                <Clock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-serif font-bold text-stone-900 text-base">{copy('home_hoursLabel')}</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {profile?.opening_hours}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-2xl bg-cream-50 border border-gold-200">
              <div className="w-12 h-12 rounded-xl bg-gold-100 flex items-center justify-center shrink-0 text-gold-800">
                <Phone className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-serif font-bold text-stone-900 text-base">{copy('home_phoneLabel')}</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {profile?.phone && <a href={`tel:${profile.phone.replace(/[^+0-9]/g, '')}`}>{profile.phone}</a>}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
