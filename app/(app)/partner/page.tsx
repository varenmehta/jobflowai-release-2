export default function PartnerPage() {
  return (
    <main className="section">
      <div className="section-title">
        <h2>Partner Portal</h2>
        <p>Post roles directly to JobFlow AI and track verified applicants.</p>
      </div>
      <div className="partner-grid">
        <div className="glass-card">
          <h3>Create a verified posting</h3>
          <p>Post a new role and approve the application pipeline stages.</p>
          <button className="btn btn--primary" type="button">
            New Posting
          </button>
        </div>
        <div className="glass-card">
          <h3>Applicant flow</h3>
          <p>See applied → screening → interview conversion rates.</p>
          <button className="btn btn--glass" type="button">
            View analytics
          </button>
        </div>
      </div>
    </main>
  );
}
