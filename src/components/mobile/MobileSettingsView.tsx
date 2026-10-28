import { PixelBookIcon, PixelChatModeIcon } from '../PixelIcons';

interface MobileSettingsViewProps {
  chatModeEnabled: boolean;
  onToggleChatMode: () => void;
  teachMe: boolean;
  onToggleTeachMe: () => void;
  hasResults: boolean;
  hasPendingChatModeDiff: boolean;
  isAnyBusy: boolean;
  onRegenerateAll: () => void;
  onGoToWrite: () => void;
  onGoToResults: () => void;
}

export function MobileSettingsView({
  chatModeEnabled,
  onToggleChatMode,
  teachMe,
  onToggleTeachMe,
  hasResults,
  hasPendingChatModeDiff,
  isAnyBusy,
  onRegenerateAll,
  onGoToWrite,
  onGoToResults,
}: MobileSettingsViewProps) {
  return (
    <div className="space-y-4 min-w-0">
      {/* Compact Screen Heading */}
      <div className="space-y-1 pt-0.5">
        <h1 className="font-pixel text-sm min-[375px]:text-base text-[#141B29] leading-snug tracking-tight">
          TRANSFORMATION SETTINGS
        </h1>
        <p className="text-xs text-[#433E32]">
          Configure how TalkLikeUS rewrites your next message. Existing results stay safe.
        </p>
      </div>

      {/* Dedicated Options Panel */}
      <div className="space-y-3">
        {/* Option 1: Chat Mode */}
        <section
          aria-labelledby="mobile-setting-chat-heading"
          className="bg-[#F4F1E6] border border-[#141B29] shadow-[2px_2px_0_#141B29] p-3.5 space-y-2.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <PixelChatModeIcon className="w-4 h-4 shrink-0" />
                <h2
                  id="mobile-setting-chat-heading"
                  className="font-pixel text-xs text-[#141B29]"
                >
                  Chat Mode
                </h2>
              </div>
              <p className="text-sm text-[#232B3A] leading-relaxed">
                Short, natural American texting.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={chatModeEnabled}
              aria-label="Chat Mode"
              onClick={onToggleChatMode}
              className={`retro-btn min-h-[44px] min-w-[78px] px-3 font-mono text-xs font-bold inline-flex items-center justify-center gap-1.5 shrink-0 ${
                chatModeEnabled
                  ? '!bg-[#D6F5DF] !border-[#15603A] !text-[#0F4224]'
                  : ''
              }`}
            >
              <span
                aria-hidden="true"
                className={`w-2 h-2 border border-[#141B29] ${
                  chatModeEnabled ? 'bg-[#15603A]' : 'bg-[#ABA48E]'
                }`}
              />
              <span>{chatModeEnabled ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          <p className="font-mono text-[11px] text-[#4B4639] border-t border-dashed border-[#C4BDA9] pt-2 leading-relaxed">
            Universal modifier across all 4 voices—uses concise fragments, contractions, and real
            texting shorthand (&ldquo;idk&rdquo;, &ldquo;rn&rdquo;, &ldquo;ngl&rdquo;,
            &ldquo;u&rdquo;) instead of full formal sentences.
          </p>
        </section>

        {/* Option 2: Teach Me */}
        <section
          aria-labelledby="mobile-setting-teach-heading"
          className="bg-[#F4F1E6] border border-[#141B29] shadow-[2px_2px_0_#141B29] p-3.5 space-y-2.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <PixelBookIcon className="w-4 h-4 shrink-0" />
                <h2
                  id="mobile-setting-teach-heading"
                  className="font-pixel text-xs text-[#141B29]"
                >
                  Teach Me
                </h2>
              </div>
              <p className="text-sm text-[#232B3A] leading-relaxed">
                Learn slang, idioms, and natural phrasing.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={teachMe}
              aria-label="Teach Me"
              onClick={onToggleTeachMe}
              className={`retro-btn min-h-[44px] min-w-[78px] px-3 font-mono text-xs font-bold inline-flex items-center justify-center gap-1.5 shrink-0 ${
                teachMe
                  ? '!bg-[#DCE6FA] !border-[#142850] !text-[#142850]'
                  : ''
              }`}
            >
              <span
                aria-hidden="true"
                className={`w-2 h-2 border border-[#141B29] ${
                  teachMe ? 'bg-[#142850]' : 'bg-[#ABA48E]'
                }`}
              />
              <span>{teachMe ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          <p className="font-mono text-[11px] text-[#4B4639] border-t border-dashed border-[#C4BDA9] pt-2 leading-relaxed">
            Adds expandable notes under each voice card explaining tone, register safety, and
            reusable American phrasing patterns.
          </p>
        </section>
      </div>

      {/* Pending Change Notice when Results Already Exist */}
      {hasResults && hasPendingChatModeDiff && (
        <div className="bg-[#ECE8D9] border border-[#141B29] p-3 space-y-2.5">
          <p className="font-mono text-xs text-[#142850] leading-relaxed">
            Chat Mode is now <strong>{chatModeEnabled ? 'ON' : 'OFF'}</strong> for your next
            generation. Your existing results were kept intact.
          </p>
          <button
            type="button"
            disabled={isAnyBusy}
            onClick={onRegenerateAll}
            className="retro-btn w-full min-h-[44px] px-3 text-xs font-semibold inline-flex items-center justify-center"
          >
            Regenerate All with Chat Mode {chatModeEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      )}

      {/* Secondary Return Actions */}
      <div className="grid grid-cols-1 gap-2 pt-1">
        {hasResults ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onGoToWrite}
              className="retro-btn min-h-[44px] px-3 text-xs font-semibold inline-flex items-center justify-center"
            >
              Back to Write
            </button>
            <button
              type="button"
              onClick={onGoToResults}
              className="retro-btn min-h-[44px] px-3 text-xs font-semibold inline-flex items-center justify-center"
            >
              View Results
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onGoToWrite}
            className="retro-btn w-full min-h-[44px] px-3 text-xs font-semibold inline-flex items-center justify-center"
          >
            Return to Write
          </button>
        )}
      </div>
    </div>
  );
}
