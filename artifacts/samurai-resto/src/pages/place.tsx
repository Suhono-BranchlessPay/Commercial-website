import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { useTenant } from "@/lib/tenant";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

type PlacePagePayload = {
  place: {
    slug: string;
    name: string;
    state: string | null;
    distanceMiles: number;
    deliveryAvailable: boolean;
    metaTitle: string | null;
    metaDescription: string | null;
  };
  featured: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
  }>;
};

export default function PlacePage() {
  const params = useParams<{ slug?: string }>();
  const slug = params.slug || "";
  const { brandName, fullAddress, phoneTel, phoneDisplay, mapsSearchUrl } =
    useTenant();

  const { data, isLoading, error } = useQuery({
    queryKey: ["seo-place", slug],
    enabled: Boolean(slug),
    queryFn: async (): Promise<PlacePagePayload> => {
      const res = await fetch(
        `${API_BASE}/api/seo/places/${encodeURIComponent(slug)}`,
      );
      if (!res.ok) throw new Error("Place not found");
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
        <h1 className="font-serif text-3xl mb-4">Area not served</h1>
        <p className="text-muted-foreground mb-6">
          We only publish place pages inside our real delivery/pickup radius.
        </p>
        <Link href="/menu" className="text-primary underline">
          Browse menu
        </Link>
      </div>
    );
  }

  const { place, featured } = data;
  const h1 = `Food Delivery & Pickup in ${place.name} — ${brandName}`;

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <nav className="text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-primary">
          Home
        </Link>
        {" · "}
        <span>{place.name}</span>
      </nav>

      <h1 className="font-serif text-4xl md:text-5xl mb-4">{h1}</h1>
      <p className="text-muted-foreground mb-4 max-w-2xl">
        {place.metaDescription}
      </p>
      <p className="mb-8">
        {place.deliveryAvailable
          ? `Delivery available — about ${place.distanceMiles} miles from the restaurant.`
          : `Pickup available — about ${place.distanceMiles} miles from ${place.name}.`}
      </p>

      <div className="flex flex-wrap gap-3 mb-10">
        <Link
          href="/order"
          className="bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold"
        >
          Order for pickup
        </Link>
        <Link
          href="/menu"
          className="border border-border px-5 py-2.5 rounded-md font-semibold"
        >
          View menu
        </Link>
      </div>

      <h2 className="font-serif text-2xl mb-4">Popular from {brandName}</h2>
      <ul className="flex flex-col gap-3 mb-12">
        {featured.map((it) => (
          <li key={it.id} className="border-b border-border pb-3">
            <div className="flex justify-between gap-3">
              <strong>{it.name}</strong>
              <span>${Number(it.price).toFixed(2)}</span>
            </div>
            {it.description ? (
              <p className="text-sm text-muted-foreground mt-1">
                {it.description}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      <h2 className="font-serif text-2xl mb-3">Restaurant location</h2>
      <address className="not-italic text-muted-foreground mb-4">
        {brandName}
        <br />
        {fullAddress}
        {phoneTel ? (
          <>
            <br />
            <a href={`tel:${phoneTel}`} className="text-primary">
              {phoneDisplay || phoneTel}
            </a>
          </>
        ) : null}
      </address>
      <a
        href={mapsSearchUrl}
        target="_blank"
        rel="noreferrer"
        className="text-primary underline"
      >
        Map & directions
      </a>
    </div>
  );
}
