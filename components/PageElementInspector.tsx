"use client";

// components/PageElementInspector.tsx
// Full-screen transparent portal overlay for picking a DOM element on the
// current page.  Renders above all other UI (z-index 9998-9999) so it works
// regardless of which page is open.
//
// Mouse: move to highlight, click to select.
// Touch: drag to highlight, hold 600 ms to select.
// Keyboard: Escape to cancel.
//
// Also exports captureElementFiles() which generates an SVG screenshot and a
// Markdown details file (page URL, outerHTML, React ancestry path) for a
// selected element.

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
  /** The actual DOM element — passed through so callers can do further inspection. */
  element: Element;
}

// ─── CSS selector helper ──────────────────────────────────────────────────────

export function getCssSelector(el: Element): string {
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

// ─── React fiber helpers ──────────────────────────────────────────────────────

export function getReactComponentName(el: Element): string | null {
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

/** Return all named React component names from the root down to the nearest enclosing component. */
export function getReactComponentChain(el: Element): string[] {
  const keys = Object.keys(el as unknown as Record<string, unknown>);
  const fiberKey = keys.find(
    (k) => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$"),
  );
  if (!fiberKey) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fiber: any = (el as unknown as Record<string, unknown>)[fiberKey];
  const chain: string[] = [];
  let limit = 100;
  while (fiber && limit-- > 0) {
    const type = fiber.type;
    if (type && typeof type === "function") {
      const name = (type.displayName || type.name) as string | undefined;
      if (name && /^[A-Z]/.test(name) && name.length > 1) chain.unshift(name);
    }
    fiber = fiber.return;
  }
  return chain;
}

/**
 * Render the DIRECT ANCESTRY PATH from the selected element up to its nearest
 * named React component (e.g. NavHeader), as a compact JSX-like snippet.
 *
 * Only the single branch leading to the selected element is shown - siblings
 * at each level are omitted and replaced with a siblings-omitted hint. This
 * keeps the output small and immediately useful without flooding the context
 * window with the entire component tree.
 */
export function generateFiberTreeText(selectedEl: Element): string {
  const elAny = selectedEl as unknown as Record<string, unknown>;
  const keys = Object.keys(elAny);
  const fiberKey = keys.find(
    (k) => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$"),
  );
  if (!fiberKey) return "(React fiber not available - production builds strip fiber data)";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectedFiber: any = elAny[fiberKey];

  // Walk UP from the selected element collecting fibers until we reach a named
  // React component (capital-letter display name). Only include fibers that have
  // a renderable type (skip fragments and root fibers).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upPath: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = selectedFiber;
  let limit = 25;

  while (cur && limit-- > 0) {
    const type = cur.type;
    if (type) upPath.push(cur); // only fibers with a renderable type
    // Stop once we've added the nearest named React component ancestor
    // (upPath.length > 1 ensures we skip the selected element itself)
    if (upPath.length > 1 && typeof type === "function") {
      const name = (type.displayName || type.name) as string | undefined;
      if (name && /^[A-Z]/.test(name) && name.length > 1) break;
    }
    cur = cur.return;
  }

  // Reverse so the component root comes first: [component, ..., selected]
  const path = upPath.slice().reverse();

  // Helper: concise attribute string from fiber props
  function attrsFor(props: Record<string, unknown>): string {
    const parts: string[] = [];
    if (typeof props.className === "string") {
      const cls =
        props.className.length > 70 ? props.className.slice(0, 70) + "..." : props.className;
      parts.push(`className="${cls}"`);
    }
    if (props.id) parts.push(`id="${props.id}"`);
    if (typeof props.href === "string") parts.push(`href="${props.href.slice(0, 50)}"`);
    if (typeof props.type === "string") parts.push(`type="${props.type}"`);
    return parts.length ? " " + parts.join(" ") : "";
  }

  // Helper: display name for a fiber type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function tagFor(type: any): string | null {
    if (typeof type === "string") return type;
    if (typeof type === "function")
      return ((type.displayName || type.name || null) as string | null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (type && typeof type === "object") return ((type as any).displayName || null) as string | null;
    return null;
  }

  const lines: string[] = [];
  const openTags: string[] = []; // ancestor tags that need closing

  for (let i = 0; i < path.length; i++) {
    const fiber = path[i];
    const isSelected = fiber === selectedFiber;
    // The element immediately above the selected one — no siblings hint between them
    const isDirectParent = i === path.length - 2;
    const pad = "  ".repeat(i);
    const props = (fiber.memoizedProps || {}) as Record<string, unknown>;
    const tag = tagFor(fiber.type);
    if (!tag) continue;

    const attrsStr = attrsFor(props);
    const textContent =
      typeof props.children === "string" ? (props.children as string).trim().slice(0, 60) : null;

    if (isSelected) {
      // Leaf: self-closing or with text content, marked as selected
      if (textContent) {
        lines.push(`${pad}<${tag}${attrsStr}>${textContent}</${tag}>  {/* <- SELECTED */}`);
      } else {
        lines.push(`${pad}<${tag}${attrsStr} />  {/* <- SELECTED */}`);
      }
    } else {
      // Ancestor: open tag + optional siblings-omitted hint
      lines.push(`${pad}<${tag}${attrsStr}>`);
      if (!isDirectParent) lines.push(`${pad}  {/* ... */}`);
      openTags.push(tag);
    }
  }

  // Close ancestor tags in reverse order
  for (let i = openTags.length - 1; i >= 0; i--) {
    lines.push(`${"".padStart(i * 2)}</${openTags[i]}>`);
  }

  return lines.join("\n");
}

// ─── File capture ─────────────────────────────────────────────────────────────

function sanitizeLabel(label: string): string {
  return label.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 40);
}

/**
 * Generate attachment files for a selected page element:
 * 1. An SVG screenshot — the element's HTML + embedded same-origin CSS rendered
 *    via SVG foreignObject. Saved directly as SVG to avoid canvas-taint issues
 *    that cause canvas.toBlob() to return null for foreignObject content.
 * 2. A Markdown details file with: page URL, React component chain, CSS selector,
 *    outerHTML, and a compact JSX ancestry path ending at the selected element.
 *
 * Both files share a common slug derived from the component name.
 */
export async function captureElementFiles(el: Element, info: PageElementInfo): Promise<File[]> {
  const slug = sanitizeLabel(info.component);
  const files: File[] = [];

  // Screenshot - synchronous SVG, skip silently on any error
  try {
    const screenshot = captureElementScreenshot(el, slug);
    if (screenshot) files.push(screenshot);
  } catch {
    // ignore
  }

  // Text details
  const pageUrl = typeof window !== "undefined" ? window.location.href : "(unknown)";
  const chain = getReactComponentChain(el);
  const chainStr =
    chain.length
      ? chain.join(" > ") + ` > [${el.tagName.toLowerCase()}]`
      : el.tagName.toLowerCase();
  const fiberTree = generateFiberTreeText(el);

  const md = [
    `# Inspected Element: <${info.component}>`,
    "",
    "## Page",
    pageUrl,
    "",
    "## React Component Chain",
    chainStr,
    "",
    "## CSS Selector",
    `\`${info.selector}\``,
    "",
    "## OuterHTML",
    "```html",
    info.html,
    "```",
    "",
    "## React Ancestry Path",
    "(direct path from nearest named component to selected element; siblings omitted)",
    "```jsx",
    fiberTree,
    "```",
  ].join("\n");

  files.push(new File([md], `element-${slug}-details.md`, { type: "text/markdown" }));
  return files;
}

/**
 * Capture a screenshot of the element as an SVG file.
 *
 * We save the SVG directly rather than routing it through a Canvas, because
 * drawing an SVG foreignObject to Canvas taints the canvas (browser security
 * restriction) and causes canvas.toBlob() to return null. Saving the SVG blob
 * as a .svg file avoids this entirely and is readable by Claude.
 */
function captureElementScreenshot(el: Element, slug: string): File | null {
  const rect = el.getBoundingClientRect();
  const w = Math.round(rect.width);
  const h = Math.round(rect.height);
  if (w < 1 || h < 1) return null;

  // Gather CSS: <style> tags in the document + same-origin stylesheet rules.
  // This preserves Tailwind utility classes and Next.js injected styles.
  const cssChunks: string[] = [];
  for (const styleEl of Array.from(document.querySelectorAll("style"))) {
    cssChunks.push(styleEl.textContent ?? "");
  }
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = Array.from(sheet.cssRules ?? []);
      cssChunks.push(rules.slice(0, 2000).map((r) => r.cssText).join("\n"));
    } catch {
      // cross-origin stylesheet - skip
    }
  }
  // Cap embedded CSS at 300 KB to stay within SVG renderer limits
  const cssText = cssChunks.join("\n").slice(0, 300_000).replace(/<\/style>/gi, "");

  const svgContent = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">`,
    `<foreignObject width="${w}" height="${h}">`,
    `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${w}px;height:${h}px;overflow:hidden;margin:0;padding:0;background:#111827">`,
    cssText ? `<style>${cssText}</style>` : "",
    el.outerHTML,
    "</div>",
    "</foreignObject>",
    "</svg>",
  ].join("");

  return new File([svgContent], `element-${slug}-screenshot.svg`, { type: "image/svg+xml" });
}

// ─── HoverLabel ───────────────────────────────────────────────────────────────

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
   * selection — typically the dialog or form panel that launched the inspector.
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

  // ── Element resolution ────────────────────────────────────────────────────

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

  function buildInfo(el: Element): PageElementInfo {
    const component = getReactComponentName(el) || el.tagName.toLowerCase();
    const selector = getCssSelector(el);
    const html = el.outerHTML.slice(0, 600);
    const text = ((el as HTMLElement).innerText ?? "").slice(0, 200).trim();
    return { component, selector, html, text, element: el };
  }

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
      if (!el) { onCancel(); return; }
      onSelect(buildInfo(el));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getElementAt, onSelect, onCancel],
  );

  // ── Touch handlers ────────────────────────────────────────────────────────

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
      if (el) { hoveredRef.current = el; setHoveredEl(el); }
      cancelLongPress();
      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null;
        if (hoveredRef.current) onSelect(buildInfo(hoveredRef.current));
      }, LONG_PRESS_MS);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getElementAt, onSelect],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touchStartRef.current) {
        const dx = touch.clientX - touchStartRef.current.x;
        const dy = touch.clientY - touchStartRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > MOVE_CANCEL_PX) cancelLongPress();
      }
      const el = getElementAt(touch.clientX, touch.clientY);
      if (el !== hoveredRef.current) { hoveredRef.current = el; setHoveredEl(el); }
    },
    [getElementAt],
  );

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    cancelLongPress();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        style={{ position: "fixed", inset: 0, zIndex: 9998, background: "transparent", touchAction: "none" }}
      />

      {/* Highlight box */}
      {rect && (
        <div
          data-primordia-inspector="highlight"
          style={{
            position: "fixed",
            left: rect.left - 1, top: rect.top - 1,
            width: rect.width + 2, height: rect.height + 2,
            outline: "2px solid #3b82f6", outlineOffset: "0",
            background: "rgba(59, 130, 246, 0.08)",
            pointerEvents: "none", zIndex: 9997,
          }}
        />
      )}

      {/* Label */}
      {hoveredEl && rect && <HoverLabel el={hoveredEl} rect={rect} />}

      {/* Instruction banner */}
      <div
        data-primordia-inspector="banner"
        style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 9999, pointerEvents: "none" }}
        className="px-4 py-2 rounded-lg bg-blue-950 border border-blue-600/60 text-xs text-blue-200 shadow-2xl whitespace-nowrap"
      >
        Click an element to attach it to your request ·{" "}
        <kbd className="opacity-70">Esc</kbd> to cancel
        <span className="hidden sm:inline"> · touch: drag to highlight, hold to select</span>
      </div>
    </>,
    document.body,
  );
}
