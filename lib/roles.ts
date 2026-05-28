export type AppRole = "owner" | "admin" | "member";

export const ROLE_LABEL: Record<AppRole, string> = {
  owner: "Líder",
  admin: "Analista",
  member: "Stakeholder",
};

export const ROLE_COLOR: Record<AppRole, string> = {
  owner: "#E8621A",
  admin: "#1E6FC5",
  member: "#6B6B6B",
};

export const ROLE_BG: Record<AppRole, string> = {
  owner: "#FFF4EE",
  admin: "#EAF1FB",
  member: "#F5F5F5",
};

export const ROLE_BORDER: Record<AppRole, string> = {
  owner: "#FDDCB5",
  admin: "#BDD5F5",
  member: "#E5E5E5",
};

export function canWrite(role: AppRole): boolean {
  return role === "owner" || role === "admin";
}

export function canManageMembers(role: AppRole): boolean {
  return role === "owner" || role === "admin";
}
