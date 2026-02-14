export default function SuspendedPage() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "40px" }}>
      <div className="card" style={{ maxWidth: "520px", textAlign: "center" }}>
        <h1 className="section-title">Account Suspended</h1>
        <p className="section-subtitle">
          Your account is currently suspended. If you believe this is a mistake, contact support.
        </p>
      </div>
    </div>
  );
}
