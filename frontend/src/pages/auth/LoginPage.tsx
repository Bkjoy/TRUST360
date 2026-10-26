import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  Building2,
  ShieldCheck,
  UserCheck,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';
import { TrustLogo } from '../../components/common/TrustLogo';

interface RoleOption {
  role: UserRole;
  title: string;
  category: string;
  subtitle: string;
  description: string;
  features: string[];
  defaultEmail: string;
  defaultPass: string;
  icon: React.ReactNode;
  themeColor: string;
  accentBg: string;
  badge: string;
}

const PORTAL_ROLES: RoleOption[] = [
  {
    role: 'INSTITUTION_ADMIN',
    title: 'Institute Admin',
    category: 'Technical Institutions',
    subtitle: 'Registrar & Finance Secretariat',
    description: 'Direct institutional access to register Fixed Deposit Receipts and submit regulatory renewals.',
    features: [
      'Submit & register new FDR instruments',
      'Track institutional security deposit ledger',
      'Apply for rollover renewals & lock-in releases',
    ],
    defaultEmail: 'inst.admin@ditm.ac.in',
    defaultPass: 'Inst@123',
    icon: <Building2 className="w-6 h-6 text-gov-navy-700" />,
    themeColor: 'border-gov-navy-600 hover:border-gov-navy-700',
    accentBg: 'bg-gov-navy-50 text-gov-navy-900 border-gov-navy-200',
    badge: 'Institutional Portal',
  },
  {
    role: 'SCRUTINY_OFFICER',
    title: 'Scrutiny Officer',
    category: 'AICTE Approval Bureau',
    subtitle: 'Verification & Anomaly Desk',
    description: 'Adjudication desk to examine OCR extractions, reconcile discrepancy records, and verify bank liens.',
    features: [
      'Inspect AI OCR document field extractions',
      'Reconcile anomaly discrepancy matrix',
      'Execute Core Banking (CBS) lien checks',
    ],
    defaultEmail: 'officer@aicte.gov.in',
    defaultPass: 'Officer@123',
    icon: <ShieldCheck className="w-6 h-6 text-teal-600" />,
    themeColor: 'border-teal-500 hover:border-teal-600',
    accentBg: 'bg-teal-50 text-teal-900 border-teal-200',
    badge: 'Regulatory Scrutiny',
  },
  {
    role: 'APPROVING_AUTHORITY',
    title: 'Competent Authority',
    category: 'AICTE Regional Authority',
    subtitle: 'Executive Sanction & Directorate',
    description: 'Executive oversight on the national pledged security portfolio with final digital release authority.',
    features: [
      'National security deposit intelligence dashboard',
      'Final digital authorization for lien releases',
      'Cryptographic tamper-proof audit verification',
    ],
    defaultEmail: 'authority@aicte.gov.in',
    defaultPass: 'Authority@123',
    icon: <UserCheck className="w-6 h-6 text-indigo-600" />,
    themeColor: 'border-indigo-500 hover:border-indigo-600',
    accentBg: 'bg-indigo-50 text-indigo-900 border-indigo-200',
    badge: 'Competent Authority',
  },
];

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  // State: selectedRole is NULL on Step 1, and populated on Step 2
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  // Form Credentials (Step 2)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle clicking a role in Step 1
  const handleSelectRole = (option: RoleOption) => {
    setSelectedRole(option.role);
    setEmail('');
    setPassword('');
    setError(null);
  };

  // Helper to auto-fill demo credentials for the selected role
  const handleAutoFillDemo = () => {
    const active = PORTAL_ROLES.find((r) => r.role === selectedRole);
    if (active) {
      setEmail(active.defaultEmail);
      setPassword(active.defaultPass);
      setError(null);
    }
  };

  // Handle Return to Step 1
  const handleBackToRoleSelection = () => {
    setSelectedRole(null);
    setEmail('');
    setPassword('');
    setError(null);
  };

  // Submit Login (Step 2)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedRole) {
      setError('Please select an Authorized Portal Role first.');
      return;
    }

    if (!email.trim() || !password) {
      setError('Please enter both your official email address and secure password.');
      return;
    }

    try {
      await login(email.trim(), password);

      // Verify role alignment
      const storedUser = localStorage.getItem('trust_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.role && parsed.role !== selectedRole) {
            setError(
              `Role Mismatch: Your credentials belong to '${parsed.role}', not the selected '${selectedRole}' portal.`
            );
            return;
          }
        } catch {
          // ignore
        }
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Authentication failed. Please verify your official email address and password.'
      );
    }
  };

  const activeRoleOption = PORTAL_ROLES.find((r) => r.role === selectedRole);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gov-navy-900 via-gov-navy-800 to-slate-900 flex flex-col justify-center items-center p-4 sm:p-6">
      {/* ============================================================ */}
      {/* STEP 1: ROLE SELECTION SCREEN (When selectedRole is NULL)     */}
      {/* ============================================================ */}
      {!selectedRole ? (
        <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-fade-in transition-all">
          {/* Card Header with TRUST Branding */}
          <div className="bg-gov-navy-900 p-8 text-center text-white relative border-b border-slate-800">
            <div className="mx-auto flex justify-center mb-3">
              <TrustLogo size="lg" variant="light" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-white">TRUST</h1>
            <p className="text-xs sm:text-sm text-teal-400 font-semibold tracking-wide mt-1">
              Transparent Repository for Unified Security-deposit Tracking
            </p>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-gov-navy-800/90 border border-slate-700 rounded-full mt-3">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300">
                All India Council for Technical Education (AICTE) • Ministry of Education
              </span>
            </div>
          </div>

          {/* Role Selection Body */}
          <div className="p-6 sm:p-10 space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
                Step 1: Authorized Access
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight pt-1">
                Select Authorized Portal Role
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Choose your official role to open the corresponding authentication desk.
              </p>
            </div>

            {/* 3 Role Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
              {PORTAL_ROLES.map((option) => (
                <div
                  key={option.role}
                  onClick={() => handleSelectRole(option)}
                  className={`group relative bg-white rounded-2xl border-2 p-6 transition-all duration-200 hover:shadow-xl hover:-translate-y-1 cursor-pointer flex flex-col justify-between border-slate-200 hover:${option.themeColor}`}
                >
                  <div>
                    {/* Top Icon & Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 group-hover:scale-105 transition-transform shadow-xs">
                        {option.icon}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${option.accentBg}`}>
                        {option.badge}
                      </span>
                    </div>

                    {/* Role Title & Subtitle */}
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-gov-navy-800 transition-colors">
                      {option.title}
                    </h3>
                    <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
                      {option.category}
                    </div>

                    <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                      {option.description}
                    </p>

                    {/* Duty Bullet Points */}
                    <ul className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
                      {option.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-1.5 leading-snug">
                          <span className="text-teal-600 font-bold mt-0.5">•</span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Button */}
                  <div className="mt-6 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-gov-navy-800 hover:text-white text-slate-800 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 group-hover:bg-gov-navy-800 group-hover:text-white shadow-xs"
                    >
                      <span>Continue as {option.title}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* STEP 2: CREDENTIAL ENTRY SCREEN (After Role is Selected)      */
        /* ============================================================ */
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-fade-in transition-all">
          {/* Header */}
          <div className="bg-gov-navy-900 p-6 text-center text-white relative border-b border-slate-800">
            <div className="mx-auto flex justify-center mb-2.5">
              <TrustLogo size="md" variant="light" />
            </div>
            <h1 className="text-xl font-black tracking-wider text-white">TRUST</h1>
            <p className="text-[11px] text-teal-400 font-semibold tracking-wide">
              Transparent Repository for Unified Security-deposit Tracking
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            {/* Active Role Banner with Back Button */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200 shrink-0">
                  {activeRoleOption?.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Authorized Portal
                  </div>
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {activeRoleOption?.title}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleBackToRoleSelection}
                className="text-xs text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 hover:underline shrink-0 pl-2"
                title="Return to Step 1: Select Role"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change</span>
              </button>
            </div>

            {/* Error Notice */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div className="leading-relaxed">{error}</div>
              </div>
            )}

            {/* Credentials Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="pb-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Enter Official Credentials
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Authenticate your identity to open the {activeRoleOption?.title} workspace.
                </p>
              </div>

              {/* Official Email Address */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Official Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={activeRoleOption?.defaultEmail || 'official@domain.gov.in'}
                    className="w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Secure Password */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Secure Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-xs font-medium rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Demo Credentials Auto-Fill Chip */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleAutoFillDemo}
                  className="w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] text-slate-600 font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    Auto-Fill Demo Credentials (<code>{activeRoleOption?.defaultEmail}</code>)
                  </span>
                </button>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-gov-navy-800 hover:bg-gov-navy-900 text-white text-xs font-bold tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-teal-400" />
                  <span>
                    {isLoading
                      ? 'Authenticating Identity...'
                      : `Sign In as ${activeRoleOption?.title} →`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <div className="mt-6 text-center text-xs text-slate-400 font-medium">
        TRUST — Transparent Repository for Unified Security-deposit Tracking • AICTE
      </div>
    </div>
  );
};
