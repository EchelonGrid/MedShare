'use client';

import React, { useState } from 'react';
import { useMedShare } from '@/context/MedShareContext';
import { getDaysUntilExpiry, getUrgencyLevel } from '@/lib/seed';
import { useIsMounted } from '@/lib/useIsMounted';
import {
  User,
  Building2,
  HeartHandshake,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Phone,
  Calendar,
  Package,
  CheckCircle2,
  Clock,
  ArrowLeft,
  PlusCircle,
  Copy,
  Check,
  PackageCheck,
  FileText,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface UserPortalProps {
  onBackToFeed: () => void;
}

export default function UserPortal({ onBackToFeed }: UserPortalProps) {
  const {
    currentUser,
    medications,
    markAsCollected,
    verifyCurrentUser,
    openDonateModal,
    openAuthModal,
  } = useMedShare();
  const mounted = useIsMounted();

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Inline verification state for unverified collectors
  const [inlineRegId, setInlineRegId] = useState('');
  const [inlineConfirmed, setInlineConfirmed] = useState(false);
  const [verifySubmitted, setVerifySubmitted] = useState(false);

  const handleCopyPhone = (text: string, id: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleInlineVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineRegId.trim() || !inlineConfirmed) return;

    verifyCurrentUser({
      registrationOrNid: inlineRegId.trim(),
    });
    setVerifySubmitted(true);
  };

  // If visitor is logged out
  if (!currentUser) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-5 max-w-xl mx-auto my-6 shadow-sm">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-inner">
          <User className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900">
            Sign In to Access Your Portal
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            The Collector &amp; Donor Portal allows you to track your claimed medicines, view donor pickup contacts, and manage your donations.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-bold shadow-sm transition cursor-pointer"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => openAuthModal('register')}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition cursor-pointer"
          >
            Create Account
          </button>
        </div>
      </div>
    );
  }

  const isDonor = currentUser.role === 'donor';
  const isClinic = currentUser.role === 'clinic_charity';
  const isIndividual = currentUser.role === 'individual';
  const isCollector = isClinic || isIndividual;

  // Filtered lists
  const myClaimedPending = medications.filter(
    (m) => m.claimedById === currentUser.id && m.status === 'claimed'
  );
  const myCollectionHistory = medications.filter(
    (m) => m.claimedById === currentUser.id && m.status === 'collected'
  );
  const myDonations = medications.filter((m) => m.donorId === currentUser.id);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Top Bar with Back to Feed button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToFeed}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-teal-800 transition cursor-pointer self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Live Medicine Feed</span>
        </button>

        {isDonor && (
          <button
            type="button"
            onClick={openDonateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-bold shadow-sm transition cursor-pointer self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Donate Medicine</span>
          </button>
        )}
      </div>

      {/* Account Overview Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0 shadow-inner">
              {isClinic ? (
                <Building2 className="w-7 h-7" />
              ) : isDonor ? (
                <HeartHandshake className="w-7 h-7" />
              ) : (
                <User className="w-7 h-7" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {currentUser.name}
                </h2>
                {/* Role Badge */}
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-300">
                  {isDonor ? 'Donor' : isClinic ? 'Clinic / Charity' : 'Individual Recipient'}
                </span>
                {/* Verification Badge */}
                {currentUser.isVerified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                    <span>Unverified</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-0.5">
                <span className="font-mono">{currentUser.email}</span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentUser.phone}</span>
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentUser.location}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Counter Badges */}
          <div className="flex items-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
            {isCollector ? (
              <>
                <div className="bg-sky-50 border border-sky-200 rounded-2xl px-4 py-2.5 text-center">
                  <div className="text-2xl font-extrabold text-sky-900">{myClaimedPending.length}</div>
                  <div className="text-[11px] font-semibold text-sky-700">Pending Pickup</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-2.5 text-center">
                  <div className="text-2xl font-extrabold text-emerald-900">{myCollectionHistory.length}</div>
                  <div className="text-[11px] font-semibold text-emerald-700">Collected</div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-teal-50 border border-teal-200 rounded-2xl px-4 py-2.5 text-center">
                  <div className="text-2xl font-extrabold text-teal-900">{myDonations.length}</div>
                  <div className="text-[11px] font-semibold text-teal-700">Total Donated</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-2.5 text-center">
                  <div className="text-2xl font-extrabold text-emerald-900">
                    {myDonations.filter((m) => m.status === 'collected').length}
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-700">Handed Over</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* SECTION FOR COLLECTORS (CLINIC/CHARITY & INDIVIDUAL)          */}
      {/* ============================================================= */}
      {isCollector && (
        <div className="space-y-8">
          
          {/* 1. Verification Status Card */}
          {!currentUser.isVerified ? (
            <div className="bg-amber-50/90 border border-amber-300 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xs">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-200/80 flex items-center justify-center text-amber-900 shrink-0">
                    <ShieldAlert className="w-5 h-5 text-amber-800" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-amber-950">
                      Collector Verification Required
                    </h3>
                    <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed max-w-2xl">
                      {isClinic
                        ? 'To protect community health, please provide your registered Clinic or NGO License number. Once submitted, medicine claiming is unlocked immediately.'
                        : 'To claim medications, please provide your Government National ID (NID) or Birth Registration Number to confirm recipient authenticity.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Inline Verification Form */}
              <form onSubmit={handleInlineVerify} className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-200 space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {isClinic
                      ? 'Clinic / NGO License Number (DGHS / NGO Bureau)'
                      : 'National ID (NID) / Birth Registration Number'}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={inlineRegId}
                      onChange={(e) => setInlineRegId(e.target.value)}
                      placeholder={isClinic ? 'e.g. NGO-CLINIC-7729' : 'e.g. 1998260636001'}
                      className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition font-mono"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={inlineConfirmed}
                    onChange={(e) => setInlineConfirmed(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer h-4 w-4"
                  />
                  <span>
                    I confirm that the details provided are accurate and I will physically inspect the sealed packaging and expiry date upon collection.
                  </span>
                </label>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={!inlineRegId.trim() || !inlineConfirmed}
                    className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                      inlineRegId.trim() && inlineConfirmed
                        ? 'bg-teal-700 hover:bg-teal-800 text-white shadow-sm cursor-pointer'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify Account &amp; Unlock Claims</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-emerald-50/80 border border-emerald-300 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-200/80 flex items-center justify-center text-emerald-800 shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                    <span>Verified Collector Credential Active</span>
                    <span className="text-[10px] font-mono font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                      {currentUser.registrationOrNid || 'Verified'}
                    </span>
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Your account is fully verified. You can claim available medicines and coordinate pickup directly with donors.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. My Claimed Medicines (Pending Pickup) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>My Claimed Medicines (Pending Pickup)</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                    {myClaimedPending.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Contact the donor directly to arrange handover. Inspect packaging seals and expiry dates in person before confirming.
                </p>
              </div>
            </div>

            {myClaimedPending.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {myClaimedPending.map((med) => {
                  const days = mounted ? getDaysUntilExpiry(med.expiryDate) : null;
                  const urgency = days !== null ? getUrgencyLevel(days) : 'normal';

                  return (
                    <div
                      key={med.id}
                      className="bg-white rounded-3xl border-2 border-sky-200 p-5 sm:p-6 shadow-sm space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Top urgency + status badge */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                              urgency === 'critical'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : urgency === 'priority'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-teal-100 text-teal-800 border border-teal-300'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>{days !== null ? `Expires in ${days}d` : med.expiryDate}</span>
                          </span>

                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                            Claimed • Awaiting Pickup
                          </span>
                        </div>

                        {/* Medicine details */}
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-extrabold text-slate-900 text-base sm:text-lg">
                              {med.medicineName}
                            </h4>
                            <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-md bg-teal-100 text-teal-900 border border-teal-300 font-mono">
                              {med.strength}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 font-medium">
                            {med.quantity}
                          </p>
                        </div>

                        {/* UNLOCKED DONOR CONTACT INFORMATION */}
                        <div className="bg-gradient-to-br from-teal-50 to-sky-50 border border-teal-200 rounded-2xl p-4 space-y-2 text-xs">
                          <div className="flex items-center justify-between font-bold text-teal-950 uppercase tracking-wider text-[11px]">
                            <span className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-teal-700" />
                              <span>Donor Pickup Contact (Unlocked)</span>
                            </span>
                          </div>

                          <div className="bg-white rounded-xl p-3 border border-teal-200/80 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Donor Name:</span>
                              <span className="font-bold text-slate-800">{med.donorName}</span>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                              <span className="text-slate-500">Phone:</span>
                              <div className="flex items-center gap-2">
                                <a
                                  href={`tel:${med.donorPhone}`}
                                  className="font-mono font-bold text-teal-700 hover:text-teal-900 hover:underline"
                                >
                                  {med.donorPhone}
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleCopyPhone(med.donorPhone, med.id)}
                                  className="p-1 rounded text-slate-400 hover:text-teal-700 hover:bg-teal-50 cursor-pointer"
                                  title="Copy phone number"
                                >
                                  {copiedId === med.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                              <span className="text-slate-500">Pickup Area:</span>
                              <span className="font-medium text-slate-800 text-right">{med.location}</span>
                            </div>

                            {med.prescriptionRef && (
                              <div className="pt-1 border-t border-slate-100 text-[11px] text-slate-600">
                                <span className="font-medium text-slate-700">Prescription / Note:</span> {med.prescriptionRef}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Confirm Pickup Action */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => markAsCollected(med.id)}
                          className="w-full py-2.5 px-4 text-xs sm:text-sm font-bold rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Confirm Pickup &amp; Mark Collected</span>
                        </button>
                        <p className="text-[11px] text-center text-slate-500 mt-1 italic">
                          Click only after inspecting sealed packaging and expiry date in person.
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-8 text-center space-y-3">
                <Package className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800">No Pending Claims</h4>
                  <p className="text-xs text-slate-500">
                    You have not claimed any medications pending pickup.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onBackToFeed}
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition cursor-pointer"
                >
                  Browse Available Medications
                </button>
              </div>
            )}
          </div>

          {/* 3. My Collection History */}
          <div className="space-y-4 pt-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>My Collection History</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {myCollectionHistory.length}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Record of all successfully collected and handed over medications.
              </p>
            </div>

            {myCollectionHistory.length > 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
                {myCollectionHistory.map((med) => (
                  <div key={med.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
                        <PackageCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{med.medicineName}</h4>
                          <span className="text-[11px] font-mono font-bold px-2 py-0.2 rounded bg-teal-50 text-teal-800 border border-teal-200">
                            {med.strength}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {med.quantity} • Collected from <strong className="text-slate-700">{med.donorName}</strong> ({med.location})
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 self-start sm:self-auto text-xs text-emerald-800 font-semibold bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Handover Safely Completed</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 text-center text-xs text-slate-500">
                No past collections on record yet.
              </div>
            )}
          </div>

        </div>
      )}

      {/* ============================================================= */}
      {/* SECTION FOR DONORS                                            */}
      {/* ============================================================= */}
      {isDonor && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>My Listed Medications</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-300">
                  {myDonations.length}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Track the status of medicines you have listed for community redistribution.
              </p>
            </div>
          </div>

          {myDonations.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {myDonations.map((med) => {
                const days = mounted ? getDaysUntilExpiry(med.expiryDate) : null;
                const urgency = days !== null ? getUrgencyLevel(days) : 'normal';

                return (
                  <div
                    key={med.id}
                    className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            urgency === 'critical'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : urgency === 'priority'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-teal-100 text-teal-800 border border-teal-300'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{days !== null ? `Expires in ${days}d` : med.expiryDate}</span>
                        </span>

                        {med.status === 'available' && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-300">
                            Available in Feed
                          </span>
                        )}
                        {med.status === 'claimed' && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                            Claimed • Awaiting Pickup
                          </span>
                        )}
                        {med.status === 'collected' && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ Handed Over
                          </span>
                        )}
                      </div>

                      {/* Medicine Info */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-extrabold text-slate-900 text-base sm:text-lg">
                            {med.medicineName}
                          </h4>
                          <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-md bg-teal-100 text-teal-900 border border-teal-300 font-mono">
                            {med.strength}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 font-medium">{med.quantity}</p>
                      </div>

                      {/* Claim details if claimed */}
                      {med.status === 'claimed' && (
                        <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-3.5 space-y-1.5 text-xs text-sky-950">
                          <div className="font-bold text-sky-900 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-sky-700" />
                            <span>Claimed by: {med.claimedByName}</span>
                          </div>
                          {med.prescriptionRef && (
                            <p className="text-[11px] text-slate-600 pl-5">
                              <strong>Ref:</strong> {med.prescriptionRef}
                            </p>
                          )}
                          <p className="text-[11px] text-sky-800 leading-snug pt-1">
                            The claimant will contact you by phone for in-person handover. Once collected, click below to close the listing.
                          </p>
                        </div>
                      )}

                      {med.status === 'collected' && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-900 flex items-center gap-2">
                          <PackageCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Handed over to <strong>{med.claimedByName}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {med.status === 'claimed' && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => markAsCollected(med.id)}
                          className="w-full py-2.5 px-4 text-xs sm:text-sm font-bold rounded-xl bg-sky-700 hover:bg-sky-800 active:bg-sky-900 text-white transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Mark as Handed Over</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-8 text-center space-y-3">
              <HeartHandshake className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">No Listed Medicines</h4>
                <p className="text-xs text-slate-500">
                  You have not listed any medications for rescue yet.
                </p>
              </div>
              <button
                type="button"
                onClick={openDonateModal}
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition cursor-pointer"
              >
                Donate Medicine Now
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
