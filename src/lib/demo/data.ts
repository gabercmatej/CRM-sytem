import type { ActivityType, DealStage } from "@/lib/database.types";

/**
 * The hosted public demo signs in with this account. The app auto-restores its
 * workspace to this dataset whenever it's found empty (see `ensureDemoSeeded`),
 * so a visitor can never leave the shared demo blank for the next one.
 */
export const DEMO_EMAIL = "demo@democrm.app";

export type DemoCompany = {
  name: string;
  domain: string;
  industry: string;
  size: string;
  country: string;
  stage: DealStage;
  createdDaysAgo: number;
  contacts: { name: string; title: string; email: string }[];
  deals: {
    title: string;
    stage: DealStage;
    value: number;
    createdDaysAgo: number;
    closedDaysAgo?: number;
  }[];
  activities: {
    type: ActivityType;
    subject: string;
    body?: string;
    daysAgo: number;
    dueInDays?: number;
  }[];
};

export type DemoLead = {
  name: string;
  domain: string;
  industry: string;
  country: string;
  size: string;
  description: string;
  fit_reason: string;
  search_query: string;
};

// A single contact + deal + note keeps the "filler" companies light while still
// giving every pipeline stage 2–3 populated cards with real values.
const filler = (
  name: string,
  domain: string,
  industry: string,
  country: string,
  size: string,
  stage: DealStage,
  dealStage: DealStage,
  value: number,
  contact: string,
  createdDaysAgo: number
): DemoCompany => {
  const [cn, ct] = contact.split(" — ");
  return {
    name,
    domain,
    industry,
    size,
    country,
    stage,
    createdDaysAgo,
    contacts: [
      { name: cn, title: ct, email: `${cn.split(" ")[0].toLowerCase()}@${domain}` },
    ],
    deals: [
      {
        title: `${industry} automation`,
        stage: dealStage,
        value,
        createdDaysAgo,
        closedDaysAgo: Math.max(1, createdDaysAgo - 10),
      },
    ],
    activities: [
      { type: "note", subject: `Added ${name} to pipeline`, daysAgo: createdDaysAgo },
    ],
  };
};

export const DEMO_COMPANIES: DemoCompany[] = [
  // New
  filler("Meridian Retail Group", "meridianretail.example", "Retail", "Slovenia", "200-1000", "new", "new", 8000, "Nina Kos — Ops Director", 34),
  filler("Solvent Energy Systems", "solvent.example", "Renewable energy", "Austria", "50-200", "new", "new", 15000, "Thomas Huber — CEO", 21),
  filler("Pixel & Co Studio", "pixelco.example", "Design agency", "Croatia", "10-50", "new", "new", 5000, "Iva Perić — Partner", 12),
  // Researching
  filler("Adriatic Shipyards d.d.", "adriashipyards.example", "Shipbuilding", "Croatia", "200-1000", "researching", "new", 11000, "Josip Matić — CIO", 40),
  filler("Sonce Farming Coop", "soncecoop.example", "Agriculture", "Slovenia", "50-200", "researching", "new", 7000, "Bojan Rus — Chair", 30),
  // Contacted
  {
    name: "Verde Marketing Studio",
    domain: "verdestudio.example",
    industry: "Marketing agency",
    size: "10-50",
    country: "Slovenia",
    stage: "contacted",
    createdDaysAgo: 25,
    contacts: [{ name: "Maja Novak", title: "Founder", email: "maja@verdestudio.example" }],
    deals: [{ title: "Content ops automation", stage: "new", value: 6500, createdDaysAgo: 10 }],
    activities: [
      { type: "email", subject: "First-touch email sent", daysAgo: 9 },
      { type: "task", subject: "Follow up with Maja", daysAgo: 9, dueInDays: 1 },
    ],
  },
  filler("Balkan Textile Works", "balkantextile.example", "Textiles", "Serbia", "200-1000", "contacted", "new", 6000, "Milica Jovanović — COO", 22),
  filler("Vinar Estate Wines", "vinarestate.example", "Food & beverage", "Slovenia", "10-50", "contacted", "new", 9500, "Tadej Golob — Owner", 17),
  // Discovery (meeting_booked)
  filler("Lumen Health Clinics", "lumenhealth.example", "Healthcare", "Austria", "200-1000", "meeting_booked", "meeting_booked", 19000, "Eva Wagner — CMO", 28),
  filler("GreenGrid Utilities", "greengrid.example", "Utilities", "Slovenia", "200-1000", "meeting_booked", "meeting_booked", 13500, "Rok Zajc — Head of Data", 19),
  // Proposal sent
  {
    name: "Alpine Robotics d.o.o.",
    domain: "alpinerobotics.example",
    industry: "Manufacturing automation",
    size: "50-200",
    country: "Slovenia",
    stage: "proposal_sent",
    createdDaysAgo: 70,
    contacts: [
      { name: "Ana Kovač", title: "CTO", email: "ana@alpinerobotics.example" },
      { name: "Marko Zupan", title: "Head of Production", email: "marko@alpinerobotics.example" },
    ],
    deals: [
      { title: "Vision QA automation", stage: "proposal_sent", value: 28000, createdDaysAgo: 20 },
      { title: "Pilot: invoice processing", stage: "won", value: 12000, createdDaysAgo: 90, closedDaysAgo: 75 },
    ],
    activities: [
      { type: "meeting", subject: "Discovery call with Ana", body: "Walked through QA bottlenecks on line 2.", daysAgo: 25 },
      { type: "email", subject: "Sent proposal — vision QA automation", daysAgo: 18 },
      { type: "task", subject: "Follow up on proposal", daysAgo: 18, dueInDays: 2 },
    ],
  },
  filler("Fenix Security Systems", "fenixsec.example", "Security", "Croatia", "50-200", "proposal_sent", "proposal_sent", 24000, "Ana Babić — CTO", 16),
  // Negotiation
  {
    name: "Nordwind Logistics GmbH",
    domain: "nordwind.example",
    industry: "Logistics",
    size: "200-1000",
    country: "Austria",
    stage: "negotiating",
    createdDaysAgo: 110,
    contacts: [
      { name: "Stefan Berger", title: "Head of Operations", email: "stefan@nordwind.example" },
      { name: "Julia Maier", title: "IT Lead", email: "julia@nordwind.example" },
    ],
    deals: [
      { title: "Dispatch copilot rollout", stage: "negotiating", value: 45000, createdDaysAgo: 30 },
      { title: "Discovery workshop", stage: "won", value: 5000, createdDaysAgo: 108, closedDaysAgo: 100 },
    ],
    activities: [
      { type: "meeting", subject: "Workshop: dispatch process mapping", daysAgo: 35 },
      { type: "email", subject: "Sent pricing tiers", daysAgo: 12 },
      { type: "call", subject: "Negotiation call — pricing tiers", body: "Stefan wants phased rollout across 3 hubs.", daysAgo: 8 },
      { type: "task", subject: "Send revised contract", daysAgo: 5, dueInDays: -1 },
    ],
  },
  filler("Danube Data Centers", "danubedc.example", "Cloud infrastructure", "Austria", "200-1000", "negotiating", "negotiating", 52000, "Felix Bauer — VP Eng", 26),
  // Won
  {
    name: "Baltika Foods d.o.o.",
    domain: "baltikafoods.example",
    industry: "Food & beverage",
    size: "200-1000",
    country: "Slovenia",
    stage: "won",
    createdDaysAgo: 130,
    contacts: [
      { name: "Petra Horvat", title: "COO", email: "petra@baltikafoods.example" },
      { name: "Luka Kranjc", title: "Customer Service Lead", email: "luka@baltikafoods.example" },
    ],
    deals: [
      { title: "Customer-service chatbot", stage: "won", value: 18000, createdDaysAgo: 80, closedDaysAgo: 30 },
      { title: "Phase 2: order tracking bot", stage: "proposal_sent", value: 22000, createdDaysAgo: 10 },
    ],
    activities: [
      { type: "meeting", subject: "Phase 2 scoping workshop", daysAgo: 10 },
      { type: "email", subject: "Sent phase 2 proposal", daysAgo: 7 },
      { type: "note", subject: "Chatbot live — 40% ticket deflection", daysAgo: 25 },
    ],
  },
  filler("Zenith Software House", "zenithsw.example", "Software", "Slovenia", "50-200", "won", "won", 21000, "Luka Mlakar — Founder", 95),
  // Lost
  {
    name: "Adria Marine Charter",
    domain: "adriamarine.example",
    industry: "Travel & leisure",
    size: "10-50",
    country: "Croatia",
    stage: "lost",
    createdDaysAgo: 85,
    contacts: [{ name: "Ivan Barić", title: "Owner", email: "ivan@adriamarine.example" }],
    deals: [{ title: "Booking automation", stage: "lost", value: 9000, createdDaysAgo: 80, closedDaysAgo: 50 }],
    activities: [
      { type: "email", subject: "Intro email — booking automation", daysAgo: 70 },
      { type: "note", subject: "Marked lost — budget frozen until next season", daysAgo: 50 },
    ],
  },
  filler("Coastal Media Group", "coastalmedia.example", "Media", "Croatia", "50-200", "lost", "lost", 7000, "Petar Kovačević — MD", 60),
];

export const DEMO_LEADS: DemoLead[] = [
  {
    name: "Karst Precision Tools",
    domain: "karsttools.example",
    industry: "Industrial tooling",
    country: "Slovenia",
    size: "50-200",
    description: "CNC tooling manufacturer supplying automotive suppliers across the EU.",
    fit_reason: "Quoting is done manually from email threads — a quoting copilot could cut response time from days to hours.",
    search_query: "Demo: manufacturing companies in the Alps-Adriatic region",
  },
  {
    name: "Donau Fresh Logistik",
    domain: "donaufresh.example",
    industry: "Cold-chain logistics",
    country: "Austria",
    size: "200-1000",
    description: "Temperature-controlled distribution for grocery chains in Austria and Hungary.",
    fit_reason: "Dispatchers coordinate by phone and spreadsheets — routing and ETA automation is a natural first project.",
    search_query: "Demo: logistics companies in the Alps-Adriatic region",
  },
];
