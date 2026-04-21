import VegDetailClient from "@/components/VegDetailClient";

export default async function VegetableDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <VegDetailClient slug={slug} />;
}
