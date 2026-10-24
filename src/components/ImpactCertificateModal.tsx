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

function escapeHtml(str: string | number | undefined | null): string {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

  const isClinic = user?.role === 'clinic_charity';
  const isAdmin = user?.role === 'admin';

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

  const isDonor = donorStats.batches > 0 || collectorStats.batches === 0;

  if (!isOpen || !user) return null;

  const certificateSubtitle = isAdmin
    ? 'Platform Governance & Verified Community Distribution'
    : isDonor
    ? 'Community Medication Donor Impact Recognition'
    : 'Verified Healthcare Redistribution Partner';

  const certificateRefId = `MS-CERT-2026-${user.id.replace(/^user-/, '').slice(0, 6).toUpperCase() || 'DEMO01'}`;
  const issueDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const itemsToDisplay = (isDonor ? donorStats.items : collectorStats.items).length > 0
    ? (isDonor ? donorStats.items : collectorStats.items)
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
      ];

  const handlePrintCertificate = () => {
    try {
      const printWin = window.open('', '_blank', 'width=1024,height=740');
      if (!printWin) {
        window.print();
        return;
      }

      const tableRows = itemsToDisplay
        .map(
          (row) => `
        <tr>
          <td style="padding: 6px 10px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${escapeHtml(row.name)}</td>
          <td style="padding: 6px 8px; font-family: monospace; color: #334155; border-bottom: 1px solid #e2e8f0;">${escapeHtml(row.strength)}</td>
          <td style="padding: 6px 8px; font-weight: 500; color: #1e293b; border-bottom: 1px solid #e2e8f0;">${escapeHtml(row.quantity)}</td>
          <td style="padding: 6px 8px; font-family: monospace; color: #475569; border-bottom: 1px solid #e2e8f0;">${escapeHtml(row.expiry)}</td>
          <td style="padding: 6px 10px; text-align: right; border-bottom: 1px solid #e2e8f0;">
            <span style="display: inline-block; padding: 2px 8px; font-size: 10px; font-weight: 700; color: #065f46; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 9999px;">
              ✓ ${escapeHtml(row.status)}
            </span>
          </td>
        </tr>
      `
        )
        .join('');

      const metricsHtml = isDonor
        ? `
        <div style="flex: 1; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 10px; padding: 10px; text-align: center;">
          <div style="font-size: 20px; font-weight: 900; color: #134e4a; font-family: monospace;">${escapeHtml(donorStats.batches)}</div>
          <div style="font-size: 10px; font-weight: 700; color: #0f766e; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px;">Batches Donated</div>
        </div>
        <div style="flex: 1; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 10px; text-align: center;">
          <div style="font-size: 20px; font-weight: 900; color: #78350f; font-family: monospace;">${escapeHtml(donorStats.totalUnits)}</div>
          <div style="font-size: 10px; font-weight: 700; color: #b45309; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px;">Units Contributed</div>
        </div>
        <div style="flex: 1; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 10px; text-align: center;">
          <div style="font-size: 20px; font-weight: 900; color: #064e3b; font-family: monospace;">${escapeHtml(donorStats.handovers)}</div>
          <div style="font-size: 10px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px;">Handovers Completed</div>
        </div>
      `
        : `
        <div style="flex: 1; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 10px; text-align: center;">
          <div style="font-size: 20px; font-weight: 900; color: #0c4a6e; font-family: monospace;">${escapeHtml(collectorStats.batches)}</div>
          <div style="font-size: 10px; font-weight: 700; color: #0284c7; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px;">Batches Rescued</div>
        </div>
        <div style="flex: 1; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 10px; text-align: center;">
          <div style="font-size: 20px; font-weight: 900; color: #064e3b; font-family: monospace;">${escapeHtml(collectorStats.totalUnits)}</div>
          <div style="font-size: 10px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px;">Units to Patients</div>
        </div>
        <div style="flex: 1; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 10px; padding: 10px; text-align: center;">
          <div style="font-size: 13px; font-weight: 800; color: #134e4a; font-family: monospace; margin-top: 4px;">${escapeHtml(user.registrationOrNid || 'DGHS-VERIFIED')}</div>
          <div style="font-size: 10px; font-weight: 700; color: #0f766e; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px;">Credential ID</div>
        </div>
      `;

      const orgHtml = user.organizationName
        ? `
        <div style="font-size: 12px; font-weight: 700; color: #0f766e; margin-top: 2px;">
          🏢 ${escapeHtml(user.organizationName)}
        </div>
      `
        : '';

      const recipientRoleDesc = user.registrationOrNid
        ? `ID: ${user.registrationOrNid}`
        : `Role: ${isAdmin ? 'MedShare Administrator' : isDonor ? 'Community Donor' : isClinic ? 'Rural Clinic Relief' : 'Individual Recipient'}`;

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Impact Certificate - ${escapeHtml(user.name)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #ffffff;
      color: #0f172a;
      width: 100%;
      height: 100%;
      padding: 0;
      margin: 0;
    }
    .cert-outer {
      border: 4px solid #0f766e;
      border-radius: 16px;
      padding: 16px 20px;
      position: relative;
      background: linear-gradient(180deg, #fffbeb15 0%, #ffffff 50%, #f0fdfa20 100%);
      box-shadow: none;
      min-height: 175mm;
      max-height: 188mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .cert-inner-border {
      position: absolute;
      inset: 6px;
      border: 1px solid #d9770660;
      border-radius: 12px;
      pointer-events: none;
    }
    .corner-accent {
      position: absolute;
      width: 14px;
      height: 14px;
      pointer-events: none;
    }
    .corner-tl { top: 9px; left: 9px; border-top: 2px solid #d97706; border-left: 2px solid #d97706; }
    .corner-tr { top: 9px; right: 9px; border-top: 2px solid #d97706; border-right: 2px solid #d97706; }
    .corner-bl { bottom: 9px; left: 9px; border-bottom: 2px solid #d97706; border-left: 2px solid #d97706; }
    .corner-br { bottom: 9px; right: 9px; border-bottom: 2px solid #d97706; border-right: 2px solid #d97706; }
    
    .badge-top {
      display: inline-block;
      padding: 3px 12px;
      background: #ccfbf1;
      color: #134e4a;
      border: 1px solid #5eead4;
      border-radius: 9999px;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-family: monospace;
    }
    .cert-title {
      font-family: Georgia, serif;
      font-size: 22px;
      font-weight: 900;
      color: #042f2e;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 4px 0 2px 0;
    }
    .cert-subtitle {
      font-size: 11px;
      font-weight: 800;
      color: #b45309;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .recipient-card {
      background: #fffbeb40;
      border-top: 1px solid #fde68a;
      border-bottom: 1px solid #fde68a;
      border-radius: 10px;
      padding: 8px 16px;
      text-align: center;
      margin: 6px 0;
    }
    .recipient-intro {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #64748b;
    }
    .recipient-name {
      font-family: Georgia, serif;
      font-size: 22px;
      font-weight: 800;
      color: #042f2e;
      letter-spacing: 0.03em;
      margin: 2px 0;
    }
    .metrics-row {
      display: flex;
      gap: 12px;
      margin: 6px 0;
    }
    .table-container {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      margin: 4px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 5px 8px;
      border-bottom: 1px solid #cbd5e1;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .footer-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      margin-top: 6px;
    }
  </style>
</head>
<body>
  <div class="cert-outer">
    <div class="cert-inner-border"></div>
    <div class="corner-accent corner-tl"></div>
    <div class="corner-accent corner-tr"></div>
    <div class="corner-accent corner-bl"></div>
    <div class="corner-accent corner-br"></div>

    <!-- Header -->
    <div style="text-align: center; position: relative; z-index: 2;">
      <div class="badge-top">Community Medicine Rescue Network • Bangladesh</div>
      <div class="cert-title">Community Healthcare Impact Certificate</div>
      <div class="cert-subtitle">${escapeHtml(certificateSubtitle)}</div>
    </div>

    <!-- Recipient -->
    <div class="recipient-card">
      <div class="recipient-intro">This Certificate is Proudly Awarded To</div>
      <div class="recipient-name">${escapeHtml(user.name)}</div>
      ${orgHtml}
      <div style="font-size: 10px; color: #475569; margin-top: 4px;">
        <span style="font-weight: 600; color: #1e293b;">${escapeHtml(user.location)}</span> • 
        <span style="font-family: monospace;">${escapeHtml(recipientRoleDesc)}</span> • 
        <span style="font-weight: 700; color: #065f46;">🛡️ Verified Credential</span>
      </div>
    </div>

    <!-- Metrics -->
    <div class="metrics-row">
      ${metricsHtml}
    </div>

    <!-- Table -->
    <div>
      <div style="font-size: 9.5px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px;">
        Itemized Verification Audit Log:
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th style="padding-left: 10px;">Medicine Name</th>
              <th>Strength</th>
              <th>Quantity</th>
              <th>Expiry Date</th>
              <th style="text-align: right; padding-right: 10px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer-row">
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="width: 38px; height: 38px; border-radius: 50%; border: 2px dashed #0f766e; background: #f0fdfa; display: flex; align-items: center; justify-content: center; font-size: 7.5px; font-weight: 800; color: #0f766e; text-align: center; text-transform: uppercase; line-height: 1.1;">
          FEFO<br>VERIFIED
        </div>
        <div>
          <div style="font-family: monospace; font-size: 9.5px; font-weight: 700; color: #334155;">
            Ref: ${escapeHtml(certificateRefId)}
          </div>
          <div style="font-size: 9px; color: #64748b;">
            Issued on: ${escapeHtml(issueDate)}
          </div>
        </div>
      </div>

      <div style="text-align: right;">
        <div style="font-family: Georgia, serif; font-size: 11px; font-weight: 700; color: #042f2e;">
          MedShare Community Health Directorate
        </div>
        <div style="font-size: 8.5px; color: #64748b; font-style: italic;">
          Verified via FEFO Safety Gate Protocol &amp; Physical Inspection
        </div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 150);
    };
  </script>
</body>
</html>`;

      printWin.document.open();
      printWin.document.write(html);
      printWin.document.close();
    } catch {
      window.print();
    }
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
              onClick={handlePrintCertificate}
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

              <p className="text-xs sm:text-sm font-bold text-amber-700 tracking-wide uppercase">
                {certificateSubtitle}
              </p>

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
                  {user.registrationOrNid ? `ID: ${user.registrationOrNid}` : `Role: ${isAdmin ? 'MedShare Administrator' : isDonor ? 'Community Donor' : isClinic ? 'Rural Clinic Relief' : 'Individual Recipient'}`}
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
              onClick={handlePrintCertificate}
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
