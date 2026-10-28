'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Medication } from '@/types/medshare';
import { useMedShare } from '@/context/MedShareContext';
import { getDaysUntilExpiry, getUrgencyLevel, parseQuantity } from '@/lib/seed';
import { useIsMounted } from '@/lib/useIsMounted';
import { motion, AnimatePresence } from 'framer-motion';
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
  Stethoscope,
  Minus,
  Plus,
  Sparkles,
} from 'lucide-react';

export function validateBmdcNumber(value: string): boolean {
  if (!value) return false;
  return /^[A-Z]-?\d{4,6}$/i.test(value.trim());
}

export function validatePrescriptionDate(dateStr: string): { isValid: boolean; error?: string } {
  if (!dateStr) return { isValid: false, error: 'Prescription date is required.' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { isValid: false, error: 'Invalid date format.' };

  const now = new Date();
  now.setHours(23, 59, 59, 999);
  if (d > now) {
    return { isValid: false, error: 'Prescription issue date cannot be in the future.' };
  }

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  ninetyDaysAgo.setHours(0, 0, 0, 0);
  if (d < ninetyDaysAgo) {
    return { isValid: false, error: 'Prescription cannot be older than 90 days.' };
  }

  return { isValid: true };
}

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

  const [pickupNote, setPickupNote] = useState('');
  const [claimAmount, setClaimAmount] = useState<number>(1);
  const [inspectionConfirmed, setInspectionConfirmed] = useState(false);
  const [assignedPin, setAssignedPin] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [touched, setTouched] = useState(false);

  // Structured BMDC Doctor's Prescription Form State
  const [doctorName, setDoctorName] = useState('');
  const [bmdcNumber, setBmdcNumber] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dosageSchedule, setDosageSchedule] = useState('1+0+1 (Twice daily)');

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

      setPickupNote('');
      setDoctorName('');
      setBmdcNumber('');
      setHospitalName('');
      setIssueDate(new Date().toISOString().split('T')[0]);
      setDosageSchedule('1+0+1 (Twice daily)');
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

  // Strict Validation
  const isDoctorNameValid = doctorName.trim().length >= 5;
  const isBmdcValid = validateBmdcNumber(bmdcNumber);
  const isHospitalValid = hospitalName.trim().length >= 4;
  const dateValidation = validatePrescriptionDate(issueDate);
  const isDateValid = dateValidation.isValid;
  const isDosageValid = Boolean(dosageSchedule);

  const isIndividualRxValid =
    isDoctorNameValid && isBmdcValid && isHospitalValid && isDateValid && isDosageValid;

  const isFormValid =
    inspectionConfirmed &&
    claimAmount > 0 &&
    claimAmount <= remainingQty &&
    (isClinic ? true : isIndividualRxValid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (!isFormValid) return;

    let prescriptionRef = '';
    if (isIndividual) {
      prescriptionRef = `Rx: ${doctorName.trim()} (BMDC: ${bmdcNumber.trim().toUpperCase()}, ${hospitalName.trim()}) • Issued: ${issueDate} • Dosage: ${dosageSchedule}`;
    } else if (isClinic) {
      prescriptionRef = `${currentUser.organizationName || currentUser.name} (${currentUser.registrationOrNid || 'Verified Clinic'})`;
    } else if (pickupNote.trim()) {
      prescriptionRef = `Pickup Note: ${pickupNote.trim()}`;
    }

    const res = await claimMedication(medication.id, prescriptionRef, claimAmount);
    if (res && res.pin) {
      setAssignedPin(res.pin);
      setIsSubmitted(true);
    }
  };

  const handleCopyPhone = () => {
    if (navigator?.clipboard && medication.donorPhone) {
      navigator.clipboard.writeText(medication.donorPhone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const splitPercentage = remainingQty > 0 ? (claimAmount / remainingQty) * 100 : 100;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-teal-500/30 bg-slate-900/95 text-white shadow-2xl space-y-0"
      >
        {/* Specular Top Rim */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-teal-400/40 to-transparent rounded-t-3xl" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-teal-500/20 flex items-center justify-between sticky top-0 bg-slate-900/90 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-lg sm:text-xl font-extrabold text-white">
                {isSubmitted ? 'Medicine Claim Reserved' : 'Claim Medication'}
              </h3>
              <p className="text-xs text-teal-300/80 font-mono">
                {isSubmitted ? 'Dispatch Handover Authorization Ticket' : 'Verified Clinical Handover Protocol'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleModalClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
            {/* Medication Summary Strip */}
            <div className="bg-slate-950/70 border border-teal-500/20 rounded-2xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-display font-extrabold text-white text-base sm:text-lg">
                    {medication.medicineName}
                  </h4>
                  {medication.genericName && (
                    <p className="text-xs text-teal-300/85 italic font-sans">
                      ({medication.genericName})
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-slate-900 text-teal-300 border border-teal-500/35">
                  {medication.strength}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-300 pt-1 border-t border-teal-500/10">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-teal-400" />
                  <span>Expiry: {medication.expiryDate}</span>
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-teal-400" />
                  <span>{medication.location}</span>
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-teal-400" />
                  <span>Donor: {medication.donorName}</span>
                </span>
              </div>
            </div>

            {/* ========================================================= */}
            {/* INTERACTIVE QUANTITY SPLIT VISUALIZER                     */}
            {/* ========================================================= */}
            {remainingQty > 1 && (
              <div className="bg-slate-950/80 border border-teal-500/25 rounded-2xl p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-mono font-bold text-teal-300 uppercase tracking-wider">
                    Quantity to Claim <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-500/30">
                    Max: {remainingQty} {unitName}
                  </span>
                </div>

                {/* Range Slider + Stepper Controls */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={remainingQty}
                      step={1}
                      value={claimAmount}
                      onChange={(e) => setClaimAmount(parseInt(e.target.value, 10) || 1)}
                      className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
                    />

                    {/* Numeric Stepper Input */}
                    <div className="flex items-center gap-1 shrink-0 bg-slate-900 border border-teal-500/30 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => setClaimAmount((prev) => Math.max(1, prev - 1))}
                        className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-teal-300 transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={remainingQty}
                        value={claimAmount}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) setClaimAmount(Math.max(1, Math.min(remainingQty, val)));
                        }}
                        className="w-12 text-center font-mono font-bold text-sm bg-transparent text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setClaimAmount((prev) => Math.min(remainingQty, prev + 1))}
                        className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-teal-300 transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Dual-Color Split Bar Visualizer */}
                  <div className="space-y-1">
                    <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden flex border border-slate-700/60">
                      <div
                        style={{ width: `${splitPercentage}%` }}
                        className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-300"
                      />
                      <div
                        style={{ width: `${100 - splitPercentage}%` }}
                        className="h-full bg-slate-800/80 transition-all duration-300"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span className="text-teal-300 font-bold">
                        Claiming: {claimAmount} {unitName}
                      </span>
                      <span>
                        Remaining for Community: {remainingQty - claimAmount} {unitName}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* DIGITAL BMDC PRESCRIPTION PAD (FOR INDIVIDUAL RECIPIENTS) */}
            {/* ========================================================= */}
            {isIndividual ? (
              <div className="bg-slate-950/90 border-l-4 border-teal-500 rounded-2xl p-5 border border-teal-500/25 shadow-inner space-y-4 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-teal-500/20">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-display text-sm font-bold text-white">
                        Digital BMDC Prescription Pad
                      </h4>
                      <p className="text-[10px] text-teal-300/80">
                        Bangladesh Medical &amp; Dental Council Rx Verification
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-500/30 uppercase">
                    Mandatory Safety
                  </span>
                </div>

                {/* Doctor Name */}
                <div className="space-y-1">
                  <label className="block text-slate-300 font-bold uppercase">
                    Doctor&apos;s Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="e.g. Dr. Mahmudul Hasan"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-teal-500/30 text-white focus:border-teal-400 outline-none"
                  />
                </div>

                {/* BMDC Registration with Live Regex Indicator */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-300 font-bold uppercase">
                      BMDC Registration Number <span className="text-rose-400">*</span>
                    </label>
                    {isBmdcValid ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                        ✓ Valid BMDC Format
                      </span>
                    ) : bmdcNumber.length > 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40">
                        Expected A-XXXXX
                      </span>
                    ) : null}
                  </div>
                  <input
                    type="text"
                    required
                    value={bmdcNumber}
                    onChange={(e) => setBmdcNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. A-45892"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-teal-500/30 text-white font-mono uppercase focus:border-teal-400 outline-none"
                  />
                </div>

                {/* Hospital & Prescription Date Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold uppercase mb-1">
                      Hospital / Clinic Chamber <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      placeholder="e.g. SZMCH Bogura"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-teal-500/30 text-white focus:border-teal-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold uppercase mb-1">
                      Prescription Date <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      max={new Date().toISOString().split('T')[0]}
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-teal-500/30 text-white focus:border-teal-400 outline-none"
                    />
                  </div>
                </div>

                {/* Dosage Schedule */}
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-1">
                    Dosage Schedule <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={dosageSchedule}
                    onChange={(e) => setDosageSchedule(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-teal-500/30 text-white focus:border-teal-400 outline-none cursor-pointer"
                  >
                    <option value="1+0+1 (Twice daily)">1+0+1 (Twice daily)</option>
                    <option value="1+1+1 (Thrice daily)">1+1+1 (Thrice daily)</option>
                    <option value="1+0+0 (Morning only)">1+0+0 (Morning only)</option>
                    <option value="0+0+1 (Night only)">0+0+1 (Night only)</option>
                    <option value="As directed">As directed</option>
                  </select>
                </div>
              </div>
            ) : isClinic ? (
              <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-400/30 space-y-1.5 font-mono text-xs text-indigo-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    <span>{currentUser.organizationName || currentUser.name}</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-900 text-indigo-300 border border-indigo-400/40 uppercase">
                    Verified Clinic Credential
                  </span>
                </div>
                <p className="text-[11px] text-indigo-300/80 font-sans">
                  All collected medicines will be entered into your rural clinic redistribution inventory.
                </p>
              </div>
            ) : null}

            {/* In-Person Inspection Confirmation Checkbox */}
            <div className="bg-amber-950/50 border border-amber-500/30 rounded-2xl p-4 text-xs font-mono text-amber-200">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={inspectionConfirmed}
                  onChange={(e) => setInspectionConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-amber-500 text-teal-500 focus:ring-0 cursor-pointer h-4 w-4"
                />
                <span className="leading-relaxed font-sans">
                  I will contact the donor directly to arrange handover and{' '}
                  <strong className="text-white">
                    physically inspect the factory blister seal and expiry date in person
                  </strong>
                  .
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-teal-500/20">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-mono font-semibold rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!isFormValid || actionLoading === medication.id}
                className="px-5 py-2.5 text-xs sm:text-sm font-bold font-mono rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 shadow-md transition cursor-pointer hover:from-teal-300 hover:to-emerald-400 disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{actionLoading === medication.id ? 'Claiming...' : 'Confirm & Claim Medicine'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* ========================================================== */
          /* SUCCESS VIEW: 4-DIGIT PIN VAULT & REVEALED CONTACT         */
          /* ========================================================== */
          <div className="p-6 space-y-5 animate-in fade-in duration-200 font-mono">
            <div className="text-center space-y-2 py-1">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-300 border-2 border-emerald-400/40 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-display text-xl font-bold text-white">
                Claim for {claimAmount} {unitName} Confirmed!
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed font-sans">
                <strong className="text-teal-300">{medication.medicineName} ({medication.strength})</strong> has been reserved for you. Please coordinate pickup directly with the donor.
              </p>
            </div>

            {/* 4-Digit Handover PIN Vault Box */}
            <div className="bg-slate-950 border border-teal-500/40 rounded-2xl p-5 text-center space-y-3 shadow-inner">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-teal-300 uppercase tracking-wider">
                <KeyRound className="w-4 h-4 text-teal-400" />
                <span>YOUR 4-DIGIT HANDOVER PIN</span>
              </div>

              <div className="flex items-center justify-center gap-3">
                {(assignedPin || medication.handoverPin || '4829').split('').map((digit, i) => (
                  <div
                    key={i}
                    className="bg-slate-900 text-teal-300 border border-teal-500/40 rounded-xl w-12 h-14 flex items-center justify-center font-mono text-2xl font-black shadow-inner"
                  >
                    {digit}
                  </div>
                ))}
              </div>

              <p className="text-xs text-slate-400 max-w-sm mx-auto font-sans">
                Share this PIN with the donor upon physical meeting. The donor enters it in their portal to complete verification.
              </p>
            </div>

            {/* Revealed Donor Contact Details */}
            <div className="bg-slate-950/80 border border-teal-500/30 rounded-2xl p-4 space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center justify-between text-teal-300 font-bold uppercase text-[10px]">
                <span>Donor Contact Coordinates</span>
                <span className="text-emerald-400">UNLOCKED</span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-teal-500/15">
                <span className="text-slate-400">Donor Name:</span>
                <span className="text-white font-bold">{medication.donorName}</span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-teal-500/15">
                <span className="text-slate-400">Phone:</span>
                <div className="flex items-center gap-2">
                  <a href={`tel:${medication.donorPhone}`} className="text-teal-300 font-bold hover:underline">
                    {medication.donorPhone}
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyPhone}
                    className="p-1 rounded text-teal-400 hover:text-white"
                  >
                    {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-teal-500/15">
                <span className="text-slate-400">Handover Location:</span>
                <span className="text-white font-bold">{medication.location}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleModalClose}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 font-bold text-xs font-mono transition cursor-pointer hover:from-teal-300 hover:to-emerald-400"
              >
                Go to My Portal &rarr;
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
