"use client";

import { useEffect } from "react";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("İMKÂN UI error", error);
  }, [error]);

  return (
    <main className="fatal-error" role="alert">
      <span>Bir şey planlandığı gibi gitmedi.</span>
      <h1>Atölye güvende; bu ekranı yeniden deneyebiliriz.</h1>
      <button className="button primary" onClick={reset}>Yeniden dene</button>
    </main>
  );
}
