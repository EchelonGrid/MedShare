'use client';

import React, { useState, useEffect } from 'react';
import { useMedShare } from '@/context/MedShareContext';
import { RequestUrgency, MedicineCategory } from '@/types/medshare';
import {
  MEDICINE_CATEGORIES,
  lookupMedicineByBrandOrName,
  getAutocompleteSuggestions,
  AutocompleteSuggestion,
} from '@/lib/medicine-dictionary';
import {
  X,
  Pill,
  AlertTriangle,
  Building2,
  User,
  Phone,
  MapPin,
  FileText,
  CheckCircle2,
  Clock,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface RequestMedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export default function RequestMedicineModal({
  isOpen,
  onClose,
  onSuccess,
}: RequestMedicineModalProps) {
  const {
    currentUser,
    addMedicineRequest,
    actionLoading,
    openAuthModal,
    openVerifyModal,
  } = useMedShare();

  const [medicineName, setMedicineName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [category, setCategory] = useState<MedicineCategory>('Antibiotics');
  const [strength, setStrength] = useState('');
  const [quantityNeeded, setQuantityNeeded] = useState('');
  const [urgency, setUrgency] = useState<RequestUrgency>('critical');
  const [location, setLocation] = useState(currentUser?.location || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [reasonOrPrescription, setReasonOrPrescription] = useState('');
  const [declaration, setDeclaration] = useState(false);
  const [touched, setTouched] = useState(false);

  // Smart suggestions & dictionary state
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [commonStrengths, setCommonStrengths] = useState<string[]>([]);
  const [equivalentBrands, setEquivalentBrands] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Sync profile details when opening
  useEffect(() => {
    if (isOpen && currentUser) {
      setLocation(currentUser.location || '');
      setPhone(currentUser.phone || '');
      setDeclaration(false);
      setTouched(false);
      setShowDropdown(false);
      setCommonStrengths([]);
      setEquivalentBrands([]);
    }
  }, [isOpen, currentUser]);

  const handleMedicineNameChange = (val: string) => {
    setMedicineName(val);
    const suggs = getAutocompleteSuggestions(val);
    setSuggestions(suggs);
    setShowDropdown(suggs.length > 0);

    const match = lookupMedicineByBrandOrName(val);
    if (match) {
      setGenericName(match.genericName);
      setCategory(match.category);
      setCommonStrengths(match.commonStrengths);
      setEquivalentBrands(match.allEquivalentBrands.filter((b) => b.toLowerCase() !== val.trim().toLowerCase()));
    }
  };

  const handleSelectSuggestion = (s: AutocompleteSuggestion) => {
    setMedicineName(s.name);
    setGenericName(s.genericName);
    setCategory(s.category);
    setCommonStrengths(s.commonStrengths);
    setEquivalentBrands(s.equivalentBrands);
    setShowDropdown(false);
  };

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Verification & Role Gate
  if (!currentUser) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      >
        <div className="fixed inset-0" onClick={onClose} />
        <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl z-10">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Sign In to Post Urgent Request</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Only verified clinics, charities, and individual patients can post urgent medicine shortages for donor fulfillment.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                openAuthModal('login', 'Please sign in to post an urgent medicine request.');
              }}
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition cursor-pointer"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser.isVerified) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      >
        <div className="fixed inset-0" onClick={onClose} />
        <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl z-10">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Verification Required</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            To prevent misuse and protect healthcare supply integrity, collectors must verify their Government NID or Clinic License before posting public requests.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                openVerifyModal('Please verify your credentials to post urgent medicine requests.');
              }}
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition cursor-pointer"
            >
              Verify Account Now
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Field validation
  const isFormValid =
    medicineName.trim().length > 0 &&
    strength.trim().length > 0 &&
    quantityNeeded.trim().length > 0 &&
    location.trim().length > 0 &&
    phone.trim().length >= 8 &&
    reasonOrPrescription.trim().length > 0 &&
    declaration;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isFormValid) return;

    await addMedicineRequest({
      medicineName: medicineName.trim(),
      genericName: genericName.trim() || undefined,
      category,
      strength: strength.trim(),
      quantityNeeded: quantityNeeded.trim(),
      urgency,
      location: location.trim(),
      requesterPhone: phone.trim(),
      reasonOrPrescription: reasonOrPrescription.trim(),
    });

    onClose();
    onSuccess?.(`Urgent request for ${medicineName.trim()} has been posted to the board!`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white px-6 py-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center border border-teal-400/30 text-teal-200">
              <Pill className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h2 id="request-modal-title" className="text-lg sm:text-xl font-bold tracking-tight">
                Post Urgent Medicine Request
              </h2>
              <p className="text-xs text-teal-100/90 mt-0.5">
                Broadcast critical medication shortages for verified donor fulfillment
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

        {/* Requester Identity Banner */}
        <div className="bg-teal-50/80 border-b border-teal-100 px-6 py-2.5 flex items-center justify-between text-xs text-teal-950">
          <div className="flex items-center gap-2">
            {currentUser.role === 'clinic_charity' ? (
              <Building2 className="w-4 h-4 text-teal-700" />
            ) : (
              <User className="w-4 h-4 text-teal-700" />
            )}
            <span>
              Requesting as:{' '}
              <strong className="font-semibold text-teal-900">{currentUser.name}</strong>
            </span>
          </div>
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 uppercase">
            {currentUser.role === 'clinic_charity' ? 'Rural Clinic' : currentUser.role === 'admin' ? 'Administrator' : 'Individual Recipient'}
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Row 1: Medicine Name & Strength */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2 relative">
              <label
                htmlFor="req-med-name"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
              >
                Medicine Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="req-med-name"
                  type="text"
                  required
                  autoComplete="off"
                  value={medicineName}
                  onChange={(e) => handleMedicineNameChange(e.target.value)}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowDropdown(true);
                  }}
                  placeholder="e.g. Insulin Mixtard 30/70, Azithromycin, Napa"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
                />
              </div>

              {/* Autocomplete Dropdown */}
              {showDropdown && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden divide-y divide-slate-100 animate-in fade-in">
                  <div className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 flex items-center justify-between">
                    <span>Smart Drug Dictionary Suggestions</span>
                    <button
                      type="button"
                      onClick={() => setShowDropdown(false)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      ✕
                    </button>
                  </div>
                  {suggestions.map((s) => (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-teal-50/80 transition flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{s.name}</span>
                          <span className="text-[10px] font-normal text-slate-500">
                            ({s.genericName})
                          </span>
                        </div>
                        <div className="text-[10px] text-teal-700 font-medium">
                          {s.category} • Strengths: {s.commonStrengths.join(', ')}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 uppercase">
                        {s.type}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="req-strength"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
              >
                Strength <span className="text-rose-500">*</span>
              </label>
              <input
                id="req-strength"
                type="text"
                required
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                placeholder="e.g. 500mg, 100 IU/ml"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
              />
              {/* Quick-Click Strength Pills */}
              {commonStrengths.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-500 font-semibold">Quick:</span>
                  {commonStrengths.map((str) => (
                    <button
                      key={str}
                      type="button"
                      onClick={() => setStrength(str)}
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-md border transition cursor-pointer ${
                        strength === str
                          ? 'bg-teal-700 text-white border-teal-700 font-bold'
                          : 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'
                      }`}
                    >
                      {str}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Generic Drug Name & Therapeutic Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="req-generic"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
              >
                Generic Drug Name <span className="text-slate-400 font-normal lowercase">(auto-resolved)</span>
              </label>
              <input
                id="req-generic"
                type="text"
                value={genericName}
                onChange={(e) => setGenericName(e.target.value)}
                placeholder="e.g. Biphasic Isophane Insulin, Azithromycin Dihydrate"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
              />
            </div>

            <div>
              <label
                htmlFor="req-category"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
              >
                Therapeutic Category <span className="text-rose-500">*</span>
              </label>
              <select
                id="req-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as MedicineCategory)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition bg-white"
              >
                {MEDICINE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Equivalent Brands Helper Note */}
          {equivalentBrands.length > 0 && (
            <div className="bg-teal-50/80 border border-teal-200 rounded-2xl p-3 text-xs text-teal-900 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold text-teal-950">Generic Equivalence: </span>
                <span>
                  Accepts equivalent brands sharing active chemical (<em>{genericName}</em>):{' '}
                  <strong>{equivalentBrands.slice(0, 5).join(', ')}</strong>.
                </span>
              </div>
            </div>
          )}

          {/* Row 2: Quantity Needed & Urgency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="req-quantity"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
              >
                Quantity Needed <span className="text-rose-500">*</span>
              </label>
              <input
                id="req-quantity"
                type="text"
                required
                value={quantityNeeded}
                onChange={(e) => setQuantityNeeded(e.target.value)}
                placeholder="e.g. 4 strips (24 tablets) or 3 vials"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
              />
            </div>

            <div>
              <label
                htmlFor="req-urgency"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
              >
                Urgency Level <span className="text-rose-500">*</span>
              </label>
              <select
                id="req-urgency"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as RequestUrgency)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition bg-white"
              >
                <option value="critical">🚨 Critical - Needed within 48h</option>
                <option value="high">⚠️ High - Needed this week</option>
                <option value="routine">📋 Routine - Clinic Stock Refill</option>
              </select>
            </div>
          </div>

          {/* Location & Contact Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="req-loc"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
              >
                Delivery / Pickup Area <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  id="req-loc"
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Jaleswaritola, Bogura"
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="req-phone"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
              >
                Direct Contact Phone <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="req-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +880 1712-000000"
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition font-mono"
                />
              </div>
            </div>
          </div>

          {/* Clinical Reason or Prescription Reference */}
          <div>
            <label
              htmlFor="req-reason"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
            >
              Clinical Reason / Prescription Reference <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <textarea
                id="req-reason"
                required
                rows={3}
                value={reasonOrPrescription}
                onChange={(e) => setReasonOrPrescription(e.target.value)}
                placeholder={
                  currentUser.role === 'clinic_charity'
                    ? 'e.g. Free rural clinic stockout: 12 patients waiting for urgent antibiotic replenishment.'
                    : 'e.g. Dr. A. Rahman Rx #PB-2841 - Advised for 14-day post-surgery recovery course.'
                }
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
              />
            </div>
          </div>

          {/* Safety & Authenticity Declaration */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2">
            <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={declaration}
                onChange={(e) => setDeclaration(e.target.checked)}
                className="mt-0.5 rounded border-amber-400 text-teal-600 focus:ring-teal-500 cursor-pointer h-4 w-4"
              />
              <span className="leading-relaxed">
                I declare that this medicine request represents a genuine clinical shortage or medical necessity, and I will physically inspect the sealed packaging and expiry date upon collection.
              </span>
            </label>
            {!declaration && touched && (
              <p className="text-[11px] text-rose-600 font-medium pl-6">
                * Please check the declaration to broadcast this request.
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
              disabled={!isFormValid || actionLoading === 'requesting'}
              className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-2 ${
                isFormValid && actionLoading !== 'requesting'
                  ? 'bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white shadow-md hover:shadow cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
              }`}
            >
              {actionLoading === 'requesting' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{actionLoading === 'requesting' ? 'Posting Request...' : 'Broadcast Urgent Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
