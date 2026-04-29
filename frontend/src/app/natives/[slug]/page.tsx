import NativeDetailClient from "@/components/NativeDetailClient";

export default async function NativeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <NativeDetailClient slug={slug} />;
}
