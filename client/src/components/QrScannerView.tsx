import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { Alert } from "./ui";

/** Camera view that calls onScan for every QR code it decodes. */
export function QrScannerView({ onScan, paused }: { onScan: (text: string) => void; paused: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [error, setError] = useState<string>();

  useEffect(() => {
    const video = videoRef.current!;
    const scanner = new QrScanner(video, (result) => onScanRef.current(result.data), {
      preferredCamera: "environment",
      highlightScanRegion: true,
      highlightCodeOutline: true,
      maxScansPerSecond: 8,
    });
    scannerRef.current = scanner;
    scanner.start().catch((e: unknown) => {
      setError(
        String(e).includes("NotAllowed")
          ? "Camera permission was denied. Allow it in your browser settings, or use manual check-in below."
          : "No camera available. Use manual check-in from the attendee list.",
      );
    });
    return () => {
      scanner.destroy();
      scannerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const s = scannerRef.current;
    if (!s) return;
    if (paused) s.pause();
    else s.start().catch(() => {});
  }, [paused]);

  return (
    <div className="relative aspect-square w-full overflow-hidden bg-ink sm:aspect-[4/3]">
      <video ref={videoRef} className="size-full object-cover" muted playsInline />
      {error && (
        <div className="absolute inset-0 flex items-center p-6">
          <Alert tone="info">{error}</Alert>
        </div>
      )}
    </div>
  );
}
