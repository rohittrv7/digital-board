import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Reveal } from "@/components/Reveal";

const TYPES = ["App", "Website", "Desktop Tool", "Other"] as const;

const fieldClass =
  "w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors duration-200 focus:border-primary";

export function SuggestionBox() {
  const [type, setType] = useState<(typeof TYPES)[number]>("App");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const details = String(form.get("details") ?? "").trim();
    if (!details) return;

    setSending(true);
    setError(null);

    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const accessKey =
      (import.meta.env["VITE_WEB3FORMS_ACCESS_KEY"] as string | undefined) ||
      "YOUR_ACCESS_KEY_HERE";

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: accessKey,
          name: name || "Anonymous",
          email: email || "no-reply@suggestion.local",
          subject: `New Suggestion: [${type}] from Website`,
          suggestion_type: type,
          message: details,
          from_name: "Digital Teaching Board Hub",
        }),
      });

      const result = (await response.json()) as { success?: boolean; message?: string };
      if (result.success) {
        setDone(true);
      } else {
        setError(result.message || "That didn't send. Please try again in a moment.");
      }
    } catch (err) {
      console.error("Web3Forms submission error:", err);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="suggest" className="border-b border-border py-20">
      <div className="grid grid-cols-12 gap-x-6 gap-y-10">
        <Reveal className="col-span-12 lg:col-span-5">
          <p className="label-mono mb-6">Suggestion box</p>
          <h2 className="font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-extrabold leading-[1] tracking-[-0.03em]">
            Tell me what to
            <span className="text-primary"> build next.</span>
          </h2>
          <p className="mt-5 max-w-md leading-relaxed text-muted-foreground">
            Genuinely — the roadmap above is shaped by these. A half-formed idea
            is fine. A very specific annoyance is even better.
          </p>
        </Reveal>

        <div className="col-span-12 lg:col-span-7">
          <Reveal delay={0.1}>
            <div className="relative rounded-2xl border border-border bg-surface p-6 sm:p-8">
              <AnimatePresence mode="wait">
                {done ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="flex min-h-[380px] flex-col items-center justify-center text-center"
                  >
                    <svg viewBox="0 0 52 52" className="h-20 w-20">
                      <motion.circle
                        cx="26"
                        cy="26"
                        r="23"
                        fill="none"
                        stroke="var(--primary)"
                        strokeWidth="2"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                      <motion.path
                        d="M15 27l8 8 15-16"
                        fill="none"
                        stroke="var(--primary)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.4, delay: 0.45, ease: "easeOut" }}
                      />
                    </svg>
                    <h3 className="mt-6 font-display text-2xl font-bold tracking-tight">
                      Got it. Thank you.
                    </h3>
                    <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                      Your idea landed in my inbox of things to build. If it
                      makes the roadmap, you'll see it appear above.
                    </p>
                    <button
                      type="button"
                      onClick={() => setDone(false)}
                      className="label-mono mt-7 rounded-full border border-border px-5 py-2.5 transition-colors hover:border-primary hover:text-primary"
                    >
                      Send another
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={onSubmit}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-5"
                  >
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="name" className="label-mono mb-2 block">
                          Name (optional)
                        </label>
                        <input id="name" name="name" className={fieldClass} placeholder="Who's asking?" />
                      </div>
                      <div>
                        <label htmlFor="email" className="label-mono mb-2 block">
                          Email (optional)
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          className={fieldClass}
                          placeholder="Only if you want a reply"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="label-mono mb-2 block">What kind of thing?</span>
                      <div className="flex flex-wrap gap-2">
                        {TYPES.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setType(t)}
                            aria-pressed={type === t}
                            className={`rounded-full border px-4 py-2 text-sm transition-all duration-200 ${
                              type === t
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="details" className="label-mono mb-2 block">
                        The idea
                      </label>
                      <textarea
                        id="details"
                        name="details"
                        required
                        rows={5}
                        maxLength={4000}
                        className={`${fieldClass} resize-none`}
                        placeholder="What should exist that doesn't yet?"
                      />
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <button
                      type="submit"
                      disabled={sending}
                      className="group inline-flex items-center gap-3 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-16px_var(--primary)] disabled:opacity-60"
                    >
                      {sending ? "Sending…" : "Send suggestion"}
                      <span className="transition-transform duration-300 group-hover:translate-x-1">
                        →
                      </span>
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
