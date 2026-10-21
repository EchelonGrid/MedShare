'use client';

import React from 'react';
import { Medication, UserRole } from '@/types/medshare';
import { useMedShare } from '@/context/MedShareContext';
import { getDaysUntilExpiry, getUrgencyLevel } from '@/lib/seed';
import { useIsMounted } from '@/lib/useIsMounted';
import {
  Clock,
  AlertTriangle,
  Calendar,
  MapPin,
  User,
  Phone,
  ShieldCheck,
  CheckCircle2,
  PackageCheck,
  Building2,
  Lock,
} from 'lucide-react';

interface MedicationCardProps {
  medication: Medication;
  onClaimClick?: (medication: Medication) => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  donor: 'Donor',
  clinic_charity: 'Clinic / Charity',
  individual: 'Individual',
};

export default function MedicationCard({ medication, onClaimClick }: MedicationCardProps) {
  const { currentUser, markAsCollected } = useMedShare();
  const mounted = useIsMounted();

  const daysRemaining = mounted ? getDaysUntilExpiry(medication.expiryDate) : null;
  const urgency = daysRemaining !== null ? getUrgencyLevel(daysRemaining) : 'normal';

  const isDonorOfThis = currentUser ? currentUser.id === medication.donorId : false;
  const isClaimerOfThis = currentUser ? currentUser.id === medication.claimedById : false;
  const canViewPickupContact = isDonorOfThis || isClaimerOfThis;
  const isDonorRole = currentUser ? currentUser.role === 'donor' : false;

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
    statusBadge = (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
        Claimed
      </span>
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
          <h3 className="font-extrabold text-slate-900 text-base sm:text-lg leading-snug tracking-tight">
            {medication.medicineName || 'Unnamed Medicine'}
          </h3>
          <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-md bg-teal-100 text-teal-900 border border-teal-300 font-mono shadow-2xs">
            {medication.strength}
          </span>
        </div>

        {/* Sealed & Unexpired indicator tag */}
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-300">
            <ShieldCheck className="w-3 h-3 text-emerald-700" />
            ✓ Sealed &amp; Unexpired
          </span>
          <span className="text-xs text-slate-700 font-medium truncate">
            {medication.quantity}
          </span>
        </div>

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

            {/* Revealed Pickup Contact */}
            {canViewPickupContact ? (
              <div className="space-y-1 pt-1 border-t border-sky-200/60">
                <div className="flex items-center gap-1.5 text-teal-800 font-medium">
                  <Phone className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Donor Contact for Pickup: <strong className="font-semibold">{medication.donorPhone}</strong></span>
                </div>
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
            {isDonorRole ? (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => onClaimClick?.(medication)}
                  className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 transition border border-slate-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  title="Click to learn how to claim as a collector"
                >
                  <span>Claim Medicine (Collectors Only)</span>
                </button>
                <p className="text-[11px] text-center text-slate-500 italic">
                  Switch to a Collector profile in top navbar to claim
                </p>
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
          <button
            type="button"
            onClick={() => markAsCollected(medication.id)}
            className="w-full py-2 px-3 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Mark as Collected</span>
          </button>
        )}

        {medication.status === 'collected' && (
          <div className="text-center py-1 text-xs text-emerald-700 font-medium">
            Handover completed safely
          </div>
        )}
      </div>
    </div>
  );
}
