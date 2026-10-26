import React from 'react';

interface TrustLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showTagline?: boolean;
  variant?: 'light' | 'dark'; // 'light' for dark navy backgrounds; 'dark' for white/light cards
  className?: string;
}

export const TrustLogo: React.FC<TrustLogoProps> = ({
  size = 'md',
  showText = false,
  showTagline = false,
  variant = 'light',
  className = '',
}) => {
  const sizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const textColors = {
    light: {
      title: 'text-white',
      badge: 'text-teal-400 bg-teal-950/60 border-teal-500/30',
      tagline: 'text-slate-300',
    },
    dark: {
      title: 'text-gov-navy-900',
      badge: 'text-teal-700 bg-teal-50 border-teal-200',
      tagline: 'text-slate-600',
    },
  }[variant];

  const svgIcon = (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizeMap[size]} shrink-0 drop-shadow-md`}
    >
      <defs>
        <linearGradient id={`trustShield-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="45%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <linearGradient id={`trustInner-${variant}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>

      {/* Outer Shield Shell */}
      <path
        d="M50 6 L86 20 C86 54 70 82 50 94 C30 82 14 54 14 20 Z"
        fill={`url(#trustShield-${variant})`}
      />

      {/* Inner Vault Plate */}
      <path
        d="M50 13 L80 25 C80 52 66 76 50 86 C34 76 20 52 20 25 Z"
        fill={`url(#trustInner-${variant})`}
      />

      {/* Transparency Structural Grid Lines */}
      <path d="M50 13 L50 86" stroke="#0d9488" strokeWidth="1.2" strokeOpacity="0.35" />
      <path d="M26 36 L74 36" stroke="#0d9488" strokeWidth="1.2" strokeOpacity="0.25" />

      {/* Monogram T + Central Vault Structure */}
      <path
        d="M30 30 C30 28.8954 30.8954 28 32 28 H68 C69.1046 28 70 28.8954 70 30 V37 C70 38.1046 69.1046 39 68 39 H57 V50 C57 50 61 52 61 57 C61 63 56 67 50 67 C44 67 39 63 39 57 C39 52 43 50 43 50 V39 H32 C30.8954 39 30 38.1046 30 37 Z"
        fill={`url(#trustShield-${variant})`}
      />

      {/* Vault Core Lock Node */}
      <circle
        cx="50"
        cy="57"
        r="5.5"
        fill="#0f172a"
        stroke={`url(#trustShield-${variant})`}
        strokeWidth="2"
      />
      <circle cx="50" cy="57" r="2" fill="#14b8a6" />

      {/* Verification Checkmark Anchor */}
      <path
        d="M44 73 L48 77 L57 68"
        stroke="#10b981"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (!showText) {
    return <div className={`inline-flex items-center justify-center ${className}`}>{svgIcon}</div>;
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {svgIcon}
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2">
          <h1 className={`text-base font-extrabold tracking-wider ${textColors.title}`}>
            TRUST
          </h1>
          <span
            className={`text-[9px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded border ${textColors.badge}`}
          >
            FDR Repository
          </span>
        </div>
        {showTagline && (
          <p
            className={`text-[10px] leading-snug tracking-tight font-medium ${textColors.tagline}`}
            title="Transparent Repository for Unified Security-deposit Tracking"
          >
            Transparent Repository for Unified Security-deposit Tracking
          </p>
        )}
      </div>
    </div>
  );
};
