'use client';

import React from 'react';
import { Medication, UserRole } from '@/types/medshare';
import { useMedShare } from '@/context/MedShareContext';
import { getDaysUntilExpiry, getUrgencyLevel, parseQuantity, getPickupTimeRemaining } from '@/lib/seed';
import { useIsMounted } from '@/lib/useIsMounted';
import { inferCategory } from '@/lib/medicine-dictionary';
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
  const { currentUser, setActiveMainTab, actionLoading } = useMedShare();
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

  const displayCategory = medication.category || inferCategory(medication.medicineName, medication.genericName);

  // Check if this card was matched due to generic equivalence rather than typed medicine name
  const showGenericMatchBadge =
    isGenericMatch ||
    Boolean(
      searchedTerm &&
        searchedTerm.trim().length > 1 &&
        medication.genericName &&
        !medication.medicineName.toLowerCase().includes(searchedTerm.toLowerCase().trim())
    );

  // Urgency badge & card border styling
  let urgencyBadge = (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
      <Clock className="w-3.5 h-3.5 text-teal-600" />
      <span>{daysRemaining !== null ? `Expires in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}` : 'Checking expiry...'}</span>
    </span>
  );
  let cardBorder = 'border-slate-200 hover:border-teal-300';

  if (daysRemaining !== null && daysRemaining <= 0) {
    urgencyBadge = (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
        <Clock className="w-3.5 h-3.5 text-slate-500" />
        <span>Expired ({Math.abs(daysRemaining)}d ago)</span>
      </span>
    );
    cardBorder = 'border-slate-300 bg-slate-50/50';
  } else if (urgency === 'critical') {
    urgencyBadge = (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-300 shadow-xs animate-pulse">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
        <span>Expiring in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} • Urgent</span>
      </span>
    );
    cardBorder = 'border-rose-300 hover:border-rose-400 ring-1 ring-rose-100';
  } else if (urgency === 'priority') {
    urgencyBadge = (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        <span>Expiring in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} • Priority</span>
      </span>
    );
    cardBorder = 'border-amber-300 hover:border-amber-400 ring-1 ring-amber-100';
  }

  // Lifecycle status badge
  let statusBadge = (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
      <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
      Available
    </span>
  );
  if (medication.status === 'claimed') {
    const pickupHold = getPickupTimeRemaining(medication.claimExpiresAt);
    statusBadge = (
      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
          Claimed
        </span>
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
            pickupHold.isExpired
              ? 'bg-rose-100 text-rose-800 border border-rose-300'
              : 'bg-amber-100 text-amber-900 border border-amber-300'
          }`}
          title="48-hour anti-ghosting pickup window"
        >
          <Clock className="w-3 h-3 text-amber-700" />
          <span>{pickupHold.label}</span>
        </span>
      </div>
    );
  } else if (medication.status === 'collected') {
    statusBadge = (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        Collected
      </span>
    );
  }

  return (
    <div
      className={`bg-white rounded-2xl border ${cardBorder} p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between`}
    >
      <div>
        {/* Top Header: Urgency badge & Status badge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          {urgencyBadge}
          {statusBadge}
        </div>

        {/* Medicine Name and Strength */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base sm:text-lg leading-snug tracking-tight">
              {medication.medicineName || 'Unnamed Medicine'}
            </h3>
            {medication.genericName && (
              <p className="text-xs text-slate-500 italic mt-0.5">
                ({medication.genericName})
              </p>
            )}
          </div>
          <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-md bg-teal-100 text-teal-900 border border-teal-300 font-mono shadow-2xs">
            {medication.strength}
          </span>
        </div>

        {/* Category & Sealed Indicator & Inventory */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            {displayCategory}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-300">
            <ShieldCheck className="w-3 h-3 text-emerald-700" />
            ✓ Sealed
          </span>
          {medication.status === 'available' ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-900 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200">
              <Package className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span>
                Available: <strong className="font-bold text-teal-950">{remainingQty}</strong> of {totalQty} {unitName} remaining
              </span>
            </span>
          ) : (
            <span className="text-xs text-slate-600 font-medium truncate">
              {medication.quantity}
            </span>
          )}
        </div>

        {/* Generic Match Badge (highlighted when matched via generic equivalence) */}
        {showGenericMatchBadge && searchedTerm && medication.genericName && (
          <div className="mt-2.5 px-2.5 py-1.5 rounded-xl bg-teal-50 border border-teal-300 text-teal-900 text-xs font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-700 shrink-0" />
            <div>
              <span className="font-bold text-teal-950">✓ Generic Match for &quot;{searchedTerm}&quot;</span>
              <span className="block text-[11px] text-teal-800">Same Generic: <strong>{medication.genericName}</strong></span>
            </div>
          </div>
        )}

        {/* Metadata Details: Expiry, Location, Donor */}
        <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>
              Expiry Date: <strong className="font-bold text-slate-900">{medication.expiryDate}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate text-slate-800 font-medium" title={medication.location}>
              {medication.location}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate text-slate-800">
              Donor: <span className="font-bold text-slate-900">{medication.donorName}</span>
            </span>
          </div>
        </div>

        {/* Claimed Metadata & Handover details */}
        {medication.status === 'claimed' && (
          <div className="mt-3.5 p-3 rounded-xl bg-sky-50/70 border border-sky-100 space-y-1.5 text-xs text-sky-950">
            <div className="flex items-center gap-1.5 font-semibold text-sky-900">
              <Building2 className="w-3.5 h-3.5 text-sky-700 shrink-0" />
              <span>Claimed by: {medication.claimedByName || 'Collector'}</span>
              {medication.claimedByRole && (
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-sky-200/80 text-sky-800">
                  {ROLE_LABELS[medication.claimedByRole] || medication.claimedByRole}
                </span>
              )}
            </div>

            {/* 48-Hour Pickup Window Countdown */}
            {(() => {
              const hold = getPickupTimeRemaining(medication.claimExpiresAt);
              return (
                <div
                  className={`mt-1.5 p-2 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 ${
                    hold.isExpired
                      ? 'bg-rose-100/90 text-rose-800 border border-rose-200'
                      : 'bg-amber-100/80 text-amber-900 border border-amber-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                  <span>Pickup Hold: {hold.label} (48h window)</span>
                </div>
              );
            })()}

            {/* Revealed Pickup Contact */}
            {canViewPickupContact ? (
              <div className="space-y-1.5 pt-1 border-t border-sky-200/60">
                <div className="flex items-center gap-1.5 text-teal-800 font-medium">
                  <Phone className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Donor Contact for Pickup: <strong className="font-semibold">{medication.donorPhone}</strong></span>
                </div>
                {isClaimerOfThis && medication.handoverPin && (
                  <div className="flex items-center justify-between bg-white px-2.5 py-1 rounded-lg border border-amber-200 text-xs">
                    <span className="text-amber-900 font-medium">Your Handover PIN:</span>
                    <span className="font-mono font-black text-amber-950 tracking-widest">{medication.handoverPin}</span>
                  </div>
                )}
                {medication.prescriptionRef && (
                  <div className="text-[11px] text-slate-600 pl-5">
                    <span className="font-medium text-slate-700">Ref:</span> {medication.prescriptionRef}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[11px] text-slate-500 pt-1 border-t border-sky-200/60">
                <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                <span>Pickup contact details visible to donor and claimer only</span>
              </div>
            )}
          </div>
        )}

        {/* Collected status banner */}
        {medication.status === 'collected' && (
          <div className="mt-3.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
            <PackageCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">✓ Collected &amp; Handed Over</span>
              {medication.claimedByName && (
                <span className="block text-[11px] text-emerald-700">to {medication.claimedByName}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-5 pt-3.5 border-t border-slate-100">
        {medication.status === 'available' && (
          <div>
            {daysRemaining !== null && daysRemaining <= 0 ? (
              <div className="text-center py-2 px-3 text-xs font-semibold rounded-xl bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
                <span>Expired ({medication.expiryDate}) • Safe Disposal Required</span>
              </div>
            ) : isDonorOfThis ? (
              <div className="text-center py-2 px-3 text-xs font-semibold rounded-xl bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-teal-600" />
                <span>Your Listed Medicine Donation</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onClaimClick?.(medication)}
                className="w-full py-2.5 px-4 text-xs sm:text-sm font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white transition shadow-sm hover:shadow flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Claim Medicine</span>
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
                className="w-full py-2 px-3 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                title="Go to Donor Portal to verify collector PIN"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Verify Collector PIN in My Portal</span>
              </button>
            ) : isClaimerOfThis ? (
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-2.5 text-center space-y-1">
                <div className="text-xs font-bold text-sky-950 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-700" />
                  <span>Reserved for You</span>
                </div>
                <p className="text-[11px] text-sky-800">
                  Provide your 4-digit PIN <strong className="font-mono text-amber-950 bg-amber-100 px-1 py-0.5 rounded border border-amber-300">{medication.handoverPin || '4829'}</strong> to donor upon pickup.
                </p>
              </div>
            ) : (
              <div className="text-center py-2 px-3 text-xs font-semibold rounded-xl bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Claimed • In Handover Coordination</span>
              </div>
            )}
          </div>
        )}

        {medication.status === 'collected' && (
          <div className="text-center py-1.5 text-xs text-emerald-800 font-semibold bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Handover Verified &amp; Completed</span>
          </div>
        )}
      </div>
    </div>
  );
}
