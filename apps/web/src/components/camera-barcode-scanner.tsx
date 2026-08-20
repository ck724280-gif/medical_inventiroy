'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, AlertCircle } from 'lucide-react';

interface CameraBarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export function CameraBarcodeScanner({ onScanSuccess, onClose }: CameraBarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const scannerRef = useRef<any>(null);
  const regionId = 'camera-barcode-reader-region';

  useEffect(() => {
    let html5Qrcode: any;

    async function startScanner() {
      try {
        // Dynamically import html5-qrcode to prevent SSR build issues
        const { Html5Qrcode } = await import('html5-qrcode');
        html5Qrcode = new Html5Qrcode(regionId);
        scannerRef.current = html5Qrcode;

        await html5Qrcode.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: (width: number, height: number) => {
              // Standard barcode aspect ratio is wide and thin
              const boxWidth = Math.min(width * 0.8, 300);
              const boxHeight = Math.min(height * 0.3, 120);
              return { width: boxWidth, height: boxHeight };
            },
            aspectRatio: 1.333333,
          },
          (decodedText: string) => {
            // Play a success sound
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav');
              audio.volume = 0.4;
              audio.play();
            } catch (e) {}

            onScanSuccess(decodedText);
            stopScannerAndClose();
          },
          () => {
            // Silence silent scan failure (it fires on every frame without a match)
          }
        );
        setIsInitializing(false);
      } catch (err: any) {
        console.error('Camera Scanner Error:', err);
        setError('Camera permission denied or camera not found.');
        setIsInitializing(false);
      }
    }

    startScanner();

    return () => {
      if (html5Qrcode && html5Qrcode.isScanning) {
        html5Qrcode.stop().catch((e: any) => console.log('Cleanup error:', e));
      }
    };
  }, []);

  const stopScannerAndClose = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        console.log('Stop error:', e);
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white">
            <Camera className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-sm">Mobile Camera Barcode Scanner</h3>
          </div>
          <button
            onClick={stopScannerAndClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Area */}
        <div className="relative aspect-square w-full bg-slate-950 flex flex-col items-center justify-center p-4">
          <div id={regionId} className="w-full h-full rounded-2xl overflow-hidden relative" />

          {/* Scanner Overlay Box */}
          {!error && !isInitializing && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-4/5 h-1/4 border-2 border-dashed border-sky-400/70 rounded-xl shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                {/* Moving Scan Laser Line */}
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent animate-pulse" style={{ top: '50%' }} />
              </div>
            </div>
          )}

          {/* Initializing Spinner */}
          {isInitializing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950">
              <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
              <p className="text-slate-400 text-xs font-medium">Accessing mobile camera...</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500" />
              <p className="text-white text-sm font-semibold">{error}</p>
              <p className="text-slate-400 text-xs">Please allow camera access in browser site settings.</p>
              <button
                onClick={stopScannerAndClose}
                className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Close Scanner
              </button>
            </div>
          )}
        </div>

        {/* Footer Guidance */}
        <div className="bg-slate-950 p-4 border-t border-slate-900 text-center">
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Position the medicine barcode inside the scanner box.<br />
            Ensure good lighting for instant scanning.
          </p>
        </div>
      </div>
    </div>
  );
}
