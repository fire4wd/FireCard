import { useState, useRef, useEffect } from 'react';
import { Camera as CameraIcon, X, RefreshCw, Zap, Check, RotateCw, Upload, AlertCircle, Flame as FlameIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractCardInfo } from '../lib/ocr';
import { addDebugLog } from '../lib/logger';
import { BusinessCard } from '../types';
import ImageCropper from './ImageCropper';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';
import { localStore } from '../lib/storage';

interface ScannerProps {
  onClose: () => void;
  onComplete: (card: BusinessCard) => void;
  initialImage?: string | null;
}

export default function Scanner({ onClose, onComplete, initialImage }: ScannerProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const [ready, setReady] = useState(false);
  const [capturedFront, setCapturedFront] = useState<string | null>(null);
  const [capturedBack, setCapturedBack] = useState<string | null>(null);
  const [step, setStep] = useState<'front' | 'back' | 'confirm'>('front');
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const [croppingSide, setCroppingSide] = useState<'front' | 'back' | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cropOrientation, setCropOrientation] = useState<'landscape' | 'portrait'>('landscape');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const openSettings = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        addDebugLog("Tentativo apertura impostazioni di sistema...");
        await NativeSettings.open({
          optionAndroid: AndroidSettings.ApplicationDetails,
          optionIOS: IOSSettings.App,
        });
      } catch (err) {
        addDebugLog("Errore apertura impostazioni nativi", 'error');
        alert("Impossibile aprire le impostazioni automaticamente. Vai in Impostazioni > App > FireCard > Autorizzazioni e attiva la Fotocamera.");
      }
    } else {
      const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
      const isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
      
      let instructions = "Per abilitare la fotocamera:\n\n";
      if (isChrome) {
        instructions += "1. Clicca sull'icona delle IMPOSTAZIONI SITO (a sinistra dell'indirizzo URL)\n2. Assicurati che 'Fotocamera' sia impostata su 'Consenti'\n3. Ricarica la pagina.";
      } else if (isSafari) {
        instructions += "1. Vai in Impostazioni di sistema\n2. Cerca Safari > Fotocamera\n3. Imposta su 'Chiedi' o 'Consenti'.";
      } else {
        instructions += "1. Controlla le impostazioni del tuo browser\n2. Assicurati che il sito abbia il permesso per la fotocamera\n3. Ricarica la pagina.";
      }
      alert(instructions);
    }
  };

  useEffect(() => {
    if (initialImage) {
      setCroppingImage(initialImage);
      setCroppingSide('front');
    } else {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [initialImage]);

  useEffect(() => {
    if (stream && videoRef.current && ready) {
      videoRef.current.srcObject = stream;
      addDebugLog("Stream collegato al video element");
    }
  }, [stream, ready]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      setReady(false);
      addDebugLog("Tentativo avvio fotocamera...");
      
      if (Capacitor.isNativePlatform()) {
        try {
          const status = await Camera.checkPermissions();
          addDebugLog(`Stato permessi fotocamera: ${status.camera}`);
          
          if (status.camera === 'denied' || status.camera === 'prompt-with-rationale') {
            const requestStatus = await Camera.requestPermissions();
            if (requestStatus.camera !== 'granted') {
              setCameraError("Accesso negato. Abilita la fotocamera nelle impostazioni dell'app.");
              addDebugLog("Permesso fotocamera negato (Nativo)", 'error');
              return;
            }
          } else if (status.camera === 'prompt') {
            await Camera.requestPermissions();
          }
        } catch (pErr: any) {
          console.warn("Errore permessi nativi:", pErr);
          addDebugLog(`Errore permessi: ${pErr.message}`, 'error');
        }
      }

      const constraints = { 
        video: { 
          facingMode: { ideal: 'environment' }, 
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        } 
      };

      try {
        addDebugLog("Richiesta gUM (ideal)...");
        const s = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(s);
        setReady(true);
        addDebugLog("Stream ottenuto (vincoli ideali)");
      } catch (err: any) {
        addDebugLog(`Fallback gUM: ${err.message}`, 'info');
        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(s);
        setReady(true);
        addDebugLog("Stream ottenuto (fallback)");
      }
    } catch (err: any) {
      console.error("Errore fatale fotocamera:", err);
      setReady(false);
      
      let msg = "Impossibile avviare la fotocamera.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = "Accesso negato. Controlla i permessi del browser nelle impostazioni del sito.";
        alert("La fotocamera è bloccata. Per favore, abilita i permessi nelle impostazioni del tuo browser per continuare.");
      } else if (err.name === 'NotFoundError') {
        msg = "Nessuna fotocamera trovata su questo dispositivo.";
      }
      
      setCameraError(msg);
      addDebugLog(`ERRORE CAMERA: ${err.message || String(err)}`, 'error');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const capture = async () => {
    if (!videoRef.current || !canvasRef.current || scanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL('image/jpeg', 0.8); 
      
      setCroppingImage(base64Image);
      setCroppingSide(step === 'front' ? 'front' : 'back');
      stopCamera();
    }
  };

  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<Partial<BusinessCard>>({});
  
  const processImages = async () => {
    if (!capturedFront) return;
    setScanning(true);
    setErrorToast(null);
    try {
      addDebugLog("Analisi OCR locale in corso...");
      const extracted = await extractCardInfo(capturedFront, capturedBack);
      
      setExtractedData({
        name: extracted.name || "",
        company: extracted.company || "",
        title: extracted.title || "",
        phone: extracted.phone || "",
        email: extracted.email || "",
        website: extracted.website || "",
        address: extracted.address || "",
        category: extracted.category || "Altro",
        notes: extracted.notes || "",
        rawOcr: extracted.rawOcr || "",
      });

      setStep('confirm');
      setScanning(false);
    } catch (err: any) {
      console.error("Extraction error:", err);
      setErrorToast(err.message || "Errore durante l'analisi. Riprova.");
      setScanning(false);
    }
  };

  const handleConfirm = async () => {
    if (!capturedFront) return;
    setScanning(true);
    try {
      // Compressione immagini per storage locale
      const compressImage = async (base64: string): Promise<string> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxWidth = 800; 
            const scale = Math.min(1, maxWidth / img.width);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.6));
          };
          img.src = base64;
        });
      };

      const compressedFront = await compressImage(capturedFront);
      const compressedBack = capturedBack ? await compressImage(capturedBack) : "";

      const localCard: BusinessCard = {
        id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        name: extractedData.name || "Senza nome",
        company: extractedData.company || "",
        title: extractedData.title || "",
        phone: extractedData.phone || "",
        email: extractedData.email || "",
        website: extractedData.website || "",
        address: extractedData.address || "",
        category: extractedData.category || "Altro",
        notes: extractedData.notes || "",
        rawOcr: extractedData.rawOcr || "",
        frontImage: compressedFront,
        backImage: compressedBack,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await localStore.saveCard(localCard);
      onComplete(localCard);
    } catch (err) {
      console.error("Save error:", err);
      setErrorToast("Errore durante il salvataggio.");
      setScanning(false);
    }
  };

  const handleFileUpload = (side: 'front' | 'back') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (rv) => {
          const base64 = rv.target?.result as string;
          setCroppingImage(base64);
          setCroppingSide(side);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      {croppingImage && croppingSide && (
        <ImageCropper 
          image={croppingImage}
          initialIsPortrait={cropOrientation === 'portrait'}
          onCropComplete={(cropped) => {
            if (croppingSide === 'front') {
              setCapturedFront(cropped);
            } else {
              setCapturedBack(cropped);
            }
            setCroppingImage(null);
            setCroppingSide(null);
            setStep('confirm');
          }}
          onCancel={() => {
            setCroppingImage(null);
            setCroppingSide(null);
            if (step !== 'confirm') {
              startCamera();
            }
          }}
        />
      )}
      <div className="p-6 flex items-center justify-between text-white z-10">
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full">
          <X className="w-6 h-6" />
        </button>
          <div className="flex flex-col items-center">
            <span className="font-serif font-medium text-lg leading-tight">
              {step === 'front' ? 'Fronte' : step === 'back' ? 'Retro' : 'Conferma'}
            </span>
            <div className="flex items-center gap-1">
              <FlameIcon className="w-2.5 h-2.5 text-orange-500" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">FireCard Scanner</span>
            </div>
          </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {step === 'confirm' ? (
          <div className="w-full h-full flex flex-col items-center overflow-y-auto custom-scrollbar p-6 pt-12 pb-32 gap-6 bg-[#F5F5F0] dark:bg-[#0F0F0E]">
            <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
              <div className="flex gap-4">
                 <div className="flex-1 aspect-[5/3] bg-white dark:bg-[#1C1C1A] rounded-2xl overflow-hidden shadow-lg border border-black/5 relative">
                  <img src={capturedFront!} className="w-full h-full object-cover" alt="Front" />
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[8px] text-white uppercase font-black">Fronte</div>
                </div>
                {capturedBack && (
                  <div className="flex-1 aspect-[5/3] bg-white dark:bg-[#1C1C1A] rounded-2xl overflow-hidden shadow-lg border border-black/5 relative">
                    <img src={capturedBack} className="w-full h-full object-cover" alt="Back" />
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[8px] text-white uppercase font-black">Retro</div>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-[#1C1C1A] rounded-[32px] p-6 shadow-sm space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/40 mb-1 block ml-1">Nome</label>
                  <input 
                    type="text" 
                    value={extractedData.name}
                    onChange={(e) => setExtractedData({...extractedData, name: e.target.value})}
                    placeholder="Nome contatto"
                    className="w-full bg-[#F5F5F0] dark:bg-[#0F0F0E] p-4 rounded-2xl font-serif text-base font-bold outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/40 mb-1 block ml-1">Categoria</label>
                  <select 
                    value={extractedData.category}
                    onChange={(e) => setExtractedData({...extractedData, category: e.target.value})}
                    className="w-full bg-[#F5F5F0] dark:bg-[#0F0F0E] p-4 rounded-2xl font-medium outline-none dark:text-white appearance-none"
                  >
                    <option value="Persona">Persona</option>
                    <option value="Negozio">Negozio</option>
                    <option value="Artigiano">Artigiano</option>
                    <option value="Ristorante">Ristorante</option>
                    <option value="Altro">Altro (Default)</option>
                    {localStore.getCachedCategories()?.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/40 mb-1 block ml-1">Azienda</label>
                    <input 
                      type="text" 
                      value={extractedData.company}
                      onChange={(e) => setExtractedData({...extractedData, company: e.target.value})}
                      placeholder="Azienda"
                      className="w-full bg-[#F5F5F0] dark:bg-[#0F0F0E] p-4 rounded-2xl text-xs font-medium outline-none dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/40 mb-1 block ml-1">Ruolo</label>
                    <input 
                      type="text" 
                      value={extractedData.title}
                      onChange={(e) => setExtractedData({...extractedData, title: e.target.value})}
                      placeholder="Ruolo"
                      className="w-full bg-[#F5F5F0] dark:bg-[#0F0F0E] p-4 rounded-2xl text-xs font-medium outline-none dark:text-white"
                    />
                  </div>
                </div>

                {!capturedBack && (
                  <button 
                    onClick={() => {
                      setStep('back');
                      startCamera();
                    }}
                    className="w-full py-4 border-2 border-dashed border-[#5A5A40]/10 dark:border-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/40 hover:text-orange-500 transition-colors"
                  >
                    Aggiungi Retro
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : !ready || cameraError ? (
          <div className="flex flex-col items-center justify-center gap-6 p-10 text-center">
            {cameraError ? (
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                <AlertCircle className="w-10 h-10" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-500">
                <CameraIcon className="w-10 h-10" />
              </div>
            )}
            <div>
              <h3 className="text-white font-bold text-xl mb-2">
                {cameraError ? "Errore Fotocamera" : "Accesso Fotocamera"}
              </h3>
              <p className="text-white/40 text-sm mb-6">
                {cameraError || "Per favore, autorizza l'accesso alla fotocamera per scansionare i tuoi biglietti, oppure carica un file dalla galleria."}
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={startCamera}
                  className="px-8 py-4 bg-orange-500 text-white rounded-2xl font-bold active:scale-95 transition-transform"
                >
                  {cameraError ? "Riprova" : "Attiva Fotocamera"}
                </button>
                {cameraError && (cameraError.includes("negato") || cameraError.includes("bloccata")) && (
                  <button 
                    onClick={openSettings}
                    className="px-8 py-4 bg-blue-500 text-white rounded-2xl font-bold active:scale-95 transition-transform"
                  >
                    Apri Impostazioni
                  </button>
                )}
                <button 
                  onClick={() => handleFileUpload(step as 'front' | 'back')}
                  className="px-8 py-4 bg-white/10 text-white rounded-2xl font-bold active:scale-95 transition-transform"
                >
                  Carica dalla Galleria
                </button>
              </div>
            </div>
          </div>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            className="h-full w-full object-cover"
          />
        )}
        
        {step !== 'confirm' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`transition-all duration-300 w-[85%] border-2 border-white/30 rounded-[32px] relative shadow-[0_0_0_1000px_rgba(0,0,0,0.7)] ${
              cropOrientation === 'landscape' ? 'aspect-[5/3]' : 'aspect-[3/5] h-[70%]'
            }`}>
              <div className="absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-[32px]" />
              <div className="absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-[32px]" />
              <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-[32px]" />
              <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-white rounded-br-[32px]" />
            </div>
          </div>
        )}

        {scanning && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center text-white p-6 text-center z-50">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="mb-6"
            >
              <RefreshCw className="w-16 h-16 text-white/40" />
            </motion.div>
            <h2 className="text-2xl font-serif font-bold mb-2">FireCard Locale</h2>
            <p className="text-white/60 text-sm max-w-[200px]">OCR locale in corso... (100% privato)</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {errorToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-xl z-[100]"
          >
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-bold">{errorToast}</span>
            <button onClick={() => setErrorToast(null)} className="ml-2">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-12 flex items-center justify-center bg-black backdrop-blur-md gap-8">
        {step === 'confirm' ? (
          <>
            <button 
              onClick={() => {
                setCapturedFront(null);
                setCapturedBack(null);
                setStep('front');
                if (!initialImage) startCamera();
              }}
              className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-white/40 active:scale-95 transition-all"
            >
              Annulla
            </button>
            <button 
              onClick={handleConfirm}
              disabled={scanning}
              className="px-12 py-5 bg-white text-black font-serif font-bold text-xl rounded-full shadow-2xl active:scale-95 transition-all disabled:opacity-50"
            >
              {scanning ? 'Salvataggio...' : 'Conferma'}
            </button>
          </>
        ) : (
          <div className="flex items-center gap-6">
            <button 
              onClick={() => handleFileUpload(step as 'front' | 'back')}
              className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white"
            >
              <Upload className="w-5 h-5" />
            </button>
            <button 
              onClick={capture}
              disabled={!ready || scanning}
              className="w-24 h-24 rounded-full border-4 border-white/20 p-2 flex items-center justify-center active:scale-95 transition-all"
            >
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                <Zap className="w-8 h-8 text-black fill-black" />
              </div>
            </button>
            <button 
              onClick={() => setCropOrientation(prev => prev === 'landscape' ? 'portrait' : 'landscape')}
              className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-90 transition-transform"
              title="Cambia orientamento"
            >
              <div className={`border-2 border-white rounded-sm transition-all duration-300 ${cropOrientation === 'landscape' ? 'w-6 h-4' : 'w-4 h-6'}`} />
            </button>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
