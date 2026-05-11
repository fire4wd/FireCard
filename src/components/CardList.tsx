import React, { useState } from 'react';
import { BusinessCard } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Phone, 
  Mail, 
  Camera,
  RefreshCw,
  ChevronRight
} from 'lucide-react';

interface CardListProps {
  cards: BusinessCard[];
  onSelect: (card: BusinessCard) => void;
  getCategoryIcon: (category: string) => React.ReactNode;
}

interface CardItemProps {
  card: BusinessCard;
  onSelect: (card: BusinessCard) => void;
  getCategoryIcon: (category: string) => React.ReactNode;
}

function CardItem({ card, onSelect, getCategoryIcon }: CardItemProps) {
  const [showBack, setShowBack] = useState(false);

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowBack(!showBack);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#1C1C1A] rounded-[32px] p-2 shadow-sm border border-white dark:border-white/5 group active:scale-[0.99] transition-transform"
    >
      <div className="flex gap-4">
        {/* Card Visual with Rotation */}
        <div 
          onClick={handleFlip}
          className="relative w-32 aspect-[5/3] rounded-2xl overflow-hidden bg-[#F5F5F0] dark:bg-[#0F0F0E] cursor-pointer group/img"
        >
          <AnimatePresence mode="wait">
            <motion.img 
              key={showBack ? 'back' : 'front'}
              initial={{ opacity: 0, rotateY: 90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: -90 }}
              transition={{ duration: 0.3 }}
              src={showBack && card.backImage ? card.backImage : card.frontImage} 
              alt={card.name}
              className="w-full h-full object-cover"
            />
          </AnimatePresence>

          {card.backImage && (
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
               <RefreshCw className="w-5 h-5 text-white" />
            </div>
          )}
          
          {card.backImage && (
            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-black/40 backdrop-blur-md rounded-md text-[7px] font-bold text-white uppercase tracking-tighter">
              {showBack ? 'Retro' : 'Fronte'}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div 
          onClick={() => onSelect(card)}
          className="flex-1 py-1 px-1 cursor-pointer min-w-0 flex flex-col justify-center"
        >
          <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-serif font-bold text-[#1A1A1A] dark:text-[#F5F5F0] truncate leading-tight">
                {card.name}
              </h3>
              <p className="text-[10px] uppercase font-bold text-[#5A5A40]/40 dark:text-[#A0A080]/40 truncate">
                {card.company || 'Privato'}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#5A5A40]/20 dark:text-[#A0A080]/20 mt-1" />
          </div>

          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-500/5 text-orange-600 dark:text-orange-400 rounded-lg text-[8px] font-bold uppercase tracking-wider">
              {getCategoryIcon(card.category)}
              {card.category}
            </div>
            {card.phone && <Phone className="w-3 h-3 opacity-20" />}
            {card.email && <Mail className="w-3 h-3 opacity-20" />}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function CardList({ cards, onSelect, getCategoryIcon }: CardListProps) {

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 bg-white dark:bg-[#1C1C1A] rounded-[32px] flex items-center justify-center mb-6 shadow-sm">
          <Camera className="w-10 h-10 text-[#5A5A40]/20 dark:text-[#A0A080]/20" />
        </div>
        <h3 className="text-xl font-serif font-medium text-[#1A1A1A] dark:text-[#F5F5F0] mb-2">Nessun biglietto trovato</h3>
        <p className="text-[#5A5A40]/60 dark:text-[#A0A080]/60 max-w-[200px]">Inizia scansionando il tuo primo biglietto da visita!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {cards.map((card) => (
        <CardItem 
          key={card.id} 
          card={card} 
          onSelect={onSelect} 
          getCategoryIcon={getCategoryIcon} 
        />
      ))}
    </div>
  );
}
