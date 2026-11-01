'use client';

import React from 'react';
import { useMedShare } from '@/context/MedShareContext';
import {
  Pill,
  ShieldCheck,
  ShieldAlert,
  User,
  Building2,
  PlusCircle,
  LogOut,
  LayoutDashboard,
  Sun,
  Moon,
  Radio,
  AlertTriangle,
} from 'lucide-react';
import { UserRole } from '@/types/medshare';
import { motion } from 'framer-motion';

const ROLE_LABELS: Record<UserRole, { label: string; icon: React.ReactNode; badgeClass: string }> = {
  individual: {
    label: 'Community Member',
    icon: <User className="w-3.5 h-3.5" />,
    badgeClass: 'bg-teal-950/70 text-teal-200 border-teal-500/40 shadow-[0_0_10px_rgba(20,184,166,0.15)]',
  },
  clinic_charity: {
    label: 'Rural Clinic / NGO',
    icon: <Building2 className="w-3.5 h-3.5" />,
    badgeClass: 'bg-indigo-950/80 text-indigo-200 border-indigo-400/40 shadow-[0_0_10px_rgba(99,102,241,0.15)]',
  },
  admin: {
    label: 'Platform Moderator',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    badgeClass: 'bg-purple-950/80 text-purple-200 border-purple-400/40 shadow-[0_0_10px_rgba(168,85,247,0.15)]',
  },
};

export default function Navbar() {
  const {
    currentUser,
    medications,
    openRequestsCount,
    pendingVerifications,
    isDbConnected,
    logout,
    openDonateModal,
    openVerifyModal,
    openAuthModal,
    activeMainTab,
    setActiveMainTab,
    theme,
    toggleTheme,
  } = useMedShare();

  const currentRoleMeta = currentUser
    ? ROLE_LABELS[currentUser.role] || ROLE_LABELS.individual
    : null;

  // Active items badge in portal
  const portalBadgeCount = currentUser
    ? currentUser.role === 'admin'
      ? pendingVerifications.length
      : medications.filter(
          (m) =>
            (m.claimedById === currentUser.id && m.status === 'claimed') ||
            (m.claims || []).some((c) => c.claimerId === currentUser.id && (c.status === 'claimed' || (c.status as string) === 'pending_pickup')) ||
            (m.activeClaims || []).some((c) => c.collectorId === currentUser.id && c.status === 'pending_pickup') ||
            ((m.donorId === currentUser.id || (m.donorName && m.donorName.toLowerCase() === currentUser.name.toLowerCase())) &&
              (m.status === 'claimed' ||
                (m.claims || []).some((c) => c.status === 'claimed' || (c.status as string) === 'pending_pickup') ||
                (m.activeClaims || []).some((c) => c.status === 'pending_pickup')))
        ).length
    : 0;

  const handleDonateClick = () => {
    if (!currentUser) {
      openAuthModal('register', 'Please create an account or sign in to donate unused medicines.');
      return;
    }
    openDonateModal();
  };

  const navigateToSection = (tab: 'feed' | 'requests' | 'portal') => {
    if (tab === 'portal' && !currentUser) {
      openAuthModal('login', 'Please sign in or create an account to view your portal.');
      return;
    }
    setActiveMainTab(tab);
    const el = document.getElementById('main-feed-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleBrandClick = () => {
    setActiveMainTab('feed');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="fixed top-4 inset-x-0 z-50 mx-auto max-w-7xl px-4 pointer-events-auto">
      {/* Floating Spatial Glass Command Bar Dock */}
      <div className="relative rounded-2xl bg-white/85 dark:bg-slate-950/80 backdrop-blur-2xl border border-white/40 dark:border-teal-500/25 shadow-[0_12px_40px_-10px_rgba(15,23,42,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.45)] px-4 sm:px-5 py-3 transition-all duration-300">
        {/* Specular top-edge shine */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-teal-500/30 dark:via-teal-400/35 to-transparent rounded-t-2xl" />

        <div className="flex items-center justify-between gap-3 sm:gap-4">
          
          {/* ========================================================= */}
          {/* LEFT ZONE: CLEAN BRAND LOCKUP & TELEMETRY PILL            */}
          {/* ========================================================= */}
          <div className="flex items-center gap-3 shrink-0">
            <div
              onClick={handleBrandClick}
              className="flex items-center gap-2.5 cursor-pointer group/brand select-none"
            >
              {/* Refined 3D Gradient Capsule Icon */}
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/25 flex items-center justify-center p-2 transition-transform duration-300 group-hover/brand:scale-105">
                  <Pill className="w-5 h-5 text-white transform -rotate-12 group-hover/brand:rotate-0 transition-transform duration-300 drop-shadow-sm" />
                </div>
              </div>

              {/* MedShare Wordmark & Micro-Label */}
              <div className="flex flex-col">
                <span className="font-display font-extrabold text-xl tracking-tight text-slate-900 dark:text-white leading-tight">
                  Med<span className="text-teal-600 dark:text-teal-400">Share</span>
                </span>
                <span className="text-[9px] font-mono font-bold tracking-wider text-teal-700/90 dark:text-teal-400/90 uppercase leading-none mt-0.5">
                  BANGLADESH FEFO MED RESCUE
                </span>
              </div>
            </div>

            {/* Compact Live Status Pill */}
            {isDbConnected ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300/80 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/35 shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Live Cloud DB</span>
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300/80 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/35 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Local Mode</span>
              </span>
            )}
          </div>

          {/* ========================================================= */}
          {/* CENTER ZONE: QUICK SPATIAL NAVIGATION PILLS (DESKTOP)     */}
          {/* ========================================================= */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200/70 dark:border-slate-800">
            {/* Live Feed Pill */}
            <button
              type="button"
              onClick={() => navigateToSection('feed')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                activeMainTab === 'feed'
                  ? 'bg-white dark:bg-slate-800 text-teal-900 dark:text-teal-200 font-bold shadow-xs border border-slate-200/60 dark:border-slate-700/60'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Live Feed</span>
            </button>

            {/* Urgent Board Pill with Open Count Dot */}
            <button
              type="button"
              onClick={() => navigateToSection('requests')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                activeMainTab === 'requests'
                  ? 'bg-white dark:bg-slate-800 text-rose-950 dark:text-rose-200 font-bold shadow-xs border border-slate-200/60 dark:border-slate-700/60'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span>Urgent Board</span>
              {openRequestsCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full font-black bg-rose-500 text-white leading-tight">
                  {openRequestsCount}
                </span>
              )}
            </button>

            {/* My Portal Pill */}
            <button
              type="button"
              onClick={() => navigateToSection('portal')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                activeMainTab === 'portal'
                  ? 'bg-white dark:bg-slate-800 text-indigo-950 dark:text-indigo-200 font-bold shadow-xs border border-slate-200/60 dark:border-slate-700/60'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>My Portal</span>
              {portalBadgeCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full font-black bg-amber-400 text-slate-950 leading-tight">
                  {portalBadgeCount}
                </span>
              )}
            </button>
          </nav>

          {/* ========================================================= */}
          {/* RIGHT ZONE: THEME, PRIMARY CTA & AUTH CONTROLS            */}
          {/* ========================================================= */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            
            {/* Theme Toggle Button */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={toggleTheme}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer border bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200/90 shadow-xs dark:bg-slate-800 dark:hover:bg-slate-700/80 dark:text-slate-200 dark:border-slate-700/60"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Daylight Mode'}
              aria-label="Toggle daylight or dark mode"
            >
              {theme === 'light' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="font-mono text-[11px] hidden sm:inline">Daylight</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                  <span className="font-mono text-[11px] hidden sm:inline">Dark</span>
                </>
              )}
            </motion.button>

            {/* Primary Standout CTA: + Donate Medicine (Crisp White Text) */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97, y: 1 }}
              onClick={handleDonateClick}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-md shadow-teal-600/20 border border-teal-400/30 transition cursor-pointer"
              title="Donate unused unexpired medicines"
            >
              <PlusCircle className="w-4 h-4 text-white shrink-0" />
              <span className="hidden sm:inline">+ Donate Medicine</span>
              <span className="sm:hidden">+ Donate</span>
            </motion.button>

            {currentUser && currentRoleMeta ? (
              /* =================================================== */
              /* LOGGED-IN STATE                                     */
              /* =================================================== */
              <div className="flex items-center gap-2">
                {/* User Info & Role Meta */}
                <div className="hidden md:flex items-center gap-2 bg-slate-100/90 dark:bg-slate-900/90 rounded-xl px-3 py-1.5 border border-slate-200/90 dark:border-teal-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-teal-700 dark:text-teal-300 font-mono">
                      {currentUser.location}
                    </div>
                  </div>

                  {/* Role Badge */}
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg border ${currentRoleMeta.badgeClass}`}
                  >
                    {currentRoleMeta.icon}
                    <span className="hidden xl:inline">{currentRoleMeta.label}</span>
                  </span>

                  {/* Verification Badge & Action */}
                  {currentUser.verificationStatus === 'verified' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-400/40 shadow-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="hidden xl:inline">Verified</span>
                    </span>
                  ) : currentUser.verificationStatus === 'pending' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-400/40 shadow-xs">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="hidden xl:inline">Pending</span>
                    </span>
                  ) : (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => openVerifyModal()}
                      className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] transition cursor-pointer"
                      title="Verify collector account to unlock claiming"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-950" />
                      <span>Verify</span>
                    </motion.button>
                  )}
                </div>

                {/* Mobile / Tablet My Portal Button (when center dock is hidden) */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97, y: 1 }}
                  onClick={() => navigateToSection('portal')}
                  className={`lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer border ${
                    activeMainTab === 'portal'
                      ? 'bg-teal-600 dark:bg-teal-500 text-white dark:text-slate-950 border-teal-500 shadow-[0_0_20px_rgba(20,184,166,0.3)]'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/90 dark:hover:bg-slate-800 text-slate-700 dark:text-teal-100 border-slate-200/90 dark:border-teal-500/30'
                  }`}
                  title="Open Collector & Donor Portal"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Portal</span>
                  {portalBadgeCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-extrabold bg-amber-400 text-slate-950">
                      {portalBadgeCount}
                    </span>
                  )}
                </motion.button>

                {/* Log Out Button */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 dark:text-slate-300 dark:hover:text-white dark:bg-slate-900/80 dark:hover:bg-rose-950/40 rounded-xl border border-slate-200/90 hover:border-rose-300 dark:border-slate-700/60 dark:hover:border-rose-500/40 transition cursor-pointer"
                  title="Sign out of account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Log Out</span>
                </motion.button>
              </div>
            ) : (
              /* =================================================== */
              /* LOGGED-OUT STATE: DISTINCT HIGH-CONTRAST BUTTONS    */
              /* =================================================== */
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Ghost / Text Log In Button */}
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="text-slate-700 hover:text-teal-700 dark:text-slate-200 dark:hover:text-teal-300 font-semibold px-3 py-2 text-xs sm:text-sm rounded-xl transition cursor-pointer"
                >
                  Log In
                </button>

                {/* High-Contrast Dark Slate Create Account Button */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97, y: 1 }}
                  onClick={() => openAuthModal('register')}
                  className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold rounded-xl px-3.5 sm:px-4 py-2 text-xs sm:text-sm shadow-sm transition cursor-pointer"
                >
                  Create Account
                </motion.button>
              </div>
            )}

          </div>
        </div>
      </div>
    </header>
  );
}
