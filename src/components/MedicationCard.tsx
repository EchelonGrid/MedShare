'use client';

import React from 'react';
import { Medication, UserRole } from '@/types/medshare';
import { useMedShare } from '@/context/MedShareContext';
import {
  getDaysUntilExpiry,
  getUrgencyLevel,
  parseQuantity,
  getPickupTimeRemaining,
} from '@/lib/seed';
import { useIsMounted } from '@/lib/useIsMounted';
import { inferCategory } from '@/lib/medicine-dictionary';
import TiltSpotlightCard, { GlowColor } from '@/components/ui/TiltSpotlightCard';
import {
  Clock,
  AlertTriangle,
  Calendar,
  MapPin,
  User,
  Phone,
  ShieldCheck,
  Check,
  CheckCircle2,
  PackageCheck,
  Building2,
  Lock,
  Sparkles,
  Package,
  KeyRound,
  ArrowRight,
} from 'lucide-react';

interface MedicationCardProps {
  medication: Medication;
  onClaimClick?: (medication: Medication) => void;
  searchedTerm?: string;
  isGenericMatch?: boolean;
}

const ROLE_LABELS: Record<UserRole, string> = {
  individual: 'Individual Member',
  clinic_charity: 'Rural Clinic / NGO',
  admin: 'Platform Moderator',
};

export default function MedicationCard({
  medication,
  onClaimClick,
  searchedTerm,
  isGenericMatch,
}: MedicationCardProps) {
  const { currentUser, setActiveMainTab } = useMedShare();
  const mounted = useIsMounted();

  const daysRemaining = mounted ? getDaysUntilExpiry(medication.expiryDate) : null;
  const urgency = daysRemaining !== null ? getUrgencyLevel(daysRemaining) : 'normal';

  const isDonorOfThis = currentUser ? currentUser.id === medication.donorId : false;
  const isClaimerOfThis = currentUser ? currentUser.id === medication.claimedById : false;
  const canViewPickupContact = isDonorOfThis || isClaimerOfThis;

  const parsedQty = parseQuantity(medication.quantity);
  const totalQty = medication.totalNumericQuantity ?? parsedQty.total;
  const unitName = medication.unitName || parsedQty.unit;
  const remainingQty =
    medication.remainingNumericQuantity !== undefined
      ? medication.remainingNumericQuantity
      : totalQty;

  const displayCategory =
    medication.category || inferCategory(medication.medicineName, medication.genericName);

  // Check if this card was matched due to generic equivalence rather than typed medicine name
  const showGenericMatchBadge =
    isGenericMatch ||
    Boolean(
      searchedTerm &&
        searchedTerm.trim().length > 1 &&
        medication.genericName &&
        !medication.medicineName.toLowerCase().includes(searchedTerm.toLowerCase().trim())
    );

  // Map urgency to glowColor
  let glowColor: GlowColor = 'teal';
  if (daysRemaining !== null && daysRemaining <= 30) {
    glowColor = 'rose';
  } else if (daysRemaining !== null && daysRemaining <= 60) {
    glowColor = 'amber';
  }

  // Calculate SVG circular countdown dial (90 days max scale)
  const radius = 14;
  const circumference = 2 * Math.PI * radius; // ~87.96
  const normalizedProgress =
    daysRemaining !== null ? Math.max(0, Math.min(1, daysRemaining / 90)) : 1;
  const strokeDashoffset = circumference - normalizedProgress * circumference;

  let dialStroke = '#10b981'; // Emerald
  if (daysRemaining !== null && daysRemaining <= 0) {
    dialStroke = '#64748b'; // Slate
  } else if (urgency === 'critical') {
    dialStroke = '#f43f5e'; // Rose
  } else if (urgency === 'priority') {
    dialStroke = '#f59e0b'; // Amber
  }

  // Stock depletion percentage
  const stockPercent =
    totalQty > 0 ? Math.max(0, Math.min(100, (remainingQty / totalQty) * 100)) : 100;

  return (
    <TiltSpotlightCard
      glowColor={glowColor}
      className="p-5 sm:p-6 bg-slate-900/90 border border-teal-500/25 flex flex-col justify-between"
    >
      <div>
        {/* ========================================================= */}
        {/* TOP TELEMETRY HEADER: CIRCULAR SVG FEFO COUNTDOWN DIAL    */}
        {/* ========================================================= */}
        <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-teal-500/15">
          {/* Circular SVG Progress Ring + Monospace Countdown Readout */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
              <svg className="w-9 h-9 transform -rotate-90 origin-center" viewBox="0 0 36 36">
                {/* Background Track */}
                <circle
                  cx="18"
                  cy="18"
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="2.5"
                />
                {/* Draining Countdown Arc */}
                <circle
                  cx="18"
                  cy="18"
                  r={radius}
                  fill="none"
                  stroke={dialStroke}
                  strokeWidth="2.5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              {/* Core Pulsing Indicator */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {daysRemaining !== null && daysRemaining <= 0 ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                ) : urgency === 'critical' ? (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                ) : urgency === 'priority' ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </div>
            </div>

            {/* Monospace Countdown Label */}
            <div className="font-mono leading-tight">
              {daysRemaining !== null && daysRemaining <= 0 ? (
                <div className="text-[11px] font-bold text-slate-400">
                  EXPIRED • DISPOSAL
                </div>
              ) : urgency === 'critical' ? (
                <div>
                  <div className="text-xs font-extrabold text-rose-400 flex items-center gap-1">
                    <span>{daysRemaining}d LEFT</span>
                    <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                      CRITICAL
                    </span>
                  </div>
                  <div className="text-[10px] text-rose-300/80">FEFO Rush Protocol</div>
                </div>
              ) : urgency === 'priority' ? (
                <div>
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
                    <span>{daysRemaining}d LEFT</span>
                    <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      PRIORITY
                    </span>
                  </div>
                  <div className="text-[10px] text-amber-200/70">Urgent Allocation</div>
                </div>
              ) : (
                <div>
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <span>{daysRemaining ?? '--'}d LEFT</span>
                    <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      FEFO
                    </span>
                  </div>
                  <div className="text-[10px] text-teal-200/70">Standard Window</div>
                </div>
              )}
            </div>
          </div>

          {/* Right Header: Lifecycle Status & Laser-Etched Strength Badge */}
          <div className="flex items-center gap-2">
            {medication.status === 'available' ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                AVAILABLE
              </span>
            ) : medication.status === 'claimed' ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                CLAIMED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30">
                <CheckCircle2 className="w-3 h-3 text-teal-400" />
                COLLECTED
              </span>
            )}

            {/* Laser-Etched Metallic Strength Badge */}
            <span className="shrink-0 text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-slate-950 text-teal-300 border border-teal-500/35 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]">
              {medication.strength}
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CORE DRUG IDENTITY (translateZ(20px) depth layer)         */}
        {/* ========================================================= */}
        <div className="mt-4 space-y-1.5" style={{ transform: 'translateZ(20px)' }}>
          <h3 className="font-display font-extrabold text-white text-xl sm:text-2xl tracking-tight leading-snug drop-shadow-sm">
            {medication.medicineName || 'Unnamed Medicine'}
          </h3>
          {medication.genericName && (
            <p className="text-xs sm:text-sm font-medium text-teal-300/85 italic">
              ({medication.genericName})
            </p>
          )}

          {/* Consolidated Sleek Micro-Bar: Category & Factory Sealed */}
          <div className="pt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-300 border border-slate-700/60">
              {displayCategory}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-md border border-emerald-500/35 shadow-[0_0_10px_rgba(16,185,129,0.12)]">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              ✓ Factory Sealed
            </span>
            <span className="text-[10px] font-mono text-teal-400/70">
              FEFO Verified
            </span>
          </div>

          {/* Generic Match Badge (when matching query via equivalence) */}
          {showGenericMatchBadge && searchedTerm && medication.genericName && (
            <div className="mt-2.5 px-3 py-2 rounded-xl bg-teal-950/70 border border-teal-400/40 text-teal-200 text-xs font-mono flex items-center gap-2 shadow-[0_0_15px_rgba(20,184,166,0.15)]">
              <Sparkles className="w-4 h-4 text-teal-300 shrink-0" />
              <div>
                <span className="font-bold text-white">⚡ Generic Equivalent Match</span>
                <span className="block text-[11px] text-teal-300">
                  Same Generic: <strong>{medication.genericName}</strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* INTERACTIVE STOCK DEPLETION METER (Blister Strip Telemetry)*/}
        {/* ========================================================= */}
        <div className="mt-5 p-3 rounded-xl bg-slate-950/70 border border-teal-500/20 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-teal-400" />
              <span>BATCH INVENTORY</span>
            </span>
            <span className="text-teal-300 font-bold">
              <span className="text-white font-extrabold">{remainingQty}</span> of {totalQty} {unitName} available
            </span>
          </div>

          {/* Smooth Glowing Progress Bar */}
          <div className="h-2 w-full rounded-full bg-slate-800/90 overflow-hidden border border-slate-700/60 relative">
            <div
              style={{ width: `${stockPercent}%` }}
              className="h-full rounded-full bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-300 shadow-[0_0_10px_rgba(45,212,191,0.5)] transition-all duration-500"
            />
          </div>
        </div>

        {/* ========================================================= */}
        {/* METADATA RECESSED SUB-PANEL: EXPIRY, LOCATION, DONOR     */}
        {/* ========================================================= */}
        <div className="mt-4 rounded-xl bg-slate-950/60 backdrop-blur-sm p-3.5 border border-teal-500/15 space-y-2 text-xs font-mono text-slate-300">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>
              Expiry: <strong className="text-white font-bold">{medication.expiryDate}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span className="truncate text-slate-200" title={medication.location}>
              {medication.location}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span className="truncate text-slate-200">
              Donor: <span className="font-bold text-white">{medication.donorName}</span>
            </span>
          </div>
        </div>

        {/* Claimed Metadata & Handover details */}
        {medication.status === 'claimed' && (
          <div className="mt-3.5 p-3 rounded-xl bg-sky-950/70 border border-sky-500/30 space-y-2 text-xs font-mono text-sky-200">
            <div className="flex items-center gap-1.5 font-semibold text-sky-100">
              <Building2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Claimed by: {medication.claimedByName || 'Collector'}</span>
              {medication.claimedByRole && (
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-sky-900/80 text-sky-300 border border-sky-400/30">
                  {ROLE_LABELS[medication.claimedByRole] || medication.claimedByRole}
                </span>
              )}
            </div>

            {/* 48-Hour Pickup Window Countdown */}
            {(() => {
              const hold = getPickupTimeRemaining(medication.claimExpiresAt);
              return (
                <div
                  className={`p-2 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 ${
                    hold.isExpired
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                      : 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span>Pickup Hold: {hold.label} (48h window)</span>
                </div>
              );
            })()}

            {/* Revealed Pickup Contact */}
            {canViewPickupContact ? (
              <div className="space-y-1.5 pt-1 border-t border-sky-500/20">
                <div className="flex items-center gap-1.5 text-teal-300 font-medium">
                  <Phone className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>
                    Donor Contact: <strong className="text-white font-bold">{medication.donorPhone}</strong>
                  </span>
                </div>
                {isClaimerOfThis && medication.handoverPin && (
                  <div className="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded-lg border border-amber-500/40 text-xs">
                    <span className="text-amber-300 font-medium">Handover PIN:</span>
                    <span className="font-mono font-black text-amber-300 tracking-widest text-sm">
                      {medication.handoverPin}
                    </span>
                  </div>
                )}
                {medication.prescriptionRef && (
                  <div className="text-[11px] text-slate-400 pl-5">
                    <span>Ref:</span> {medication.prescriptionRef}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[11px] text-slate-400 pt-1 border-t border-sky-500/20">
                <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                <span>Contact visible to donor and claimer only</span>
              </div>
            )}
          </div>
        )}

        {/* Collected status banner */}
        {medication.status === 'collected' && (
          <div className="mt-3.5 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/30 flex items-center gap-2 text-xs font-mono text-emerald-200">
            <PackageCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-white">✓ Collected &amp; Handed Over</span>
              {medication.claimedByName && (
                <span className="block text-[11px] text-emerald-300">to {medication.claimedByName}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* ACTION FOOTER: 3D DEPTH PUSH-BUTTON                       */}
      {/* ========================================================= */}
      <div className="mt-5 pt-3.5 border-t border-teal-500/15">
        {medication.status === 'available' && (
          <div>
            {daysRemaining !== null && daysRemaining <= 0 ? (
              <div className="text-center py-2.5 px-3 text-xs font-mono font-semibold rounded-xl bg-slate-950 text-slate-400 border border-slate-800 flex items-center justify-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                <span>Expired ({medication.expiryDate}) • Safe Disposal</span>
              </div>
            ) : isDonorOfThis ? (
              <div className="text-center py-2.5 px-3 text-xs font-mono font-semibold rounded-xl bg-teal-950/80 text-teal-300 border border-teal-500/30 flex items-center justify-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-teal-400" />
                <span>Your Listed Medicine Donation</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onClaimClick?.(medication)}
                className="w-full py-2.5 px-4 text-xs sm:text-sm font-bold rounded-xl bg-gradient-to-b from-teal-400 to-teal-600 hover:from-teal-300 hover:to-teal-500 text-slate-950 shadow-[0_6px_20px_-4px_rgba(13,148,136,0.5),inset_0_1px_0_rgba(255,255,255,0.45)] hover:translate-y-[-2px] active:translate-y-[1px] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Claim Medicine</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>
            )}
          </div>
        )}

        {medication.status === 'claimed' && (
          <div>
            {isDonorOfThis ? (
              <button
                type="button"
                onClick={() => setActiveMainTab('portal')}
                className="w-full py-2.5 px-3 text-xs font-mono font-bold rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 text-slate-950 hover:from-amber-300 hover:to-amber-500 shadow-[0_4px_16px_rgba(245,158,11,0.3),inset_0_1px_0_rgba(255,255,255,0.4)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                title="Go to Donor Portal to verify collector PIN"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Verify Collector PIN in My Portal</span>
              </button>
            ) : isClaimerOfThis ? (
              <div className="bg-sky-950/80 border border-sky-500/30 rounded-xl p-2.5 text-center space-y-1">
                <div className="text-xs font-bold text-sky-200 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>Reserved for You</span>
                </div>
                <p className="text-[11px] font-mono text-sky-300">
                  Provide PIN{' '}
                  <strong className="text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/40">
                    {medication.handoverPin || '4829'}
                  </strong>{' '}
                  to donor upon pickup.
                </p>
              </div>
            ) : (
              <div className="text-center py-2.5 px-3 text-xs font-mono font-semibold rounded-xl bg-slate-950 text-slate-400 border border-slate-800 flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Claimed • In Handover Coordination</span>
              </div>
            )}
          </div>
        )}

        {medication.status === 'collected' && (
          <div className="text-center py-2 text-xs font-mono text-emerald-300 font-semibold bg-emerald-950/60 rounded-xl border border-emerald-500/30 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Handover Verified &amp; Completed</span>
          </div>
        )}
      </div>
    </TiltSpotlightCard>
  );
}
