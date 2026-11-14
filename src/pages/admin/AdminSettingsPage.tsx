import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { store } from '../../services/store';
import { Settings, Save, Check, Printer, Building2, Store } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const { user } = useAuth();

  const [restaurantName, setRestaurantName] = useState('Datta Prasada');
  const [tagline, setTagline] = useState('Authentic Sakleshpur Taste in Bangalore');
  const [taglineKn, setTaglineKn] = useState('ಬೆಂಗಳೂರಿನಲ್ಲಿ ಸಕಲೇಶಪುರದ ಅಸಲಿ ರುಚಿ');
  const [address, setAddress] = useState('Balagere Main Road, Near Panathur Railway Bridge, Bangalore - 560087');
  const [phone, setPhone] = useState('+91 98450 12345');
  const [upiVpa, setUpiVpa] = useState('dattaprasada@icici');
  const [tokenPrefix, setTokenPrefix] = useState('DP-');
  const [gstRate, setGstRate] = useState(5);
  const [thermalWidth, setThermalWidth] = useState<'80mm' | '58mm'>('80mm');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    store.addAuditLog({
      actorName: user?.fullName || 'Manager',
      actorRole: user?.roles[0],
      action: 'SETTINGS_UPDATED',
      entityType: 'SETTING',
      entityId: 'outlet-balagere-config',
      newValues: {
        restaurantName,
        upiVpa,
        tokenPrefix,
        gstRate,
        thermalWidth,
      },
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
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

      {isSaved && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600" />
          <span>Operational settings updated and committed successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm">
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

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-temple-700 hover:bg-temple-800 text-white font-serif font-bold text-sm shadow-traditional transition active:scale-95"
          >
            <Save className="w-4 h-4 text-gold-400" />
            <span>Save Operational Changes</span>
          </button>
        </div>
      </form>
    </div>
  );
};
