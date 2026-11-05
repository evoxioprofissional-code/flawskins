import { PageSkeleton } from "@/components/layout/Skeletons";

// Fallback para rotas sem esqueleto próprio.
export default function Loading() {
  return <PageSkeleton cards={3} />;
}
