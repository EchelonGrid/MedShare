'use client';

import React, { useState, useEffect } from 'react';
import { useMedShare } from '@/context/MedShareContext';
import {
  X,
  ShieldCheck,
  Building2,
  User,
  Phone,
  MapPin,
  FileText,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface VerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  notice?: string | null;
}

export default function VerifyModal({
  isOpen,
  onClose,
  onSuccess,
  notice,
}: VerifyModalProps) {
  const { currentUser, verifyCurrentUser, verifyNotice } = useMedShare();

  const [orgName, setOrgName] = useState(currentUser?.organizationName || '');
  const [regOrNid, setRegOrNid] = useState(currentUser?.registrationOrNid || '');
  const [fullName, setFullName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [location, setLocation] = useState(currentUser?.location || '');
  const [confirmed, setConfirmed] = useState(false);
  const [touched, setTouched] = useState(false);

  // Sync state whenever the modal opens or currentUser switches
  useEffect(() => {
    if (isOpen && currentUser) {
      setOrgName(currentUser.organizationName || '');
      setRegOrNid(currentUser.registrationOrNid || '');
      setFullName(currentUser.name || '');
      setPhone(currentUser.phone || '');
      setLocation(currentUser.location || '');
      setConfirmed(false);
      setTouched(false);
    }
  }, [isOpen, currentUser]);

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

  if (!isOpen || !currentUser) return null;

  const displayNotice = notice || verifyNotice;
  const isClinic = currentUser.role === 'clinic_charity';
  const isIndividual = currentUser.role === 'individual';

  // Field validation
  const isOrgValid = !isClinic || orgName.trim().length > 0;
  const isNameValid = isClinic || fullName.trim().length > 0;
  const isIdValid = !isClinic && !isIndividual ? true : regOrNid.trim().length > 0;
  const isPhoneValid = phone.trim().length > 0;
  const isLocationValid = location.trim().length > 0;

  const isFormValid =
    isOrgValid && isNameValid && isIdValid && isPhoneValid && isLocationValid && confirmed;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (!isFormValid) return;

    verifyCurrentUser({
      name: isClinic ? (fullName || currentUser.name) : fullName.trim(),
      organizationName: isClinic ? orgName.trim() : currentUser.organizationName,
      registrationOrNid: regOrNid.trim(),
      phone: phone.trim(),
      location: location.trim(),
    });

    onClose();
    onSuccess('Account verified! You can now claim available medications.');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="verify-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
    >
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white px-6 py-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center border border-teal-400/30 text-teal-200">
              <ShieldCheck className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h2 id="verify-modal-title" className="text-lg sm:text-xl font-bold tracking-tight">
                Collector Identity Verification
              </h2>
              <p className="text-xs text-teal-100/90 mt-0.5">
                {isClinic
                  ? 'Verify your rural clinic or registered healthcare charity'
                  : 'Verify your recipient identity with government NID / Birth Reg'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Close verification modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Banner (e.g. triggered when claiming while unverified) */}
        {displayNotice && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="font-medium leading-relaxed">{displayNotice}</p>
          </div>
        )}

        {/* Role Identity Indicator */}
        <div className="bg-teal-50/80 border-b border-teal-100 px-6 py-2.5 flex items-center justify-between text-xs text-teal-950">
          <div className="flex items-center gap-2">
            {isClinic ? (
              <Building2 className="w-4 h-4 text-teal-700" />
            ) : (
              <User className="w-4 h-4 text-teal-700" />
            )}
            <span>
              Verifying profile for: <strong className="font-semibold text-teal-900">{currentUser.name}</strong>
            </span>
          </div>
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 uppercase">
            {currentUser.role.replace('_', ' ')}
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Dynamic Fields: Clinic / Charity vs Individual */}
          {isClinic ? (
            <>
              {/* Organization / Clinic Name */}
              <div>
                <label
                  htmlFor="org-name"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Organization / Clinic Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    id="org-name"
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Bogura Free Rural Health Center"
                    className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
                  />
                </div>
              </div>

              {/* NGO / Clinic Registration or License Number */}
              <div>
                <label
                  htmlFor="clinic-reg"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
                >
                  NGO / Clinic Registration or License Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <input
                    id="clinic-reg"
                    type="text"
                    required
                    value={regOrNid}
                    onChange={(e) => setRegOrNid(e.target.value)}
                    placeholder="e.g. NGO-CLINIC-7729 or DGHS-REG-2024"
                    className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Official license number issued by the Directorate General of Health Services or NGO Affairs Bureau.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Full Name */}
              <div>
                <label
                  htmlFor="individual-name"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Full Name (as on Government ID) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="individual-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rahim Chowdhury"
                    className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
                  />
                </div>
              </div>

              {/* National ID (NID) / Birth Registration Number */}
              <div>
                <label
                  htmlFor="individual-nid"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
                >
                  National ID (NID) / Birth Registration Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <input
                    id="individual-nid"
                    type="text"
                    required
                    value={regOrNid}
                    onChange={(e) => setRegOrNid(e.target.value)}
                    placeholder="e.g. 1998260636001 or NID-8923-4410"
                    className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  10, 13, or 17 digit national identity or smart card number.
                </p>
              </div>
            </>
          )}

          {/* Contact Phone & Area / Location (Pre-filled from Profile) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div>
              <label
                htmlFor="verify-phone"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
              >
                Official Contact Phone <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="verify-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +1 (555) 876-5432"
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="verify-location"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
              >
                Area / Location <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  id="verify-location"
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Valley Plains Community Center"
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Verification Confirmation Checkbox */}
          <div className="pt-2">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer h-4 w-4"
                />
                <span className="leading-relaxed">
                  I confirm that the identity/organization details provided are accurate and I will{' '}
                  <strong className="text-slate-900">
                    inspect all medicine expiry dates in person upon collection
                  </strong>
                  .
                </span>
              </label>
              {!confirmed && touched && (
                <p className="text-[11px] text-rose-600 font-medium pl-6">
                  * You must confirm this declaration before verification.
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!isFormValid}
              className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-2 ${
                isFormValid
                  ? 'bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white shadow-md hover:shadow cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Verify &amp; Unlock Claims</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
