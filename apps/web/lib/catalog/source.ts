import catalogData from "@/content/catalog.json";

export type AccessTier = "free" | "paid";
export type CatalogKind = "chapter" | "lab";
export type EntitlementKey = "core_paid";
export type CatalogPartKey =
  | "foundations"
  | "fabric-operations"
  | "infrastructure"
  | "scale-architecture"
  | "advanced-networking"
  | "ncp-ain-platform";

export type SourceCatalogItem = {
  kind: CatalogKind;
  slug: string;
  number: number;
  title: string;
  href: string;
  durationMinutes: number;
  durationLabel: string;
  tags: string[];
  description: string;
  previewSummary: string;
  defaultPublished: boolean;
  defaultAccessTier: AccessTier;
  defaultPreviewEnabled: boolean;
  sourceChapterSlug: string;
  partKey?: CatalogPartKey;
  partTitle?: string;
  partDescription?: string;
};

export type CatalogItem = SourceCatalogItem & {
  isPublished: boolean;
  accessTier: AccessTier;
  previewEnabled: boolean;
};

export type CatalogAccessState = {
  item: CatalogItem | null;
  canAccess: boolean;
  isLocked: boolean;
  shouldShowPreview: boolean;
  isPublished: boolean;
  isAdmin: boolean;
  hasPaidEntitlement: boolean;
};

type CatalogData = {
  chapters: SourceCatalogItem[];
  labs: SourceCatalogItem[];
};

const typedCatalog = catalogData as CatalogData;

export const SOURCE_CHAPTERS = typedCatalog.chapters;
export const SOURCE_LABS = typedCatalog.labs;
export const SOURCE_CATALOG_ITEMS = [...SOURCE_CHAPTERS, ...SOURCE_LABS];

export const PARTS = [
  {
    key: "foundations" as const,
    title: "Part 1 - Foundations",
    description: "No prerequisites - Ch 0-2",
  },
  {
    key: "fabric-operations" as const,
    title: "Part 2 - Fabric Operations",
    description: "Requires Part 1 - Ch 3-8",
  },
  {
    key: "infrastructure" as const,
    title: "Part 3 - Physical Layer and Infrastructure",
    description: "Requires Part 2 - Ch 9-11",
  },
  {
    key: "scale-architecture" as const,
    title: "Part 4 - Scale and Architecture",
    description: "Requires Part 3 - Ch 12-16",
  },
  {
    key: "advanced-networking" as const,
    title: "Part 5 - Advanced Networking",
    description: "Requires Part 4 - Ch 22-23",
  },
  {
    key: "ncp-ain-platform" as const,
    title: "Part 6 - NCP-AIN Platform Chapters",
    description: "Requires Part 5 - Ch 24+",
  },
];

export function getSourceCatalogItem(kind: CatalogKind, slug: string): SourceCatalogItem | null {
  return SOURCE_CATALOG_ITEMS.find((item) => item.kind === kind && item.slug === slug) ?? null;
}

export function getSourceChapters(): SourceCatalogItem[] {
  return SOURCE_CHAPTERS.slice();
}

export function getSourceLabs(): SourceCatalogItem[] {
  return SOURCE_LABS.slice();
}
