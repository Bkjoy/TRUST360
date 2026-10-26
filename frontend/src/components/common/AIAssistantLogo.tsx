import React from 'react';

interface AIAssistantLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  withGlow?: boolean;
}

export const AIAssistantLogo: React.FC<AIAssistantLogoProps> = ({
  size = 'md',
  className = '',
  withGlow = false,
}) => {
  const sizeMap = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${sizeMap[size]} ${className}`}>
      {withGlow && (
        <span
          className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-500/30 via-teal-400/20 to-indigo-500/30 blur-md animate-pulse pointer-events-none"
          aria-hidden="true"
        />
      )}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm select-none"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="aiShieldGrad" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0284C7" />
            <stop offset="50%" stopColor="#0D9488" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </linearGradient>

          <linearGradient id="aiCoreGrad" x1="30" y1="30" x2="70" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#2DD4BF" />
          </linearGradient>

          <linearGradient id="sparkleGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>

          <filter id="aiGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Hexagonal Shield Background */}
        <polygon
          points="50,6 88,24 88,68 50,94 12,68 12,24"
          fill="url(#aiShieldGrad)"
          stroke="#38BDF8"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Inner Subtle Circuit Pattern */}
        <path
          d="M50,14 L78,28 L78,64 L50,86 L22,64 L22,28 Z"
          fill="#0F172A"
          fillOpacity="0.75"
          stroke="#0EA5E9"
          strokeWidth="1.2"
          strokeDasharray="3 2"
        />

        {/* Neural Network Nodes & Connector Lines */}
        <line x1="32" y1="38" x2="50" y2="28" stroke="#38BDF8" strokeWidth="1.5" strokeOpacity="0.8" />
        <line x1="68" y1="38" x2="50" y2="28" stroke="#38BDF8" strokeWidth="1.5" strokeOpacity="0.8" />
        <line x1="32" y1="38" x2="32" y2="60" stroke="#2DD4BF" strokeWidth="1.5" strokeOpacity="0.8" />
        <line x1="68" y1="38" x2="68" y2="60" stroke="#2DD4BF" strokeWidth="1.5" strokeOpacity="0.8" />
        <line x1="32" y1="60" x2="50" y2="72" stroke="#38BDF8" strokeWidth="1.5" strokeOpacity="0.8" />
        <line x1="68" y1="60" x2="50" y2="72" stroke="#38BDF8" strokeWidth="1.5" strokeOpacity="0.8" />
        <line x1="32" y1="38" x2="50" y2="48" stroke="#2DD4BF" strokeWidth="1.5" strokeOpacity="0.8" />
        <line x1="68" y1="38" x2="50" y2="48" stroke="#2DD4BF" strokeWidth="1.5" strokeOpacity="0.8" />
        <line x1="50" y1="48" x2="50" y2="72" stroke="#38BDF8" strokeWidth="1.5" strokeOpacity="0.8" />

        {/* Outer Connection Nodes */}
        <circle cx="50" cy="28" r="3" fill="#38BDF8" />
        <circle cx="32" cy="38" r="3" fill="#2DD4BF" />
        <circle cx="68" cy="38" r="3" fill="#2DD4BF" />
        <circle cx="32" cy="60" r="3" fill="#38BDF8" />
        <circle cx="68" cy="60" r="3" fill="#38BDF8" />
        <circle cx="50" cy="72" r="3" fill="#2DD4BF" />

        {/* Central Core AI Spark / Intelligence Orb */}
        <circle cx="50" cy="48" r="9" fill="url(#aiCoreGrad)" filter="url(#aiGlow)" />
        <circle cx="50" cy="48" r="4.5" fill="#FFFFFF" />

        {/* AI Sparkle / Star on top right corner */}
        <path
          d="M80,14 Q80,22 88,22 Q80,22 80,30 Q80,22 72,22 Q80,22 80,14 Z"
          fill="url(#sparkleGrad)"
        />
        <circle cx="80" cy="22" r="1.5" fill="#FFFFFF" />

        {/* Small Assistant Sparkle on lower left */}
        <path
          d="M20,68 Q20,73 25,73 Q20,73 20,78 Q20,73 15,73 Q20,73 20,68 Z"
          fill="#38BDF8"
        />
      </svg>
    </div>
  );
};
