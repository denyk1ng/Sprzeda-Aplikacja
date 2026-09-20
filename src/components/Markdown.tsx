import type { ReactNode } from "react";

/**
 * Minimal, dependency-free markdown renderer for the AI-generated research
 * reports and recommendations - just enough of the subset Claude actually
 * produces (## headings, - bullets, **bold**, bare URLs) to look like a
 * real document instead of a wall of raw markdown syntax.
 */
export function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];
  let paragraph: string[] = [];
  let key = 0;

  function flushList() {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`ul-${key++}`} className="my-2 ml-1 flex flex-col gap-1.5">
        {listItems.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink-700">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-400" />
            <span>{inline(item)}</span>
          </li>
        ))}
      </ul>
    );
    listItems = [];
  }

  function flushParagraph() {
    if (paragraph.length === 0) return;
    blocks.push(
      <p key={`p-${key++}`} className="text-sm leading-relaxed text-ink-700">
        {inline(paragraph.join(" "))}
      </p>
    );
    paragraph = [];
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push(
        <h3
          key={`h-${key++}`}
          className="mt-1 text-[13px] font-bold uppercase tracking-wide text-brand-700"
        >
          {line.slice(3)}
        </h3>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      flushParagraph();
      listItems.push(line.slice(2));
    } else if (line === "") {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();

  return <div className={className}>{blocks}</div>;
}

function inline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|https?:\/\/\S+)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-ink-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (/^https?:\/\//.test(part)) {
      const clean = part.replace(/[.,)]+$/, "");
      return (
        <a
          key={i}
          href={clean}
          target="_blank"
          rel="noreferrer"
          className="text-brand-600 underline decoration-brand-200 underline-offset-2 hover:text-brand-700"
        >
          {clean}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
