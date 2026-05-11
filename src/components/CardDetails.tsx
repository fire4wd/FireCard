import { BusinessCard } from '../types';
import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Trash2, 
  Save, 
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  Building2, 
  User as UserIcon,
  Tag,
  StickyNote,
  RotateCcw,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { localStore } from '../lib/storage';

interface CardDetailsProps {
  card: BusinessCard;
  categories: string[];
  onBack: () => void;
  onUpdate: (card: BusinessCard) => void;
  onDelete: (id: string) => void;
  getCategoryIcon: (category: string) => React.ReactNode;
}

export default function CardDetails({ card, categories, onBack, onUpdate, onDelete, getCategoryIcon }: CardDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<BusinessCard>(card);
  const [loading, setLoading] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showBackSide, setShowBackSide] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const saveToVCard = () => {
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${card.name}
ORG:${card.company || ''}
TITLE:${card.title || ''}
TEL;TYPE=CELL:${card.phone || ''}
EMAIL;TYPE=INTERNET:${card.email || ''}
ADR;TYPE=WORK:;;${card.address || ''}
NOTE:${card.notes || ''}
END:VCARD`;

    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${card.name.replace(/\s+/g, '_')}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const callNumber = () => {
    if (card.phone) {
      window.location.href = `tel:${card.phone.replace(/\s+/g, '')}`;
    }
  };

  const handleSave = async () => {
    if (!card.id) return;
    setLoading(true);
    try {
      const updatedCard = { ...formData, id: card.id, updatedAt: new Date().toISOString() };
      await localStore.saveCard(updatedCard);
      onUpdate(updatedCard);
      setIsEditing(false);
    } catch (err) {
      console.error("Errore salvataggio locale:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!card.id) return;
    setLoading(true);
    try {
      await localStore.deleteCard(card.id);
      onDelete(card.id);
    } catch (err: any) {
      console.error("Errore eliminazione locale:", err);
    } finally {
      setLoading(false);
      setIsDeleting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const renderField = (icon: any, label: string, name: keyof BusinessCard, value: string | undefined, type: string = "text", forceShow: boolean = false) => {
    if (!isEditing && !value && !forceShow) return null;

    const isActionable = !isEditing && value && ['phone', 'email', 'website'].includes(name);
    
    let href = '';
    if (name === 'phone') href = `tel:${value?.replace(/\s+/g, '')}`;
    if (name === 'email') href = `mailto:${value}`;
    if (name === 'website') {
      href = value?.startsWith('http') ? value : `https://${value}`;
    }

    return (
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-[#5A5A40]/40 dark:text-[#A0A080]/40 uppercase tracking-widest flex items-center gap-2">
          {icon}
          {label}
        </label>
        {isEditing ? (
          name === 'notes' ? (
            <textarea
              name={name}
              value={value || ''}
              onChange={handleChange}
              rows={3}
              className="w-full p-4 bg-[#F5F5F0] dark:bg-[#0F0F0E] text-[#1A1A1A] dark:text-[#F5F5F0] rounded-2xl border-none outline-none font-medium mb-4 transition-all focus:ring-2 focus:ring-orange-500/20"
            />
          ) : (
            <input
              type={type}
              name={name}
              value={value || ''}
              onChange={handleChange}
              className="w-full p-4 bg-[#F5F5F0] dark:bg-[#0F0F0E] text-[#1A1A1A] dark:text-[#F5F5F0] rounded-2xl border-none outline-none font-medium mb-4 transition-all focus:ring-2 focus:ring-orange-500/20"
            />
          )
        ) : (
          <div className="mb-4">
            {isActionable ? (
              <a 
                href={href} 
                target={name === 'website' ? "_blank" : undefined}
                rel={name === 'website' ? "noopener noreferrer" : undefined}
                className="block p-4 bg-[#F5F5F0] dark:bg-[#0F0F0E] text-[#1A1A1A] dark:text-[#F5F5F0] rounded-2xl font-bold break-all hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400 transition-all border border-transparent hover:border-orange-500/20 active:scale-[0.98]"
              >
                {value}
              </a>
            ) : (
              <div className={`p-4 bg-[#F5F5F0] dark:bg-[#0F0F0E] text-[#1A1A1A] dark:text-[#F5F5F0] rounded-2xl font-medium break-all ${!value ? 'opacity-20 italic' : ''}`}>
                {value || 'Dato non rilevato'}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 relative">
      <AnimatePresence>
        {isDeleting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#1C1C1A] rounded-[32px] p-8 max-w-sm w-full shadow-2xl text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-serif font-bold text-[#1A1A1A] dark:text-[#F5F5F0] mb-2">Elimina Biglietto</h3>
              <p className="text-[#5A5A40]/60 dark:text-[#A0A080]/60 mb-8">
                Sei sicuro di voler eliminare definitivamente questo biglietto? Questa azione è locale e irreversibile.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleDelete}
                  disabled={loading}
                  className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? 'Eliminazione...' : 'Sì, Elimina'}
                </button>
                <button 
                  onClick={() => setIsDeleting(false)}
                  disabled={loading}
                  className="w-full py-4 bg-[#F5F5F0] dark:bg-[#0F0F0E] text-[#5A5A40] dark:text-[#A0A080] rounded-2xl font-bold active:scale-95 transition-all"
                >
                  Annulla
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Actions */}
      <div className="flex items-center justify-between sticky top-0 bg-[#F5F5F0] dark:bg-[#0F0F0E] z-30 py-2 -mx-2 px-2">
        <button 
          type="button"
          onClick={onBack} 
          className="p-3 bg-white dark:bg-[#1C1C1A] rounded-2xl text-[#5A5A40] dark:text-[#A0A080] shadow-sm hover:bg-gray-50 dark:hover:bg-[#252522] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex gap-2">
          {isEditing ? (
            <button 
              type="button"
              onClick={handleSave} 
              disabled={loading}
              className="p-3 bg-[#1A1A1A] dark:bg-[#A0A080] text-white dark:text-[#0F0F0E] rounded-2xl flex items-center gap-2 px-6 font-medium disabled:opacity-50 shadow-sm"
            >
              <Save className="w-5 h-5" />
              Salva
            </button>
          ) : (
            <>
              <button 
                type="button"
                onClick={() => setIsEditing(true)} 
                className="p-3 bg-white dark:bg-[#1C1C1A] rounded-2xl text-[#5A5A40] dark:text-[#A0A080] shadow-sm"
              >
                Modifica
              </button>
              <button 
                type="button"
                onClick={() => setIsDeleting(true)} 
                disabled={loading}
                className="p-3 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-2xl shadow-sm hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                title="Elimina biglietto"
              >
                <Trash2 className="w-5 h-5 pointer-events-none" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Visual Card with Flip Effect */}
      <div className="perspective-1000">
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="relative w-full aspect-[5/3] cursor-pointer preserve-3d"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* Front of visual card (Data) */}
          <div className="absolute inset-0 backface-hidden bg-white dark:bg-[#1C1C1A] rounded-[40px] p-8 shadow-xl shadow-[#5A5A40]/10 border border-white dark:border-white/5 flex flex-col justify-between overflow-hidden text-left">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-serif font-bold text-[#1A1A1A] dark:text-[#F5F5F0] mb-1">{card.name}</h2>
                <div className="px-3 py-1 bg-[#F5F5F0] dark:bg-[#0F0F0E] rounded-full text-[10px] font-bold text-[#5A5A40] dark:text-[#A0A080] uppercase tracking-widest inline-block">
                  {card.category}
                </div>
              </div>
              <div className="w-16 h-16 bg-[#F5F5F0] dark:bg-[#0F0F0E] rounded-[24px] flex items-center justify-center text-[#5A5A40] dark:text-[#A0A080] category-icon-large">
                {getCategoryIcon(card.category)}
              </div>
            </div>
            
            <div className="space-y-1">
              {card.company && <p className="text-sm font-medium text-[#5A5A40] dark:text-[#A0A080]">{card.company}</p>}
              {card.phone && <p className="text-xs text-[#5A5A40]/60 dark:text-[#A0A080]/60">{card.phone}</p>}
              {card.email && <p className="text-xs text-[#5A5A40]/60 dark:text-[#A0A080]/60">{card.email}</p>}
            </div>

            <div className="absolute bottom-4 right-6 text-[#5A5A40]/20 dark:text-[#A0A080]/20 flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest">Gira per vedere la foto</span>
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>

          {/* Back of visual card (Scans) */}
          <div className="absolute inset-0 backface-hidden bg-[#1A1A1A] dark:bg-[#0F0F0E] rounded-[40px] shadow-xl overflow-hidden rotate-y-180">
            <div className="w-full h-full relative group">
              {card.frontImage && (
                  <img 
                    src={showBackSide && card.backImage ? card.backImage : card.frontImage} 
                    className="w-full h-full object-cover opacity-80" 
                    alt="Scan" 
                  />
              )}
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="font-serif text-lg font-medium">Scansione Originale</p>
                <p className="text-xs opacity-60">{showBackSide ? 'Retro' : 'Fronte'}</p>
              </div>
              
              {card.backImage && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBackSide(!showBackSide);
                  }}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-2 bg-white text-black rounded-full text-xs font-bold uppercase tracking-wider shadow-xl active:scale-95 transition-transform"
                >
                  Vedi {showBackSide ? 'Fronte' : 'Retro'}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      {!isEditing && (
        <div className="flex gap-3">
          {card.phone && (
            <button 
              onClick={callNumber}
              className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-95 transition-all"
            >
              <Phone className="w-5 h-5 fill-current" />
              Chiama
            </button>
          )}
          <button 
            onClick={saveToVCard}
            className="flex-1 py-4 bg-[#1A1A1A] dark:bg-[#A0A080] text-white dark:text-[#0F0F0E] rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
          >
            <UserPlus className="w-5 h-5" />
            In Rubrica
          </button>
        </div>
      )}

      {/* Info Sections */}
      <div className="bg-white dark:bg-[#1C1C1A] rounded-[40px] p-8 shadow-sm border border-white dark:border-white/5">
        <h3 className="text-sm font-bold text-[#5A5A40]/40 dark:text-[#A0A080]/40 uppercase tracking-[0.2em] mb-6">Dettagli Catalogati</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 text-left">
          <div className="md:col-span-2">
            {renderField(<UserIcon className="w-3 h-3" />, "Nome", "name", isEditing ? formData.name : card.name, "text", true)}
            <div className="space-y-1 mb-4">
              <label className="text-[10px] font-bold text-[#5A5A40]/40 dark:text-[#A0A080]/40 uppercase tracking-widest flex items-center gap-2">
                <Tag className="w-3 h-3" />
                Categoria
              </label>
              {isEditing ? (
                <select 
                  name="category" 
                  value={formData.category} 
                  onChange={handleChange}
                  className="w-full p-4 bg-[#F5F5F0] dark:bg-[#0F0F0E] text-[#1A1A1A] dark:text-[#F5F5F0] rounded-2xl border-none outline-none font-medium transition-all focus:ring-2 focus:ring-orange-500/20"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              ) : (
                <div className="p-4 bg-[#F5F5F0] dark:bg-[#0F0F0E] text-[#1A1A1A] dark:text-[#F5F5F0] rounded-2xl font-medium mb-4">
                  {card.category}
                </div>
              )}
            </div>
          </div>
          {renderField(<Building2 className="w-3 h-3" />, "Azienda", "company", isEditing ? formData.company : card.company)}
          {renderField(<Tag className="w-3 h-3" />, "Titolo", "title", isEditing ? formData.title : card.title)}
          {renderField(<Phone className="w-3 h-3" />, "Telefono", "phone", isEditing ? formData.phone : card.phone, "tel", true)}
          {renderField(<Mail className="w-3 h-3" />, "Email", "email", isEditing ? formData.email : card.email, "email", true)}
          {renderField(<Globe className="w-3 h-3" />, "Sito Web", "website", isEditing ? formData.website : card.website, "text", true)}
          {renderField(<MapPin className="w-3 h-3" />, "Indirizzo", "address", isEditing ? formData.address : card.address, "text", true)}
          <div className="md:col-span-2">
            {renderField(<StickyNote className="w-3 h-3" />, "Note", "notes", isEditing ? formData.notes : card.notes, "text", true)}
          </div>
        </div>
      </div>
    </div>
  );
}
