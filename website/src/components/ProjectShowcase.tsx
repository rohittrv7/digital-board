import { Reveal } from "@/components/Reveal";
import type { Project } from "@/data/site";

export function ProjectShowcase({ project, index }: { project: Project; index: number }) {
  return (
    <article className="relative border-b border-border py-20 first:pt-4">
      <div className="grid grid-cols-12 gap-x-6 gap-y-10">
        <Reveal className="col-span-12 lg:col-span-5">
          <p className="label-mono mb-6">
            {String(index + 1).padStart(2, "0")} — Current release
          </p>
          <h2 className="font-display text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-[0.95] tracking-[-0.03em]">
            {project.name}
          </h2>
          <p className="mt-4 max-w-md text-lg text-primary">{project.tagline}</p>
          <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
            {project.description}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={project.downloadUrl}
              download
              className="group inline-flex items-center gap-3 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-16px_var(--primary)]"
            >
              <span className="transition-transform duration-300 group-hover:translate-y-0.5">
                ↓
              </span>
              Download for {project.platform} (.exe)
            </a>
            <span className="label-mono rounded-full border border-border px-4 py-2">
              {project.platform} only
            </span>
          </div>

          <dl className="mt-8 flex gap-8 border-t border-border pt-5">
            {[
              ["Version", project.version],
              ["Size", project.fileSize],
              ["Price", "Free"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="label-mono">{k}</dt>
                <dd className="mt-1 font-mono text-sm text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <Reveal delay={0.1} className="col-span-12 lg:col-span-7">
          {/* styled window frame mockup */}
          <div className="group relative rounded-xl border border-border bg-surface p-2 shadow-[0_40px_120px_-40px_oklch(0_0_0)] transition-transform duration-500 hover:-translate-y-1 lg:-mt-6">
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-surface-2" />
              <span className="h-2.5 w-2.5 rounded-full bg-surface-2" />
              <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
              <span className="label-mono ml-3 truncate">{project.name}</span>
            </div>
            <img
              src={project.screenshot}
              alt={`${project.name} in use — ${project.tagline}`}
              width={1600}
              height={1008}
              loading="lazy"
              className="w-full rounded-lg border border-border"
            />
          </div>

          <ul className="mt-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
            {project.features.map((f) => (
              <li
                key={f.title}
                className="group bg-background p-5 transition-colors duration-300 hover:bg-surface"
              >
                <p className="font-display text-base font-bold tracking-tight">
                  <span className="mr-2 text-primary transition-transform duration-300 group-hover:mr-3 inline-block">
                    /
                  </span>
                  {f.title}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {f.detail}
                </p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </article>
  );
}
