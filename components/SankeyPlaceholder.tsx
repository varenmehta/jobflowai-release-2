export default function SankeyPlaceholder() {
  return (
    <svg viewBox="0 0 600 220" style={{ width: "100%", height: "220px" }}>
      <rect x="20" y="20" width="120" height="40" rx="10" fill="#101826" stroke="#1b2436" />
      <rect x="240" y="60" width="140" height="40" rx="10" fill="#101826" stroke="#1b2436" />
      <rect x="440" y="20" width="140" height="40" rx="10" fill="#101826" stroke="#1b2436" />
      <rect x="440" y="140" width="140" height="40" rx="10" fill="#101826" stroke="#1b2436" />
      <path d="M140 40 C200 40 210 80 240 80" stroke="#24d1ff" strokeWidth="14" fill="none" opacity="0.5" />
      <path d="M380 80 C430 80 430 40 440 40" stroke="#24d1ff" strokeWidth="14" fill="none" opacity="0.5" />
      <path d="M380 90 C420 110 420 160 440 160" stroke="#6ee7b7" strokeWidth="10" fill="none" opacity="0.5" />
    </svg>
  );
}
