"use client";

import type { MemberRole } from "@/lib/docs/types";
import { MEMBER_ROLES } from "@/lib/docs/types";

type Props = {
  activeRole: MemberRole;
  onRoleChange: (role: MemberRole) => void;
  detectedRole?: MemberRole | null;
};

export default function DocsRoleTabs({ activeRole, onRoleChange, detectedRole }: Props) {
  return (
    <div className="docs-role-tabs mb-8">
      <p className="mb-3 text-sm font-medium text-[#7a6a5a]">
        {detectedRole
          ? "Showing docs for your account role. Switch to explore other member types."
          : "Select your member type to see role-specific guides."}
      </p>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Member role">
        {MEMBER_ROLES.map((role) => {
          const isActive = activeRole === role.id;
          const isDetected = detectedRole === role.id;
          return (
            <button
              key={role.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onRoleChange(role.id)}
              className={`rounded-xl border px-4 py-2.5 text-left transition ${
                isActive
                  ? "border-[#ff6b1f] bg-[#fff5ef] shadow-sm"
                  : "border-[#e8e0d0] bg-white hover:border-[#d4c5a9]"
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`text-sm font-bold ${isActive ? "text-[#ff6b1f]" : "text-[#1a1028]"}`}
                >
                  {role.label}
                </span>
                {isDetected && (
                  <span className="rounded-md bg-[#1a1028] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
                    You
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-xs text-[#7a6a5a]">{role.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
