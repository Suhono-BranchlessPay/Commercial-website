import { FooterConfig } from "@/types/config";

const ORDERLY_URL = "https://orderlyfoods.com";

export function FooterDark({ data }: { data: FooterConfig["data"] }) {
  return (
    <footer className="bg-zinc-950 text-zinc-400 py-12 md:py-16 border-t border-zinc-900">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          <div className="space-y-4 md:col-span-2">
            <a href="/" className="font-serif font-bold text-2xl text-white block">
              {data.logo}
            </a>
            <p className="max-w-sm text-zinc-500">
              Thank you for dining with us. We look forward to serving you again.
            </p>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-white font-medium">Links</h4>
            <nav className="flex flex-col gap-2">
              {data.menuLinks.map((link, i) => (
                <a key={i} href={link.href} className="hover:text-white transition-colors w-fit">
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="space-y-4">
            <h4 className="text-white font-medium">Contact</h4>
            <div className="space-y-2 text-sm">
              {data.address && <p>{data.address}</p>}
              {data.phone && <p>{data.phone}</p>}
            </div>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-zinc-900 text-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} {data.logo}. All rights reserved.</p>
          <a
            href={ORDERLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label="Powered by Orderly Foods"
          >
            <span className="text-xs uppercase tracking-[0.18em] font-semibold text-zinc-400">Powered by</span>
            <img src="/orderly-powered-on-dark.png" alt="Orderly Foods" className="h-8 md:h-9 w-auto" />
          </a>
        </div>
      </div>
    </footer>
  );
}
