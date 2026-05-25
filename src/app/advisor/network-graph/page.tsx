"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../providers";
import { createClient } from "@/lib/supabase/client";
import {
  fetchAdvisorDashboardData,
  type AdvisorCompanyRecord,
  type AdvisorMatchRecord,
} from "@/lib/app-data";

type GraphNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  degree: number;
};

type GraphEdge = {
  source: string;
  target: string;
  status: AdvisorMatchRecord["status"];
  fitScore: number | null;
};

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

export default function NetworkGraphPage() {
  const supabase = useMemo(() => createClient(), []);
  const { role } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    nodeId: string | null;
    offsetX: number;
    offsetY: number;
    isDragging: boolean;
  }>({ nodeId: null, offsetX: 0, offsetY: 0, isDragging: false });
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<AdvisorCompanyRecord[]>([]);
  const [matches, setMatches] = useState<AdvisorMatchRecord[]>([]);

  useEffect(() => {
    if (!role || !["advisor", "admin"].includes(role)) return;

    let active = true;
    const load = async () => {
      setLoading(true);
      const next = await fetchAdvisorDashboardData(supabase);
      if (!active) return;
      setCompanies(next.companies);
      setMatches(next.matches);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [role, supabase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper || loading) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const edgeRows = matches.filter((match) =>
      ["pending", "accepted"].includes(match.status),
    );
    const companyNameById = new Map(
      companies.map((company) => [
        company.id,
        company.business_name || company.full_name || "Verified company",
      ]),
    );

    const width = wrapper.getBoundingClientRect().width;
    const height = 720;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const rng = mulberry32(
      hashString(companyNameById.values().next().value ?? "graph"),
    );
    const nodes = companies.map<GraphNode>((company, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(companies.length, 1);
      const baseRadius = Math.min(width, height) * 0.28;
      return {
        id: company.id,
        label: companyNameById.get(company.id) ?? "Verified company",
        x: width / 2 + Math.cos(angle) * baseRadius + (rng() - 0.5) * 120,
        y: height / 2 + Math.sin(angle) * baseRadius + (rng() - 0.5) * 80,
        vx: (rng() - 0.5) * 0.8,
        vy: (rng() - 0.5) * 0.8,
        radius: 16,
        degree: 0,
      };
    });

    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const edges: GraphEdge[] = edgeRows.map((match) => ({
      source: match.member_a_id,
      target: match.member_b_id,
      status: match.status,
      fitScore: match.fit_score,
    }));

    const getPointerPosition = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - bounds.left) / bounds.width) * width,
        y: ((event.clientY - bounds.top) / bounds.height) * height,
      };
    };

    const getNodeAtPoint = (x: number, y: number) => {
      for (let index = nodes.length - 1; index >= 0; index -= 1) {
        const node = nodes[index];
        const dx = x - node.x;
        const dy = y - node.y;
        if (Math.sqrt(dx * dx + dy * dy) <= node.radius + 8) {
          return node;
        }
      }
      return null;
    };

    edges.forEach((edge) => {
      const source = nodeById.get(edge.source);
      const target = nodeById.get(edge.target);
      if (source) source.degree += 1;
      if (target) target.degree += 1;
    });

    nodes.forEach((node) => {
      node.radius = 14 + Math.min(node.degree * 2, 12);
    });

    let animationFrame = 0;

    const draw = () => {
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#f8f7f2";
      context.fillRect(0, 0, width, height);

      for (let gridX = 0; gridX < width; gridX += 80) {
        context.strokeStyle = "rgba(0, 0, 0, 0.04)";
        context.beginPath();
        context.moveTo(gridX, 0);
        context.lineTo(gridX, height);
        context.stroke();
      }
      for (let gridY = 0; gridY < height; gridY += 80) {
        context.strokeStyle = "rgba(0, 0, 0, 0.04)";
        context.beginPath();
        context.moveTo(0, gridY);
        context.lineTo(width, gridY);
        context.stroke();
      }

      edges.forEach((edge) => {
        const source = nodeById.get(edge.source);
        const target = nodeById.get(edge.target);
        if (!source || !target) return;

        context.beginPath();
        context.moveTo(source.x, source.y);
        context.lineTo(target.x, target.y);
        context.lineWidth = edge.status === "accepted" ? 2.5 : 1.5;
        if (edge.status === "accepted") {
          context.strokeStyle = "rgba(16, 185, 129, 0.58)";
          context.setLineDash([]);
        } else {
          context.strokeStyle = "rgba(30, 64, 175, 0.72)";
          context.setLineDash([6, 6]);
        }
        context.stroke();
        context.setLineDash([]);
      });

      nodes.forEach((node) => {
        if (
          dragStateRef.current.isDragging &&
          dragStateRef.current.nodeId === node.id
        ) {
          node.vx = 0;
          node.vy = 0;
          node.x = clamp(node.x, 40, width - 40);
          node.y = clamp(node.y, 40, height - 40);
          return;
        }

        const dx = width / 2 - node.x;
        const dy = height / 2 - node.y;
        node.vx += dx * 0.00035;
        node.vy += dy * 0.00035;

        nodes.forEach((other) => {
          if (other.id === node.id) return;
          const xDiff = node.x - other.x;
          const yDiff = node.y - other.y;
          const distanceSquared = Math.max(xDiff * xDiff + yDiff * yDiff, 80);
          const force = 1800 / distanceSquared;
          node.vx += (xDiff / Math.sqrt(distanceSquared)) * force * 0.002;
          node.vy += (yDiff / Math.sqrt(distanceSquared)) * force * 0.002;
        });

        edges.forEach((edge) => {
          if (edge.source !== node.id && edge.target !== node.id) return;
          const otherId = edge.source === node.id ? edge.target : edge.source;
          const other = nodeById.get(otherId);
          if (!other) return;
          const xDiff = other.x - node.x;
          const yDiff = other.y - node.y;
          const distance = Math.max(
            Math.sqrt(xDiff * xDiff + yDiff * yDiff),
            1,
          );
          const desiredDistance = edge.status === "accepted" ? 150 : 190;
          const pull = (distance - desiredDistance) * 0.0009;
          node.vx += (xDiff / distance) * pull;
          node.vy += (yDiff / distance) * pull;
        });

        node.vx *= 0.94;
        node.vy *= 0.94;
        node.x = clamp(node.x + node.vx, 40, width - 40);
        node.y = clamp(node.y + node.vy, 40, height - 40);
      });

      nodes.forEach((node) => {
        context.beginPath();
        context.arc(node.x, node.y, node.radius + 6, 0, Math.PI * 2);
        context.fillStyle = "rgba(255, 255, 255, 0.65)";
        context.fill();

        context.beginPath();
        context.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        context.fillStyle = "rgba(18, 18, 18, 0.9)";
        context.fill();

        context.beginPath();
        context.arc(node.x, node.y, node.radius + 2, 0, Math.PI * 2);
        context.strokeStyle =
          node.degree === 0
            ? "rgba(220, 38, 38, 0.75)"
            : "rgba(59, 130, 246, 0.65)";
        context.lineWidth = 2;
        context.stroke();

        context.fillStyle = "#111827";
        context.font = "12px Inter, system-ui, sans-serif";
        context.textAlign = "center";
        context.fillText(
          truncate(node.label, 18),
          node.x,
          node.y - node.radius - 10,
        );

        context.fillStyle = node.degree === 0 ? "#dc2626" : "#6b7280";
        context.font = "10px Inter, system-ui, sans-serif";
        context.fillText(
          node.degree === 0 ? "No matches" : `${node.degree} links`,
          node.x,
          node.y + node.radius + 16,
        );
      });

      animationFrame = window.requestAnimationFrame(draw);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const position = getPointerPosition(event);
      const node = getNodeAtPoint(position.x, position.y);
      if (!node) return;

      dragStateRef.current = {
        nodeId: node.id,
        offsetX: position.x - node.x,
        offsetY: position.y - node.y,
        isDragging: true,
      };

      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
      node.vx = 0;
      node.vy = 0;
    };

    const handlePointerMove = (event: PointerEvent) => {
      const { nodeId, offsetX, offsetY, isDragging } = dragStateRef.current;
      if (!isDragging || !nodeId) return;

      const node = nodeById.get(nodeId);
      if (!node) return;

      const position = getPointerPosition(event);
      node.x = clamp(position.x - offsetX, 40, width - 40);
      node.y = clamp(position.y - offsetY, 40, height - 40);
      node.vx = 0;
      node.vy = 0;
    };

    const releaseDrag = () => {
      dragStateRef.current = {
        nodeId: null,
        offsetX: 0,
        offsetY: 0,
        isDragging: false,
      };
      canvas.style.cursor = "grab";
    };

    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", releaseDrag);
    canvas.addEventListener("pointercancel", releaseDrag);
    canvas.addEventListener("pointerleave", releaseDrag);

    draw();

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", releaseDrag);
      canvas.removeEventListener("pointercancel", releaseDrag);
      canvas.removeEventListener("pointerleave", releaseDrag);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [companies, loading, matches]);

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] px-[5%] py-12">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <section className="rounded-[20px] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-muted)]">
                Advisor tools
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">
                Particle network graph
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-[var(--color-body)]">
                The graph animates company relationships and differentiates
                pending and accepted matches.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <LegendCard
            tone="amber"
            title="Pending"
            description="Dashed edges show match threads still awaiting full agreement."
          />
          <LegendCard
            tone="emerald"
            title="Accepted"
            description="Solid edges show accepted match relationships."
          />
          <LegendCard
            tone="slate"
            title="Isolated"
            description="Red-ring nodes indicate companies with no current match links."
          />
        </section>

        <section
          ref={wrapperRef}
          className="overflow-hidden rounded-[24px] border border-[var(--color-hairline)] bg-[#12121A] p-4"
        >
          <canvas
            ref={canvasRef}
            className="block w-full rounded-[20px]"
            height={720}
          />
        </section>

      </div>
    </div>
  );
}

function LegendCard({
  tone,
  title,
  description,
}: {
  tone: "amber" | "emerald" | "slate";
  title: string;
  description: string;
}) {
  const toneClasses =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-slate-200 bg-slate-50 text-slate-800";

  return (
    <div className={`rounded-[18px] border p-5 ${toneClasses}`}>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-2 text-sm">{description}</p>
    </div>
  );
}

