import React from 'react';
import { Share2, Download, Database, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { BusinessCard, Category } from '../types';
import { addDebugLog } from '../lib/logger';
import { localStore } from '../lib/storage';

interface BackupManagerProps {
  cards: BusinessCard[];
  customCategories: Category[];
  onBack: () => void;
  onRefreshData: () => void;
  handleDownloadBackup: () => void;
  handleShareBackup: () => void;
}

export default function BackupManager({ 
  cards, 
  customCategories, 
  onBack, 
  onRefreshData,
  handleDownloadBackup,
  handleShareBackup
}: BackupManagerProps) {

  const importBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      addDebugLog(`Inizio importazione: ${file.name}`);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          
          if (!data.cards || !Array.isArray(data.cards)) {
             throw new Error("Formato file non valido");
          }

          if (data.categories) {
            for (const cat of data.categories) {
              await localStore.saveCategory(cat);
            }
          }

          for (const card of data.cards) {
            await localStore.saveCard(card);
          }

          onRefreshData();
          addDebugLog(`Importazione completata: ${data.cards.length} biglietti aggiunti`);
          alert(`Importazione completata con successo! ${data.cards.length} biglietti caricati.`);
        } catch (err) {
          console.error("Errore parsing backup:", err);
          alert("Impossibile caricare il backup. Verifica che il file sia un JSON FireCard valido.");
        }
      };
      reader.readAsText(file);
    } catch (err) {
      console.error("Errore lettura file:", err);
    }
  };

  return (
    <div className="bg-white dark:bg-[#1C1C1A] rounded-[32px] p-8 shadow-sm">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 -ml-2">
          <ArrowLeft className="w-6 h-6 text-[#1A1A1A] dark:text-[#F5F5F0]" />
        </button>
        <h2 className="text-xl font-serif font-bold dark:text-[#F5F5F0]">Gestione Backup</h2>
      </div>

      <div className="space-y-6">
        <div className="p-6 bg-[#F5F5F0] dark:bg-[#0F0F0E] rounded-[24px] border border-[#5A5A40]/5">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#5A5A40]/40 mb-4">Esportazione</h3>
          <p className="text-sm text-[#5A5A40] dark:text-[#A0A080] mb-6">
            Salva tutti i tuoi biglietti, le scansioni fronte/retro e le tue categorie in un unico file sicuro.
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={handleShareBackup}
              className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
            >
              <Share2 className="w-5 h-5" />
              Condividi Backup
            </button>
            <button 
              onClick={handleDownloadBackup}
              className="w-full py-4 bg-white dark:bg-[#1C1C1A] text-[#1A1A1A] dark:text-[#F5F5F0] border border-[#5A5A40]/10 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              <Download className="w-5 h-5" />
              Scarica File
            </button>
          </div>
        </div>

        <div className="p-6 bg-[#F5F5F0] dark:bg-[#0F0F0E] rounded-[24px] border border-[#5A5A40]/5">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#5A5A40]/40 mb-4">Ripristino</h3>
          <p className="text-sm text-[#5A5A40] dark:text-[#A0A080] mb-6">
            Carica un file di backup precedentemente salvato. I dati esistenti non verranno sovrascritti, ma integrati.
          </p>
          <label className="w-full py-4 bg-[#1A1A1A] dark:bg-[#A0A080] text-white dark:text-[#0F0F0E] rounded-2xl font-bold flex items-center justify-center gap-3 cursor-pointer active:scale-95 transition-all shadow-xl">
            <Database className="w-5 h-5" />
            Seleziona File Backup
            <input type="file" accept=".json" onChange={importBackup} className="hidden" />
          </label>
        </div>

        <div className="text-center">
          <p className="text-[10px] text-[#5A5A40]/30 dark:text-[#A0A080]/30 uppercase tracking-[0.2em] font-bold">
            I tuoi dati rimangono privati e locali al 100%
          </p>
        </div>
      </div>
    </div>
  );
}
