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

type JsonRecord = Record<string, unknown>;

const SOURCE_CONFIDENCE: Record<string, number> = {
  USAJobs: 8,
  Greenhouse: 9,
  Lever: 8,
  Adzuna: 6,
  JSearch: 6,
  Handshake: 7,
  LinkedIn: 7,
  Remotive: 6,
  Arbeitnow: 5,
};

function normalize(text: string) {
  return text.trim().toLowerCase();
}

function pickString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function parseLocation(location: string) {
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    return { city: "", country: "" };
  }

  if (parts.length === 1) {
    return { city: parts[0], country: "" };
  }

  return {
    city: parts[0],
    country: parts[parts.length - 1],
  };
}

function sanitizeJob(job: DiscoveredJob): DiscoveredJob | null {
  const title = pickString(job.title).trim();
  const companyName = pickString(job.companyName).trim();
  if (!title || !companyName) return null;

  const location = pickString(job.location);
  const parsed = parseLocation(location);

  return {
    title,
    companyName,
    description: pickString(job.description),
    url: pickString(job.url),
    source: pickString(job.source),
    isVerified: Boolean(job.isVerified),
    location,
    city: job.city ?? parsed.city,
    country: job.country ?? parsed.country,
  };
}

function scoreRelevance(job: DiscoveredJob, targetRoles: string[], locations: string[]) {
  const title = normalize(job.title);
  const company = normalize(job.companyName);
  const location = normalize(job.location ?? "");
  const description = normalize(job.description ?? "");

  let score = SOURCE_CONFIDENCE[job.source] ?? 4;

  for (const role of targetRoles) {
    const r = normalize(role);
    if (!r) continue;
    if (title.includes(r)) score += 8;
    else if (description.includes(r)) score += 4;
  }

  for (const loc of locations) {
    const l = normalize(loc);
    if (!l) continue;
    if (location.includes(l)) score += 5;
    else if (description.includes(l)) score += 2;
  }

  if (title.includes("senior")) score += 1;
  if (title.includes("staff")) score += 1;
  if (title.includes("lead")) score += 1;
  if (company.length > 0) score += 1;

  return score;
}

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchRemotive(input: DiscoveryInput): Promise<DiscoveredJob[]> {
  const keyword = encodeURIComponent(input.targetRoles.slice(0, 3).join(" "));
  const url = `https://remotive.com/api/remote-jobs?search=${keyword}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];

  const data = await safeJson<{
    jobs?: Array<{
      title?: string;
      company_name?: string;
      description?: string;
      url?: string;
      candidate_required_location?: string;
    }>;
  }>(res);
  if (!data) return [];

  return (data.jobs ?? [])
    .map((job) =>
      sanitizeJob({
        title: job.title ?? "",
        companyName: job.company_name ?? "",
        description: job.description ?? "",
        url: job.url ?? "",
        source: "Remotive",
        location: job.candidate_required_location ?? "",
        isVerified: false,
      }),
    )
    .filter((job): job is DiscoveredJob => Boolean(job));
}

async function fetchArbeitnow(): Promise<DiscoveredJob[]> {
  const res = await fetch("https://www.arbeitnow.com/api/job-board-api", { cache: "no-store" });
  if (!res.ok) return [];

  const data = await safeJson<{
    data?: Array<{
      title?: string;
      company_name?: string;
      description?: string;
      remote?: boolean;
      location?: string;
      url?: string;
      slug?: string;
    }>;
  }>(res);
  if (!data) return [];

  return (data.data ?? [])
    .map((job) =>
      sanitizeJob({
        title: job.title ?? "",
        companyName: job.company_name ?? "",
        description: job.description ?? "",
        url: job.url ?? (job.slug ? `https://www.arbeitnow.com/jobs/${job.slug}` : ""),
        source: "Arbeitnow",
        location: job.remote ? "Remote" : (job.location ?? ""),
        isVerified: false,
      }),
    )
    .filter((job): job is DiscoveredJob => Boolean(job));
}

async function fetchUSAJobs(input: DiscoveryInput): Promise<DiscoveredJob[]> {
  const apiKey = process.env.USAJOBS_API_KEY;
  const userAgent = process.env.USAJOBS_USER_AGENT;
  if (!apiKey || !userAgent) return [];

  const keyword = encodeURIComponent(input.targetRoles.slice(0, 3).join(" OR ") || "software");
  const location = encodeURIComponent(input.locations[0] ?? "United States");
  const url = `https://data.usajobs.gov/api/search?Keyword=${keyword}&LocationName=${location}&ResultsPerPage=${Math.min(50, input.limit)}`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "Authorization-Key": apiKey,
      "User-Agent": userAgent,
      Host: "data.usajobs.gov",
    },
  });
  if (!res.ok) return [];

  const data = await safeJson<{
    SearchResult?: {
      SearchResultItems?: Array<{
        MatchedObjectDescriptor?: {
          PositionTitle?: string;
          PositionURI?: string;
          OrganizationName?: string;
          QualificationSummary?: string;
          PositionLocationDisplay?: string;
        };
      }>;
    };
  }>(res);
  if (!data) return [];

  return (data.SearchResult?.SearchResultItems ?? [])
    .map((item) => {
      const descriptor = item.MatchedObjectDescriptor;
      return sanitizeJob({
        title: descriptor?.PositionTitle ?? "",
        companyName: descriptor?.OrganizationName ?? "US Government",
        description: descriptor?.QualificationSummary ?? "",
        url: descriptor?.PositionURI ?? "",
        source: "USAJobs",
        location: descriptor?.PositionLocationDisplay ?? "United States",
        isVerified: true,
      });
    })
    .filter((job): job is DiscoveredJob => Boolean(job));
}

async function fetchGreenhouseBoards(): Promise<DiscoveredJob[]> {
  const tokens = (process.env.GREENHOUSE_BOARD_TOKENS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!tokens.length) return [];

  const settled = await Promise.allSettled(
    tokens.map(async (token) => {
      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs`, {
        cache: "no-store",
      });
      if (!res.ok) return [] as DiscoveredJob[];
      const data = await safeJson<{
        jobs?: Array<{
          title?: string;
          absolute_url?: string;
          location?: { name?: string };
          content?: string;
        }>;
      }>(res);
      if (!data) return [];

      return (data.jobs ?? [])
        .map((job) =>
          sanitizeJob({
            title: job.title ?? "",
            companyName: token,
            description: job.content ?? "",
            url: job.absolute_url ?? "",
            source: "Greenhouse",
            location: job.location?.name ?? "",
            isVerified: true,
          }),
        )
        .filter((job): job is DiscoveredJob => Boolean(job));
    }),
  );

  return settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

async function fetchLeverBoards(): Promise<DiscoveredJob[]> {
  const companies = (process.env.LEVER_COMPANIES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!companies.length) return [];

  const settled = await Promise.allSettled(
    companies.map(async (company) => {
      const res = await fetch(`https://api.lever.co/v0/postings/${encodeURIComponent(company)}?mode=json`, {
        cache: "no-store",
      });
      if (!res.ok) return [] as DiscoveredJob[];

      const data = await safeJson<
        Array<{
          text?: string;
          hostedUrl?: string;
          descriptionPlain?: string;
          categories?: { location?: string; commitment?: string; team?: string };
        }>
      >(res);
      if (!data) return [];

      return data
        .map((job) =>
          sanitizeJob({
            title: job.text ?? "",
            companyName: company,
            description: job.descriptionPlain ?? "",
            url: job.hostedUrl ?? "",
            source: "Lever",
            location: job.categories?.location ?? "",
            isVerified: true,
          }),
        )
        .filter((job): job is DiscoveredJob => Boolean(job));
    }),
  );

  return settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

async function fetchAdzuna(input: DiscoveryInput): Promise<DiscoveredJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];

  const what = encodeURIComponent(input.targetRoles.slice(0, 2).join(" ") || "software engineer");
  const where = encodeURIComponent(input.locations[0] ?? "United States");

  const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(appKey)}&results_per_page=${Math.min(50, input.limit)}&what=${what}&where=${where}&content-type=application/json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];

  const data = await safeJson<{
    results?: Array<{
      title?: string;
      redirect_url?: string;
      description?: string;
      company?: { display_name?: string };
      location?: { display_name?: string; area?: string[] };
    }>;
  }>(res);
  if (!data) return [];

  return (data.results ?? [])
    .map((job) =>
      sanitizeJob({
        title: job.title ?? "",
        companyName: job.company?.display_name ?? "Unknown",
        description: job.description ?? "",
        url: job.redirect_url ?? "",
        source: "Adzuna",
        location: job.location?.display_name ?? "",
        country: job.location?.area?.[0] ?? "",
        city: job.location?.area?.[1] ?? "",
        isVerified: false,
      }),
    )
    .filter((job): job is DiscoveredJob => Boolean(job));
}

async function fetchJSearch(input: DiscoveryInput): Promise<DiscoveredJob[]> {
  const rapidKey = process.env.RAPIDAPI_KEY;
  if (!rapidKey) return [];

  const host = process.env.JSEARCH_API_HOST ?? "jsearch.p.rapidapi.com";
  const query = encodeURIComponent(`${input.targetRoles.slice(0, 2).join(" OR ")} in United States`);
  const url = `https://${host}/search?query=${query}&num_pages=1`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "x-rapidapi-key": rapidKey,
      "x-rapidapi-host": host,
    },
  });
  if (!res.ok) return [];

  const data = await safeJson<{
    data?: Array<{
      job_title?: string;
      employer_name?: string;
      job_description?: string;
      job_apply_link?: string;
      job_city?: string;
      job_country?: string;
      job_is_remote?: boolean;
    }>;
  }>(res);
  if (!data) return [];

  return (data.data ?? [])
    .map((job) =>
      sanitizeJob({
        title: job.job_title ?? "",
        companyName: job.employer_name ?? "Unknown",
        description: job.job_description ?? "",
        url: job.job_apply_link ?? "",
        source: "JSearch",
        location: job.job_is_remote ? "Remote" : [job.job_city, job.job_country].filter(Boolean).join(", "),
        city: job.job_city ?? "",
        country: job.job_country ?? "",
        isVerified: false,
      }),
    )
    .filter((job): job is DiscoveredJob => Boolean(job));
}

async function fetchProxySource(opts: {
  sourceName: string;
  url?: string;
  token?: string;
  input: DiscoveryInput;
}): Promise<DiscoveredJob[]> {
  const endpoint = opts.url?.trim();
  if (!endpoint) return [];

  const body = {
    targetRoles: opts.input.targetRoles,
    locations: opts.input.locations,
    limit: opts.input.limit,
  };

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  const res = await fetch(endpoint, {
    method: "POST",
    cache: "no-store",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) return [];

  const data = await safeJson<{ jobs?: Array<JsonRecord> }>(res);
  if (!data?.jobs) return [];

  return data.jobs
    .map((item) =>
      sanitizeJob({
        title: pickString(item.title),
        companyName: pickString(item.companyName || item.company || item.employer),
        description: pickString(item.description),
        url: pickString(item.url || item.applyUrl),
        source: opts.sourceName,
        location: pickString(item.location),
        city: pickString(item.city),
        country: pickString(item.country),
        isVerified: Boolean(item.isVerified),
      }),
    )
    .filter((job): job is DiscoveredJob => Boolean(job));
}

function dedupeJobs(jobs: DiscoveredJob[]) {
  const deduped = new Map<string, DiscoveredJob>();

  for (const job of jobs) {
    const urlKey = job.url ? `url:${normalize(job.url)}` : "";
    const identityKey = `title:${normalize(job.title)}|company:${normalize(job.companyName)}|loc:${normalize(job.location ?? "")}`;
    const key = urlKey || identityKey;

    if (!deduped.has(key)) {
      deduped.set(key, job);
      continue;
    }

    const existing = deduped.get(key)!;
    const existingConfidence = SOURCE_CONFIDENCE[existing.source] ?? 0;
    const incomingConfidence = SOURCE_CONFIDENCE[job.source] ?? 0;
    if (incomingConfidence > existingConfidence) {
      deduped.set(key, job);
    }
  }

  return [...deduped.values()];
}

export async function discoverJobs(input: DiscoveryInput) {
  const settled = await Promise.allSettled([
    fetchUSAJobs(input),
    fetchGreenhouseBoards(),
    fetchLeverBoards(),
    fetchAdzuna(input),
    fetchJSearch(input),
    fetchProxySource({
      sourceName: "Handshake",
      url: process.env.HANDSHAKE_API_URL,
      token: process.env.HANDSHAKE_API_TOKEN,
      input,
    }),
    fetchProxySource({
      sourceName: "LinkedIn",
      url: process.env.LINKEDIN_JOBS_API_URL,
      token: process.env.LINKEDIN_JOBS_API_TOKEN,
      input,
    }),
    fetchRemotive(input),
    fetchArbeitnow(),
  ]);

  const jobs = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const deduped = dedupeJobs(jobs);

  const ranked = deduped
    .map((job) => ({
      job,
      score: scoreRelevance(job, input.targetRoles, input.locations),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit)
    .map((entry) => entry.job);

  return ranked;
}
