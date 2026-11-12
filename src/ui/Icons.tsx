import type { KitIcon } from '../content/page'

/** Line icons for the kit cards: one stroke width, round caps, 64-unit grid, currentColor. */
export function Icon({ name }: { name: KitIcon }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg viewBox="0 0 64 64" className="icon" aria-hidden="true">
      {name === 'cable' && (
        <g {...common}>
          {/* USB-C plug + braided coil */}
          <rect x="40" y="8" width="10" height="16" rx="3" />
          <path d="M43 8V4.5h4V8" />
          <path d="M45 24v4c0 6-6 8-12 8s-13 2-13 8 6 8 12 8 12 2 12 6" />
          <path d="M18 41l4 3M17 46l4 2M27 51l3 3M33 52l2 3" opacity=".55" />
        </g>
      )}
      {name === 'puller' && (
        <g {...common}>
          {/* wire keycap puller (left) + switch tweezers (right) sharing a handle */}
          <path d="M32 58V38" />
          <rect x="27" y="50" width="10" height="8" rx="2" />
          <path d="M32 38c-10 0-14-6-14-14V10M32 38c10 0 14-6 14-14V10" />
          <path d="M18 10h4M42 10h4" />
          <path d="M18 18c-3 0-4 2-4 4M46 18c3 0 4 2 4 4" opacity=".55" />
        </g>
      )}
      {name === 'stickers' && (
        <g {...common}>
          {/* sheet with a diamond mark and a peeled corner */}
          <path d="M12 10h32l8 8v36H12z" />
          <path d="M44 10v8h8" />
          <path d="M32 22l9 9-9 9-9-9z" />
          <path d="M20 46h10M36 46h8" opacity=".55" />
        </g>
      )}
    </svg>
  )
}
