'use client';

import React, { useState, useMemo } from 'react';
import { Medication, MedicineCategory } from '@/types/medshare';
import { useMedShare } from '@/context/MedShareContext';
import { getDaysUntilExpiry } from '@/lib/seed';
import { useIsMounted } from '@/lib/useIsMounted';
import {
  MEDICINE_CATEGORIES,
  lookupMedicineByBrandOrName,
  inferCategory,
} from '@/lib/medicine-dictionary';
import MedicationCard from '@/components/MedicationCard';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MapPin,
  Filter,
  RotateCcw,
  PackageOpen,
  AlertCircle,
  Clock,
  Sparkles,
  Command,
} from 'lucide-react';

export type FilterTab = 'available' | 'expiring_soon' | 'urgent' | 'claimed_collected' | 'expired';

interface MedicationFeedProps {
  onClaimClick?: (medication: Medication) => void;
  activeTab?: FilterTab;
  onTabChange?: (tab: FilterTab) => void;
}

export default function MedicationFeed({
  onClaimClick,
  activeTab: controlledTab,
  onTabChange,
}: MedicationFeedProps) {
  const { medications } = useMedShare();
  const mounted = useIsMounted();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [selectedCategory, setSelectedCategory] = useState<MedicineCategory | 'All Categories'>('All Categories');
  const [internalTab, setInternalTab] = useState<FilterTab>('available');

  const activeTab = controlledTab !== undefined ? controlledTab : internalTab;
  const setActiveTab = (tab: FilterTab) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  // Smart dictionary lookup for equivalent brand searching
  const dictionaryMatch = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length < 2) return null;
    return lookupMedicineByBrandOrName(searchQuery.trim());
  }, [searchQuery]);

  // Dynamic list of unique locations
  const locations = useMemo(() => {
    const set = new Set<string>();
    medications.forEach((m) => {
      if (m.location) set.add(m.location);
    });
    return Array.from(set).sort();
  }, [medications]);

  // Tab counts for badge display
  const tabCounts = useMemo(() => {
    let avail = 0;
    let soon = 0;
    let urg = 0;
    let claimedOrDone = 0;
    let exp = 0;

    medications.forEach((m) => {
      if (m.status === 'claimed' || m.status === 'collected') {
        claimedOrDone += 1;
        return;
      }

      if (m.status === 'available') {
        const days = mounted ? getDaysUntilExpiry(m.expiryDate) : 999;
        if (days > 0) {
          avail += 1;
          if (days <= 60) soon += 1;
          if (days <= 30) urg += 1;
        } else {
          exp += 1;
        }
      }
    });

    return {
      available: avail,
      expiring_soon: soon,
      urgent: urg,
      claimed_collected: claimedOrDone,
      expired: exp,
    };
  }, [medications, mounted]);

  // Category counts based on current tab view
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'All Categories': 0 };
    MEDICINE_CATEGORIES.forEach((cat) => {
      counts[cat] = 0;
    });

    medications.forEach((m) => {
      const days = mounted ? getDaysUntilExpiry(m.expiryDate) : 999;
      if (activeTab === 'available' && (m.status !== 'available' || days <= 0)) return;
      if (activeTab === 'expiring_soon' && (m.status !== 'available' || days <= 0 || days > 60)) return;
      if (activeTab === 'urgent' && (m.status !== 'available' || days <= 0 || days > 30)) return;
      if (activeTab === 'claimed_collected' && m.status !== 'claimed' && m.status !== 'collected') return;
      if (activeTab === 'expired' && (m.status !== 'available' || days > 0)) return;

      counts['All Categories'] += 1;
      const cat = m.category || inferCategory(m.medicineName, m.genericName);
      if (counts[cat] !== undefined) {
        counts[cat] += 1;
      } else {
        counts['Other'] = (counts['Other'] || 0) + 1;
      }
    });

    return counts;
  }, [medications, activeTab, mounted]);

  // Filtered & sorted medications
  const filteredMedications = useMemo(() => {
    return medications
      .filter((med) => {
        const daysRemaining = mounted ? getDaysUntilExpiry(med.expiryDate) : 999;

        // 1. Tab lifecycle & urgency filter
        if (activeTab === 'available') {
          if (med.status !== 'available' || daysRemaining <= 0) return false;
        } else if (activeTab === 'expiring_soon') {
          if (med.status !== 'available' || daysRemaining <= 0 || daysRemaining > 60) return false;
        } else if (activeTab === 'urgent') {
          if (med.status !== 'available' || daysRemaining <= 0 || daysRemaining > 30) return false;
        } else if (activeTab === 'claimed_collected') {
          if (med.status !== 'claimed' && med.status !== 'collected') return false;
        } else if (activeTab === 'expired') {
          if (med.status !== 'available' || daysRemaining > 0) return false;
        }

        // 2. Location filter
        if (selectedLocation !== 'All Locations' && med.location !== selectedLocation) {
          return false;
        }

        // 3. Category filter
        if (selectedCategory !== 'All Categories') {
          const itemCategory = med.category || inferCategory(med.medicineName, med.genericName);
          if (itemCategory !== selectedCategory) {
            return false;
          }
        }

        // 4. Search query filter (matches medicineName, strength, genericName, or equivalent brands)
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase().trim();
          const qCompact = q.replace(/\s+/g, '');
          const medName = med.medicineName.toLowerCase();
          const medGeneric = (med.genericName || '').toLowerCase();
          const medStrength = med.strength.toLowerCase();
          const medStrengthCompact = medStrength.replace(/\s+/g, '');

          const matchesName = medName.includes(q);
          const matchesStrength = medStrength.includes(q) || medStrengthCompact.includes(qCompact);
          const matchesGeneric = medGeneric.includes(q);

          let matchesEquivalent = false;
          if (dictionaryMatch) {
            const genericLower = dictionaryMatch.genericName.toLowerCase();
            if (medGeneric && (medGeneric.includes(genericLower) || genericLower.includes(medGeneric))) {
              matchesEquivalent = true;
            }
            if (dictionaryMatch.allEquivalentBrands.some((brand) => medName.includes(brand.toLowerCase()))) {
              matchesEquivalent = true;
            }
          }

          if (!matchesName && !matchesStrength && !matchesGeneric && !matchesEquivalent) {
            return false;
          }
        }

        return true;
      })
      // 5. First-to-Expire, First-Out (FEFO) sorting
      .sort((a, b) => {
        const timeA = new Date(a.expiryDate).getTime();
        const timeB = new Date(b.expiryDate).getTime();
        if (timeA !== timeB) {
          return timeA - timeB;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [medications, activeTab, selectedLocation, selectedCategory, searchQuery, dictionaryMatch, mounted]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedLocation('All Locations');
    setSelectedCategory('All Categories');
    setActiveTab('available');
  };

  const isFiltered =
    searchQuery.trim() !== '' ||
    selectedLocation !== 'All Locations' ||
    selectedCategory !== 'All Categories' ||
    activeTab !== 'available';

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* ELEVATED FROSTED GLASS FILTER COMMAND DECK                */}
      {/* ========================================================= */}
      <div className="bg-slate-950/85 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 border border-teal-500/25 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] space-y-5">
        
        {/* Search Bar & Location Selector Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          
          {/* Instant Search Input with Glowing Focus Ring & ⌘K badge */}
          <div className="md:col-span-7 relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-teal-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by medicine name, generic drug, or strength (e.g. Napa, Paracetamol, 500mg)..."
              className="w-full pl-10 pr-24 py-2.5 text-xs sm:text-sm rounded-xl border border-teal-500/25 bg-slate-900/90 text-white placeholder-slate-400 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/30 transition shadow-inner font-sans"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5 pointer-events-none">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="pointer-events-auto text-xs text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800 transition"
                >
                  Clear
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold text-teal-300/80 bg-slate-900/90 border border-teal-500/30 rounded-md shadow-xs">
                  <Command className="w-2.5 h-2.5" />
                  <span>K / SEARCH</span>
                </kbd>
              )}
            </div>
          </div>

          {/* Location Dropdown */}
          <div className="md:col-span-5 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-teal-400">
              <MapPin className="w-4 h-4" />
            </div>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 text-xs sm:text-sm rounded-xl border border-teal-500/25 bg-slate-900/90 text-white focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/30 transition shadow-inner cursor-pointer truncate font-mono"
            >
              <option value="All Locations" className="bg-slate-900 text-white">
                All Locations ({medications.length} total listings)
              </option>
              {locations.map((loc) => (
                <option key={loc} value={loc} className="bg-slate-900 text-white">
                  {loc}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* ========================================================= */}
        {/* SPRING-PHYSICS SLIDING FILTER TABS                        */}
        {/* ========================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-teal-500/15">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            
            {/* Available Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('available')}
              className={`relative px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition duration-200 flex items-center gap-2 cursor-pointer ${
                activeTab === 'available'
                  ? 'text-slate-950 font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              {activeTab === 'available' && (
                <motion.div
                  layoutId="activeUrgencyFilter"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-400 shadow-[0_0_15px_rgba(20,184,166,0.35),inset_0_1px_0_rgba(255,255,255,0.45)]"
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <span>Available</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === 'available'
                      ? 'bg-slate-950/20 text-slate-950'
                      : 'bg-slate-800 text-teal-300'
                  }`}
                >
                  {tabCounts.available}
                </span>
              </span>
            </button>

            {/* Expiring Soon Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('expiring_soon')}
              className={`relative px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition duration-200 flex items-center gap-2 cursor-pointer ${
                activeTab === 'expiring_soon'
                  ? 'text-slate-950 font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              {activeTab === 'expiring_soon' && (
                <motion.div
                  layoutId="activeUrgencyFilter"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 shadow-[0_0_15px_rgba(245,158,11,0.35),inset_0_1px_0_rgba(255,255,255,0.45)]"
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Expiring Soon (≤ 60d)</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === 'expiring_soon'
                      ? 'bg-slate-950/20 text-slate-950'
                      : 'bg-amber-950/70 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {tabCounts.expiring_soon}
                </span>
              </span>
            </button>

            {/* Urgent Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('urgent')}
              className={`relative px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition duration-200 flex items-center gap-2 cursor-pointer ${
                activeTab === 'urgent'
                  ? 'text-white font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              {activeTab === 'urgent' && (
                <motion.div
                  layoutId="activeUrgencyFilter"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-rose-500 to-rose-700 shadow-[0_0_15px_rgba(244,63,94,0.35),inset_0_1px_0_rgba(255,255,255,0.45)]"
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Urgent (≤ 30d)</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === 'urgent'
                      ? 'bg-black/30 text-white'
                      : 'bg-rose-950/70 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {tabCounts.urgent}
                </span>
              </span>
            </button>

            {/* Claimed & Collected Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('claimed_collected')}
              className={`relative px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition duration-200 flex items-center gap-2 cursor-pointer ${
                activeTab === 'claimed_collected'
                  ? 'text-slate-950 font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              {activeTab === 'claimed_collected' && (
                <motion.div
                  layoutId="activeUrgencyFilter"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-400 to-teal-400 shadow-[0_0_15px_rgba(6,182,212,0.35),inset_0_1px_0_rgba(255,255,255,0.45)]"
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <span>Claimed &amp; Collected</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === 'claimed_collected'
                      ? 'bg-slate-950/20 text-slate-950'
                      : 'bg-slate-800 text-sky-300'
                  }`}
                >
                  {tabCounts.claimed_collected}
                </span>
              </span>
            </button>

            {/* Expired Tab */}
            {tabCounts.expired > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('expired')}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition duration-200 flex items-center gap-2 cursor-pointer ${
                  activeTab === 'expired'
                    ? 'text-white bg-slate-800 font-black'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <span>Expired ({tabCounts.expired})</span>
              </button>
            )}

          </div>

          {/* Reset Filters shortcut if active */}
          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-mono font-medium text-teal-400 hover:text-teal-300 inline-flex items-center gap-1 py-1 cursor-pointer transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* ========================================================= */}
        {/* THERAPEUTIC CATEGORY FILTER PILLS WITH GLIDING INDICATOR   */}
        {/* ========================================================= */}
        <div className="pt-2 border-t border-teal-500/15 space-y-2">
          <div className="text-[11px] font-mono font-bold text-teal-300/80 uppercase tracking-wider flex items-center justify-between">
            <span>Filter by Therapeutic Category</span>
            {selectedCategory !== 'All Categories' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('All Categories')}
                className="text-[10px] font-mono text-teal-400 hover:underline cursor-pointer lowercase"
              >
                clear category
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
            {/* All Categories Pill */}
            <button
              type="button"
              onClick={() => setSelectedCategory('All Categories')}
              className={`relative px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                selectedCategory === 'All Categories'
                  ? 'text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white bg-slate-900/80'
              }`}
            >
              {selectedCategory === 'All Categories' && (
                <motion.div
                  layoutId="activeCategoryFilter"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 shadow-[0_0_12px_rgba(20,184,166,0.3)]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <span>All Categories</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    selectedCategory === 'All Categories'
                      ? 'bg-slate-950/20 text-slate-950'
                      : 'bg-slate-800 text-teal-300'
                  }`}
                >
                  {categoryCounts['All Categories'] || 0}
                </span>
              </span>
            </button>

            {/* Individual Categories */}
            {MEDICINE_CATEGORIES.map((cat) => {
              const count = categoryCounts[cat] || 0;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`relative px-3 py-1 rounded-xl text-xs font-medium shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white bg-slate-900/80'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="activeCategoryFilter"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 shadow-[0_0_12px_rgba(20,184,166,0.3)]"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <span>{cat}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected
                          ? 'bg-slate-950/20 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* First-to-Expire Sort Notice Bar */}
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-1 border-t border-teal-500/10">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-teal-400" />
            <span>
              Sorted by <strong className="text-teal-300 font-semibold">Earliest Expiration Date (FEFO)</strong> to maximize rescue.
            </span>
          </div>
          <span className="font-mono text-teal-300/80 hidden sm:inline">
            Showing {filteredMedications.length} {filteredMedications.length === 1 ? 'batch' : 'batches'}
          </span>
        </div>

      </div>

      {/* ========================================================= */}
      {/* EQUIVALENT BRAND SEARCH BANNER                            */}
      {/* ========================================================= */}
      {searchQuery.trim() !== '' && dictionaryMatch && (
        <div className="bg-gradient-to-r from-teal-950/90 via-slate-900 to-emerald-950/90 border border-teal-400/40 rounded-2xl p-4 flex items-start gap-3 text-xs text-teal-200 shadow-xl backdrop-blur-xl animate-in fade-in">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-teal-300" />
          </div>
          <div className="space-y-1 font-mono">
            <div className="font-bold text-white text-sm">
              Showing exact &amp; generic equivalents for &quot;{searchQuery}&quot;
            </div>
            <p className="text-teal-200/90 leading-relaxed">
              Generic: <strong className="text-teal-300 underline decoration-teal-400 font-bold">{dictionaryMatch.genericName}</strong>
              {' — includes equivalent brands: '}
              <span className="text-white font-semibold">{dictionaryMatch.allEquivalentBrands.slice(0, 6).join(', ')}</span>
            </p>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3D STAGGERED MEDICATION CARDS GRID                        */}
      {/* ========================================================= */}
      {filteredMedications.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredMedications.map((medication) => (
            <motion.div
              key={medication.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="h-full"
            >
              <MedicationCard
                medication={medication}
                onClaimClick={onClaimClick}
                searchedTerm={searchQuery.trim() || undefined}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-slate-950/80 rounded-3xl border border-dashed border-teal-500/30 p-12 text-center space-y-4 backdrop-blur-xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-500/10 border border-teal-400/30 flex items-center justify-center text-teal-300 shadow-inner">
            <PackageOpen className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="font-display text-base font-bold text-white">
              No medications match your filter
            </h4>
            <p className="text-xs sm:text-sm text-slate-400 font-sans">
              {searchQuery
                ? `No medicines matching "${searchQuery}" found in this view.`
                : 'There are no listings matching the selected location or urgency tab.'}
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 transition shadow-md cursor-pointer hover:from-teal-300 hover:to-emerald-400"
            >
              <RotateCcw className="w-4 h-4 text-slate-950" />
              <span>Reset All Filters</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
