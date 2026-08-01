interface SastyLogoProps {
  className?: string;
  title?: string;
}

/**
 * sasuty mark — a single continuous "S" ribbon drawn as one stroke.
 */
export function SastyLogo({ className, title = "sasuty" }: SastyLogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <path
        d="M46 15.5C42.2 11.2 36.8 9 31 9c-8.3 0-14.5 4.4-14.5 11 0 6.2 4.8 9.1 14.2 11.2 10.7 2.4 17.3 5.8 17.3 14.1C48 53.9 40.5 59 31.2 59c-6.9 0-13-2.6-17.2-7.4"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx="31" cy="34" r="3.4" fill="currentColor" />
    </svg>
  );
}

export default SastyLogo;
