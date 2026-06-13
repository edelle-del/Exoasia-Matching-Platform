"use client";

import type { DocBlock, MemberRole } from "@/lib/docs/types";

function renderInlineText(text: string) {
  const parts = text.split(/(\/[\w-]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("/")) {
      return (
        <code key={i} className="docs-inline-code">
          {part}
        </code>
      );
    }
    return part;
  });
}

function DocBlockRenderer({
  block,
  role,
}: {
  block: DocBlock;
  role: MemberRole;
}) {
  switch (block.type) {
    case "p":
      return <p className="docs-p">{renderInlineText(block.text)}</p>;

    case "h3":
      return <h3 className="docs-h3">{block.text}</h3>;

    case "steps":
      return (
        <ol className="docs-steps">
          {block.items.map((item, i) => (
            <li key={i}>{renderInlineText(item)}</li>
          ))}
        </ol>
      );

    case "list":
      return (
        <ul className="docs-list">
          {block.items.map((item, i) => (
            <li key={i}>{renderInlineText(item)}</li>
          ))}
        </ul>
      );

    case "table":
      return (
        <div className="docs-table-wrap">
          <table className="docs-table">
            <thead>
              <tr>
                {block.headers.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>{renderInlineText(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "tip":
      return (
        <div className="docs-callout docs-callout-tip" role="note">
          <strong>Tip:</strong> {block.text}
        </div>
      );

    case "note":
      return (
        <div className="docs-callout docs-callout-note" role="note">
          <strong>Note:</strong> {block.text}
        </div>
      );

    case "important":
      return (
        <div className="docs-callout docs-callout-important" role="note">
          <strong>Important:</strong> {block.text}
        </div>
      );

    case "screenshot": {
      const slug = block.alt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      // Fallback logic: if no explicit src, use a role-specific path automatically
      const src = block.src || `/docs/screenshots/${role}/${slug}.png`;
      return (
        <figure className="docs-screenshot my-6">
          {src ? (
            <div className="overflow-hidden rounded-xl border border-[#e8e0d0] shadow-md">
              {/* browser chrome bar */}
              <div className="flex items-center gap-1.5 border-b border-[#e8e0d0] bg-[#f5efe0] px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={block.alt}
                className="w-full object-cover object-top"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="docs-screenshot-placeholder" aria-hidden="true">
              <i className="ri-image-line text-2xl text-[#c9b89a]" />
              <span className="text-sm text-[#9a8a7a]">{block.alt}</span>
            </div>
          )}
          {block.caption && (
            <figcaption className="mt-2 text-center text-xs text-[#9a8a7a]">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );
    }

    case "role-blocks": {
      const roleBlocks = block.blocks[role];
      if (!roleBlocks?.length) return null;
      return (
        <>
          {roleBlocks.map((b, i) => (
            <DocBlockRenderer key={i} block={b} role={role} />
          ))}
        </>
      );
    }

    default:
      return null;
  }
}

export default function DocsSectionContent({
  id,
  title,
  blocks,
  role,
}: {
  id: string;
  title: string;
  blocks: DocBlock[];
  role: MemberRole;
}) {
  return (
    <section id={id} className="docs-section scroll-mt-24">
      <h2 className="docs-h2">{title}</h2>
      <div className="docs-section-body">
        {blocks.map((block, i) => (
          <DocBlockRenderer key={i} block={block} role={role} />
        ))}
      </div>
    </section>
  );
}
