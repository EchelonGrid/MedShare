'use client';

import React, { useRef, useState } from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';

export type GlowColor = 'teal' | 'amber' | 'rose' | 'cyan';

interface TiltSpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: GlowColor;
  spotlightColor?: string;
  maxTilt?: number;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const GLOW_CONFIG: Record<
  GlowColor,
  { spotlight: string; borderHover: string; shadowHover: string; topRim: string }
> = {
  rose: {
    spotlight: 'rgba(244, 63, 94, 0.18)',
    borderHover: 'group-hover:border-rose-500/40',
    shadowHover: 'hover:shadow-[0_25px_50px_-12px_rgba(244,63,94,0.22)]',
    topRim: 'via-rose-400/40',
  },
  amber: {
    spotlight: 'rgba(245, 158, 11, 0.18)',
    borderHover: 'group-hover:border-amber-500/40',
    shadowHover: 'hover:shadow-[0_25px_50px_-12px_rgba(245,158,11,0.22)]',
    topRim: 'via-amber-400/40',
  },
  teal: {
    spotlight: 'rgba(20, 184, 166, 0.18)',
    borderHover: 'group-hover:border-teal-400/40',
    shadowHover: 'hover:shadow-[0_25px_50px_-12px_rgba(20,184,166,0.22)]',
    topRim: 'via-teal-400/40',
  },
  cyan: {
    spotlight: 'rgba(6, 182, 212, 0.18)',
    borderHover: 'group-hover:border-cyan-400/40',
    shadowHover: 'hover:shadow-[0_25px_50px_-12px_rgba(6,182,212,0.22)]',
    topRim: 'via-cyan-400/40',
  },
};

export default function TiltSpotlightCard({
  children,
  className = '',
  glowColor = 'teal',
  spotlightColor,
  maxTilt = 6,
  onClick,
  style,
}: TiltSpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const activeGlow = GLOW_CONFIG[glowColor] || GLOW_CONFIG.teal;
  const resolvedSpotlight = spotlightColor || activeGlow.spotlight;

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const normX = useMotionValue(0);
  const normY = useMotionValue(0);

  const springConfig = { damping: 22, stiffness: 240, mass: 0.5 };
  // Tilting: moving cursor up (normY < 0) tilts forward (rotateX > 0)
  const rotateX = useSpring(
    useTransform(normY, [-1, 1], [maxTilt, -maxTilt]),
    springConfig
  );
  // Tilting: moving cursor right (normX > 0) tilts right (rotateY > 0)
  const rotateY = useSpring(
    useTransform(normX, [-1, 1], [-maxTilt, maxTilt]),
    springConfig
  );

  const spotlightBg = useMotionTemplate`radial-gradient(450px circle at ${mouseX}px ${mouseY}px, ${resolvedSpotlight}, transparent 80%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mouseX.set(x);
    mouseY.set(y);

    const nx = Math.max(-1, Math.min(1, (x / rect.width - 0.5) * 2));
    const ny = Math.max(-1, Math.min(1, (y / rect.height - 0.5) * 2));
    normX.set(nx);
    normY.set(ny);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    normX.set(0);
    normY.set(0);
  };

  return (
    <div style={{ perspective: 1200 }} className="relative isolate h-full">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
          ...style,
        }}
        className={`group relative h-full rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl shadow-[0_12px_35px_-8px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_45px_-12px_rgba(0,0,0,0.5)] transition-[border-color,box-shadow] duration-300 ${activeGlow.borderHover} ${activeGlow.shadowHover} ${
          onClick ? 'cursor-pointer' : ''
        } ${className}`}
      >
        {/* Dynamic Specular 1px Top Edge Highlight with Urgency Tint */}
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent ${activeGlow.topRim} to-transparent rounded-t-2xl z-20`}
        />

        {/* Dynamic Cursor Spotlight Overlay */}
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-2xl z-10 transition-opacity duration-300"
          style={{
            background: spotlightBg,
            opacity: isHovered ? 1 : 0,
          }}
        />

        {/* Ambient Subtle Sheen */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent opacity-60 z-0" />

        {/* Card Content with 3D Depth Layer */}
        <div className="relative z-10 w-full h-full preserve-3d flex flex-col justify-between">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
