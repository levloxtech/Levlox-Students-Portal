import React from 'react';

/**
 * Loading placeholders. These let the dashboard shell paint immediately while
 * individual widgets are still resolving, instead of holding back the page.
 */

const shimmer = {
  background: 'linear-gradient(90deg, rgba(0,0,0,0.045) 25%, rgba(0,0,0,0.08) 37%, rgba(0,0,0,0.045) 63%)',
  backgroundSize: '400% 100%',
  animation: 'skeleton-shimmer 1.3s ease-in-out infinite',
  borderRadius: 8,
};

/** Keyframes are injected once, from whichever skeleton renders first. */
const SkeletonStyles = () => (
  <style>{`
    @keyframes skeleton-shimmer {
      0% { background-position: 100% 50%; }
      100% { background-position: 0 50%; }
    }
  `}</style>
);

export const SkeletonLine = ({ width = '100%', height = 12, style = {} }) => (
  <div style={{ ...shimmer, width, height, ...style }} />
);

export const SkeletonCircle = ({ size = 40 }) => (
  <div style={{ ...shimmer, width: size, height: size, borderRadius: '50%', flexShrink: 0 }} />
);

/** A generic card-shaped placeholder with a title line and body lines. */
export const CardSkeleton = ({ lines = 3, height, title = true }) => (
  <div
    aria-busy="true"
    aria-live="polite"
    style={{
      background: '#FFF',
      border: '1.5px solid var(--border-color, rgba(0,0,0,0.08))',
      borderRadius: 18,
      padding: 24,
      minHeight: height,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}
  >
    <SkeletonStyles />
    {title && <SkeletonLine width="42%" height={16} />}
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonLine key={i} width={i === lines - 1 ? '68%' : '100%'} />
    ))}
    <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
      Loading…
    </span>
  </div>
);

/** List-shaped placeholder — rows with an avatar and two text lines. */
export const ListSkeleton = ({ rows = 4 }) => (
  <div aria-busy="true" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <SkeletonStyles />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <SkeletonCircle size={38} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
          <SkeletonLine width="46%" height={11} />
          <SkeletonLine width="28%" height={9} />
        </div>
      </div>
    ))}
  </div>
);

/** The full dashboard shell placeholder: stat row + two content cards. */
export const DashboardSkeleton = () => (
  <div aria-busy="true" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    <SkeletonStyles />
    <CardSkeleton lines={2} height={120} />
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 16,
      }}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} lines={1} height={104} />
      ))}
    </div>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 20,
      }}
    >
      <CardSkeleton lines={5} height={260} />
      <CardSkeleton lines={5} height={260} />
    </div>
  </div>
);

export default CardSkeleton;
