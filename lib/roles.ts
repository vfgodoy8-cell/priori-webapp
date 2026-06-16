export type AppRole = "owner" | "admin" | "member";

export const ROLE_LABEL: Record<AppRole, string> = {
  owner: "Líder",
  admin: "Analista",
  member: "Stakeholder",
};

export const ROLE_COLOR: Record<AppRole, string> = {
  owner:  "#1E56C4",
  admin:  "#4F46E5",
  member: "#5C6B7A",
};

export const ROLE_BG: Record<AppRole, string> = {
  owner:  "#EDF2FC",
  admin:  "#EEF2FF",
  member: "#F4F5F6",
};

export const ROLE_BORDER: Record<AppRole, string> = {
  owner:  "#B8CEEF",
  admin:  "#C7D2FE",
  member: "#D1D8DE",
};

export function canWrite(role: AppRole): boolean {
  return role === "owner" || role === "admin";
}

export function canManageMembers(role: AppRole): boolean {
  return role === "owner" || role === "admin";
}
