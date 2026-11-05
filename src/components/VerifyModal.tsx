'use client';

import React, { useState, useEffect } from 'react';
import { useMedShare } from '@/context/MedShareContext';
import {
  BD_DISTRICT_NAMES,
  validateBangladeshNID,
  validateFacilityCredential,
} from '@/lib/bd-registries';
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
  Mail,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Loader2,
} from 'lucide-react';

interface VerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  notice?: string | null;
}

export function validateNidOrBirthReg(value: string): boolean {
  if (!value) return false;
  const clean = value.replace(/[\s-]/g, '');
  if (!/^\d{10}$|^\d{13}$|^\d{17}$/.test(clean)) return false;
  if (/^(\d)\1+$/.test(clean)) return false;
  return true;
}

export function validateClinicRegistration(value: string): boolean {
  if (!value) return false;
  return value.trim().length >= 2;
}

export default function VerifyModal({
  isOpen,
  onClose,
  onSuccess,
  notice,
}: VerifyModalProps) {
  const { currentUser, requestVerificationOtp, verifyAccountOtp, verifyNotice, actionLoading } = useMedShare();

  // Wizard Step: 1 = Registry Credentials, 2 = Supabase Auth Email OTP
  const [step, setStep] = useState<1 | 2>(1);

  // Form State
  const [fullName, setFullName] = useState('');
  const [birthYear, setBirthYear] = useState('1998');
  const [districtName, setDistrictName] = useState('Bogura');
  const [orgName, setOrgName] = useState('');
  const [regOrNid, setRegOrNid] = useState('');
  const [normalizedRegOrNid, setNormalizedRegOrNid] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  // OTP State
  const [otpCode, setOtpCode] = useState('');
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Validation Error States
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync state whenever the modal opens or currentUser updates
  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.name || '');
      setPhone(currentUser.phone || '');
      setLocation(currentUser.location || '');
      setOrgName(currentUser.organizationName || (currentUser.role === 'clinic_charity' ? currentUser.name : ''));
      setRegOrNid(currentUser.registrationOrNid || '');
      setStep(1);
      setOtpCode('');
      setValidationError(null);
      setConfirmed(false);
    }
  }, [isOpen, currentUser]);

  // Resend OTP countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && actionLoading !== 'verifying') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, actionLoading]);

  if (!isOpen || !currentUser) return null;

  const displayNotice = notice || verifyNotice;
  const isClinic = currentUser.role === 'clinic_charity';

  // STEP 1: Validate Registry Credentials & Trigger Supabase OTP
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!confirmed) {
      setValidationError('Please check the confirmation box verifying that the details are authentic.');
      return;
    }

    if (!phone.trim() || phone.trim().length < 8) {
      setValidationError('Please enter a valid official contact phone number.');
      return;
    }

    if (!location.trim() || location.trim().length < 3) {
      setValidationError('Please enter your area or facility physical location.');
      return;
    }

    let normalizedCred = regOrNid.trim();

    if (isClinic) {
      const res = validateFacilityCredential({
        orgName,
        regNumber: regOrNid,
        districtName,
      });

      if (!res.valid) {
        setValidationError(res.error || 'Failed facility credential verification.');
        return;
      }
      if (res.normalizedRegNumber) {
        normalizedCred = res.normalizedRegNumber;
      }
    } else {
      const res = validateBangladeshNID({
        nid: regOrNid,
        birthYear,
        districtName,
      });

      if (!res.valid) {
        setValidationError(res.error || 'Failed National ID verification.');
        return;
      }
      if (res.normalizedNid) {
        normalizedCred = res.normalizedNid;
      }
    }

    setNormalizedRegOrNid(normalizedCred);

    // Call Context to check uniqueness and dispatch Supabase Auth Email OTP
    const otpRes = await requestVerificationOtp({
      name: isClinic ? (orgName.trim() || currentUser.name) : fullName.trim(),
      organizationName: isClinic ? orgName.trim() : currentUser.organizationName,
      registrationOrNid: normalizedCred,
      phone: phone.trim(),
      location: location.trim(),
      districtName,
      birthYear,
    });

    if (!otpRes.success) {
      setValidationError(otpRes.error || 'Failed to dispatch verification OTP.');
      return;
    }

    if (otpRes.demoOtp) {
      setDemoOtpHint(otpRes.demoOtp);
    }
    setResendCooldown(60);
    setStep(2);
  };

  // STEP 2: Verify Supabase OTP & Activate
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!otpCode || otpCode.trim().length !== 6) {
      setValidationError('Please enter the 6-digit numeric verification code.');
      return;
    }

    const verifyRes = await verifyAccountOtp(otpCode, {
      name: isClinic ? (orgName.trim() || currentUser.name) : fullName.trim(),
      organizationName: isClinic ? orgName.trim() : currentUser.organizationName,
      registrationOrNid: normalizedRegOrNid || regOrNid.trim(),
      phone: phone.trim(),
      location: location.trim(),
      districtName,
      birthYear,
    });

    if (!verifyRes.success) {
      setValidationError(verifyRes.error || 'Invalid or expired OTP code.');
      return;
    }

    onClose();
    onSuccess('Identity verified successfully! Medicine claiming is now unlocked.');
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setValidationError(null);
    const otpRes = await requestVerificationOtp({
      name: isClinic ? (orgName.trim() || currentUser.name) : fullName.trim(),
      organizationName: isClinic ? orgName.trim() : currentUser.organizationName,
      registrationOrNid: regOrNid.trim(),
      phone: phone.trim(),
      location: location.trim(),
      districtName,
      birthYear,
    });
    if (otpRes.success) {
      if (otpRes.demoOtp) {
        setDemoOtpHint(otpRes.demoOtp);
      }
      setResendCooldown(60);
    } else {
      setValidationError(otpRes.error || 'Failed to resend code.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="verify-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
    >
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={actionLoading === 'verifying' ? undefined : onClose} aria-hidden="true" />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white px-6 py-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center border border-teal-400/30 text-teal-200">
              <ShieldCheck className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="verify-modal-title" className="text-lg sm:text-xl font-bold tracking-tight">
                  Automated 2-Step Identity Verification
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-500/30 text-teal-200 border border-teal-400/40">
                  {step === 1 ? 'Step 1 of 2' : 'Step 2 of 2'}
                </span>
              </div>
              <p className="text-xs text-teal-100/90 mt-0.5">
                {isClinic
                  ? 'Official DGHS & NGOAB Government Registry Validation'
                  : 'National Identity & Healthcare Credential Verification'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={actionLoading === 'verifying'}
            className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 transition cursor-pointer disabled:opacity-50"
            aria-label="Close verification modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Banner */}
        {displayNotice && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="font-medium leading-relaxed">{displayNotice}</p>
          </div>
        )}

        {/* Validation Error Banner */}
        {validationError && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-3 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="font-semibold leading-relaxed">{validationError}</p>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 1: REGISTRY CREDENTIALS FORM                        */}
        {/* ======================================================== */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="p-6 space-y-4">

            {/* Individual vs Clinic Fields */}
            {isClinic ? (
              <>
                {/* Organization Name */}
                <div>
                  <label htmlFor="verify-org-name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Organization / Clinic Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input
                      id="verify-org-name"
                      name="organization"
                      type="text"
                      autoComplete="organization"
                      required
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="e.g. Shaheed Ziaur Rahman Medical College Hospital"
                      className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
                    />
                  </div>
                </div>

                {/* District & License Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor="verify-clinic-district" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Facility District <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="verify-clinic-district"
                      name="district"
                      value={districtName}
                      onChange={(e) => setDistrictName(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none bg-white transition"
                    >
                      {BD_DISTRICT_NAMES.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="verify-dghs-code" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      DGHS Code or NGOAB Reg <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <FileText className="w-4 h-4" />
                      </div>
                      <input
                        id="verify-dghs-code"
                        name="dghs_code"
                        type="text"
                        autoComplete="off"
                        required
                        value={regOrNid}
                        onChange={(e) => setRegOrNid(e.target.value)}
                        placeholder="e.g. 1105, 10016472, 241"
                        className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none font-mono transition"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Full Name */}
                <div>
                  <label htmlFor="verify-full-name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Full Name (as on NID) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="verify-full-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Dr. Farhana Rahman"
                      className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
                    />
                  </div>
                </div>

                {/* Birth Year & Birth District Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor="verify-birth-year" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Birth Year <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="verify-birth-year"
                      name="birth_year"
                      type="number"
                      autoComplete="bday-year"
                      required
                      min={1930}
                      max={2008}
                      value={birthYear}
                      onChange={(e) => setBirthYear(e.target.value)}
                      placeholder="e.g. 1998"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
                    />
                  </div>

                  <div>
                    <label htmlFor="verify-birth-district" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Birth / Home District <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="verify-birth-district"
                      name="district"
                      value={districtName}
                      onChange={(e) => setDistrictName(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none bg-white transition"
                    >
                      {BD_DISTRICT_NAMES.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* NID Input */}
                <div>
                  <label htmlFor="verify-nid-number" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    National ID (NID) Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <input
                      id="verify-nid-number"
                      name="nid"
                      type="text"
                      autoComplete="off"
                      required
                      value={regOrNid}
                      onChange={(e) => setRegOrNid(e.target.value)}
                      placeholder="10-digit Smart, 13-digit Classic, or 17-digit NID"
                      className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none font-mono transition"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Phone & Area */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="verify-phone" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Contact Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id="verify-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880 1711-234567"
                    className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="verify-location" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Area / Location <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    id="verify-location"
                    name="address"
                    type="text"
                    autoComplete="address-level2"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Jaleswaritola, Bogura"
                    className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Confirmation Checkbox */}
            <div className="pt-1">
              <label htmlFor="verify-declaration-check" className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer select-none">
                <input
                  id="verify-declaration-check"
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer h-4 w-4"
                />
                <span className="leading-relaxed">
                  I confirm that the details provided are authentic and match official Bangladesh government registries.
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={actionLoading === 'verifying'}
                className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white shadow-md hover:shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {actionLoading === 'verifying' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                <span>
                  {actionLoading === 'verifying' ? 'Checking Registry...' : 'Validate & Send 6-Digit OTP'}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* STEP 2: SUPABASE AUTH EMAIL OTP VERIFICATION             */}
        {/* ======================================================== */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto shadow-inner">
                <Mail className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Enter Email Verification Code
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                A 6-digit confirmation code has been dispatched via Supabase Auth to{' '}
                <strong className="text-slate-900 font-semibold">{currentUser.email}</strong>.
              </p>
            </div>

            {/* OTP Input Field */}
            <div className="space-y-2 max-w-xs mx-auto">
              <label htmlFor="verify-email-otp" className="sr-only">
                6-Digit Verification Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-5 h-5 text-teal-600" />
                </div>
                <input
                  id="verify-email-otp"
                  name="one-time-code"
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label="6-Digit Verification Code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full pl-11 pr-3.5 py-3 text-2xl font-mono font-black text-center tracking-[0.4em] rounded-2xl border-2 border-teal-600/60 focus:border-teal-700 focus:ring-4 focus:ring-teal-100 outline-none transition"
                />
              </div>
              <p className="text-[11px] text-center text-slate-500">
                Enter the 6-digit numeric OTP code sent to your email.
              </p>
            </div>

            {/* Demo / Offline Hint if applicable */}
            {demoOtpHint && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  ⚡ Supabase OTP Simulation Note:
                </span>
                <p className="text-xs text-amber-900">
                  If running locally without custom SMTP inbox access, your generated code is:{' '}
                  <strong className="font-mono font-bold bg-amber-200/80 px-2 py-0.5 rounded text-amber-950">
                    {demoOtpHint}
                  </strong>
                </p>
              </div>
            )}

            {/* Resend Timer & Buttons */}
            <div className="flex items-center justify-center gap-2 pt-1 text-xs">
              <span className="text-slate-500">Didn&apos;t receive the email?</span>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || actionLoading === 'verifying'}
                className="font-bold text-teal-700 hover:text-teal-800 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={actionLoading === 'verifying'}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Edit</span>
              </button>

              <button
                type="submit"
                disabled={otpCode.length !== 6 || actionLoading === 'verifying'}
                className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white shadow-md hover:shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {actionLoading === 'verifying' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>
                  {actionLoading === 'verifying' ? 'Verifying...' : 'Verify OTP & Activate Account'}
                </span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
