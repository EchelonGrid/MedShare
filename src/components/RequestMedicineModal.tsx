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
import { motion } from 'framer-motion';
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
  Radio,
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
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full max-w-md bg-slate-900 border border-teal-500/30 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl text-white font-mono"
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="font-display text-lg font-bold text-white">Sign In to Post Urgent Request</h3>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Only verified clinics, charities, and individual patients can broadcast urgent medicine shortages for donor fulfillment.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                openAuthModal('login', 'Please sign in to post an urgent medicine request.');
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 text-xs font-bold transition cursor-pointer"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!currentUser.isVerified) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full max-w-md bg-slate-900 border border-amber-500/35 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl text-white font-mono"
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="font-display text-lg font-bold text-white">Verification Required</h3>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            To prevent misuse, collectors must verify their Government NID or Clinic License before broadcasting public shortage dispatches.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                openVerifyModal('Please verify your credentials to post urgent medicine requests.');
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 text-xs font-bold transition cursor-pointer"
            >
              Verify Account Now
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

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
    onSuccess?.(`Urgent request for ${medicineName} broadcasted to all community donors.`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-slate-900/95 text-white rounded-3xl border border-teal-500/30 shadow-2xl z-10 my-6"
      >
        {/* Specular Top Rim */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-teal-400/40 to-transparent rounded-t-3xl" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-teal-500/20 flex items-start justify-between sticky top-0 bg-slate-900/90 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300">
              <Radio className="w-5 h-5 text-rose-400 animate-pulse" />
            </div>
            <div>
              <h2 id="request-modal-title" className="font-display text-lg sm:text-xl font-bold tracking-tight text-white">
                Broadcast Urgent Medicine Shortage
              </h2>
              <p className="text-xs text-rose-300/80 font-mono mt-0.5">
                Direct Dispatch Request • Community Donor Match
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 font-mono text-xs">
          
          {/* Medicine Name with Autocomplete */}
          <div className="relative space-y-1">
            <label className="block text-slate-300 font-bold uppercase">
              Medicine Brand Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={medicineName}
              onChange={(e) => handleMedicineNameChange(e.target.value)}
              placeholder="e.g. Insulin Glargine, Napa Extend, Seclo..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-teal-500/30 text-white placeholder-slate-500 focus:border-teal-400 outline-none"
            />

            {showDropdown && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-slate-950 border border-teal-500/40 rounded-xl shadow-2xl overflow-hidden divide-y divide-teal-500/15">
                {suggestions.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => handleSelectSuggestion(s)}
                    className="w-full text-left p-3 hover:bg-teal-950/70 transition flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-white">{s.name}</span>
                      <span className="text-teal-300/80 ml-2">({s.genericName})</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-teal-400 border border-teal-500/30">
                      {s.category}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Strengths */}
          {commonStrengths.length > 0 && (
            <div className="space-y-1 pt-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                Quick Select Strength:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {commonStrengths.map((str) => (
                  <button
                    key={str}
                    type="button"
                    onClick={() => setStrength(str)}
                    className={`px-2.5 py-1 text-[11px] rounded-lg border transition cursor-pointer ${
                      strength === str
                        ? 'bg-rose-500 text-white border-rose-400 font-bold'
                        : 'bg-slate-950 text-teal-300 border-teal-500/30'
                    }`}
                  >
                    {str}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Generic Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-300 font-bold uppercase mb-1">
                Generic Drug Name
              </label>
              <input
                type="text"
                value={genericName}
                onChange={(e) => setGenericName(e.target.value)}
                placeholder="e.g. Paracetamol"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-teal-500/30 text-white focus:border-teal-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold uppercase mb-1">
                Therapeutic Category <span className="text-rose-400">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MedicineCategory)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-teal-500/30 text-white focus:border-teal-400 outline-none cursor-pointer"
              >
                {MEDICINE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Strength, Quantity Needed & Urgency Level */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-slate-300 font-bold uppercase mb-1">
                Strength <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                placeholder="e.g. 500mg, 100IU"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-teal-500/30 text-white focus:border-teal-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold uppercase mb-1">
                Quantity Needed <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={quantityNeeded}
                onChange={(e) => setQuantityNeeded(e.target.value)}
                placeholder="e.g. 30 tablets, 2 vials"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-teal-500/30 text-white focus:border-teal-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold uppercase mb-1">
                Urgency Level <span className="text-rose-400">*</span>
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as RequestUrgency)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-teal-500/30 text-white focus:border-teal-400 outline-none cursor-pointer"
              >
                <option value="critical">🚨 Critical (Within 48h)</option>
                <option value="high">🟠 High Priority (This week)</option>
                <option value="routine">🔵 Routine Stock Refill</option>
              </select>
            </div>
          </div>

          {/* Location & Contact Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-300 font-bold uppercase mb-1">
                Requester Location <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Bogura SZMCH Area"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-teal-500/30 text-white focus:border-teal-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold uppercase mb-1">
                Contact Phone <span className="text-rose-400">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+880 1711-234567"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-teal-500/30 text-white focus:border-teal-400 outline-none"
              />
            </div>
          </div>

          {/* Clinical Reason or Rx Note */}
          <div className="space-y-1">
            <label className="block text-slate-300 font-bold uppercase">
              Clinical Need / Rx Reference <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={reasonOrPrescription}
              onChange={(e) => setReasonOrPrescription(e.target.value)}
              placeholder="e.g. Critical stockout for ICU patient with BMDC verified Rx; or rural clinic supply exhaustion."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-teal-500/30 text-white focus:border-teal-400 outline-none font-sans text-xs"
            />
          </div>

          {/* Declaration */}
          <label className="flex items-start gap-2.5 pt-1 text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={declaration}
              onChange={(e) => setDeclaration(e.target.checked)}
              className="mt-0.5 rounded border-teal-500 text-teal-500 focus:ring-0 cursor-pointer h-4 w-4"
            />
            <span className="leading-snug font-sans">
              I certify this is an authentic medical necessity and all accepted donations will be inspected in person.
            </span>
          </label>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-teal-500/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid || actionLoading === 'adding_request'}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 via-rose-600 to-amber-600 text-white font-bold transition cursor-pointer hover:opacity-90 disabled:opacity-50 flex items-center gap-2 shadow-md"
            >
              <Radio className="w-4 h-4" />
              <span>{actionLoading === 'adding_request' ? 'Broadcasting...' : 'Broadcast Shortage Dispatch'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
