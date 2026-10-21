'use client';

import React, { useState, useEffect } from 'react';
import { Medication } from '@/types/medshare';
import { useMedShare } from '@/context/MedShareContext';
import { getDaysUntilExpiry, getUrgencyLevel } from '@/lib/seed';
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
  AlertTriangle,
  Building2,
  FileText,
  Copy,
  Check,
  ArrowRight,
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
  const [inspectionConfirmed, setInspectionConfirmed] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [touched, setTouched] = useState(false);

  // Reset modal state on open or medication change
  useEffect(() => {
    if (isOpen) {
      setPrescriptionRef('');
      setPickupNote('');
      setInspectionConfirmed(false);
      setIsSubmitted(false);
      setCopiedPhone(false);
      setTouched(false);
    }
  }, [isOpen, medication]);

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
  }, [isOpen]);

  if (!isOpen || !medication || !currentUser) return null;

  const isIndividual = currentUser.role === 'individual';
  const isClinic = currentUser.role === 'clinic_charity';

  const daysRemaining = mounted ? getDaysUntilExpiry(medication.expiryDate) : null;
  const urgency = daysRemaining !== null ? getUrgencyLevel(daysRemaining) : 'normal';

  // Validation
  const isPrescriptionValid = !isIndividual || prescriptionRef.trim().length > 0;
  const isFormValid = isPrescriptionValid && inspectionConfirmed;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (!isFormValid) return;

    const refString = isIndividual
      ? prescriptionRef.trim()
      : pickupNote.trim()
      ? `Pickup Note: ${pickupNote.trim()}`
      : undefined;

    claimMedication(medication.id, refString);
    setIsSubmitted(true);
  };

  const handleModalClose = () => {
    if (isSubmitted) {
      onSuccess(`"${medication.medicineName}" claimed! Coordinate pickup with the donor.`);
      onViewClaimed?.(medication.id);
    }
    onClose();
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
                Claim Successfully Recorded!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                <strong className="text-teal-900">{medication.medicineName} ({medication.strength})</strong> has been reserved for you. Please coordinate pickup directly with the donor.
              </p>
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
                  <li>After handover, click <strong>"Mark as Collected"</strong> on the card.</li>
                </ul>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Card moved to <strong>"Claimed &amp; Collected"</strong> tab
              </span>

              <button
                type="button"
                onClick={handleDoneAndSwitch}
                className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white shadow-md hover:shadow transition flex items-center gap-2 cursor-pointer"
              >
                <span>Done &amp; View in Feed</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
