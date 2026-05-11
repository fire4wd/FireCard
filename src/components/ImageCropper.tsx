import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { motion } from 'motion/react';
import { Check, X, RotateCw } from 'lucide-react';

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
  initialIsPortrait?: boolean;
}

export default function ImageCropper({ image, onCropComplete, onCancel, initialIsPortrait = false }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isPortrait, setIsPortrait] = useState(initialIsPortrait);

  const aspect = isPortrait ? 3 / 5 : 5 / 3;

  const onCropChange = (crop: any) => {
    setCrop(crop);
  };

  const onCropCompleteCallback = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: any,
    rotation = 0
  ): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    const rotRad = (rotation * Math.PI) / 180;
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
      image.width,
      image.height,
      rotation
    );

    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;

    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate(rotRad);
    ctx.translate(-image.width / 2, -image.height / 2);

    ctx.drawImage(image, 0, 0);

    const data = ctx.getImageData(
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height
    );

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.putImageData(data, 0, 0);

    return canvas.toDataURL('image/jpeg');
  };

  function rotateSize(width: number, height: number, rotation: number) {
    const rotRad = (rotation * Math.PI) / 180;
    return {
      width:
        Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
      height:
        Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    };
  }

  const handleDone = async () => {
    try {
      const croppedImage = await getCroppedImg(
        image,
        croppedAreaPixels,
        rotation
      );
      onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="flex-1 relative bg-[#121210]">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspect} // Dynamic aspect ratio
          onCropChange={onCropChange}
          onCropComplete={onCropCompleteCallback}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
        />
      </div>
      
      <div className="p-8 bg-[#1C1C1A] flex flex-col gap-6">
        <div className="flex gap-4 items-center">
          <span className="text-white/40 text-xs font-bold uppercase tracking-widest whitespace-nowrap">Zoom</span>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e: any) => setZoom(e.target.value)}
            className="flex-1 accent-orange-500"
          />
        </div>

        <div className="flex justify-between items-center">
          <button 
            onClick={onCancel}
            className="p-4 bg-white/5 text-white/50 rounded-2xl active:scale-95 transition-transform"
          >
            <X className="w-6 h-6" />
          </button>
          
          <button 
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-4 bg-white/5 text-orange-500 rounded-2xl active:scale-95 transition-transform"
          >
            <RotateCw className="w-6 h-6" />
          </button>

          <button 
            onClick={() => setIsPortrait(!isPortrait)}
            className={`p-4 rounded-2xl active:scale-95 transition-transform ${isPortrait ? 'bg-orange-500 text-white' : 'bg-white/5 text-orange-500'}`}
          >
            <div className={`w-6 h-6 border-2 border-current rounded-sm ${isPortrait ? 'h-6 w-4' : 'w-6 h-4'}`} />
          </button>

          <button 
            onClick={handleDone}
            className="px-8 py-4 bg-orange-500 text-white rounded-2xl font-bold flex items-center gap-2 active:scale-95 transition-transform shadow-lg shadow-orange-500/20"
          >
            <Check className="w-5 h-5" />
            Conferma Ritaglio
          </button>
        </div>
      </div>
    </div>
  );
}
