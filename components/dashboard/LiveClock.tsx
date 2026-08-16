'use client';

import { useEffect, useState } from 'react';

export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(interval);
  }, []);

  if (!now) return null;

  const dateText = now.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeText = now.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <span style={clock}>
      {dateText} · {timeText}
    </span>
  );
}

const clock = {
  fontSize: '13px',
  color: '#93c5fd',
  fontWeight: 600,
};
