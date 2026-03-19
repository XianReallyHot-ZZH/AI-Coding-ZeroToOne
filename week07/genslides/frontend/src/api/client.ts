import type {
  SplitRequest,
  SplitResponse,
  GenerateRequest,
  RegenerateRequest,
  RegenerateResponse,
  ReorderRequest,
  SlideItem,
  StyleUploadResponse,
  SSEProgressEvent,
  SSECompleteEvent,
} from '../types';

const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || 'Request failed');
  }
  return res.json();
}

interface SSECallbacks {
  onProgress: (event: SSEProgressEvent) => void;
  onComplete: (event: SSECompleteEvent) => void;
  onError?: (error: Error) => void;
}

export const api = {
  splitContent: (data: SplitRequest) =>
    request<SplitResponse>('/slides/split', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  generateSlides: async (data: GenerateRequest, callbacks: SSECallbacks) => {
    try {
      const res = await fetch(`${BASE_URL}/slides/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(error.detail || 'Generate request failed');
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('event: ')) {
            currentEvent = trimmed.slice(7);
          } else if (trimmed.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              if (currentEvent === 'complete') {
                callbacks.onComplete(parsed as SSECompleteEvent);
              } else {
                callbacks.onProgress(parsed as SSEProgressEvent);
              }
            } catch {
              console.warn('SSE parse error:', trimmed);
            }
            currentEvent = '';
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const remaining = buffer.trim();
        if (remaining.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(remaining.slice(6));
            if (currentEvent === 'complete') {
              callbacks.onComplete(parsed as SSECompleteEvent);
            } else {
              callbacks.onProgress(parsed as SSEProgressEvent);
            }
          } catch {
            console.warn('SSE parse error (final):', remaining);
          }
        }
      }
    } catch (err) {
      callbacks.onError?.(err instanceof Error ? err : new Error('SSE stream failed'));
    }
  },

  regenerateSlide: (slideId: number, data: RegenerateRequest) =>
    request<RegenerateResponse>(`/slides/${slideId}/regenerate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getSlides: () => request<{ slides: SlideItem[] }>('/slides'),

  reorderSlides: (data: ReorderRequest) =>
    request<{ slides: SlideItem[] }>('/slides/reorder', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  uploadStyle: async (file: File): Promise<StyleUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/style/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail || 'Upload failed');
    }
    return res.json();
  },
};
