export type CreditPackId = "starter" | "production" | "studio";

export type CreditPack = {
  id: CreditPackId;
  label: string;
  credits: number;
  priceUsd: number;
  description: string;
};

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "starter",
    label: "Starter pack",
    credits: 25,
    priceUsd: 39,
    description: "For a few small texture batches.",
  },
  {
    id: "production",
    label: "Production pack",
    credits: 100,
    priceUsd: 129,
    description: "Best fit for regular scenery work.",
  },
  {
    id: "studio",
    label: "Studio pack",
    credits: 250,
    priceUsd: 279,
    description: "Lowest per-credit price for larger runs.",
  },
];

export function getCreditPack(id: string) {
  return CREDIT_PACKS.find((pack) => pack.id === id);
}
