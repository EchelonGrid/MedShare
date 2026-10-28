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
      if (otpRes.demoOtp) {
        setInlineDemoOtp(otpRes.demoOtp);
      }
      setInlineResendCooldown(60);
    } else {
      setInlineError(otpRes.error || 'Failed to resend code.');
    }
  };

  // Filtered lists with partial split claim support (hooks must be unconditional)
  const myClaimedPending = useMemo(() => {
    if (!currentUserId) return [];
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

      const userActiveClaims = (med.activeClaims || []).filter(
        (c) => c.collectorId === currentUserId && c.status === 'pending_pickup'
      );

      if (userActiveClaims.length > 0) {
        userActiveClaims.forEach((c) => {
          list.push({
            medication: med,
            claimId: c.claimId,
            claimedQuantity: c.quantityClaimed,
            unitName: c.unitName || unit,
            totalBatchQuantity: total,
            prescriptionRef: c.organizationOrRx || med.prescriptionRef,
            isPartial: c.quantityClaimed < total,
            handoverPin: c.handoverPin || med.handoverPin,
            claimExpiresAt: c.claimExpiresAt || med.claimExpiresAt,
          });
        });
      }

      const userClaims = (med.claims || []).filter(
        (c) =>
          c.claimerId === currentUserId &&
          (c.status === 'claimed' || (c.status as string) === 'pending_pickup') &&
          !userActiveClaims.some((ac) => ac.claimId === c.id)
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
            handoverPin: c.handoverPin || med.handoverPin,
            claimExpiresAt: c.claimExpiresAt || med.claimExpiresAt,
          });
        });
      } else if (
        med.claimedById === currentUserId &&
        med.status === 'claimed' &&
        userActiveClaims.length === 0
      ) {
        const claimedQty = med.claimedQuantity ?? total;
        list.push({
          medication: med,
          claimedQuantity: claimedQty,
          unitName: unit,
          totalBatchQuantity: total,
          prescriptionRef: med.prescriptionRef,
          isPartial: claimedQty < total,
          handoverPin: med.handoverPin,
          claimExpiresAt: med.claimExpiresAt,
        });
      }
    });

    return list;
  }, [medications, currentUserId]);

  const myCollectionHistory = useMemo(() => {
    if (!currentUserId) return [];
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
        (c) => c.claimerId === currentUserId && c.status === 'collected'
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
      } else if (med.claimedById === currentUserId && med.status === 'collected') {
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
  }, [medications, currentUserId]);

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

  const handleExportCSV = () => {
    if (!currentUser) return;
    if (myDonations.length > 0) {
      exportDonorHistoryCSV(currentUser, myDonations);
    } else {
      exportCollectedInventoryCSV(currentUser, myCollectionHistory);
    }
    showToast('Audit log exported to CSV successfully!', 'success', 'Export Complete');
  };

  // Role-Specific Reporting Capabilities (Bug 7a)
  const canExportCSV = currentUser?.role === 'clinic_charity' || currentUser?.role === 'admin';
  const hasContributed = myDonations.length > 0 || myCollectionHistory.length > 0 || isAdmin;

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

        {!isAdmin && (
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
              {isAdmin ? (
                <ShieldCheck className="w-7 h-7 text-purple-700" />
              ) : isClinic ? (
                <Building2 className="w-7 h-7 text-indigo-700" />
              ) : (
                <User className="w-7 h-7 text-teal-700" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {currentUser.name}
                </h2>
                {/* Role Badge */}
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  isAdmin
                    ? 'bg-purple-100 text-purple-800 border-purple-300'
                    : isClinic
                    ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                    : 'bg-teal-100 text-teal-800 border-teal-300'
                }`}>
                  {isAdmin ? 'Platform Moderator' : isClinic ? 'Rural Clinic / NGO' : 'Individual Community Member'}
                </span>
                {/* 3-Stage Verification Badge */}
                {currentUser.verificationStatus === 'verified' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified</span>
                  </span>
                ) : currentUser.verificationStatus === 'pending' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span>⏳ Verification Pending Admin Review</span>
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
            {isAdmin ? (
              <>
                <div className="bg-purple-50 border border-purple-200 rounded-2xl px-4 py-2.5 text-center">
                  <div className="text-2xl font-extrabold text-purple-900">{pendingVerifications.length}</div>
                  <div className="text-[11px] font-semibold text-purple-700">Pending Reviews</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-2.5 text-center">
                  <div className="text-2xl font-extrabold text-emerald-900">
                    {allUsers.filter((u) => u.verificationStatus === 'verified').length}
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-700">Verified Users</div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-sky-50 border border-sky-200 rounded-2xl px-4 py-2.5 text-center">
                  <div className="text-2xl font-extrabold text-sky-900">{myClaimedPending.length}</div>
                  <div className="text-[11px] font-semibold text-sky-700">Pending Pickup</div>
                </div>
                <div className="bg-teal-50 border border-teal-200 rounded-2xl px-4 py-2.5 text-center">
                  <div className="text-2xl font-extrabold text-teal-900">{myDonations.length}</div>
                  <div className="text-[11px] font-semibold text-teal-700">Donations Listed</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quick Actions: Impact Certificate & Audit Log CSV Export (Role-Gated) */}
        {(hasContributed || canExportCSV) && (
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500 font-medium">
              Verified Community Healthcare Record • FEFO Audited
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {hasContributed && (
                <button
                  type="button"
                  onClick={() => setIsCertificateOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Award className="w-4 h-4 text-amber-700" />
                  <span>🏆 View Impact Certificate</span>
                </button>
              )}
              {canExportCSV && (
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Download className="w-4 h-4 text-teal-700" />
                  <span>⬇️ Export Audit Log (CSV)</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* 1. ADMIN MODERATOR PORTAL (ONLY FOR ROLE === 'admin')         */}
      {/* ============================================================= */}
      {isAdmin && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                  <ShieldCheck className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                    <span>Admin Moderator &amp; Verification Review Desk</span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      {pendingVerifications.length} Pending
                    </span>
                  </h3>
                  <p className="text-xs text-teal-100/80">
                    Sole authority desk: verify Bangladeshi NID credentials and Rural Clinic licenses before medicine distribution.
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
                          {pendingUser.role === 'clinic_charity' ? 'Rural Clinic / NGO' : 'Individual Community Member'}
                        </span>
                        <span className="text-[11px] font-mono text-amber-300 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Submitted: {pendingUser.submittedAt ? new Date(pendingUser.submittedAt).toLocaleDateString() : 'Awaiting Review'}</span>
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

                      <div className="bg-black/25 rounded-xl p-3 space-y-1.5 text-xs text-slate-300 font-mono">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">
                            {pendingUser.role === 'clinic_charity' ? 'License Reg ID:' : 'National ID (NID):'}
                          </span>
                          <span className="font-bold text-amber-200 bg-amber-950/60 px-2 py-0.5 rounded">
                            {pendingUser.registrationOrNid || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Contact Phone:</span>
                          <span className="text-slate-200">{pendingUser.phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Address / Location:</span>
                          <span className="text-slate-200">{pendingUser.location}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">User Email:</span>
                          <span className="text-slate-200">{pendingUser.email}</span>
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
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => rejectVerification(pendingUser.id, 'Format or authenticity mismatch')}
                        className="py-2 px-3.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-xs font-semibold transition cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-xs text-teal-100/70 space-y-1.5">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1" />
                <p className="font-bold text-white text-sm">All Verification Requests Processed</p>
                <p>No user verification requests are currently awaiting review.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 2. SECTION FOR COMMUNITY MEMBERS & CLINICS                    */}
      {/* ============================================================= */}
      {!isAdmin && (
        <div className="space-y-8">
          
          {/* 1. Automated 2-Step Verification Workflow Card */}
          {currentUser.verificationStatus !== 'verified' ? (
            <div className="bg-amber-50/90 border border-amber-300 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-200/80 flex items-center justify-center text-amber-900 shrink-0 mt-0.5">
                    <ShieldAlert className="w-5 h-5 text-amber-800" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-amber-950">
                        Automated 2-Step Identity Verification
                      </h3>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                        {inlineStep === 1 ? 'Step 1 of 2: Government Registry Check' : 'Step 2 of 2: Live Email OTP'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed max-w-2xl">
                      {isClinic
                        ? 'Verify your rural clinic or charity against official DGHS / NGOAB registries, followed by live Supabase Auth Email OTP.'
                        : 'Verify your Bangladeshi National ID (BBS District GEO Code & Birth Year anatomy), followed by live Supabase Auth Email OTP.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Inline Error Alert */}
              {inlineError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="font-semibold leading-relaxed">{inlineError}</p>
                </div>
              )}

              {/* Anatomy Match Success Alert */}
              {inlineAnatomyMatch && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-800 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">{inlineAnatomyMatch}</span>
                </div>
              )}

              {/* STEP 1: REGISTRY FORM */}
              {inlineStep === 1 && (
                <form onSubmit={handleInlineStep1Submit} className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-200 space-y-4">
                  {/* Quick-Fill Chips for evaluators */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>Quick-Fill Authentic Bangladesh Registries for Testing:</span>
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
                            className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white hover:bg-teal-50 border border-slate-300 hover:border-teal-400 text-slate-800 transition cursor-pointer"
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
                            setInlineRegId('1998101018941253');
                            setInlineError(null);
                          }}
                          className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white hover:bg-teal-50 border border-slate-300 hover:border-teal-400 text-slate-800 transition cursor-pointer"
                        >
                          17-Digit: Bogura (Code 10, Born 1998)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setInlineDistrictName('Pabna');
                            setInlineBirthYear('1995');
                            setInlineRegId('1995761028941253');
                            setInlineError(null);
                          }}
                          className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white hover:bg-teal-50 border border-slate-300 hover:border-teal-400 text-slate-800 transition cursor-pointer"
                        >
                          17-Digit: Pabna (Code 76, Born 1995)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setInlineDistrictName('Dhaka');
                            setInlineBirthYear('1992');
                            setInlineRegId('1992265018941253');
                            setInlineError(null);
                          }}
                          className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white hover:bg-teal-50 border border-slate-300 hover:border-teal-400 text-slate-800 transition cursor-pointer"
                        >
                          17-Digit: Dhaka (Code 26, Born 1992)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setInlineBirthYear('1994');
                            setInlineDistrictName('Dhaka');
                            setInlineRegId('5982143098');
                            setInlineError(null);
                          }}
                          className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white hover:bg-teal-50 border border-slate-300 hover:border-teal-400 text-slate-800 transition cursor-pointer"
                        >
                          10-Digit Smart NID
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {isClinic ? (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Organization / Clinic Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={inlineOrgName}
                            onChange={(e) => setInlineOrgName(e.target.value)}
                            placeholder="e.g. Shaheed Ziaur Rahman Medical College Hospital"
                            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Facility District <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={inlineDistrictName}
                            onChange={(e) => setInlineDistrictName(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none bg-white"
                          >
                            {BD_DISTRICT_NAMES.map((d) => (
                              <option key={d} value={d}>
                                {d} (BBS Code: {OFFICIAL_BD_DISTRICT_GEOCODES[d]})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            DGHS Code or NGOAB Reg <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={inlineRegId}
                            onChange={(e) => setInlineRegId(e.target.value)}
                            placeholder="e.g. 1105, 10016472, 241"
                            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none font-mono"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Full Name (as on NID) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={inlineFullName}
                            onChange={(e) => setInlineFullName(e.target.value)}
                            placeholder="e.g. Dr. Farhana Rahman"
                            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Birth Year <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            required
                            min={1930}
                            max={2008}
                            value={inlineBirthYear}
                            onChange={(e) => setInlineBirthYear(e.target.value)}
                            placeholder="e.g. 1998"
                            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Birth / Home District <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={inlineDistrictName}
                            onChange={(e) => setInlineDistrictName(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none bg-white"
                          >
                            {BD_DISTRICT_NAMES.map((d) => (
                              <option key={d} value={d}>
                                {d} (BBS Code: {OFFICIAL_BD_DISTRICT_GEOCODES[d]})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            National ID (NID: 10, 13, or 17 digits) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={inlineRegId}
                            onChange={(e) => setInlineRegId(e.target.value)}
                            placeholder="e.g. 1998101018941253"
                            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none font-mono"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Contact Phone <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={inlinePhone}
                        onChange={(e) => setInlinePhone(e.target.value)}
                        placeholder="e.g. +880 1711-234567"
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Area / Location <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={inlineLocation}
                        onChange={(e) => setInlineLocation(e.target.value)}
                        placeholder="e.g. Mirpur 10, Dhaka"
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
                      />
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer select-none pt-1">
                    <input
                      type="checkbox"
                      checked={inlineConfirmed}
                      onChange={(e) => setInlineConfirmed(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer h-4 w-4"
                    />
                    <span>
                      I confirm that the details provided are authentic and match official Bangladesh government registries.
                    </span>
                  </label>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={actionLoading === 'verifying'}
                      className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-teal-700 hover:bg-teal-800 text-white shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading === 'verifying' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                      <span>
                        {actionLoading === 'verifying'
                          ? 'Checking Registry...'
                          : 'Validate Credentials & Send 6-Digit OTP'}
                      </span>
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: EMAIL OTP VERIFICATION */}
              {inlineStep === 2 && (
                <form onSubmit={handleInlineStep2Submit} className="bg-white rounded-2xl p-5 border border-amber-200 space-y-4">
                  <div className="text-center space-y-1.5">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto">
                      <Mail className="w-5 h-5 text-teal-600" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Step 2 of 2: Enter Email Verification Code
                    </h4>
                    <p className="text-xs text-slate-600 max-w-md mx-auto">
                      A 6-digit confirmation code has been dispatched via Supabase Auth to{' '}
                      <strong className="text-slate-900">{currentUser.email}</strong>.
                    </p>
                  </div>

                  <div className="max-w-xs mx-auto space-y-1.5">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="w-4 h-4 text-teal-600" />
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        autoFocus
                        value={inlineOtpCode}
                        onChange={(e) => setInlineOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full pl-9 pr-3 py-2.5 text-xl font-mono font-bold text-center tracking-[0.3em] rounded-xl border-2 border-teal-600/60 focus:border-teal-700 focus:ring-2 focus:ring-teal-100 outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-center text-slate-500">
                      Enter the 6-digit numeric OTP code sent to your email.
                    </p>
                  </div>

                  {inlineDemoOtp && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-center text-xs text-amber-900 space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                        ⚡ Supabase OTP Simulation Note:
                      </span>
                      <p>
                        Generated test OTP code:{' '}
                        <strong className="font-mono font-bold bg-amber-200/80 px-2 py-0.5 rounded text-amber-950">
                          {inlineDemoOtp}
                        </strong>
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2 text-xs">
                    <span className="text-slate-500">Didn&apos;t receive code?</span>
                    <button
                      type="button"
                      onClick={handleInlineResendOtp}
                      disabled={inlineResendCooldown > 0 || actionLoading === 'verifying'}
                      className="font-bold text-teal-700 hover:text-teal-800 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{inlineResendCooldown > 0 ? `Resend in ${inlineResendCooldown}s` : 'Resend Code'}</span>
                    </button>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setInlineStep(1)}
                      className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Edit Details</span>
                    </button>

                    <button
                      type="submit"
                      disabled={inlineOtpCode.length !== 6 || actionLoading === 'verifying'}
                      className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-teal-700 hover:bg-teal-800 text-white shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading === 'verifying' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>{actionLoading === 'verifying' ? 'Verifying...' : 'Verify OTP & Activate Account'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="bg-emerald-50/80 border border-emerald-300 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-200/80 flex items-center justify-center text-emerald-800 shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                    <span>Verified Recipient Credential Active</span>
                    <span className="text-[10px] font-mono font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                      {currentUser.registrationOrNid || 'Verified'}
                    </span>
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Your account is fully verified by MedShare Admin. You can claim available medicines and coordinate pickup directly with donors.
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
                            {item.handoverPin || '----'}
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

                      {/* Collector Actions & Handover Security Protocol */}
                      <div className="pt-2 space-y-2.5">
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-950 space-y-1 text-center">
                          <p className="font-bold flex items-center justify-center gap-1.5 text-amber-900">
                            <ShieldCheck className="w-4 h-4 text-amber-700" />
                            <span>In-Person Handover Security Protocol</span>
                          </p>
                          <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                            Show your sealed medicine inspection and give this 4-digit PIN to the donor in person so they can confirm the handover.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => releaseClaim(med.id, item.claimId)}
                          disabled={actionLoading === med.id}
                          className="w-full py-2.5 px-4 text-xs font-bold rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-300 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          title="Release this claim and restock medicine back to feed"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Release Claim (Restock)</span>
                        </button>
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

              {/* Action Buttons (Role-Gated) */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                {canExportCSV && (
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 hover:border-teal-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Export collection audit log to CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-700" />
                    <span>Export CSV</span>
                  </button>
                )}
                {hasContributed && (
                  <button
                    type="button"
                    onClick={() => setIsCertificateOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="View and print official impact certificate"
                  >
                    <Award className="w-3.5 h-3.5 text-amber-700" />
                    <span>Print Certificate</span>
                  </button>
                )}
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
      {/* SECTION FOR LISTED MEDICATIONS & INCOMING PICKUP DESK          */}
      {/* ============================================================= */}
      {!isAdmin && (
        <div className="space-y-8">

          {/* ============================================================= */}
          {/* INCOMING PICKUP REQUESTS (PENDING HANDOVER)                   */}
          {/* ============================================================= */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Incoming Pickup Requests (Pending Handover)</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    incomingPickupRequests.length > 0
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {incomingPickupRequests.length} Pending
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verify the collector&apos;s physical credentials and 4-digit PIN to securely complete handovers.
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
                    <div
                      key={req.claimId}
                      className="bg-white rounded-3xl border-2 border-amber-300 p-5 sm:p-6 shadow-sm space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3.5">
                        {/* Top Bar: Hold Timer & Partial/Full Badge */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                              hold.isExpired
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}
                          >
                            <Clock className="w-3 h-3 text-amber-700" />
                            <span>{hold.label}</span>
                          </span>

                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                            {req.isPartial ? 'Partial Batch Claim' : 'Full Batch Claim'}
                          </span>
                        </div>

                        {/* Medicine Overview */}
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
                          <p className="text-xs font-bold text-teal-800 mt-1">
                            Claimed Quantity: {req.quantityClaimed} {req.unitName}
                            {req.isPartial && (
                              <span className="text-slate-500 font-normal ml-1">
                                (batch of {req.totalBatchQuantity} {req.unitName})
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Collector Credentials Card */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                              {isClinicCollector ? (
                                <Building2 className="w-3.5 h-3.5 text-indigo-700" />
                              ) : (
                                <User className="w-3.5 h-3.5 text-teal-700" />
                              )}
                              <span>{req.collectorName}</span>
                            </span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                              isClinicCollector
                                ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                                : 'bg-teal-100 text-teal-800 border-teal-200'
                            }`}>
                              {isClinicCollector ? 'Rural Clinic / NGO' : 'Verified Individual'}
                            </span>
                          </div>

                          {req.collectorPhone && (
                            <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                              <span className="text-slate-500">Contact Phone:</span>
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={`tel:${req.collectorPhone}`}
                                  className="font-mono font-bold text-teal-700 hover:text-teal-900 hover:underline"
                                >
                                  {req.collectorPhone}
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleCopyPhone(req.collectorPhone!, req.claimId)}
                                  className="p-1 rounded text-slate-400 hover:text-teal-700 hover:bg-teal-50 cursor-pointer"
                                  title="Copy phone"
                                >
                                  {copiedId === req.claimId ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Verified BMDC Prescription / License Details */}
                          {req.organizationOrRx && (
                            <div className="pt-1.5 border-t border-slate-200 text-[11px] leading-relaxed">
                              <span className="font-bold text-slate-700 block">
                                {isClinicCollector ? 'Verified Clinic License:' : 'Verified BMDC Prescription:'}
                              </span>
                              <span className="text-slate-800 font-medium font-mono">
                                {req.organizationOrRx}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* PIN Verification Desk */}
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-3.5 space-y-2.5">
                          <label
                            htmlFor={`pin-input-${req.claimId}`}
                            className="block text-xs font-bold text-amber-950 uppercase tracking-wider"
                          >
                            Enter Collector&apos;s 4-Digit PIN <span className="text-rose-500">*</span>
                          </label>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <input
                              id={`pin-input-${req.claimId}`}
                              type="text"
                              maxLength={4}
                              value={pinInputs[req.claimId] || ''}
                              onChange={(e) => handlePinChange(req.claimId, e.target.value)}
                              placeholder="4-digit PIN"
                              className="w-full sm:w-32 px-3 py-2 text-center font-mono font-bold text-base tracking-widest rounded-xl border border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none bg-white text-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => handleDonorVerifyAndCollect(med.id, req.claimId)}
                              disabled={verifyingId === req.claimId || actionLoading === med.id}
                              className="flex-1 py-2 px-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                            >
                              {verifyingId === req.claimId ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              <span>Verify PIN &amp; Complete Handover</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => releaseClaim(med.id, req.claimId === med.id ? undefined : req.claimId)}
                              disabled={actionLoading === med.id}
                              className="py-2 px-3 rounded-xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-300 text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Release hold and restock items back to available feed"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Release Hold</span>
                            </button>
                          </div>

                          {pinErrors[req.claimId] && (
                            <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1 pt-0.5">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>{pinErrors[req.claimId]}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-4.5 text-center text-xs text-slate-500">
                No pending incoming pickup requests. When clinics or individuals claim your listed medicines, they will appear here awaiting PIN verification.
              </div>
            )}
          </div>

          {/* ============================================================= */}
          {/* MY LISTED MEDICATIONS OVERVIEW                                */}
          {/* ============================================================= */}
          <div className="space-y-6 pt-4 border-t border-slate-200">
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

            {/* Action Buttons (Role-Gated) */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {canExportCSV && (
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 hover:border-teal-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Export donation log to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-teal-700" />
                  <span>Export CSV</span>
                </button>
              )}
              {hasContributed && (
                <button
                  type="button"
                  onClick={() => setIsCertificateOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="View and print official impact certificate"
                >
                  <Award className="w-3.5 h-3.5 text-amber-700" />
                  <span>Print Certificate</span>
                </button>
              )}
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
                                  className="p-3 bg-white rounded-xl border border-amber-200 space-y-1.5 shadow-2xs"
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
                                  <div className="flex items-center justify-between text-[11px] text-amber-900 pt-1 border-t border-slate-100">
                                    <span>⏳ Awaiting PIN handover at pickup desk</span>
                                    <button
                                      type="button"
                                      onClick={() => releaseClaim(med.id, c.id)}
                                      disabled={actionLoading === med.id}
                                      className="text-rose-600 hover:text-rose-800 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                                      title="Release hold and restock items"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      <span>Restock</span>
                                    </button>
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

                          <div className="bg-white border border-sky-200 rounded-xl p-3 flex items-center justify-between text-xs text-amber-900">
                            <span className="font-medium">
                              ⏳ Awaiting collector in-person PIN handover at pickup desk above.
                            </span>
                            <button
                              type="button"
                              onClick={() => releaseClaim(med.id)}
                              disabled={actionLoading === med.id}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-300 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                              title="Release claim and restock medicine back to feed"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Restock</span>
                            </button>
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
      </div>
    )}

      {/* Printable Community Healthcare Impact Certificate Modal */}
      <ImpactCertificateModal
        isOpen={isCertificateOpen}
        onClose={() => setIsCertificateOpen(false)}
        user={currentUser}
      />

    </div>
  );
}
