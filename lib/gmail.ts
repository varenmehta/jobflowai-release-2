import { google } from "googleapis";
import { ApplicationStatus } from "@prisma/client";

export function getGmailClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

export const STATUS_PATTERNS: Array<{ status: ApplicationStatus; pattern: RegExp }> = [
  {
    status: "APPLIED",
    pattern:
      /application (?:has been )?received|thanks for applying|thank you for applying|your application (?:was|has been) submitted/i,
  },
  { status: "SCREENING", pattern: /phone screen|screening|recruiter call|initial call|assessment/i },
  {
    status: "INTERVIEW",
    pattern: /interview|schedule a call|interview round|meet with (?:the )?team|panel interview|hiring manager/i,
  },
  { status: "REJECTED", pattern: /unfortunately|not moving forward|regret to inform/i },
  { status: "OFFER", pattern: /offer|congratulations|we are excited to extend/i },
];

const STATUS_PRIORITY: ApplicationStatus[] = ["OFFER", "REJECTED", "INTERVIEW", "SCREENING", "APPLIED"];

export function detectStatusFromText(text: string): ApplicationStatus | null {
  if (!text.trim()) return null;

  const matches = STATUS_PATTERNS.filter((entry) => entry.pattern.test(text)).map((entry) => entry.status);
  if (!matches.length) {
    const lower = text.toLowerCase();
    if (lower.includes("application") && (lower.includes("received") || lower.includes("thank you for applying"))) {
      return "APPLIED";
    }
    if (lower.includes("not selected") || lower.includes("other candidates")) return "REJECTED";
    return null;
  }

  for (const status of STATUS_PRIORITY) {
    if (matches.includes(status)) return status;
  }
  return matches[0] ?? null;
}
