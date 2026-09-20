export type SignalType =
  | "job_posting"
  | "news"
  | "funding"
  | "leadership_change"
  | "manual";

export interface Signal {
  id: string;
  companyId: string;
  type: SignalType;
  title: string;
  description: string;
  url?: string;
  source: string;
  detectedAt: string;
}

export interface Contact {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  title: string;
  linkedinUrl?: string;
  phone?: string;
  email?: string;
  emailStatus?: "verified" | "guessed" | "unknown";
  emailSource?: "apollo" | "snov" | "demo";
  /** Where the person's name/title itself came from. */
  contactSource?: "apollo" | "website" | "demo";
  apolloPersonId?: string;
  titleMatchScore: number;
  isPrimary: boolean;
}

export type Priority = "high" | "medium" | "low";

/**
 * Manual pipeline stage - the user drives this by hand (on-demand, one
 * click at a time), there is no automatic day-count sequence: see the 20
 * spec answers, #13 ("zależne jest od przycisku, żebym samemu sobie
 * działał") and #16 ("ja samemu to zrobię").
 */
export type Stage =
  | "nowy"
  | "w_kontakcie"
  | "umowiona_rozmowa"
  | "wygrany"
  | "przegrany";

export type Channel = "phone" | "email" | "linkedin";

export interface Company {
  id: string;
  name: string;
  domain: string;
  industry?: string;
  employeeCount?: number;
  city?: string;
  apolloOrgId?: string;
  createdAt: string;
  lastEnrichedAt?: string;
  lastSignalsRefreshAt?: string;
  lastVerifiedAt?: string;
  priority?: Priority;
  priorityReason?: string;
  stage?: Stage;
  nextStepAt?: string;
  nextStepNote?: string;
  /** Optional, manually-entered KRS registry facts (see src/lib/krs.ts). */
  krsNumber?: string;
  krsLegalForm?: string;
  krsRegisteredAt?: string;
  krsLegalFlag?: "w_likwidacji" | "upadlosc";
  krsCheckedAt?: string;
  /** Deep web research dossier (see src/lib/research.ts). */
  webResearch?: string;
  webResearchAt?: string;
}

export interface Recommendation {
  id: string;
  companyId: string;
  contactId?: string;
  signalId?: string;
  channel: Channel;
  angle: string;
  message: string;
  createdAt: string;
  generatedBy: "claude" | "template";
}

export interface IcpProfile {
  companyName: string;
  productDescription: string;
  valueProps: string[];
  targetTitles: string[];
  targetIndustries: string[];
  /** Optional size/location filters - all ranges are inclusive, unset = no limit. */
  minEmployees?: number;
  maxEmployees?: number;
  cities: string[];
}

export interface Db {
  icp: IcpProfile;
  companies: Company[];
  contacts: Contact[];
  signals: Signal[];
  recommendations: Recommendation[];
}
