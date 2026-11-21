"use client";

import { useEffect, useId, useRef, useState } from "react";
import {useCopy} from "@/i18n/ui-copy";
import { CircleHelp } from "lucide-react";
import {cn} from "@/lib/utils";

const openEvent = "rangeset:parameter-help";
const margin = 10;

export function ParameterHelp({ label, text, symbol }: { label: string; text: string; symbol?: string }) {
  const {t} = useCopy();
  const id = useId();
  const anchor = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clickOpen = useRef(false);
  const [open, setOpen] = useState(false);

  function cancelClose() { clearTimeout(timer.current); }
  function show() {
    cancelClose();
    document.dispatchEvent(new CustomEvent(openEvent, { detail: id }));
    setOpen(true);
  }
  function hide() {
    cancelClose();
    clickOpen.current = false;
    setOpen(false);
  }
  function delayClose() {
    cancelClose();
    if (!clickOpen.current) timer.current = setTimeout(hide, 150);
  }

  useEffect(() => {
    const panel = popup.current;
    const button = anchor.current;
    if (!open || !panel || !button) return;
    panel.showPopover();

    function close() {
      clickOpen.current = false;
      setOpen(false);
    }
    function position() {
      const rect = button!.getBoundingClientRect();
      const scroller = button!.closest(".comparison-scroll");
      const viewport = scroller?.getBoundingClientRect();
      const header = scroller?.querySelector("thead th")?.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight || (viewport && (
        rect.bottom <= (header?.bottom ?? viewport.top) || rect.top >= viewport.bottom ||
        rect.right <= viewport.left || rect.left >= viewport.right
      ))) {
        close();
        return;
      }
      const scope = button!.closest("[data-parameter-inline]") ?? button!.closest("[data-parameter-row]");
      const explained = [...(scope?.querySelectorAll("[data-parameter-value]") ?? [])]
        .flatMap((value) => Array.from(value.getClientRects()))
        .filter((value) => value.bottom > Math.max(0, header?.bottom ?? 0) && value.top < Math.min(innerHeight, viewport?.bottom ?? innerHeight)
          && value.right > Math.max(0, viewport?.left ?? 0) && value.left < Math.min(innerWidth, viewport?.right ?? innerWidth));
      const gap = 6;
      const first = Math.min(rect.top, ...explained.map(({ top }) => Math.max(top, header?.bottom ?? 0)));
      const last = Math.max(rect.bottom, ...explained.map(({ bottom }) => Math.min(bottom, viewport?.bottom ?? innerHeight)));
      const lanes = [
        { space: innerHeight - margin - last - gap, top: last + gap, below: true },
        { space: first - margin - gap, top: first - gap, below: false },
      ];
      panel!.style.maxHeight = "";
      const { width, height } = panel!.getBoundingClientRect();
      const lane = lanes.find(({ space }) => space >= height) ?? lanes.sort((a, b) => b.space - a.space)[0];
      if (lane.space < 32) {
        close();
        return;
      }
      const paintedHeight = Math.min(height, lane.space);
      if (paintedHeight < height) panel!.style.maxHeight = paintedHeight + "px";
      const left = Math.max(margin, Math.min(innerWidth - width - margin, rect.left + rect.width / 2 - width / 2));
      panel!.style.left = left + "px";
      panel!.style.top = (lane.below ? lane.top : lane.top - paintedHeight) + "px";
    }
    function outside(event: PointerEvent) {
      if (!panel!.contains(event.target as Node) && !button!.contains(event.target as Node)) close();
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    function other(event: Event) {
      if ((event as CustomEvent).detail !== id) close();
    }

    position();
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    document.addEventListener(openEvent, other);
    window.addEventListener("scroll", position, true);
    window.addEventListener("resize", position);
    return () => {
      panel.hidePopover();
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      document.removeEventListener(openEvent, other);
      window.removeEventListener("scroll", position, true);
      window.removeEventListener("resize", position);
      clearTimeout(timer.current);
    };
  }, [id, open]);

  return <span className="parameter-help">
    <button ref={anchor} type="button" className={cn("parameter-help-button", symbol && symbol.length > 1 && "!w-auto whitespace-normal text-left")} aria-label={symbol ? label : t("ui.about", {label})}
      aria-describedby={id} aria-expanded={open} onPointerEnter={(event) => { if (event.pointerType === "mouse") show(); }}
      onPointerLeave={(event) => { if (event.pointerType === "mouse" && !event.currentTarget.matches(":focus-visible")) delayClose(); }}
      onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) show(); }}
      onBlur={hide} onClick={() => {
        if (clickOpen.current) hide();
        else { clickOpen.current = true; show(); }
      }}>
      {symbol ? <span data-parameter-value aria-hidden="true">{symbol}</span> : <CircleHelp size={14} aria-hidden="true" />}
    </button>
    <span ref={popup} id={id} role="tooltip" popover="manual" className="parameter-tooltip"
      onPointerEnter={cancelClose} onPointerLeave={() => { if (!anchor.current?.matches(":focus-visible")) delayClose(); }}>
      <strong className="block text-foreground">{label}</strong>
      {text && <span className="mt-1 block">{text}</span>}
    </span>
  </span>;
}
