import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { store } from '../../services/store';
import { MenuItem, Category } from '../../types';
import { PermissionGuard } from '../../components/auth/PermissionGuard';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  Sparkles, 
  Clock, 
  UtensilsCrossed,
  Image,
  AlertCircle
} from 'lucide-react';

export const AdminMenuPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { language } = useLanguage();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [nameKn, setNameKn] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionKn, setDescriptionKn] = useState('');
  const [price, setPrice] = useState<number>(40);
  const [imageUrl, setImageUrl] = useState('');
  const [prepTime, setPrepTime] = useState<number>(10);
  const [featured, setFeatured] = useState(false);
  const [available, setAvailable] = useState(true);

  const loadData = () => {
    setMenuItems(store.getMenuItems());
    setCategories(store.getCategories());
  };

  useEffect(() => {
    loadData();
    const unsub = store.subscribe(() => loadData());
    return unsub;
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setName('');
    setNameKn('');
    setCategoryId(categories[0]?.id || '');
    setDescription('');
    setDescriptionKn('');
    setPrice(40);
    setImageUrl('https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80');
    setPrepTime(10);
    setFeatured(false);
    setAvailable(true);
    setIsModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setNameKn(item.nameKn);
    setCategoryId(item.categoryId);
    setDescription(item.description);
    setDescriptionKn(item.descriptionKn);
    setPrice(item.price);
    setImageUrl(item.imageUrl);
    setPrepTime(item.preparationTimeMinutes);
    setFeatured(item.featured);
    setAvailable(item.available);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !nameKn.trim()) {
      alert('Please enter both English and Kannada dish names.');
      return;
    }

    const actorName = user?.fullName || 'Manager';
    const itemData: MenuItem = {
      id: editingItem ? editingItem.id : `item-${Date.now()}`,
      categoryId,
      name: name.trim(),
      nameKn: nameKn.trim(),
      description: description.trim(),
      descriptionKn: descriptionKn.trim(),
      price: Number(price),
      imageUrl: imageUrl.trim() || 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
      isVeg: true,
      available,
      featured,
      preparationTimeMinutes: Number(prepTime),
    };

    store.saveMenuItem(itemData, actorName);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, itemName: string) => {
    if (!confirm(`Are you sure you want to delete "${itemName}" from the menu?`)) return;
    const actorName = user?.fullName || 'Manager';
    store.deleteMenuItem(id, actorName);
  };

  const handleToggleAvailability = (item: MenuItem) => {
    const actorName = user?.fullName || 'Manager';
    store.toggleItemAvailability(item.id, !item.available, actorName);
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto pb-28">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h1 className="font-serif font-black text-3xl text-stone-900">
            Menu & Price Management
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-0.5">
            Configure Sakleshpur dishes, bilingual Kannada descriptions, prices, and live availability
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-temple-700 hover:bg-temple-800 text-white font-bold text-xs sm:text-sm shadow-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4 text-gold-400" />
          <span>Add New Dish</span>
        </button>
      </div>

      {/* Menu Items Table / Grid */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-600">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-800 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4">Dish</th>
                <th className="p-4">Kannada Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price (INR)</th>
                <th className="p-4">Stock Status</th>
                <th className="p-4">Special</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {menuItems.map((item) => {
                const category = categories.find(c => c.id === item.categoryId);

                return (
                  <tr key={item.id} className="hover:bg-cream-50/50 transition">
                    {/* Dish with image */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-cover border border-stone-200 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-stone-900 text-sm">{item.name}</div>
                          <div className="text-[11px] text-stone-500 line-clamp-1 max-w-xs">
                            {item.description}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Kannada Name */}
                    <td className="p-4 font-semibold text-stone-800 text-sm">
                      {item.nameKn}
                    </td>

                    {/* Category */}
                    <td className="p-4 font-medium text-stone-600">
                      {category ? category.name : '—'}
                    </td>

                    {/* Price */}
                    <td className="p-4 font-mono font-bold text-temple-800 text-sm">
                      ₹{item.price}
                    </td>

                    {/* Availability Toggle */}
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleAvailability(item)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition flex items-center gap-1 ${
                          item.available
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${item.available ? 'bg-green-600' : 'bg-red-600'}`} />
                        <span>{item.available ? 'Available' : 'Sold Out'}</span>
                      </button>
                    </td>

                    {/* Special */}
                    <td className="p-4">
                      {item.featured ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gold-800 bg-gold-100 px-2 py-0.5 rounded-full">
                          <Sparkles className="w-3 h-3 text-gold-600" />
                          <span>Special</span>
                        </span>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right space-x-1">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 text-stone-600 hover:text-temple-700 hover:bg-stone-100 rounded-lg transition"
                        title="Edit Dish"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete Dish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto border border-gold-300">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h2 className="font-serif font-bold text-xl text-stone-900">
                {editingItem ? 'Edit Dish Details' : 'Add New Sakleshpur Dish'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    English Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Thatte Idli"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Kannada Name (ಕನ್ನಡ) *
                  </label>
                  <input
                    type="text"
                    required
                    value={nameKn}
                    onChange={(e) => setNameKn(e.target.value)}
                    placeholder="ಉದಾ: ತಟ್ಟೆ ಇಡ್ಲಿ"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Category *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.nameKn})
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Field (RBAC Protected: menu.manage_price) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Price in INR (₹) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    required
                    value={price}
                    disabled={!hasPermission('menu.manage_price')}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 font-mono disabled:bg-stone-100"
                  />
                  {!hasPermission('menu.manage_price') && (
                    <span className="text-[10px] text-red-500">Requires price change permission</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Prep Time (Mins)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={prepTime}
                    onChange={(e) => setPrepTime(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Food Image URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  English Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe authentic preparation style, accompaniment chutneys, etc."
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Kannada Description (ಕನ್ನಡ ವಿವರಣೆ)
                </label>
                <textarea
                  rows={2}
                  value={descriptionKn}
                  onChange={(e) => setDescriptionKn(e.target.value)}
                  placeholder="ಉದಾಹರಣೆಗೆ: ತಾಜಾ ಬೆಣ್ಣೆ ಮತ್ತು ಕೆಂಪು ಚಟ್ನಿ ಜೊತೆಗೆ..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-800">
                  <input
                    type="checkbox"
                    checked={available}
                    onChange={(e) => setAvailable(e.target.checked)}
                    className="w-4 h-4 text-temple-700 rounded"
                  />
                  <span>Available for Orders</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-800">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="w-4 h-4 text-gold-600 rounded"
                  />
                  <span>Today's Special</span>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-stone-600 hover:text-stone-800 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-temple-700 hover:bg-temple-800 text-white font-bold text-xs shadow-sm transition active:scale-95"
                >
                  Save Dish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
