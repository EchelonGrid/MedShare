'use client';

import React, { useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import {
  ShieldCheck,
  MapPin,
  Clock,
  CheckCircle2,
  Lock,
  Activity,
  Zap,
} from 'lucide-react';

export default function SpatialRescueRadar() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const normX = useMotionValue(0);
  const normY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 200, mass: 0.6 };
  const rotateX = useSpring(useTransform(normY, [-1, 1], [10, -10]), springConfig);
  const rotateY = useSpring(useTransform(normX, [-1, 1], [-10, 10]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mouseX.set(x);
    mouseY.set(y);

    const nx = Math.max(-1, Math.min(1, (x / rect.width - 0.5) * 2));
    const ny = Math.max(-1, Math.min(1, (y / rect.height - 0.5) * 2));
    normX.set(nx);
    normY.set(ny);
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    normX.set(0);
    normY.set(0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-[460px] sm:max-w-[490px] flex items-center justify-center select-none py-2"
      style={{ perspective: 1200 }}
    >
      {/* Ambient Radial Glowing Aura behind 3D Pipeline */}
      <div className="pointer-events-none absolute w-80 sm:w-96 h-80 sm:h-96 rounded-full bg-teal-400/20 blur-3xl animate-pulse-glow z-0" />
      <div className="pointer-events-none absolute w-64 h-64 rounded-full bg-emerald-500/15 blur-2xl z-0" />

      {/* Dynamic 3D Spatial Pipeline Stage */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
        className="relative w-full flex flex-col space-y-3 sm:space-y-3.5 preserve-3d"
      >
        {/* ========================================================= */}
        {/* LAYER 0 (Z: 0px): AMBIENT COORDINATES & CONCENTRIC RINGS  */}
        {/* ========================================================= */}
        <div
          className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
          style={{ transform: 'translateZ(0px)' }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[380px] h-[380px] rounded-full border border-teal-500/15 animate-spin-slow" />
            <div className="w-[280px] h-[280px] rounded-full border border-dashed border-teal-400/20 animate-spin-reverse-slow" />
          </div>
        </div>

        {/* ========================================================= */}
        {/* CARD 1 (Top / Back Layer — translateZ(20px))              */}
        {/* 01 // SURPLUS BATCH VERIFIED                              */}
        {/* ========================================================= */}
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            transform: 'translateZ(20px)',
            transformStyle: 'preserve-3d',
          }}
          className="mr-auto w-full max-w-sm z-10 pointer-events-auto"
        >
          <div className="relative rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-teal-400/35 p-4 shadow-[0_20px_45px_rgba(0,0,0,0.5),0_0_20px_rgba(20,184,166,0.15)] text-white space-y-2.5 transition-transform duration-300 hover:scale-[1.02]">
            {/* Top specular highlight rim */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-teal-300/60 to-transparent rounded-t-2xl" />

            {/* Header / Pipeline Step */}
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="font-extrabold text-teal-300 tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span>01 // SURPLUS BATCH VERIFIED</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>ACTIVE RESCUE</span>
              </span>
            </div>

            {/* Drug Info */}
            <div className="space-y-0.5">
              <div className="flex items-baseline justify-between">
                <h4 className="font-display font-extrabold text-base text-white tracking-tight">
                  Napa Extend 665mg
                </h4>
                <span className="text-[10px] font-mono font-bold text-teal-300 px-2 py-0.5 rounded bg-teal-950/80 border border-teal-500/30">
                  BATCH #BD-904
                </span>
              </div>
              <p className="text-xs text-teal-200/80 font-medium">
                Paracetamol • 30 Sealed Tablets
              </p>
            </div>

            {/* Location & Safety Badge */}
            <div className="pt-2 border-t border-teal-500/20 flex flex-wrap items-center justify-between gap-1.5 text-[11px] font-mono">
              <div className="flex items-center gap-1.5 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span className="truncate">Dhaka Central Hub</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>✓ 3-Point Seal Check Passed</span>
              </span>
            </div>
          </div>
        </motion.div>

        {/* ========================================================= */}
        {/* CONNECTOR ROW 1 -> 2 (Clean vertical flow between 1 & 2)  */}
        {/* ========================================================= */}
        <div
          style={{
            transform: 'translateZ(35px)',
            transformStyle: 'preserve-3d',
          }}
          className="flex items-center gap-3 px-5 sm:px-7 py-0.5 z-15"
        >
          <div className="h-6 w-0.5 bg-gradient-to-b from-teal-400 to-amber-400 shadow-[0_0_8px_rgba(20,184,166,0.5)] rounded-full shrink-0" />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[10px] font-mono font-bold shadow-[0_0_15px_rgba(245,158,11,0.25)] backdrop-blur-md animate-pulse">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>⚡ FEFO Priority Match • 18d Left</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CARD 2 (Center / Middle Layer — translateZ(50px))         */}
        {/* 02 // AUTOMATED FEFO & REGISTRY ENGINE                    */}
        {/* ========================================================= */}
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          style={{
            transform: 'translateZ(50px)',
            transformStyle: 'preserve-3d',
          }}
          className="ml-auto w-full max-w-sm z-20 pointer-events-auto"
        >
          <div className="relative rounded-2xl bg-gradient-to-br from-teal-950/95 via-slate-900/95 to-slate-950/95 backdrop-blur-2xl border border-amber-400/45 p-4 shadow-[0_25px_50px_rgba(0,0,0,0.55),0_0_25px_rgba(245,158,11,0.18)] text-white space-y-2.5 transition-transform duration-300 hover:scale-[1.02]">
            {/* Top specular highlight rim */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-300/60 to-transparent rounded-t-2xl" />

            {/* Header / Pipeline Step */}
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="font-extrabold text-amber-300 tracking-wider flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-amber-400" />
                <span>02 // AUTOMATED FEFO &amp; REGISTRY</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/35 shadow-[0_0_8px_rgba(16,185,129,0.25)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>● AUTO-VERIFIED IN 0.4s</span>
              </span>
            </div>

            {/* Telemetry rows in JetBrains Mono */}
            <div className="space-y-1.5 text-xs font-mono bg-slate-950/80 p-2.5 rounded-xl border border-teal-500/20">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">MATCHED RECIPIENT:</span>
                <span className="text-white font-bold text-[11px] truncate">Bogura SZMCH Clinic</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-teal-500/10">
                <span className="text-slate-400 text-[11px]">CREDENTIAL:</span>
                <span className="text-teal-300 font-bold text-[11px]">DGHS-1105 &amp; BMDC Rx #A-45892</span>
              </div>
            </div>

            {/* Urgency Meter */}
            <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-amber-200/90">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Critical Shortage Dispatched</span>
              </span>
              <span className="font-extrabold text-amber-300">FEFO SCORE: 98.4%</span>
            </div>
          </div>
        </motion.div>

        {/* ========================================================= */}
        {/* CONNECTOR ROW 2 -> 3 (Clean vertical flow between 2 & 3)  */}
        {/* ========================================================= */}
        <div
          style={{
            transform: 'translateZ(65px)',
            transformStyle: 'preserve-3d',
          }}
          className="flex items-center justify-end sm:justify-center gap-3 px-5 sm:px-7 py-0.5 z-25"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-mono font-bold shadow-[0_0_15px_rgba(16,185,129,0.25)] backdrop-blur-md animate-pulse">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>🔐 Cryptographic 48h Escrow Handover</span>
          </div>
          <div className="h-6 w-0.5 bg-gradient-to-b from-amber-400 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)] rounded-full shrink-0" />
        </div>

        {/* ========================================================= */}
        {/* CARD 3 (Foreground Layer — translateZ(85px))              */}
        {/* 03 // CRYPTOGRAPHIC PIN HANDOVER                          */}
        {/* ========================================================= */}
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          style={{
            transform: 'translateZ(85px)',
            transformStyle: 'preserve-3d',
          }}
          className="mx-auto w-full max-w-sm z-30 pointer-events-auto"
        >
          <div className="relative rounded-2xl bg-white dark:bg-slate-900 border-2 border-emerald-400/70 p-4 shadow-[0_30px_60px_rgba(16,185,129,0.22)] text-slate-900 dark:text-white space-y-2.5 transition-transform duration-300 hover:scale-[1.02]">
            {/* Top specular highlight rim */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent rounded-t-2xl" />

            {/* Header / Pipeline Step */}
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>03 // CRYPTOGRAPHIC PIN HANDOVER</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-400/40 shadow-[0_0_10px_rgba(16,185,129,0.25)]">
                <span>✓ 30 TABLETS RESCUED</span>
              </span>
            </div>

            {/* Location & Status */}
            <div>
              <h4 className="font-display font-extrabold text-sm text-slate-900 dark:text-white">
                Pabna Sadar Clinic • Handover Complete
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans mt-0.5">
                Patient received sealed medication via verified volunteer courier.
              </p>
            </div>

            {/* 4 Mini Laser-Etched Monospace PIN Boxes */}
            <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-teal-500/20 flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 uppercase">
                HANDOVER PIN:
              </span>
              <div className="flex items-center gap-1.5 font-mono">
                {['7', '3', '9', '2'].map((digit, i) => (
                  <span
                    key={i}
                    className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-slate-900 border border-emerald-400/50 text-emerald-700 dark:text-emerald-300 font-mono font-extrabold text-xs flex items-center justify-center shadow-xs"
                  >
                    {digit}
                  </span>
                ))}
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                ✓ VERIFIED
              </span>
            </div>

            {/* Audit Stamp */}
            <div className="flex items-center justify-between text-[10px] font-mono text-teal-700 dark:text-teal-300/90 pt-1 border-t border-slate-200 dark:border-teal-500/15">
              <span>100% AUDITED</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">SAFE PATIENT INGESTION</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
