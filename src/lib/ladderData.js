import {
  Shield, Zap, HeartPulse, Home, Layers, Umbrella,
  Users, PiggyBank, Landmark, TrendingUp, Briefcase,
} from 'lucide-react';

export const TYPE_META = {
  buffer: {
    label: 'Buffer',
    hex: '#17BEBB',
    text: 'text-buffer',
    soft: 'bg-buffer/10',
    border: 'border-buffer/30',
    fill: 'from-buffer/60 to-buffer',
    bar: 'bg-buffer',
    dot: 'bg-buffer',
  },
  debt: {
    label: 'Debt',
    hex: '#FF6B35',
    text: 'text-debt',
    soft: 'bg-debt/10',
    border: 'border-debt/30',
    fill: 'from-debt/60 to-debt',
    bar: 'bg-debt',
    dot: 'bg-debt',
  },
  investment: {
    label: 'Investment',
    hex: '#6C7BFF',
    text: 'text-invest',
    soft: 'bg-invest/10',
    border: 'border-invest/30',
    fill: 'from-invest/60 to-invest',
    bar: 'bg-invest',
    dot: 'bg-invest',
  },
};

export const RUNG_ICON_MAP = {
  Shield, Zap, HeartPulse, Home, Layers, Umbrella,
  Users, PiggyBank, Landmark, TrendingUp, Briefcase,
};

/** Liquidity label pinned to each rung position. */
export const LIQUIDITY_BY_ORDER = {
  1: 'liquid',
  2: 'liquid',
  3: 'liquid',
  4: 'liquid',
  5: 'liquid',
  6: 'liquid',
  7: 'locked',
  8: 'locked',
  9: 'invested',
  10: 'invested',
  11: 'invested',
  12: 'invested',
};

export const DEFAULT_SETTINGS = {
  monthly_reminder: true,
  deadline_alert: true,
  behind_pace: true,
  completion_notice: true,
};

export const RUNG_SEED = [
  {
    order: 1, name: 'Buffer floor', type: 'buffer', target_amount: 5000, monthly_contribution: 5000,
    start_date: '2026-11-01', target_date: '2026-11-30', icon: 'Shield',
    advantages: [
      'Ends the borrow-and-repay cycle',
      'Covers a broken phone or a sudden trip',
      'Keeps Fuliza out of ordinary weeks',
    ],
  },
  {
    order: 2, name: 'Clear Fuliza', type: 'debt', target_amount: 5300, monthly_contribution: 5300,
    start_date: '2026-12-01', target_date: '2026-12-06', icon: 'Zap',
    advantages: [
      'Stops 25 to 30 shillings a day of daily fees',
      'Frees future M-Pesa inflows',
      'Removes automatic deduction from incoming money',
    ],
  },
  {
    order: 3, name: 'Insurance-ready buffer', type: 'buffer', target_amount: 12000, monthly_contribution: 5000,
    start_date: '2026-12-01', target_date: '2026-12-31', icon: 'HeartPulse',
    advantages: [
      'Holds three months of premiums in reserve so cover is never lost to arrears',
      'Covers the co-payment a claim leaves behind',
      'Unlocks hospital cash cover at about 900 a month',
    ],
  },
  {
    order: 4, name: 'One month of essentials', type: 'buffer', target_amount: 25000, monthly_contribution: 5000,
    start_date: '2027-01-01', target_date: '2027-03-31', icon: 'Home',
    advantages: [
      'A full month of food, transport, tokens and pet costs without borrowing',
      'The point where a bad month stops being frightening',
      'Buys the time to say no to bad work',
    ],
  },
  {
    order: 5, name: 'Two months of essentials', type: 'buffer', target_amount: 50000, monthly_contribution: 5000,
    start_date: '2027-04-01', target_date: '2027-08-31', icon: 'Layers',
    advantages: [
      'Survives a lost client or a slow quarter',
      'Allows planned spending without guilt',
      'The minimum most advisers call a real emergency fund',
    ],
  },
  {
    order: 6, name: 'Three months of essentials', type: 'buffer', target_amount: 75000, monthly_contribution: 5000,
    start_date: '2027-09-01', target_date: '2028-01-31', icon: 'Umbrella',
    advantages: [
      'Full textbook cover',
      'The confidence to take a calculated risk',
      'Room to absorb a family emergency without derailing the plan',
    ],
  },
  {
    order: 7, name: 'SACCO membership', type: 'investment', target_amount: 24000, monthly_contribution: 2000,
    start_date: '2027-01-01', target_date: '2027-12-31', icon: 'Users',
    advantages: [
      'Annual dividends',
      'Eligibility for development loans at about 12 per cent instead of 25 per cent digital credit',
      'Forced discipline',
    ],
  },
  {
    order: 8, name: 'Individual pension plan', type: 'investment', target_amount: 24000, monthly_contribution: 2000,
    start_date: '2027-07-01', target_date: '2028-06-30', icon: 'PiggyBank',
    advantages: [
      'Contributions are tax deductible',
      '25-year compounding',
      'An income at 55 that does not depend on working',
    ],
  },
  {
    order: 9, name: 'Treasury bills', type: 'investment', target_amount: 50000, monthly_contribution: 3000,
    start_date: '2028-10-01', target_date: '2029-06-30', icon: 'Landmark',
    advantages: [
      'About 7 to 8 per cent net with the state as counterparty',
      '91-day liquidity',
      'Beats a reserve account without market risk',
    ],
  },
  {
    order: 10, name: 'Equity unit trust or NSE index fund', type: 'investment', target_amount: 100000, monthly_contribution: 2000,
    start_date: '2029-01-01', target_date: '2031-01-31', icon: 'TrendingUp',
    advantages: [
      'The only rung that beats inflation meaningfully',
      'Dividend income',
      'A five to ten year horizon that tolerates volatility',
    ],
  },
  {
    order: 11, name: 'Business reinvestment', type: 'investment', target_amount: 60000, monthly_contribution: 2000,
    start_date: '2028-01-01', target_date: '2030-12-31', icon: 'Briefcase',
    advantages: [
      'Raises income instead of rationing it',
      'Compounds faster than any market product',
      'Builds an asset that survives a job loss',
    ],
  },
];

export function seedPayload() {
  return RUNG_SEED.map((rung) => ({
    ...rung,
    current_amount: 0,
    status: rung.order === 1 ? 'active' : 'locked',
    liquidity: LIQUIDITY_BY_ORDER[rung.order] || 'liquid',
    category_label: `Ladder: ${rung.name}`,
    linked_budget_category: `Ladder: ${rung.name}`,
    colour: TYPE_META[rung.type].hex,
    notes: '',
  }));
}