import { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { detectStatusFromText, getGmailClient } from "@/lib/gmail";
import { createNotification } from "@/lib/notifications";

type SyncInput = {
  userId: string;
  accessToken: string;
  rangeDays?: number;
  maxPages?: number;
  fullInbox?: boolean;
};

type CandidateApplication = {
  id: string;
  status: ApplicationStatus;
  lastActivityAt: Date;
  job: {
    title: string;
    company: { name: string } | null;
  };
};

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function extractPayloadText(payload?: {
  body?: { data?: string | null };
  parts?: Array<{
    mimeType?: string | null;
    body?: { data?: string | null };
    parts?: Array<{
      mimeType?: string | null;
      body?: { data?: string | null };
      parts?: unknown;
    }> | null;
  }> | null;
}): string {
  if (!payload) return "";
  const chunks: string[] = [];

  const walk = (node: { mimeType?: string | null; body?: { data?: string | null }; parts?: any[] | null }) => {
    const mime = (node.mimeType ?? "").toLowerCase();
    const data = node.body?.data;
    if (data && (!mime || mime.startsWith("text/plain") || mime.startsWith("text/html"))) {
      try {
        chunks.push(decodeBase64Url(data));
      } catch {
        // Ignore decode failures and keep parsing remaining parts.
      }
    }
    for (const part of node.parts ?? []) walk(part);
  };

  walk(payload);
  return chunks.join(" ");
}

function tokens(text: string) {
  return normalize(text)
    .split(" ")
    .filter((part) => part.length >= 3);
}

function extractEmailDomainLabel(fromAddress: string) {
  const match = fromAddress.toLowerCase().match(/@([a-z0-9.-]+\.[a-z]{2,})/);
  if (!match) return "";
  const domain = match[1];
  const label = domain.split(".")[0] ?? "";
  if (["gmail", "googlemail", "yahoo", "hotmail", "outlook", "live"].includes(label)) return "";
  return label;
}

function extractDisplayName(fromAddress: string) {
  const trimmed = fromAddress.trim();
  const angle = trimmed.match(/^(.+?)\s*</);
  if (angle?.[1]) return angle[1].replace(/["']/g, "").trim();
  return trimmed.replace(/<.*>/, "").replace(/["']/g, "").trim();
}

function extractCompanyHint(text: string) {
  const patterns = [
    /application (?:to|for)\s+([a-z0-9&'().,\-\s]{2,60})/i,
    /interview with\s+([a-z0-9&'().,\-\s]{2,60})/i,
    /update from\s+([a-z0-9&'().,\-\s]{2,60})/i,
    /opportunity at\s+([a-z0-9&'().,\-\s]{2,60})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return normalize(match[1]).split(" ").slice(0, 4).join(" ");
    }
  }
  return "";
}

function toTitleCase(input: string) {
  return input
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function deriveCompanyName(subject: string, snippet: string, fromAddress: string) {
  const text = `${subject}\n${snippet}\n${fromAddress}`;
  const explicit = extractCompanyHint(text);
  if (explicit) return toTitleCase(explicit);

  const displayName = normalize(extractDisplayName(fromAddress));
  if (displayName && !/(no reply|noreply|notifications?|careers?|talent|recruiting|team)/i.test(displayName)) {
    return toTitleCase(displayName.split(" ").slice(0, 4).join(" "));
  }

  const domainLabel = extractEmailDomainLabel(fromAddress);
  if (domainLabel && !/(greenhouse|lever|ashby|workday|myworkdayjobs|smartrecruiters|jobvite|icims|jazzhr)/i.test(domainLabel)) {
    return toTitleCase(domainLabel.replace(/[^a-z0-9]+/gi, " "));
  }

  return "";
}

function deriveRoleTitle(subject: string) {
  const match =
    subject.match(/(?:for|as)\s+(.+?)\s+(?:at|with)\s+/i) ??
    subject.match(/application (?:for|to)\s+(.+?)\s*$/i);
  if (match?.[1]) {
    const value = normalize(match[1]).slice(0, 80);
    if (value.length >= 3) return toTitleCase(value);
  }
  return "Application from Gmail";
}

async function createApplicationFromEmail(params: {
  userId: string;
  subject: string;
  snippet: string;
  fromAddress: string;
  detectedStatus: ApplicationStatus;
  occurredAt: Date;
}) {
  const companyName = deriveCompanyName(params.subject, params.snippet, params.fromAddress);
  if (!companyName) return null;

  const roleTitle = deriveRoleTitle(params.subject);

  const existing = await prisma.application.findFirst({
    where: {
      userId: params.userId,
      job: {
        title: roleTitle,
        company: { name: companyName },
      },
    },
    include: { job: { include: { company: true } } },
  });

  if (existing) {
    await prisma.application.update({
      where: { id: existing.id },
      data: {
        status: params.detectedStatus === "APPLIED" ? existing.status : params.detectedStatus,
        lastActivityAt: params.occurredAt,
      },
    });
    return { ...existing, status: params.detectedStatus, lastActivityAt: params.occurredAt };
  }

  const company = await prisma.company.upsert({
    where: { name: companyName },
    update: {},
    create: { name: companyName },
  });

  const job = await prisma.job.create({
    data: {
      title: roleTitle,
      source: "Gmail Sync",
      description: params.subject,
      companyId: company.id,
    },
  });

  const application = await prisma.application.create({
    data: {
      userId: params.userId,
      jobId: job.id,
      status: params.detectedStatus,
      lastActivityAt: params.occurredAt,
    },
    include: { job: { include: { company: true } } },
  });

  return application;
}

function scoreApplicationMatch(application: CandidateApplication, combinedText: string, fromAddress: string) {
  const companyName = application.job.company?.name ?? "";
  const companyNorm = normalize(companyName);
  const titleNorm = normalize(application.job.title);
  const text = normalize(combinedText);
  const from = fromAddress.toLowerCase();
  const domainLabel = extractEmailDomainLabel(fromAddress);
  const displayName = normalize(extractDisplayName(fromAddress));
  const companyHint = extractCompanyHint(`${fromAddress} ${combinedText}`);
  const atsDomains = new Set([
    "greenhouse",
    "lever",
    "ashby",
    "workday",
    "myworkdayjobs",
    "smartrecruiters",
    "jobvite",
    "icims",
    "jazzhr",
  ]);
  let score = 0;

  if (companyNorm && text.includes(companyNorm)) score += 7;

  const companyTokens = tokens(companyNorm).slice(0, 4);
  for (const token of companyTokens) {
    if (text.includes(token)) score += 1;
  }

  const roleTokens = tokens(titleNorm).slice(0, 5);
  const roleMatches = roleTokens.filter((token) => text.includes(token)).length;
  if (roleMatches >= 2) score += 3;
  else if (roleMatches === 1) score += 1;

  if (companyTokens.length && companyTokens.some((token) => from.includes(token))) {
    score += 2;
  }

  if (companyTokens.length && companyTokens.some((token) => displayName.includes(token))) {
    score += 3;
  }

  if (companyHint) {
    if (companyNorm.includes(companyHint) || companyHint.includes(companyNorm)) score += 5;
    else if (companyTokens.some((token) => companyHint.includes(token) || token.includes(companyHint))) score += 3;
  }

  if (domainLabel && !atsDomains.has(domainLabel)) {
    if (companyNorm.includes(domainLabel) || domainLabel.includes(companyTokens[0] ?? "")) {
      score += 4;
    } else if (companyTokens.some((token) => domainLabel.includes(token) || token.includes(domainLabel))) {
      score += 2;
    }
  }

  return score;
}

function pickApplication(applications: CandidateApplication[], subject: string, snippet: string, fromAddress: string) {
  if (!applications.length) return null;
  const combined = `${subject} ${snippet} ${fromAddress}`;

  let best: CandidateApplication | null = null;
  let bestScore = -1;

  for (const application of applications) {
    const score = scoreApplicationMatch(application, combined, fromAddress);
    if (score > bestScore) {
      bestScore = score;
      best = application;
    }
  }

  if (bestScore < 1) return null;
  return best;
}

function nextStatus(current: ApplicationStatus, detected: ApplicationStatus) {
  if (current === "REJECTED") return null;
  if (detected === "APPLIED") {
    if (current === "WITHDRAWN") return "APPLIED";
    return null;
  }
  if (detected === "REJECTED") return "REJECTED";
  if (detected === "OFFER") return current === "OFFER" ? null : "OFFER";
  if (detected === "INTERVIEW") {
    if (current === "APPLIED" || current === "SCREENING" || current === "WITHDRAWN") return "INTERVIEW";
    return null;
  }
  if (detected === "SCREENING") {
    if (current === "APPLIED" || current === "WITHDRAWN") return "SCREENING";
    return null;
  }
  return null;
}

export async function syncGmailEventsToPipeline(input: SyncInput) {
  const rangeDays = input.rangeDays ?? 30;
  const maxPages = input.maxPages ?? 3;
  const fullInbox = input.fullInbox === true;
  const gmail = getGmailClient(input.accessToken);

  const applications = await prisma.application.findMany({
    where: { userId: input.userId },
    include: { job: { include: { company: true } } },
  });

  const messages: Array<{ id?: string | null }> = [];
  let nextPageToken: string | undefined;
  let pages = 0;
  do {
    const list = await gmail.users.messages.list({
      userId: "me",
      maxResults: 50,
      pageToken: nextPageToken,
      q: fullInbox ? "in:inbox" : `newer_than:${rangeDays}d`,
    });
    messages.push(...(list.data.messages ?? []));
    nextPageToken = list.data.nextPageToken ?? undefined;
    pages += 1;
  } while (nextPageToken && pages < maxPages);

  await prisma.emailSync.upsert({
    where: { userId_provider: { userId: input.userId, provider: "GMAIL" } },
    update: { status: "ACTIVE" },
    create: { userId: input.userId, provider: "GMAIL", status: "ACTIVE" },
  });

  let created = 0;
  let pipelineUpdates = 0;
  let activityTouches = 0;
  let detectedEvents = 0;
  let matchedEvents = 0;
  let createdApplications = 0;

  for (const msg of messages) {
    if (!msg.id) continue;
    const existing = await prisma.emailEvent.findFirst({
      where: {
        userId: input.userId,
        provider: "GMAIL",
        sourceMessageId: msg.id,
      },
      select: { id: true },
    });
    if (existing) continue;

    const detail = await gmail.users.messages.get({ userId: "me", id: msg.id, format: "full" });
    const headers = detail.data.payload?.headers ?? [];
    const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
    const fromAddress = headers.find((h) => h.name === "From")?.value ?? "";
    const snippet = detail.data.snippet ?? "";
    const fullText = extractPayloadText(detail.data.payload as any);
    const occurredAt = detail.data.internalDate ? new Date(Number(detail.data.internalDate)) : new Date();
    const detected = detectStatusFromText(`${subject} ${snippet} ${fullText}`);
    const matched = pickApplication(applications, `${subject} ${fullText}`, snippet, fromAddress);
    if (detected) detectedEvents += 1;

    await prisma.emailEvent.create({
      data: {
        userId: input.userId,
        provider: "GMAIL",
        subject,
        fromAddress,
        snippet,
        detectedStatus: detected ?? undefined,
        detectedCompany: matched?.job.company?.name ?? undefined,
        detectedRole: matched?.job.title ?? undefined,
        sourceMessageId: msg.id,
        occurredAt,
      },
    });
    created += 1;

    if (matched && detected) {
      matchedEvents += 1;
      const next = nextStatus(matched.status, detected);
      if (next) {
        await prisma.application.update({
          where: { id: matched.id },
          data: {
            status: next,
            lastActivityAt: occurredAt,
          },
        });
        matched.status = next;
        pipelineUpdates += 1;
      } else if (
        detected === "APPLIED" &&
        (matched.status === "APPLIED" || matched.status === "WITHDRAWN")
      ) {
        const refreshedStatus = matched.status === "WITHDRAWN" ? "APPLIED" : matched.status;
        await prisma.application.update({
          where: { id: matched.id },
          data: {
            status: refreshedStatus,
            lastActivityAt: occurredAt,
          },
        });
        matched.status = refreshedStatus;
        matched.lastActivityAt = occurredAt;
        activityTouches += 1;
      }
    } else if (detected) {
      const createdFromEmail = await createApplicationFromEmail({
        userId: input.userId,
        subject,
        snippet,
        fromAddress,
        detectedStatus: detected,
        occurredAt,
      });
      if (createdFromEmail) {
        applications.push(createdFromEmail);
        createdApplications += 1;
        pipelineUpdates += 1;
      }
    }
  }

  // Backfill pass: older synced emails (created before pipeline-mapping logic) can still drive status updates.
  // This keeps existing tracked inbox history useful without requiring brand-new emails.
  const historicalEvents = await prisma.emailEvent.findMany({
    where: {
      userId: input.userId,
      provider: "GMAIL",
      ...(fullInbox ? {} : { occurredAt: { gte: new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000) } }),
    },
    orderBy: { occurredAt: "desc" },
    take: 300,
    select: {
      subject: true,
      snippet: true,
      fromAddress: true,
      detectedStatus: true,
      sourceMessageId: true,
      occurredAt: true,
    },
  });

  for (const event of historicalEvents) {
    let historicalText = `${event.subject} ${event.snippet ?? ""}`;
    if (event.sourceMessageId) {
      try {
        const detail = await gmail.users.messages.get({ userId: "me", id: event.sourceMessageId, format: "full" });
        historicalText = `${historicalText} ${extractPayloadText(detail.data.payload as any)}`.trim();
      } catch {
        // Keep fallback to existing stored text if message fetch fails.
      }
    }

    const matched = pickApplication(applications, historicalText, event.snippet ?? "", event.fromAddress ?? "");
    const detectedFromHistory = event.detectedStatus ?? detectStatusFromText(historicalText);

    if (!detectedFromHistory) continue;
    detectedEvents += 1;
    if (!matched) {
      const createdFromHistory = await createApplicationFromEmail({
        userId: input.userId,
        subject: event.subject,
        snippet: event.snippet ?? "",
        fromAddress: event.fromAddress ?? "",
        detectedStatus: detectedFromHistory,
        occurredAt: event.occurredAt,
      });
      if (createdFromHistory) {
        applications.push(createdFromHistory);
        createdApplications += 1;
        pipelineUpdates += 1;
      }
      continue;
    }
    matchedEvents += 1;
    const next = nextStatus(matched.status, detectedFromHistory);
    if (!next) {
      if (
        detectedFromHistory === "APPLIED" &&
        (matched.status === "APPLIED" || matched.status === "WITHDRAWN") &&
        event.occurredAt.getTime() > matched.lastActivityAt.getTime()
      ) {
        const refreshedStatus = matched.status === "WITHDRAWN" ? "APPLIED" : matched.status;
        await prisma.application.update({
          where: { id: matched.id },
          data: {
            status: refreshedStatus,
            lastActivityAt: event.occurredAt,
          },
        });
        matched.status = refreshedStatus;
        matched.lastActivityAt = event.occurredAt;
        activityTouches += 1;
      }
      continue;
    }

    await prisma.application.update({
      where: { id: matched.id },
      data: {
        status: next,
        lastActivityAt: event.occurredAt,
      },
    });
    matched.status = next;
    pipelineUpdates += 1;
  }

  await prisma.emailSync.updateMany({
    where: { userId: input.userId, provider: "GMAIL" },
    data: { lastSyncedAt: new Date(), status: "ACTIVE" },
  });

  if (pipelineUpdates > 0) {
    await createNotification({
      userId: input.userId,
      type: "APP_STATUS",
      title: "Pipeline updated from Gmail",
      body: `${pipelineUpdates} application statuses were updated from inbox signals.`,
      href: "/pipeline",
    });
  }

  return {
    created,
    scanned: messages.length,
    rangeDays,
    pipelineUpdates,
    activityTouches,
    detectedEvents,
    matchedEvents,
    createdApplications,
    applicationsCount: applications.length,
    historicalEventsCount: historicalEvents.length,
  };
}
