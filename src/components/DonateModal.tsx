'use client';

import React, { useState, useEffect } from 'react';
import { MedicineRequest } from '@/types/medshare';
import { useMedShare } from '@/context/MedShareContext';
import { getDaysUntilExpiry, getUrgencyLevel } from '@/lib/seed';
import { useIsMounted } from '@/lib/useIsMounted';
import {
  X,
  Pill,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  MapPin,
  Phone,
  Package,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  prefillRequest?: MedicineRequest | null;
}

export default function DonateModal({
  isOpen,
  onClose,
  onSuccess,
  prefillRequest,
}: DonateModalProps) {
  const { currentUser, addMedication, fulfillMedicineRequest, actionLoading } = useMedShare();
  const mounted = useIsMounted();

  const [medicineName, setMedicineName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [strength, setStrength] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [location, setLocation] = useState(currentUser?.location || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');

  // 3 Mandatory Safety Checkboxes
  const [safety1, setSafety1] = useState(false);
  const [safety2, setSafety2] = useState(false);
  const [safety3, setSafety3] = useState(false);

  const [touched, setTouched] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Populate from prefillRequest or reset on open
  useEffect(() => {
    if (isOpen) {
      if (prefillRequest) {
        setMedicineName(prefillRequest.medicineName);
        setGenericName(prefillRequest.genericName || '');
        setStrength(prefillRequest.strength);
        setQuantity(prefillRequest.quantityNeeded);
        setLocation(prefillRequest.location);
      } else {
        setMedicineName('');
        setGenericName('');
        setStrength('');
        setQuantity('');
        setLocation(currentUser?.location || '');
      }
      setPhone(currentUser?.phone || '');
      setExpiryDate('');
      setSafety1(false);
      setSafety2(false);
      setSafety3(false);
      setTouched(false);
    }
  }, [isOpen, prefillRequest, currentUser]);

  if (!isOpen || !currentUser) return null;

  // Compute minDate and daysRemaining safely once mounted
  const minDate = mounted ? (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  })() : undefined;

  // Expiry date validation
  const daysUntilExpiry = mounted && expiryDate ? getDaysUntilExpiry(expiryDate) : null;
  const isDateInFuture = daysUntilExpiry !== null && daysUntilExpiry > 0;
  const isSafetyConfirmed = safety1 && safety2 && safety3;

  const isFormValid =
    medicineName.trim().length > 0 &&
    strength.trim().length > 0 &&
    quantity.trim().length > 0 &&
    isDateInFuture &&
    location.trim().length > 0 &&
    phone.trim().length > 0 &&
    isSafetyConfirmed;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (!isFormValid) return;

    await addMedication({
      medicineName: medicineName.trim(),
      genericName: genericName.trim() || undefined,
      strength: strength.trim(),
      quantity: quantity.trim(),
      expiryDate,
      location: location.trim(),
      donorPhone: phone.trim(),
    });

    if (prefillRequest) {
      await fulfillMedicineRequest(prefillRequest.id, currentUser.name);
    }

    // Reset fields
    setMedicineName('');
    setGenericName('');
    setStrength('');
    setQuantity('');
    setExpiryDate('');
    setSafety1(false);
    setSafety2(false);
    setSafety3(false);
    setTouched(false);

    onClose();
    if (prefillRequest) {
      onSuccess(`Urgent request for ${prefillRequest.requesterName} fulfilled! Medicine listed for rescue.`);
    } else {
      onSuccess('Medicine listed successfully! It is now visible to verified collectors.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="donate-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
    >
      {/* Click outside backdrop */}
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 to-teal-800 text-white px-6 py-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Pill className="w-5 h-5 text-teal-100" />
            </div>
            <div>
              <h2 id="donate-modal-title" className="text-lg sm:text-xl font-bold tracking-tight">
                Donate Unused Medicine
              </h2>
              <p className="text-xs text-teal-100/90 mt-0.5">
                List sealed, unexpired medicines for rural clinics and verified individuals
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Donor Notice */}
        <div className="bg-teal-50/80 border-b border-teal-100 px-6 py-2.5 flex items-center justify-between text-xs text-teal-900">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            <span>Listing as: <strong className="font-semibold">{currentUser.name}</strong></span>
          </div>
          <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-teal-100 text-teal-800">
            {currentUser.role.replace('_', ' ')}
          </span>
        </div>

        {/* Fulfilling Urgent Request Banner */}
        {prefillRequest && (
          <div className="bg-sky-50 border-b border-sky-200 px-6 py-3 flex items-start gap-2.5 text-xs text-sky-950 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-bold text-sky-900">
                Fulfilling Urgent Request for {prefillRequest.requesterName}
              </div>
              <p className="text-sky-800 leading-snug">
                Needed: <strong>{prefillRequest.quantityNeeded}</strong> in <strong>{prefillRequest.location}</strong>. 
                Upon submitting, this request will automatically be marked as fulfilled on the board.
              </p>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Row 1: Medicine Name & Strength */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2">
              <label htmlFor="med-name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Medicine Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="med-name"
                  type="text"
                  required
                  value={medicineName}
                  onChange={(e) => setMedicineName(e.target.value)}
                  placeholder="e.g. Napa Extend, Sergel, Amdocal"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="med-strength" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Strength <span className="text-rose-500">*</span>
              </label>
              <input
                id="med-strength"
                type="text"
                required
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                placeholder="e.g. 665mg, 20mg"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
              />
            </div>
          </div>

          {/* Generic Name */}
          <div>
            <label htmlFor="generic-name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Generic Name <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <input
              id="generic-name"
              type="text"
              value={genericName}
              onChange={(e) => setGenericName(e.target.value)}
              placeholder="e.g. Paracetamol, Esomeprazole, Amlodipine"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
            />
          </div>

          {/* Row 2: Quantity & Packaging */}
          <div>
            <label htmlFor="med-quantity" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Quantity &amp; Packaging <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Package className="w-4 h-4" />
              </div>
              <input
                id="med-quantity"
                type="text"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 2 sealed blister strips (20 tablets) or 1 unopened bottle"
                className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Must be factory-sealed and intact. Loose tablets or opened bottles are rejected.
            </p>
          </div>

          {/* Row 3: Expiry Date with live helper badge */}
          <div>
            <label htmlFor="med-expiry" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Expiry Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                id="med-expiry"
                type="date"
                required
                min={minDate}
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition cursor-pointer"
              />
            </div>

            {/* Inline validation & live urgency preview */}
            {expiryDate && (
              <div className="mt-2">
                {!isDateInFuture ? (
                  <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Selected date has already passed or is today. Expiry must be in the future.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {daysUntilExpiry !== null && (
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          getUrgencyLevel(daysUntilExpiry) === 'critical'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : getUrgencyLevel(daysUntilExpiry) === 'priority'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          Expires in {daysUntilExpiry} {daysUntilExpiry === 1 ? 'day' : 'days'}
                          {getUrgencyLevel(daysUntilExpiry) === 'critical' && ' • Critical Urgent Item'}
                          {getUrgencyLevel(daysUntilExpiry) === 'priority' && ' • Priority Rescue Window'}
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Row 4: Pickup Location & Contact Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="med-location" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Pickup Area / Location <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  id="med-location"
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. North Hill Pharmacy Annex"
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="med-phone" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Pickup Contact Phone <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="med-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +1 (555) 234-5678"
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Mandatory Safety Confirmation Gate */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>Mandatory Safety Confirmation Gate</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-snug">
              To protect recipient health, all 3 confirmations below must be acknowledged before this medicine can be listed:
            </p>

            <div className="space-y-2.5 pt-1">
              <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={safety1}
                  onChange={(e) => setSafety1(e.target.checked)}
                  className="mt-0.5 rounded border-amber-400 text-teal-600 focus:ring-teal-500 cursor-pointer h-4 w-4"
                />
                <span className="leading-tight">
                  I confirm this medicine is in a <strong>sealed, intact blister pack/strip</strong> and has not been opened.
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={safety2}
                  onChange={(e) => setSafety2(e.target.checked)}
                  className="mt-0.5 rounded border-amber-400 text-teal-600 focus:ring-teal-500 cursor-pointer h-4 w-4"
                />
                <span className="leading-tight">
                  I confirm this medicine is <strong>unexpired</strong> and has been kept at <strong>normal room temperature</strong>.
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={safety3}
                  onChange={(e) => setSafety3(e.target.checked)}
                  className="mt-0.5 rounded border-amber-400 text-teal-600 focus:ring-teal-500 cursor-pointer h-4 w-4"
                />
                <span className="leading-tight">
                  I confirm this is <strong>NOT an opened liquid syrup</strong> or a drug that requires refrigeration (such as insulin).
                </span>
              </label>
            </div>

            {!isSafetyConfirmed && touched && (
              <p className="text-[11px] text-rose-600 font-medium pt-1">
                * Please check all 3 safety confirmations to proceed.
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
              disabled={!isFormValid || actionLoading === 'donating'}
              className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-2 ${
                isFormValid && actionLoading !== 'donating'
                  ? 'bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white shadow-md hover:shadow cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{actionLoading === 'donating' ? 'Listing Medicine...' : 'List Medicine for Rescue'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
