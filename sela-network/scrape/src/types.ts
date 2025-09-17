export interface ScrapingTarget {
  url: string;
  name: string;
  scrapeType: string; // TWITTER_PROFILE, WEBSITE, etc.
  interval?: number; // 스크래핑 간격 (밀리초)
  enabled?: boolean;
}

export interface ScrapingResult {
  target: ScrapingTarget;
  timestamp: Date;
  success: boolean;
  data?: any;
  error?: string;
  responseTime?: number;
}

export interface ScrapingConfig {
  targets: ScrapingTarget[];
  defaultInterval: number;
  maxRetries: number;
  timeout: number;
  apiEndpoint: string;
  bearerToken: string;
}

export interface ApiRequest {
  url: string;
  scrapeType: string;
  timeoutMs?: number;
  principalId?: string;
}

export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}
