"use client";

// components/SimpleMarkdown.tsx
//
// Markdown rendering backed by streamdown.
//
// SimpleMarkdown   — renders markdown in a chat-context style (inherits parent
//                    text colour/size so it works inside coloured bubbles).
// MarkdownContent  — renders multi-line block markdown with the app's dark
//                    prose styling (text-xs, text-gray-300, etc.).

import { Streamdown, type Components } from "streamdown";

// ─── Shared inline elements ───────────────────────────────────────────────────
// Link and inline-code styling is the same in all contexts.

function Anchor({ href, children }: { href?: string; children?: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline text-blue-300 hover:text-blue-200"
    >
      {children}
    </a>
  );
}

function InlineCode({ children, className }: { children?: React.ReactNode; className?: string }) {
  if (className?.startsWith("language-")) {
    return <code className={className}>{children}</code>;
  }
  return <code className="bg-gray-700 px-1 rounded text-xs">{children}</code>;
}

// ─── Components for chat bubbles (SimpleMarkdown) ────────────────────────────
// Minimal overrides — paragraph spacing only; text colour/size come from the
// parent container so the component works inside any coloured bubble.

const chatComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  a: ({ href, children }) => <Anchor href={href}>{children}</Anchor>,
  code: ({ children, className }) => <InlineCode className={className}>{children}</InlineCode>,
  pre: ({ children }) => (
    <pre className="bg-gray-800 rounded p-3 overflow-x-auto mb-3 text-xs">{children}</pre>
  ),
  strong: ({ children }) => <strong>{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 mb-2">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
};

// ─── Components for block prose (MarkdownContent) ────────────────────────────
// Explicit text-xs / text-gray-300 styling matching the previous hand-rolled
// MarkdownContent renderer.

const proseComponents: Components = {
  p: ({ children }) => (
    <p className="text-xs text-gray-300 leading-relaxed mb-3">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside space-y-0.5 mb-3 text-xs text-gray-300 leading-relaxed">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-0.5 mb-3 text-xs text-gray-300 leading-relaxed">
      {children}
    </ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  a: ({ href, children }) => <Anchor href={href}>{children}</Anchor>,
  code: ({ children, className }) => <InlineCode className={className}>{children}</InlineCode>,
  pre: ({ children }) => (
    <pre className="bg-gray-800 rounded p-3 overflow-x-auto mb-3 text-xs">{children}</pre>
  ),
  strong: ({ children }) => <strong>{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  h1: ({ children }) => (
    <h1 className="text-sm font-bold text-gray-100 mb-2 mt-3">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm font-semibold text-gray-100 mb-2 mt-3">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-xs font-semibold text-gray-200 mb-1 mt-2">{children}</h3>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-gray-600 pl-3 text-xs text-gray-400 mb-3">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-gray-700 mb-3" />,
};

// ─── SimpleMarkdown ──────────────────────────────────────────────────────────

export function SimpleMarkdown({ text }: { text: string }) {
  if (!text) return null;
  return (
    <Streamdown mode="static" components={chatComponents}>
      {text}
    </Streamdown>
  );
}

// ─── MarkdownContent ─────────────────────────────────────────────────────────

export function MarkdownContent({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  return (
    <Streamdown mode="static" className={className} components={proseComponents}>
      {text}
    </Streamdown>
  );
}
