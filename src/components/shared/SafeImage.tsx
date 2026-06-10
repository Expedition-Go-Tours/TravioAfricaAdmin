import { useState, useCallback } from "react";

interface SafeImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

export function SafeImage({ src, alt, className, fallback }: SafeImageProps) {
  const [attempt, setAttempt] = useState(0);
  const maxRetries = 2;

  const handleError = useCallback(() => {
    if (attempt < maxRetries) {
      setTimeout(() => setAttempt((p) => p + 1), 1500);
    }
  }, [attempt]);

  if (!src) return fallback || null;

  if (attempt > maxRetries) return fallback || null;

  const cacheBuster = attempt > 0 ? `?t=${Date.now()}` : "";

  return (
    <img
      src={`${src}${cacheBuster}`}
      alt={alt}
      className={className}
      loading="lazy"
      onError={handleError}
    />
  );
}
