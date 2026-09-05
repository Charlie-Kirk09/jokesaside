import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Heart } from 'lucide-react';
import { University } from '../types';
import { MatchReveal } from './MatchReveal';

interface UniversityCardProps {
  university: University;
  index?: number;
  isSelected?: boolean;
  onToggleSelection?: (id: number) => void;
  onViewDetails?: () => void;
  /** Reports the card's viewport rect before opening, so the prospectus can rise out of the card */
  onViewOrigin?: (rect: DOMRect) => void;
  visitorRole?: 'parent' | 'student';
  isFavorite?: boolean;
  onToggleFavorite?: (id: number, e: React.MouseEvent) => void;
  matchScore?: number;
  onOpenROI?: (university: University) => void;
}

export const UniversityCard = React.memo<UniversityCardProps>(({
  university,
  index = 0,
  isSelected,
  onToggleSelection,
  onViewDetails,
  onViewOrigin,
  isFavorite = false,
  onToggleFavorite,
  matchScore,
  onOpenROI,
}) => {
  const cardRef = useRef<HTMLElement>(null);

  const open = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const el = cardRef.current;
    if (el && onViewOrigin) onViewOrigin(el.getBoundingClientRect());
    onViewDetails?.();
  };

  return (
    <motion.article
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      onClick={open}
      className={`card-premium rounded-md overflow-hidden group cursor-pointer ${
        isSelected ? 'selected' : ''
      }`}
    >
      {/* ── Cinematic image strip (slow cursor drift, ±4px) ── */}
      <div
        className="relative h-40 overflow-hidden bg-charcoal"
        onMouseMove={(e) => {
          const el = e.currentTarget;
          const r = el.getBoundingClientRect();
          el.style.setProperty('--px', String(((e.clientX - r.left) / r.width - 0.5) * 8));
          el.style.setProperty('--py', String(((e.clientY - r.top) / r.height - 0.5) * 8));
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.setProperty('--px', '0');
          e.currentTarget.style.setProperty('--py', '0');
        }}
      >
        <div
          className="absolute inset-0 will-change-transform"
          style={{
            transform:
              'translate(calc(var(--px, 0) * 1px), calc(var(--py, 0) * 1px)) scale(1.07)',
            transition: 'transform 0.2s ease-out',
          }}
        >
          <img
            src={university.image}
            alt={university.name}
            loading="lazy"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/30 to-transparent" />

        {/* Numbered plate — prospectus style */}
        <div className="absolute top-4 left-5 flex items-center gap-2.5">
          <span className="font-display text-[15px] text-white/75 tracking-tight">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="h-3 w-px bg-surface/25" />
          <span className="text-[11px] font-medium tracking-[0.08em] text-white/80">{university.type}</span>
        </div>

        {/* Favorite */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(university.id, e); }}
          className="absolute top-4 right-5 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors"
          style={{
            background: isFavorite ? 'rgba(201,163,92,0.95)' : 'rgba(13,13,11,0.42)',
            border: `1px solid ${isFavorite ? 'rgba(251,247,238,0.9)' : 'rgba(255,255,255,0.18)'}`,
            backdropFilter: isFavorite ? 'none' : 'blur(2px)',
          }}
          title={isFavorite ? 'Remove from shortlist' : 'Add to shortlist'}
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-cream text-cream' : 'text-white/85'}`} />
        </button>
      </div>

      {/* ── Prospectus body ── */}
      <div className="p-6">
        <h3 className="display-card text-ink group-hover:text-primary transition-colors">
          {university.name}
        </h3>
        <p className="meta-label mt-1.5">
          {university.location} · {university.state}
        </p>

        {/* Credential row */}
        <div className="mt-6 grid grid-cols-3 gap-2">
          <div>
            <div className="tnum text-[16px] font-semibold text-ink leading-tight whitespace-nowrap">#{university.nirfRank}</div>
            <div className="meta-label mt-1.5 whitespace-nowrap">nirf</div>
          </div>
          <div>
            <div className="tnum text-[16px] font-semibold text-ink leading-tight whitespace-nowrap">{university.avgPlacementLPA} <span className="text-[11px] font-medium text-muted-foreground">LPA</span></div>
            <div className="meta-label mt-1.5 whitespace-nowrap">avg package</div>
          </div>
          <div>
            <div className="tnum text-[16px] font-semibold text-ink leading-tight whitespace-nowrap">₹{(university.fee / 100000).toFixed(2)}L</div>
            <div className="meta-label mt-1.5 whitespace-nowrap">annual fee</div>
          </div>
        </div>

        {/* Match + actions */}
        <div className="mt-5 pt-4 hairline-t flex items-center justify-between gap-2">
          {matchScore !== undefined ? (
            <span className="flex items-center gap-2.5 shrink-0">
              <MatchReveal score={matchScore} />
              <span className="meta-label">match</span>
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground/80 shrink-0 whitespace-nowrap">
              NAAC {university.naacGrade} · {university.courses} programs
            </span>
          )}
          <span className="flex items-center gap-3 shrink min-w-0">
            {onOpenROI && (
              <button
                onClick={(e) => { e.stopPropagation(); onOpenROI(university); }}
                className="text-[12px] font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer bg-transparent border-none"
              >
                ROI
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleSelection?.(university.id); }}
              className={`text-[12px] font-medium transition-colors cursor-pointer bg-transparent border-none ${
                isSelected ? 'text-primary' : 'text-muted-foreground hover:text-ink'
              }`}
            >
              {isSelected ? 'Selected' : 'Compare'}
            </button>
            <button
              onClick={open}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:text-accent-bright transition-colors cursor-pointer bg-transparent border-none whitespace-nowrap"
            >
              View <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </span>
        </div>
      </div>
    </motion.article>
  );
});