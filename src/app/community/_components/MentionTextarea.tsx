"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export type Profile = {
  id: string;
  full_name: string | null;
  business_name: string | null;
};

export function MentionTextarea({
  value,
  onChange,
  placeholder,
  rows,
  className,
  onKeyDown,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadProfiles() {
      const { data } = await supabase.from("profiles").select("id, full_name, business_name");
      if (data) setProfiles(data);
    }
    loadProfiles();
  }, [supabase]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);

    const pos = e.target.selectionStart;
    setCursorPos(pos);

    // Look for @word just before the cursor
    const textBeforeCursor = val.slice(0, pos);
    const lastAtSymbolIndex = textBeforeCursor.lastIndexOf("@");
    
    // Check if the @ is at the start of the string or preceded by a space/newline
    if (
      lastAtSymbolIndex !== -1 &&
      (lastAtSymbolIndex === 0 || /\s/.test(textBeforeCursor[lastAtSymbolIndex - 1]))
    ) {
      const query = textBeforeCursor.slice(lastAtSymbolIndex + 1);
      // Ensure the query doesn't have spaces (simple mentions)
      if (!/\s/.test(query)) {
        setMentionQuery(query);
        return;
      }
    }
    setMentionQuery(null);
  };

  const handleSelectMention = (profile: Profile) => {
    if (mentionQuery === null || !textareaRef.current) return;
    
    const textBeforeQuery = value.slice(0, cursorPos - mentionQuery.length - 1); // -1 for the @
    const textAfterCursor = value.slice(cursorPos);
    
    const mentionText = `@[${profile.full_name || profile.business_name || "Unknown"}](${profile.id}) `;
    
    onChange(textBeforeQuery + mentionText + textAfterCursor);
    setMentionQuery(null);
    textareaRef.current.focus();
  };

  const filteredProfiles = profiles.filter((p) => {
    if (!mentionQuery) return true;
    const name = p.full_name || p.business_name || "";
    return name.toLowerCase().includes(mentionQuery.toLowerCase());
  }).slice(0, 5); // Limit to 5 results

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onClick={() => setMentionQuery(null)}
        placeholder={placeholder}
        rows={rows}
        className={className}
        onKeyDown={(e) => {
          if (mentionQuery !== null && e.key === "Escape") {
            setMentionQuery(null);
            e.preventDefault();
            return;
          }
          if (onKeyDown) onKeyDown(e);
        }}
      />
      {mentionQuery !== null && filteredProfiles.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-64 bg-(--color-surface) border border-(--color-hairline) rounded-lg shadow-lg bottom-full left-0 mb-1 overflow-hidden"
        >
          {filteredProfiles.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelectMention(p)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-(--color-canvas) text-(--color-ink) transition-colors border-b border-(--color-hairline) last:border-0"
            >
              <div className="font-semibold">{p.full_name}</div>
              <div className="text-xs text-(--color-muted)">{p.business_name}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
