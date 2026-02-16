"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Job = {
  id: string;
  title: string;
  company?: { name: string } | null;
  source?: string | null;
  url?: string | null;
  description?: string | null;
  createdAt?: string | Date;
  isVerified: boolean;
};

type LocationType = "REMOTE" | "HYBRID" | "ONSITE" | "UNKNOWN";
type ExperienceType = "INTERNSHIP" | "ENTRY" | "MID" | "SENIOR" | "STAFF" | "MANAGER" | "UNKNOWN";
type JobType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "UNKNOWN";

type JobSignals = {
  location: LocationType;
  city: string;
  country: string;
  experience: ExperienceType;
  jobType: JobType;
  sponsorship: {
    hasH1B: boolean;
    hasOPT: boolean;
    hasSTEMOPT: boolean;
    hasCPT: boolean;
    saysNoSponsorship: boolean;
  };
  salary: { min: number; max: number } | null;
  postedDays: number;
};

function asText(job: Job) {
  return `${job.title} ${job.company?.name ?? ""} ${job.source ?? ""} ${job.description ?? ""}`.toLowerCase();
}

function parseSalary(text: string) {
  // Example supported formats: "$120k-$160k", "$120,000 - $160,000"
  const range = text.match(/\$?\s*(\d{2,3})(?:,\d{3})?\s*[kK]?\s*[-to]+\s*\$?\s*(\d{2,3})(?:,\d{3})?\s*[kK]?/);
  if (!range) return null;
  const rawMin = Number(range[1]);
  const rawMax = Number(range[2]);
  if (!Number.isFinite(rawMin) || !Number.isFinite(rawMax)) return null;
  const min = rawMin < 1000 ? rawMin * 1000 : rawMin;
  const max = rawMax < 1000 ? rawMax * 1000 : rawMax;
  if (min <= 0 || max <= 0 || max < min) return null;
  return { min, max };
}

function inferLocation(text: string): LocationType {
  if (text.includes("hybrid")) return "HYBRID";
  if (text.includes("remote")) return "REMOTE";
  if (text.includes("on-site") || text.includes("onsite") || text.includes("in-office")) return "ONSITE";
  return "UNKNOWN";
}

function inferExperience(text: string): ExperienceType {
  if (text.includes("intern")) return "INTERNSHIP";
  if (text.includes("entry level") || text.includes("junior")) return "ENTRY";
  if (text.includes("staff") || text.includes("principal")) return "STAFF";
  if (text.includes("senior") || text.includes("sr.")) return "SENIOR";
  if (text.includes("manager") || text.includes("lead")) return "MANAGER";
  if (text.includes("mid")) return "MID";
  return "UNKNOWN";
}

function inferJobType(text: string): JobType {
  if (text.includes("intern")) return "INTERNSHIP";
  if (text.includes("contract")) return "CONTRACT";
  if (text.includes("part-time") || text.includes("part time")) return "PART_TIME";
  if (text.includes("full-time") || text.includes("full time")) return "FULL_TIME";
  return "UNKNOWN";
}

function deriveSignals(job: Job): JobSignals {
  const text = asText(job);
  const postedAt = job.createdAt ? new Date(job.createdAt) : new Date();
  const postedDays = Math.max(0, Math.floor((Date.now() - postedAt.getTime()) / (1000 * 60 * 60 * 24)));
  const cityCountry = inferCityCountry(text);

  return {
    location: inferLocation(text),
    city: cityCountry.city,
    country: cityCountry.country,
    experience: inferExperience(text),
    jobType: inferJobType(text),
    sponsorship: {
      hasH1B: text.includes("h1b"),
      hasOPT: text.includes("opt"),
      hasSTEMOPT: text.includes("stem opt") || text.includes("stem-opt"),
      hasCPT: text.includes("cpt"),
      saysNoSponsorship: text.includes("no sponsorship") || text.includes("cannot sponsor"),
    },
    salary: parseSalary(text),
    postedDays,
  };
}

function inferCityCountry(text: string) {
  const cleaned = text.replace(/\s+/g, " ");
  const locationMatch = cleaned.match(/location:\s*([a-zA-Z .-]+)(?:,|\s+-\s+|\s\|\s)?([a-zA-Z .-]+)?/i);
  let city = "";
  let country = "";
  if (locationMatch) {
    city = (locationMatch[1] ?? "").trim();
    country = (locationMatch[2] ?? "").trim();
  }

  if (!country) {
    const countryPatterns: Array<[RegExp, string]> = [
      [/\bunited states\b|\busa\b|\bu\.s\.\b/i, "United States"],
      [/\bcanada\b/i, "Canada"],
      [/\bunited kingdom\b|\buk\b/i, "United Kingdom"],
      [/\bindia\b/i, "India"],
      [/\bgermany\b/i, "Germany"],
      [/\bfrance\b/i, "France"],
      [/\bnetherlands\b/i, "Netherlands"],
      [/\baustralia\b/i, "Australia"],
      [/\bsingapore\b/i, "Singapore"],
    ];
    for (const [pattern, value] of countryPatterns) {
      if (pattern.test(cleaned)) {
        country = value;
        break;
      }
    }
  }

  return { city, country };
}

function formatSalary(salary: { min: number; max: number } | null) {
  if (!salary) return "Salary not listed";
  const min = `$${Math.round(salary.min / 1000)}k`;
  const max = `$${Math.round(salary.max / 1000)}k`;
  return `${min}-${max}`;
}

function getHiringIntent(signals: JobSignals, isVerified: boolean) {
  let score = 45;
  if (isVerified) score += 20;
  if (signals.postedDays <= 3) score += 15;
  if (signals.salary) score += 8;
  if (signals.location === "REMOTE" || signals.location === "HYBRID") score += 6;
  if (
    signals.sponsorship.hasH1B ||
    signals.sponsorship.hasOPT ||
    signals.sponsorship.hasSTEMOPT ||
    signals.sponsorship.hasCPT
  ) {
    score += 6;
  }
  return Math.min(99, Math.max(1, score));
}

function getGhostRisk(signals: JobSignals, isVerified: boolean) {
  let risk = 24;
  if (signals.postedDays > 21) risk += 30;
  if (signals.postedDays > 35) risk += 18;
  if (!signals.salary) risk += 12;
  if (!isVerified) risk += 10;
  return Math.min(95, Math.max(5, risk));
}

export default function JobBoardClient({ jobs, initialQuery = "" }: { jobs: Job[]; initialQuery?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [locationFilter, setLocationFilter] = useState<"ALL" | LocationType>("ALL");
  const [experienceFilter, setExperienceFilter] = useState<"ALL" | ExperienceType>("ALL");
  const [jobTypeFilter, setJobTypeFilter] = useState<"ALL" | JobType>("ALL");
  const [postedFilter, setPostedFilter] = useState<"ANY" | "24H" | "3D" | "7D" | "14D" | "30D">("ANY");
  const [sponsorshipFilter, setSponsorshipFilter] = useState<
    "ALL" | "H1B" | "OPT" | "STEM_OPT" | "CPT" | "NO_SPONSORSHIP" | "SPONSORSHIP_AVAILABLE"
  >("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [cityFilter, setCityFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [salaryMinFilter, setSalaryMinFilter] = useState("");
  const [salaryMaxFilter, setSalaryMaxFilter] = useState("");
  const [salaryKnownOnly, setSalaryKnownOnly] = useState(false);
  const [appliedPulseId, setAppliedPulseId] = useState<string | null>(null);

  const jobSources = useMemo(
    () => ["ALL", ...new Set(jobs.map((job) => job.source || "Direct"))],
    [jobs],
  );

  const enriched = useMemo(
    () => jobs.map((job) => ({ job, signals: deriveSignals(job) })),
    [jobs],
  );

  const filteredJobs = useMemo(() => {
    const term = query.trim().toLowerCase();
    const minSalary = salaryMinFilter ? Number(salaryMinFilter) : null;
    const maxSalary = salaryMaxFilter ? Number(salaryMaxFilter) : null;
    const postedLimit =
      postedFilter === "24H" ? 1 :
      postedFilter === "3D" ? 3 :
      postedFilter === "7D" ? 7 :
      postedFilter === "14D" ? 14 :
      postedFilter === "30D" ? 30 : null;

    return enriched.filter(({ job, signals }) => {
      const matchesVerified = !verifiedOnly || job.isVerified;
      const matchesTerm =
        !term ||
        job.title.toLowerCase().includes(term) ||
        (job.company?.name ?? "").toLowerCase().includes(term) ||
        (job.source ?? "").toLowerCase().includes(term) ||
        (job.description ?? "").toLowerCase().includes(term);

      const matchesLocation = locationFilter === "ALL" || signals.location === locationFilter;
      const matchesExperience = experienceFilter === "ALL" || signals.experience === experienceFilter;
      const matchesJobType = jobTypeFilter === "ALL" || signals.jobType === jobTypeFilter;
      const matchesSource = sourceFilter === "ALL" || (job.source ?? "Direct") === sourceFilter;
      const matchesPosted = postedLimit === null || signals.postedDays <= postedLimit;
      const cityTerm = cityFilter.trim().toLowerCase();
      const countryTerm = countryFilter.trim().toLowerCase();
      const matchesCity = !cityTerm || signals.city.toLowerCase().includes(cityTerm);
      const matchesCountry = !countryTerm || signals.country.toLowerCase().includes(countryTerm);

      const matchesSponsorship =
        sponsorshipFilter === "ALL" ||
        (sponsorshipFilter === "H1B" && signals.sponsorship.hasH1B) ||
        (sponsorshipFilter === "OPT" && signals.sponsorship.hasOPT) ||
        (sponsorshipFilter === "STEM_OPT" && signals.sponsorship.hasSTEMOPT) ||
        (sponsorshipFilter === "CPT" && signals.sponsorship.hasCPT) ||
        (sponsorshipFilter === "NO_SPONSORSHIP" && signals.sponsorship.saysNoSponsorship) ||
        (sponsorshipFilter === "SPONSORSHIP_AVAILABLE" &&
          (signals.sponsorship.hasH1B ||
            signals.sponsorship.hasOPT ||
            signals.sponsorship.hasSTEMOPT ||
            signals.sponsorship.hasCPT) &&
          !signals.sponsorship.saysNoSponsorship);

      const hasSalary = Boolean(signals.salary);
      const meetsSalaryKnown = !salaryKnownOnly || hasSalary;
      const meetsSalaryMin = !minSalary || (signals.salary ? signals.salary.max >= minSalary * 1000 : false);
      const meetsSalaryMax = !maxSalary || (signals.salary ? signals.salary.min <= maxSalary * 1000 : false);

      return (
        matchesVerified &&
        matchesTerm &&
        matchesLocation &&
        matchesExperience &&
        matchesJobType &&
        matchesSource &&
        matchesPosted &&
        matchesCity &&
        matchesCountry &&
        matchesSponsorship &&
        meetsSalaryKnown &&
        meetsSalaryMin &&
        meetsSalaryMax
      );
    });
  }, [
    enriched,
    query,
    verifiedOnly,
    locationFilter,
    experienceFilter,
    jobTypeFilter,
    postedFilter,
    sponsorshipFilter,
    sourceFilter,
    cityFilter,
    countryFilter,
    salaryMinFilter,
    salaryMaxFilter,
    salaryKnownOnly,
  ]);

  const apply = async (jobId: string) => {
    setMessage("Applying...");
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    if (res.ok) {
      setMessage("Applied and tracked.");
      setAppliedPulseId(jobId);
      window.setTimeout(() => setAppliedPulseId((current) => (current === jobId ? null : current)), 640);
    } else {
      const data = await res.json();
      setMessage(data.error ?? "Apply failed");
    }
  };

  const syncJobs = async () => {
    setSyncing(true);
    setMessage("Syncing targeted jobs...");
    try {
      const res = await fetch("/api/jobs/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 40 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Job sync failed");
        return;
      }
      setMessage(`Synced ${data.created ?? 0} new jobs (${data.discovered ?? 0} discovered).`);
      router.refresh();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="list-stack">
      <div className="card">
        <div className="form-actions">
          <input
            className="search"
            placeholder="Search by role, company, or source"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button
            type="button"
            className={`btn btn-sm ${verifiedOnly ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setVerifiedOnly((value) => !value)}
          >
            {verifiedOnly ? "Verified only" : "All jobs"}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={syncJobs} disabled={syncing}>
            {syncing ? "Syncing..." : "Sync targeted jobs"}
          </button>
        </div>
        <details className="job-filters-collapse">
          <summary>Refine filters</summary>
          <div className="job-filters-grid">
            <select className="select" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
              {jobSources.map((source) => (
                <option key={source} value={source}>
                  {source === "ALL" ? "All sources" : source}
                </option>
              ))}
            </select>
            <select className="select" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value as any)}>
              <option value="ALL">All locations</option>
              <option value="REMOTE">Remote</option>
              <option value="HYBRID">Hybrid</option>
              <option value="ONSITE">Onsite</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
            <select className="select" value={experienceFilter} onChange={(e) => setExperienceFilter(e.target.value as any)}>
              <option value="ALL">All experience</option>
              <option value="INTERNSHIP">Internship</option>
              <option value="ENTRY">Entry level</option>
              <option value="MID">Mid level</option>
              <option value="SENIOR">Senior</option>
              <option value="STAFF">Staff / Principal</option>
              <option value="MANAGER">Lead / Manager</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
            <select className="select" value={jobTypeFilter} onChange={(e) => setJobTypeFilter(e.target.value as any)}>
              <option value="ALL">All job types</option>
              <option value="FULL_TIME">Full time</option>
              <option value="PART_TIME">Part time</option>
              <option value="CONTRACT">Contract</option>
              <option value="INTERNSHIP">Internship</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
            <select className="select" value={postedFilter} onChange={(e) => setPostedFilter(e.target.value as any)}>
              <option value="ANY">Any posted date</option>
              <option value="24H">Last 24h</option>
              <option value="3D">Last 3 days</option>
              <option value="7D">Last 7 days</option>
              <option value="14D">Last 14 days</option>
              <option value="30D">Last 30 days</option>
            </select>
            <select className="select" value={sponsorshipFilter} onChange={(e) => setSponsorshipFilter(e.target.value as any)}>
              <option value="ALL">All sponsorship</option>
              <option value="SPONSORSHIP_AVAILABLE">Sponsorship available</option>
              <option value="H1B">H1B</option>
              <option value="OPT">OPT</option>
              <option value="STEM_OPT">STEM OPT</option>
              <option value="CPT">CPT</option>
              <option value="NO_SPONSORSHIP">No sponsorship</option>
            </select>
            <input className="input" placeholder="City" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} />
            <input
              className="input"
              placeholder="Country"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
            />
            <input
              className="input"
              placeholder="Min salary (k)"
              value={salaryMinFilter}
              onChange={(e) => setSalaryMinFilter(e.target.value.replace(/[^\d]/g, ""))}
            />
            <input
              className="input"
              placeholder="Max salary (k)"
              value={salaryMaxFilter}
              onChange={(e) => setSalaryMaxFilter(e.target.value.replace(/[^\d]/g, ""))}
            />
          </div>
          <div className="form-actions">
            <button
              type="button"
              className={`btn btn-sm ${salaryKnownOnly ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setSalaryKnownOnly((v) => !v)}
            >
              {salaryKnownOnly ? "Salary known only" : "Include unknown salary"}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setLocationFilter("ALL");
                setExperienceFilter("ALL");
                setJobTypeFilter("ALL");
                setPostedFilter("ANY");
                setSponsorshipFilter("ALL");
                setSourceFilter("ALL");
                setCityFilter("");
                setCountryFilter("");
                setSalaryMinFilter("");
                setSalaryMaxFilter("");
                setSalaryKnownOnly(false);
              }}
            >
              Reset filters
            </button>
          </div>
        </details>
        <p className="kpi-title" style={{ marginTop: "8px" }}>{filteredJobs.length} jobs match filters</p>
      </div>

      <div className="job-masonry">
      {filteredJobs.map(({ job, signals }) => (
        <div
          className={`card elevated-card premium-job-card ${expandedId === job.id ? "expanded" : ""} ${appliedPulseId === job.id ? "apply-pulse" : ""}`}
          key={job.id}
          onMouseEnter={() => setExpandedId(job.id)}
          onMouseLeave={() => setExpandedId((current) => (current === job.id ? null : current))}
        >
          <h3>{job.title}</h3>
          <p className="kpi-title">{job.company?.name ?? "Unknown"}</p>
          <p className="kpi-title">{job.source ?? "Direct"}</p>
          <p className="kpi-title">
            {signals.location} · {signals.experience} · {signals.jobType} · Posted {signals.postedDays}d ago
          </p>
          {(signals.city || signals.country) ? (
            <p className="kpi-title">
              {[signals.city, signals.country].filter(Boolean).join(", ")}
            </p>
          ) : null}
          <p className="kpi-title">{formatSalary(signals.salary)}</p>
          <div className="timeline-micro" aria-hidden>
            <div className="timeline-track">
              <div className="timeline-fill" style={{ width: `${Math.max(8, 100 - Math.min(95, signals.postedDays * 3))}%` }} />
            </div>
            <small>{signals.postedDays}d freshness window</small>
          </div>
          <div className="job-signal-row">
            <span className="badge intent-badge">Hiring Intent {getHiringIntent(signals, job.isVerified)}%</span>
            <span className={`badge subtle ghost-badge ${getGhostRisk(signals, job.isVerified) > 58 ? "risk" : ""}`}>
              Ghost Risk {getGhostRisk(signals, job.isVerified)}%
            </span>
          </div>
          <div className="job-chip-row">
            {signals.sponsorship.hasH1B && <span className="badge subtle">H1B</span>}
            {signals.sponsorship.hasOPT && <span className="badge subtle">OPT</span>}
            {signals.sponsorship.hasSTEMOPT && <span className="badge subtle">STEM OPT</span>}
            {signals.sponsorship.hasCPT && <span className="badge subtle">CPT</span>}
            {signals.sponsorship.saysNoSponsorship && <span className="badge subtle">No sponsorship</span>}
          </div>
          <details className="ai-explain" open={expandedId === job.id}>
            <summary>AI Match Explanation</summary>
            <p className="kpi-title">
              Strong fit due to {signals.location === "REMOTE" ? "remote flexibility" : "location compatibility"},
              {signals.salary ? " listed compensation transparency," : " role clarity,"} and
              {signals.experience !== "UNKNOWN" ? ` ${signals.experience.toLowerCase()} level targeting.` : " role-level alignment."}
            </p>
            <p className="kpi-title">
              Resume recommendation: {signals.experience === "SENIOR" || signals.experience === "STAFF" ? "Use leadership-heavy resume variant." : "Use execution-focused resume variant."}
            </p>
          </details>
          {job.isVerified && <span className="badge">Verified</span>}
          <div className="form-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => apply(job.id)}>
              Apply
            </button>
            {job.url ? (
              <a href={job.url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                View post
              </a>
            ) : null}
          </div>
        </div>
      ))}
      </div>

      {!filteredJobs.length && (
        <div className="card glass-card">
          <h3>No matching roles</h3>
          <p className="kpi-title">Try clearing filters or run AI-targeted discovery for better fit roles.</p>
          <div className="list-stack" style={{ marginTop: "10px" }}>
            <button type="button" className="command-item" onClick={syncJobs}>
              <span>AI Suggestion: Expand to hybrid roles in top 3 cities</span>
            </button>
            <button type="button" className="command-item" onClick={() => setExperienceFilter("ENTRY")}>
              <span>AI Suggestion: Switch to entry-level + recent postings</span>
            </button>
            <button type="button" className="command-item" onClick={() => setSponsorshipFilter("SPONSORSHIP_AVAILABLE")}>
              <span>AI Suggestion: Filter to sponsorship-friendly companies</span>
            </button>
          </div>
        </div>
      )}
      {message && <p className="status-text">{message}</p>}
    </div>
  );
}
