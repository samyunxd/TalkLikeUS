import type { ReactNode } from 'react';
import {
  PixelResultsTabIcon,
  PixelSettingsTabIcon,
  PixelWriteTabIcon,
} from '../PixelIcons';

export type MobilePrimaryTab = 'write' | 'results' | 'settings';

interface MobileBottomNavProps {
  activeTab: MobilePrimaryTab;
  onSelectTab: (tab: MobilePrimaryTab) => void;
  hasResults: boolean;
  isHiddenByKeyboard: boolean;
}

export function MobileBottomNav({
  activeTab,
  onSelectTab,
  hasResults,
  isHiddenByKeyboard,
}: MobileBottomNavProps) {
  if (isHiddenByKeyboard) {
    return null;
  }

  const tabs: Array<{
    id: MobilePrimaryTab;
    label: string;
    badge?: string;
    renderIcon: (cls: string) => ReactNode;
  }> = [
    {
      id: 'write',
      label: 'WRITE',
      renderIcon: (cls) => <PixelWriteTabIcon className={cls} />,
    },
    {
      id: 'results',
      label: 'RESULTS',
      badge: hasResults ? '4' : undefined,
      renderIcon: (cls) => <PixelResultsTabIcon className={cls} />,
    },
    {
      id: 'settings',
      label: 'SETTINGS',
      renderIcon: (cls) => <PixelSettingsTabIcon className={cls} />,
    },
  ];

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-30 bg-[#E5E0D0] border-t-2 border-[#141B29] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-3 h-[54px] divide-x border-[#141B29] divide-[#ABA48E]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`min-h-[48px] px-1 flex flex-col items-center justify-center gap-0.5 touch-manipulation cursor-pointer transition-colors ${
                isActive
                  ? 'bg-[#142850] text-[#F7F5EC]'
                  : 'bg-[#E5E0D0] text-[#141B29] active:bg-[#D7D1BE]'
              }`}
            >
              <span className="inline-flex items-center gap-1">
                {tab.renderIcon('w-4 h-4 shrink-0')}
                {tab.badge && (
                  <span
                    className={`font-mono text-[10px] font-bold leading-none px-1 py-0.5 border ${
                      isActive
                        ? 'bg-[#FDE047] text-[#141B29] border-[#141B29]'
                        : 'bg-[#F4F1E6] text-[#142850] border-[#141B29]'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </span>
              <span className="font-pixel text-[10px] leading-none tracking-wide">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
