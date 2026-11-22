import { LIQUIDITY_BY_ORDER } from './ladderData';

export const LIQUIDITY_KEYS = ['liquid', 'locked', 'invested'];

/**
 * The three labels, their pill styling and the plain-English definition shown
 * in the info sheet. Colours come from the semantic status tokens so they stay
 * readable in both the aurora dark and daylight paper themes.
 */
export const LIQUIDITY_META = {
  liquid: {
    label: 'Liquid',
    pill: 'border-buffer/40 bg-buffer/15 text-buffer',
    dot: 'bg-buffer',
    definition:
      "Money you can reach today or this week without asking anyone's permission or paying a penalty. It earns little, and that is the price of safety.",
  },
  locked: {
    label: 'Locked',
    pill: 'border-debt/40 bg-debt/15 text-debt',
    dot: 'bg-debt',
    definition:
      'Money that is yours but held by an institution on its terms. You may need notice, or you may not get it back until you exit or retire. It usually earns more than liquid money.',
  },
  invested: {
    label: 'Invested',
    pill: 'border-invest/40 bg-invest/15 text-invest',
    dot: 'bg-invest',
    definition:
      'Money that has been turned into an asset that can fall in value and takes days or months to sell. It earns the most over years, and it is the first to hurt in a bad month.',
  },
};

export function liquidityOf(rung) {
  if (LIQUIDITY_KEYS.includes(rung?.liquidity)) return rung.liquidity;
  return LIQUIDITY_BY_ORDER[Number(rung?.order)] || 'liquid';
}