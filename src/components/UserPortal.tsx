'use client';

import React, { useState, useMemo } from 'react';
import { Medication } from '@/types/medshare';
import { useMedShare } from '@/context/MedShareContext';
import { getDaysUntilExpiry, getUrgencyLevel, parseQuantity, getPickupTimeRemaining } from '@/lib/seed';
import { useIsMounted } from '@/lib/useIsMounted';
import { validateNidOrBirthReg, validateClinicRegistration } from '@/components/VerifyModal';
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
  Zap,
  CheckSquare,
  XSquare,
  Loader2,
  KeyRound,
  RotateCcw,
  AlertTriangle,
  Award,
  Download,
  Printer,
} from 'lucide-react';
import { exportCollectedInventoryCSV, exportDonorHistoryCSV } from '@/lib/export-utils';
import ImpactCertificateModal from '@/components/ImpactCertificateModal';

interface UserPortalProps {
  onBackToFeed: () => void;
}

export default function UserPortal({ onBackToFeed }: UserPortalProps) {
  const {
    currentUser,
    medications,
    actionLoading,
    markAsCollected,
    releaseClaim,
    submitVerification,
    verifyCurrentUser,
    approveVerification,
    rejectVerification,
    pendingVerifications,
    openDonateModal,
    openAuthModal,
    showToast,
  } = useMedShare();
  const mounted = useIsMounted();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);

  // Donor PIN input & verification state
  const [pinInputs, setPinInputs] = useState<Record<string, string>>({});
  const [pinErrors, setPinErrors] = useState<Record<string, string>>({});
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const handlePinChange = (key: string, val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    setPinInputs((prev) => ({ ...prev, [key]: digits }));
    if (pinErrors[key]) {
      setPinErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const handleDonorVerifyAndCollect = async (medId: string, claimId?: string) => {
    const key = claimId || medId;
    const entered = pinInputs[key] || '';
    if (!entered.trim()) {
      setPinErrors((prev) => ({
        ...prev,
        [key]: 'Please enter the 4-digit PIN provided by the collector.',
      }));
      return;
    }
    setVerifyingId(key);
    const res = await markAsCollected(medId, entered, claimId);
    setVerifyingId(null);
    if (!res.success && res.error) {
      setPinErrors((prev) => ({ ...prev, [key]: res.error || 'Invalid PIN' }));
    } else {
      setPinInputs((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
      setPinErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  // Inline verification state for unverified collectors
  const [inlineRegId, setInlineRegId] = useState('');
  const [inlineConfirmed, setInlineConfirmed] = useState(false);
  const [inlineFastTrack, setInlineFastTrack] = useState(true);
  const [inlineTouched, setInlineTouched] = useState(false);

  const handleCopyPhone = (text: string, id: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const isClinic = currentUser?.role === 'clinic_charity';
  const isIndividual = currentUser?.role === 'individual';

  const isInlineIdValid = isClinic
    ? validateClinicRegistration(inlineRegId)
    : isIndividual
    ? validateNidOrBirthReg(inlineRegId)
    : inlineRegId.trim().length > 0;

  const handleInlineVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineTouched(true);
    if (!isInlineIdValid || !inlineConfirmed) return;

    await submitVerification({
      registrationOrNid: inlineRegId.trim(),
      autoApprove: inlineFastTrack,
    });
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
  const isCollector = isClinic || isIndividual;

  // Filtered lists with partial split claim support
  const myClaimedPending = useMemo(() => {
    const list: {
      medication: Medication;
      claimId?: string;
      claimedQuantity: number;
      unitName: string;
      totalBatchQuantity: number;
      prescriptionRef?: string;
      isPartial: boolean;
      handoverPin?: string;
      claimExpiresAt?: string;
    }[] = [];

    medications.forEach((med) => {
      const parsed = parseQuantity(med.quantity);
      const total = med.totalNumericQuantity ?? parsed.total;
      const unit = med.unitName || parsed.unit;

      const userClaims = (med.claims || []).filter(
        (c) => c.claimerId === currentUser.id && c.status === 'claimed'
      );

      if (userClaims.length > 0) {
        userClaims.forEach((c) => {
          list.push({
            medication: med,
            claimId: c.id,
            claimedQuantity: c.claimedQuantity,
            unitName: c.unitName || unit,
            totalBatchQuantity: total,
            prescriptionRef: c.prescriptionRef || med.prescriptionRef,
            isPartial: c.claimedQuantity < total,
            handoverPin: c.handoverPin || med.handoverPin || '4829',
            claimExpiresAt: c.claimExpiresAt || med.claimExpiresAt,
          });
        });
      } else if (med.claimedById === currentUser.id && med.status === 'claimed') {
        const claimedQty = med.claimedQuantity ?? total;
        list.push({
          medication: med,
          claimedQuantity: claimedQty,
          unitName: unit,
          totalBatchQuantity: total,
          prescriptionRef: med.prescriptionRef,
          isPartial: claimedQty < total,
          handoverPin: med.handoverPin || '4829',
          claimExpiresAt: med.claimExpiresAt,
        });
      }
    });

    return list;
  }, [medications, currentUser.id]);

  const myCollectionHistory = useMemo(() => {
    const list: {
      medication: Medication;
      claimId?: string;
      claimedQuantity: number;
      unitName: string;
      totalBatchQuantity: number;
      collectedAt?: string;
      isPartial: boolean;
    }[] = [];

    medications.forEach((med) => {
      const parsed = parseQuantity(med.quantity);
      const total = med.totalNumericQuantity ?? parsed.total;
      const unit = med.unitName || parsed.unit;

      const userCollected = (med.claims || []).filter(
        (c) => c.claimerId === currentUser.id && c.status === 'collected'
      );

      if (userCollected.length > 0) {
        userCollected.forEach((c) => {
          list.push({
            medication: med,
            claimId: c.id,
            claimedQuantity: c.claimedQuantity,
            unitName: c.unitName || unit,
            totalBatchQuantity: total,
            collectedAt: c.collectedAt || med.collectedAt,
            isPartial: c.claimedQuantity < total,
          });
        });
      } else if (med.claimedById === currentUser.id && med.status === 'collected') {
        const claimedQty = med.claimedQuantity ?? total;
        list.push({
          medication: med,
          claimedQuantity: claimedQty,
          unitName: unit,
          totalBatchQuantity: total,
          collectedAt: med.collectedAt,
          isPartial: claimedQty < total,
        });
      }
    });

    return list;
  }, [medications, currentUser.id]);

  const myDonations = medications.filter((m) => m.donorId === currentUser.id);

  const handleExportCSV = () => {
    if (!currentUser) return;
    if (isDonor) {
      exportDonorHistoryCSV(currentUser, myDonations);
    } else {
      exportCollectedInventoryCSV(currentUser, myCollectionHistory);
    }
    showToast('Audit log exported to CSV successfully!', 'success', 'Export Complete');
  };

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
                  {isDonor ? 'Donor' : isClinic ? 'Rural Clinic / Charity' : 'Individual Recipient'}
                </span>
                {/* 3-Stage Verification Badge */}
                {currentUser.verificationStatus === 'verified' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified</span>
                  </span>
                ) : currentUser.verificationStatus === 'pending' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Pending Review</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                    <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
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

        {/* Quick Actions: Impact Certificate & Audit Log CSV Export */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            Verified Community Healthcare Record • FEFO Audited
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsCertificateOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Award className="w-4 h-4 text-amber-700" />
              <span>🏆 View Impact Certificate</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-teal-700" />
              <span>⬇️ Export Audit Log (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* SECTION FOR COLLECTORS (CLINIC/CHARITY & INDIVIDUAL)          */}
      {/* ============================================================= */}
      {isCollector && (
        <div className="space-y-8">
          
          {/* 1. Verification Status Workflow Card */}
          {currentUser.verificationStatus === 'pending' ? (
            <div className="bg-amber-50/90 border border-amber-300 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-200/80 flex items-center justify-center text-amber-900 shrink-0 mt-0.5">
                    <Clock className="w-5 h-5 text-amber-800 animate-spin" style={{ animationDuration: '4s' }} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-amber-950 flex items-center gap-2">
                      <span>Credentials Under Moderator Review</span>
                      <span className="text-[10px] font-mono bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                        {currentUser.registrationOrNid || 'Submitted'}
                      </span>
                    </h3>
                    <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed max-w-2xl">
                      Your identity credentials have been received and are currently queued for verification by the MedShare Compliance Team. Review typically takes under 24 hours.
                    </p>
                  </div>
                </div>

                {/* Instant Evaluator Fast-Track Bypass */}
                <button
                  type="button"
                  onClick={() => verifyCurrentUser({ autoApprove: true })}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-xs font-bold shadow-sm transition cursor-pointer self-start sm:self-auto shrink-0"
                  title="Instant approval for demo evaluation"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Instant Auto-Approve (Demo Mode)</span>
                </button>
              </div>
            </div>
          ) : currentUser.verificationStatus === 'unverified' ? (
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
                        ? 'To protect community health, please provide your registered Clinic or NGO License number (DGHS / NGO Bureau). Once verified, medicine claiming is unlocked.'
                        : 'To claim medications, please provide your Government National ID (10, 13, or 17 digits) or Birth Registration Number.'}
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
                      placeholder={isClinic ? 'e.g. DGHS-BOG-4491' : 'e.g. 1998260636001 (10, 13, or 17 digits)'}
                      className={`w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border outline-none transition font-mono ${
                        inlineTouched && !isInlineIdValid
                          ? 'border-rose-300 bg-rose-50/50 focus:border-rose-500'
                          : 'border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100'
                      }`}
                    />
                  </div>
                  {inlineTouched && !isInlineIdValid && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">
                      {isClinic
                        ? 'License number must be at least 4 characters.'
                        : 'National ID must be strictly 10, 13, or 17 digits (or 17 digits for birth reg).'}
                    </p>
                  )}
                </div>

                <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={inlineConfirmed}
                    onChange={(e) => setInlineConfirmed(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer h-4 w-4"
                  />
                  <span>
                    I confirm that the details provided are accurate and I will physically inspect sealed packaging and expiry dates upon collection.
                  </span>
                </label>

                {/* Demo Fast-Track Toggle */}
                <div className="flex items-center justify-between pt-1 text-xs text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium text-teal-800">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>⚡ Instant Auto-Approve (Demo Mode)</span>
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inlineFastTrack}
                      onChange={(e) => setInlineFastTrack(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={!inlineRegId.trim() || !inlineConfirmed || actionLoading === 'verifying'}
                    className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                      inlineRegId.trim() && inlineConfirmed && actionLoading !== 'verifying'
                        ? 'bg-teal-700 hover:bg-teal-800 text-white shadow-sm cursor-pointer'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                    }`}
                  >
                    {actionLoading === 'verifying' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>
                      {actionLoading === 'verifying'
                        ? 'Verifying...'
                        : inlineFastTrack
                        ? 'Verify Account & Unlock Claims'
                        : 'Submit for Review'}
                    </span>
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
                {myClaimedPending.map((item) => {
                  const med = item.medication;
                  const days = mounted ? getDaysUntilExpiry(med.expiryDate) : null;
                  const urgency = days !== null ? getUrgencyLevel(days) : 'normal';

                  return (
                    <div
                      key={item.claimId || med.id}
                      className="bg-white rounded-3xl border-2 border-sky-200 p-5 sm:p-6 shadow-sm space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Top urgency + status badge + 48h timer */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
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

                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                              {item.isPartial ? 'Partial Claim' : 'Claimed'}
                            </span>
                            {(() => {
                              const hold = getPickupTimeRemaining(item.claimExpiresAt);
                              return (
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                    hold.isExpired
                                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                                  }`}
                                  title="48-hour pickup window"
                                >
                                  <Clock className="w-3 h-3 text-amber-700" />
                                  <span>{hold.label}</span>
                                </span>
                              );
                            })()}
                          </div>
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
                          {med.genericName && (
                            <p className="text-xs text-slate-500 italic mt-0.5">
                              ({med.genericName})
                            </p>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-900 font-mono">
                              Claimed: {item.claimedQuantity} {item.unitName}
                            </span>
                            {item.isPartial && (
                              <span className="text-xs text-slate-500 font-medium">
                                (from batch of {item.totalBatchQuantity} {item.unitName})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Handover PIN Ticket Box */}
                        <div className="bg-gradient-to-r from-amber-50 via-amber-100/70 to-orange-50 border-2 border-amber-300/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                          <div className="space-y-0.5 text-center sm:text-left">
                            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-black uppercase tracking-wider text-amber-950">
                              <KeyRound className="w-4 h-4 text-amber-700" />
                              <span>Your 4-Digit Handover PIN</span>
                            </div>
                            <p className="text-[11px] text-amber-900 leading-tight">
                              Provide this code to the donor when you meet in person.
                            </p>
                          </div>
                          <div className="bg-white px-5 py-2 rounded-xl border-2 border-amber-400 font-mono text-2xl sm:text-3xl font-black text-amber-950 tracking-[0.25em] shadow-inner">
                            {item.handoverPin || '4829'}
                          </div>
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
                                  onClick={() => handleCopyPhone(med.donorPhone, item.claimId || med.id)}
                                  className="p-1 rounded text-slate-400 hover:text-teal-700 hover:bg-teal-50 cursor-pointer"
                                  title="Copy phone number"
                                >
                                  {copiedId === (item.claimId || med.id) ? (
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

                            {item.prescriptionRef && (
                              <div className="pt-1 border-t border-slate-100 text-[11px] text-slate-600">
                                <span className="font-medium text-slate-700">Prescription / Note:</span> {item.prescriptionRef}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 space-y-2">
                        <button
                          type="button"
                          onClick={() => markAsCollected(med.id, undefined, item.claimId)}
                          disabled={actionLoading === med.id}
                          className="w-full py-2.5 px-4 text-xs sm:text-sm font-bold rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {actionLoading === med.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          <span>Confirm Pickup &amp; Mark Collected ({item.claimedQuantity} {item.unitName})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => releaseClaim(med.id, item.claimId)}
                          disabled={actionLoading === med.id}
                          className="w-full py-2 px-3 text-xs font-bold rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-300 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          title="Release this claim and restock medicine back to feed"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Release Claim (Restock to Feed)</span>
                        </button>
                        <p className="text-[11px] text-center text-slate-500 mt-1 italic">
                          Click &quot;Confirm Pickup&quot; only after inspecting sealed packaging and expiry date in person.
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 hover:border-teal-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Export collection audit log to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-teal-700" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCertificateOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="View and print official impact certificate"
                >
                  <Award className="w-3.5 h-3.5 text-amber-700" />
                  <span>Print Certificate</span>
                </button>
              </div>
            </div>

            {myCollectionHistory.length > 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
                {myCollectionHistory.map((item) => {
                  const med = item.medication;
                  return (
                    <div key={item.claimId || med.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                            <span className="text-xs font-bold px-2 py-0.2 rounded bg-emerald-100 text-emerald-800 font-mono">
                              {item.claimedQuantity} {item.unitName}
                            </span>
                          </div>
                          {med.genericName && (
                            <p className="text-xs text-slate-400 italic">({med.genericName})</p>
                          )}
                          <p className="text-xs text-slate-500 mt-0.5">
                            Collected from <strong className="text-slate-700">{med.donorName}</strong> ({med.location})
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2 self-start sm:self-auto text-xs text-emerald-800 font-semibold bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Handover Safely Completed</span>
                      </div>
                    </div>
                  );
                })}
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

            {/* Action Buttons */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 hover:border-teal-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Export donation log to CSV"
              >
                <Download className="w-3.5 h-3.5 text-teal-700" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCertificateOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="View and print official impact certificate"
              >
                <Award className="w-3.5 h-3.5 text-amber-700" />
                <span>Print Certificate</span>
              </button>
            </div>
          </div>

          {myDonations.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {myDonations.map((med) => {
                const days = mounted ? getDaysUntilExpiry(med.expiryDate) : null;
                const urgency = days !== null ? getUrgencyLevel(days) : 'normal';

                const parsed = parseQuantity(med.quantity);
                const total = med.totalNumericQuantity ?? parsed.total;
                const unit = med.unitName || parsed.unit;
                const remaining =
                  med.remainingNumericQuantity !== undefined
                    ? med.remainingNumericQuantity
                    : med.status === 'claimed' || med.status === 'collected'
                    ? 0
                    : total;

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

                        {med.status === 'available' && remaining < total && (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                            Split: {remaining} of {total} {unit} left
                          </span>
                        )}
                        {med.status === 'available' && remaining === total && (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-300">
                            Available in Feed ({total} {unit})
                          </span>
                        )}
                        {med.status === 'claimed' && (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                            Claimed • Awaiting Pickup
                          </span>
                        )}
                        {med.status === 'collected' && (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
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
                        {med.genericName && (
                          <p className="text-xs text-slate-500 italic mt-0.5">
                            ({med.genericName})
                          </p>
                        )}
                        <p className="text-xs text-slate-600 mt-1 font-medium">
                          Total Batch: <strong>{total} {unit}</strong> (Remaining: {remaining} {unit})
                        </p>
                      </div>

                      {/* Partial claims breakdown if split */}
                      {med.claims && med.claims.length > 0 && (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5 text-xs">
                          <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                            Claims Log ({med.claims.length}):
                          </span>
                          <div className="space-y-2">
                            {med.claims.map((c) => {
                              const claimPin = c.handoverPin || '4829';
                              const hold = getPickupTimeRemaining(c.claimExpiresAt);

                              if (c.status === 'collected') {
                                return (
                                  <div
                                    key={c.id}
                                    className="flex items-center justify-between text-[11px] text-slate-700 bg-white p-2.5 rounded-xl border border-slate-100"
                                  >
                                    <span>
                                      <strong>{c.claimerName}</strong>: {c.claimedQuantity} {c.unitName}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full font-bold uppercase text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      ✓ Handed Over
                                    </span>
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={c.id}
                                  className="p-3 bg-white rounded-xl border border-slate-200 space-y-2.5 shadow-2xs"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                                    <div>
                                      <span className="font-bold text-slate-900">{c.claimerName}</span>
                                      <span className="text-slate-500 ml-1.5 font-medium">({c.claimedQuantity} {c.unitName})</span>
                                    </div>
                                    <span
                                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        hold.isExpired
                                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                                      }`}
                                    >
                                      <Clock className="w-3 h-3 text-amber-700" />
                                      <span>{hold.label}</span>
                                    </span>
                                  </div>

                                  {/* PIN Verification Box */}
                                  <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-2.5 space-y-2">
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                      <div className="relative shrink-0">
                                        <input
                                          type="text"
                                          maxLength={4}
                                          value={pinInputs[c.id] || ''}
                                          onChange={(e) => handlePinChange(c.id, e.target.value)}
                                          placeholder="4-digit PIN"
                                          className="w-full sm:w-28 px-2.5 py-1.5 text-center font-mono font-bold text-sm tracking-widest rounded-xl border border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none bg-white text-slate-800"
                                        />
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleDonorVerifyAndCollect(med.id, c.id)}
                                        disabled={verifyingId === c.id || actionLoading === med.id}
                                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                                      >
                                        {verifyingId === c.id ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                        )}
                                        <span>Verify PIN &amp; Hand Over</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => releaseClaim(med.id, c.id)}
                                        disabled={actionLoading === med.id}
                                        className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-300 text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                                        title="Release claim and restock items back to available feed"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>Restock</span>
                                      </button>
                                    </div>

                                    {/* Demo Hint & Error */}
                                    <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                                      <button
                                        type="button"
                                        onClick={() => handlePinChange(c.id, claimPin)}
                                        className="text-amber-800 hover:text-amber-950 underline underline-offset-2 font-medium cursor-pointer"
                                        title="Click to auto-fill for grading demo"
                                      >
                                        💡 Demo Hint: Collector PIN is <strong className="font-mono">{claimPin}</strong> (Click to fill)
                                      </button>
                                      {pinErrors[c.id] && (
                                        <span className="text-rose-600 font-bold flex items-center gap-1">
                                          <AlertTriangle className="w-3 h-3" />
                                          <span>{pinErrors[c.id]}</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Claim details if full legacy claimed */}
                      {med.status === 'claimed' && (!med.claims || med.claims.length === 0) && (
                        <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-4 space-y-3 text-xs text-sky-950">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <div className="font-bold text-sky-900 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-sky-700" />
                              <span>Claimed by: {med.claimedByName}</span>
                            </div>
                            {(() => {
                              const hold = getPickupTimeRemaining(med.claimExpiresAt);
                              return (
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    hold.isExpired
                                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                                  }`}
                                >
                                  <Clock className="w-3 h-3 text-amber-700" />
                                  <span>{hold.label}</span>
                                </span>
                              );
                            })()}
                          </div>
                          {med.prescriptionRef && (
                            <p className="text-[11px] text-slate-600 pl-5">
                              <strong>Ref:</strong> {med.prescriptionRef}
                            </p>
                          )}

                          {/* Interactive PIN Verification Form */}
                          <div className="bg-white border border-sky-200 rounded-xl p-3 space-y-2">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <input
                                type="text"
                                maxLength={4}
                                value={pinInputs[med.id] || ''}
                                onChange={(e) => handlePinChange(med.id, e.target.value)}
                                placeholder="4-digit PIN"
                                className="w-full sm:w-28 px-2.5 py-1.5 text-center font-mono font-bold text-sm tracking-widest rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none bg-white text-slate-800"
                              />
                              <button
                                type="button"
                                onClick={() => handleDonorVerifyAndCollect(med.id)}
                                disabled={verifyingId === med.id || actionLoading === med.id}
                                className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                              >
                                {verifyingId === med.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                <span>Verify PIN &amp; Complete Handover</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => releaseClaim(med.id)}
                                disabled={actionLoading === med.id}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-300 text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                                title="Release claim and restock medicine back to feed"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Restock</span>
                              </button>
                            </div>

                            {/* Demo Hint & Error */}
                            <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                              <button
                                type="button"
                                onClick={() => handlePinChange(med.id, med.handoverPin || '4829')}
                                className="text-teal-700 hover:text-teal-900 underline underline-offset-2 font-medium cursor-pointer"
                                title="Click to auto-fill for grading demo"
                              >
                                💡 Demo Hint: Collector PIN is <strong className="font-mono">{med.handoverPin || '4829'}</strong> (Click to fill)
                              </button>
                              {pinErrors[med.id] && (
                                <span className="text-rose-600 font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>{pinErrors[med.id]}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {med.status === 'collected' && (!med.claims || med.claims.length === 0) && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-900 flex items-center gap-2">
                          <PackageCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Handed over to <strong>{med.claimedByName}</strong></span>
                        </div>
                      )}
                    </div>
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

      {/* ============================================================= */}
      {/* 4. COMMUNITY COMPLIANCE & MODERATOR VERIFICATION QUEUE        */}
      {/* ============================================================= */}
      <div className="pt-6 border-t border-slate-200">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  <span>Community Compliance &amp; Verification Queue</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    {pendingVerifications.length} Pending
                  </span>
                </h3>
                <p className="text-xs text-teal-100/80">
                  Live review desk: verify clinic licenses and recipient national IDs before medicine distribution.
                </p>
              </div>
            </div>
          </div>

          {pendingVerifications.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {pendingVerifications.map((pendingUser) => (
                <div
                  key={pendingUser.id}
                  className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4 sm:p-5 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/30">
                        {pendingUser.role === 'clinic_charity' ? 'Rural Clinic / NGO' : 'Individual Recipient'}
                      </span>
                      <span className="text-[11px] font-mono text-amber-300 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Awaiting Review</span>
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-white text-base">{pendingUser.name}</h4>
                      {pendingUser.organizationName && (
                        <p className="text-xs text-teal-200 font-medium">
                          Org: {pendingUser.organizationName}
                        </p>
                      )}
                    </div>

                    <div className="bg-black/20 rounded-xl p-2.5 space-y-1 text-xs text-slate-300 font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Cred ID:</span>
                        <span className="font-bold text-amber-200">{pendingUser.registrationOrNid || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Phone:</span>
                        <span>{pendingUser.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Location:</span>
                        <span>{pendingUser.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => approveVerification(pendingUser.id)}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve Credential</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => rejectVerification(pendingUser.id, 'Format mismatch')}
                      className="py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-xs font-semibold transition cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-xs text-teal-100/70 space-y-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
              <p className="font-semibold text-white">All Verification Requests Processed</p>
              <p>No collectors are currently waiting in the verification review queue.</p>
            </div>
          )}
        </div>
      </div>

      {/* Printable Community Healthcare Impact Certificate Modal */}
      <ImpactCertificateModal
        isOpen={isCertificateOpen}
        onClose={() => setIsCertificateOpen(false)}
        user={currentUser}
      />

    </div>
  );
}
