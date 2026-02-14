"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "40px" }}>
          <div className="card" style={{ maxWidth: "520px", textAlign: "center" }}>
            <h1 className="section-title">Something went wrong</h1>
            <p className="section-subtitle">We’ve logged the error. Please try again.</p>
            <button className="badge" style={{ border: "none", padding: "8px 14px" }} onClick={reset}>
              Retry
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
