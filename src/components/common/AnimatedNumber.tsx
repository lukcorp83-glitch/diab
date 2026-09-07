import React, { useEffect, useRef, useState } from 'react';
import { animate, useMotionValue } from 'motion/react';

interface AnimatedNumberProps {
  value: number | string | null | undefined;
  decimals?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  duration?: number;
  fallback?: string;
}

export function AnimatedNumber({
  value,
  decimals = 0,
  className = '',
  prefix = '',
  suffix = '',
  duration = 0.5,
  fallback = '--'
}: AnimatedNumberProps) {
  const numericValue = typeof value === 'number' ? value : (value !== null && value !== undefined ? parseFloat(String(value)) : null);
  const isValidNumber = numericValue !== null && !isNaN(numericValue);

  const motionValue = useMotionValue(isValidNumber ? numericValue : 0);
  const [displayValue, setDisplayValue] = useState<string>(
    isValidNumber ? numericValue.toFixed(decimals) : fallback
  );
  
  const prevValueRef = useRef<number | null>(isValidNumber ? numericValue : null);

  useEffect(() => {
    if (!isValidNumber) {
      setDisplayValue(fallback);
      return;
    }

    // Sprawdź preferencje redukcji ruchu lub tryb eco
    const prefersReducedMotion = typeof window !== 'undefined' && 
      (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.getAttribute('data-eco') === 'true');

    if (prefersReducedMotion || prevValueRef.current === null) {
      motionValue.set(numericValue);
      setDisplayValue(numericValue.toFixed(decimals));
      prevValueRef.current = numericValue;
      return;
    }

    const controls = animate(motionValue, numericValue, {
      duration,
      ease: [0.16, 1, 0.3, 1], // snappy cubic-bezier
      onUpdate: (latest) => {
        setDisplayValue(latest.toFixed(decimals));
      }
    });

    prevValueRef.current = numericValue;
    return () => controls.stop();
  }, [numericValue, decimals, duration, fallback, isValidNumber]);

  if (!isValidNumber) {
    return <span className={className}>{prefix}{fallback}{suffix}</span>;
  }

  return (
    <span className={className}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
}

export default AnimatedNumber;
