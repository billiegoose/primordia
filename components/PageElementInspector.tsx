"use client";

// components/PageElementInspector.tsx
// Full-screen transparent portal overlay for picking a DOM element on the
// current page.  Renders above all other UI (z-index 9998–9999) so it works
// regardless of which page is open.
//
// Mouse: move to highlight, click to select.
// Touch: drag to highlight, hold 600 ms to select.
// Keyboard: Escape to cancel.
//
// The overlay filters out itself and an optional `skipElement` (the calling
// dialog) when resolving the element under the pointer so those containers
// are never returned as a selection.

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PageElementInfo {
  /** Nearest React component display-name, or the lowercase tag name as fallback. */
  component: string;
  /** Compact CSS path selector (up to 5 ancestors). */
  selector: string;
  /** Raw outerHTML, truncated to 600 characters. */
  html: string;
  /** Visible text content, truncated to 200 characters. */
  text: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a short CSS path selector for `el`, stopping at BODY / HTML. */
function getCssSelector(el: Element): string {
  const path: string[] = [];
  let current: Element | null = el;
  while (current && current.tagName && current.tagName !== "HTML" && current.tagName !== "BODY") {
    const id = (current as HTMLElement).id;
    if (id) {
      path.unshift(`#${id}`);
      break;
    }
    let part = current.tagName.toLowerCase();
    const classes: string[] = [];
    for (let i = 0; i < current.classList.length && classes.length < 2; i++) {
      const c = current.classList[i];
      // Skip Tailwind utility classes and pseudo-variants
      if (
        c.length < 25 &&
        !c.includes(":") &&
        !c.includes("/") &&
        !c.includes("[") &&
        !c.includes("]")
      ) {
        classes.push(c);
      }
    }
    if (classes.length > 0) part += "." + classes.join(".");
    const siblings = current.parentElement
      ? Array.from(current.parentElement.children).filter(
          (s) => s.tagName === (current as Element).tagName,
        )
      : [];
    if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
    path.unshift(part);
    if (path.length >= 5) break;
    current = current.parentElement;
  }
  return path.join(" > ");
}

/** Walk the React fibre tree from `el` to find the nearest named component. */
function getReactComponentName(el: Element): string | null {
  const keys = Object.keys(el as unknown as Record<string, unknown>);
  const fiberKey = keys.find(
    (k) => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$"),
  );
  if (!fiberKey) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fiber: any = (el as unknown as Record<string, unknown>)[fiberKey];
  let limit = 60;
  while (fiber && limit-- > 0) {
    const type = fiber.type;
    if (type && typeof type === "function") {
      const name = (type.displayName || type.name) as string | undefined;
      if (name && /^[A-Z]/.test(name) && name.length > 1) return name;
    }
    if (type && typeof type === "object") {
      let name: string | undefined = type.displayName;
      if (!name && type.render) name = type.render.displayName || type.render.name;
      if (!name && type.type) name = type.type.displayName || type.type.name;
      if (name && /^[A-Z]/.test(name) && name.length > 1) return name;
    }
    fiber = fiber.return;
  }
  return null;
}

// ─── HoverLabel ───────────────────────────────────────────────────────────────

/** Floating label showing component name + CSS selector, anchored above the highlighted element. */
function HoverLabel({ el, rect }: { el: Element; rect: DOMRect }) {
  const component = getReactComponentName(el) || el.tagName.toLowerCase();
  const selector = getCssSelector(el);

  const labelH = 22;
  let top = rect.top - labelH - 4;
  if (top < 4) top = rect.bottom + 4;
  const left = Math.max(4, Math.min(rect.left, window.innerWidth - 320));

  return (
    <div
      data-primordia-inspector="label"
      style={{
        position: "fixed",
        top,
        left,
        zIndex: 9999,
        pointerEvents: "none",
        maxWidth: "90vw",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
      className="px-2 py-0.5 rounded bg-blue-600 text-white text-xs font-mono shadow-lg"
    >
      &lt;{component}&gt; {selector}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PageElementInspector({
  onSelect,
  onCancel,
  skipElement,
}: {
  onSelect: (info: PageElementInfo) => void;
  onCancel: () => void;
  /**
   * An element (and all its descendants) that should be excluded from
   * selection — typically the dialog that launched the inspector.
   */
  skipElement?: HTMLElement | null;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [hoveredEl, setHoveredEl] = useState<Element | null>(null);
  const hoveredRef = useRef<Element | null>(null);

  // ── Crosshair cursor ──────────────────────────────────────────────────────

  useEffect(() => {
    const style = document.createElement("style");
    style.id = "__primordia_inspector_cursor";
    style.textContent = "* { cursor: crosshair !important; }";
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

  // ── Escape to cancel ──────────────────────────────────────────────────────

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onCancel]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Returns the topmost non-inspector, non-dialog element at (x, y). */
  const getElementAt = useCallback(
    (x: number, y: number): Element | null => {
      const candidates = document.elementsFromPoint(x, y);
      for (const el of candidates) {
        if (el === overlayRef.current) continue;
        if (el instanceof HTMLElement && el.hasAttribute("data-primordia-inspector")) continue;
        if (skipElement && (skipElement === el || skipElement.contains(el))) continue;
        return el;
      }
      return null;
    },
    [skipElement],
  );

  // ── Mouse handlers ────────────────────────────────────────────────────────

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const el = getElementAt(e.clientX, e.clientY);
      if (el !== hoveredRef.current) {
        hoveredRef.current = el;
        setHoveredEl(el);
      }
    },
    [getElementAt],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const el = getElementAt(e.clientX, e.clientY);
      if (!el) {
        onCancel();
        return;
      }
      const component = getReactComponentName(el) || el.tagName.toLowerCase();
      const selector = getCssSelector(el);
      const html = el.outerHTML.slice(0, 600);
      const text = ((el as HTMLElement).innerText ?? "").slice(0, 200).trim();
      onSelect({ component, selector, html, text });
    },
    [getElementAt, onSelect, onCancel],
  );

  // ── Touch handlers (drag to highlight, long-press to select) ─────────────

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const LONG_PRESS_MS = 600;
  const MOVE_CANCEL_PX = 12;

  function cancelLongPress() {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      const el = getElementAt(touch.clientX, touch.clientY);
      if (el) {
        hoveredRef.current = el;
        setHoveredEl(el);
      }
      cancelLongPress();
      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null;
        if (hoveredRef.current) {
          const target = hoveredRef.current;
          const component = getReactComponentName(target) || target.tagName.toLowerCase();
          const selector = getCssSelector(target);
          const html = target.outerHTML.slice(0, 600);
          const text = ((target as HTMLElement).innerText ?? "").slice(0, 200).trim();
          onSelect({ component, selector, html, text });
        }
      }, LONG_PRESS_MS);
    },
    [getElementAt, onSelect],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touchStartRef.current) {
        const dx = touch.clientX - touchStartRef.current.x;
        const dy = touch.clientY - touchStartRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > MOVE_CANCEL_PX) {
          cancelLongPress();
        }
      }
      const el = getElementAt(touch.clientX, touch.clientY);
      if (el !== hoveredRef.current) {
        hoveredRef.current = el;
        setHoveredEl(el);
      }
    },
    [getElementAt],
  );

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    cancelLongPress();
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  if (typeof document === "undefined") return null;

  const rect = hoveredEl?.getBoundingClientRect() ?? null;

  return createPortal(
    <>
      {/* Transparent full-screen overlay — captures all pointer events */}
      <div
        ref={overlayRef}
        data-primordia-inspector="overlay"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background: "transparent",
          touchAction: "none",
        }}
      />

      {/* Highlight box around the hovered element */}
      {rect && (
        <div
          data-primordia-inspector="highlight"
          style={{
            position: "fixed",
            left: rect.left - 1,
            top: rect.top - 1,
            width: rect.width + 2,
            height: rect.height + 2,
            outline: "2px solid #3b82f6",
            outlineOffset: "0",
            background: "rgba(59, 130, 246, 0.08)",
            pointerEvents: "none",
            zIndex: 9997,
          }}
        />
      )}

      {/* Component name + selector label */}
      {hoveredEl && rect && <HoverLabel el={hoveredEl} rect={rect} />}

      {/* Instruction banner */}
      <div
        data-primordia-inspector="banner"
        style={{
          position: "fixed",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          pointerEvents: "none",
        }}
        className="px-4 py-2 rounded-lg bg-blue-950 border border-blue-600/60 text-xs text-blue-200 shadow-2xl whitespace-nowrap"
      >
        Click an element to add it to your request ·{" "}
        <kbd className="opacity-70">Esc</kbd> to cancel
        <span className="hidden sm:inline"> · touch: drag to highlight, hold to select</span>
      </div>
    </>,
    document.body,
  );
}
