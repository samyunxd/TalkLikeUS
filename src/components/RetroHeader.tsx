import { memo } from 'react';
import { PixelFlagStamp } from './PixelIcons';

export type ActiveNavSection = 'home' | 'how' | 'voices' | 'about';

interface RetroHeaderProps {
  activeSection: ActiveNavSection;
  onSelectSection: (section: ActiveNavSection) => void;
  onCycleSample: () => void;
}

const NAV_ITEMS: Array<{ id: ActiveNavSection; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'how', label: 'How It Works' },
  { id: 'voices', label: 'Voice Guide' },
  { id: 'about', label: 'About' },
];

export const RetroHeader = memo(function RetroHeader({
  activeSection,
  onSelectSection,
  onCycleSample,
}: RetroHeaderProps) {
  return (
    <header className="w-full bg-[#F4F1E6] border-b-2 border-[#141B29]">
      <div className="max-w-4xl mx-auto safe-area-x py-1.5 sm:py-2.5 flex items-center justify-between gap-2 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-8">
        {/* Zone 1: Exact Mixed-Case Brand Wordmark "TalkLikeUS" */}
        <a
          href="#studio"
          onClick={(e) => {
            e.preventDefault();
            onSelectSection('home');
          }}
          className="md:justify-self-start min-h-[44px] inline-flex items-center gap-2 sm:gap-2.5 font-mono text-lg sm:text-2xl font-bold tracking-tight text-[#142850] hover:text-[#1D3B73] transition-colors duration-200 whitespace-nowrap shrink-0"
        >
          <PixelFlagStamp className="w-6 h-4 sm:w-7 sm:h-5 shrink-0" />
          <span>TalkLikeUS</span>
        </a>

        {/* Zone 2: Clean single-line hypertext navigation links — locked to center on desktop */}
        <nav
          aria-label="Main navigation"
          className="hidden md:flex md:justify-self-center items-center gap-6 font-mono text-sm"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  onSelectSection(item.id);
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`min-h-[44px] inline-flex items-center font-medium whitespace-nowrap shrink-0 ${
                  isActive ? 'retro-link-active' : 'retro-link'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Single compact primary header action — stable width prevents horizontal jitter */}
        <div className="flex items-center md:justify-self-end shrink-0">
          {activeSection !== 'home' ? (
            <button
              type="button"
              onClick={() => onSelectSection('home')}
              className="retro-btn min-h-[44px] min-w-[76px] md:min-w-[104px] px-3 sm:px-3.5 text-xs font-semibold inline-flex items-center justify-center whitespace-nowrap shrink-0"
            >
              Studio
            </button>
          ) : (
            <button
              type="button"
              onClick={onCycleSample}
              aria-label="Try Sample"
              className="retro-btn min-h-[44px] min-w-[76px] md:min-w-[104px] px-3 sm:px-3.5 text-xs font-semibold inline-flex items-center justify-center whitespace-nowrap shrink-0"
            >
              <span className="md:hidden">Sample</span>
              <span className="hidden md:inline">Try Sample</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
});
