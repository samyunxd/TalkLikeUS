import type { VoiceMode } from '../types/transform.ts';

export interface ModeConfig {
  id: VoiceMode;
  number: string;
  title: string;
  copyLabel: string;
  shortTag: string;
  description: string;
  bestFor: string;
  headerBgClass: string;
  headerTextClass: string;
  accentBadgeClass: string;
  promptDirective: string;
}

export const MAX_INPUT_CHARS = 20000;
export const CHUNK_THRESHOLD_CHARS = 4000;
export const TARGET_CHUNK_CHARS = 3200;

export const MODE_CONFIGS: Record<VoiceMode, ModeConfig> = {
  natural_american: {
    id: 'natural_american',
    number: '01',
    title: 'Natural American',
    copyLabel: 'NATURAL AMERICAN',
    shortTag: 'Everyday Fluent',
    description:
      'Clear, idiomatic, everyday American English with natural contractions and smooth conversational flow.',
    bestFor: 'Everyday texts, coworkers, emails, posts, and general conversation',
    headerBgClass: 'bg-[#142850]',
    headerTextClass: 'text-[#F7F5EC]',
    accentBadgeClass: 'text-[#142850]',
    promptDirective: `MODE 01 — NATURAL AMERICAN ("natural_american"):
- Goal: Sound completely fluent, idiomatic, and effortless to a contemporary native American English speaker.
- Use everyday American vocabulary, natural sentence rhythm, and smooth contractions ("I'm", "wasn't", "didn't", "we'll", "it's").
- Replace stiff textbook phrasing, literal non-native translations, or awkward syntax with phrasing an American naturally reaches for.
- Keep slang minimal or absent unless the source clearly calls for a light colloquial idiom.
- Avoid forced colloquialisms, exaggerated regional accents, phonetic spellings, or stiff corporate jargon.
- This is the safest, cleanest everyday American voice.`,
  },
  casual_slang: {
    id: 'casual_slang',
    number: '02',
    title: 'Casual & Slang',
    copyLabel: 'CASUAL & SLANG',
    shortTag: 'Friends & Texting',
    description:
      'Relaxed spoken and texted American English—warm, conversational, and naturally peppered with contemporary expressions.',
    bestFor: 'Group chats, close friends, DMs, and relaxed hangouts',
    headerBgClass: 'bg-[#1F4E5F]',
    headerTextClass: 'text-[#F7F5EC]',
    accentBadgeClass: 'text-[#1F4E5F]',
    promptDirective: `MODE 02 — CASUAL & SLANG ("casual_slang"):
- Goal: Sound like a real American casually talking, texting, or catching up with friends.
- Use relaxed sentence structure, natural spoken transitions, and authentic conversational expressions where they genuinely fit (e.g., "honestly", "for real", "no way", "I'm down", "that sucks", "kinda", "pretty much", "did not see that coming", "heads-up", "my bad").
- Match the emotional register and maturity of the source message—do NOT turn every output into a caricature of a teenager, influencer, or TikTok meme.
- Never cram internet slang into every clause; pick 1–3 natural colloquial touches that make it sound genuinely spoken.`,
  },
  unfiltered_blunt: {
    id: 'unfiltered_blunt',
    number: '03',
    title: 'Unfiltered & Blunt',
    copyLabel: 'UNFILTERED & BLUNT',
    shortTag: 'Zero Fluff · Direct',
    description:
      'Candid, stripped-down, and unapologetically direct. Cuts hedging and keeps raw honesty—including profanity when it fits.',
    bestFor: 'Venting, cutting through excuses, or saying the quiet part out loud',
    headerBgClass: 'bg-[#7A1C1C]',
    headerTextClass: 'text-[#F7F5EC]',
    accentBadgeClass: 'text-[#7A1C1C]',
    promptDirective: `MODE 03 — UNFILTERED & BLUNT ("unfiltered_blunt"):
- Goal: Express the exact same message with maximum candor, directness, and emotional clarity.
- Strip away unnecessary hedging, over-apologizing, and polite padding ("perhaps", "I was wondering if maybe", "if you don't mind").
- Use stronger, punchier American verbs and candid phrasing.
- Preserve existing profanity from the source, and allow natural American profanity ("shit", "damn", "hell", "pissed", "BS", "crap") when frustration, shock, or blunt emphasis genuinely fits the message's tone.
- Bluntness means directness, NOT invented hostility: if the original message is calm, neutral, or respectful, make it crisp and plainspoken rather than randomly angry. Never invent insults, threats, or personal attacks.`,
  },
  badass_confident: {
    id: 'badass_confident',
    number: '04',
    title: 'Badass & Confident',
    copyLabel: 'BADASS & CONFIDENT',
    shortTag: 'Composed & Bold',
    description:
      'Self-assured, sharp, and memorable. High-agency American phrasing with calm poise and decisive rhythm.',
    bestFor: 'Standing your ground, bold pitches, decisive replies, and high-confidence moments',
    headerBgClass: 'bg-[#2B2147]',
    headerTextClass: 'text-[#F7F5EC]',
    accentBadgeClass: 'text-[#2B2147]',
    promptDirective: `MODE 04 — BADASS & CONFIDENT ("badass_confident"):
- Goal: Sound bold, composed, self-possessed, and sharpest-in-the-room without losing composure.
- Use decisive wording, crisp cadence, high-agency sentence construction, and sharp American idioms.
- Allow controlled edge or occasional tasteful profanity ONLY when it genuinely elevates the message.
- Avoid corny motivational-speaker clichés, fake tough-guy posturing, theatrical bragging, or turning a normal statement into a fight.
- Never invent promises, ultimatums, or achievements not supported by the original text.`,
  },
};

export const ORDERED_MODE_CONFIGS: ModeConfig[] = [
  MODE_CONFIGS.natural_american,
  MODE_CONFIGS.casual_slang,
  MODE_CONFIGS.unfiltered_blunt,
  MODE_CONFIGS.badass_confident,
];
