export type ActiveNavSection = 'home' | 'how' | 'voices' | 'about';

interface RetroHeaderProps {
  activeSection: ActiveNavSection;
  onSelectSection: (section: ActiveNavSection) => void;
  hasWorkspaceContent: boolean;
  onResetWorkspace: () => void;
}

export function RetroHeader({
  activeSection,
  onSelectSection,
  hasWorkspaceContent,
  onResetWorkspace,
}: RetroHeaderProps) {
  const navItems: Array<{ id: ActiveNavSection; label: string }> = [
    { id: 'home', label: 'Home' },
    { id: 'how', label: 'How It Works' },
    { id: 'voices', label: 'Voice Guide' },
    { id: 'about', label: 'About' },
  ];

  return (
    <header className="w-full bg-[#F4F1E6] border-b-2 border-[#141B29]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#studio"
          onClick={(e) => {
            e.preventDefault();
            onSelectSection('home');
          }}
          className="font-pixel text-lg sm:text-xl font-bold tracking-tight text-[#142850] hover:text-[#0000EE] whitespace-nowrap shrink-0"
        >
          TalkLikeUS
        </a>

        {/* Zone 2: Clean single-line hypertext navigation links */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6 font-mono text-sm">
          {navItems.map((item) => {
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
                className={`whitespace-nowrap shrink-0 ${
                  isActive ? 'retro-link-active font-semibold' : 'retro-link'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Single primary header action */}
        <div className="flex items-center shrink-0">
          {activeSection !== 'home' ? (
            <button
              type="button"
              onClick={() => onSelectSection('home')}
              className="retro-btn px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              Open Studio
            </button>
          ) : (
            <button
              type="button"
              onClick={onResetWorkspace}
              disabled={!hasWorkspaceContent}
              className="retro-btn px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              Reset Studio
            </button>
          )}
        </div>
      </div>

      {/* Compact mobile navigation row for narrow viewports */}
      <nav
        aria-label="Mobile navigation"
        className="flex md:hidden items-center justify-center gap-5 px-4 py-2 border-t border-dashed border-[#ABA48E] bg-[#ECE8D9] font-mono text-xs overflow-x-auto"
      >
        {navItems.map((item) => {
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
              className={`whitespace-nowrap shrink-0 py-1 ${
                isActive ? 'retro-link-active font-semibold' : 'retro-link'
              }`}
            >
              {item.label}
            </a>
          );
        })}
      </nav>
    </header>
  );
}
