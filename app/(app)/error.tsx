"use client";

import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
      <div className="card" style={{ maxWidth: "520px", textAlign: "center" }}>
        <h1 className="section-title">Dashboard error</h1>
        <p className="section-subtitle">We hit a snag in the app shell.</p>
        <button type="button" className="btn btn-primary" onClick={reset}>
          Retry
        </button>
      </div>
    </div>
  );
}
