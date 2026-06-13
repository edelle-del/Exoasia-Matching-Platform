export type MemberRole = "startup" | "investor" | "ecosystem_partner";

export type DocBlock =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "list"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "tip"; text: string }
  | { type: "note"; text: string }
  | { type: "important"; text: string }
  | { type: "screenshot"; src?: string; alt: string; caption?: string }
  | { type: "role-blocks"; blocks: Partial<Record<MemberRole, DocBlock[]>> };

export type DocSection = {
  id: string;
  title: string;
  /** Empty = visible to all roles */
  roles?: MemberRole[];
  blocks: DocBlock[];
};

export const MEMBER_ROLES: { id: MemberRole; label: string; description: string }[] = [
  {
    id: "startup",
    label: "Startup",
    description: "Founders seeking capital and strategic partners",
  },
  {
    id: "investor",
    label: "Investor",
    description: "Funds and angels deploying capital",
  },
  {
    id: "ecosystem_partner",
    label: "Ecosystem Partner",
    description: "Accelerators and networks managing portfolios",
  },
];

export function sectionVisible(section: DocSection, role: MemberRole): boolean {
  if (!section.roles || section.roles.length === 0) return true;
  return section.roles.includes(role);
}
