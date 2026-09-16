import { Reveal } from "@/components/Reveal";
import { roadmap } from "@/data/site";

const statusLabel: Record<string, string> = {
  released: "Shipped",
  "in-progress": "In progress",
  planned: "Open",
};

export function Roadmap() {
  return (
    <section id="roadmap" className="border-b border-border py-20">
      <Reveal>
        <p className="label-mono mb-6">The workshop</p>
        <h2 className="max-w-2xl font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-extrabold leading-[1] tracking-[-0.03em]">
          What's out, what's coming,
          <span className="text-primary"> what's undecided.</span>
        </h2>
      </Reveal>

      <ol className="relative mt-14">
        <span
          aria-hidden
          className="absolute left-[7px] top-2 bottom-2 w-px bg-border md:left-1/2"
        />
        {roadmap.map((item, i) => (
          <Reveal key={item.id} delay={i * 0.08}>
            <li className="relative grid grid-cols-1 gap-2 py-7 pl-8 md:grid-cols-2 md:gap-10 md:pl-0">
              <span
                aria-hidden
                className={`absolute left-0 top-9 h-3.5 w-3.5 rounded-full border-2 md:left-1/2 md:-translate-x-1/2 ${
                  item.status === "planned"
                    ? "border-border bg-background"
                    : "border-primary bg-primary"
                } ${item.status === "in-progress" ? "animate-pulse" : ""}`}
              />
              <div className={i % 2 === 0 ? "md:pr-12 md:text-right" : "md:order-2 md:pl-12"}>
                <p className="label-mono">{statusLabel[item.status]}</p>
                <h3 className="mt-2 font-display text-2xl font-bold tracking-tight">
                  {item.name}
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground md:inline-block">
                  {item.blurb}
                </p>
              </div>
              <div className={i % 2 === 0 ? "md:pl-12" : "md:order-1 md:pr-12 md:text-right"}>
                <span className="inline-block rounded-full border border-border bg-surface px-4 py-1.5 font-mono text-xs text-foreground">
                  {item.target}
                </span>
              </div>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
