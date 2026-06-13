import { ApiRouteError } from "@/server/api";

export function slugifyBadgeName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function assertBadgeSlug(slug: string) {
  if (!slug || !/^[a-z0-9_]+$/.test(slug)) {
    throw new ApiRouteError(
      400,
      "INVALID_BADGE_SLUG",
      "Slug inválido. Use letras minúsculas, números e underscore.",
    );
  }
  return slug;
}

export function mapBadgeDbError(error: any): never {
  if (error?.code === "23505") {
    throw new ApiRouteError(409, "BADGE_SLUG_TAKEN", "Já existe um badge com esse slug.");
  }
  throw error;
}
