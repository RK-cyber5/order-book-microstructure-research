export const GITHUB_URL = "https://github.com/RK-cyber5/order-book-microstructure-research";

export const NAV_ITEMS = [
  { label: "Overview", href: "#overview" },
  { label: "Signals", href: "#signals" },
  { label: "Generalization", href: "#generalization" },
  { label: "Execution", href: "#execution" },
  { label: "Methodology", href: "#methodology" },
] as const;

/** Feature palette shared by charts, legends, and 3D signal space. */
export const FEATURE_COLORS = {
  l1_imb: "#1d5be6",
  l5_imb_1k: "#0e9f8e",
  microprice_dev: "#64748b",
  ofi: "#b45309",
} as const;

export const FEATURE_SHORT_LABELS = {
  l1_imb: "L1 Imbalance",
  l5_imb_1k: "L5 Imbalance",
  microprice_dev: "Microprice",
  ofi: "OFI",
} as const;
