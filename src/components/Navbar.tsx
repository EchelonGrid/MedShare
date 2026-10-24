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
  HeartHandshake,
  PlusCircle,
  LogOut,
  LayoutDashboard,
} from 'lucide-react';
import { UserRole } from '@/types/medshare';

const ROLE_LABELS: Record<UserRole, { label: string; icon: React.ReactNode; badgeClass: string }> = {
  individual: {
    label: 'Community Member',
    icon: <User className="w-3.5 h-3.5" />,
    badgeClass: 'bg-teal-900/60 text-teal-200 border-teal-500/40',
  },
  clinic_charity: {
    label: 'Rural Clinic / NGO',
    icon: <Building2 className="w-3.5 h-3.5" />,
    badgeClass: 'bg-indigo-950/70 text-indigo-200 border-indigo-400/40',
  },
  admin: {
    label: 'Platform Moderator',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    badgeClass: 'bg-purple-950/70 text-purple-200 border-purple-400/40',
  },
};

export default function Navbar() {
  const {
    currentUser,
    medications,
    pendingVerifications,
    isDbConnected,
    dbMode,
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
            (m.claims || []).some((c) => c.claimerId === currentUser.id && c.status === 'claimed') ||
            (m.donorId === currentUser.id && m.status === 'claimed')
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
    <header className="bg-teal-700 text-white shadow-md border-b border-teal-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Subtitle */}
          <div
            onClick={() => setActiveMainTab('feed')}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <Pill className="w-6 h-6 text-teal-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white">MedShare</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-teal-800/80 border border-teal-500/40 text-teal-200">
                  COMMUNITY MED RESCUE
                </span>
                {isDbConnected ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Live Cloud DB</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    <span>Local Mode</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-teal-100/90 font-medium">
                Rescuing unexpired medication for rural clinics &amp; families
              </p>
            </div>
          </div>

          {/* Right Section: Auth State & Actions */}
          <div className="flex flex-wrap items-center gap-3 justify-between md:justify-end">
            
            {/* Quick Donate Button */}
            <button
              type="button"
              onClick={handleDonateClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-500 active:bg-teal-800 text-white shadow-sm border border-teal-400/40 transition cursor-pointer"
              title="Donate unused unexpired medicines"
            >
              <PlusCircle className="w-3.5 h-3.5 text-teal-200" />
              <span>Donate</span>
            </button>

            {currentUser && currentRoleMeta ? (
              /* =================================================== */
              /* LOGGED-IN STATE                                     */
              /* =================================================== */
              <>
                {/* Active User Badges */}
                <div className="flex items-center gap-2 bg-teal-800/90 rounded-lg px-3 py-1.5 border border-teal-600/50">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-semibold text-white leading-tight">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-teal-200 font-mono">
                      {currentUser.location}
                    </div>
                  </div>

                  {/* Role Badge */}
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${currentRoleMeta.badgeClass}`}
                  >
                    {currentRoleMeta.icon}
                    <span>{currentRoleMeta.label}</span>
                  </span>

                  {/* Verification Badge & Action */}
                  {currentUser.verificationStatus === 'verified' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/50">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Verified</span>
                    </span>
                  ) : currentUser.verificationStatus === 'pending' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/50">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
                      <span>Pending Review</span>
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/50">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
                        <span>Unverified</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => openVerifyModal()}
                        className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-900 shadow-sm transition cursor-pointer"
                        title="Verify collector account to unlock claiming"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-900" />
                        <span>Verify Now</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* My Portal Button */}
                <button
                  type="button"
                  onClick={() => setActiveMainTab('portal')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer border ${
                    activeMainTab === 'portal'
                      ? 'bg-white text-teal-900 border-white shadow-sm'
                      : 'bg-teal-800 hover:bg-teal-900 text-white border-teal-500/50'
                  }`}
                  title="Open Collector & Donor Portal"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>My Portal</span>
                  {portalBadgeCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-extrabold bg-amber-400 text-slate-950">
                      {portalBadgeCount}
                    </span>
                  )}
                </button>

                {/* Log Out Button */}
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-teal-100 hover:text-white bg-teal-800 hover:bg-teal-900 active:bg-teal-950 rounded-lg border border-teal-500/50 transition cursor-pointer"
                  title="Sign out of account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Log Out</span>
                </button>
              </>
            ) : (
              /* =================================================== */
              /* LOGGED-OUT STATE                                    */
              /* =================================================== */
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-lg text-white hover:bg-white/10 border border-teal-500/50 transition cursor-pointer"
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal('register')}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-white text-teal-900 hover:bg-teal-50 shadow-sm transition cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            )}

            {/* Reset Demo Data Button */}
            <button
              type="button"
              onClick={resetDemoData}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-teal-100 hover:text-white bg-teal-800/80 hover:bg-teal-900 active:bg-teal-950 rounded-lg border border-teal-500/50 transition duration-150 shadow-sm"
              title="Reset local data to original demo seed"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Reset Demo</span>
            </button>

          </div>
        </div>
      </div>
    </header>
  );
}

