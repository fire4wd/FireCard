import { createWorker } from 'tesseract.js';
import { addDebugLog } from "./logger";

async function compressImage(base64: string, maxWidth = 1000): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onerror = () => resolve(base64);
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(base64);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } catch (err) {
        resolve(base64);
      }
    };
    img.src = base64;
  });
}

function extractStructuredData(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
  
  // Email regex
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const email = text.match(emailRegex)?.[0] || "";

  // Phone regex (very broad for international)
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;
  const phone = text.match(phoneRegex)?.[0] || "";

  // Website regex
  const websiteRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-z]{2,}(?:\.[a-z]{2})?)/i;
  const website = text.match(websiteRegex)?.[0] || "";

  // Strategy for Name/Company: usually first few lines
  // We'll take the first line as name and second as company/title if they don't look like contact info
  const nameCandidate = lines.find(l => !emailRegex.test(l) && !phoneRegex.test(l) && !websiteRegex.test(l)) || "Contatto Scansionato";
  const otherLines = lines.filter(l => l !== nameCandidate && !emailRegex.test(l) && !phoneRegex.test(l) && !websiteRegex.test(l));
  
  const company = otherLines[0] || "";
  const title = otherLines[1] || "";
  const address = otherLines.slice(2).join(', ').substring(0, 100);

  return {
    name: nameCandidate,
    company,
    title,
    phone,
    email,
    website,
    address,
    category: "Generale",
    notes: "Estratto localmente tramite OCR.",
  };
}

export async function extractCardInfo(frontBase64: string, backBase64?: string | null) {
  try {
    addDebugLog("Inizio OCR locale...", 'request');
    
    const compressedFront = await compressImage(frontBase64);
    
    // Inizializziamo il worker di Tesseract
    const worker = await createWorker('ita+eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    const { data: { text: frontText } } = await worker.recognize(compressedFront);
    let fullText = frontText;

    if (backBase64) {
      const compressedBack = await compressImage(backBase64);
      const { data: { text: backText } } = await worker.recognize(compressedBack);
      fullText += "\n" + backText;
    }

    await worker.terminate();

    addDebugLog("OCR locale completato", 'response');
    
    const result = extractStructuredData(fullText);
    
    return {
      ...result,
      rawOcr: fullText
    };

  } catch (error: any) {
    console.error("Errore fatale OCR locale:", error);
    addDebugLog(`ERRORE OCR: ${error.message}`, 'error');
    
    return {
      name: "Contatto Scansionato",
      company: "",
      title: "",
      phone: "",
      email: "",
      website: "",
      address: "",
      category: "Altro",
      notes: `Nota: Fallito tentativo OCR locale (${error.message}).`,
      rawOcr: ""
    };
  }
}
