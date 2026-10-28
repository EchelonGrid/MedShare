'use client';

import React from 'react';
import { useMedShare } from '@/context/MedShareContext';
import {
  Pill,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  User,
  Building2,
  PlusCircle,
  LogOut,
  LayoutDashboard,
  Sparkles,
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
    pendingVerifications,
    isDbConnected,
    logout,
    resetDemoData,
    openDonateModal,
    openVerifyModal,
    openAuthModal,
    activeMainTab,
    setActiveMainTab,
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

  return (
    <header className="sticky top-3 z-50 mx-auto w-full max-w-7xl px-3 sm:px-6 pointer-events-auto">
      {/* Floating Spatial Glass Command Bar */}
      <div className="relative rounded-2xl bg-slate-950/85 backdrop-blur-2xl border border-teal-500/25 shadow-[0_20px_50px_rgba(0,0,0,0.35)] px-4 sm:px-5 py-3 transition-all duration-300">
        {/* Specular top-edge shine */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-teal-400/35 to-transparent rounded-t-2xl" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
          
          {/* Logo & Platform Telemetry */}
          <div
            onClick={() => setActiveMainTab('feed')}
            className="flex items-center gap-3 cursor-pointer group/brand select-none"
          >
            {/* 3D Glowing Capsule Icon */}
            <div className="relative">
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-teal-500/30 to-emerald-500/30 blur-md group-hover/brand:blur-lg transition duration-300 opacity-80" />
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-b from-teal-500/20 to-slate-900 border border-teal-400/40 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
                <Pill className="w-5 h-5 text-teal-300 drop-shadow-[0_0_8px_rgba(45,212,191,0.6)] transform -rotate-12 group-hover/brand:rotate-0 transition-transform duration-300" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-extrabold text-xl tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                  Med<span className="text-teal-400">Share</span>
                </span>
                
                <span className="text-[9px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-md bg-teal-950/80 border border-teal-500/40 text-teal-300">
                  3D SPATIAL PROTOCOL
                </span>

                {/* Live Telemetry Pill with Pulse Ring */}
                {isDbConnected ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/35 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                    </span>
                    <span>Live Cloud DB</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/35 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span>Local Mode</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-teal-200/70 font-medium hidden sm:block">
                Verifiable medicine rescue for rural clinics &amp; vulnerable patients
              </p>
            </div>
          </div>

          {/* Right Section: Auth State, Tactile 3D Buttons & Controls */}
          <div className="flex flex-wrap items-center gap-2.5 justify-between md:justify-end">
            
            {/* Quick 3D Donate CTA Button */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97, y: 1 }}
              onClick={handleDonateClick}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 shadow-[0_4px_16px_rgba(20,184,166,0.3),inset_0_1px_0_rgba(255,255,255,0.45)] border border-teal-300/40 transition cursor-pointer"
              title="Donate unused unexpired medicines"
            >
              <PlusCircle className="w-3.5 h-3.5 text-slate-950" />
              <span>Donate</span>
            </motion.button>

            {currentUser && currentRoleMeta ? (
              /* =================================================== */
              /* LOGGED-IN STATE                                     */
              /* =================================================== */
              <>
                {/* Active User Badges */}
                <div className="flex items-center gap-2 bg-slate-900/90 rounded-xl px-3 py-1.5 border border-teal-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-semibold text-white leading-tight">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-teal-300 font-mono">
                      {currentUser.location}
                    </div>
                  </div>

                  {/* Role Badge */}
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg border ${currentRoleMeta.badgeClass}`}
                  >
                    {currentRoleMeta.icon}
                    <span>{currentRoleMeta.label}</span>
                  </span>

                  {/* Verification Badge & Action */}
                  {currentUser.verificationStatus === 'verified' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-400/40 shadow-[0_0_10px_rgba(52,211,153,0.15)]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Verified</span>
                    </span>
                  ) : currentUser.verificationStatus === 'pending' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-400/40 shadow-[0_0_10px_rgba(251,191,36,0.15)]">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      <span>Pending Review</span>
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-400/40">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                        <span>Unverified</span>
                      </span>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => openVerifyModal()}
                        className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] transition cursor-pointer"
                        title="Verify collector account to unlock claiming"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-950" />
                        <span>Verify Now</span>
                      </motion.button>
                    </div>
                  )}
                </div>

                {/* My Portal Button */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97, y: 1 }}
                  onClick={() => setActiveMainTab('portal')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer border ${
                    activeMainTab === 'portal'
                      ? 'bg-teal-500 text-slate-950 border-teal-300 shadow-[0_0_20px_rgba(20,184,166,0.4),inset_0_1px_0_rgba(255,255,255,0.45)]'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-teal-100 border-teal-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                  }`}
                  title="Open Collector & Donor Portal"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>My Portal</span>
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
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900/80 hover:bg-rose-950/40 rounded-xl border border-slate-700/60 hover:border-rose-500/40 transition cursor-pointer"
                  title="Sign out of account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Log Out</span>
                </motion.button>
              </>
            ) : (
              /* =================================================== */
              /* LOGGED-OUT STATE                                    */
              /* =================================================== */
              <div className="flex items-center gap-2">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97, y: 1 }}
                  onClick={() => openAuthModal('login')}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-xl text-teal-100 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-teal-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition cursor-pointer"
                >
                  Log In
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97, y: 1 }}
                  onClick={() => openAuthModal('register')}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-white text-slate-950 hover:bg-teal-50 shadow-[0_4px_16px_rgba(255,255,255,0.15),inset_0_1px_0_rgba(255,255,255,0.8)] border border-white/60 transition cursor-pointer"
                >
                  Create Account
                </motion.button>
              </div>
            )}

            {/* Reset Demo Data Button */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={resetDemoData}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-teal-300/80 hover:text-teal-200 bg-slate-900/60 hover:bg-slate-800 rounded-xl border border-teal-500/20 transition cursor-pointer shadow-sm"
              title="Reset local data to original demo seed"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline font-mono text-[11px]">Reset</span>
            </motion.button>

          </div>
        </div>
      </div>
    </header>
  );
}
