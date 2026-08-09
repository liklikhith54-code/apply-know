export interface LogItem {
  stage: string;
  detail: string;
  timestamp: number;
}

export interface RetrievedDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  similarity_score: number;
}

export interface QueryResponse {
  success: boolean;
  query?: string;
  answer?: string;
  citations?: string[];
  retrieved_documents?: RetrievedDocument[];
  logs: LogItem[];
  elapsed_ms: number;
  message?: string;
}

export interface Scenario {
  id: string;
  title: string;
  category: string;
}

export interface DiagnoseResponse {
  success: boolean;
  scenario_id: string;
  title: string;
  error_message: string;
  cause: string;
  remediation: string;
  logs: LogItem[];
}

export interface ProjectDocument {
  name: string;
  size: string;
  chunks: number;
  status: string;
}

export interface SystemMetrics {
  docs_indexed: number;
  total_chunks: number;
  queries_processed: number;
  avg_retrieval_score: number;
  avg_response_time_ms: number;
  tokens_consumed: number;
  success_queries: number;
  failed_queries: number;
}
