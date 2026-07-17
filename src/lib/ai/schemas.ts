import { z } from "zod";

export const ResearchReportSchema = z.object({
  industry: z.string().describe("The company's primary industry"),
  summary: z
    .string()
    .describe("3-5 sentence overview of what the company does and for whom"),
  estimated_size: z
    .string()
    .describe("Estimated employee count or size bracket, with reasoning if uncertain"),
  pain_points: z
    .array(z.string())
    .describe("Concrete operational pain points this company likely has"),
  automation_opportunities: z
    .array(z.string())
    .describe("Specific AI/automation projects that would help them"),
  suggested_services: z
    .array(z.string())
    .describe("Services an AI-automation agency could pitch to them"),
  icebreakers: z
    .array(z.string())
    .describe("Personalized conversation openers referencing real facts found"),
  recent_news: z
    .array(z.string())
    .describe("Recent news, launches or changes, each with an approximate date"),
  tech_stack: z
    .array(z.string())
    .describe("Technologies, platforms or tools the company appears to use"),
  recommended_outreach_angle: z
    .string()
    .describe("The single strongest angle for a first outreach message"),
});

export type ResearchReportOutput = z.infer<typeof ResearchReportSchema>;

export const LeadSchema = z.object({
  name: z.string().describe("The company's legal or common trading name"),
  domain: z
    .string()
    .nullable()
    .describe("Primary website domain without protocol, e.g. acme.com; null if unknown"),
  industry: z.string().nullable().describe("Primary industry"),
  country: z.string().nullable().describe("Headquarters country"),
  size: z.string().nullable().describe("Employee count or size bracket if known"),
  description: z
    .string()
    .describe("1-2 sentences on what the company does, based on verified facts"),
  fit_reason: z
    .string()
    .describe("Why this company matches the search criteria and would benefit from AI automation"),
  source_url: z
    .string()
    .nullable()
    .describe("URL of the page that verified this company exists"),
});

export const LeadListSchema = z.object({
  leads: z
    .array(LeadSchema)
    .describe("Real, verified companies matching the search criteria"),
});

export type LeadOutput = z.infer<typeof LeadSchema>;

export const EmailDraftSchema = z.object({
  subject: z.string().describe("Email subject line, short and specific"),
  body: z
    .string()
    .describe("Full email body, plain text, ready to copy into Gmail"),
});

export type EmailDraftOutput = z.infer<typeof EmailDraftSchema>;
