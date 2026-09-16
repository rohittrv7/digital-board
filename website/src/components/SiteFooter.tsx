import { Reveal } from "@/components/Reveal";
import { site } from "@/data/site";

export function SiteFooter() {
  return (
    <footer className="py-20">
      <div className="grid grid-cols-12 gap-x-6 gap-y-10">
        <Reveal className="col-span-12 lg:col-span-7">
          <p className="label-mono mb-6">Why I build these</p>
          <p className="max-w-xl font-display text-xl leading-snug tracking-tight sm:text-2xl">
            {site.aboutNote}
          </p>
          <p className="label-mono mt-6">— {site.makerName}</p>
        </Reveal>

        <Reveal delay={0.1} className="col-span-12 lg:col-span-5">
          <p className="label-mono mb-6">Elsewhere</p>
          <ul className="border-t border-border">
            {site.links.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  className="group flex items-center justify-between border-b border-border py-3.5 text-sm transition-colors hover:text-primary"
                >
                  {l.label}
                  <span className="text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary">
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>

      <div className="mt-16 flex flex-col justify-between gap-3 border-t border-border pt-6 sm:flex-row">
        <span className="label-mono">
          {site.hubName} — {site.tagline}
        </span>
        <span className="label-mono">© {new Date().getFullYear()} {site.makerName}</span>
      </div>
    </footer>
  );
}
