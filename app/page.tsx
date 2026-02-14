import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="marketing">
      <Nav />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Job search, without the chaos</p>
            <h1>A clean system for tracking applications end-to-end.</h1>
            <p className="lead">
              JobFlow AI keeps your applications, resume variants, analytics, and follow-ups in one
              focused workspace built for high-volume applicants.
            </p>
            <div className="hero-actions">
              <Link className="btn btn--primary" href="/login?mode=signup">
                Create account
              </Link>
              <Link className="btn btn--glass" href="/login?mode=signin">
                Sign in
              </Link>
            </div>
            <div className="hero-meta">
              <div>
                <span className="metric">7 days</span>
                <span className="label">Average setup to first interview signal</span>
              </div>
              <div>
                <span className="metric">2 min</span>
                <span className="label">Setup with Google OAuth</span>
              </div>
            </div>
          </div>

          <div className="hero-panel">
            <div className="hero-panel-head">
              <h3>Live Pipeline Preview</h3>
              <span className="chip">Verified</span>
            </div>
            <div className="hero-pipeline">
              <div className="hero-col">
                <h4>Applied</h4>
                <article>
                  <strong>Figma</strong>
                  <span>Frontend Engineer</span>
                </article>
                <article>
                  <strong>Datadog</strong>
                  <span>UI Engineer</span>
                </article>
              </div>
              <div className="hero-col">
                <h4>Interview</h4>
                <article>
                  <strong>Stripe</strong>
                  <span>Senior Frontend Engineer</span>
                </article>
              </div>
              <div className="hero-col">
                <h4>Offer</h4>
                <article>
                  <strong>Linear</strong>
                  <span>Frontend Engineer</span>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="section">
          <div className="section-title">
            <h2>Designed for real job search workflows</h2>
            <p>Simple, fast, and clear. No clutter, no setup overhead.</p>
          </div>
          <div className="feature-grid">
            <article className="glass-card">
              <h3>One inbox for all updates</h3>
              <p>Track application, screening, interview, and offer updates in one timeline.</p>
            </article>
            <article className="glass-card">
              <h3>Kanban pipeline control</h3>
              <p>Drag jobs across stages and keep status clean in seconds.</p>
            </article>
            <article className="glass-card">
              <h3>Resume performance tracking</h3>
              <p>See which resume version actually drives interviews and offers.</p>
            </article>
            <article className="glass-card">
              <h3>Verified job board</h3>
              <p>Discover trusted postings and apply directly from your workspace.</p>
            </article>
          </div>
        </section>

        <section id="analytics" className="section">
          <div className="section-title">
            <h2>Sankey analytics snapshot</h2>
            <p>Visualize where your applications convert and where they drop.</p>
          </div>
          <div className="sankey-lite">
            <div className="sankey-col">
              <h4>Applied</h4>
              <div className="sankey-node">48</div>
            </div>
            <div className="sankey-links">
              <div className="sankey-link strong">48 to 26 Screening</div>
              <div className="sankey-link">26 to 11 Interview</div>
              <div className="sankey-link success">11 to 4 Offer</div>
              <div className="sankey-link danger">26 to 15 Rejected</div>
            </div>
            <div className="sankey-col">
              <h4>Outcome</h4>
              <div className="sankey-outcomes">
                <span className="outcome success">Offer 4</span>
                <span className="outcome pending">Interview 7</span>
                <span className="outcome danger">Rejected 15</span>
              </div>
            </div>
          </div>
        </section>

        <section id="flow" className="section">
          <div className="section-title">
            <h2>Built for momentum</h2>
            <p>From first application to final offer, every stage stays visible and actionable.</p>
          </div>
          <div className="partner-grid">
            <div className="glass-card">
              <h3>Start in minutes</h3>
              <p>Connect Google, finish profile setup, and import your first jobs in one session.</p>
            </div>
            <div className="glass-card">
              <h3>Stay focused daily</h3>
              <p>See stale applications, unread updates, and next actions immediately on dashboard.</p>
            </div>
          </div>
        </section>

        <section className="cta">
          <div>
            <h2>Ready to run your job search like a product pipeline?</h2>
            <p>Create your account, complete setup, and start tracking every opportunity clearly.</p>
          </div>
          <Link className="btn btn--primary" href="/login?mode=signup">
            Create account
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
