import { google } from "googleapis";

export function getGmailClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

export const STATUS_PATTERNS = [
  { status: "APPLIED", pattern: /application received|thanks for applying/i },
  { status: "INTERVIEW", pattern: /interview|schedule a call/i },
  { status: "REJECTED", pattern: /unfortunately|not moving forward|regret to inform/i },
  { status: "OFFER", pattern: /offer|congratulations/i },
];
