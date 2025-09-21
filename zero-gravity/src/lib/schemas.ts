export type GrowthItem = {
  industry_id: string;
  years: number[];
  prediction: number[];
  lower: number[];
  upper: number[];
  modelWeights: Record<string, number>;
};

export type GrowthResponse = { items: GrowthItem[] };

export type JobsItem = {
  industry_id: string;
  year: number;
  employment_direct: number;
  employment_indirect: number;
  employment_induced: number;
  employment_total: number;
};

export type JobsGeo = { state: string; industry_id: string; year: number; employment_total: number };
export type JobsResponse = { items: JobsItem[]; geo: JobsGeo[] };

export type SentimentItem = { industry_id: string; period: string; sentiment: number };
export type SentimentCorrelations = Record<string, { current: number; bestLag: number; corrAtBestLag: number }>;
export type SentimentResponse = { items: SentimentItem[]; correlations: SentimentCorrelations };


