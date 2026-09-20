/**
 * ============================================================
 * EDIT THIS FILE to update site content. Nothing is hardcoded
 * deep inside components — projects, roadmap, and personal
 * copy all live here.
 * ============================================================
 */

export const site = {
  makerName: "Ravana",
  hubName: "Toolshed",
  tagline: "Free software, built in the open.",
  // TODO(you): replace with your real "why I build" note
  aboutNote:
    "I build small, sharp tools for classrooms and desks — the kind of software I wanted and couldn't find. Everything here is free, offline-friendly, and made in my own time. If it saves you an hour, that's the whole point.",
  // TODO(you): replace with your real links
  links: [
    { label: "Email", href: "mailto:you@example.com" },
    { label: "GitHub", href: "https://github.com/your-handle" },
    { label: "X / Twitter", href: "https://x.com/your-handle" },
    { label: "YouTube", href: "https://youtube.com/@your-handle" },
  ],
};

export type Project = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  features: { title: string; detail: string }[];
  downloadUrl: string;
  version: string;
  platform: string;
  fileSize: string;
  screenshot: string;
  status: "released" | "coming-soon";
};

import dtbScreenshot from "@/assets/dtb-screenshot.jpg";

export const projects: Project[] = [
  {
    id: "digital-teaching-board",
    name: "Digital Teaching Board",
    tagline: "A full-screen chalkboard for the modern classroom.",
    description:
      "Write, draw, and annotate anything on screen — built for teachers who want a board that keeps up with the lesson instead of getting in the way.",
    features: [
      { title: "Infinite board", detail: "Pan, zoom and add pages mid-lesson without losing your place." },
      { title: "Pressure-smooth ink", detail: "Pen, highlighter and shapes tuned for mice, touch and stylus alike." },
      { title: "Screen annotation", detail: "Draw straight over slides, PDFs or anything else on screen." },
      { title: "Works offline", detail: "No account, no cloud, no internet required. Installs and runs." },
    ],
    downloadUrl: "https://github.com/rohittrv7/digital-board/releases/download/Digital_Teaching_Board/Digital.Teaching.Board.Setup.1.1.0.exe",
    version: "1.1.0",
    platform: "Windows",
    fileSize: "145 MB",
    screenshot: dtbScreenshot,
    status: "released",
  },
];

export type RoadmapItem = {
  id: string;
  name: string;
  blurb: string;
  /** EDIT: e.g. "Shipped Sep 2026", "Target: Q1 2027", "TBD" */
  target: string;
  status: "released" | "in-progress" | "planned";
};

export const roadmap: RoadmapItem[] = [
  {
    id: "digital-teaching-board",
    name: "Digital Teaching Board",
    blurb: "The full-screen classroom board. Out now for Windows.",
    target: "Released",
    status: "released",
  },
  {
    id: "next-tool",
    name: "Next tool (unannounced)",
    blurb: "In the workshop. Details soon.",
    target: "TARGET DATE — TBD", // EDIT ME
    status: "in-progress",
  },
  {
    id: "later",
    name: "Whatever you suggest",
    blurb: "The suggestion box below genuinely feeds this list.",
    target: "Open",
    status: "planned",
  },
];
