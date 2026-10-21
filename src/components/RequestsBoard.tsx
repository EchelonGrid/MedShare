'use client';

import React, { useState, useMemo } from 'react';
import { MedicineRequest, RequestUrgency } from '@/types/medshare';
import { useMedShare } from '@/context/MedShareContext';
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
} from 'lucide-react';

export type RequestFilterTab = 'all_open' | 'critical' | 'fulfilled';

interface RequestsBoardProps {
  onPostRequestClick: () => void;
  onFulfillClick: (request: MedicineRequest) => void;
}

export default function RequestsBoard({
  onPostRequestClick,
  onFulfillClick,
}: RequestsBoardProps) {
  const { requests, currentUser } = useMedShare();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [activeTab, setActiveTab] = useState<RequestFilterTab>('all_open');

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

  // Filtered & sorted requests
  const filteredRequests = useMemo(() => {
    const urgencyWeight: Record<RequestUrgency, number> = {
      critical: 3,
      high: 2,
      routine: 1,
    };

    return requests
      .filter((req) => {
        // Tab filter
        if (activeTab === 'all_open' && req.status !== 'open') return false;
        if (activeTab === 'critical' && (req.status !== 'open' || req.urgency !== 'critical')) return false;
        if (activeTab === 'fulfilled' && req.status !== 'fulfilled') return false;

        // Location filter
        if (selectedLocation !== 'All Locations' && req.location !== selectedLocation) {
          return false;
        }

        // Search query filter
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = req.medicineName.toLowerCase().includes(q);
          const matchesStrength = req.strength.toLowerCase().includes(q);
          const matchesGeneric = req.genericName ? req.genericName.toLowerCase().includes(q) : false;
          const matchesRequester = req.requesterName.toLowerCase().includes(q);
          if (!matchesName && !matchesStrength && !matchesGeneric && !matchesRequester) {
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
  }, [requests, activeTab, selectedLocation, searchQuery]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedLocation('All Locations');
    setActiveTab('all_open');
  };

  const formatTimeAgo = (isoDate: string) => {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return days === 1 ? '1 day ago' : `${days} days ago`;
  };

  return (
    <div className="space-y-6">
      {/* Board Header & Top CTA */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-sky-950 text-white rounded-3xl p-6 sm:p-8 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              <span>Reverse Marketplace • Direct Donor Match</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Urgent Medicine Requests Board
            </h2>
            <p className="text-xs sm:text-sm text-teal-100/80 leading-relaxed">
              Verified rural clinics and lower-income families post specific critical medicine stockouts here. If you have any of these sealed medications at home, fulfill them in one click.
            </p>
          </div>

          <button
            type="button"
            onClick={onPostRequestClick}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white text-xs sm:text-sm font-bold shadow-lg transition cursor-pointer self-start md:self-auto shrink-0 border border-teal-400/40"
          >
            <PlusCircle className="w-4 h-4 text-teal-100" />
            <span>Post Urgent Request</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs, Search Bar & Location Dropdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Row 1: Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('all_open')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'all_open'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>All Open Requests</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  activeTab === 'all_open'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tabCounts.all_open}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('critical')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'critical'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <span>🚨 Critical (Within 48h)</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  activeTab === 'critical'
                    ? 'bg-white/20 text-white'
                    : 'bg-rose-200 text-rose-800'
                }`}
              >
                {tabCounts.critical}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('fulfilled')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'fulfilled'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <span>✓ Fulfilled</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  activeTab === 'fulfilled'
                    ? 'bg-white/20 text-white'
                    : 'bg-emerald-200 text-emerald-900'
                }`}
              >
                {tabCounts.fulfilled}
              </span>
            </button>
          </div>

          <div className="text-xs font-medium text-slate-500">
            Showing <strong className="text-slate-800">{filteredRequests.length}</strong> request{filteredRequests.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* Row 2: Search Input & Location Dropdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search medicine name, generic drug, strength, or clinic..."
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <MapPin className="w-4 h-4" />
            </div>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition bg-white"
            >
              <option value="All Locations">All Locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Request Cards Grid */}
      {filteredRequests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredRequests.map((req) => {
            const isCritical = req.urgency === 'critical';
            const isHigh = req.urgency === 'high';
            const isFulfilled = req.status === 'fulfilled';

            return (
              <div
                key={req.id}
                className={`bg-white rounded-3xl border p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between ${
                  isFulfilled
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : isCritical
                    ? 'border-rose-300 ring-1 ring-rose-100'
                    : isHigh
                    ? 'border-amber-300 ring-1 ring-amber-100'
                    : 'border-slate-200'
                }`}
              >
                <div className="space-y-3.5">
                  {/* Top Header: Urgency Badge & Time */}
                  <div className="flex items-center justify-between gap-2">
                    {isFulfilled ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Fulfilled</span>
                      </span>
                    ) : isCritical ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Critical • Within 48 Hours</span>
                      </span>
                    ) : isHigh ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                        <Clock className="w-3.5 h-3.5 text-amber-700" />
                        <span>High Priority • This Week</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                        <Clock className="w-3.5 h-3.5 text-sky-600" />
                        <span>Routine Stock Refill</span>
                      </span>
                    )}

                    <span className="text-[11px] text-slate-500 font-medium">
                      {formatTimeAgo(req.createdAt)}
                    </span>
                  </div>

                  {/* Medicine Details */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl tracking-tight leading-snug">
                          {req.medicineName}
                        </h3>
                        {req.genericName && (
                          <p className="text-xs text-slate-500 italic mt-0.5">
                            ({req.genericName})
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-teal-100 text-teal-900 border border-teal-300">
                        {req.strength}
                      </span>
                    </div>

                    <div className="mt-2 inline-flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-semibold">
                      <span>Needed:</span>
                      <strong className="text-teal-900 font-extrabold">{req.quantityNeeded}</strong>
                    </div>
                  </div>

                  {/* Requester Identity & Location */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 truncate">
                        {req.requesterRole === 'clinic_charity' ? (
                          <Building2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                        )}
                        <span className="truncate">{req.requesterName}</span>
                      </div>
                      <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 uppercase">
                        {req.requesterRole === 'clinic_charity' ? 'Verified Clinic' : 'Verified Recipient'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-600 pt-1 border-t border-slate-200/60 text-[11px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{req.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono">{req.requesterPhone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Clinical Reason or Prescription Note */}
                  <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-3 text-xs space-y-1">
                    <span className="font-bold text-amber-950 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                      <FileText className="w-3 h-3 text-amber-700" />
                      <span>Clinical Need / Rx Reference:</span>
                    </span>
                    <p className="text-amber-900 leading-relaxed font-medium">
                      {req.reasonOrPrescription}
                    </p>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="mt-5 pt-3.5 border-t border-slate-100">
                  {isFulfilled ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center text-xs font-semibold text-emerald-800 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Fulfilled by {req.fulfilledByName || 'Community Donor'}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onFulfillClick(req)}
                      className="w-full py-2.5 px-4 text-xs sm:text-sm font-bold rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white transition shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <HeartHandshake className="w-4 h-4 text-teal-200" />
                      <span>I Have This Medicine (Donate)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
            <Filter className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-slate-900">No Matching Medicine Requests</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No requests found matching your current search or filter criteria.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>
      )}
    </div>
  );
}
