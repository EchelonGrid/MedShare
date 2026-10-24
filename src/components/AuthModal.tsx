'use client';

import React, { useState, useEffect } from 'react';
import { useMedShare, RegisterData } from '@/context/MedShareContext';
import { UserRole } from '@/types/medshare';
import {
  X,
  Pill,
  Mail,
  Lock,
  User,
  Phone,
  MapPin,
  Building2,
  FileText,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  mode?: 'login' | 'register';
  notice?: string | null;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export default function AuthModal({
  isOpen,
  mode = 'login',
  notice,
  onClose,
  onSuccess,
}: AuthModalProps) {
  const { login, register, loginAsDemo, allUsers, actionLoading } = useMedShare();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>(mode);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register form state
  const [role, setRole] = useState<UserRole>('individual');
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [regOrNid, setRegOrNid] = useState('');
  const [regError, setRegError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(mode);
      setLoginError(null);
      setRegError(null);
    }
  }, [isOpen, mode]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const res = await login(loginEmail, loginPassword);
    if (!res.success) {
      setLoginError(res.error || 'Failed to log in.');
      return;
    }

    onClose();
    onSuccess?.('Successfully logged in! Welcome back.');
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!fullName.trim() || !regEmail.trim() || !phone.trim() || !location.trim()) {
      setRegError('Please fill in all required fields.');
      return;
    }

    const data: RegisterData = {
      name: fullName.trim(),
      email: regEmail.trim(),
      password: regPassword || 'password123',
      role,
      phone: phone.trim(),
      location: location.trim(),
      organizationName: role === 'clinic_charity' ? fullName.trim() : undefined,
      registrationOrNid: regOrNid.trim() || undefined,
    };

    const res = await register(data);
    if (!res.success) {
      setRegError(res.error || 'Failed to create account.');
      return;
    }

    onClose();
    onSuccess?.(`Welcome to MedShare, ${data.name}! Your account has been created.`);
  };

  const handleDemoLogin = (userId: string) => {
    loginAsDemo(userId);
    const user = allUsers.find((u) => u.id === userId);
    onClose();
    onSuccess?.(`Logged in as demo persona: ${user?.name || 'User'}`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
    >
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white px-6 py-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center border border-teal-400/30 text-teal-200">
              <Pill className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-lg sm:text-xl font-bold tracking-tight">
                {activeTab === 'login' ? 'Sign In to MedShare' : 'Create Your MedShare Account'}
              </h2>
              <p className="text-xs text-teal-100/90 mt-0.5">
                Connecting surplus medicines with rural clinics and families
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Close authentication modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Banner (e.g. when triggered from donate or claim while logged out) */}
        {notice && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="font-medium leading-relaxed">{notice}</p>
          </div>
        )}

        {/* Auth Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer ${
              activeTab === 'login'
                ? 'bg-white text-teal-900 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer ${
              activeTab === 'register'
                ? 'bg-white text-teal-900 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* ======================================================== */}
        {/* 1. SIGN IN TAB                                           */}
        {/* ======================================================== */}
        {activeTab === 'login' ? (
          <div className="p-6 space-y-5">
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. sarah@medshare.org or michael@ruralhope.org"
                    className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  (Demo password is <code className="font-mono font-semibold text-slate-700">password123</code> for all accounts)
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={actionLoading === 'auth'}
                className="w-full py-2.5 px-4 text-xs sm:text-sm font-bold rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white transition shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{actionLoading === 'auth' ? 'Signing In...' : 'Sign In to Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Demo Login Section */}
            <div className="pt-4 border-t border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span>Quick Demo One-Click Login:</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Demo Individual Member */}
                <button
                  type="button"
                  onClick={() => handleDemoLogin('user-donor-1')}
                  className="p-2.5 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100/70 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                    <User className="w-3.5 h-3.5 text-teal-700" />
                    <span>Individual Member</span>
                  </div>
                  <p className="text-[10px] text-teal-800 mt-0.5 truncate font-medium">Dr. Farhana Rahman</p>
                </button>

                {/* Demo Rural Clinic */}
                <button
                  type="button"
                  onClick={() => handleDemoLogin('user-clinic-1')}
                  className="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/70 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                    <Building2 className="w-3.5 h-3.5 text-indigo-700" />
                    <span>Rural Clinic</span>
                  </div>
                  <p className="text-[10px] text-indigo-800 mt-0.5 truncate font-medium">Bogura Free Rural Clinic</p>
                </button>

                {/* Demo Platform Admin */}
                <button
                  type="button"
                  onClick={() => handleDemoLogin('user-admin-1')}
                  className="p-2.5 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/70 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                    <span>Platform Admin</span>
                  </div>
                  <p className="text-[10px] text-purple-800 mt-0.5 truncate font-medium">MedShare Admin</p>
                </button>
              </div>
            </div>

          </div>
        ) : (
          /* ======================================================== */
          /* 2. CREATE ACCOUNT TAB                                    */
          /* ======================================================== */
          <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {regError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            {/* Account Type Selection Cards */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Select Your Account Type <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Individual Community Member */}
                <div
                  onClick={() => setRole('individual')}
                  className={`p-3 rounded-2xl border-2 transition cursor-pointer ${
                    role === 'individual'
                      ? 'border-teal-600 bg-teal-50/70 text-teal-950 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <User className={`w-5 h-5 mb-1.5 ${role === 'individual' ? 'text-teal-700' : 'text-slate-400'}`} />
                  <div className="text-xs font-bold leading-tight">Individual Member</div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Donate medicines immediately. Claim with verified national ID.
                  </p>
                </div>

                {/* Rural Clinic / Charity */}
                <div
                  onClick={() => setRole('clinic_charity')}
                  className={`p-3 rounded-2xl border-2 transition cursor-pointer ${
                    role === 'clinic_charity'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <Building2 className={`w-5 h-5 mb-1.5 ${role === 'clinic_charity' ? 'text-indigo-700' : 'text-slate-400'}`} />
                  <div className="text-xs font-bold leading-tight">Rural Clinic / NGO</div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Collect medicines in bulk for patients with healthcare license.
                  </p>
                </div>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {role === 'clinic_charity' ? 'Organization / Clinic Name' : 'Full Name'} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  {role === 'clinic_charity' ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={role === 'clinic_charity' ? 'e.g. Bogura Free Rural Health Center' : 'e.g. Dr. Ayesha Siddika'}
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
                />
              </div>
            </div>

            {/* Email & Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create a password"
                    className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Phone & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880 1712-345678"
                    className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Location / Area <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Bogura, Dhaka, Pabna"
                    className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Optional Immediate Verification ID */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {role === 'clinic_charity'
                  ? 'Clinic / NGO License Number (Optional now)'
                  : 'National ID (NID: 10, 13, or 17 digits - Optional now)'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <FileText className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={regOrNid}
                  onChange={(e) => setRegOrNid(e.target.value)}
                  placeholder={role === 'clinic_charity' ? 'e.g. DGHS-BOG-4491' : 'e.g. 1998260636001'}
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                You can provide this now for Admin review, or verify later from your account portal to unlock medicine claims.
              </p>
            </div>

            {/* Submit Register */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={actionLoading === 'auth'}
                className="w-full py-2.5 px-4 text-xs sm:text-sm font-bold rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white transition shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{actionLoading === 'auth' ? 'Creating Account...' : 'Create Account & Get Started'}</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
