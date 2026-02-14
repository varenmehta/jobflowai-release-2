export type DiscoveredJob = {
  title: string;
  companyName: string;
  description?: string;
  url?: string;
  source: string;
  isVerified?: boolean;
  location?: string;
  city?: string;
  country?: string;
};

type DiscoveryInput = {
  targetRoles: string[];
  locations: string[];
  limit: number;
};

function normalize(text: string) {
  return text.trim().toLowerCase();
}

function scoreRelevance(job: DiscoveredJob, targetRoles: string[], locations: string[]) {
  const title = normalize(job.title);
  const company = normalize(job.companyName);
  const location = normalize(job.location ?? "");
  const description = normalize(job.description ?? "");

  let score = 0;
  for (const role of targetRoles) {
    const r = normalize(role);
    if (!r) continue;
    if (title.includes(r)) score += 6;
    else if (description.includes(r)) score += 3;
  }

  for (const loc of locations) {
    const l = normalize(loc);
    if (!l) continue;
    if (location.includes(l)) score += 4;
    else if (description.includes(l)) score += 2;
  }

  if (title.includes("senior")) score += 1;
  if (title.includes("staff")) score += 1;
  if (company.length > 0) score += 1;
  return score;
}

async function fetchRemotive(input: DiscoveryInput): Promise<DiscoveredJob[]> {
  const keyword = encodeURIComponent(input.targetRoles.slice(0, 3).join(" "));
  const url = `https://remotive.com/api/remote-jobs?search=${keyword}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    jobs?: Array<{
      title?: string;
      company_name?: string;
      description?: string;
      url?: string;
      candidate_required_location?: string;
    }>;
  };

  return (data.jobs ?? [])
    .filter((job) => job.title && job.company_name)
    .map((job) => ({
      title: job.title ?? "",
      companyName: job.company_name ?? "",
      description: job.description ?? "",
      url: job.url ?? "",
      source: "Remotive",
      location: job.candidate_required_location ?? "",
      city: "",
      country: "",
      isVerified: false,
    }));
}

async function fetchArbeitnow(input: DiscoveryInput): Promise<DiscoveredJob[]> {
  const res = await fetch("https://www.arbeitnow.com/api/job-board-api", { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    data?: Array<{
      title?: string;
      company_name?: string;
      description?: string;
      remote?: boolean;
      location?: string;
      url?: string;
      slug?: string;
    }>;
  };

  return (data.data ?? [])
    .filter((job) => job.title && job.company_name)
    .map((job) => ({
      title: job.title ?? "",
      companyName: job.company_name ?? "",
      description: job.description ?? "",
      url: job.url ?? (job.slug ? `https://www.arbeitnow.com/jobs/${job.slug}` : ""),
      source: "Arbeitnow",
      location: job.remote ? "Remote" : (job.location ?? ""),
      city: "",
      country: "",
      isVerified: false,
    }));
}

export async function discoverJobs(input: DiscoveryInput) {
  const settled = await Promise.allSettled([fetchRemotive(input), fetchArbeitnow(input)]);
  const jobs = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));

  const deduped = new Map<string, DiscoveredJob>();
  for (const job of jobs) {
    const key = job.url
      ? `url:${normalize(job.url)}`
      : `title:${normalize(job.title)}|company:${normalize(job.companyName)}`;
    if (!deduped.has(key)) {
      deduped.set(key, job);
    }
  }

  const ranked = [...deduped.values()]
    .map((job) => ({
      job,
      score: scoreRelevance(job, input.targetRoles, input.locations),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit)
    .map((entry) => entry.job);

  return ranked;
}
