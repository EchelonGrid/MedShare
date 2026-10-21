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
import {
  Search,
  MapPin,
  Filter,
  RotateCcw,
  PackageOpen,
  AlertCircle,
  Clock,
  Sparkles,
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
      {/* Search & Location Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          
          {/* Instant Search Input */}
          <div className="md:col-span-7 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by medicine name or strength (e.g. Amoxicillin, 500mg)..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition bg-slate-50/50 hover:bg-white focus:bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Location Dropdown */}
          <div className="md:col-span-5 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <MapPin className="w-4 h-4" />
            </div>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition bg-slate-50/50 hover:bg-white focus:bg-white cursor-pointer truncate"
            >
              <option value="All Locations">All Locations ({medications.length} total listings)</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Quick Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            
            {/* Available Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('available')}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'available'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Available</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'available' ? 'bg-teal-800 text-teal-100' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tabCounts.available}
              </span>
            </button>

            {/* Expiring Soon Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('expiring_soon')}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'expiring_soon'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Expiring Soon (≤ 60d)</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'expiring_soon' ? 'bg-amber-700 text-amber-100' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tabCounts.expiring_soon}
              </span>
            </button>

            {/* Urgent Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('urgent')}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'urgent'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Urgent (≤ 30d)</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'urgent' ? 'bg-rose-700 text-rose-100' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tabCounts.urgent}
              </span>
            </button>

            {/* Claimed & Collected Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('claimed_collected')}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'claimed_collected'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Claimed &amp; Collected</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'claimed_collected' ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tabCounts.claimed_collected}
              </span>
            </button>

            {/* Expired Tab (if any uncollected medications reached expiry) */}
            {tabCounts.expired > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('expired')}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'expired'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
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
              className="text-xs font-medium text-slate-500 hover:text-teal-700 inline-flex items-center gap-1 py-1 cursor-pointer transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Therapeutic Category Filter Pills */}
        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Filter by Therapeutic Category</span>
            {selectedCategory !== 'All Categories' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('All Categories')}
                className="text-[10px] text-teal-700 hover:underline cursor-pointer lowercase"
              >
                clear category
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
            <button
              type="button"
              onClick={() => setSelectedCategory('All Categories')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                selectedCategory === 'All Categories'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>All Categories</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  selectedCategory === 'All Categories' ? 'bg-teal-800 text-teal-100' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {categoryCounts['All Categories'] || 0}
              </span>
            </button>
            {MEDICINE_CATEGORIES.map((cat) => {
              const count = categoryCounts[cat] || 0;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-medium shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-teal-700 text-white font-bold shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-teal-800 text-teal-100' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* First-to-Expire Sort Note */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-teal-600" />
            <span>
              Sorted by <strong className="text-slate-700 font-semibold">Earliest Expiration Date (FEFO)</strong> to maximize community rescue.
            </span>
          </div>
          <span className="font-medium text-slate-600 hidden sm:inline">
            Showing {filteredMedications.length} {filteredMedications.length === 1 ? 'result' : 'results'}
          </span>
        </div>

      </div>

      {/* Equivalent Brand Search Notice Banner */}
      {searchQuery.trim() !== '' && dictionaryMatch && (
        <div className="bg-gradient-to-r from-teal-50 via-teal-50/80 to-emerald-50 border border-teal-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-teal-950 shadow-xs animate-in fade-in">
          <div className="w-8 h-8 rounded-xl bg-teal-600/10 border border-teal-600/20 flex items-center justify-center text-teal-700 shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-teal-700" />
          </div>
          <div className="space-y-1">
            <div className="font-bold text-teal-950 text-sm">
              Showing exact &amp; generic equivalents for &quot;{searchQuery}&quot;
            </div>
            <p className="text-teal-800 leading-relaxed">
              Generic: <strong className="text-teal-900 underline decoration-teal-400 font-bold">{dictionaryMatch.genericName}</strong>
              {' — includes equivalent brands: '}
              <span className="font-semibold text-slate-900">{dictionaryMatch.allEquivalentBrands.slice(0, 6).join(', ')}</span>
            </p>
          </div>
        </div>
      )}

      {/* Medication Cards Grid */}
      {filteredMedications.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredMedications.map((medication) => (
            <MedicationCard
              key={medication.id}
              medication={medication}
              onClaimClick={onClaimClick}
              searchedTerm={searchQuery.trim() || undefined}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shadow-inner">
            <PackageOpen className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="text-base font-bold text-slate-900">
              No medications match your filter
            </h4>
            <p className="text-xs sm:text-sm text-slate-500">
              {searchQuery
                ? `No medicines matching "${searchQuery}" found in this view.`
                : 'There are no listings matching the selected location or urgency tab.'}
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition shadow-sm cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset All Filters</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
