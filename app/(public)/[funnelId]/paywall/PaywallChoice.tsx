'use client';

import { useState } from 'react';

import { recordBuyEvent } from '@/app/actions/tracking';

interface Tier {
  id: 'standard' | 'premium';
  label: string;
  total: string;
  whole: string;
  cents: string;
  cadence: string;
  best?: boolean;
  badge?: string;
}

const TIERS: Tier[] = [
  {
    id: 'standard',
    label: 'Standard Plan',
    total: '$19.00',
    whole: '0',
    cents: '.63',
    cadence: 'one-time',
  },
  {
    id: 'premium',
    label: 'Premium Plan',
    total: '$49.00',
    whole: '1',
    cents: '.63',
    cadence: 'one-time',
    best: true,
    badge: 'MOST POPULAR',
  },
];

interface PaywallChoiceProps {
  funnelId: string;
  utmSource: string;
}

export default function PaywallChoice({ funnelId, utmSource }: PaywallChoiceProps) {
  const [tierId, setTierId] = useState<Tier['id']>('premium');
  const [purchased, setPurchased] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTier = TIERS.find((t) => t.id === tierId) ?? TIERS[1];

  const handlePurchase = async () => {
    if (isSubmitting || purchased) return;
    setIsSubmitting(true);
    await recordBuyEvent(funnelId, utmSource);
    setIsSubmitting(false);
    setPurchased(true);
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-2.5">
        {TIERS.map((tier) => {
          const selected = tier.id === tierId;
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => setTierId(tier.id)}
              className="relative flex w-full cursor-pointer flex-col overflow-hidden text-left text-white transition"
              style={{
                padding: 0,
                background: selected
                  ? 'rgba(255,255,255,0.26)'
                  : 'var(--lg-glass-bg)',
                backdropFilter: 'blur(22px) saturate(180%)',
                WebkitBackdropFilter: 'blur(22px) saturate(180%)',
                boxShadow: selected
                  ? 'inset 0 0.5px 0 rgba(255,255,255,0.55), inset 0 -0.5px 0 rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.10), 0 8px 24px rgba(0,0,0,0.10), 0 0 0 3px rgba(60,125,217,0.2)'
                  : 'inset 0 0.5px 0 rgba(255,255,255,0.55), inset 0 -0.5px 0 rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.10), 0 8px 24px rgba(0,0,0,0.10)',
                border: selected
                  ? '1.5px solid var(--lg-accent)'
                  : '0.5px solid var(--lg-glass-border)',
                borderRadius: 'var(--lg-radius)',
              }}
            >
              {tier.best ? (
                <div
                  className="glass-gloss relative flex w-full items-center justify-center gap-1.5 text-[11px] font-bold uppercase"
                  style={{
                    padding: '6px 12px',
                    background: 'var(--lg-accent)',
                    color: 'var(--lg-accent-ink)',
                    letterSpacing: 1.2,
                  }}
                >
                  <svg
                    width="11"
                    height="13"
                    viewBox="0 0 11 13"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M5.5 0.5C5.5 3 3 3.5 3 6c0 1 .6 1.8 1.4 2.1-.3-.4-.5-.9-.5-1.4 0-1.2 1.1-1.8 1.6-2.8.5 1.3 2 2 2 3.8 0 1.5-1.1 2.8-2.5 3-.2 0-.4 0-.6-.1C2.6 10.2 1 8.8 1 6.6 1 3.5 5.5 3 5.5 0.5z"
                      fill="currentColor"
                    />
                  </svg>
                  {tier.badge}
                </div>
              ) : null}

              <div
                className="flex w-full items-center justify-between"
                style={{ padding: '14px 16px' }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex size-5 shrink-0 items-center justify-center rounded-full transition"
                    style={{
                      border: `1.5px solid ${
                        selected ? 'var(--lg-accent)' : 'rgba(255,255,255,0.45)'
                      }`,
                      background: selected ? 'var(--lg-accent)' : 'transparent',
                    }}
                  >
                    {selected ? (
                      <span
                        className="block size-[7px] rounded-full"
                        style={{ background: '#fff' }}
                      />
                    ) : null}
                  </span>
                  <div className="min-w-0">
                    <div
                      className="text-[13px] font-bold uppercase"
                      style={{
                        letterSpacing: 0.6,
                        textShadow: '0 1px 2px rgba(0,0,0,0.18)',
                      }}
                    >
                      {tier.label}
                    </div>
                    <div
                      className="mt-0.5 text-xs tabular-nums"
                      style={{ color: 'var(--lg-muted)' }}
                    >
                      {tier.total}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end">
                  <div
                    className="flex items-start tabular-nums"
                    style={{
                      gap: 1,
                      letterSpacing: -0.5,
                      textShadow: '0 1px 2px rgba(0,0,0,0.20)',
                    }}
                  >
                    <span
                      className="text-[13px] font-semibold"
                      style={{ marginTop: 4, opacity: 0.85 }}
                    >
                      $
                    </span>
                    <span
                      className="text-[28px] font-bold"
                      style={{ lineHeight: 1 }}
                    >
                      {tier.whole}
                    </span>
                    <span
                      className="text-[13px] font-semibold"
                      style={{ marginTop: 4 }}
                    >
                      {tier.cents}
                    </span>
                  </div>
                  <div
                    className="mt-0.5 text-[10px]"
                    style={{
                      color: 'var(--lg-muted)',
                      letterSpacing: 0.3,
                    }}
                  >
                    per day
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handlePurchase}
        disabled={isSubmitting || purchased}
        className="glass-gloss relative cursor-pointer overflow-hidden rounded-full"
        style={{
          padding: '18px',
          background: purchased
            ? 'linear-gradient(180deg, rgba(255,255,255,0.28), rgba(255,255,255,0.18))'
            : 'linear-gradient(180deg, color-mix(in oklab, var(--lg-accent) 100%, white 18%), var(--lg-accent))',
          backdropFilter: purchased ? 'blur(22px) saturate(180%)' : undefined,
          WebkitBackdropFilter: purchased ? 'blur(22px) saturate(180%)' : undefined,
          color: '#fff',
          border: '0.5px solid rgba(255,255,255,0.4)',
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: -0.1,
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(0,0,0,0.18), 0 8px 24px rgba(60,125,217,0.4), 0 2px 6px rgba(0,0,0,0.25)',
          textShadow: '0 1px 2px rgba(0,0,0,0.20)',
          transition: 'background 200ms, transform 100ms',
        }}
      >
        {purchased ? '✓  Welcome' : isSubmitting ? 'Processing…' : 'Start 7-day free trial'}
      </button>

      <p
        className="mt-3 text-center text-[11px]"
        style={{
          color: 'var(--lg-muted)',
          lineHeight: 1.4,
          textWrap: 'pretty',
        }}
      >
        Cancel anytime in Settings. After trial, {selectedTier.total} {selectedTier.cadence}.
      </p>
    </>
  );
}
