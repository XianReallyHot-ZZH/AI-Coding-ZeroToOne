export interface SlideItem {
  id: number;
  title: string;
  points: string[];
  prompt_hint: string;
  image_url: string | null;
  status: 'pending' | 'generating' | 'done' | 'error';
}

export interface SplitRequest {
  content: string;
  slide_count: number;
  style_description: string;
}

export interface SplitResponse {
  slides: SlideItem[];
}

export interface GenerateRequest {
  slides: SlideItem[];
  style_description: string;
  resolution: '1024x576' | '1920x1080' | '3840x2160';
}

export interface RegenerateRequest {
  slide: SlideItem;
  style_description: string;
  resolution: '1024x576' | '1920x1080' | '3840x2160';
}

export interface RegenerateResponse {
  slide: SlideItem;
}

export interface ReorderRequest {
  slide_ids: number[];
}

export interface StyleUploadResponse {
  style_image_url: string;
  original_size: number;
  compressed_size: number;
}

export interface SSEProgressEvent {
  slide_id: number;
  status: 'generating' | 'done' | 'error';
  image_url?: string;
  error?: string;
  progress: string;
}

export interface SSECompleteEvent {
  total: number;
  success: number;
  failed: number;
}
