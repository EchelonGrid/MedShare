'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Medication } from '@/types/medshare';
import { useMedShare } from '@/context/MedShareContext';
import { getDaysUntilExpiry, getUrgencyLevel, parseQuantity } from '@/lib/seed';
import { useIsMounted } from '@/lib/useIsMounted';
import {
  X,
  Pill,
  ShieldCheck,
  Calendar,
  MapPin,
  User,
  Phone,
  Package,
  CheckCircle2,
  Building2,
  FileText,
  Copy,
  Check,
  ArrowRight,
  KeyRound,
  Clock,
} from 'lucide-react';

interface ClaimModalProps {
  isOpen: boolean;
  medication: Medication | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onViewClaimed?: (medicationId: string) => void;
}

export default function ClaimModal({
  isOpen,
  medication,
  onClose,
  onSuccess,
  onViewClaimed,
}: ClaimModalProps) {
  const { currentUser, claimMedication, actionLoading } = useMedShare();
  const mounted = useIsMounted();

  const [prescriptionRef, setPrescriptionRef] = useState('');
  const [pickupNote, setPickupNote] = useState('');
  const [claimAmount, setClaimAmount] = useState<number>(1);
  const [inspectionConfirmed, setInspectionConfirmed] = useState(false);
  const [assignedPin, setAssignedPin] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [touched, setTouched] = useState(false);

  // Compute numeric availability
  const parsedQty = parseQuantity(medication?.quantity);
  const totalQty = medication?.totalNumericQuantity ?? parsedQty.total;
  const unitName = medication?.unitName || parsedQty.unit;
  const remainingQty =
    medication?.remainingNumericQuantity !== undefined
      ? medication.remainingNumericQuantity
      : totalQty;

  // Reset modal state on open or medication change
  useEffect(() => {
    if (isOpen && medication) {
      const parsed = parseQuantity(medication.quantity);
      const total = medication.totalNumericQuantity ?? parsed.total;
      const remaining =
        medication.remainingNumericQuantity !== undefined
          ? medication.remainingNumericQuantity
          : total;

      setPrescriptionRef('');
      setPickupNote('');
      setClaimAmount(Math.max(1, remaining));
      setAssignedPin('');
      setInspectionConfirmed(false);
      setIsSubmitted(false);
      setCopiedPhone(false);
      setTouched(false);
    }
  }, [isOpen, medication]);

  const handleModalClose = useCallback(() => {
    if (isSubmitted && medication) {
      onSuccess(`"${medication.medicineName}" claimed! Coordinate pickup with the donor.`);
      onViewClaimed?.(medication.id);
    }
    onClose();
  }, [isSubmitted, medication, onSuccess, onViewClaimed, onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleModalClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleModalClose]);

  if (!isOpen || !medication || !currentUser || medication.donorId === currentUser.id) return null;

  const isIndividual = currentUser.role === 'individual';
  const isClinic = currentUser.role === 'clinic_charity';

  const daysRemaining = mounted ? getDaysUntilExpiry(medication.expiryDate) : null;
  const urgency = daysRemaining !== null ? getUrgencyLevel(daysRemaining) : 'normal';

  // Validation
  const isPrescriptionValid = !isIndividual || prescriptionRef.trim().length > 0;
  const isClaimAmountValid = claimAmount > 0 && claimAmount <= remainingQty;
  const isFormValid = isPrescriptionValid && isClaimAmountValid && inspectionConfirmed;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (!isFormValid) return;

    const refString = isIndividual
      ? prescriptionRef.trim()
      : pickupNote.trim()
      ? `Pickup Note: ${pickupNote.trim()}`
      : undefined;

    const res = await claimMedication(medication.id, refString, claimAmount);
    if (res && res.pin) {
      setAssignedPin(res.pin);
    }
    setIsSubmitted(true);
  };

  const handleCopyPhone = () => {
    if (navigator?.clipboard && medication.donorPhone) {
      navigator.clipboard.writeText(medication.donorPhone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const handleDoneAndSwitch = () => {
    onSuccess(`"${medication.medicineName}" successfully claimed! Donor contact is revealed below.`);
    onViewClaimed?.(medication.id);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="claim-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
    >
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={handleModalClose} aria-hidden="true" />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 my-8">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white px-6 py-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center border border-teal-400/30 text-teal-200">
              <Pill className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h2 id="claim-modal-title" className="text-lg sm:text-xl font-bold tracking-tight">
                {isSubmitted ? 'Medication Claimed!' : 'Claim Unused Medicine'}
              </h2>
              <p className="text-xs text-teal-100/90 mt-0.5">
                {isSubmitted
                  ? 'Coordinate pickup directly with the donor'
                  : 'Reserve sealed surplus medication for healthcare distribution'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleModalClose}
            className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Close claim modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isSubmitted ? (
          /* ========================================================== */
          /* 1. Claim Form Screen                                       */
          /* ========================================================== */
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            
            {/* Medicine Summary Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                    {medication.medicineName}
                  </h3>
                  {medication.genericName && (
                    <p className="text-xs text-slate-500 italic mt-0.5">
                      ({medication.genericName})
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-900 font-mono">
                      {medication.strength}
                    </span>
                    <span className="text-xs text-slate-600 font-medium">
                      {medication.quantity}
                    </span>
                  </div>
                </div>

                {/* Expiry urgency pill */}
                <div className="shrink-0 text-right">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                      urgency === 'critical'
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : urgency === 'priority'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-teal-100 text-teal-800 border border-teal-300'
                    }`}
                  >
                    <Calendar className="w-3 h-3" />
                    <span>
                      {daysRemaining !== null ? `Expires in ${daysRemaining}d` : medication.expiryDate}
                    </span>
                  </span>
                </div>
              </div>

              {/* Donor & Location Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/70 text-xs text-slate-600">
                <div className="flex items-center gap-2 truncate">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">Pickup: <strong className="text-slate-800 font-medium">{medication.location}</strong></span>
                </div>
                <div className="flex items-center gap-2 truncate">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">Donor: <span className="text-slate-800 font-medium">{medication.donorName}</span></span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Verified donor listing: sealed packaging, factory unexpired.</span>
              </div>
            </div>

            {/* Partial Claim Quantity Selector (When remainingQty > 1) */}
            {remainingQty > 1 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="claim-quantity"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Quantity to Claim <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200 font-mono">
                    Max: {remainingQty} {unitName}
                  </span>
                </div>

                {/* Slider + Numeric Input Row */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3.5">
                    <input
                      type="range"
                      min={1}
                      max={remainingQty}
                      step={1}
                      value={claimAmount}
                      onChange={(e) => setClaimAmount(parseInt(e.target.value, 10) || 1)}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-700"
                    />
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        id="claim-quantity"
                        type="number"
                        min={1}
                        max={remainingQty}
                        value={claimAmount}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            setClaimAmount(Math.max(1, Math.min(remainingQty, val)));
                          }
                        }}
                        className="w-16 px-2 py-1 text-center font-bold text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none bg-white font-mono"
                      />
                      <span className="text-xs text-slate-600 font-medium">{unitName}</span>
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[11px] text-slate-500 font-medium">Quick select:</span>
                    <button
                      type="button"
                      onClick={() => setClaimAmount(1)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition cursor-pointer font-medium ${
                        claimAmount === 1
                          ? 'bg-teal-700 text-white border-teal-700 font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      1 unit
                    </button>
                    {remainingQty >= 4 && (
                      <button
                        type="button"
                        onClick={() => setClaimAmount(Math.floor(remainingQty / 2))}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition cursor-pointer font-medium ${
                          claimAmount === Math.floor(remainingQty / 2)
                            ? 'bg-teal-700 text-white border-teal-700 font-bold'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Half ({Math.floor(remainingQty / 2)})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setClaimAmount(remainingQty)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition cursor-pointer font-medium ${
                        claimAmount === remainingQty
                          ? 'bg-teal-700 text-white border-teal-700 font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      All ({remainingQty})
                    </button>
                  </div>

                  {/* Live Split Preview Notice */}
                  <div className="bg-teal-50/90 border border-teal-200 rounded-xl p-3 text-xs text-teal-950 flex items-start gap-2.5">
                    <Package className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span>
                        You are claiming <strong>{claimAmount} {unitName}</strong>.{' '}
                      </span>
                      {remainingQty - claimAmount > 0 ? (
                        <span className="text-teal-800">
                          <strong>{remainingQty - claimAmount} {unitName}</strong> will remain available on the community feed for other clinics or patients.
                        </span>
                      ) : (
                        <span className="text-teal-800">
                          You are claiming the entire remaining batch of this medication.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Role-Specific Claim Requirements */}
            {isIndividual ? (
              <div className="space-y-1.5">
                <label
                  htmlFor="prescription-ref"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Doctor Prescription Reference <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <input
                    id="prescription-ref"
                    type="text"
                    required
                    value={prescriptionRef}
                    onChange={(e) => setPrescriptionRef(e.target.value)}
                    placeholder="e.g. Dr. A. Rahman, SZMC Hospital - Rx dated 15 Oct, advised for 1 month"
                    className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Individual recipients must reference their prescribing physician or hospital prescription to guarantee safe medical usage.
                </p>
                {!isPrescriptionValid && touched && (
                  <p className="text-[11px] text-rose-600 font-medium">
                    * Prescription reference is required for individual collectors.
                  </p>
                )}
              </div>
            ) : isClinic ? (
              <div className="space-y-3">
                {/* Verified Clinic Badge Box */}
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-700" />
                      <span className="font-bold text-xs text-indigo-950">
                        {currentUser.organizationName || currentUser.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-800 font-mono">
                      {currentUser.registrationOrNid || 'Verified Clinic'}
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-900 leading-snug">
                    Verified healthcare charity/clinic distribution credential active. All collected medicines are entered into your clinic relief inventory.
                  </p>
                </div>

                {/* Optional Note for Pickup */}
                <div>
                  <label
                    htmlFor="pickup-note"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
                  >
                    Pickup Coordination Note (Optional)
                  </label>
                  <input
                    id="pickup-note"
                    type="text"
                    value={pickupNote}
                    onChange={(e) => setPickupNote(e.target.value)}
                    placeholder="e.g. Volunteer driver arriving today at 3:00 PM for pickup"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
                  />
                </div>
              </div>
            ) : null}

            {/* In-Person Inspection Reminder Checkbox */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2">
              <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={inspectionConfirmed}
                  onChange={(e) => setInspectionConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-amber-400 text-teal-600 focus:ring-teal-500 cursor-pointer h-4 w-4"
                />
                <span className="leading-relaxed">
                  I will contact the donor directly to arrange pickup and{' '}
                  <strong className="text-slate-900">
                    physically verify the sealed strip and expiry date upon collection
                  </strong>
                  .
                </span>
              </label>
              {!inspectionConfirmed && touched && (
                <p className="text-[11px] text-rose-600 font-medium pl-6">
                  * You must confirm in-person inspection before claiming.
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!isFormValid || actionLoading === medication.id}
                className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-2 ${
                  isFormValid && actionLoading !== medication.id
                    ? 'bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white shadow-md hover:shadow cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{actionLoading === medication.id ? 'Claiming...' : 'Confirm & Claim Medicine'}</span>
              </button>
            </div>

          </form>
        ) : (
          /* ========================================================== */
          /* 2. Claim Confirmation Screen with Revealed Donor Contact   */
          /* ========================================================== */
          <div className="p-6 space-y-5 animate-in fade-in duration-200">
            {/* Success Hero */}
            <div className="text-center space-y-2 py-1">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-700 border-2 border-emerald-300 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                Claim for {claimAmount} {unitName} Recorded!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                <strong className="text-teal-900">{medication.medicineName} ({medication.strength})</strong> — <span className="font-bold text-teal-800">{claimAmount} {unitName}</span> has been reserved for you. Please coordinate pickup directly with the donor.
              </p>
            </div>

            {/* Split remaining batch status if partial */}
            {remainingQty - claimAmount > 0 && (
              <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3.5 flex items-center justify-between text-xs text-sky-950">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-sky-700 shrink-0" />
                  <span>Remaining batch on community feed:</span>
                </div>
                <span className="font-mono font-bold bg-sky-200 text-sky-900 px-2 py-0.5 rounded-full">
                  {remainingQty - claimAmount} {unitName} still available
                </span>
              </div>
            )}

            {/* 4-Digit Handover PIN Card */}
            <div className="bg-gradient-to-br from-amber-50 via-amber-100/70 to-orange-50 border-2 border-amber-300 rounded-2xl p-4.5 text-center space-y-2.5 shadow-xs">
              <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-900">
                <KeyRound className="w-4 h-4 text-amber-700" />
                <span>Your 4-Digit Handover PIN</span>
              </div>
              <div className="inline-block bg-white px-8 py-2 rounded-2xl border-2 border-amber-400 font-mono text-3xl sm:text-4xl font-black text-amber-950 tracking-[0.3em] shadow-inner">
                {assignedPin || medication.handoverPin || '4829'}
              </div>
              <p className="text-xs text-amber-900 max-w-sm mx-auto leading-relaxed font-medium">
                Share this 4-digit PIN with the donor when you meet in person. The donor will enter it to verify and complete the handover.
              </p>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-900 bg-amber-200/80 py-1 px-3 rounded-full border border-amber-300">
                <Clock className="w-3.5 h-3.5 text-amber-800" />
                <span>⏳ 48-Hour Pickup Window: Please collect within 48 hours to avoid claim expiry</span>
              </div>
            </div>

            {/* Revealed Donor Contact Card */}
            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border-2 border-teal-300/80 rounded-2xl p-4.5 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-teal-950 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-teal-700" />
                  <span>Donor Pickup Contact Information</span>
                </span>
                <span className="text-[10px] bg-teal-200/80 text-teal-900 px-2 py-0.5 rounded-full font-mono">
                  Revealed
                </span>
              </div>

              <div className="bg-white rounded-xl p-3.5 border border-teal-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Donor Name:</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800">{medication.donorName}</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">Phone Number:</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${medication.donorPhone}`}
                      className="text-xs sm:text-sm font-mono font-bold text-teal-700 hover:text-teal-900 hover:underline"
                    >
                      {medication.donorPhone}
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyPhone}
                      className="p-1 rounded-md text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition cursor-pointer"
                      title="Copy phone number"
                    >
                      {copiedPhone ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">Pickup Location:</span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 text-right">
                    {medication.location}
                  </span>
                </div>
              </div>

              {/* Handover protocol reminder */}
              <div className="space-y-1.5 text-xs text-teal-950 bg-teal-100/60 p-3 rounded-xl border border-teal-200">
                <div className="font-bold text-teal-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  <span>In-Person Handover Checklist:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-teal-900/90 pl-1">
                  <li>Call donor to arrange a mutual time and pickup spot.</li>
                  <li>Verify the factory blister strip is unopened and intact.</li>
                  <li>Check that the expiry date stamped on the foil matches or exceeds record.</li>
                  <li>Share your 4-digit Handover PIN with the donor to verify collection.</li>
                  <li>After handover, the card status transitions to <strong>Collected</strong>.</li>
                </ul>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Card updated on <strong>&quot;Claimed &amp; Collected&quot;</strong> feed
              </span>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                >
                  Stay on Feed
                </button>
                <button
                  type="button"
                  onClick={handleDoneAndSwitch}
                  className="px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white shadow-md hover:shadow transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Go to My Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
