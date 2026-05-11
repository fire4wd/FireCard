/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { getDebugLogs, addDebugLog, clearDebugLogs } from './lib/logger';
import DebugPanel from './components/DebugPanel';
import { 
  Plus, 
  Search, 
  CreditCard, 
  Camera, 
  Grid, 
  User as UserIcon, 
  Store, 
  Hammer, 
  UtensilsCrossed,
  HelpCircle,
  ArrowLeft,
  Moon,
  Sun,
  Upload,
  Flame as FlameIcon,
  Trash2,
  X,
  Download,
  Share2,
  Database,
  Briefcase,
  ShoppingBag,
  Truck,
  Music,
  Heart,
  Star,
  Coffee,
  GripVertical
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { BusinessCard, Category, DEFAULT_CATEGORIES } from './types';
import Scanner from './components/Scanner';
import CardList from './components/CardList';
import CardDetails from './components/CardDetails';
import { localStore } from './lib/storage';
import SplashScreen from './components/SplashScreen';
import CategoryManager from './components/CategoryManager';
import BackupManager from './components/BackupManager';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'home' | 'scanner' | 'details' | 'categories' | 'backup'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [cards, setCards] = useState<BusinessCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<BusinessCard | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [pendingUpload, setPendingUpload] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [logs, setLogs] = useState(() => getDebugLogs());
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  const handleDownloadBackup = () => {
    try {
      addDebugLog("Generazione file di backup...");
      const data = {
        cards,
        categories: customCategories,
        exportDate: new Date().toISOString(),
        version: "1.1",
        app: "FireCard"
      };
      
      const json = JSON.stringify(data, null, 2);
      const filename = `firecard_backup_${new Date().toISOString().split('T')[0]}.json`;
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      addDebugLog("Backup salvato nel dispositivo");
    } catch (err) {
      console.error("Errore download:", err);
      addDebugLog("Impossibile generare il file di backup", 'error');
    }
  };

  const handleShareBackup = async () => {
    try {
      addDebugLog("Preparazione file per la condivisione...");
      const data = {
        cards,
        categories: customCategories,
        exportDate: new Date().toISOString(),
        version: "1.1",
        app: "FireCard"
      };
      
      const json = JSON.stringify(data, null, 2);
      const filename = `firecard_backup.json`;

      if (navigator.share && navigator.canShare) {
        const file = new File([json], filename, { type: 'application/json' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'FireCard Backup',
            text: `Backup completo: ${cards.length} biglietti e ${customCategories.length} categorie.`
          });
          addDebugLog("Menu di condivisione aperto");
        } else {
          addDebugLog("Il dispositivo non supporta la condivisione di questo file", 'error');
          handleDownloadBackup();
        }
      } else {
        addDebugLog("Condivisione non supportata, avvio download...");
        handleDownloadBackup();
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error("Errore condivisione:", err);
      addDebugLog(`Errore: ${err.message}`, 'error');
      handleDownloadBackup();
    }
  };

  const refreshData = async () => {
    const [newCards, newCats] = await Promise.all([
      localStore.getCards(),
      localStore.getCategories()
    ]);
    setCards(newCards);
    setCustomCategories(newCats);
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    addDebugLog("App: Sistema avviato in modalità locale", 'info');
    
    const initData = async () => {
        try {
            const [storedCards, storedCategories] = await Promise.all([
                localStore.getCards(),
                localStore.getCategories()
            ]);
            setCards(storedCards);
            
              if (storedCategories.length === 0) {
              // Seme iniziale categorie se vuoto
              const defaultIcons: Record<string, string> = {
                'Persona': 'User',
                'Negozio': 'Store',
                'Artigiano': 'Hammer',
                'Ristorante': 'Utensils'
              };
              const initialCats: Category[] = DEFAULT_CATEGORIES.map((name, index) => ({
                id: `default-${name}`,
                name,
                icon: defaultIcons[name] || 'HelpCircle',
                order: index,
                createdAt: new Date().toISOString()
              }));
              for (const cat of initialCats) {
                await localStore.saveCategory(cat);
              }
              setCustomCategories(initialCats);
            } else {
              setCustomCategories(storedCategories);
            }
        } catch (err) {
            console.error("Errore inizializzazione dati:", err);
            addDebugLog("Errore inizializzazione dati", 'error');
        } finally {
            setLoading(false);
        }
    };

    initData();
  }, []);

  useEffect(() => {
    const handleLogUpdate = () => {
      setLogs(getDebugLogs());
    };
    window.addEventListener('firecard-debug-log-sync', handleLogUpdate);
    window.addEventListener('firecard-debug-clear', () => {
      clearDebugLogs();
    });
    setLogs(getDebugLogs());
    return () => window.removeEventListener('firecard-debug-log-sync', handleLogUpdate);
  }, []);

  const [sortedCustomCategories, setSortedCustomCategories] = useState<Category[]>([]);

  useEffect(() => {
    setSortedCustomCategories([...customCategories].sort((a, b) => (a.order || 0) - (b.order || 0)));
  }, [customCategories]);

  const allCategories = sortedCustomCategories.map(c => c.name);

  const filteredCards = cards.filter(card => {
    const searchLower = searchQuery.toLowerCase();
    const date = new Date(card.createdAt);
    const year = date.getFullYear().toString();
    const monthNames = [
      'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
      'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
    ];
    const month = monthNames[date.getMonth()];
    
    const matchesSearch = 
      card.name.toLowerCase().includes(searchLower) ||
      card.company?.toLowerCase().includes(searchLower) ||
      card.title?.toLowerCase().includes(searchLower) ||
      card.category.toLowerCase().includes(searchLower) ||
      year.includes(searchLower) ||
      month.includes(searchLower);
    
    const matchesCategory = activeCategory ? card.category === activeCategory : true;
    
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (categoryName: string) => {
    // Prima cerco tra le predefinite
    switch (categoryName) {
      case 'Persona': return <UserIcon className="w-4 h-4" />;
      case 'Negozio': return <Store className="w-4 h-4" />;
      case 'Artigiano': return <Hammer className="w-4 h-4" />;
      case 'Ristorante': return <UtensilsCrossed className="w-4 h-4" />;
    }

    // Poi cerco tra le personalizzate
    const custom = customCategories.find(c => c.name === categoryName);
    if (custom?.icon) {
      switch (custom.icon) {
        case 'Briefcase': return <Briefcase className="w-4 h-4" />;
        case 'ShoppingBag': return <ShoppingBag className="w-4 h-4" />;
        case 'Truck': return <Truck className="w-4 h-4" />;
        case 'Music': return <Music className="w-4 h-4" />;
        case 'Heart': return <Heart className="w-4 h-4" />;
        case 'Star': return <Star className="w-4 h-4" />;
        case 'Coffee': return <Coffee className="w-4 h-4" />;
        case 'User': return <UserIcon className="w-4 h-4" />;
        case 'Store': return <Store className="w-4 h-4" />;
        case 'Hammer': return <Hammer className="w-4 h-4" />;
        case 'Utensils': return <UtensilsCrossed className="w-4 h-4" />;
      }
    }

    return <HelpCircle className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] dark:bg-[#0F0F0E] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#5A5A40] dark:border-[#A0A080] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#F5F5F0] dark:bg-[#0F0F0E] pb-24 transition-colors duration-300`}>
      <AnimatePresence>
        {showSplash && (
          <SplashScreen onFinish={() => setShowSplash(false)} />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="p-6 pb-2">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FlameIcon className="w-5 h-5 text-orange-500" />
              <span className="font-serif font-bold text-sm tracking-widest uppercase text-[#5A5A40]/60 dark:text-[#A0A080]/60">FireCard</span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#1A1A1A] dark:text-[#F5F5F0]">I tuoi biglietti</h1>
            <p className="text-sm text-[#5A5A40]/60 dark:text-[#A0A080]/60">{cards.length} salvati localmente</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setView('backup')}
              title="Gestione Backup"
              className="p-3 bg-white dark:bg-[#1C1C1A] rounded-2xl shadow-sm text-orange-500 dark:text-orange-400 active:scale-95 transition-all"
            >
              <Database className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setView('categories')}
              className="px-4 py-2 bg-white dark:bg-[#1C1C1A] border border-dashed border-[#5A5A40]/30 dark:border-[#A0A080]/30 rounded-2xl whitespace-nowrap text-xs font-bold uppercase tracking-wider text-[#5A5A40] dark:text-[#A0A080] active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Categorie
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        {view === 'home' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5A5A40]/40 dark:text-[#A0A080]/40" />
              <input 
                type="text" 
                placeholder="Cerca per nome, azienda..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-4 pl-12 pr-4 bg-white dark:bg-[#1C1C1A] text-[#1A1A1A] dark:text-[#F5F5F0] rounded-2xl border-none outline-none shadow-sm shadow-[#5A5A40]/5 font-medium placeholder-[#5A5A40]/30 dark:placeholder-[#A0A080]/30"
              />
            </div>
            
            <div className="flex overflow-x-auto pb-4 gap-2 scrollbar-none snap-x h-12">
              <button 
                onClick={() => setActiveCategory(null)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap text-xs font-bold uppercase tracking-wider transition-all active:scale-95 snap-start shrink-0 ${!activeCategory ? 'bg-[#5A5A40] dark:bg-[#A0A080] text-white dark:text-[#0F0F0E] shadow-lg shadow-[#5A5A40]/20' : 'bg-white dark:bg-[#1C1C1A] text-[#5A5A40] dark:text-[#A0A080] border border-[#5A5A40]/10 dark:border-[#A0A080]/10'}`}
              >
                <Grid className="w-3.5 h-3.5" />
                {activeCategory !== null && <span>Tutti</span>}
                <span className="opacity-60">({cards.length})</span>
              </button>
              {allCategories.map(cat => {
                const count = cards.filter(c => c.category === cat).length;
                return (
                  <button 
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap text-xs font-bold uppercase tracking-wider transition-all active:scale-95 snap-start shrink-0 ${activeCategory === cat ? 'bg-[#5A5A40] dark:bg-[#A0A080] text-white dark:text-[#0F0F0E] shadow-lg shadow-[#5A5A40]/20' : 'bg-white dark:bg-[#1C1C1A] text-[#5A5A40] dark:text-[#A0A080] border border-[#5A5A40]/10 dark:border-[#A0A080]/10'}`}
                  >
                    {getCategoryIcon(cat)}
                    {activeCategory !== null && <span>{cat}</span>}
                    {count > 0 && <span className="opacity-60">({count})</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="px-6">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <CardList 
                cards={filteredCards} 
                getCategoryIcon={getCategoryIcon}
                onSelect={(card) => {
                  setSelectedCard(card);
                  setView('details');
                }} 
              />
            </motion.div>
          )}

          {view === 'scanner' && (
            <motion.div
              key="scanner"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <Scanner 
                initialImage={pendingUpload}
                onClose={() => {
                  setView('home');
                  setPendingUpload(null);
                }} 
                onComplete={(card) => {
                  setCards(prev => [card, ...prev]);
                  setSelectedCard(card);
                  setPendingUpload(null);
                  setView('details');
                }}
              />
            </motion.div>
          )}

          {view === 'details' && selectedCard && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <CardDetails 
                card={selectedCard} 
                categories={allCategories}
                getCategoryIcon={getCategoryIcon}
                onBack={() => setView('home')}
                onDelete={(id) => {
                  setCards(prev => prev.filter(c => c.id !== id));
                  setView('home');
                }}
                onUpdate={(updated) => {
                  setSelectedCard(updated);
                  setCards(prev => prev.map(c => c.id === updated.id ? updated : c));
                }}
              />
            </motion.div>
          )}

          {view === 'categories' && (
            <motion.div
              key="categories"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <CategoryManager 
                cards={cards}
                customCategories={customCategories}
                onBack={() => setView('home')}
                onUpdateCategories={setCustomCategories}
                onUpdateCards={setCards}
              />
            </motion.div>
          )}

          {view === 'backup' && (
            <motion.div
              key="backup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <BackupManager 
                cards={cards}
                customCategories={customCategories}
                onBack={() => setView('home')}
                onRefreshData={refreshData}
                handleDownloadBackup={handleDownloadBackup}
                handleShareBackup={handleShareBackup}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showDebug && (
          <DebugPanel 
            logs={logs} 
            onHide={() => setShowDebug(false)} 
            cardCount={cards.length}
            catCount={customCategories.length}
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-24 right-4 pointer-events-none opacity-20 hover:opacity-100 transition-opacity">
        <button 
          onClick={() => setShowDebug(true)}
          className="p-2 pointer-events-auto text-[8px] bg-black/50 text-white rounded px-2"
        >
          SYSTEM_CONSOLE
        </button>
      </div>

      {/* FAB Group */}
      {view === 'home' && (
        <div className="fixed bottom-8 right-8 flex flex-col gap-4 items-end z-50">
          <motion.button 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={() => {
              setPendingUpload(null);
              setView('scanner');
            }}
            className="w-16 h-16 bg-[#1A1A1A] dark:bg-[#A0A080] text-white dark:text-[#0F0F0E] rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform"
          >
            <Camera className="w-8 h-8" />
          </motion.button>
          
          <motion.button 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (rv) => {
                    setPendingUpload(rv.target?.result as string);
                    setView('scanner');
                  };
                  reader.readAsDataURL(file);
                }
              };
              input.click();
            }}
            className="w-12 h-12 bg-white dark:bg-[#1C1C1A] text-[#1A1A1A] dark:text-[#F5F5F0] rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform"
          >
            <Upload className="w-6 h-6" />
          </motion.button>
        </div>
      )}
    </div>
  );
}
