import { useEffect, useRef, useState } from 'react';

const DEFAULT_ANIMATION_DURATION_MS = 450;

type AnimatedNumberProps = {
  durationMs?: number;
  value?: number | null;
};

export default function AnimatedNumber({
  durationMs = DEFAULT_ANIMATION_DURATION_MS,
  value,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const displayValueRef = useRef(0);

  useEffect(() => {
    if (value === undefined || value === null) return;

    const targetValue = value;
    const startValue = displayValueRef.current;
    const difference = targetValue - startValue;
    if (difference === 0) return;

    let frameId = 0;

    function tick(timestamp: number, startedAt = timestamp) {
      const progress = Math.min((timestamp - startedAt) / durationMs, 1);
      const easedProgress = 1 - (1 - progress) ** 3;
      const nextValue = Math.round(startValue + difference * easedProgress);

      displayValueRef.current = nextValue;
      setDisplayValue(nextValue);

      if (progress < 1) {
        frameId = window.requestAnimationFrame((nextTimestamp) =>
          tick(nextTimestamp, startedAt),
        );
      } else {
        displayValueRef.current = targetValue;
        setDisplayValue(targetValue);
      }
    }

    frameId = window.requestAnimationFrame((timestamp) => tick(timestamp));

    return () => window.cancelAnimationFrame(frameId);
  }, [durationMs, value]);

  return displayValue.toLocaleString('ko-KR');
}
