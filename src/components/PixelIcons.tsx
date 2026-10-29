import type { VoiceMode } from '../types/transform';

export function PixelFlagStamp({ className = 'w-9 h-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 16"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={className}
    >
      <rect x="0" y="0" width="24" height="16" fill="#141B29" />
      <rect x="1" y="1" width="22" height="2" fill="#D92323" />
      <rect x="1" y="3" width="22" height="2" fill="#F7F5EC" />
      <rect x="1" y="5" width="22" height="2" fill="#D92323" />
      <rect x="1" y="7" width="22" height="2" fill="#F7F5EC" />
      <rect x="1" y="9" width="22" height="2" fill="#D92323" />
      <rect x="1" y="11" width="22" height="2" fill="#F7F5EC" />
      <rect x="1" y="13" width="22" height="2" fill="#D92323" />
      <rect x="1" y="1" width="10" height="8" fill="#142850" />
      <rect x="2" y="2" width="1" height="1" fill="#F7F5EC" />
      <rect x="5" y="2" width="1" height="1" fill="#F7F5EC" />
      <rect x="8" y="2" width="1" height="1" fill="#F7F5EC" />
      <rect x="3" y="4" width="1" height="1" fill="#F7F5EC" />
      <rect x="7" y="4" width="1" height="1" fill="#F7F5EC" />
      <rect x="2" y="6" width="1" height="1" fill="#F7F5EC" />
      <rect x="5" y="6" width="1" height="1" fill="#F7F5EC" />
      <rect x="8" y="6" width="1" height="1" fill="#F7F5EC" />
    </svg>
  );
}

export function PixelModeIcon({
  mode,
  className = 'w-4 h-4 shrink-0',
}: {
  mode: VoiceMode;
  className?: string;
}) {
  if (mode === 'natural_american') {
    return (
      <svg viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true" className={className}>
        <rect x="2" y="2" width="12" height="9" fill="#F7F5EC" />
        <rect x="4" y="11" width="3" height="2" fill="#F7F5EC" />
        <rect x="3" y="13" width="2" height="1" fill="#F7F5EC" />
        <rect x="4" y="5" width="8" height="1" fill="#142850" />
        <rect x="4" y="7" width="6" height="1" fill="#142850" />
      </svg>
    );
  }

  if (mode === 'casual_slang') {
    return (
      <svg viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true" className={className}>
        <rect x="1" y="2" width="9" height="6" fill="#F7F5EC" />
        <rect x="2" y="8" width="2" height="2" fill="#F7F5EC" />
        <rect x="6" y="6" width="9" height="6" fill="#FDE047" />
        <rect x="12" y="12" width="2" height="2" fill="#FDE047" />
      </svg>
    );
  }

  if (mode === 'unfiltered_blunt') {
    return (
      <svg viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true" className={className}>
        <rect x="7" y="1" width="4" height="3" fill="#FDE047" />
        <rect x="5" y="4" width="5" height="3" fill="#FDE047" />
        <rect x="4" y="7" width="8" height="2" fill="#FDE047" />
        <rect x="7" y="9" width="4" height="3" fill="#FDE047" />
        <rect x="5" y="12" width="3" height="3" fill="#FDE047" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true" className={className}>
      <rect x="7" y="1" width="2" height="3" fill="#FDE047" />
      <rect x="2" y="5" width="12" height="2" fill="#FDE047" />
      <rect x="4" y="7" width="8" height="3" fill="#FDE047" />
      <rect x="3" y="10" width="3" height="3" fill="#FDE047" />
      <rect x="10" y="10" width="3" height="3" fill="#FDE047" />
      <rect x="2" y="13" width="2" height="2" fill="#FDE047" />
      <rect x="12" y="13" width="2" height="2" fill="#FDE047" />
    </svg>
  );
}

export function PixelBookIcon({ className = 'w-4 h-4 shrink-0' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true" className={className}>
      <rect x="1" y="3" width="6" height="10" fill="#FFFFFF" />
      <rect x="9" y="3" width="6" height="10" fill="#FFFFFF" />
      <rect x="7" y="4" width="2" height="9" fill="#141B29" />
      <rect x="1" y="2" width="6" height="1" fill="#141B29" />
      <rect x="9" y="2" width="6" height="1" fill="#141B29" />
      <rect x="1" y="13" width="14" height="1" fill="#141B29" />
      <rect x="2" y="5" width="4" height="1" fill="#0000EE" />
      <rect x="2" y="8" width="4" height="1" fill="#141B29" />
      <rect x="10" y="5" width="4" height="1" fill="#D92323" />
      <rect x="10" y="8" width="4" height="1" fill="#141B29" />
    </svg>
  );
}

export function PixelChatModeIcon({ className = 'w-4 h-4 shrink-0' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true" className={className}>
      <rect x="1" y="2" width="14" height="9" fill="#141B29" />
      <rect x="2" y="3" width="12" height="7" fill="#FFFFFF" />
      <rect x="3" y="11" width="3" height="2" fill="#141B29" />
      <rect x="4" y="11" width="1" height="1" fill="#FFFFFF" />
      <rect x="4" y="6" width="2" height="2" fill="#142850" />
      <rect x="7" y="6" width="2" height="2" fill="#0000EE" />
      <rect x="10" y="6" width="2" height="2" fill="#D92323" />
    </svg>
  );
}

export function PixelHourglassIcon({ className = 'w-5 h-5 shrink-0' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true" className={className}>
      <rect x="3" y="1" width="10" height="2" fill="#141B29" />
      <rect x="4" y="3" width="8" height="3" fill="#F7F5EC" />
      <rect x="5" y="4" width="6" height="2" fill="#D92323" />
      <rect x="6" y="6" width="4" height="2" fill="#141B29" />
      <rect x="5" y="8" width="6" height="2" fill="#F7F5EC" />
      <rect x="4" y="10" width="8" height="3" fill="#F7F5EC" />
      <rect x="5" y="11" width="6" height="2" fill="#D92323" />
      <rect x="3" y="13" width="10" height="2" fill="#141B29" />
    </svg>
  );
}

export function PixelSpinnerIcon({ className = 'w-4 h-4 shrink-0' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={`retro-spin-steps ${className}`}
    >
      <rect x="7" y="1" width="2" height="3" fill="#FDE047" />
      <rect x="11" y="2" width="2" height="2" fill="#FFFFFF" />
      <rect x="12" y="7" width="3" height="2" fill="#FFFFFF" opacity="0.85" />
      <rect x="11" y="12" width="2" height="2" fill="#FFFFFF" opacity="0.65" />
      <rect x="7" y="12" width="2" height="3" fill="#FFFFFF" opacity="0.5" />
      <rect x="3" y="12" width="2" height="2" fill="#FFFFFF" opacity="0.35" />
      <rect x="1" y="7" width="3" height="2" fill="#FFFFFF" opacity="0.25" />
      <rect x="3" y="2" width="2" height="2" fill="#FDE047" opacity="0.75" />
    </svg>
  );
}
