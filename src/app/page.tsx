'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useMedShare } from '@/context/MedShareContext';
import { getDaysUntilExpiry } from '@/lib/seed';
import { useIsMounted } from '@/lib/useIsMounted';
import MedicationFeed, { FilterTab } from '@/components/MedicationFeed';
import DonateModal from '@/components/DonateModal';
import VerifyModal from '@/components/VerifyModal';
import ClaimModal from '@/components/ClaimModal';
import AuthModal from '@/components/AuthModal';
import UserPortal from '@/components/UserPortal';
import RequestsBoard from '@/components/RequestsBoard';
import RequestMedicineModal from '@/components/RequestMedicineModal';
import ToastContainer from '@/components/Toast';
import TiltSpotlightCard from '@/components/ui/TiltSpotlightCard';
import SpatialRescueRadar from '@/components/hero/SpatialRescueRadar';
import { Medication, MedicineRequest } from '@/types/medshare';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pill,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Building2,
  Sparkles,
  PlusCircle,
  X,
  Info,
  LayoutDashboard,
  HeartHandshake,
  ArrowRight,
  Radio,
  Layers,
} from 'lucide-react';

export default function HomePage() {
  const {
    medications,
    openRequestsCount,
    currentUser,
    pendingVerifications,
    toasts,
    dismissToast,
    showToast,
    isDonateOpen,
    openDonateModal,
    closeDonateModal,
    isVerifyOpen,
    verifyNotice,
    openVerifyModal,
    closeVerifyModal,
    isAuthOpen,
    authMode,
    authNotice,
    openAuthModal,
    closeAuthModal,
    isRequestModalOpen,
    openRequestModal,
    closeRequestModal,
    prefillRequestForDonation,
    openDonateWithRequest,
    activeMainTab,
    setActiveMainTab,
  } = useMedShare();
  const mounted = useIsMounted();
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedMedicationForClaim, setSelectedMedicationForClaim] = useState<Medication | null>(null);
  const [activeFeedTab, setActiveFeedTab] = useState<FilterTab>('available');

  // Auto-dismiss top notification banner after 3.5 seconds with clearTimeout cleanup
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      setNotification(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [notification]);

  // Logged-out safety fallback: if user logs out while on portal, auto-switch to feed
  useEffect(() => {
    if (!currentUser && activeMainTab === 'portal') {
      setActiveMainTab('feed');
    }
  }, [currentUser, activeMainTab, setActiveMainTab]);

  const availableCount = medications.filter((m) => m.status === 'available').length;
  const expiringSoonCount = mounted
    ? medications.filter(
        (m) =>
          m.status === 'available' &&
          getDaysUntilExpiry(m.expiryDate) > 0 &&
          getDaysUntilExpiry(m.expiryDate) <= 60
      ).length
    : 0;
  const collectedCount = medications.filter((m) => m.status === 'collected').length;

  const portalBadgeCount = useMemo(() => {
    if (!currentUser) return 0;
    if (currentUser.role === 'admin') return pendingVerifications.length;

    let count = 0;
    medications.forEach((m) => {
      const isDonor =
        m.donorId === currentUser.id ||
        Boolean(m.donorName && m.donorName.toLowerCase() === currentUser.name.toLowerCase());

      // If donor: count incoming pending pickup requests
      if (isDonor) {
        const seenClaimIds = new Set<string>();
        (m.activeClaims || []).forEach((ac) => {
          if (ac.status === 'pending_pickup') {
            seenClaimIds.add(ac.claimId);
            count += 1;
          }
        });
        (m.claims || []).forEach((bc) => {
          if (
            (bc.status === 'claimed' || (bc.status as string) === 'pending_pickup') &&
            !seenClaimIds.has(bc.id)
          ) {
            seenClaimIds.add(bc.id);
            count += 1;
          }
        });
        if (
          m.status === 'claimed' &&
          (!m.claims || m.claims.length === 0) &&
          (!m.activeClaims || m.activeClaims.length === 0)
        ) {
          count += 1;
        }
      }

      // If collector: count my pending pickups
      const seenMyClaimIds = new Set<string>();
      (m.activeClaims || []).forEach((ac) => {
        if (
          ac.collectorId === currentUser.id ||
          (currentUser.name && ac.collectorName.toLowerCase() === currentUser.name.toLowerCase())
        ) {
          if (ac.status === 'pending_pickup') {
            seenMyClaimIds.add(ac.claimId);
            count += 1;
          }
        }
      });
      (m.claims || []).forEach((bc) => {
        if (
          bc.claimerId === currentUser.id ||
          (currentUser.name && bc.claimerName.toLowerCase() === currentUser.name.toLowerCase())
        ) {
          if (
            (bc.status === 'claimed' || (bc.status as string) === 'pending_pickup') &&
            !seenMyClaimIds.has(bc.id)
          ) {
            seenMyClaimIds.add(bc.id);
            count += 1;
          }
        }
      });
      if (
        (m.claimedById === currentUser.id ||
          (currentUser.name && m.claimedByName?.toLowerCase() === currentUser.name.toLowerCase())) &&
        m.status === 'claimed' &&
        (!m.claims || m.claims.length === 0) &&
        (!m.activeClaims || m.activeClaims.length === 0)
      ) {
        count += 1;
      }
    });

    return count;
  }, [currentUser, pendingVerifications.length, medications]);

  const handleDonateClick = () => {
    if (!currentUser) {
      openAuthModal('register', 'Please create an account or sign in to list unused medicines for donation.');
      return;
    }
    openDonateModal();
  };

  const handleClaimClick = (medication: Medication) => {
    // 1. If not logged in, prompt AuthModal
    if (!currentUser) {
      openAuthModal('login', 'Please sign in or create an account to claim medications.');
      return;
    }

    // 2. Prevent self-claiming own listed donation
    const isDonor =
      medication.donorId === currentUser.id ||
      Boolean(
        medication.donorName &&
          currentUser.name &&
          medication.donorName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()
      );
    if (isDonor) {
      setNotification('You are the donor of this medicine. You cannot claim your own listed donation.');
      showToast('You cannot claim your own listed medication.', 'warning', 'Donor Notice');
      return;
    }

    // 3. Admin accounts are designated for platform moderation
    if (currentUser.role === 'admin') {
      setNotification('Admin accounts are designated for platform moderation. Please sign in with an Individual or Clinic account to claim medicines.');
      showToast('Admin accounts are for moderation and verification reviews.', 'info', 'Admin Notice');
      return;
    }

    // 4. If !currentUser.isVerified, automatically open <VerifyModal /> with required notice
    if (!currentUser.isVerified) {
      openVerifyModal(
        currentUser.role === 'clinic_charity'
          ? 'Verification Required: Please verify your clinic license to claim medications in bulk.'
          : 'Verification Required: Please verify your recipient identity with your Bangladeshi NID to claim medications.'
      );
      return;
    }

    // 5. If currentUser.isVerified is true, open <ClaimModal /> for that specific medication
    setSelectedMedicationForClaim(medication);
  };

  const handleClaimSuccess = (msg: string) => {
    setNotification(msg);
    showToast(msg, 'success', 'Medicine Claimed');
    // Switch to portal so user can immediately view unlocked donor contact details and coordinate pickup
    setActiveMainTab('portal');
  };

  const handleVerifySuccess = (msg: string) => {
    setNotification(msg);
    showToast(msg, 'success', 'Verification');
  };

  const handlePostRequestClick = () => {
    if (!currentUser) {
      openAuthModal('login', 'Please sign in or create an account to post an urgent medicine request.');
      return;
    }
    if (currentUser.role === 'admin') {
      setNotification('Admin accounts are designated for platform moderation.');
      return;
    }
    if (!currentUser.isVerified) {
      openVerifyModal('Please verify your credentials (NID or Clinic License) to broadcast urgent medicine requests.');
      return;
    }
    openRequestModal();
  };

  const handleFulfillClick = (req: MedicineRequest) => {
    if (!currentUser) {
      openAuthModal('login', 'Please sign in or create an account to donate and fulfill this request.');
      return;
    }
    openDonateWithRequest(req);
  };

  const scrollToWorkspace = () => {
    const el = document.getElementById('rescue-workspace') || document.getElementById('main-feed-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleStatCardClick = (target: 'available' | 'expiring_soon' | 'requests' | 'claimed_collected') => {
    if (target === 'requests') {
      setActiveMainTab('requests');
    } else {
      setActiveMainTab('feed');
      setActiveFeedTab(target);
    }
    scrollToWorkspace();
  };

  const scrollToContent = () => {
    setActiveMainTab('feed');
    scrollToWorkspace();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/50 via-slate-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-teal-500 selection:text-white transition-colors duration-200">
      {/* Floating Global Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="flex-1">
        
        {/* ========================================================= */}
        {/* HERO SECTION: 3D SPATIAL BIOTECH STAGE & RESCUE RADAR    */}
        {/* ========================================================= */}
        <section className="relative overflow-hidden bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-950 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-white pt-28 sm:pt-32 pb-14 sm:pb-16 px-4 sm:px-6 lg:px-8 border-b border-teal-500/20 shadow-sm">
          {/* Ambient Lighting Meshes */}
          <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-teal-500/15 via-emerald-500/10 to-transparent blur-[120px] rounded-full" />
          <div className="pointer-events-none absolute top-1/4 -right-20 w-[450px] h-[450px] bg-teal-500/10 blur-[100px] rounded-full" />
          <div className="pointer-events-none absolute bottom-0 left-0 w-full h-full bg-spatial-grid-dark opacity-50" />

          <div className="relative z-10 max-w-7xl mx-auto">
            {/* 12-Column Responsive Spatial Hero Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              
              {/* Left Column: High-Impact Editorial Copy & CTAs */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Protocol Pill */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-teal-950/80 border border-teal-500/35 text-teal-300 text-[10px] sm:text-xs font-mono font-medium shadow-[0_0_15px_rgba(20,184,166,0.15)] leading-tight max-w-full"
                >
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400"></span>
                  </span>
                  <span className="truncate">VERIFIED FEFO MEDICATION REDISTRIBUTION</span>
                  <span className="text-teal-500/60 font-bold shrink-0">•</span>
                  <span className="text-teal-200 shrink-0">BANGLADESH</span>
                </motion.div>

                {/* Main Spatial Editorial Heading */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="space-y-3"
                >
                  <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
                    Bridge the Gap Between{' '}
                    <span className="bg-gradient-to-r from-teal-200 via-teal-400 to-emerald-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(45,212,191,0.25)]">
                      Surplus Medicine
                    </span>{' '}
                    &amp; Rural Healthcare
                  </h1>
                  <p className="text-base sm:text-lg text-slate-300/90 leading-relaxed font-sans max-w-2xl">
                    Every day, sealed and unexpired prescription drugs go to waste while rural clinics
                    face life-threatening shortages. MedShare synchronizes donors with verified frontline
                    recipients using a time-critical First-Expire, First-Out (FEFO) rescue engine.
                  </p>
                </motion.div>

                {/* 3D Live Trust Pills */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="flex flex-wrap items-center gap-2.5 pt-1"
                >
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-teal-500/30 text-xs text-teal-200 font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Verified NGO Outreach</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-teal-500/30 text-xs text-teal-200 font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Rural Clinic Support</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-teal-500/30 text-xs text-teal-200 font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Expiry-Aware Allocation (FEFO)</span>
                  </div>
                </motion.div>

                {/* Primary 3D Tactile CTAs */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2"
                >
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97, y: 1 }}
                    onClick={handleDonateClick}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-500 text-slate-950 font-bold text-sm shadow-[0_10px_25px_rgba(20,184,166,0.35),inset_0_1px_0_rgba(255,255,255,0.6)] border border-teal-200/50 transition cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-slate-950" />
                    <span>Donate Surplus Medicine</span>
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97, y: 1 }}
                    onClick={scrollToContent}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-teal-200 hover:text-white font-semibold text-sm border border-teal-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition cursor-pointer group"
                  >
                    <span>Explore Rescue Feed</span>
                    <ArrowRight className="w-4 h-4 text-teal-400 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </motion.div>

              </div>

              {/* Right Column: Interactive 3D Floating Glass Card Pipeline */}
              <div className="lg:col-span-5 flex justify-center lg:justify-end relative">
                <div className="pointer-events-none absolute -inset-4 rounded-full bg-teal-400/20 blur-3xl opacity-75" />
                <SpatialRescueRadar />
              </div>

            </div>

            {/* ========================================================= */}
            {/* 4 HERO STAT BOXES: 3D TELEMETRY BENTO MODULES (2x2 Mobile) */}
            {/* ========================================================= */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mt-10 sm:mt-12">
              
              {/* Stat 1: Available Medicines */}
              <TiltSpotlightCard
                spotlightColor="rgba(20, 184, 166, 0.22)"
                onClick={() => handleStatCardClick('available')}
                className="p-3.5 sm:p-6 bg-white/95 border border-slate-200/90 shadow-[0_15px_40px_-10px_rgba(15,23,42,0.12)] dark:bg-slate-900/80 dark:border-teal-500/20 cursor-pointer group/stat transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider truncate">
                    Available Meds
                  </span>
                  <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:bg-teal-500/15 dark:border-teal-400/30 dark:text-teal-300 flex items-center justify-center shadow-xs shrink-0">
                    <Pill className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>

                <div className="mt-2.5 sm:mt-4 flex items-baseline gap-1.5 sm:gap-2 transform transition-transform duration-300 group-hover:translate-z-6">
                  <span className="font-mono text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {availableCount}
                  </span>
                  <span className="text-[10px] sm:text-xs font-mono text-slate-500 dark:text-slate-400 font-medium">in stock</span>
                </div>

                <p className="line-clamp-2 text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-1 sm:mt-2 leading-snug sm:leading-relaxed">
                  Unopened, valid medications ready for clinic or patient claiming.
                </p>

                {/* Mini Segmented Indicator */}
                <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 sm:gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="hidden sm:inline">LIVE TELEMETRY</span>
                    <span className="sm:hidden">LIVE</span>
                  </span>
                  <span className="text-teal-700 dark:text-teal-400 font-bold group-hover/stat:translate-x-0.5 transition-transform flex items-center gap-0.5 sm:gap-1">
                    <span>Filter &rarr;</span>
                  </span>
                </div>
              </TiltSpotlightCard>

              {/* Stat 2: Expiring Soon (≤ 60d) */}
              <TiltSpotlightCard
                spotlightColor="rgba(245, 158, 11, 0.22)"
                onClick={() => handleStatCardClick('expiring_soon')}
                className="p-3.5 sm:p-6 bg-white/95 border border-slate-200/90 shadow-[0_15px_40px_-10px_rgba(15,23,42,0.12)] dark:bg-slate-900/80 dark:border-teal-500/20 cursor-pointer group/stat transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider truncate">
                    Expiring Soon
                  </span>
                  <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:bg-amber-500/15 dark:border-amber-400/30 dark:text-amber-300 flex items-center justify-center shadow-xs shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>

                <div className="mt-2.5 sm:mt-4 flex items-baseline gap-1.5 sm:gap-2 transform transition-transform duration-300 group-hover:translate-z-6">
                  <span className="font-mono text-2xl sm:text-4xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
                    {expiringSoonCount}
                  </span>
                  <span className="text-[10px] sm:text-xs font-mono text-slate-500 dark:text-slate-400 font-medium">priority</span>
                </div>

                <p className="line-clamp-2 text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-1 sm:mt-2 leading-snug sm:leading-relaxed">
                  Nearing expiry window requiring immediate allocation to prevent waste.
                </p>

                {/* Mini Alert Radar Indicator */}
                <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 sm:gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>&le; 60D</span>
                  </span>
                  <span className="text-amber-700 dark:text-amber-400 font-bold group-hover/stat:translate-x-0.5 transition-transform flex items-center gap-0.5 sm:gap-1">
                    <span>Filter &rarr;</span>
                  </span>
                </div>
              </TiltSpotlightCard>

              {/* Stat 3: Urgent Requests Board */}
              <TiltSpotlightCard
                spotlightColor="rgba(244, 63, 94, 0.22)"
                onClick={() => handleStatCardClick('requests')}
                className="p-3.5 sm:p-6 bg-white/95 border border-slate-200/90 shadow-[0_15px_40px_-10px_rgba(15,23,42,0.12)] dark:bg-slate-900/80 dark:border-teal-500/20 cursor-pointer group/stat transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider truncate">
                    Urgent Requests
                  </span>
                  <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:bg-rose-500/15 dark:border-rose-400/30 dark:text-rose-300 flex items-center justify-center shadow-xs shrink-0">
                    <HeartHandshake className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>

                <div className="mt-2.5 sm:mt-4 flex items-baseline gap-1.5 sm:gap-2 transform transition-transform duration-300 group-hover:translate-z-6">
                  <span className="font-mono text-2xl sm:text-4xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
                    {openRequestsCount}
                  </span>
                  <span className="text-[10px] sm:text-xs font-mono text-slate-500 dark:text-slate-400 font-medium">needed</span>
                </div>

                <p className="line-clamp-2 text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-1 sm:mt-2 leading-snug sm:leading-relaxed">
                  Shortages posted by rural clinics and patients waiting for donors.
                </p>

                {/* Clickable indicator */}
                <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 sm:gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    <span className="hidden sm:inline">VIEW SHORTAGES</span>
                    <span className="sm:hidden">RADAR</span>
                  </span>
                  <span className="text-rose-700 dark:text-rose-400 font-bold group-hover/stat:translate-x-0.5 transition-transform flex items-center gap-0.5 sm:gap-1">
                    <span>Board &rarr;</span>
                  </span>
                </div>
              </TiltSpotlightCard>

              {/* Stat 4: Medicines Collected */}
              <TiltSpotlightCard
                spotlightColor="rgba(6, 182, 212, 0.22)"
                onClick={() => handleStatCardClick('claimed_collected')}
                className="p-3.5 sm:p-6 bg-white/95 border border-slate-200/90 shadow-[0_15px_40px_-10px_rgba(15,23,42,0.12)] dark:bg-slate-900/80 dark:border-teal-500/20 cursor-pointer group/stat transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider truncate">
                    Collected
                  </span>
                  <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:bg-cyan-500/15 dark:border-cyan-400/30 dark:text-cyan-300 flex items-center justify-center shadow-xs shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>

                <div className="mt-2.5 sm:mt-4 flex items-baseline gap-1.5 sm:gap-2 transform transition-transform duration-300 group-hover:translate-z-6">
                  <span className="font-mono text-2xl sm:text-4xl font-extrabold text-teal-700 dark:text-teal-300 tracking-tight">
                    {collectedCount}
                  </span>
                  <span className="text-[10px] sm:text-xs font-mono text-slate-500 dark:text-slate-400 font-medium">rescued</span>
                </div>

                <p className="line-clamp-2 text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-1 sm:mt-2 leading-snug sm:leading-relaxed">
                  Successfully handed over to clinics, charities, or patients.
                </p>

                {/* Redistribution stamp */}
                <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  <span className="text-teal-700 dark:text-cyan-400 font-semibold flex items-center gap-1 sm:gap-1.5">
                    <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-teal-600 dark:text-cyan-400" />
                    <span className="hidden sm:inline">VERIFIED</span>
                    <span className="sm:hidden">SAFE</span>
                  </span>
                  <span className="text-cyan-700 dark:text-cyan-400 font-bold group-hover/stat:translate-x-0.5 transition-transform flex items-center gap-0.5 sm:gap-1">
                    <span>Filter &rarr;</span>
                  </span>
                </div>
              </TiltSpotlightCard>

            </div>

          </div>
        </section>

        {/* ========================================================= */}
        {/* MAIN CANVAS: COHESIVE MULTI-LAYERED SPATIAL SURFACE       */}
        {/* ========================================================= */}
        <section
          id="rescue-workspace"
          className="relative min-h-[700px] scroll-mt-24 bg-gradient-to-b from-teal-50/50 via-slate-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 border-t border-slate-200/80 dark:border-teal-500/20 py-10 px-4 sm:px-6 lg:px-8 space-y-8"
        >
          {/* Alias anchor for main-feed-section */}
          <span id="main-feed-section" className="absolute -top-24 pointer-events-none" />
          {/* Subtle Ambient Radial Lighting Meshes for Smooth Gradient Canvas */}
          <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-spatial-grid-light dark:bg-spatial-grid-dark opacity-40 dark:opacity-60" />
          <div className="pointer-events-none absolute top-12 left-1/4 w-[500px] h-[300px] bg-teal-500/5 blur-[100px] rounded-full" />
          <div className="pointer-events-none absolute top-40 right-1/4 w-[400px] h-[300px] bg-emerald-500/5 blur-[100px] rounded-full" />

          <div className="relative z-10 max-w-7xl mx-auto space-y-6">
            
            {/* Dynamic Notification Banner */}
            <AnimatePresence>
              {notification && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-teal-50 dark:bg-teal-950/90 border border-teal-300 dark:border-teal-400/40 text-teal-900 dark:text-teal-200 rounded-2xl p-4 shadow-sm dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-start justify-between gap-3 backdrop-blur-xl"
                >
                  <div className="flex items-start gap-2.5">
                    <Info className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                    <div className="text-xs sm:text-sm font-medium leading-relaxed font-sans">
                      {notification}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotification(null)}
                    className="p-1 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-white transition cursor-pointer shrink-0"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ========================================================= */}
            {/* SPRING-ANIMATED SPATIAL NAVIGATION DOCK                    */}
            {/* ========================================================= */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/85 dark:bg-slate-950/85 backdrop-blur-2xl border border-slate-200/90 dark:border-teal-500/25 p-2 rounded-2xl shadow-[0_12px_40px_rgba(15,23,42,0.06)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
              
              {/* Segmented Dock Tabs with Physical Spring Indicator */}
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scrollbar-none whitespace-nowrap p-1 max-w-full">
                
                {/* TAB 1: Live Medicine Feed */}
                <button
                  type="button"
                  onClick={() => setActiveMainTab('feed')}
                  className={`relative px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-2 rounded-xl transition duration-200 cursor-pointer shrink-0 ${
                    activeMainTab === 'feed'
                      ? 'text-slate-950'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  {activeMainTab === 'feed' && (
                    <motion.div
                      layoutId="activeMainTab"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-400 shadow-[0_0_20px_rgba(20,184,166,0.35),inset_0_1px_0_rgba(255,255,255,0.6)]"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <Pill className="w-4 h-4" />
                    <span>Live Medicine Feed</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        activeMainTab === 'feed'
                          ? 'bg-slate-950/20 text-slate-950 font-black'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-teal-300'
                      }`}
                    >
                      {availableCount}
                    </span>
                  </span>
                </button>

                {/* TAB 2: Urgent Requests Board */}
                <button
                  type="button"
                  onClick={() => setActiveMainTab('requests')}
                  className={`relative px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-2 rounded-xl transition duration-200 cursor-pointer shrink-0 ${
                    activeMainTab === 'requests'
                      ? 'text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  {activeMainTab === 'requests' && (
                    <motion.div
                      layoutId="activeMainTab"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-rose-500 to-amber-600 shadow-[0_0_20px_rgba(244,63,94,0.4),inset_0_1px_0_rgba(255,255,255,0.4)]"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <HeartHandshake className="w-4 h-4" />
                    <span>Urgent Requests Board</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        activeMainTab === 'requests'
                          ? 'bg-black/25 text-white font-black'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
                      }`}
                    >
                      {openRequestsCount}
                    </span>
                  </span>
                </button>

                {/* TAB 3: Collector & Donor Portal (Rendered ONLY when currentUser !== null) */}
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => setActiveMainTab('portal')}
                    className={`relative px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-2 rounded-xl transition duration-200 cursor-pointer shrink-0 ${
                      activeMainTab === 'portal'
                        ? 'text-slate-950'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    {activeMainTab === 'portal' && (
                      <motion.div
                        layoutId="activeMainTab"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-400 to-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4),inset_0_1px_0_rgba(255,255,255,0.6)]"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4" />
                      <span>{currentUser.role === 'admin' ? 'Admin Moderator Desk' : 'Collector & Donor Portal'}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          activeMainTab === 'portal'
                            ? 'bg-slate-950/20 text-slate-950 font-black'
                            : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-500/30'
                        }`}
                      >
                        {portalBadgeCount}
                      </span>
                    </span>
                  </button>
                )}
              </div>

              {/* Contextual Action Button */}
              <div className="hidden sm:flex items-center gap-3 pr-2 shrink-0">
                {activeMainTab === 'feed' && (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.97, y: 1 }}
                    onClick={handleDonateClick}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs shadow-[0_4px_16px_rgba(20,184,166,0.3),inset_0_1px_0_rgba(255,255,255,0.4)] transition cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-slate-950" />
                    <span>Donate Medicine</span>
                  </motion.button>
                )}

                {activeMainTab === 'requests' && (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.97, y: 1 }}
                    onClick={handlePostRequestClick}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold text-xs shadow-[0_4px_16px_rgba(244,63,94,0.3),inset_0_1px_0_rgba(255,255,255,0.3)] transition cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-white" />
                    <span>Post Urgent Request</span>
                  </motion.button>
                )}
              </div>
            </div>

            {/* ========================================================= */}
            {/* VIEW 1: LIVE MEDICINE RESCUE FEED                         */}
            {/* ========================================================= */}
            {activeMainTab === 'feed' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      Live Medication Rescue Feed
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Browse available unexpired medicines sorted first-to-expire (FEFO). Filter by urgency or nearby location.
                    </p>
                  </div>

                  <div className="sm:hidden">
                    <button
                      type="button"
                      onClick={handleDonateClick}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4 text-slate-950" />
                      <span>Donate Medicine</span>
                    </button>
                  </div>
                </div>

                {/* Filterable Feed Container */}
                <div className="bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl border border-slate-200/90 dark:border-teal-500/20 rounded-3xl p-4 sm:p-6 shadow-sm dark:shadow-2xl">
                  <MedicationFeed
                    onClaimClick={handleClaimClick}
                    activeTab={activeFeedTab}
                    onTabChange={setActiveFeedTab}
                  />
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* VIEW 2: URGENT MEDICINE REQUESTS BOARD                    */}
            {/* ========================================================= */}
            {activeMainTab === 'requests' && (
              <div className="bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl border border-slate-200/90 dark:border-rose-500/20 rounded-3xl p-4 sm:p-6 shadow-sm dark:shadow-2xl">
                <RequestsBoard
                  onPostRequestClick={handlePostRequestClick}
                  onFulfillClick={handleFulfillClick}
                />
              </div>
            )}

            {/* ========================================================= */}
            {/* VIEW 3: COLLECTOR & DONOR PORTAL                          */}
            {/* ========================================================= */}
            {activeMainTab === 'portal' && (
              <div className="bg-slate-950/70 backdrop-blur-xl border border-teal-500/20 rounded-3xl p-4 sm:p-6 shadow-2xl">
                <UserPortal onBackToFeed={() => setActiveMainTab('feed')} />
              </div>
            )}

          </div>
        </section>
      </div>

      {/* ========================================================= */}
      {/* MODALS & WORKFLOW OVERLAYS                                */}
      {/* ========================================================= */}

      {/* Donate Medicine Modal */}
      {isDonateOpen && (
        <DonateModal
          isOpen={isDonateOpen}
          onClose={closeDonateModal}
          onSuccess={(msg) => setNotification(msg)}
          prefillRequest={prefillRequestForDonation}
        />
      )}

      {/* Urgent Request Medicine Modal */}
      {isRequestModalOpen && (
        <RequestMedicineModal
          isOpen={isRequestModalOpen}
          onClose={closeRequestModal}
          onSuccess={(msg) => {
            setNotification(msg);
            showToast(msg, 'success', 'Request Broadcasted');
            setActiveMainTab('requests');
          }}
        />
      )}

      {/* Collector Verification Modal */}
      {isVerifyOpen && (
        <VerifyModal
          isOpen={isVerifyOpen}
          onClose={closeVerifyModal}
          onSuccess={handleVerifySuccess}
          notice={verifyNotice}
        />
      )}

      {/* Claim Medicine Modal */}
      {selectedMedicationForClaim && (
        <ClaimModal
          isOpen={!!selectedMedicationForClaim}
          medication={selectedMedicationForClaim}
          onClose={() => setSelectedMedicationForClaim(null)}
          onSuccess={handleClaimSuccess}
          onViewClaimed={() => {
            setActiveMainTab('portal');
          }}
        />
      )}

      {/* Authentication Modal */}
      {isAuthOpen && (
        <AuthModal
          isOpen={isAuthOpen}
          mode={authMode}
          notice={authNotice}
          onClose={closeAuthModal}
          onSuccess={(msg) => setNotification(msg)}
        />
      )}

      {/* Safety Boundary Protocol Footer */}
      <footer className="mt-16 border-t border-slate-200/80 dark:border-teal-500/20 bg-white/80 dark:bg-slate-950/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 dark:border-teal-400/30 flex items-center justify-center text-teal-600 dark:text-teal-300 shrink-0 shadow-xs">
                <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-300" />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                <strong className="text-slate-900 dark:text-white font-semibold">Safety Boundary Protocol:</strong>{' '}
                MedShare strictly limits redistribution to sealed, unexpired medicines. Collectors and clinic representatives must inspect packaging integrity and physical batch serials upon in-person handover.
              </p>
            </div>
            <div className="text-xs text-teal-700 dark:text-teal-400/80 font-mono shrink-0">
              MedShare Protocol • 3D Spatial Biotech Engine
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
