'use client';

import React, { useState, useMemo } from 'react';
import { MedicineRequest, RequestUrgency, MedicineCategory } from '@/types/medshare';
import { useMedShare } from '@/context/MedShareContext';
import {
  MEDICINE_CATEGORIES,
  lookupMedicineByBrandOrName,
  inferCategory,
} from '@/lib/medicine-dictionary';
import TiltSpotlightCard, { GlowColor } from '@/components/ui/TiltSpotlightCard';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MapPin,
  Filter,
  PlusCircle,
  HeartHandshake,
  Building2,
  User,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Phone,
  FileText,
  Radio,
  ArrowRight,
} from 'lucide-react';

export type RequestFilterTab = 'all_open' | 'critical' | 'fulfilled';

interface RequestsBoardProps {
  onPostRequestClick: () => void;
  onFulfillClick: (request: MedicineRequest) => void;
}

function formatTimeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

export default function RequestsBoard({
  onPostRequestClick,
  onFulfillClick,
}: RequestsBoardProps) {
  const { requests } = useMedShare();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [selectedCategory, setSelectedCategory] = useState<MedicineCategory | 'All Categories'>('All Categories');
  const [activeTab, setActiveTab] = useState<RequestFilterTab>('all_open');

  // Smart dictionary lookup for equivalent brand searching
  const dictionaryMatch = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length < 2) return null;
    return lookupMedicineByBrandOrName(searchQuery.trim());
  }, [searchQuery]);

  // Dynamic unique locations
  const locations = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => {
      if (r.location) set.add(r.location);
    });
    return Array.from(set).sort();
  }, [requests]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const openAll = requests.filter((r) => r.status === 'open').length;
    const critical = requests.filter((r) => r.status === 'open' && r.urgency === 'critical').length;
    const fulfilled = requests.filter((r) => r.status === 'fulfilled').length;
    return {
      all_open: openAll,
      critical,
      fulfilled,
    };
  }, [requests]);

  // Category counts based on current active tab
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'All Categories': 0 };
    MEDICINE_CATEGORIES.forEach((cat) => {
      counts[cat] = 0;
    });

    requests.forEach((r) => {
      if (activeTab === 'all_open' && r.status !== 'open') return;
      if (activeTab === 'critical' && (r.status !== 'open' || r.urgency !== 'critical')) return;
      if (activeTab === 'fulfilled' && r.status !== 'fulfilled') return;

      counts['All Categories'] += 1;
      const cat = r.category || inferCategory(r.medicineName, r.genericName);
      if (counts[cat] !== undefined) {
        counts[cat] += 1;
      } else {
        counts['Other'] = (counts['Other'] || 0) + 1;
      }
    });

    return counts;
  }, [requests, activeTab]);

  // Filtered & sorted requests
  const filteredRequests = useMemo(() => {
    const urgencyWeight: Record<RequestUrgency, number> = {
      critical: 3,
      high: 2,
      routine: 1,
    };

    return requests
      .filter((req) => {
        // 1. Tab filter
        if (activeTab === 'all_open' && req.status !== 'open') return false;
        if (activeTab === 'critical' && (req.status !== 'open' || req.urgency !== 'critical')) return false;
        if (activeTab === 'fulfilled' && req.status !== 'fulfilled') return false;

        // 2. Location filter
        if (selectedLocation !== 'All Locations' && req.location !== selectedLocation) {
          return false;
        }

        // 3. Category filter
        if (selectedCategory !== 'All Categories') {
          const itemCategory = req.category || inferCategory(req.medicineName, req.genericName);
          if (itemCategory !== selectedCategory) {
            return false;
          }
        }

        // 4. Search query filter (matches name, generic, strength, requester, or equivalent brands)
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase().trim();
          const reqName = req.medicineName.toLowerCase();
          const reqGeneric = (req.genericName || '').toLowerCase();
          const reqStrength = req.strength.toLowerCase();
          const reqRequester = req.requesterName.toLowerCase();

          const matchesName = reqName.includes(q);
          const matchesStrength = reqStrength.includes(q);
          const matchesGeneric = reqGeneric.includes(q);
          const matchesRequester = reqRequester.includes(q);

          let matchesEquivalent = false;
          if (dictionaryMatch) {
            const genericLower = dictionaryMatch.genericName.toLowerCase();
            if (reqGeneric && (reqGeneric.includes(genericLower) || genericLower.includes(reqGeneric))) {
              matchesEquivalent = true;
            }
            if (dictionaryMatch.allEquivalentBrands.some((brand) => reqName.includes(brand.toLowerCase()))) {
              matchesEquivalent = true;
            }
          }

          if (!matchesName && !matchesStrength && !matchesGeneric && !matchesRequester && !matchesEquivalent) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // Sort open first by urgency
        if (a.status === 'open' && b.status === 'open') {
          const diff = urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
          if (diff !== 0) return diff;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [requests, activeTab, selectedLocation, selectedCategory, searchQuery, dictionaryMatch]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedLocation('All Locations');
    setSelectedCategory('All Categories');
    setActiveTab('all_open');
  };

  const isFiltered =
    searchQuery.trim() !== '' ||
    selectedLocation !== 'All Locations' ||
    selectedCategory !== 'All Categories' ||
    activeTab !== 'all_open';

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* SPATIAL BOARD HEADER: REVERSE DISPATCH MARKETPLACE        */}
      {/* ========================================================= */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-teal-950 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-teal-500/25 shadow-2xl backdrop-blur-2xl">
        <div className="pointer-events-none absolute -top-24 right-0 w-96 h-96 bg-teal-500/10 blur-3xl rounded-full" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-400/30 text-teal-300 text-xs font-mono font-medium shadow-[0_0_12px_rgba(20,184,166,0.2)]">
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              <span>REVERSE MARKETPLACE • DIRECT CLINICAL DISPATCH</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Urgent Medicine Requests Radar
            </h2>
            <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed font-sans">
              Verified rural clinics and lower-income families broadcast critical medicine stockouts here. If you have any of these sealed medications at home, fulfill them in one click.
            </p>
          </div>

          <motion.button
            type="button"
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97, y: 1 }}
            onClick={onPostRequestClick}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-500 text-slate-950 text-xs sm:text-sm font-bold shadow-[0_10px_25px_rgba(20,184,166,0.35),inset_0_1px_0_rgba(255,255,255,0.6)] transition cursor-pointer self-start md:self-auto shrink-0 border border-teal-200/50"
          >
            <PlusCircle className="w-4 h-4 text-slate-950" />
            <span>Post Urgent Request</span>
          </motion.button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ELEVATED FROSTED GLASS FILTER CONSOLE                     */}
      {/* ========================================================= */}
      <div className="bg-slate-950/85 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 border border-teal-500/25 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] space-y-5">
        
        {/* Row 1: Filter Tabs with Spring Slider */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-500/15 pb-3">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            
            {/* All Open Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('all_open')}
              className={`relative px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition duration-200 flex items-center gap-2 cursor-pointer ${
                activeTab === 'all_open'
                  ? 'text-slate-950 font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              {activeTab === 'all_open' && (
                <motion.div
                  layoutId="activeRequestTab"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-400 shadow-[0_0_15px_rgba(20,184,166,0.35),inset_0_1px_0_rgba(255,255,255,0.45)]"
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <span>All Open Requests</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === 'all_open'
                      ? 'bg-slate-950/20 text-slate-950'
                      : 'bg-slate-800 text-teal-300'
                  }`}
                >
                  {tabCounts.all_open}
                </span>
              </span>
            </button>

            {/* Critical Tab (within 48h) */}
            <button
              type="button"
              onClick={() => setActiveTab('critical')}
              className={`relative px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition duration-200 flex items-center gap-2 cursor-pointer ${
                activeTab === 'critical'
                  ? 'text-white font-black'
                  : 'text-rose-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              {activeTab === 'critical' && (
                <motion.div
                  layoutId="activeRequestTab"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-rose-500 to-rose-700 shadow-[0_0_15px_rgba(244,63,94,0.35),inset_0_1px_0_rgba(255,255,255,0.45)]"
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-80"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span>Critical (Within 48h)</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === 'critical'
                      ? 'bg-black/30 text-white'
                      : 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {tabCounts.critical}
                </span>
              </span>
            </button>

            {/* Fulfilled Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('fulfilled')}
              className={`relative px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition duration-200 flex items-center gap-2 cursor-pointer ${
                activeTab === 'fulfilled'
                  ? 'text-slate-950 font-black'
                  : 'text-emerald-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              {activeTab === 'fulfilled' && (
                <motion.div
                  layoutId="activeRequestTab"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_15px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.45)]"
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Fulfilled</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === 'fulfilled'
                      ? 'bg-slate-950/20 text-slate-950'
                      : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {tabCounts.fulfilled}
                </span>
              </span>
            </button>

          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-teal-300/80">
              Showing <strong className="text-white font-bold">{filteredRequests.length}</strong> dispatches
            </span>
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
        </div>

        {/* Row 2: Search Input & Location Dropdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-teal-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search medicine name, generic drug, strength, or clinic..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-teal-500/25 bg-slate-900/90 text-white placeholder-slate-400 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/30 transition shadow-inner font-sans"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-teal-400">
              <MapPin className="w-4 h-4" />
            </div>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 text-xs sm:text-sm rounded-xl border border-teal-500/25 bg-slate-900/90 text-white focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/30 transition shadow-inner cursor-pointer truncate font-mono"
            >
              <option value="All Locations" className="bg-slate-900 text-white">All Locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc} className="bg-slate-900 text-white">
                  {loc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Therapeutic Category Filter Pills */}
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
                  layoutId="activeRequestCategory"
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
                      layoutId="activeRequestCategory"
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

      </div>

      {/* ========================================================= */}
      {/* EQUIVALENT BRAND SEARCH BANNER                            */}
      {/* ========================================================= */}
      {searchQuery.trim() !== '' && dictionaryMatch && (
        <div className="bg-gradient-to-r from-teal-950/90 via-slate-900 to-emerald-950/90 border border-teal-400/40 rounded-2xl p-4 flex items-start gap-3 text-xs text-teal-200 shadow-xl backdrop-blur-xl animate-in fade-in font-mono">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-teal-300" />
          </div>
          <div className="space-y-1">
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
      {/* 3D URGENT REQUEST RADAR CARDS GRID                        */}
      {/* ========================================================= */}
      {filteredRequests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredRequests.map((req) => {
            const isCritical = req.urgency === 'critical';
            const isHigh = req.urgency === 'high';
            const isFulfilled = req.status === 'fulfilled';
            const displayCategory = req.category || inferCategory(req.medicineName, req.genericName);
            const isGenericMatch = Boolean(
              searchQuery.trim().length > 1 &&
              req.genericName &&
              !req.medicineName.toLowerCase().includes(searchQuery.toLowerCase().trim())
            );

            const glowColor: GlowColor = isCritical ? 'rose' : isHigh ? 'amber' : 'teal';

            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="h-full"
              >
                <TiltSpotlightCard
                  glowColor={glowColor}
                  className="p-5 sm:p-6 bg-slate-900/90 border border-teal-500/25 flex flex-col justify-between"
                >
                  <div className="space-y-3.5">
                    {/* Top Header: Urgency Radar Ping & Relative Time */}
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-teal-500/15">
                      {isFulfilled ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/35">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>FULFILLED</span>
                        </span>
                      ) : isCritical ? (
                        <span className="inline-flex items-center gap-2 text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.25)]">
                          {/* Live Animated Radar Ping */}
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-80"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                          </span>
                          <span>CRITICAL • WITHIN 48H</span>
                        </span>
                      ) : isHigh ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/40">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>HIGH PRIORITY • THIS WEEK</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/35">
                          <Clock className="w-3.5 h-3.5 text-sky-400" />
                          <span>ROUTINE REFILL</span>
                        </span>
                      )}

                      <span className="text-[11px] font-mono text-slate-400">
                        {formatTimeAgo(req.createdAt)}
                      </span>
                    </div>

                    {/* Medicine Identity & Quantity Needed */}
                    <div style={{ transform: 'translateZ(20px)' }}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-display font-extrabold text-white text-lg sm:text-xl tracking-tight leading-snug">
                            {req.medicineName}
                          </h3>
                          {req.genericName && (
                            <p className="text-xs text-teal-300/80 italic mt-0.5 font-sans">
                              ({req.genericName})
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-slate-950 text-teal-300 border border-teal-500/35 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]">
                          {req.strength}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-300 border border-slate-700/60">
                          {displayCategory}
                        </span>
                        <div className="inline-flex items-center gap-1.5 bg-teal-950/70 border border-teal-500/30 rounded-md px-2.5 py-0.5 text-xs font-mono text-teal-200">
                          <span className="text-slate-400">Needed:</span>
                          <strong className="text-white font-extrabold">{req.quantityNeeded}</strong>
                        </div>
                      </div>

                      {/* Generic Match Badge */}
                      {isGenericMatch && req.genericName && (
                        <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-teal-950/70 border border-teal-400/40 text-teal-200 text-xs font-mono flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-teal-300 shrink-0" />
                          <div>
                            <span className="font-bold text-white">⚡ Generic Match for &quot;{searchQuery}&quot;</span>
                            <span className="block text-[11px] text-teal-300">Same Generic: <strong>{req.genericName}</strong></span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Requester Identity & Location */}
                    <div className="bg-slate-950/70 border border-teal-500/20 rounded-2xl p-3.5 space-y-2 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-white truncate">
                          {req.requesterRole === 'clinic_charity' ? (
                            <Building2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          )}
                          <span className="truncate">{req.requesterName}</span>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-500/35 uppercase">
                          {req.requesterRole === 'clinic_charity' ? 'Verified Clinic' : 'Verified Recipient'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-300 pt-1.5 border-t border-teal-500/10 text-[11px]">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                          <span className="truncate">{req.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <Phone className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                          <span>{req.requesterPhone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Official Medical Dispatch Readout: Clinical Need / Rx Reference */}
                    <div className="border-l-4 border-amber-500 bg-amber-950/40 border-y border-r border-amber-500/20 rounded-r-xl p-3 font-mono text-xs text-amber-200 space-y-1">
                      <span className="font-bold text-amber-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                        <FileText className="w-3 h-3 text-amber-400" />
                        <span>Clinical Need / Rx Reference:</span>
                      </span>
                      <p className="text-amber-100 leading-relaxed font-sans font-medium text-xs">
                        {req.reasonOrPrescription}
                      </p>
                    </div>
                  </div>

                  {/* Card Action Footer: 3D Tactile Elevation */}
                  <div className="mt-5 pt-3.5 border-t border-teal-500/15">
                    {isFulfilled ? (
                      <div className="bg-emerald-950/70 border border-emerald-500/30 rounded-xl p-2.5 text-center text-xs font-mono font-semibold text-emerald-200 flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Fulfilled by {req.fulfilledByName || 'Community Donor'}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onFulfillClick(req)}
                        className="w-full py-2.5 px-4 text-xs sm:text-sm font-bold rounded-xl bg-gradient-to-b from-teal-400 to-teal-600 hover:from-teal-300 hover:to-teal-500 text-slate-950 shadow-[0_6px_20px_-4px_rgba(13,148,136,0.5),inset_0_1px_0_rgba(255,255,255,0.45)] hover:translate-y-[-2px] active:translate-y-[1px] transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <HeartHandshake className="w-4 h-4 text-slate-950" />
                        <span>I Have This Medicine (Donate)</span>
                        <ArrowRight className="w-4 h-4 text-slate-950" />
                      </button>
                    )}
                  </div>
                </TiltSpotlightCard>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="bg-slate-950/80 rounded-3xl border border-dashed border-teal-500/30 p-12 text-center space-y-3 backdrop-blur-xl">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-400/30 mx-auto flex items-center justify-center text-teal-300">
            <Filter className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-display text-base font-bold text-white">No Matching Medicine Requests</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No requests found matching your current search or filter criteria.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 text-xs font-bold transition cursor-pointer hover:from-teal-300 hover:to-emerald-400 shadow-md"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-950" />
            <span>Reset Filters</span>
          </button>
        </div>
      )}
    </div>
  );
}
