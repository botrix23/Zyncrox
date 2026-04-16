"use client";

import { useState } from "react";
import { Plus, Search, Tag, Trash2, X, Edit2 } from 'lucide-react';
import { Portal } from "@/components/Portal";
import { createCategoryAction, updateCategoryAction, deleteCategoryAction } from "@/app/actions/categories";
import { useRouter } from "next/navigation";

const PRESET_COLORS = [
  '#8b5cf6', '#ec4899', '#10b981', '#f59e0b',
  '#3b82f6', '#ef4444', '#14b8a6', '#f97316',
  '#6366f1', '#84cc16', '#06b6d4', '#a855f7',
];

type Category = { id: string; name: string; color: string; tenantId: string; createdAt: Date };

export default function CategoriesClient({
  initialCategories,
  tenantId,
}: {
  initialCategories: Category[];
  tenantId: string;
}) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", color: '#8b5cf6' });

  const filtered = initialCategories.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat);
      setFormData({ name: cat.name, color: cat.color });
    } else {
      setEditingCategory(null);
      setFormData({ name: "", color: '#8b5cf6' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setIsLoading(true);

    const result = editingCategory
      ? await updateCategoryAction({ id: editingCategory.id, tenantId, ...formData })
      : await createCategoryAction({ tenantId, ...formData });

    if (result.success) {
      setIsModalOpen(false);
      router.refresh();
    } else {
      alert("Error al guardar la categoría");
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta categoría? Se desvinculará de todos los servicios y personal asociados.")) return;
    const result = await deleteCategoryAction(id, tenantId);
    if (result.success) router.refresh();
    else alert("Error al eliminar la categoría");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Categorías</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">Etiquetas de especialidad para servicios y personal.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-sm font-bold shadow-xl shadow-purple-500/20 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nueva categoría
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar categoría..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-slate-900 dark:text-white outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-400 shadow-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-zinc-600">
          <Tag className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-sm font-black uppercase tracking-widest">Sin categorías</p>
          <p className="text-xs mt-2 text-slate-400">Crea categorías para organizar tu equipo y servicios.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(cat => (
            <div
              key={cat.id}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl p-5 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: cat.color + '22', color: cat.color }}
                >
                  <Tag className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 dark:text-white truncate">{cat.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-xs text-slate-400 font-mono">{cat.color}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleOpenModal(cat)}
                  className="p-2.5 text-slate-400 hover:text-purple-600 hover:bg-purple-500/5 rounded-xl transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-500/5 rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)} />
            <div className="relative z-10 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5">
                <h3 className="text-xl font-black tracking-tight">
                  {editingCategory ? "Editar categoría" : "Nueva categoría"}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">Nombre</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Uñas, Cabello, Masajes..."
                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm font-medium"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-xl transition-all ${formData.color === color ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-zinc-900 scale-110' : 'hover:scale-105'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="w-8 h-8 rounded-xl shrink-0" style={{ backgroundColor: formData.color }} />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={e => setFormData({ ...formData, color: e.target.value })}
                      className="flex-1 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="#8b5cf6"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center text-sm"
                  >
                    {isLoading
                      ? <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                      : (editingCategory ? "Guardar cambios" : "Crear categoría")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
