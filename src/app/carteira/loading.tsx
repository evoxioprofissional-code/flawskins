import { PageSkeleton } from "@/components/layout/Skeletons";

export default function CarteiraLoading() {
  return <PageSkeleton cards={3} label="Carregando carteira" />;
}
