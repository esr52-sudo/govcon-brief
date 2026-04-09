export type StoryCategory =
  | "AWARD"
  | "SOLICITATION"
  | "RECOMPETE"
  | "BUDGET"
  | "REGULATORY"
  | "MARKET";

export interface Story {
  id: string;
  headline: string;
  source: string;
  sourceUrl: string;
  sourceName: string;
  summary: string;
  significance: 1 | 2 | 3 | 4 | 5;
  analysis: string;
  connections: string[];
  category: StoryCategory;
}

export interface Award {
  agency: string;
  awardee: string;
  value: number;
  vehicle: string;
  sourceUrl: string;
}

export interface Opportunity {
  agency: string;
  title: string;
  naicsCode: string;
  responseDate: string;
  setAside: string;
  sourceUrl: string;
}

export interface Recompete {
  agency: string;
  incumbent: string;
  estimatedValue: number;
  expirationDate: string;
  sourceUrl: string;
}

export interface DailyBrief {
  date: string;
  generatedAt: string;
  bluf: string;
  stories: Story[];
  awards: Award[];
  opportunities: Opportunity[];
  recompetes: Recompete[];
  budgetSignals: string;
  trends: string;
  topStoryIds: string[];
}

export interface SourceData {
  sam: unknown[];
  usaspending: unknown[];
  fpds: unknown[];
  agencies: unknown[];
  congress: unknown[];
  federalRegister: unknown[];
  news: unknown[];
  history: DailyBrief[];
}
