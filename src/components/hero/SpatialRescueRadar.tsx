'use client';

import React, { useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import {
  Pill,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  Activity,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export default function SpatialRescueRadar() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const normX = useMotionValue(0);
  const normY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 200, mass: 0.6 };
  const rotateX = useSpring(useTransform(normY, [-1, 1], [14, -14]), springConfig);
  const rotateY = useSpring(useTransform(normX, [-1, 1], [-14, 14]), springConfig);

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
      className="relative w-full h-[460px] sm:h-[500px] lg:h-[540px] flex items-center justify-center select-none"
      style={{ perspective: 1200 }}
    >
      {/* Dynamic 3D Spatial Stage */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
        className="relative w-full max-w-[480px] h-full flex items-center justify-center"
      >
        {/* ========================================================= */}
        {/* LAYER 0 (Z: 0px): AMBIENT LIGHT & SPATIAL RADAR RINGS    */}
        {/* ========================================================= */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ transform: 'translateZ(0px)' }}
        >
          {/* Central Radial Light Glow */}
          <div className="absolute w-80 h-80 rounded-full bg-teal-500/20 blur-3xl animate-pulse-glow" />
          <div className="absolute w-60 h-60 rounded-full bg-emerald-500/15 blur-2xl" />

          {/* Holographic Radar Concentric Circles */}
          <div className="absolute w-[340px] h-[340px] rounded-full border border-teal-500/20 animate-spin-slow" />
          <div className="absolute w-[260px] h-[260px] rounded-full border border-dashed border-teal-400/25 animate-spin-reverse-slow" />
          <div className="absolute w-[180px] h-[180px] rounded-full border border-teal-500/30" />

          {/* Coordinate Crosshairs */}
          <div className="absolute w-[360px] h-[1px] bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
          <div className="absolute h-[360px] w-[1px] bg-gradient-to-b from-transparent via-teal-500/30 to-transparent" />
        </div>

        {/* ========================================================= */}
        {/* LAYER 1 (Z: 20px - 50px): 3D ISOMETRIC BLISTER PACK & SCAN */}
        {/* ========================================================= */}
        <div
          className="relative z-10 flex items-center justify-center pointer-events-none"
          style={{
            transform: 'translateZ(30px) rotateX(15deg) rotateY(-12deg)',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Metallic Blister Pack Base Frame */}
          <div className="relative w-64 h-72 rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-800/85 to-teal-950/90 border border-teal-400/40 p-4 shadow-[0_25px_60px_rgba(0,0,0,0.6),0_0_35px_rgba(20,184,166,0.2)] backdrop-blur-2xl">
            {/* Top specular rim */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-teal-300/60 to-transparent rounded-t-3xl" />

            {/* Holographic Header Bar on Blister Pack */}
            <div className="flex items-center justify-between pb-3 border-b border-teal-500/20 text-[10px] font-mono text-teal-300/90">
              <span className="flex items-center gap-1.5 font-bold tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>LOT #BD-2026-FEFO</span>
              </span>
              <span className="text-teal-400/80 font-bold">VERIFIED SEAL</span>
            </div>

            {/* 2x3 Blister Wells Grid */}
            <div className="grid grid-cols-2 gap-3.5 mt-3.5">
              {[1, 2, 3, 4, 5, 6].map((cell, idx) => (
                <div
                  key={idx}
                  className="relative h-14 rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-950/90 border border-teal-500/25 flex items-center justify-center overflow-hidden shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)] group/cell"
                >
                  {/* Metallic well highlight */}
                  <div className="absolute inset-0 bg-radial-at-t from-teal-400/10 via-transparent to-transparent" />
                  
                  {/* Miniature Sealed Capsule in Each Well */}
                  <div className="relative w-8 h-4 rounded-full bg-gradient-to-r from-teal-400 via-emerald-400 to-slate-700 shadow-sm border border-white/20 transform -rotate-12 flex items-center justify-between px-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/60 blur-[0.5px]" />
                    <div className="text-[7px] font-mono text-white/90 font-bold leading-none">RX</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Scanning Laser Beam traversing the pack */}
            <motion.div
              animate={{
                top: ['12%', '86%', '12%'],
                opacity: [0.4, 0.9, 0.4],
              }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-teal-300 to-transparent shadow-[0_0_12px_#2dd4bf,0_0_24px_#14b8a6] pointer-events-none z-30"
            />

            {/* Footer Telemetry Stamp */}
            <div className="mt-3.5 pt-2 flex items-center justify-between text-[9px] font-mono text-teal-400/70">
              <span>NAPA EXTEND • 665MG</span>
              <span className="text-emerald-300 font-semibold">100% STERILE</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* LAYER 2 (Z: 60px): FLOATING 3D CAPSULE CORE               */}
        {/* ========================================================= */}
        <motion.div
          animate={{
            y: [-6, 6, -6],
            rotateZ: [-2, 2, -2],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            transform: 'translateZ(65px)',
            transformStyle: 'preserve-3d',
          }}
          className="absolute z-20 pointer-events-none"
        >
          {/* Dual-Tone Floating 3D Capsule */}
          <div className="relative w-16 h-36 rounded-full bg-gradient-to-b from-teal-400 via-emerald-500 to-slate-900 border-2 border-white/40 shadow-[0_20px_40px_rgba(20,184,166,0.45),inset_0_2px_6px_rgba(255,255,255,0.7)] flex flex-col items-center justify-between p-2 overflow-hidden transform rotate-45">
            {/* Glass reflection streak */}
            <div className="absolute left-2 top-2 bottom-2 w-1.5 bg-white/40 rounded-full blur-[0.5px]" />
            <div className="relative z-10 text-[9px] font-mono font-black text-slate-950 mt-1">
              MED
            </div>
            <div className="w-full h-[1.5px] bg-white/50 shadow-sm" />
            <div className="relative z-10 text-[9px] font-mono font-black text-teal-200 mb-1">
              FEFO
            </div>
          </div>
        </motion.div>

        {/* ========================================================= */}
        {/* LAYER 3: SVG 3D CONNECTION BEAMS                           */}
        {/* ========================================================= */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-15 overflow-visible"
          style={{ transform: 'translateZ(45px)' }}
        >
          <defs>
            <linearGradient id="beamGradientTeal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#10b981" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="beamGradientAmber" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="beamGradientSky" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Beam to Node 1: Dhaka Hub */}
          <path
            d="M 90 90 Q 150 180 240 240"
            fill="none"
            stroke="url(#beamGradientTeal)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="animate-pulse"
          />

          {/* Beam to Node 2: Bogura SZMCH */}
          <path
            d="M 390 200 Q 320 220 240 240"
            fill="none"
            stroke="url(#beamGradientAmber)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="animate-pulse"
          />

          {/* Beam to Node 3: Pabna Sadar */}
          <path
            d="M 110 400 Q 180 330 240 240"
            fill="none"
            stroke="url(#beamGradientSky)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="animate-pulse"
          />
        </svg>

        {/* ========================================================= */}
        {/* LAYER 4 (Z: 70px - 90px): 3D FLOATING BANGLADESH TELEMETRY NODES */}
        {/* ========================================================= */}

        {/* NODE 1: Dhaka Hub (Top Left) */}
        <motion.div
          whileHover={{ scale: 1.05, zIndex: 50 }}
          style={{
            transform: 'translateZ(75px)',
            transformStyle: 'preserve-3d',
          }}
          className="absolute top-4 left-0 sm:-left-4 z-30 transition-all duration-200"
        >
          <div className="bg-slate-950/85 backdrop-blur-xl border border-emerald-500/40 rounded-xl px-3 py-2 shadow-[0_15px_30px_rgba(0,0,0,0.5),0_0_15px_rgba(16,185,129,0.2)] flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
            <div className="text-left font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">Dhaka Central Hub</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-400/30">
                  SEALED
                </span>
              </div>
              <p className="text-[10px] text-teal-200/80">
                Napa Extend 665mg • 140 Packs
              </p>
            </div>
          </div>
        </motion.div>

        {/* NODE 2: Bogura SZMCH (Middle Right) */}
        <motion.div
          whileHover={{ scale: 1.05, zIndex: 50 }}
          style={{
            transform: 'translateZ(85px)',
            transformStyle: 'preserve-3d',
          }}
          className="absolute top-44 -right-2 sm:-right-6 z-30 transition-all duration-200"
        >
          <div className="bg-slate-950/85 backdrop-blur-xl border border-amber-500/40 rounded-xl px-3 py-2 shadow-[0_15px_30px_rgba(0,0,0,0.5),0_0_15px_rgba(245,158,11,0.2)] flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
            </span>
            <div className="text-left font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">Bogura SZMCH</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-400/30">
                  18d LEFT
                </span>
              </div>
              <p className="text-[10px] text-amber-200/80">
                Urgent FEFO Match • Azithromycin 500mg
              </p>
            </div>
          </div>
        </motion.div>

        {/* NODE 3: Pabna Sadar (Bottom Left) */}
        <motion.div
          whileHover={{ scale: 1.05, zIndex: 50 }}
          style={{
            transform: 'translateZ(75px)',
            transformStyle: 'preserve-3d',
          }}
          className="absolute bottom-6 left-2 sm:-left-2 z-30 transition-all duration-200"
        >
          <div className="bg-slate-950/85 backdrop-blur-xl border border-cyan-500/40 rounded-xl px-3 py-2 shadow-[0_15px_30px_rgba(0,0,0,0.5),0_0_15px_rgba(6,182,212,0.2)] flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
            </span>
            <div className="text-left font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">Pabna Sadar Clinic</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-400/30">
                  BMDC Rx
                </span>
              </div>
              <p className="text-[10px] text-cyan-200/80">
                Verified Handover Ready • NGO Outreach
              </p>
            </div>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
