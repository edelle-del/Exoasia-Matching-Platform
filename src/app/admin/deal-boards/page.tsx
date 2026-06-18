"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/app/providers";
import { fetchAllDealCards } from "@/lib/app-data";
import TopHeader from "@/app/_components/TopHeader";
import { Search, MapPin, Briefcase, Filter } from "lucide-react";

type DealCard = Awaited<ReturnType<typeof fetchAllDealCards>>[0];

const DEAL_STAGES = [
  { id: "discover", label: "Discover / Qualified" },
  { id: "intro", label: "Intro & Scoping" },
  { id: "proposal", label: "Proposal / Pilot" },
  { id: "negotiation", label: "Negotiation / Legal" },
  { id: "won", label: "Closed-Won / Pilot Go" },
  { id: "lost", label: "Closed-Lost / On Hold" },
];

export default function AdminDealBoardsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { role } = useAuth();
  
  const [cards, setCards] = useState<DealCard[]>([]);
  const [users, setUsers] = useState<{ id: string; full_name: string; business_name: string | null }[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      const { data } = await supabase.from("profiles").select("id, full_name, business_name").order("full_name");
      if (data) setUsers(data as any);
    }
    loadUsers();
  }, [supabase]);

  useEffect(() => {
    async function loadCards() {
      setLoading(true);
      const data = await fetchAllDealCards(supabase, selectedUser === "all" ? undefined : selectedUser);
      setCards(data);
      setLoading(false);
    }
    loadCards();
  }, [supabase, selectedUser]);

  if (role !== "admin" && role !== "advisor") {
    return <div className="p-8 text-(--color-danger)">Unauthorized</div>;
  }

  return (
    <div className="flex h-screen w-full flex-col bg-(--color-canvas)">
      <TopHeader />
      
      <div className="flex flex-col border-b border-(--color-hairline) bg-(--color-surface) px-8 py-6">
        <h1 className="text-2xl font-semibold text-(--color-ink)">Deal Boards (Admin View)</h1>
        <p className="mt-1 text-sm text-(--color-muted)">
          View read-only deal pipelines across the platform.
        </p>

        <div className="mt-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-(--color-muted)" />
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="h-9 rounded-[10px] border border-(--color-hairline) bg-(--color-canvas) px-3 text-sm text-(--color-ink) outline-none focus:border-(--color-primary)"
            >
              <option value="all">Select a User (Default: All Deals)</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || "Unknown"} {u.business_name ? `(${u.business_name})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-8">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-(--color-ink) border-t-transparent" />
          </div>
        ) : (
          <div className="flex h-full min-w-max items-start gap-6 pb-8">
            {DEAL_STAGES.map((col) => {
              const colCards = cards.filter((c) => c.stage === col.id);
              
              return (
                <div
                  key={col.id}
                  className="flex h-full w-[340px] flex-col rounded-xl bg-(--color-surface) border border-(--color-hairline) shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-(--color-hairline) px-4 py-3">
                    <h2 className="text-sm font-semibold text-(--color-ink)">{col.label}</h2>
                    <span className="rounded-full bg-(--color-canvas) px-2 py-0.5 text-xs font-medium text-(--color-muted) border border-(--color-hairline)">
                      {colCards.length}
                    </span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-3">
                    {colCards.map((card) => (
                      <div
                        key={card.id}
                        className="mb-3 rounded-lg border border-(--color-hairline) bg-(--color-canvas) p-4 shadow-sm"
                      >
                        <h3 className="text-sm font-semibold text-(--color-ink) leading-tight mb-2">
                          {card.title}
                        </h3>
                        
                        <div className="space-y-2">
                          <div className="flex flex-col gap-1 text-xs text-(--color-muted)">
                            <div className="flex justify-between">
                              <span>Buyer:</span>
                              <span className="font-medium text-(--color-ink) truncate max-w-[150px]">
                                {(card as any).buyer_name}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Provider:</span>
                              <span className="font-medium text-(--color-ink) truncate max-w-[150px]">
                                {(card as any).provider_name}
                              </span>
                            </div>
                          </div>
                          
                          {card.fit_score != null && (
                            <div className="mt-2 inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                              Fit {card.fit_score}%
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {colCards.length === 0 && (
                      <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-(--color-hairline) bg-(--color-canvas)/50">
                        <p className="text-xs text-(--color-muted)">No deals</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
