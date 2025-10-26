"use client";

export type ConfettiOptions = {
  emojis?: string[];
  count?: number;
  spread?: number; // pixels horizontally to spread from center
  durationMs?: number;
};

export function launchEmojiConfetti(options: ConfettiOptions = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const {
    emojis = ['🎉', '🎊', '✨', '🪅', '🥳', '🎈', '💫'],
    count = 28,
    spread = Math.min(window.innerWidth, 320),
    durationMs = 1200,
  } = options;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.inset = '0px';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';
  document.body.appendChild(container);

  const centerX = window.innerWidth / 2;
  const startY = -24; // slightly above viewport

  for (let i = 0; i < count; i++) {
    const span = document.createElement('span');
    span.className = 'confetti-emoji';
    span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    const offsetX = (Math.random() - 0.5) * spread;
    const startX = centerX + offsetX;

    const size = 16 + Math.random() * 14; // 16-30px
    const delay = Math.random() * 120;
    const rot = Math.random() * 360;
    const fall = durationMs + Math.random() * 400;

    span.style.position = 'fixed';
    span.style.left = `${startX}px`;
    span.style.top = `${startY}px`;
    span.style.fontSize = `${size}px`;
    span.style.willChange = 'transform, opacity';
    span.style.transform = `translateY(0) rotate(${rot}deg)`;
    span.style.animation = `confetti-fall ${fall}ms ease-out ${delay}ms forwards, confetti-rotate ${fall}ms linear ${delay}ms forwards`;

    container.appendChild(span);
  }

  window.setTimeout(() => {
    try { document.body.removeChild(container); } catch {}
  }, durationMs + 600);
}
