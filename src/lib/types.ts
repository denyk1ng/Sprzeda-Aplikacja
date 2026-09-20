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

export interface Company {
  id: string;
  name: string;
  domain: string;
  industry?: string;
  employeeCount?: number;
  apolloOrgId?: string;
  createdAt: string;
  lastEnrichedAt?: string;
  lastSignalsRefreshAt?: string;
  lastVerifiedAt?: string;
  priority?: Priority;
  priorityReason?: string;
  /** Optional, manually-entered KRS registry facts (see src/lib/krs.ts). */
  krsNumber?: string;
  krsLegalForm?: string;
  krsRegisteredAt?: string;
  krsLegalFlag?: "w_likwidacji" | "upadlosc";
  krsCheckedAt?: string;
}

export interface Recommendation {
  id: string;
  companyId: string;
  contactId?: string;
  signalId?: string;
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
}

export interface Db {
  icp: IcpProfile;
  companies: Company[];
  contacts: Contact[];
  signals: Signal[];
  recommendations: Recommendation[];
}
