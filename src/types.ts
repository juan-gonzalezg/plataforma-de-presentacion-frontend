export type RobotMood = 
  | 'idle_atento' 
  | 'empujar_pantalla' 
  | 'apuntar_puntero' 
  | 'buscar_antena' 
  | 'sin_senal' 
  | 'celebrar';

export type AppView = 'home' | 'presentation' | 'notebooklm';

export type ContrastMode = 'cinema-dark' | 'projector-high-contrast' | 'clean-light';

export type FontSizeSetting = 'normal' | 'large' | 'xlarge';

export interface Slide {
  id: string;
  number: number;
  title: string;
  headline: string;
  tag: string;
  bullet_points: string[];
  code_snippet?: string;
  highlight_block_ref?: string;
  speaker_notes?: string;
}

export interface TopicMetadata {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  slides_count: number;
  estimated_minutes: number;
  icon: string;
  tags: string[];
  summary: string;
}

export interface TopicDetail extends TopicMetadata {
  slides: Slide[];
  notes_markdown?: string;
}

export interface HighlightBbox {
  x0: number;
  top: number;
  x1: number;
  bottom: number;
}

export interface WebResult {
  id: string;
  title: string;
  url: string;
  snippet?: string;
  provider?: string;
}

export interface QueryResponse {
  source: 'local' | 'web' | 'timeout';
  target_block_id?: string;
  block_title?: string;
  answer_summary: string;
  excerpt?: string;
  pagina?: number;
  bbox?: HighlightBbox;
  external_url?: string;
  web_results?: WebResult[];
  provider?: string;
  confidence: number;
  query: string;
  latency_ms: number;
  timestamp: string;
  error?: boolean;
}

export interface StickyNote {
  id: string;
  query: string;
  answer: string;
  source: 'local' | 'web' | 'timeout';
  external_url?: string;
  web_results?: WebResult[];
  provider?: string;
  target_block_id?: string;
  block_title?: string;
  timestamp: string;
}

export interface ChatSource {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  pagina?: number;
  bbox?: HighlightBbox;
  score?: number;
  cited?: boolean;
  source?: 'local' | 'web';
  url?: string;
  provider?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  source?: 'local' | 'web' | 'timeout';
  target_block_id?: string;
  pagina?: number;
  bbox?: HighlightBbox;
  external_url?: string;
  confidence?: number;
  timestamp: string;
  sources?: ChatSource[];
  citations?: string[];
  webResults?: WebResult[];
  mode?: 'llm' | 'extractive';
  isStreaming?: boolean;
  notice?: string;
  error?: boolean;
}

export interface LlmStatus {
  configured: boolean;
  provider?: string;
  model: string;
  mode: 'llm' | 'extractive';
}

export interface DownloadResponse {
  topic_id: string;
  file_type: string;
  file_name: string;
  file_path: string;
  download_url: string;
  expires_in?: number;
  timestamp: string;
}

