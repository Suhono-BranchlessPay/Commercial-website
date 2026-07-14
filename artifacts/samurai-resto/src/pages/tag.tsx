import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { useTenant } from "@/lib/tenant";
import { useCart } from "@/lib/cart";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

type TagPagePayload = {
  tag: {
    slug: string;
    name: string;
    description: string | null;
    itemCount: number;
    metaTitle: string | null;
    metaDescription: string | null;
  };
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
    category: string;
  }>;
  relatedTags: Array<{ slug: string; name: string }>;
};

export default function TagPage() {
  const params = useParams<{ slug?: string }>();
  const slug = params.slug || "";
  const { brandName, cityLine } = useTenant();
  const { addItem } = useCart();

  const { data, isLoading, error } = useQuery({
    queryKey: ["seo-tag", slug],
    enabled: Boolean(slug),
    queryFn: async (): Promise<TagPagePayload> => {
      const res = await fetch(`${API_BASE}/api/seo/tags/${encodeURIComponent(slug)}`);
      if (!res.ok) throw new Error("Tag not found");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-16">
        <h1 className="font-serif text-3xl mb-4">Page not available</h1>
        <p className="text-muted-foreground mb-6">
          This dish page needs at least 3 matching menu items.
        </p>
        <Link href="/menu" className="text-primary underline">
          Browse full menu
        </Link>
      </div>
    );
  }

  const city = cityLine.split(",")[0] || "";
  const h1 = city
    ? `${data.tag.name} in ${city} — ${brandName}`
    : `${data.tag.name} — ${brandName}`;

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <nav className="text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-primary">
          Home
        </Link>
        {" · "}
        <Link href="/menu" className="hover:text-primary">
          Menu
        </Link>
        {" · "}
        <span>{data.tag.name}</span>
      </nav>

      <h1 className="font-serif text-4xl md:text-5xl mb-4">{h1}</h1>
      <p className="text-muted-foreground mb-8 max-w-2xl">
        {data.tag.description}
      </p>

      <div className="flex flex-wrap gap-3 mb-10">
        <Link
          href="/order"
          className="bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold"
        >
          Order online
        </Link>
        <Link
          href="/menu"
          className="border border-border px-5 py-2.5 rounded-md font-semibold"
        >
          Full menu
        </Link>
      </div>

      <h2 className="font-serif text-2xl mb-4">
        Order {data.tag.name} from {brandName}
      </h2>
      <ul className="flex flex-col gap-4 mb-12">
        {data.items.map((it) => (
          <li
            key={it.id}
            className="flex gap-4 items-start border-b border-border pb-4"
          >
            {it.imageUrl ? (
              <img
                src={it.imageUrl}
                alt={it.name}
                className="w-24 h-20 object-cover rounded"
              />
            ) : null}
            <div className="flex-1">
              <div className="flex justify-between gap-3">
                <strong>{it.name}</strong>
                <span>${Number(it.price).toFixed(2)}</span>
              </div>
              {it.description ? (
                <p className="text-sm text-muted-foreground mt-1">
                  {it.description}
                </p>
              ) : null}
              <button
                type="button"
                className="mt-2 text-sm text-primary font-semibold"
                onClick={() =>
                  addItem(
                    {
                      id: it.id,
                      sku: it.id,
                      name: it.name,
                      description: it.description,
                      category: it.category,
                      price: it.price,
                      imageUrl: it.imageUrl,
                      available: true,
                      featured: false,
                    },
                    1,
                  )
                }
              >
                Add to cart
              </button>
            </div>
          </li>
        ))}
      </ul>

      {data.relatedTags.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Related:{" "}
          {data.relatedTags.map((t, i) => (
            <span key={t.slug}>
              {i > 0 ? " · " : null}
              <Link href={`/tags/${t.slug}`} className="text-primary underline">
                {t.name}
              </Link>
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
