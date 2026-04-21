import FlowerDetailClient from "@/components/FlowerDetailClient";

export default async function FlowerDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <FlowerDetailClient slug={slug} />;
}
