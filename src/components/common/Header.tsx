import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { 
  ShoppingBag, 
  Menu as MenuIcon, 
  X, 
  Languages, 
  Search, 
  Clock, 
  ChefHat, 
  ShieldCheck, 
  User, 
  LogOut,
  Flame
} from 'lucide-react';

export const Header: React.FC = () => {
  const { language, toggleLanguage, t } = useLanguage();
  const { itemCount } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gold-200/60 shadow-sm transition-all">
      {/* Top sacred banner */}
      <div className="bg-gradient-to-r from-temple-900 via-temple-800 to-temple-900 text-gold-300 text-[11px] font-medium py-1 px-4 text-center tracking-wide flex items-center justify-center gap-2 border-b border-gold-700/30">
        <span className="text-gold-400">॥ ಶ್ರೀ ಗುರುದೇವ ದತ್ತ ॥</span>
        <span className="hidden sm:inline text-gold-500">•</span>
        <span className="hidden sm:inline">{t.brand.tagline}</span>
        <span className="hidden md:inline text-gold-500">•</span>
        <span className="hidden md:inline">{t.brand.location}</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo & Title */}
          <Link to="/" className="flex items-center gap-3 group">
            {/* Logo Emblem */}
            <div className="relative w-14 h-14 rounded-2xl bg-white overflow-hidden p-0.5 border-2 border-gold-400 shadow-traditional transition-transform group-hover:scale-105 shrink-0 flex items-center justify-center">
              <img
                src="/logo.jpg"
                alt="Datta Prasada"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex flex-col">
              <span className="font-serif font-black text-2xl tracking-tight text-temple-900 leading-none group-hover:text-gold-700 transition">
                {t.brand.name}
              </span>
              <span className="text-[11px] font-medium tracking-wide text-gold-700 mt-1">
                {t.brand.tagline}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <Link
              to="/"
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${
                isActive('/') ? 'text-temple-700 bg-cream-100 font-bold' : 'text-stone-700 hover:text-temple-700 hover:bg-stone-50'
              }`}
            >
              {t.nav.home}
            </Link>

            <Link
              to="/menu"
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${
                isActive('/menu') ? 'text-temple-700 bg-cream-100 font-bold' : 'text-stone-700 hover:text-temple-700 hover:bg-stone-50'
              }`}
            >
              {t.nav.menu}
            </Link>

            <Link
              to="/track"
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${
                isActive('/track') ? 'text-temple-700 bg-cream-100 font-bold' : 'text-stone-700 hover:text-temple-700 hover:bg-stone-50'
              }`}
            >
              {t.nav.track}
            </Link>

            {/* Language Toggle Pill */}
            <button
              onClick={toggleLanguage}
              className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gold-300 bg-gold-50/80 hover:bg-gold-100 text-stone-800 text-xs font-bold transition shadow-xs"
              title="Switch language / ಭಾಷೆ ಬದಲಾಯಿಸಿ"
            >
              <Languages className="w-3.5 h-3.5 text-gold-700" />
              <span>{t.nav.language}</span>
            </button>

            {/* Shopping Cart Button */}
            <Link
              to="/cart"
              className="relative ml-2 flex items-center gap-2 px-4 py-2 rounded-full bg-temple-700 hover:bg-temple-800 text-white text-sm font-bold shadow-sm transition active:scale-95"
            >
              <ShoppingBag className="w-4 h-4 text-gold-300" />
              <span>{t.nav.cart}</span>
              {itemCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 text-xs font-extrabold bg-gold-500 text-temple-950 rounded-full">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Staff / Kitchen / Admin Link */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2 ml-3 pl-3 border-l border-stone-200">
                <Link
                  to={user?.roles.includes('KITCHEN_STAFF') ? '/kitchen' : '/staff/orders'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold"
                >
                  <ChefHat className="w-3.5 h-3.5 text-temple-700" />
                  <span>{user?.roles[0].replace('_', ' ')}</span>
                </Link>
                <button
                  onClick={logout}
                  className="p-1.5 text-stone-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/staff/login"
                className="ml-2 p-2 rounded-full text-stone-500 hover:text-temple-700 hover:bg-stone-100 transition"
                title="Restaurant Staff & Kitchen Login"
              >
                <ShieldCheck className="w-5 h-5" />
              </Link>
            )}
          </nav>

          {/* Mobile Right Icons */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-gold-300 bg-gold-50 text-stone-800 text-xs font-bold"
            >
              <Languages className="w-3 h-3 text-gold-700" />
              <span>{language === 'en' ? 'ಕನ್ನಡ' : 'EN'}</span>
            </button>

            <Link
              to="/cart"
              className="relative p-2 rounded-full bg-temple-700 text-white shadow-sm"
            >
              <ShoppingBag className="w-5 h-5 text-gold-300" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-[10px] font-extrabold bg-gold-500 text-temple-950 rounded-full">
                  {itemCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-stone-700 hover:bg-stone-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white/98 backdrop-blur-lg px-4 pt-3 pb-6 space-y-2 shadow-xl animate-fadeIn">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between p-3 rounded-xl font-medium text-stone-800 hover:bg-cream-100"
          >
            <span>{t.nav.home}</span>
          </Link>
          <Link
            to="/menu"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between p-3 rounded-xl font-medium text-stone-800 hover:bg-cream-100"
          >
            <span>{t.nav.menu}</span>
          </Link>
          <Link
            to="/track"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between p-3 rounded-xl font-medium text-stone-800 hover:bg-cream-100"
          >
            <span>{t.nav.track}</span>
          </Link>

          <div className="border-t border-stone-200 pt-3 mt-2 space-y-2">
            <Link
              to="/staff/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 p-3 rounded-xl text-temple-700 font-semibold bg-stone-50 hover:bg-stone-100"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Staff & Kitchen Portal</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-gradient-to-b from-temple-900 to-[#05110d] text-cream-100 pt-16 pb-12 border-t-4 border-gold-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-temple-800/80">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white overflow-hidden p-0.5 border border-gold-400 shrink-0">
                <img
                  src="/logo.jpg"
                  alt="Datta Prasada"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-serif font-black text-2xl text-gold-400 tracking-wide">
                {t.brand.name}
              </span>
            </div>
            <p className="text-stone-300 text-sm leading-relaxed max-w-md">
              {t.home.ourStoryP1}
            </p>
            <div className="flex items-center gap-2 text-gold-300 text-xs font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
              <span>100% Pure Vegetarian Traditional Sakleshpur Delicacies</span>
            </div>
          </div>

          {/* Timings & Location */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-gold-400 text-base uppercase tracking-wider">
              Service Timings
            </h4>
            <div className="text-sm text-stone-300 space-y-1">
              <p className="font-semibold text-white">Everyday (All 7 Days)</p>
              <p>Morning Breakfast: 6:30 AM – 12:30 PM</p>
              <p>Evening Snacks: 4:00 PM – 10:30 PM</p>
            </div>
          </div>

          {/* Outlet Contact */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-gold-400 text-base uppercase tracking-wider">
              Balagere Outlet
            </h4>
            <div className="text-sm text-stone-300 space-y-1">
              <p>Balagere Main Road,</p>
              <p>Near Panathur Railway Bridge,</p>
              <p>Varthur - Balagere, Bangalore - 560087</p>
              <p className="pt-2 text-gold-300 font-medium">Helpline: +91 98450 12345</p>
            </div>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-400 gap-4">
          <p>© {new Date().getFullYear()} Datta Prasada. All Rights Reserved. ॥ ಶ್ರೀ ಗುರುದೇವ ದತ್ತ ॥</p>
          <div className="flex items-center gap-4">
            <Link to="/staff/login" className="hover:text-gold-400 transition">
              Staff Portal
            </Link>
            <span>•</span>
            <Link to="/kitchen" className="hover:text-gold-400 transition">
              Kitchen KDS
            </Link>
            <span>•</span>
            <Link to="/admin/dashboard" className="hover:text-gold-400 transition">
              Admin Console
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
