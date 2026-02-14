import { ApplicationStatus } from "@prisma/client";

export default function SankeyReal({
  counts,
}: {
  counts: Record<ApplicationStatus, number>;
}) {
  const applied = counts.APPLIED ?? 0;
  const screening = counts.SCREENING ?? 0;
  const interview = counts.INTERVIEW ?? 0;
  const offer = counts.OFFER ?? 0;
  const rejected = counts.REJECTED ?? 0;

  const max = Math.max(applied, screening, interview, offer, rejected, 1);
  const scale = (value: number) => Math.max(6, Math.round((value / max) * 22));

  return (
    <svg viewBox="0 0 600 220" style={{ width: "100%", height: "220px" }}>
      <rect x="20" y="20" width="120" height="40" rx="10" fill="#101826" stroke="#1b2436" />
      <text x="80" y="45" fill="#eef3fb" fontSize="12" textAnchor="middle">Applied</text>

      <rect x="240" y="60" width="140" height="40" rx="10" fill="#101826" stroke="#1b2436" />
      <text x="310" y="85" fill="#eef3fb" fontSize="12" textAnchor="middle">Screening</text>

      <rect x="440" y="20" width="140" height="40" rx="10" fill="#101826" stroke="#1b2436" />
      <text x="510" y="45" fill="#eef3fb" fontSize="12" textAnchor="middle">Interview</text>

      <rect x="440" y="140" width="140" height="40" rx="10" fill="#101826" stroke="#1b2436" />
      <text x="510" y="165" fill="#eef3fb" fontSize="12" textAnchor="middle">Offer</text>

      <rect x="240" y="140" width="140" height="40" rx="10" fill="#101826" stroke="#1b2436" />
      <text x="310" y="165" fill="#eef3fb" fontSize="12" textAnchor="middle">Rejected</text>

      <path d="M140 40 C200 40 210 80 240 80" stroke="#24d1ff" strokeWidth={scale(applied)} fill="none" opacity="0.5" />
      <path d="M380 80 C430 80 430 40 440 40" stroke="#24d1ff" strokeWidth={scale(interview)} fill="none" opacity="0.5" />
      <path d="M380 90 C420 110 420 160 440 160" stroke="#6ee7b7" strokeWidth={scale(offer)} fill="none" opacity="0.5" />
      <path d="M140 50 C210 90 210 160 240 160" stroke="#f6c356" strokeWidth={scale(rejected)} fill="none" opacity="0.4" />
    </svg>
  );
}
