import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { store } from '../../services/store';
import { Category } from '../../types';
import { Plus, Edit, FolderTree, X } from 'lucide-react';

export const AdminCategoriesPage: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguage();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const [name, setName] = useState('');
  const [nameKn, setNameKn] = useState('');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [active, setActive] = useState(true);

  const loadData = () => {
    setCategories(store.getCategories().sort((a, b) => a.displayOrder - b.displayOrder));
  };

  useEffect(() => {
    loadData();
    const unsub = store.subscribe(() => loadData());
    return unsub;
  }, []);

  const openAddModal = () => {
    setEditingCat(null);
    setName('');
    setNameKn('');
    setDescription('');
    setDisplayOrder(categories.length + 1);
    setActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCat(cat);
    setName(cat.name);
    setNameKn(cat.nameKn);
    setDescription(cat.description || '');
    setDisplayOrder(cat.displayOrder);
    setActive(cat.active);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !nameKn.trim()) {
      alert('Please enter both English and Kannada category names.');
      return;
    }

    const catData: Category = {
      id: editingCat ? editingCat.id : `cat-${Date.now()}`,
      name: name.trim(),
      nameKn: nameKn.trim(),
      description: description.trim(),
      displayOrder: Number(displayOrder),
      active,
    };

    const actorName = user?.fullName || 'Manager';
    store.saveCategory(catData, actorName);
    setIsModalOpen(false);
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-5xl mx-auto pb-28">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h1 className="font-serif font-black text-3xl text-stone-900">
            Category Management
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-0.5">
            Organize offerings into South Indian tiffin categories with English & Kannada naming
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-temple-700 hover:bg-temple-800 text-white font-bold text-xs sm:text-sm shadow-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4 text-gold-400" />
          <span>Add Category</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs text-stone-600">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-800 font-bold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="p-4 w-16">Order</th>
              <th className="p-4">Category Name</th>
              <th className="p-4">Kannada Name</th>
              <th className="p-4">Description</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-cream-50/50 transition">
                <td className="p-4 font-mono font-bold text-stone-900">
                  #{cat.displayOrder}
                </td>
                <td className="p-4 font-bold text-stone-900 text-sm">
                  {cat.name}
                </td>
                <td className="p-4 font-semibold text-stone-800 text-sm">
                  {cat.nameKn}
                </td>
                <td className="p-4 text-stone-500 max-w-sm line-clamp-1">
                  {cat.description || '—'}
                </td>
                <td className="p-4">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      cat.active ? 'bg-green-100 text-green-800' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {cat.active ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => openEditModal(cat)}
                    className="p-1.5 text-stone-600 hover:text-temple-700 hover:bg-stone-100 rounded-lg transition"
                    title="Edit Category"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-gold-300">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h2 className="font-serif font-bold text-xl text-stone-900">
                {editingCat ? 'Edit Category' : 'Create Category'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Category Name (English) *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Idli & Vade"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Kannada Name (ಕನ್ನಡ ಹೆಸರು) *
                </label>
                <input
                  type="text"
                  required
                  value={nameKn}
                  onChange={(e) => setNameKn(e.target.value)}
                  placeholder="ಉದಾ: ಇಡ್ಲಿ ಮತ್ತು ವಡೆ"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  min={1}
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-800">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="w-4 h-4 text-temple-700 rounded"
                  />
                  <span>Active in Customer Menu</span>
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
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
