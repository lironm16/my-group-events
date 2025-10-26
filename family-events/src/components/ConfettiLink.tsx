"use client";

import Link from 'next/link';
import { launchEmojiConfetti } from '@/components/confetti';
import React from 'react';

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
  confettiCount?: number;
  confettiDurationMs?: number;
  target?: string;
  rel?: string;
};

export default function ConfettiLink({
  href,
  children,
  className,
  title,
  confettiCount = 28,
  confettiDurationMs = 1200,
  target,
  rel,
}: Props) {
  return (
    <Link
      href={href}
      className={className}
      title={title}
      target={target}
      rel={rel}
      onClick={() => {
        try {
          launchEmojiConfetti({ count: confettiCount, durationMs: confettiDurationMs });
        } catch {}
      }}
    >
      {children}
    </Link>
  );
}
