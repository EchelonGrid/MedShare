'use client';

import React, { useState } from 'react';
import { useMedShare } from '@/context/MedShareContext';
import { getDaysUntilExpiry } from '@/lib/seed';
import { useIsMounted } from '@/lib/useIsMounted';
import MedicationFeed, { FilterTab } from '@/components/MedicationFeed';
import DonateModal from '@/components/DonateModal';
import VerifyModal from '@/components/VerifyModal';
import ClaimModal from '@/components/ClaimModal';
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
  } = useMedShare();
  const mounted = useIsMounted();
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedMedicationForClaim, setSelectedMedicationForClaim] = useState<Medication | null>(null);
  const [activeFeedTab, setActiveFeedTab] = useState<FilterTab>('available');

  const availableCount = medications.filter((m) => m.status === 'available').length;
  const expiringSoonCount = mounted
    ? medications.filter(
        (m) => m.status === 'available' && getDaysUntilExpiry(m.expiryDate) <= 60
      ).length
    : 0;
  const collectedCount = medications.filter((m) => m.status === 'collected').length;

  const handleDonateClick = () => {
    openDonateModal();
  };

  const handleClaimClick = (medication: Medication) => {
    // 1. If currentUser.role === 'donor', prompt them to switch to a Collector profile in top navbar
    if (currentUser.role === 'donor') {
      setNotification(
        'Donors cannot claim medicines. Please switch to a Collector profile (Rural Clinic or Individual Recipient) in the top navbar to claim.'
      );
      return;
    }

    // 2. If !currentUser.isVerified, automatically open <VerifyModal /> with required notice
    if (!currentUser.isVerified) {
      openVerifyModal(
        'Verification Required: Please verify your collector account first to claim this medicine.'
      );
      return;
    }

    // 3. If currentUser.isVerified is true, open <ClaimModal /> for that specific medication
    setSelectedMedicationForClaim(medication);
  };

  const handleClaimSuccess = (msg: string) => {
    setNotification(msg);
    setActiveFeedTab('claimed_collected');
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
                <span>Step 4: Collector Verification, Claim &amp; Full Handover Lifecycle</span>
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
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
          
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

          {/* Section Header with Donate Medicine Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Live Medication Rescue Feed
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Browse available unexpired medicines sorted first-to-expire. Filter by urgency or nearby location.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDonateClick}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-semibold text-xs sm:text-sm shadow-sm transition hover:shadow cursor-pointer"
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
            setActiveFeedTab('claimed_collected');
          }}
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
