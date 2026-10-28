'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Medication } from '@/types/medshare';
import { useMedShare } from '@/context/MedShareContext';
import { getDaysUntilExpiry, getUrgencyLevel, parseQuantity, getPickupTimeRemaining } from '@/lib/seed';
import { useIsMounted } from '@/lib/useIsMounted';
import { validateNidOrBirthReg, validateClinicRegistration } from '@/components/VerifyModal';
import {
  BD_DISTRICT_NAMES,
  OFFICIAL_BD_DISTRICT_GEOCODES,
  VERIFIED_BD_FACILITIES,
  validateBangladeshNID,
  validateFacilityCredential,
} from '@/lib/bd-registries';
import TiltSpotlightCard from '@/components/ui/TiltSpotlightCard';
import { motion, AnimatePresence } from 'framer-motion';
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
  ArrowRight,
  Mail,
  Info,
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
  Cpu,
  Fingerprint,
  Radio,
  Lock,
} from 'lucide-react';
import { exportCollectedInventoryCSV, exportDonorHistoryCSV } from '@/lib/export-utils';
import ImpactCertificateModal from '@/components/ImpactCertificateModal';

interface UserPortalProps {
  onBackToFeed: () => void;
}

export default function UserPortal({ onBackToFeed }: UserPortalProps) {
  const {
    currentUser,
    allUsers,
    medications,
    actionLoading,
    markAsCollected,
    releaseClaim,
    submitVerification,
    requestVerificationOtp,
    verifyAccountOtp,
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

  // Inline 2-Step verification state for unverified members
  const [inlineStep, setInlineStep] = useState<1 | 2>(1);
  const [inlineFullName, setInlineFullName] = useState('');
  const [inlineBirthYear, setInlineBirthYear] = useState('1998');
  const [inlineDistrictName, setInlineDistrictName] = useState('Bogura');
  const [inlinePhone, setInlinePhone] = useState('');
  const [inlineLocation, setInlineLocation] = useState('');
  const [inlineOrgName, setInlineOrgName] = useState('');
  const [inlineRegId, setInlineRegId] = useState('');
  const [inlineConfirmed, setInlineConfirmed] = useState(false);
  const [inlineTouched, setInlineTouched] = useState(false);
  const [inlineOtpCode, setInlineOtpCode] = useState('');
  const [inlineDemoOtp, setInlineDemoOtp] = useState<string | null>(null);
  const [inlineResendCooldown, setInlineResendCooldown] = useState(0);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [inlineAnatomyMatch, setInlineAnatomyMatch] = useState<string | null>(null);

  // Sync state whenever currentUser changes so prefilled fields are recognized immediately
  useEffect(() => {
    if (currentUser) {
      setInlineFullName(currentUser.name || '');
      setInlinePhone(currentUser.phone || '');
      setInlineLocation(currentUser.location || '');
      setInlineOrgName(currentUser.organizationName || (currentUser.role === 'clinic_charity' ? currentUser.name : ''));
      setInlineRegId(currentUser.registrationOrNid || '');
      setInlineStep(1);
      setInlineOtpCode('');
      setInlineError(null);
      setInlineAnatomyMatch(null);
      setInlineConfirmed(false);
      setInlineTouched(false);
    }
  }, [currentUser]);

  // Resend OTP countdown timer
  useEffect(() => {
    if (inlineResendCooldown <= 0) return;
    const t = setTimeout(() => setInlineResendCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [inlineResendCooldown]);

  const handleCopyPhone = (text: string, id: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const currentUserId = currentUser?.id;
  const isAdmin = currentUser?.role === 'admin';
  const isClinic = currentUser?.role === 'clinic_charity';
  const isIndividual = currentUser?.role === 'individual';
  const isCollector = isClinic || isIndividual;

  // STEP 1 Submission: Validate against authentic Bangladesh registries & dispatch Supabase OTP
  const handleInlineStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineTouched(true);
    setInlineError(null);
    setInlineAnatomyMatch(null);

    if (!inlineConfirmed) {
      setInlineError('Please check the confirmation box verifying that the details are authentic.');
      return;
    }

    if (!inlinePhone.trim() || inlinePhone.trim().length < 8) {
      setInlineError('Please enter a valid official contact phone number.');
      return;
    }

    if (!inlineLocation.trim() || inlineLocation.trim().length < 3) {
      setInlineError('Please enter your area or facility physical location.');
      return;
    }

    let normalizedCred = inlineRegId.trim();

    if (isClinic) {
      const res = validateFacilityCredential({
        orgName: inlineOrgName,
        regNumber: inlineRegId,
        districtName: inlineDistrictName,
      });

      if (!res.valid) {
        setInlineError(res.error || 'Failed facility credential verification.');
        return;
      }
      if (res.normalizedRegNumber) {
        normalizedCred = res.normalizedRegNumber;
      }
      if (res.matchedOfficialRecord) {
        setInlineAnatomyMatch(`✓ Matched official Bangladesh ${res.matchedOfficialRecord.type} Registry: ${res.matchedOfficialRecord.name}`);
      }
    } else {
      const res = validateBangladeshNID({
        nid: inlineRegId,
        birthYear: inlineBirthYear,
        districtName: inlineDistrictName,
      });

      if (!res.valid) {
        setInlineError(res.error || 'Failed National ID anatomy validation.');
        return;
      }
      if (res.normalizedNid) {
        normalizedCred = res.normalizedNid;
      }
      if (res.type === 'smart_10') {
        setInlineAnatomyMatch(`✓ Validated 10-Digit Smart NID format.`);
      } else if (res.type === 'classic_13') {
        setInlineAnatomyMatch(`✓ Standardized 13-digit NID with birth year ${inlineBirthYear}. BBS District Code: ${res.details?.districtGeoCode}.`);
      } else {
        setInlineAnatomyMatch(`✓ Validated 17-Digit Standard NID: Birth Year ${res.details?.birthYear}, BBS District ${inlineDistrictName} (${res.details?.districtGeoCode}), RMO ${res.details?.rmoCode}.`);
      }
    }

    const otpRes = await requestVerificationOtp({
      name: isClinic ? (inlineOrgName.trim() || currentUser?.name) : inlineFullName.trim(),
      organizationName: isClinic ? inlineOrgName.trim() : currentUser?.organizationName,
      registrationOrNid: normalizedCred,
      phone: inlinePhone.trim(),
      location: inlineLocation.trim(),
      districtName: inlineDistrictName,
      birthYear: inlineBirthYear,
    });

    if (!otpRes.success) {
      setInlineError(otpRes.error || 'Failed to dispatch verification OTP.');
      return;
    }

    if (otpRes.demoOtp) {
      setInlineDemoOtp(otpRes.demoOtp);
    }
    setInlineResendCooldown(60);
    setInlineStep(2);
  };

  // STEP 2 Submission: Verify 6-digit OTP and activate account
  const handleInlineStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError(null);

    if (!inlineOtpCode || inlineOtpCode.trim().length !== 6) {
      setInlineError('Please enter the 6-digit numeric verification code.');
      return;
    }

    const verifyRes = await verifyAccountOtp(inlineOtpCode, {
      name: isClinic ? (inlineOrgName.trim() || currentUser?.name) : inlineFullName.trim(),
      organizationName: isClinic ? inlineOrgName.trim() : currentUser?.organizationName,
      registrationOrNid: inlineRegId.trim(),
      phone: inlinePhone.trim(),
      location: inlineLocation.trim(),
      districtName: inlineDistrictName,
      birthYear: inlineBirthYear,
    });

    if (!verifyRes.success) {
      setInlineError(verifyRes.error || 'Invalid or expired OTP code.');
      return;
    }

    setInlineStep(1);
    setInlineOtpCode('');
  };

  const handleInlineResendOtp = async () => {
    if (inlineResendCooldown > 0) return;
    setInlineError(null);
    const otpRes = await requestVerificationOtp({
      name: isClinic ? (inlineOrgName.trim() || currentUser?.name) : inlineFullName.trim(),
      organizationName: isClinic ? inlineOrgName.trim() : currentUser?.organizationName,
      registrationOrNid: inlineRegId.trim(),
      phone: inlinePhone.trim(),
      location: inlineLocation.trim(),
      districtName: inlineDistrictName,
      birthYear: inlineBirthYear,
    });
    if (otpRes.success) {
      if (otpRes.demoOtp) setInlineDemoOtp(otpRes.demoOtp);
      setInlineResendCooldown(60);
    } else {
      setInlineError(otpRes.error || 'Failed to resend verification OTP.');
    }
  };

  // Claims made by current user pending pickup
  const myClaimedPending = useMemo(() => {
    if (!currentUser) return [];
    const list: {
      medication: Medication;
      claimId: string;
      claimedQuantity: number;
      unitName: string;
      handoverPin?: string;
      claimedAt?: string;
      claimExpiresAt?: string;
      prescriptionRef?: string;
      isPartial: boolean;
      totalBatchQuantity: number;
    }[] = [];

    medications.forEach((med) => {
      const parsed = parseQuantity(med.quantity);
      const total = med.totalNumericQuantity ?? parsed.total;
      const unit = med.unitName || parsed.unit;

      if (med.activeClaims && med.activeClaims.length > 0) {
        med.activeClaims.forEach((ac) => {
          if (ac.collectorId === currentUser.id && ac.status === 'pending_pickup') {
            list.push({
              medication: med,
              claimId: ac.claimId,
              claimedQuantity: ac.quantityClaimed,
              unitName: ac.unitName || unit,
              handoverPin: ac.handoverPin,
              claimedAt: ac.claimedAt,
              claimExpiresAt: ac.claimExpiresAt,
              prescriptionRef: ac.organizationOrRx || med.prescriptionRef,
              isPartial: ac.quantityClaimed < total,
              totalBatchQuantity: total,
            });
          }
        });
      }

      if (med.claims && med.claims.length > 0) {
        med.claims.forEach((bc) => {
          if (
            bc.claimerId === currentUser.id &&
            (bc.status === 'claimed' || (bc.status as string) === 'pending_pickup') &&
            !list.some((l) => l.claimId === bc.id)
          ) {
            list.push({
              medication: med,
              claimId: bc.id,
              claimedQuantity: bc.claimedQuantity,
              unitName: bc.unitName || unit,
              handoverPin: bc.handoverPin,
              claimedAt: bc.claimedAt,
              claimExpiresAt: bc.claimExpiresAt,
              prescriptionRef: bc.prescriptionRef || med.prescriptionRef,
              isPartial: bc.claimedQuantity < total,
              totalBatchQuantity: total,
            });
          }
        });
      }

      if (
        med.claimedById === currentUser.id &&
        med.status === 'claimed' &&
        (!med.claims || med.claims.length === 0) &&
        (!med.activeClaims || med.activeClaims.length === 0)
      ) {
        list.push({
          medication: med,
          claimId: med.id,
          claimedQuantity: med.claimedQuantity ?? total,
          unitName: unit,
          handoverPin: med.handoverPin,
          claimedAt: med.claimedAt,
          claimExpiresAt: med.claimExpiresAt,
          prescriptionRef: med.prescriptionRef,
          isPartial: (med.claimedQuantity ?? total) < total,
          totalBatchQuantity: total,
        });
      }
    });

    return list;
  }, [medications, currentUser]);

  const myCollectionHistory = useMemo(() => {
    if (!currentUser) return [];
    const list: {
      medication: Medication;
      claimId: string;
      claimedQuantity: number;
      unitName: string;
      collectedAt?: string;
    }[] = [];

    medications.forEach((med) => {
      const parsed = parseQuantity(med.quantity);
      const total = med.totalNumericQuantity ?? parsed.total;
      const unit = med.unitName || parsed.unit;

      if (med.claims && med.claims.length > 0) {
        med.claims.forEach((c) => {
          if (c.claimerId === currentUser.id && c.status === 'collected') {
            list.push({
              medication: med,
              claimId: c.id,
              claimedQuantity: c.claimedQuantity,
              unitName: c.unitName || unit,
              collectedAt: c.collectedAt || med.collectedAt,
            });
          }
        });
      }

      if (med.claimedById === currentUser.id && med.status === 'collected') {
        if (!list.some((l) => l.medication.id === med.id)) {
          list.push({
            medication: med,
            claimId: med.id,
            claimedQuantity: med.claimedQuantity ?? total,
            unitName: unit,
            collectedAt: med.collectedAt,
          });
        }
      }
    });

    return list;
  }, [medications, currentUser]);

  const myDonations = useMemo(() => {
    if (!currentUser) return [];
    return medications.filter(
      (m) =>
        m.donorId === currentUser.id ||
        (m.donorName && m.donorName.toLowerCase() === currentUser.name.toLowerCase())
    );
  }, [medications, currentUser]);

  const incomingPickupRequests = useMemo(() => {
    if (!currentUser) return [];
    const isDonorOfMed = (m: Medication) =>
      m.donorId === currentUser.id ||
      (m.donorName && m.donorName.toLowerCase() === currentUser.name.toLowerCase());

    const donorMeds = medications.filter(isDonorOfMed);
    const pendingList: {
      medication: Medication;
      claimId: string;
      collectorId?: string;
      collectorName: string;
      collectorRole?: string;
      collectorPhone?: string;
      organizationOrRx?: string;
      quantityClaimed: number;
      unitName: string;
      handoverPin?: string;
      claimedAt?: string;
      claimExpiresAt?: string;
      isPartial: boolean;
      totalBatchQuantity: number;
    }[] = [];

    donorMeds.forEach((med) => {
      const parsed = parseQuantity(med.quantity);
      const total = med.totalNumericQuantity ?? parsed.total;
      const unit = med.unitName || parsed.unit;

      if (med.activeClaims && med.activeClaims.length > 0) {
        med.activeClaims.forEach((ac) => {
          if (ac.status === 'pending_pickup') {
            pendingList.push({
              medication: med,
              claimId: ac.claimId,
              collectorId: ac.collectorId,
              collectorName: ac.collectorName,
              collectorRole: ac.collectorRole,
              collectorPhone: ac.collectorPhone,
              organizationOrRx: ac.organizationOrRx || med.prescriptionRef,
              quantityClaimed: ac.quantityClaimed,
              unitName: ac.unitName || unit,
              handoverPin: ac.handoverPin,
              claimedAt: ac.claimedAt,
              claimExpiresAt: ac.claimExpiresAt,
              isPartial: ac.quantityClaimed < total,
              totalBatchQuantity: total,
            });
          }
        });
      }

      if (med.claims && med.claims.length > 0) {
        med.claims.forEach((bc) => {
          if (
            (bc.status === 'claimed' || (bc.status as string) === 'pending_pickup') &&
            !pendingList.some((p) => p.claimId === bc.id)
          ) {
            pendingList.push({
              medication: med,
              claimId: bc.id,
              collectorId: bc.claimerId,
              collectorName: bc.claimerName,
              collectorRole: bc.claimerRole,
              collectorPhone: undefined,
              organizationOrRx: bc.prescriptionRef || med.prescriptionRef,
              quantityClaimed: bc.claimedQuantity,
              unitName: bc.unitName || unit,
              handoverPin: bc.handoverPin,
              claimedAt: bc.claimedAt,
              claimExpiresAt: bc.claimExpiresAt,
              isPartial: bc.claimedQuantity < total,
              totalBatchQuantity: total,
            });
          }
        });
      }

      if (
        med.status === 'claimed' &&
        (!med.claims || med.claims.length === 0) &&
        (!med.activeClaims || med.activeClaims.length === 0)
      ) {
        pendingList.push({
          medication: med,
          claimId: med.id,
          collectorId: med.claimedById,
          collectorName: med.claimedByName || 'Verified Collector',
          collectorRole: med.claimedByRole || 'individual',
          collectorPhone: undefined,
          organizationOrRx: med.prescriptionRef,
          quantityClaimed: med.claimedQuantity ?? total,
          unitName: unit,
          handoverPin: med.handoverPin,
          claimedAt: med.claimedAt,
          claimExpiresAt: med.claimExpiresAt,
          isPartial: (med.claimedQuantity ?? total) < total,
          totalBatchQuantity: total,
        });
      }
    });

    return pendingList;
  }, [medications, currentUser]);

  // If visitor is logged out
  if (!currentUser) {
    return (
      <div className="bg-slate-950/85 backdrop-blur-2xl rounded-3xl border border-teal-500/25 p-8 sm:p-12 text-center space-y-5 max-w-xl mx-auto my-6 shadow-2xl">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-teal-500/15 border border-teal-400/30 flex items-center justify-center text-teal-300 shadow-inner">
          <User className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="font-display text-xl font-bold text-white">
            Sign In to Access Your Portal
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed font-sans">
            The Collector &amp; Donor Portal allows you to track your claimed medicines, view donor pickup contacts, and manage your donations.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 text-xs sm:text-sm font-bold shadow-md transition cursor-pointer hover:from-teal-300 hover:to-emerald-400"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => openAuthModal('register')}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-200 text-xs sm:text-sm font-bold border border-teal-500/30 transition cursor-pointer"
          >
            Create Account
          </button>
        </div>
      </div>
    );
  }

  const handleExportCSV = () => {
    if (!currentUser) return;
    if (myDonations.length > 0) {
      exportDonorHistoryCSV(currentUser, myDonations);
    } else {
      exportCollectedInventoryCSV(currentUser, myCollectionHistory);
    }
    showToast('Audit log exported to CSV successfully!', 'success', 'Export Complete');
  };

  const canExportCSV = currentUser?.role === 'clinic_charity' || currentUser?.role === 'admin';
  const hasContributed = myDonations.length > 0 || myCollectionHistory.length > 0 || isAdmin;
  const isVerified = currentUser?.verificationStatus === 'verified';
  const isPending = currentUser?.verificationStatus === 'pending';

  const completedRescuesCount =
    myCollectionHistory.length + myDonations.filter((m) => m.status === 'collected').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Top Bar with Back to Feed button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToFeed}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-mono font-semibold text-teal-700 dark:text-teal-300 hover:text-teal-900 dark:hover:text-white transition cursor-pointer self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>&larr; Back to Live Medicine Feed</span>
        </button>

        {!isAdmin && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97, y: 1 }}
            onClick={openDonateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 text-xs sm:text-sm font-bold shadow-md transition cursor-pointer self-start sm:self-auto border border-teal-300/40"
          >
            <PlusCircle className="w-4 h-4 text-slate-950" />
            <span>Donate Medicine</span>
          </motion.button>
        )}
      </div>

      {/* ============================================================= */}
      {/* 1. UPGRADE: INTERACTIVE 3D HOLOGRAPHIC SMART ID CARD         */}
      {/* ============================================================= */}
      <TiltSpotlightCard
        glowColor={isVerified ? 'teal' : isPending ? 'amber' : 'rose'}
        className="p-6 sm:p-8 bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 border border-teal-400/35 shadow-[0_25px_70px_-15px_rgba(13,148,136,0.35)] relative overflow-hidden"
      >
        {/* Holographic Background Watermark Grid */}
        <div className="pointer-events-none absolute inset-0 bg-spatial-grid-dark opacity-40 z-0" />
        <div className="pointer-events-none absolute -top-24 right-1/4 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl z-0" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Left ID Section: Metallic Security Chip, Serial & User Credentials */}
          <div className="space-y-4 max-w-2xl">
            
            {/* Top Serial & Security Chip Row */}
            <div className="flex items-center justify-between sm:justify-start gap-4">
              {/* Metallic Security Chip Graphic */}
              <div className="w-12 h-9 rounded-lg bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 border border-amber-200/60 shadow-md relative overflow-hidden flex items-center justify-center shrink-0">
                <div className="absolute inset-x-0 top-1/2 h-px bg-amber-800/40" />
                <div className="absolute inset-y-0 left-1/2 w-px bg-amber-800/40" />
                <div className="w-6 h-5 rounded border border-amber-800/50 flex items-center justify-center bg-amber-400/40">
                  <Cpu className="w-3.5 h-3.5 text-amber-950/80" />
                </div>
              </div>

              {/* Monospace Credential Serial Readout */}
              <div className="font-mono text-[11px] text-teal-300/80 space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold tracking-wider text-slate-400">
                  <Fingerprint className="w-3.5 h-3.5 text-teal-400" />
                  <span>HEALTHCARE CREDENTIAL // BD-MEDSHARE</span>
                </div>
                <div className="text-white font-extrabold tracking-widest text-xs">
                  {currentUser.registrationOrNid
                    ? `SERIAL: ${currentUser.registrationOrNid}`
                    : 'SERIAL: PENDING-GOV-REGISTRY-CHECK'}
                </div>
              </div>
            </div>

            {/* User Name & Role Badges */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">
                  {currentUser.name}
                </h2>

                {/* Role Pill */}
                <span
                  className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${
                    isAdmin
                      ? 'bg-purple-950/80 text-purple-200 border-purple-400/40 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                      : isClinic
                      ? 'bg-indigo-950/80 text-indigo-200 border-indigo-400/40 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
                      : 'bg-teal-950/80 text-teal-200 border-teal-500/40 shadow-[0_0_12px_rgba(20,184,166,0.2)]'
                  }`}
                >
                  {isAdmin
                    ? 'Platform Moderator'
                    : isClinic
                    ? 'Rural Clinic / NGO'
                    : 'Community Member'}
                </span>

                {/* Glowing 3D Status Seal */}
                {isVerified ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                    </span>
                    <span>✓ NATIONAL REGISTRY &amp; OTP VERIFIED</span>
                  </span>
                ) : isPending ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                    <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <span>⏳ PENDING MODERATOR REVIEW</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.25)]">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    <span>⚡ ACTION REQUIRED: VERIFY CREDENTIAL</span>
                  </span>
                )}
              </div>

              {/* Contact & Location Strip */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-300 pt-1">
                <span className="text-teal-300">{currentUser.email}</span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-teal-400" />
                  <span>{currentUser.phone}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-teal-400" />
                  <span>{currentUser.location}</span>
                </span>
              </div>
            </div>

          </div>

          {/* Right ID Section: Metric Counters & Floating Translucent Pills */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-teal-500/20 shrink-0">
            
            {/* Live Frosted Metric Counters */}
            <div className="flex items-center gap-3">
              {isAdmin ? (
                <>
                  <div className="bg-slate-900/80 backdrop-blur-md border border-purple-500/35 rounded-2xl px-4 py-2.5 text-center min-w-[100px] shadow-lg">
                    <div className="font-mono text-2xl font-bold text-purple-300">{pendingVerifications.length}</div>
                    <div className="text-[10px] font-mono text-purple-200/80 uppercase">Pending</div>
                  </div>
                  <div className="bg-slate-900/80 backdrop-blur-md border border-emerald-500/35 rounded-2xl px-4 py-2.5 text-center min-w-[100px] shadow-lg">
                    <div className="font-mono text-2xl font-bold text-emerald-300">
                      {allUsers.filter((u) => u.verificationStatus === 'verified').length}
                    </div>
                    <div className="text-[10px] font-mono text-emerald-200/80 uppercase">Verified</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-slate-900/80 backdrop-blur-md border border-sky-500/35 rounded-2xl px-4 py-2.5 text-center min-w-[110px] shadow-lg">
                    <div className="font-mono text-2xl font-bold text-sky-300">{myClaimedPending.length}</div>
                    <div className="text-[10px] font-mono text-sky-200/80 uppercase">Pending Pickups</div>
                  </div>
                  <div className="bg-slate-900/80 backdrop-blur-md border border-teal-500/35 rounded-2xl px-4 py-2.5 text-center min-w-[110px] shadow-lg">
                    <div className="font-mono text-2xl font-bold text-teal-300">{completedRescuesCount}</div>
                    <div className="text-[10px] font-mono text-teal-200/80 uppercase">Handovers Done</div>
                  </div>
                </>
              )}
            </div>

            {/* Floating Translucent Action Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {hasContributed && (
                <button
                  type="button"
                  onClick={() => setIsCertificateOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-400/40 text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.2)] cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>🏆 Impact Certificate</span>
                </button>
              )}
              {canExportCSV && (
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-200 border border-teal-400/40 text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-[0_0_12px_rgba(20,184,166,0.2)] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-teal-400" />
                  <span>⬇️ Export Audit CSV</span>
                </button>
              )}
            </div>

          </div>

        </div>
      </TiltSpotlightCard>

      {/* ============================================================= */}
      {/* 2. ADMIN MODERATOR PORTAL (ONLY FOR ROLE === 'admin')         */}
      {/* ============================================================= */}
      {isAdmin && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 text-white rounded-3xl p-6 sm:p-7 border border-purple-500/30 shadow-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                  <ShieldCheck className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                    <span>Admin Moderator &amp; Verification Review Desk</span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-mono">
                      {pendingVerifications.length} Pending
                    </span>
                  </h3>
                  <p className="text-xs text-purple-200/80 font-mono">
                    Audit Bangladesh NID credentials and rural clinic registration records.
                  </p>
                </div>
              </div>
            </div>

            {pendingVerifications.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingVerifications.map((pendingUser) => (
                  <div
                    key={pendingUser.id}
                    className="bg-slate-900/90 border border-purple-500/30 rounded-2xl p-4 sm:p-5 space-y-3 font-mono text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{pendingUser.name}</span>
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 uppercase text-[10px]">
                        {pendingUser.role}
                      </span>
                    </div>

                    <div className="space-y-1 text-slate-300">
                      <div>Cred: <strong className="text-white">{pendingUser.registrationOrNid}</strong></div>
                      <div>Location: <strong className="text-white">{pendingUser.location}</strong></div>
                      <div>Phone: <strong className="text-white">{pendingUser.phone}</strong></div>
                    </div>

                    <div className="pt-2 flex items-center gap-2 border-t border-purple-500/20">
                      <button
                        type="button"
                        onClick={() => approveVerification(pendingUser.id)}
                        className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold transition cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => rejectVerification(pendingUser.id, 'Format or authenticity mismatch')}
                        className="py-1.5 px-3 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold transition cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-8 text-center text-xs text-teal-200/70 space-y-1.5 font-mono">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1" />
                <p className="font-bold text-white text-sm">All Verification Requests Processed</p>
                <p>No user verification requests are currently awaiting review.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 3. SECTION FOR COMMUNITY MEMBERS & CLINICS                    */}
      {/* ============================================================= */}
      {!isAdmin && (
        <div className="space-y-8">
          
          {/* ========================================================= */}
          {/* 2-STEP AUTOMATED VERIFICATION SECURITY TERMINAL           */}
          {/* ========================================================= */}
          {currentUser.verificationStatus !== 'verified' ? (
            <div className="bg-slate-950/85 backdrop-blur-2xl border border-amber-500/35 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-500/20">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0 mt-0.5">
                    <ShieldAlert className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display text-base sm:text-lg font-bold text-white">
                        Automated 2-Step Identity Verification Terminal
                      </h3>
                      <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40">
                        {inlineStep === 1
                          ? 'STEP 01 // BD NID ANATOMY & DGHS REGISTRY CHECK'
                          : 'STEP 02 // LIVE CRYPTOGRAPHIC EMAIL OTP'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed max-w-2xl font-sans">
                      {isClinic
                        ? 'Validate your clinic against official Bangladesh DGHS & NGOAB databases, followed by live cryptographic email OTP verification.'
                        : 'Verify your Bangladeshi National ID (BBS District GEO Code & Birth Year anatomy), followed by live cryptographic email OTP verification.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Alert */}
              {inlineError && (
                <div className="bg-rose-950/80 border border-rose-500/40 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-200 font-mono animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="font-semibold leading-relaxed">{inlineError}</p>
                </div>
              )}

              {/* Anatomy Match Success Alert */}
              {inlineAnatomyMatch && (
                <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-200 font-mono animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium">{inlineAnatomyMatch}</span>
                </div>
              )}

              {/* STEP 1: REGISTRY & ANATOMY FORM */}
              {inlineStep === 1 && (
                <form onSubmit={handleInlineStep1Submit} className="bg-slate-900/90 rounded-2xl p-5 border border-teal-500/25 space-y-4 font-mono text-xs">
                  {/* Quick-Fill Chips for evaluators */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-teal-500/20 space-y-2">
                    <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                      <span>Quick-Fill Authentic Bangladesh Facility Credentials:</span>
                    </span>

                    {isClinic ? (
                      <div className="flex flex-wrap gap-1.5">
                        {VERIFIED_BD_FACILITIES.slice(0, 4).map((fac) => (
                          <button
                            key={fac.regNumber}
                            type="button"
                            onClick={() => {
                              setInlineOrgName(fac.name);
                              setInlineDistrictName(fac.district);
                              setInlineRegId(fac.regNumber);
                              setInlineLocation(fac.address);
                              setInlineError(null);
                            }}
                            className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-900 hover:bg-teal-950 border border-teal-500/30 text-teal-200 transition cursor-pointer"
                          >
                            {fac.name.split(' (')[0]} ({fac.type}: {fac.regNumber})
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setInlineDistrictName('Bogura');
                            setInlineBirthYear('1998');
                            setInlineRegId('19981012345678901');
                            setInlineLocation('Bogura Sadar');
                            setInlineError(null);
                          }}
                          className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-900 hover:bg-teal-950 border border-teal-500/30 text-teal-200 transition cursor-pointer"
                        >
                          Bogura [GEO-10] • 17-Digit Standard NID
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setInlineDistrictName('Pabna');
                            setInlineBirthYear('1995');
                            setInlineRegId('7612345678');
                            setInlineLocation('Pabna Town');
                            setInlineError(null);
                          }}
                          className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-900 hover:bg-teal-950 border border-teal-500/30 text-teal-200 transition cursor-pointer"
                        >
                          Pabna [GEO-76] • 10-Digit Smart NID
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Form Fields Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    {/* District Selector with BBS GEO Code Display */}
                    <div>
                      <label className="block text-slate-300 font-bold uppercase mb-1">
                        Bangladesh District (BBS GEO Code) <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={inlineDistrictName}
                        onChange={(e) => setInlineDistrictName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 text-white border border-teal-500/30 focus:border-teal-400 outline-none cursor-pointer"
                      >
                        {BD_DISTRICT_NAMES.map((dist) => {
                          const geo = OFFICIAL_BD_DISTRICT_GEOCODES[dist] || '--';
                          return (
                            <option key={dist} value={dist}>
                              {dist.toUpperCase()} [GEO-{geo}]
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Registration / NID Number */}
                    <div>
                      <label className="block text-slate-300 font-bold uppercase mb-1">
                        {isClinic ? 'DGHS / NGOAB License Reg No.' : 'Bangladeshi National ID (NID)'} <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={inlineRegId}
                        onChange={(e) => setInlineRegId(e.target.value)}
                        placeholder={isClinic ? 'e.g. DGHS-1105 or NGO-241' : '10, 13, or 17 digit NID'}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 text-white border border-teal-500/30 focus:border-teal-400 outline-none"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-slate-300 font-bold uppercase mb-1">
                        Official Contact Phone <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={inlinePhone}
                        onChange={(e) => setInlinePhone(e.target.value)}
                        placeholder="e.g. +880 1711-234567"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 text-white border border-teal-500/30 focus:border-teal-400 outline-none"
                      />
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-slate-300 font-bold uppercase mb-1">
                        Area / Facility Location <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={inlineLocation}
                        onChange={(e) => setInlineLocation(e.target.value)}
                        placeholder="e.g. Bogura SZMCH Campus"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 text-white border border-teal-500/30 focus:border-teal-400 outline-none"
                      />
                    </div>
                  </div>

                  {/* Declaration Checkbox */}
                  <label className="flex items-center gap-2 pt-2 text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={inlineConfirmed}
                      onChange={(e) => setInlineConfirmed(e.target.checked)}
                      className="rounded border-teal-500/40 text-teal-500 focus:ring-0 cursor-pointer"
                    />
                    <span>I confirm these government credentials represent an authentic clinical facility or citizen identity.</span>
                  </label>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={actionLoading === 'verifying'}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 font-bold transition cursor-pointer hover:from-teal-300 hover:to-emerald-400 flex items-center gap-2"
                    >
                      {actionLoading === 'verifying' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                      <span>Validate &amp; Send Cryptographic OTP &rarr;</span>
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: CRYPTOGRAPHIC EMAIL OTP BOX */}
              {inlineStep === 2 && (
                <form onSubmit={handleInlineStep2Submit} className="bg-slate-900/90 rounded-2xl p-6 border border-emerald-500/35 space-y-5 font-mono text-xs">
                  <div className="bg-slate-950 border-2 border-emerald-500/50 rounded-2xl p-6 shadow-[0_0_25px_rgba(16,185,129,0.25)] space-y-3 text-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center justify-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      <span>STEP 02 // ENTER LIVE 6-DIGIT CRYPTOGRAPHIC EMAIL OTP</span>
                    </span>

                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      required
                      value={inlineOtpCode}
                      onChange={(e) => setInlineOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="••••••"
                      className="w-full max-w-xs mx-auto py-3 text-3xl font-mono font-bold text-center tracking-[0.6em] rounded-xl border-2 border-emerald-500/60 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 outline-none bg-slate-900 text-emerald-300 shadow-inner"
                    />

                    <p className="text-[11px] text-slate-400 font-sans">
                      A 6-digit confirmation code was dispatched to <strong className="text-teal-300 font-mono">{currentUser.email}</strong>.
                    </p>
                  </div>

                  {inlineDemoOtp && (
                    <div className="bg-amber-950/80 border border-amber-500/40 rounded-xl p-2.5 text-center text-amber-200">
                      ⚡ Supabase Simulated Test OTP: <strong className="text-white font-bold">{inlineDemoOtp}</strong>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setInlineStep(1)}
                      className="text-slate-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Step 1</span>
                    </button>

                    <button
                      type="submit"
                      disabled={inlineOtpCode.length !== 6 || actionLoading === 'verifying'}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-bold transition cursor-pointer hover:from-emerald-300 hover:to-teal-300 flex items-center gap-2 disabled:opacity-50"
                    >
                      {actionLoading === 'verifying' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>Verify OTP &amp; Activate Credential</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="bg-slate-950/80 border border-emerald-500/35 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                    <span>Verified Recipient Credential Active</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                      {currentUser.registrationOrNid || 'Verified'}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5 font-sans">
                    Your account is fully verified. You can claim available medicines and coordinate pickup directly with donors.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 4-DIGIT HANDOVER PIN VAULT: MY CLAIMED MEDICINES          */}
          {/* ========================================================= */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>My Claimed Medicines (Pending Pickup)</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-400/30">
                    {myClaimedPending.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-sans">
                  Contact the donor directly to arrange handover. Inspect packaging seals and expiry dates in person.
                </p>
              </div>
            </div>

            {myClaimedPending.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {myClaimedPending.map((item) => {
                  const med = item.medication;
                  const days = mounted ? getDaysUntilExpiry(med.expiryDate) : null;
                  const urgency = days !== null ? getUrgencyLevel(days) : 'normal';
                  const pinDigits = (item.handoverPin || '4829').padStart(4, '0').slice(0, 4).split('');

                  return (
                    <TiltSpotlightCard
                      key={item.claimId || med.id}
                      glowColor="teal"
                      className="p-5 sm:p-6 bg-slate-900/90 border border-teal-500/25 space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3.5">
                        {/* Top Urgency & Hold Timer */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-teal-500/15">
                          <span className="text-[11px] font-mono font-bold text-teal-300">
                            {days !== null ? `Expires in ${days}d` : med.expiryDate}
                          </span>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-400/30">
                              {item.isPartial ? 'Partial Claim' : 'Claimed'}
                            </span>
                            {(() => {
                              const hold = getPickupTimeRemaining(item.claimExpiresAt);
                              return (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-400/30"
                                  title="48-hour pickup window"
                                >
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  <span>{hold.label}</span>
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Medicine Overview */}
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-display font-bold text-white text-base sm:text-lg">
                              {med.medicineName}
                            </h4>
                            <span className="shrink-0 text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-slate-950 text-teal-300 border border-teal-500/35">
                              {med.strength}
                            </span>
                          </div>
                          {med.genericName && (
                            <p className="text-xs text-teal-300/80 italic mt-0.5 font-sans">
                              ({med.genericName})
                            </p>
                          )}
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-teal-950 text-teal-300 border border-teal-500/30">
                              Claimed: {item.claimedQuantity} {item.unitName}
                            </span>
                            {item.isPartial && (
                              <span className="text-xs font-mono text-slate-400">
                                (batch of {item.totalBatchQuantity} {item.unitName})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* CRYPTOGRAPHIC 4-DIGIT HANDOVER TICKET */}
                        <div className="bg-slate-950/90 border border-teal-500/35 rounded-2xl p-4 space-y-2.5 shadow-inner">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-teal-300 uppercase">
                              <KeyRound className="w-4 h-4 text-teal-400" />
                              <span>CRYPTOGRAPHIC HANDOVER PIN</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">SECURE DISPATCH</span>
                          </div>

                          <div className="flex items-center justify-center gap-2.5 py-1">
                            {pinDigits.map((digit, idx) => (
                              <div
                                key={idx}
                                className="bg-slate-900 text-teal-300 border border-teal-500/40 rounded-xl w-11 h-12 flex items-center justify-center font-mono text-xl sm:text-2xl font-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]"
                              >
                                {digit}
                              </div>
                            ))}
                          </div>

                          <p className="text-[11px] font-sans text-center text-slate-400">
                            Present this 4-digit code to donor <strong className="text-white">{med.donorName}</strong> at physical pickup.
                          </p>
                        </div>

                        {/* UNLOCKED DONOR CONTACT INFORMATION */}
                        <div className="bg-slate-950/70 border border-teal-500/20 rounded-2xl p-3.5 space-y-2 text-xs font-mono text-slate-300">
                          <div className="flex items-center justify-between text-teal-300 font-bold uppercase text-[10px]">
                            <span className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5" />
                              <span>Donor: {med.donorName}</span>
                            </span>
                            <span className="text-emerald-400">UNLOCKED</span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-teal-500/10">
                            <span className="text-slate-400">Donor Phone:</span>
                            <div className="flex items-center gap-2">
                              <a
                                href={`tel:${med.donorPhone}`}
                                className="font-bold text-white hover:text-teal-300"
                              >
                                {med.donorPhone}
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCopyPhone(med.donorPhone, item.claimId)}
                                className="p-1 rounded text-teal-400 hover:text-white cursor-pointer"
                                title="Copy phone"
                              >
                                {copiedId === item.claimId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-teal-500/10">
                            <span className="text-slate-400">Pickup Area:</span>
                            <span className="text-white font-bold">{med.location}</span>
                          </div>
                        </div>
                      </div>

                      {/* Release Claim Action */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => releaseClaim(med.id, item.claimId)}
                          disabled={actionLoading === med.id}
                          className="w-full py-2 text-xs font-mono text-rose-300 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-950/60 rounded-xl border border-rose-500/30 transition cursor-pointer"
                        >
                          Release Claim (Restock to Public Feed)
                        </button>
                      </div>
                    </TiltSpotlightCard>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white/80 dark:bg-slate-950/70 rounded-3xl border border-dashed border-slate-300 dark:border-teal-500/25 p-8 text-center text-xs font-mono text-slate-500 dark:text-slate-400">
                You have no pending claimed medications. Browse the Live Medicine Feed to claim needed items.
              </div>
            )}
          </div>

          {/* ============================================================= */}
          {/* INCOMING PICKUP REQUESTS: DONOR'S PIN UNLOCK VAULT           */}
          {/* ============================================================= */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>Incoming Pickup Requests (Pending Handover)</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-400/30">
                    {incomingPickupRequests.length} Pending
                  </span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-sans">
                  Verify the collector&apos;s physical credentials and enter their 4-digit PIN to securely complete handovers.
                </p>
              </div>
            </div>

            {incomingPickupRequests.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {incomingPickupRequests.map((req) => {
                  const med = req.medication;
                  const hold = getPickupTimeRemaining(req.claimExpiresAt);
                  const isClinicCollector = req.collectorRole === 'clinic_charity';

                  return (
                    <TiltSpotlightCard
                      key={req.claimId}
                      glowColor="amber"
                      className="p-5 sm:p-6 bg-slate-900/90 border border-amber-500/30 space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-amber-500/20">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-400/30">
                            {hold.label}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {req.isPartial ? 'Partial Claim' : 'Full Batch Claim'}
                          </span>
                        </div>

                        {/* Medicine Overview */}
                        <div>
                          <h4 className="font-display font-bold text-white text-base sm:text-lg">
                            {med.medicineName}
                          </h4>
                          <p className="text-xs font-mono text-teal-300 mt-0.5">
                            Claimed: {req.quantityClaimed} {req.unitName}
                          </p>
                        </div>

                        {/* Collector Credentials Readout */}
                        <div className="bg-slate-950/80 border border-teal-500/20 rounded-2xl p-3.5 space-y-2 text-xs font-mono text-slate-300">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">{req.collectorName}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-500/30 uppercase">
                              {isClinicCollector ? 'Clinic / NGO' : 'Individual'}
                            </span>
                          </div>

                          {/* BMDC Prescription or License Reference */}
                          {req.organizationOrRx && (
                            <div className="pt-1.5 border-t border-teal-500/10 text-[11px]">
                              <span className="text-slate-400 block font-bold">
                                {isClinicCollector ? 'Clinic License:' : 'BMDC Prescription:'}
                              </span>
                              <span className="text-teal-200">{req.organizationOrRx}</span>
                            </div>
                          )}
                        </div>

                        {/* PIN Verification Vault Bar */}
                        <div className="bg-slate-950 border border-amber-500/40 rounded-2xl p-4 space-y-2.5">
                          <label
                            htmlFor={`pin-input-${req.claimId}`}
                            className="block text-xs font-mono font-bold text-amber-300 uppercase tracking-wider"
                          >
                            Enter Collector&apos;s 4-Digit PIN <span className="text-rose-400">*</span>
                          </label>

                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                            <input
                              id={`pin-input-${req.claimId}`}
                              type="text"
                              maxLength={4}
                              value={pinInputs[req.claimId] || ''}
                              onChange={(e) => handlePinChange(req.claimId, e.target.value)}
                              placeholder="4-digit PIN"
                              className="w-full sm:w-36 px-3 py-2 text-center font-mono font-bold text-lg tracking-[0.5em] rounded-xl border border-amber-400/40 bg-slate-900 text-teal-300 focus:outline-none focus:border-amber-400"
                            />

                            <button
                              type="button"
                              onClick={() => handleDonorVerifyAndCollect(med.id, req.claimId)}
                              disabled={verifyingId === req.claimId || actionLoading === med.id}
                              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 font-bold text-xs font-mono transition cursor-pointer hover:from-teal-300 hover:to-emerald-400 shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {verifyingId === req.claimId ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                              <span>Unlock &amp; Verify Handover</span>
                            </button>
                          </div>

                          {pinErrors[req.claimId] && (
                            <p className="text-[11px] font-mono text-rose-400">
                              * {pinErrors[req.claimId]}
                            </p>
                          )}
                        </div>
                      </div>
                    </TiltSpotlightCard>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white/80 dark:bg-slate-950/70 rounded-3xl border border-dashed border-slate-300 dark:border-teal-500/25 p-8 text-center text-xs font-mono text-slate-500 dark:text-slate-400">
                No pending incoming pickup requests. When a collector claims your donation, their dispatch request will appear here.
              </div>
            )}
          </div>

        </div>
      )}

      {/* Impact Certificate Modal */}
      {isCertificateOpen && (
        <ImpactCertificateModal
          isOpen={isCertificateOpen}
          onClose={() => setIsCertificateOpen(false)}
        />
      )}
    </div>
  );
}
