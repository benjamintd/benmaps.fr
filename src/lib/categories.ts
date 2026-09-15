// Single source of truth for the nearby-search categories: the URL validator and
// the category bar both derive from this table so they cannot drift apart.
export const categories = [
  { id: "restaurant", label: "Restaurants", color: "orange" },
  { id: "cafe", label: "Coffee", color: "brown" },
  { id: "park", label: "Parks", color: "green" },
  { id: "museum", label: "Museums", color: "purple" },
] as const;

export type CategoryId = (typeof categories)[number]["id"];

export function isCategoryId(value: unknown): value is CategoryId {
  return categories.some((category) => category.id === value);
}
