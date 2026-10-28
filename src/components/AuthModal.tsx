'use client';

import React, { useState, useEffect } from 'react';
import { useMedShare, RegisterData } from '@/context/MedShareContext';
import { UserRole } from '@/types/medshare';
import { motion, AnimatePresence } from 'framer-motion';
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

    const regData: RegisterData = {
      email: regEmail.trim(),
      password: regPassword,
      name: fullName.trim(),
      role,
      phone: phone.trim(),
      location: location.trim(),
      registrationOrNid: regOrNid.trim() || undefined,
      organizationName: role === 'clinic_charity' ? fullName.trim() : undefined,
    };

    const res = await register(regData);
    if (!res.success) {
      setRegError(res.error || 'Failed to create account.');
      return;
    }

    onClose();
    onSuccess?.('Account registered successfully! Welcome to MedShare.');
  };

  const handleDemoLogin = (userId: string) => {
    loginAsDemo(userId);
    onClose();
    onSuccess?.('Logged in as demo user');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900/95 text-white rounded-3xl border border-teal-500/30 shadow-2xl z-10 my-6"
      >
        {/* Specular Top Rim */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-teal-400/40 to-transparent rounded-t-3xl" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-teal-500/20 flex items-start justify-between sticky top-0 bg-slate-900/90 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h2 id="auth-modal-title" className="font-display text-lg sm:text-xl font-bold tracking-tight text-white">
                {activeTab === 'login' ? 'Sign In to MedShare' : 'Create a MedShare Account'}
              </h2>
              <p className="text-xs text-teal-300/80 font-mono mt-0.5">
                Verified Community Medicine Rescue Protocol
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Notice Banner if prompted */}
        {notice && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-teal-950/80 border border-teal-500/35 flex items-start gap-2.5 text-xs font-mono text-teal-200">
            <Sparkles className="w-4 h-4 text-teal-300 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{notice}</p>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-950 border border-teal-500/20">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setLoginError(null);
              }}
              className={`py-2 text-xs font-mono font-bold rounded-xl transition cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setRegError(null);
              }}
              className={`py-2 text-xs font-mono font-bold rounded-xl transition cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* TAB 1: LOGIN */}
        {activeTab === 'login' ? (
          <div className="p-6 space-y-5 font-mono text-xs">
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold uppercase">
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-teal-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl bg-slate-950 border border-teal-500/30 text-white placeholder-slate-500 focus:border-teal-400 outline-none"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold uppercase">
                  Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-teal-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl bg-slate-950 border border-teal-500/30 text-white placeholder-slate-500 focus:border-teal-400 outline-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={actionLoading === 'auth'}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 font-bold font-mono transition cursor-pointer hover:from-teal-300 hover:to-emerald-400 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>{actionLoading === 'auth' ? 'Signing in...' : 'Sign In to Account'}</span>
                </button>
              </div>
            </form>

            {/* Quick Demo Login Dock */}
            <div className="pt-4 border-t border-teal-500/15 space-y-2.5">
              <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider block">
                Quick 1-Click Demo Accounts:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoLogin('user-indiv-1')}
                  className="p-2.5 rounded-xl border border-teal-500/30 bg-slate-950 hover:bg-teal-950/70 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 font-bold text-teal-300">
                    <User className="w-3.5 h-3.5" />
                    <span>Member</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">Dr. Ayesha (Bogura)</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoLogin('user-clinic-1')}
                  className="p-2.5 rounded-xl border border-indigo-500/30 bg-slate-950 hover:bg-indigo-950/70 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Rural Clinic</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">Bogura Rural Center</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoLogin('user-admin-1')}
                  className="p-2.5 rounded-xl border border-purple-500/30 bg-slate-950 hover:bg-purple-950/70 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 font-bold text-purple-300">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">Platform Moderator</p>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 2: REGISTER */
          <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4 font-mono text-xs">
            {regError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            {/* Role Selection Cards */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-bold uppercase tracking-wider">
                Select Your Role <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div
                  onClick={() => setRole('individual')}
                  className={`p-3 rounded-2xl border transition cursor-pointer select-none ${
                    role === 'individual'
                      ? 'border-teal-400 bg-teal-950/70 text-white shadow-[0_0_15px_rgba(20,184,166,0.2)]'
                      : 'border-teal-500/20 bg-slate-950 text-slate-400 hover:border-teal-500/40'
                  }`}
                >
                  <User className={`w-5 h-5 mb-1 ${role === 'individual' ? 'text-teal-400' : 'text-slate-500'}`} />
                  <div className="font-bold text-white">Individual Member</div>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-sans">
                    Donate medicines immediately. Claim with verified national ID.
                  </p>
                </div>

                <div
                  onClick={() => setRole('clinic_charity')}
                  className={`p-3 rounded-2xl border transition cursor-pointer select-none ${
                    role === 'clinic_charity'
                      ? 'border-indigo-400 bg-indigo-950/70 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                      : 'border-teal-500/20 bg-slate-950 text-slate-400 hover:border-indigo-500/40'
                  }`}
                >
                  <Building2 className={`w-5 h-5 mb-1 ${role === 'clinic_charity' ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <div className="font-bold text-white">Rural Clinic / NGO</div>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-sans">
                    Collect medicines in bulk with medical/charity registration.
                  </p>
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1">
              <label className="block text-slate-300 font-bold uppercase">
                {role === 'clinic_charity' ? 'Organization / Clinic Name' : 'Full Name'} <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={role === 'clinic_charity' ? 'e.g. Bogura Rural Clinic' : 'e.g. Dr. Ayesha Siddika'}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-teal-500/30 text-white focus:border-teal-400 outline-none"
              />
            </div>

            {/* Email & Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold uppercase">
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-teal-500/30 text-white focus:border-teal-400 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold uppercase">
                  Password <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-teal-500/30 text-white focus:border-teal-400 outline-none"
                />
              </div>
            </div>

            {/* Phone & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold uppercase">
                  Phone Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+880 1711-234567"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-teal-500/30 text-white focus:border-teal-400 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold uppercase">
                  Location / Area <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Bogura, Dhaka, Pabna"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-teal-500/30 text-white focus:border-teal-400 outline-none"
                />
              </div>
            </div>

            {/* Optional ID */}
            <div className="space-y-1">
              <label className="block text-slate-300 font-bold uppercase">
                {role === 'clinic_charity' ? 'DGHS License (Optional now)' : 'National ID NID (Optional now)'}
              </label>
              <input
                type="text"
                value={regOrNid}
                onChange={(e) => setRegOrNid(e.target.value)}
                placeholder={role === 'clinic_charity' ? 'e.g. DGHS-1105' : '10, 13, or 17 digit NID'}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-teal-500/30 text-white focus:border-teal-400 outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={actionLoading === 'auth'}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 font-bold font-mono transition cursor-pointer hover:from-teal-300 hover:to-emerald-400 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{actionLoading === 'auth' ? 'Creating...' : 'Create Account & Get Started'}</span>
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
