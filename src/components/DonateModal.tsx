'use client';

import React, { useState, useEffect } from 'react';
import { MedicineRequest, MedicineCategory } from '@/types/medshare';
import { useMedShare } from '@/context/MedShareContext';
import { getDaysUntilExpiry, getUrgencyLevel, parseQuantity } from '@/lib/seed';
import { useIsMounted } from '@/lib/useIsMounted';
import {
  MEDICINE_CATEGORIES,
  lookupMedicineByBrandOrName,
  getAutocompleteSuggestions,
  AutocompleteSuggestion,
} from '@/lib/medicine-dictionary';
import { motion, AnimatePresence } from 'framer-motion';
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
  Check,
  Shield,
  Layers,
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
  const [category, setCategory] = useState<MedicineCategory>('Pain & Fever');
  const [strength, setStrength] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [location, setLocation] = useState(currentUser?.location || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');

  // Smart suggestions & dictionary state
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [commonStrengths, setCommonStrengths] = useState<string[]>([]);
  const [equivalentBrands, setEquivalentBrands] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // 3 Mandatory Safety Cards
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
        setCategory(prefillRequest.category || 'Pain & Fever');
        setStrength(prefillRequest.strength);
        setQuantity(prefillRequest.quantityNeeded);
        setLocation(prefillRequest.location);

        const match = lookupMedicineByBrandOrName(prefillRequest.medicineName);
        if (match) {
          setCommonStrengths(match.commonStrengths);
          setEquivalentBrands(match.allEquivalentBrands.filter((b) => b.toLowerCase() !== prefillRequest.medicineName.toLowerCase()));
        }
      } else {
        setMedicineName('');
        setGenericName('');
        setCategory('Pain & Fever');
        setStrength('');
        setQuantity('');
        setLocation(currentUser?.location || '');
        setCommonStrengths([]);
        setEquivalentBrands([]);
      }
      setPhone(currentUser?.phone || '');
      setExpiryDate('');
      setSafety1(false);
      setSafety2(false);
      setSafety3(false);
      setTouched(false);
      setShowDropdown(false);
    }
  }, [isOpen, prefillRequest, currentUser]);

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

  if (!isOpen || !currentUser) return null;

  const minDate = mounted ? (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  })() : undefined;

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

    const { total, unit } = parseQuantity(quantity);

    await addMedication({
      medicineName: medicineName.trim(),
      genericName: genericName.trim() || undefined,
      category,
      strength: strength.trim(),
      quantity: quantity.trim(),
      totalNumericQuantity: total,
      unitName: unit,
      remainingNumericQuantity: total,
      expiryDate,
      location: location.trim(),
      donorPhone: phone.trim(),
    });

    if (prefillRequest) {
      await fulfillMedicineRequest(prefillRequest.id, currentUser.name);
    }

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

        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-teal-500/20 flex items-start justify-between sticky top-0 bg-slate-900/90 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h2 id="donate-modal-title" className="font-display text-lg sm:text-xl font-bold tracking-tight text-white">
                Donate Unused Medicine
              </h2>
              <p className="text-xs text-teal-300/80 font-mono mt-0.5">
                List sealed, unexpired medicines for rural clinics &amp; verified patients
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

        {/* Prefill Request Notice */}
        {prefillRequest && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-teal-950/80 border border-teal-500/35 flex items-center gap-2 text-xs font-mono text-teal-200">
            <Sparkles className="w-4 h-4 text-teal-300 shrink-0" />
            <div>
              Fulfilling urgent request from <strong className="text-white">{prefillRequest.requesterName}</strong> ({prefillRequest.location})
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 font-mono text-xs">
          
          {/* Medicine Name with Autocomplete */}
          <div className="relative space-y-1">
            <label className="block text-slate-300 font-bold uppercase">
              Medicine Brand Name <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={medicineName}
                onChange={(e) => handleMedicineNameChange(e.target.value)}
                placeholder="e.g. Napa Extend, Seclo, Maxpro, Ciprocin..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-teal-500/30 text-white placeholder-slate-500 focus:border-teal-400 outline-none"
              />
            </div>

            {/* Monospace Autocomplete Dropdown */}
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

          {/* Quick Strength Tags */}
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
                    className={`px-2.5 py-1 text-[11px] font-mono rounded-lg border transition cursor-pointer ${
                      strength === str
                        ? 'bg-teal-500 text-slate-950 border-teal-300 font-bold shadow-xs'
                        : 'bg-slate-950 text-teal-300 border-teal-500/30 hover:border-teal-400'
                    }`}
                  >
                    {str}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Generic Name & Category Row */}
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
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-teal-500/30 text-white placeholder-slate-500 focus:border-teal-400 outline-none"
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

          {/* Strength, Quantity & Expiry Date Row */}
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
                placeholder="e.g. 500mg, 665mg"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-teal-500/30 text-white focus:border-teal-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold uppercase mb-1">
                Quantity <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 20 tablets"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-teal-500/30 text-white focus:border-teal-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold uppercase mb-1">
                Expiry Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                min={minDate}
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-teal-500/30 text-white focus:border-teal-400 outline-none"
              />
            </div>
          </div>

          {/* Location & Phone Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-300 font-bold uppercase mb-1">
                Pickup Location <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Bogura SZMCH Annex"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-teal-500/30 text-white focus:border-teal-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold uppercase mb-1">
                Pickup Phone <span className="text-rose-400">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +880 1711-234567"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-teal-500/30 text-white focus:border-teal-400 outline-none"
              />
            </div>
          </div>

          {/* ========================================================= */}
          {/* 3-POINT MANDATORY INTERACTIVE TACTILE SAFETY CARDS        */}
          {/* ========================================================= */}
          <div className="pt-2 space-y-2.5">
            <div className="flex items-center gap-2 text-teal-300 font-bold uppercase tracking-wider text-[11px]">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>3-Point Mandatory Safety Confirmation Gate</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Card 1 */}
              <div
                onClick={() => setSafety1(!safety1)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between select-none ${
                  safety1
                    ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : 'bg-slate-950 border-teal-500/25 text-slate-400 hover:border-teal-500/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center border ${
                      safety1 ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-900 border-slate-700'
                    }`}
                  >
                    {safety1 && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                  <div>
                    <span className="font-bold text-white block">1. Factory Sealed Packaging Intact</span>
                    <span className="text-[10px]">Unopened blister pack / foil seal is 100% intact.</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900">
                  {safety1 ? 'CONFIRMED' : 'CLICK TO CONFIRM'}
                </span>
              </div>

              {/* Card 2 */}
              <div
                onClick={() => setSafety2(!safety2)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between select-none ${
                  safety2
                    ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : 'bg-slate-950 border-teal-500/25 text-slate-400 hover:border-teal-500/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center border ${
                      safety2 ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-900 border-slate-700'
                    }`}
                  >
                    {safety2 && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                  <div>
                    <span className="font-bold text-white block">2. Unexpired &amp; Standard Storage</span>
                    <span className="text-[10px]">Unexpired medication stored at normal room conditions.</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900">
                  {safety2 ? 'CONFIRMED' : 'CLICK TO CONFIRM'}
                </span>
              </div>

              {/* Card 3 */}
              <div
                onClick={() => setSafety3(!safety3)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between select-none ${
                  safety3
                    ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : 'bg-slate-950 border-teal-500/25 text-slate-400 hover:border-teal-500/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center border ${
                      safety3 ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-900 border-slate-700'
                    }`}
                  >
                    {safety3 && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                  <div>
                    <span className="font-bold text-white block">3. Valid Solid Formulation</span>
                    <span className="text-[10px]">NOT opened liquid syrup or unmonitored cold-chain item.</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900">
                  {safety3 ? 'CONFIRMED' : 'CLICK TO CONFIRM'}
                </span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
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
              disabled={!isFormValid || actionLoading === 'adding'}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 font-bold transition cursor-pointer hover:from-teal-300 hover:to-emerald-400 disabled:opacity-50 flex items-center gap-2 shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{actionLoading === 'adding' ? 'Listing...' : 'List Medicine for Rescue'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
