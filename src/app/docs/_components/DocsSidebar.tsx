"use client";

import type { MemberRole } from "@/lib/docs/types";

type NavItem = { id: string; title: string };

type Props = {
  items: NavItem[];
  activeId: string | null;
  onNavigate: (id: string) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
};

export default function DocsSidebar({
  items,
  activeId,
  onNavigate,
  mobileOpen,
  onMobileClose,
}: Props) {
  const nav = (
    <nav className="docs-sidebar-nav space-y-0.5" aria-label="Documentation sections">
      {items.map((item) => {
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onNavigate(item.id);
              onMobileClose();
            }}
            className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
              isActive
                ? "bg-[#fff5ef] font-semibold text-[#ff6b1f]"
                : "font-medium text-[#5a4a3a] hover:bg-[#f5efe0] hover:text-[#1a1028]"
            }`}
          >
            {item.title}
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Desktop sidebar — static, never scrolls with the page */}
      <aside className="docs-sidebar hidden lg:flex lg:w-56 lg:shrink-0 lg:flex-col lg:pt-8 lg:sm:pt-10">
        <p className="mb-3 shrink-0 text-xs font-bold tracking-widest text-[#9a8a7a] uppercase">
          On this page
        </p>
        <div className="flex-1 overflow-y-auto pr-2">
          {nav}
        </div>
      </aside>

      {/* Mobile drawer */}
      <aside
        className={`docs-sidebar-mobile fixed top-14 left-0 z-50 h-[calc(100vh-3.5rem)] w-72 overflow-y-auto border-r border-[#e8e0d0] bg-[#faf8f4] p-4 transition-transform lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <p className="mb-3 text-xs font-bold tracking-widest text-[#9a8a7a] uppercase">
          On this page
        </p>
        {nav}
      </aside>
    </>
  );
}

export function DocsMobileNavButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-4 flex items-center gap-2 rounded-lg border border-[#e8e0d0] bg-white px-3 py-2 text-sm font-semibold text-[#5a4a3a] lg:hidden"
    >
      <i className="ri-menu-line text-base" aria-hidden="true" />
      Sections
    </button>
  );
}
