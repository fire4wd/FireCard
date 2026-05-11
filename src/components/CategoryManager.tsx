import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  X, 
  GripVertical,
  HelpCircle,
  User as UserIcon,
  Store,
  Hammer,
  UtensilsCrossed,
  Briefcase,
  ShoppingBag,
  Truck,
  Music,
  Heart,
  Star,
  Coffee
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { Category, BusinessCard } from '../types';
import { localStore } from '../lib/storage';
import { addDebugLog } from '../lib/logger';

interface CategoryManagerProps {
  cards: BusinessCard[];
  customCategories: Category[];
  onBack: () => void;
  onUpdateCategories: (newCats: Category[]) => void;
  onUpdateCards: (newCards: BusinessCard[]) => void;
}

const AVAILABLE_ICONS = [
  { name: 'HelpCircle', component: <HelpCircle className="w-4 h-4" /> },
  { name: 'User', component: <UserIcon className="w-4 h-4" /> },
  { name: 'Briefcase', component: <Briefcase className="w-4 h-4" /> },
  { name: 'ShoppingBag', component: <ShoppingBag className="w-4 h-4" /> },
  { name: 'Truck', component: <Truck className="w-4 h-4" /> },
  { name: 'Music', component: <Music className="w-4 h-4" /> },
  { name: 'Heart', component: <Heart className="w-4 h-4" /> },
  { name: 'Star', component: <Star className="w-4 h-4" /> },
  { name: 'Coffee', component: <Coffee className="w-4 h-4" /> },
  { name: 'Store', component: <Store className="w-4 h-4" /> },
  { name: 'Hammer', component: <Hammer className="w-4 h-4" /> },
  { name: 'Utensils', component: <UtensilsCrossed className="w-4 h-4" /> },
];

export default function CategoryManager({ 
  cards, 
  customCategories, 
  onBack, 
  onUpdateCategories, 
  onUpdateCards 
}: CategoryManagerProps) {
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [reassignTo, setReassignTo] = useState<string>("Altro");
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState("HelpCircle");

  const sortedCategories = [...customCategories].sort((a, b) => (a.order || 0) - (b.order || 0));
  const allCategoryNames = sortedCategories.map(c => c.name);

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName) {
      case 'Persona': return <UserIcon className="w-4 h-4" />;
      case 'Negozio': return <Store className="w-4 h-4" />;
      case 'Artigiano': return <Hammer className="w-4 h-4" />;
      case 'Ristorante': return <UtensilsCrossed className="w-4 h-4" />;
    }

    const custom = customCategories.find(c => c.name === categoryName);
    if (custom?.icon) {
      const found = AVAILABLE_ICONS.find(i => i.name === custom.icon);
      return found ? found.component : <HelpCircle className="w-4 h-4" />;
    }
    return <HelpCircle className="w-4 h-4" />;
  };

  const handleReorder = async (newOrder: Category[]) => {
    const updated = newOrder.map((cat, index) => ({ ...cat, order: index }));
    onUpdateCategories(updated);
    for (const cat of updated) {
      await localStore.saveCategory(cat);
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    
    try {
      const categoryName = categoryToDelete.name;
      const targetCategory = reassignTo || "Altro";
      addDebugLog(`Eliminazione categoria: ${categoryName} -> ${targetCategory}`);

      const updatedCards = cards.map((c) => {
        if (c.category === categoryName) {
          const updated = { ...c, category: targetCategory };
          localStore.saveCard(updated);
          return updated;
        }
        return c;
      });
      onUpdateCards(updatedCards);

      await localStore.deleteCategory(categoryToDelete.id);
      onUpdateCategories(customCategories.filter(c => c.id !== categoryToDelete.id));

      setCategoryToDelete(null);
    } catch (err) {
      console.error("Errore cancellazione categoria:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem('categoryName') as HTMLInputElement).value;
    if (!name) return;
    
    const newId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2);
    const newCat: Category = {
        id: newId,
        name,
        icon: selectedIcon,
        order: customCategories.length,
        createdAt: new Date().toISOString()
    };

    await localStore.saveCategory(newCat);
    onUpdateCategories([...customCategories, newCat]);
    form.reset();
    setSelectedIcon("HelpCircle");
    addDebugLog(`Categoria "${name}" creata localmente`);
  };

  return (
    <div className="bg-white dark:bg-[#1C1C1A] rounded-[32px] p-6 shadow-sm">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 -ml-2">
          <ArrowLeft className="w-6 h-6 text-[#1A1A1A] dark:text-[#F5F5F0]" />
        </button>
        <h2 className="text-xl font-serif font-bold dark:text-[#F5F5F0]">Gestisci Categorie</h2>
      </div>
      
      <div className="space-y-4">
        <div className="pt-4 text-sm font-bold text-[#5A5A40]/40 dark:text-[#A0A080]/40 uppercase tracking-widest flex justify-between items-center">
          <span>Tutte le Categorie</span>
          <span className="text-[10px] lowercase italic font-normal">(Trascina per riordinare)</span>
        </div>
        
        <Reorder.Group axis="y" values={sortedCategories} onReorder={handleReorder} className="space-y-2">
          {sortedCategories.map(cat => (
            <Reorder.Item 
              key={cat.id} 
              value={cat}
              className="flex items-center justify-between p-4 bg-[#F5F5F0] dark:bg-[#0F0F0E] rounded-2xl group active:shadow-lg active:scale-[1.02] transition-all cursor-grab"
            >
              <div className="flex items-center gap-3 text-[#1A1A1A] dark:text-[#F5F5F0]">
                <GripVertical className="w-4 h-4 opacity-20" />
                {getCategoryIcon(cat.name)}
                <span className="font-medium">{cat.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs opacity-40">({cards.filter(c => c.category === cat.name).length})</span>
                <button 
                  onClick={() => {
                    setReassignTo("Altro");
                    setCategoryToDelete(cat);
                  }}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        <form onSubmit={handleAdd} className="space-y-4 pt-4 border-t border-[#5A5A40]/10 dark:border-[#A0A080]/10">
          <div className="flex gap-2">
            <input 
              name="categoryName"
              type="text" 
              placeholder="Nuova categoria..."
              className="flex-1 py-4 px-4 bg-[#F5F5F0] dark:bg-[#0F0F0E] text-[#1A1A1A] dark:text-[#F5F5F0] rounded-2xl border-none outline-none font-medium"
              required
            />
            <button className="px-6 bg-[#1A1A1A] dark:bg-[#A0A080] text-white dark:text-[#0F0F0E] rounded-2xl active:scale-95 transition-transform">
              <Plus className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_ICONS.map(icon => (
              <button
                key={icon.name}
                type="button"
                onClick={() => setSelectedIcon(icon.name)}
                className={`p-3 rounded-xl transition-all ${
                  selectedIcon === icon.name 
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                  : 'bg-[#F5F5F0] dark:bg-[#0F0F0E] text-[#5A5A40] dark:text-[#A0A080]'
                }`}
              >
                {icon.component}
              </button>
            ))}
          </div>
        </form>
      </div>

      <AnimatePresence>
        {categoryToDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-6 backdrop-blur-sm bg-black/40"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#1C1C1A] rounded-[32px] p-8 max-w-sm w-full shadow-2xl border border-[#5A5A40]/10 dark:border-[#A0A080]/10"
            >
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold dark:text-white">Elimina Categoria</h3>
                  <button onClick={() => setCategoryToDelete(null)} className="p-2">
                  <X className="w-5 h-5 opacity-40" />
                  </button>
              </div>

              <p className="text-sm text-[#5A5A40]/60 dark:text-[#A0A080]/60 mb-6">
                Vuoi eliminare "<span className="font-bold text-[#1A1A1A] dark:text-white">{categoryToDelete.name}</span>"?
                <br />Scegli dove spostare i biglietti contenuti:
              </p>

              <div className="space-y-2 mb-8 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                <button 
                  onClick={() => setReassignTo("Altro")}
                  className={`w-full p-4 rounded-2xl text-left text-sm font-medium transition-all ${reassignTo === "Altro" || !reassignTo ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-[#F5F5F0] dark:bg-[#0F0F0E] dark:text-white border border-transparent'}`}
                >
                  Altro (Default)
                </button>
                {allCategoryNames.filter(name => name !== categoryToDelete.name && name !== "Altro").map(name => (
                  <button 
                    key={name}
                    onClick={() => setReassignTo(name)}
                    className={`w-full p-4 rounded-2xl text-left text-sm font-medium transition-all ${reassignTo === name ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-[#F5F5F0] dark:bg-[#0F0F0E] dark:text-white border border-transparent'}`}
                  >
                    {name}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setCategoryToDelete(null)}
                  className="flex-1 py-4 text-xs font-bold uppercase tracking-widest text-[#5A5A40] dark:text-[#A0A080]"
                >
                  Annulla
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isDeleting ? 'Eliminazione...' : 'Conferma'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
