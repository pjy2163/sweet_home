type BrandLogoProps = {
  className?: string;
  markOnly?: boolean;
};

export function BrandLogo({
  className = "",
  markOnly = false,
}: BrandLogoProps) {
  return (
    <svg
      aria-label="SweetHome"
      className={className}
      fill="none"
      role="img"
      viewBox={markOnly ? "0 0 236 236" : "0 0 900 236"}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M29 105 117 35l32 25v150h-30V110H89v100H59v-80H29v-25Z"
        fill="currentColor"
      />
      <path d="m174 124 33-31v117h-33v-86Z" fill="currentColor" />
      <circle cx="173" cy="67" fill="#DFFF62" r="16" />
      {markOnly ? null : (
        <text
          fill="currentColor"
          fontFamily="inherit"
          fontSize="110"
          fontWeight="500"
          letterSpacing="-5.5"
          x="260"
          y="153"
        >
          SweetHome
        </text>
      )}
    </svg>
  );
}
