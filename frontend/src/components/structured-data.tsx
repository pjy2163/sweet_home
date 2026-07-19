import { serializeStructuredData } from "@/lib/structured-data";

export function StructuredData({ data }: { data: unknown }) {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: serializeStructuredData(data) }}
      type="application/ld+json"
    />
  );
}
