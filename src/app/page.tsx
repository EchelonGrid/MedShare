'use client';

import React, { useState } from 'react';
import { useMedShare } from '@/context/MedShareContext';
import { getDaysUntilExpiry } from '@/lib/seed';
import { useIsMounted } from '@/lib/useIsMounted';
import MedicationFeed, { FilterTab } from '@/components/MedicationFeed';
import DonateModal from '@/components/DonateModal';
import VerifyModal from '@/components/VerifyModal';
import ClaimModal from '@/components/ClaimModal';
import AuthModal from '@/components/AuthModal';
import UserPortal from '@/components/UserPortal';
import { Medication } from '@/types/medshare';
import {
  Pill,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Building2,
  Sparkles,
  PlusCircle,
  X,
  Info,
  LayoutDashboard,
} from 'lucide-react';

export default function HomePage() {
  const {
    medications,
    currentUser,
    isDonateOpen,
    openDonateModal,
    closeDonateModal,
    isVerifyOpen,
    verifyNotice,
    openVerifyModal,
    closeVerifyModal,
    isAuthOpen,
    authMode,
    authNotice,
    openAuthModal,
    closeAuthModal,
    activeMainTab,
    setActiveMainTab,
  } = useMedShare();
  const mounted = useIsMounted();
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedMedicationForClaim, setSelectedMedicationForClaim] = useState<Medication | null>(null);
  const [activeFeedTab, setActiveFeedTab] = useState<FilterTab>('available');

  const availableCount = medications.filter((m) => m.status === 'available').length;
  const expiringSoonCount = mounted
    ? medications.filter(
        (m) =>
          m.status === 'available' &&
          getDaysUntilExpiry(m.expiryDate) > 0 &&
          getDaysUntilExpiry(m.expiryDate) <= 60
      ).length
    : 0;
  const collectedCount = medications.filter((m) => m.status === 'collected').length;

  const handleDonateClick = () => {
    if (!currentUser) {
      openAuthModal('register', 'Please create an account or sign in to list unused medicines for donation.');
      return;
    }
    openDonateModal();
  };

  const handleClaimClick = (medication: Medication) => {
    // 1. If not logged in, prompt AuthModal
    if (!currentUser) {
      openAuthModal('login', 'Please sign in or create a Collector account to claim medications.');
      return;
    }

    // 2. If currentUser.role === 'donor', prompt them to switch or log into a Collector profile
    if (currentUser.role === 'donor') {
      setNotification(
        'Donors list medicines for donation. To claim medicines for yourself or a clinic, please log in with or register a Collector account.'
      );
      return;
    }

    // 3. If !currentUser.isVerified, automatically open <VerifyModal /> with required notice
    if (!currentUser.isVerified) {
      openVerifyModal(
        'Verification Required: Please verify your collector account first to claim this medicine.'
      );
      return;
    }

    // 4. If currentUser.isVerified is true, open <ClaimModal /> for that specific medication
    setSelectedMedicationForClaim(medication);
  };

  const handleClaimSuccess = (msg: string) => {
    setNotification(msg);
    // Switch to portal so user can immediately view unlocked donor contact details and coordinate pickup
    setActiveMainTab('portal');
  };

  const handleVerifySuccess = (msg: string) => {
    setNotification(msg);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <div className="flex-1">
        {/* Hero Banner */}
        <section className="bg-gradient-to-b from-teal-700 via-teal-800 to-slate-900 text-white pt-10 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                <span>Verified Community Medication Redistribution Platform</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Bridge the Gap Between Surplus Medicine &amp; Rural Healthcare
              </h1>
              <p className="text-base sm:text-lg text-teal-100/90 leading-relaxed">
                Every day, unopened and unexpired medications go to waste while rural clinics
                and lower-income patients struggle with medication shortages. MedShare provides
                a verified, time-critical redistribution channel before expiration dates hit.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-3 text-xs sm:text-sm text-teal-200/90">
                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                  <ShieldCheck className="w-4 h-4 text-emerald-300" /> Verified NGO Outreach
                </span>
                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                  <Building2 className="w-4 h-4 text-sky-300" /> Rural Clinic Support
                </span>
                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                  <Clock className="w-4 h-4 text-amber-300" /> Expiry-Aware Allocation (FEFO)
                </span>
              </div>
            </div>

            {/* 3 Live Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-10">
              {/* Card 1: Available Medicines */}
              <div className="bg-slate-800/80 backdrop-blur border border-teal-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-teal-400/60 transition">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-teal-200">Available Medicines</span>
                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-300">
                    <Pill className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-white tracking-tight">{availableCount}</span>
                  <span className="text-xs text-slate-400">units in inventory</span>
                </div>
                <p className="text-xs text-slate-300 mt-2">
                  Unopened, valid medications ready for charity or patient claiming.
                </p>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-400" />
              </div>

              {/* Card 2: Expiring Soon */}
              <div className="bg-slate-800/80 backdrop-blur border border-amber-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-amber-400/60 transition">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-amber-200">Expiring Soon (≤ 60 Days)</span>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-amber-300 tracking-tight">{expiringSoonCount}</span>
                  <span className="text-xs text-slate-400">priority rescue items</span>
                </div>
                <p className="text-xs text-slate-300 mt-2">
                  Nearing expiry window requiring immediate allocation to prevent waste.
                </p>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400" />
              </div>

              {/* Card 3: Medicines Collected */}
              <div className="bg-slate-800/80 backdrop-blur border border-sky-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-sky-400/60 transition">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-sky-200">Medicines Collected</span>
                  <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-300">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-white tracking-tight">{collectedCount}</span>
                  <span className="text-xs text-slate-400">redistributed batches</span>
                </div>
                <p className="text-xs text-slate-300 mt-2">
                  Successfully handed over to clinics, charities, or patients.
                </p>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-blue-400" />
              </div>
            </div>
          </div>
        </section>

        {/* Main Content Area */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          
          {/* Step Preview Toast / Banner */}
          {notification && (
            <div className="bg-teal-50 border border-teal-200 text-teal-900 rounded-2xl p-4 shadow-sm flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-start gap-2.5">
                <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm font-medium leading-relaxed">
                  {notification}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNotification(null)}
                className="p-1 rounded-lg hover:bg-teal-100 text-teal-600 hover:text-teal-900 transition cursor-pointer shrink-0"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Dedicated View Navigation: Live Medicine Feed vs Collector & Donor Portal */}
          <div className="flex items-center justify-between border-b border-slate-200 gap-4">
            <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveMainTab('feed')}
                className={`pb-3.5 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer shrink-0 ${
                  activeMainTab === 'feed'
                    ? 'border-teal-600 text-teal-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Pill className="w-4 h-4" />
                <span>Live Medicine Feed</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-extrabold bg-slate-100 text-slate-700">
                  {availableCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    openAuthModal('login', 'Please sign in or create an account to access the Collector & Donor Portal.');
                    return;
                  }
                  setActiveMainTab('portal');
                }}
                className={`pb-3.5 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer shrink-0 ${
                  activeMainTab === 'portal'
                    ? 'border-teal-600 text-teal-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Collector &amp; Donor Portal</span>
                {currentUser && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-extrabold bg-teal-100 text-teal-800">
                    {currentUser.role === 'donor'
                      ? medications.filter((m) => m.donorId === currentUser.id).length
                      : medications.filter((m) => m.claimedById === currentUser.id && m.status === 'claimed').length}
                  </span>
                )}
              </button>
            </div>

            {activeMainTab === 'feed' && (
              <div className="hidden sm:block shrink-0 pb-2">
                <button
                  type="button"
                  onClick={handleDonateClick}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-teal-200" />
                  <span>Donate Medicine</span>
                </button>
              </div>
            )}
          </div>

          {/* VIEW 1: LIVE MEDICINE RESCUE FEED */}
          {activeMainTab === 'feed' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                    Live Medication Rescue Feed
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Browse available unexpired medicines sorted first-to-expire (FEFO). Filter by urgency or nearby location.
                  </p>
                </div>

                <div className="sm:hidden">
                  <button
                    type="button"
                    onClick={handleDonateClick}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-teal-200" />
                    <span>Donate Medicine</span>
                  </button>
                </div>
              </div>

              {/* Live Filterable Feed */}
              <MedicationFeed
                onClaimClick={handleClaimClick}
                activeTab={activeFeedTab}
                onTabChange={setActiveFeedTab}
              />
            </div>
          )}

          {/* VIEW 2: COLLECTOR & DONOR PORTAL */}
          {activeMainTab === 'portal' && (
            <UserPortal onBackToFeed={() => setActiveMainTab('feed')} />
          )}

        </section>
      </div>

      {/* Donate Medicine Modal */}
      {isDonateOpen && (
        <DonateModal
          isOpen={isDonateOpen}
          onClose={closeDonateModal}
          onSuccess={(msg) => setNotification(msg)}
        />
      )}

      {/* Collector Verification Modal */}
      {isVerifyOpen && (
        <VerifyModal
          isOpen={isVerifyOpen}
          onClose={closeVerifyModal}
          onSuccess={handleVerifySuccess}
          notice={verifyNotice}
        />
      )}

      {/* Claim Medicine Modal */}
      {selectedMedicationForClaim && (
        <ClaimModal
          isOpen={!!selectedMedicationForClaim}
          medication={selectedMedicationForClaim}
          onClose={() => setSelectedMedicationForClaim(null)}
          onSuccess={handleClaimSuccess}
          onViewClaimed={() => {
            setActiveMainTab('portal');
          }}
        />
      )}

      {/* Authentication Modal */}
      {isAuthOpen && (
        <AuthModal
          isOpen={isAuthOpen}
          mode={authMode}
          notice={authNotice}
          onClose={closeAuthModal}
          onSuccess={(msg) => setNotification(msg)}
        />
      )}

      {/* Safety Boundary Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
              </div>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                <strong className="text-slate-800 font-semibold">Safety Boundary:</strong>{' '}
                MedShare only accepts sealed, unexpired medications. Collectors must verify packaging and expiration dates in person during handover.
              </p>
            </div>
            <div className="text-xs text-slate-400 font-mono shrink-0">
              MedShare Protocol • Verified Community Rescue
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
