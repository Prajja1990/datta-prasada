import { homeContentFields } from '../../services/homeContentFields';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { loadRestaurantSettings, saveRestaurantSettings, loadHomeMenu } from '../../services/restaurantDatabase';
import { ChangePasswordModal } from '../../components/auth/ChangePasswordModal';
import { Settings, Save, Check, Printer, Building2, Store, Key, ShieldCheck } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const [homeContent, setHomeContent] = useState<Record<string, string>>({});
  const [homeMenuOptions, setHomeMenuOptions] = useState<{ id: string; name: string }[]>([]);
  const [openingHours, setOpeningHours] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [tagline, setTagline] = useState('');
  const [taglineKn, setTaglineKn] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [upiVpa, setUpiVpa] = useState('');
  const [tokenPrefix, setTokenPrefix] = useState('');
  const [gstRate, setGstRate] = useState(0);
  const [thermalWidth, setThermalWidth] = useState<'80mm' | '58mm'>('80mm');
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadRestaurantSettings().then(settings => {
      if (!active) return;
      setRestaurantName(settings.restaurant_name);
      setHomeContent(settings.home_content || {});
      setOpeningHours(settings.opening_hours);
      setTagline(settings.tagline);
      setTaglineKn(settings.tagline_kn);
      setAddress(settings.address);
      setPhone(settings.phone);
      setUpiVpa(settings.upi_vpa);
      setTokenPrefix(settings.token_prefix);
      setGstRate(settings.gst_rate);
      setThermalWidth(settings.thermal_width);
    }).catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setIsLoading(false); });
    loadHomeMenu().then(result => {
      if (active) setHomeMenuOptions(result.menuItems.map(item => ({ id: item.id, name: item.name })));
    }).catch(() => { /* Menu selection remains optional; settings loading reports its own errors. */ });
    return () => { active = false; };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setIsSaved(false);
    setError(null);
    try {
      await saveRestaurantSettings({
        home_content: homeContent, restaurant_name: restaurantName, opening_hours: openingHours, tagline, tagline_kn: taglineKn,
        address, phone, upi_vpa: upiVpa, token_prefix: tokenPrefix,
        gst_rate: gstRate, thermal_width: thermalWidth,
      });
      setIsSaved(true);
    } catch (e: any) { setError(e.message || 'Unable to save settings.'); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-4xl mx-auto pb-28">
      <div className="border-b border-stone-200 pb-4">
        <h1 className="font-serif font-black text-3xl text-stone-900">
          Restaurant Operational Settings
        </h1>
        <p className="text-stone-500 text-xs sm:text-sm mt-0.5">
          Configure Balagere outlet parameters, UPI QR billing, tax rates, and 58mm/80mm thermal receipt printing
        </p>
      </div>

      {error && <p role="alert" className="p-4 bg-red-50 text-red-800 rounded-xl">{error}</p>}
      {isLoading && <p>Loading restaurant settings…</p>}
      {isSaved && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600" />
          <span>Operational settings updated and committed successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm">
        <fieldset disabled={isLoading || isSaving || (!!error && !restaurantName)} className="space-y-6">
        {/* Outlet Identity */}
        <div className="space-y-4">
          <h3 className="font-serif font-bold text-base text-stone-900 border-b border-stone-100 pb-2 flex items-center gap-2">
            <Store className="w-4 h-4 text-gold-600" />
            <span>Storefront Profile</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Restaurant Brand Name
              </label>
              <input
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Token Prefix
              </label>
              <input
                type="text"
                value={tokenPrefix}
                onChange={(e) => setTokenPrefix(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Tagline (English)
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Tagline (Kannada - ಕನ್ನಡ)
              </label>
              <input
                type="text"
                value={taglineKn}
                onChange={(e) => setTaglineKn(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
              Physical Location Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">Contact Phone</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">Opening Hours</label>
          <input type="text" value={openingHours} onChange={e => setOpeningHours(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm" />
        </div>
        {/* Taxes & UPI Billing */}
        <div className="space-y-4 pt-4 border-t border-stone-100">
          <h3 className="font-serif font-bold text-base text-stone-900 border-b border-stone-100 pb-2">
            Tax & UPI Gateway Configuration
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                GST Rate (%)
              </label>
              <input
                type="number"
                min={0}
                max={28}
                value={gstRate}
                onChange={(e) => setGstRate(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                UPI Virtual Payment Address (VPA)
              </label>
              <input
                type="text"
                value={upiVpa}
                onChange={(e) => setUpiVpa(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Thermal Hardware Printer Options */}
        <div className="space-y-4 pt-4 border-t border-stone-100">
          <h3 className="font-serif font-bold text-base text-stone-900 border-b border-stone-100 pb-2 flex items-center gap-2">
            <Printer className="w-4 h-4 text-gold-600" />
            <span>Thermal Receipt / KOT Printer Setup</span>
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <label
              className={`p-4 rounded-xl border cursor-pointer text-xs transition ${
                thermalWidth === '80mm' ? 'border-temple-700 bg-cream-50 font-bold' : 'border-stone-200 hover:bg-stone-50'
              }`}
            >
              <div className="flex justify-between items-center">
                <span>80mm POS Thermal Roll</span>
                <input
                  type="radio"
                  name="printerWidth"
                  checked={thermalWidth === '80mm'}
                  onChange={() => setThermalWidth('80mm')}
                  className="text-temple-700"
                />
              </div>
              <p className="text-[11px] text-stone-500 mt-1">Standard restaurant counter thermal printer (Epson, TVS, NGX)</p>
            </label>

            <label
              className={`p-4 rounded-xl border cursor-pointer text-xs transition ${
                thermalWidth === '58mm' ? 'border-temple-700 bg-cream-50 font-bold' : 'border-stone-200 hover:bg-stone-50'
              }`}
            >
              <div className="flex justify-between items-center">
                <span>58mm Compact Bluetooth Roll</span>
                <input
                  type="radio"
                  name="printerWidth"
                  checked={thermalWidth === '58mm'}
                  onChange={() => setThermalWidth('58mm')}
                  className="text-temple-700"
                />
              </div>
              <p className="text-[11px] text-stone-500 mt-1">Handheld billing printer (2-inch roll)</p>
            </label>
          </div>
        </div>

        <section className="space-y-4 pt-4 border-t border-stone-100">
          <h3 className="font-serif font-bold text-lg">Home Page Content</h3>
          <p className="text-sm text-stone-500">Edit English and Kannada text, images, and the highlighted dish. Dish names, prices, descriptions, and category records are managed in Menu &amp; Categories.</p>
          {[...new Set(homeContentFields.map(field => field.group))].map(group => (
            <details key={group} className="rounded-xl border border-stone-200 p-4">
              <summary className="font-bold cursor-pointer">{group}</summary>
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                {homeContentFields.filter(field => field.group === group).map(field => (
                  <label key={field.key} className="block space-y-1 text-xs font-semibold text-stone-700">
                    <span>{field.label}</span>
                    {field.key === 'special_menu_item_id' ? (
                      <select value={homeContent[field.key] || ''} onChange={e => setHomeContent(previous => ({ ...previous, [field.key]: e.target.value }))} className="w-full border border-stone-200 rounded-xl p-2 text-sm">
                        <option value="">First available featured dish</option>
                        {homeContent[field.key] && !homeMenuOptions.some(item => item.id === homeContent[field.key]) && <option value={homeContent[field.key]}>Currently selected dish (unavailable)</option>}
                        {homeMenuOptions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    ) : (
                      <textarea rows={field.kind === 'textarea' ? 4 : 2} value={homeContent[field.key] || ''} onChange={e => setHomeContent(previous => ({ ...previous, [field.key]: e.target.value }))} className="w-full border border-stone-200 rounded-xl p-2 text-sm font-normal" />
                    )}
                  </label>
                ))}
              </div>
            </details>
          ))}
        </section>

        {/* Account Security & Password */}
        <div className="space-y-4 pt-4 border-t border-stone-100">
          <h3 className="font-serif font-bold text-base text-stone-900 border-b border-stone-100 pb-2 flex items-center gap-2">
            <Key className="w-4 h-4 text-gold-600" />
            <span>Account Security & Access Credentials</span>
          </h3>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-cream-50/60 border border-gold-200">
            <div>
              <div className="font-bold text-sm text-stone-900">{user?.fullName}</div>
              <div className="text-xs text-stone-500">
                {user?.email} • Role: <strong className="text-temple-800">{user?.roles[0].replace('_', ' ')}</strong>
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Keep your login password updated to prevent unauthorized access to store orders and reports.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-temple-950 font-bold text-xs shadow-xs transition active:scale-95 shrink-0"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Change My Password</span>
            </button>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-temple-700 hover:bg-temple-800 text-white font-serif font-bold text-sm shadow-traditional transition active:scale-95"
          >
            <Save className="w-4 h-4 text-gold-400" />
            <span>{isSaving ? 'Saving…' : 'Save Operational Changes'}</span>
          </button>
        </div>
        </fieldset>
      </form>

      {/* Password Change Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
};
