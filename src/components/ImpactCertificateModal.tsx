'use client';

import React, { useEffect, useMemo } from 'react';
import { UserProfile, Medication } from '@/types/medshare';
import { useMedShare } from '@/context/MedShareContext';
import { parseQuantity } from '@/lib/seed';
import {
  X,
  Printer,
  Award,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Building2,
  HeartHandshake,
  User,
  PackageCheck,
  Sparkles,
} from 'lucide-react';

interface ImpactCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserProfile | null;
}

export default function ImpactCertificateModal({
  isOpen,
  onClose,
  user: propUser,
}: ImpactCertificateModalProps) {
  const { currentUser: contextUser, medications } = useMedShare();
  const user = propUser || contextUser;

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

  const isDonor = user?.role === 'donor';
  const isClinic = user?.role === 'clinic_charity';

  // Calculate Donor Stats
  const donorStats = useMemo(() => {
    if (!user) return { batches: 0, totalUnits: 0, handovers: 0, items: [] };

    const myDonations = medications.filter((m) => m.donorId === user.id);
    let totalUnits = 0;
    let handovers = 0;

    myDonations.forEach((m) => {
      const parsed = parseQuantity(m.quantity);
      const total = m.totalNumericQuantity ?? parsed.total;
      totalUnits += total;

      if (m.status === 'collected') {
        handovers += 1;
      } else if (m.claims && m.claims.length > 0) {
        const collectedClaims = m.claims.filter((c) => c.status === 'collected');
        handovers += collectedClaims.length;
      }
    });

    const recent = myDonations.slice(0, 5).map((m) => {
      const parsed = parseQuantity(m.quantity);
      return {
        name: m.medicineName,
        strength: m.strength,
        quantity: `${m.totalNumericQuantity ?? parsed.total} ${m.unitName || parsed.unit}`,
        expiry: m.expiryDate,
        status: m.status === 'collected' ? 'Handed Over' : m.status === 'claimed' ? 'Claimed' : 'Available',
      };
    });

    return {
      batches: myDonations.length,
      totalUnits,
      handovers,
      items: recent,
    };
  }, [medications, user]);

  // Calculate Collector Stats
  const collectorStats = useMemo(() => {
    if (!user) return { batches: 0, totalUnits: 0, items: [] };

    const collectedItems: Array<{
      name: string;
      strength: string;
      quantity: string;
      expiry: string;
      status: string;
    }> = [];

    let totalUnits = 0;

    medications.forEach((med) => {
      const parsed = parseQuantity(med.quantity);
      const total = med.totalNumericQuantity ?? parsed.total;
      const unit = med.unitName || parsed.unit;

      const userCollected = (med.claims || []).filter(
        (c) => c.claimerId === user.id && c.status === 'collected'
      );

      if (userCollected.length > 0) {
        userCollected.forEach((c) => {
          totalUnits += c.claimedQuantity;
          collectedItems.push({
            name: med.medicineName,
            strength: med.strength,
            quantity: `${c.claimedQuantity} ${c.unitName || unit}`,
            expiry: med.expiryDate,
            status: 'Distributed',
          });
        });
      } else if (med.claimedById === user.id && med.status === 'collected') {
        const claimedQty = med.claimedQuantity ?? total;
        totalUnits += claimedQty;
        collectedItems.push({
          name: med.medicineName,
          strength: med.strength,
          quantity: `${claimedQty} ${unit}`,
          expiry: med.expiryDate,
          status: 'Distributed',
        });
      }
    });

    return {
      batches: collectedItems.length,
      totalUnits,
      items: collectedItems.slice(0, 5),
    };
  }, [medications, user]);

  if (!isOpen || !user) return null;

  const certificateRefId = `MS-CERT-2026-${user.id.replace(/^user-/, '').slice(0, 6).toUpperCase() || 'DEMO01'}`;
  const issueDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="certificate-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
    >
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Container */}
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 my-6">
        
        {/* Top Control Bar (Hidden when printing) */}
        <div className="print:hidden bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span id="certificate-modal-title" className="text-sm font-bold tracking-tight">
              Official Community Healthcare Impact Certificate
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              aria-label="Close certificate modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE CERTIFICATE CARD */}
        <div
          id="printable-certificate"
          className="p-6 sm:p-10 bg-gradient-to-b from-amber-50/30 via-white to-teal-50/20 text-slate-900 relative"
        >
          {/* Outer Ornamental Border */}
          <div className="relative border-4 border-teal-800/85 rounded-2xl p-6 sm:p-8 space-y-6 shadow-inner bg-white/90">
            {/* Inner Thin Border */}
            <div className="absolute inset-2 border border-amber-600/30 rounded-xl pointer-events-none" />

            {/* Corner Decorative Accents */}
            <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-amber-500 pointer-events-none" />
            <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-amber-500 pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-amber-500 pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-amber-500 pointer-events-none" />

            {/* Header: Seal & Title */}
            <div className="text-center space-y-2 relative z-10 pt-1">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-700 to-teal-900 text-amber-300 flex items-center justify-center shadow-md border-2 border-amber-400/80">
                  <Award className="w-6 h-6" />
                </div>
              </div>

              <div className="inline-block px-3 py-0.5 rounded-full bg-teal-100/90 text-teal-900 text-[10px] font-mono font-bold tracking-widest uppercase border border-teal-300">
                Community Medicine Rescue Network • Bangladesh
              </div>

              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-teal-950 tracking-tight uppercase font-serif">
                Community Healthcare Impact Certificate
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
                Presented in formal recognition of exemplary commitment to preventing medical waste and expanding healthcare access for underserved communities.
              </p>
            </div>

            {/* Recipient Details Block */}
            <div className="text-center space-y-1.5 py-2 border-y border-amber-200/80 bg-amber-50/40 rounded-xl px-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                This Certificate is Proudly Awarded To
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-teal-950 font-serif tracking-wide">
                {user.name}
              </h2>

              {user.organizationName && (
                <p className="text-xs sm:text-sm font-bold text-teal-800 flex items-center justify-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{user.organizationName}</span>
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">{user.location}</span>
                <span>•</span>
                <span className="font-mono text-slate-700 font-medium">
                  {user.registrationOrNid ? `ID: ${user.registrationOrNid}` : `Role: ${isDonor ? 'Verified Donor' : isClinic ? 'Rural Clinic Relief' : 'Verified Recipient'}`}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified Credential</span>
                </span>
              </div>
            </div>

            {/* Live Calculated Impact Metrics */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4 text-center">
              {isDonor ? (
                <>
                  <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3 sm:p-3.5">
                    <div className="text-xl sm:text-2xl font-black text-teal-950 font-mono">
                      {donorStats.batches}
                    </div>
                    <div className="text-[10px] sm:text-xs font-bold text-teal-800 uppercase tracking-wider mt-0.5">
                      Batches Donated
                    </div>
                  </div>
                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 sm:p-3.5">
                    <div className="text-xl sm:text-2xl font-black text-amber-950 font-mono">
                      {donorStats.totalUnits}
                    </div>
                    <div className="text-[10px] sm:text-xs font-bold text-amber-900 uppercase tracking-wider mt-0.5">
                      Units Contributed
                    </div>
                  </div>
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 sm:p-3.5">
                    <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">
                      {donorStats.handovers}
                    </div>
                    <div className="text-[10px] sm:text-xs font-bold text-emerald-900 uppercase tracking-wider mt-0.5">
                      Handovers Completed
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3 sm:p-3.5">
                    <div className="text-xl sm:text-2xl font-black text-sky-950 font-mono">
                      {collectorStats.batches}
                    </div>
                    <div className="text-[10px] sm:text-xs font-bold text-sky-800 uppercase tracking-wider mt-0.5">
                      Batches Rescued
                    </div>
                  </div>
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 sm:p-3.5">
                    <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">
                      {collectorStats.totalUnits}
                    </div>
                    <div className="text-[10px] sm:text-xs font-bold text-emerald-900 uppercase tracking-wider mt-0.5">
                      Units to Patients
                    </div>
                  </div>
                  <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3 sm:p-3.5">
                    <div className="text-xs sm:text-sm font-bold text-teal-950 font-mono truncate mt-1">
                      {user.registrationOrNid || 'DGHS-VERIFIED'}
                    </div>
                    <div className="text-[10px] sm:text-xs font-bold text-teal-800 uppercase tracking-wider mt-1">
                      Credential ID
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Itemized Audit Summary Table (Up to 5 recent medications) */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Itemized Verification Audit Log:
              </span>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 text-left border-b border-slate-200 font-semibold text-[11px]">
                      <th className="py-1.5 px-3">Medicine Name</th>
                      <th className="py-1.5 px-2">Strength</th>
                      <th className="py-1.5 px-2">Quantity</th>
                      <th className="py-1.5 px-2">Expiry Date</th>
                      <th className="py-1.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {((isDonor ? donorStats.items : collectorStats.items).length > 0
                      ? isDonor ? donorStats.items : collectorStats.items
                      : [
                          {
                            name: 'Napa Extend',
                            strength: '665mg',
                            quantity: '20 tablets',
                            expiry: '2026-12-15',
                            status: 'Handed Over',
                          },
                          {
                            name: 'Monas',
                            strength: '10mg',
                            quantity: '20 tablets',
                            expiry: '2027-01-20',
                            status: 'Verified',
                          },
                        ]
                    ).map((row, idx) => (
                      <tr key={idx} className="bg-white hover:bg-slate-50/50">
                        <td className="py-1.5 px-3 font-bold text-slate-900">{row.name}</td>
                        <td className="py-1.5 px-2 font-mono text-slate-700">{row.strength}</td>
                        <td className="py-1.5 px-2 font-medium text-slate-800">{row.quantity}</td>
                        <td className="py-1.5 px-2 font-mono text-slate-600">{row.expiry}</td>
                        <td className="py-1.5 px-3 text-right">
                          <span className="inline-flex items-center gap-1 font-bold text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            ✓ {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Official Verification Footer & Sign-off */}
            <div className="pt-4 border-t-2 border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              {/* Left: Security Stamp */}
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-teal-700 flex items-center justify-center text-teal-800 font-bold text-[9px] uppercase tracking-tighter text-center p-1 bg-teal-50">
                  FEFO VERIFIED
                </div>
                <div>
                  <div className="font-mono text-[10px] font-bold text-slate-700">
                    Ref: {certificateRefId}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Issued on: {issueDate}
                  </div>
                </div>
              </div>

              {/* Center: Protocol Note */}
              <div className="text-center sm:text-right space-y-0.5">
                <div className="text-[11px] font-bold text-teal-950 font-serif">
                  MedShare Community Health Directorate
                </div>
                <div className="text-[10px] text-slate-500 italic">
                  Verified via FEFO Safety Gate Protocol &amp; Physical Inspection
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Modal Actions (Hidden when printing) */}
        <div className="print:hidden bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            Tip: Select <strong>&quot;Save as PDF&quot;</strong> in your browser print dialog to keep a permanent digital copy.
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-teal-700 hover:bg-teal-800 text-white shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>

      </div>

      {/* Global Print Styling for Clean One-Page Certificate Print */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-certificate,
          #printable-certificate * {
            visibility: visible;
          }
          #printable-certificate {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 10mm;
            background: white !important;
            box-shadow: none !important;
          }
          @page {
            size: auto;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}
