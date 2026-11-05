'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Award,
} from 'lucide-react';
import { UserRole } from '@/types/medshare';
import { motion, AnimatePresence } from 'framer-motion';
import ImpactCertificateModal from '@/components/ImpactCertificateModal';

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

function getInitials(name?: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Navbar() {
  const {
    currentUser,
    medications,
    openRequestsCount,
    pendingVerifications,
    logout,
    openDonateModal,
    openVerifyModal,
    openAuthModal,
    activeMainTab,
    setActiveMainTab,
    theme,
    toggleTheme,
  } = useMedShare();

  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);

  // Click-outside and Escape key listener for account popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        avatarButtonRef.current &&
        !avatarButtonRef.current.contains(e.target as Node)
      ) {
        setIsAccountMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAccountMenuOpen(false);
      }
    };

    if (isAccountMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  const currentRoleMeta = currentUser
    ? ROLE_LABELS[currentUser.role] || ROLE_LABELS.individual
    : null;

  // Active actionable items badge in portal (synchronized with UserPortal)
  const portalBadgeCount = useMemo(() => {
    if (!currentUser) return 0;
    if (currentUser.role === 'admin') return pendingVerifications.length;

    let count = 0;
    medications.forEach((m) => {
      const isDonor =
        m.donorId === currentUser.id ||
        Boolean(m.donorName && m.donorName.toLowerCase() === currentUser.name.toLowerCase());

      // If donor: count incoming pending pickup requests
      if (isDonor) {
        const seenClaimIds = new Set<string>();
        (m.activeClaims || []).forEach((ac) => {
          if (ac.status === 'pending_pickup') {
            seenClaimIds.add(ac.claimId);
            count += 1;
          }
        });
        (m.claims || []).forEach((bc) => {
          if (
            (bc.status === 'claimed' || (bc.status as string) === 'pending_pickup') &&
            !seenClaimIds.has(bc.id)
          ) {
            seenClaimIds.add(bc.id);
            count += 1;
          }
        });
        if (
          m.status === 'claimed' &&
          (!m.claims || m.claims.length === 0) &&
          (!m.activeClaims || m.activeClaims.length === 0)
        ) {
          count += 1;
        }
      }

      // If collector: count my pending pickups
      const seenMyClaimIds = new Set<string>();
      (m.activeClaims || []).forEach((ac) => {
        if (
          ac.collectorId === currentUser.id ||
          (currentUser.name && ac.collectorName.toLowerCase() === currentUser.name.toLowerCase())
        ) {
          if (ac.status === 'pending_pickup') {
            seenMyClaimIds.add(ac.claimId);
            count += 1;
          }
        }
      });
      (m.claims || []).forEach((bc) => {
        if (
          bc.claimerId === currentUser.id ||
          (currentUser.name && bc.claimerName.toLowerCase() === currentUser.name.toLowerCase())
        ) {
          if (
            (bc.status === 'claimed' || (bc.status as string) === 'pending_pickup') &&
            !seenMyClaimIds.has(bc.id)
          ) {
            seenMyClaimIds.add(bc.id);
            count += 1;
          }
        }
      });
      if (
        (m.claimedById === currentUser.id ||
          (currentUser.name && m.claimedByName?.toLowerCase() === currentUser.name.toLowerCase())) &&
        m.status === 'claimed' &&
        (!m.claims || m.claims.length === 0) &&
        (!m.activeClaims || m.activeClaims.length === 0)
      ) {
        count += 1;
      }
    });

    return count;
  }, [currentUser, pendingVerifications.length, medications]);

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
    const el = document.getElementById('rescue-workspace') || document.getElementById('main-feed-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleBrandClick = () => {
    setActiveMainTab('feed');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOut = () => {
    setIsAccountMenuOpen(false);
    if (activeMainTab === 'portal') {
      setActiveMainTab('feed');
    }
    logout();
  };

  return (
    <>
      <header className="fixed top-3 sm:top-4 inset-x-0 z-50 mx-auto max-w-7xl px-3 sm:px-4 pointer-events-auto">
        {/* Floating Spatial Glass Command Bar Dock */}
        <div className="relative rounded-2xl bg-white/85 dark:bg-slate-950/80 backdrop-blur-2xl border border-white/40 dark:border-teal-500/25 shadow-[0_12px_40px_-10px_rgba(15,23,42,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.45)] px-3 sm:px-5 py-2.5 sm:py-3 transition-all duration-300">
          {/* Specular top-edge shine */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-teal-500/30 dark:via-teal-400/35 to-transparent rounded-t-2xl" />

          <div className="flex items-center justify-between gap-2 sm:gap-4">
            
            {/* ========================================================= */}
            {/* LEFT ZONE: CLEAN BRAND LOCKUP                             */}
            {/* ========================================================= */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div
                onClick={handleBrandClick}
                className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group/brand select-none"
              >
                {/* Refined 3D Gradient Capsule Icon */}
                <div className="relative">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/25 flex items-center justify-center p-1.5 sm:p-2 transition-transform duration-300 group-hover/brand:scale-105">
                    <Pill className="w-4 h-4 sm:w-5 sm:h-5 text-white transform -rotate-12 group-hover/brand:rotate-0 transition-transform duration-300 drop-shadow-sm" />
                  </div>
                </div>

                {/* MedShare Wordmark & Micro-Label */}
                <div className="flex flex-col">
                  <span className="font-display font-extrabold text-base sm:text-xl tracking-tight text-slate-900 dark:text-white leading-tight">
                    Med<span className="text-teal-600 dark:text-teal-400">Share</span>
                  </span>
                  <span className="hidden sm:block text-[9px] font-mono font-bold tracking-wider text-teal-700/90 dark:text-teal-400/90 uppercase leading-none mt-0.5">
                    BANGLADESH FEFO MED RESCUE
                  </span>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* CENTER ZONE: SINGLE-LINE NAVIGATION PILLS                 */}
            {/* ========================================================= */}
            <nav className="hidden lg:flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-900/80 p-1.5 rounded-xl border border-slate-200/70 dark:border-slate-800 shrink-0">
              {/* Live Feed Pill */}
              <button
                type="button"
                onClick={() => navigateToSection('feed')}
                className={`whitespace-nowrap flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
                  activeMainTab === 'feed'
                    ? 'bg-white dark:bg-slate-800 text-teal-900 dark:text-teal-200 font-bold shadow-xs border border-slate-200/60 dark:border-slate-700/60'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Radio className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>Live Feed</span>
              </button>

              {/* Urgent Board Pill with Open Count Dot */}
              <button
                type="button"
                onClick={() => navigateToSection('requests')}
                className={`whitespace-nowrap flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
                  activeMainTab === 'requests'
                    ? 'bg-white dark:bg-slate-800 text-rose-950 dark:text-rose-200 font-bold shadow-xs border border-slate-200/60 dark:border-slate-700/60'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Urgent Board</span>
                {openRequestsCount > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-black bg-rose-500 text-white leading-tight">
                    {openRequestsCount}
                  </span>
                )}
              </button>

              {/* My Portal Pill - Shown ONLY when currentUser exists */}
              {currentUser && (
                <button
                  type="button"
                  onClick={() => navigateToSection('portal')}
                  className={`whitespace-nowrap flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
                    activeMainTab === 'portal'
                      ? 'bg-white dark:bg-slate-800 text-indigo-950 dark:text-indigo-200 font-bold shadow-xs border border-slate-200/60 dark:border-slate-700/60'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>My Portal</span>
                  {portalBadgeCount > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-black bg-amber-400 text-slate-950 leading-tight">
                      {portalBadgeCount}
                    </span>
                  )}
                </button>
              )}
            </nav>

            {/* ========================================================= */}
            {/* RIGHT ZONE: THEME, PRIMARY CTA & AUTH CONTROLS            */}
            {/* ========================================================= */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              
              {/* Compact 3D Circular Theme Toggle Button */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleTheme}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition cursor-pointer border bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200/90 shadow-xs dark:bg-slate-800 dark:hover:bg-slate-700/80 dark:text-slate-200 dark:border-slate-700/60 shrink-0"
                title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Daylight Mode'}
                aria-label="Toggle daylight or dark mode"
              >
                {theme === 'light' ? (
                  <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                ) : (
                  <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-300" />
                )}
              </motion.button>

              {/* Primary Standout CTA: Donate Medicine (No Double Plus Sign) */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97, y: 1 }}
                onClick={handleDonateClick}
                className="whitespace-nowrap inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-md shadow-teal-600/20 border border-teal-400/30 transition cursor-pointer shrink-0"
                title="Donate unused unexpired medicines"
              >
                <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white shrink-0" />
                <span className="sm:hidden">+ Donate</span>
                <span className="hidden sm:inline">Donate Medicine</span>
              </motion.button>

              {currentUser && currentRoleMeta ? (
                /* =================================================== */
                /* LOGGED-IN: GOOGLE-STYLE CIRCULAR AVATAR & POPOVER   */
                /* =================================================== */
                <div className="relative">
                  {/* Circular Avatar Trigger Button */}
                  <motion.button
                    ref={avatarButtonRef}
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full relative flex items-center justify-center font-bold text-xs sm:text-sm select-none transition-transform cursor-pointer bg-gradient-to-br from-teal-600 to-emerald-700 text-white shadow-md shadow-teal-900/20 ${
                      currentUser.isVerified
                        ? 'ring-2 ring-emerald-500 ring-offset-1 sm:ring-offset-2 ring-offset-white dark:ring-offset-slate-950'
                        : 'ring-2 ring-amber-500 ring-offset-1 sm:ring-offset-2 ring-offset-white dark:ring-offset-slate-950'
                    }`}
                    title={`${currentUser.name} (${currentRoleMeta.label})`}
                    aria-label="Open Account Menu"
                    aria-expanded={isAccountMenuOpen}
                  >
                    <span>{getInitials(currentUser.name)}</span>
                    {/* Verification Micro-Badge */}
                    {currentUser.isVerified ? (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] sm:text-[10px] font-black shadow-xs ring-1 sm:ring-2 ring-white dark:ring-slate-950"
                        title="Verified Bangladeshi Identity / Registry"
                      >
                        ✓
                      </span>
                    ) : (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[9px] sm:text-[10px] font-black shadow-xs ring-1 sm:ring-2 ring-white dark:ring-slate-950"
                        title="Verification Required"
                      >
                        !
                      </span>
                    )}
                  </motion.button>

                  {/* Floating Glass Account Popover Card */}
                  <AnimatePresence>
                    {isAccountMenuOpen && (
                      <motion.div
                        ref={popoverRef}
                        initial={{ opacity: 0, scale: 0.95, y: -8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -8 }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                        className="absolute right-0 top-12 sm:top-14 w-72 sm:w-84 max-w-[calc(100vw-2rem)] rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-teal-500/30 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] p-4 z-50 space-y-3.5 select-none text-left"
                      >
                        {/* Specular top-edge highlight */}
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-teal-400/50 to-transparent rounded-t-2xl" />

                        {/* Top Profile Header */}
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-11 h-11 rounded-full shrink-0 flex items-center justify-center font-bold text-sm bg-gradient-to-br from-teal-600 to-emerald-700 text-white shadow-md ${
                              currentUser.isVerified
                                ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
                                : 'ring-2 ring-amber-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
                            }`}
                          >
                            {getInitials(currentUser.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="block font-display font-bold text-sm text-slate-900 dark:text-white truncate">
                              {currentUser.name}
                            </span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">
                              {currentUser.email}
                            </span>
                            <span className="block text-[11px] font-mono text-teal-700 dark:text-teal-300 truncate mt-0.5">
                              {currentUser.location}
                            </span>
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border ${currentRoleMeta.badgeClass}`}
                              >
                                {currentRoleMeta.icon}
                                <span>{currentRoleMeta.label}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Verification Status Box */}
                        {currentUser.isVerified ? (
                          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <div className="space-y-0.5 min-w-0">
                              <div className="text-xs font-bold leading-tight">
                                ✓ National Registry &amp; OTP Verified
                              </div>
                              <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300/80 truncate">
                                ID: {currentUser.registrationOrNid || 'DGHS-BD-VERIFIED'}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setIsAccountMenuOpen(false);
                              openVerifyModal();
                            }}
                            className="w-full p-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-amber-100/80 dark:from-amber-950/40 dark:to-amber-900/40 border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 flex items-center justify-between text-xs font-bold shadow-xs hover:bg-amber-100 transition cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              <span>⚡ Complete 2-Step Verification</span>
                            </span>
                            <span>&rarr;</span>
                          </button>
                        )}

                        {/* Action Links */}
                        <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                          {/* 1. My Donor & Collector Portal */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsAccountMenuOpen(false);
                              navigateToSection('portal');
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <LayoutDashboard className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                              <span>My Donor &amp; Collector Portal</span>
                            </span>
                            {portalBadgeCount > 0 && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full font-black bg-amber-400 text-slate-950">
                                {portalBadgeCount}
                              </span>
                            )}
                          </button>

                          {/* 2. View Impact Certificate */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsAccountMenuOpen(false);
                              setIsCertificateOpen(true);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Award className="w-4 h-4 text-amber-500" />
                            <span>View Impact Certificate</span>
                          </button>

                          {/* Divider & 3. Sign Out */}
                          <div className="h-[1px] bg-slate-200 dark:bg-slate-800 my-1" />
                          <button
                            type="button"
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                /* =================================================== */
                /* LOGGED-OUT: SLEEK SIGN IN ON MOBILE / DUAL ON SM+   */
                /* =================================================== */
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {/* Single Sleek Sign In button on mobile (< sm) */}
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => openAuthModal('login')}
                    className="sm:hidden whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm transition cursor-pointer"
                  >
                    Sign In
                  </motion.button>

                  {/* Ghost / Text Log In Button (sm and above) */}
                  <button
                    type="button"
                    onClick={() => openAuthModal('login')}
                    className="hidden sm:inline-block whitespace-nowrap text-slate-700 hover:text-teal-700 dark:text-slate-200 dark:hover:text-teal-300 font-semibold px-3 py-2 text-xs sm:text-sm rounded-xl transition cursor-pointer"
                  >
                    Log In
                  </button>

                  {/* High-Contrast Dark Slate Create Account Button (sm and above) */}
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.97, y: 1 }}
                    onClick={() => openAuthModal('register')}
                    className="hidden sm:inline-block whitespace-nowrap bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold rounded-xl px-3.5 sm:px-4 py-2 text-xs sm:text-sm shadow-sm transition cursor-pointer"
                  >
                    Create Account
                  </motion.button>
                </div>
              )}

            </div>
          </div>
        </div>
      </header>

      {/* Standalone Impact Certificate Modal invoked from Account Popover */}
      {currentUser && (
        <ImpactCertificateModal
          isOpen={isCertificateOpen}
          onClose={() => setIsCertificateOpen(false)}
          user={currentUser}
        />
      )}
    </>
  );
}
