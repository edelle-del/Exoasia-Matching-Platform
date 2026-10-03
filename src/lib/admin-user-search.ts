export function adminUserSearchFilter(search: string): string {
  // Quote each PostgREST value so commas/parentheses are data, not filter syntax.
  const value = search.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return ["full_name", "business_name", "email"]
    .map(column => `${column}.ilike."%${value}%"`).join(",");
}
