"use client";

import {useEffect, useRef, useState} from "react";
import {ParameterHelp} from "./parameter-help";

const checkByValue = new WeakMap<Element, () => void>();
let observer: ResizeObserver | undefined;

export function CatalogCardValue({label, text, fullText}: {label: string; text: string; fullText: string}) {
  const container = useRef<HTMLElement>(null);
  const value = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    const cell = container.current;
    const reading = value.current;
    if (!cell || !reading) return;
    const check = () => setTruncated(reading.scrollWidth > cell.clientWidth);
    observer ??= new ResizeObserver((entries) => entries.forEach(({target}) => checkByValue.get(target)?.()));
    checkByValue.set(cell, check);
    observer.observe(cell);
    // A new value can change its text width without resizing the cell.
    const frame = requestAnimationFrame(check);
    return () => {
      cancelAnimationFrame(frame);
      observer?.unobserve(cell);
      checkByValue.delete(cell);
    };
  }, [text]);

  return <dd ref={container} className="flex min-h-6 min-w-0 items-center gap-0.5 font-mono text-[0.65rem] tabular-nums sm:text-xs" data-parameter-inline>
    <span ref={value} data-parameter-value className="min-w-0 flex-1 truncate" title={fullText}>{text}</span>
    {(fullText !== text || truncated) && <ParameterHelp label={label} text={fullText} />}
  </dd>;
}
