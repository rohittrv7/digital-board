import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/Hero";
import { ProjectShowcase } from "@/components/ProjectShowcase";
import { Roadmap } from "@/components/Roadmap";
import { SuggestionBox } from "@/components/SuggestionBox";
import { SiteFooter } from "@/components/SiteFooter";
import { Grain } from "@/components/Grain";
import { CursorGlow } from "@/components/CursorGlow";
import { projects, site } from "@/data/site";

const title = "Toolshed — Free software tools, built in the open";
const description =
  "A personal hub for free tools and desktop apps. Download Digital Teaching Board for Windows, follow what's coming next, and suggest what I should build.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Grain />
      <CursorGlow />
      <Hero />
      <main className="mx-auto max-w-6xl px-6">
        <section id="release">
          {projects
            .filter((p) => p.status === "released")
            .map((p, i) => (
              <ProjectShowcase key={p.id} project={p} index={i} />
            ))}
        </section>
        <Roadmap />
        <SuggestionBox />
        <SiteFooter />
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: projects[0]!.name,
            applicationCategory: "EducationalApplication",
            operatingSystem: "Windows",
            softwareVersion: projects[0]!.version,
            description: projects[0]!.description,
            author: { "@type": "Person", name: site.makerName },
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          }),
        }}
      />
    </div>
  );
}
