export default function ZombieRobotIcon({ className = 'w-5 h-5', ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M12.5 6V3.4L15 2.2" />
      <circle cx="15.6" cy="2" r="0.7" fill="currentColor" stroke="none" />
      <rect x="4" y="6" width="16" height="14" rx="3.2" />
      <path d="M2 12h2M20 12h2" />
      <path d="M6.5 8.6l3 1.1M7.6 8.1l-.5 1.9M9 8.6l-.5 1.9" strokeWidth="1.4" />
      <circle cx="9" cy="12.5" r="1.6" />
      <path d="M13.6 11l2.8 2.8M16.4 11l-2.8 2.8" />
      <path d="M8 17h8M10 16v2M12.5 16v2M15 16v2" strokeWidth="1.5" />
    </svg>
  );
}