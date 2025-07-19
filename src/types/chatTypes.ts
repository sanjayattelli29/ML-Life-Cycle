export interface Parameters {
  numbers?: number[];
  percentile?: number;
  topN?: number;
  bottomN?: number;
  operator?: '>' | '<' | '>=' | '<=' | '=' | '!=';
  dateRange?: string;
  [key: string]: any; // For any additional parameters
}
