import { useState, useCallback } from 'react';
import type { SlideItem, SSEProgressEvent } from '../types';
import { api } from '../api/client';

type Resolution = '1024x576' | '1920x1080' | '3840x2160';

interface UseSlidesReturn {
  slides: SlideItem[];
  isLoading: boolean;
  isGenerating: boolean;
  progress: string;
  error: string;
  styleDescription: string;
  resolution: Resolution;
  styleImageUrl: string | null;
  setStyleDescription: (desc: string) => void;
  setResolution: (res: Resolution) => void;
  splitContent: (content: string, slideCount: number) => Promise<void>;
  generateAll: () => void;
  regenerateSlide: (slideId: number) => Promise<void>;
  reorderSlides: (slideIds: number[]) => Promise<void>;
  updateSlide: (slideId: number, updates: Partial<SlideItem>) => void;
  setSlides: React.Dispatch<React.SetStateAction<SlideItem[]>>;
  uploadStyle: (file: File) => Promise<void>;
  clearError: () => void;
}

export function useSlides(): UseSlidesReturn {
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [styleDescription, setStyleDescription] = useState('');
  const [resolution, setResolution] = useState<Resolution>('1920x1080');
  const [styleImageUrl, setStyleImageUrl] = useState<string | null>(null);

  const clearError = useCallback(() => setError(''), []);

  const splitContent = useCallback(async (content: string, slideCount: number) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.splitContent({
        content,
        slide_count: slideCount,
        style_description: styleDescription,
      });
      setSlides(response.slides);
    } catch (err) {
      setError(err instanceof Error ? err.message : '拆分请求失败');
    } finally {
      setIsLoading(false);
    }
  }, [styleDescription]);

  const generateAll = useCallback(() => {
    if (slides.length === 0) return;
    setIsGenerating(true);
    setProgress('');
    setError('');

    setSlides(prev => prev.map(s => ({ ...s, status: 'pending' as const })));

    api.generateSlides(
      { slides, style_description: styleDescription, resolution },
      {
        onProgress: (event: SSEProgressEvent) => {
          setProgress(event.progress);
          setSlides(prev => prev.map(s =>
            s.id === event.slide_id
              ? { ...s, status: event.status, image_url: event.image_url ?? s.image_url }
              : s
          ));
        },
        onComplete: () => {
          setIsGenerating(false);
        },
        onError: (err) => {
          setIsGenerating(false);
          setError(err.message);
        },
      },
    );
  }, [slides, styleDescription, resolution]);

  const regenerateSlide = useCallback(async (slideId: number) => {
    const slide = slides.find(s => s.id === slideId);
    if (!slide) return;

    setSlides(prev => prev.map(s =>
      s.id === slideId ? { ...s, status: 'generating' } : s
    ));

    try {
      const response = await api.regenerateSlide(slideId, {
        slide,
        style_description: styleDescription,
        resolution,
      });
      setSlides(prev => prev.map(s =>
        s.id === slideId ? response.slide : s
      ));
    } catch (err) {
      setSlides(prev => prev.map(s =>
        s.id === slideId ? { ...s, status: 'error' } : s
      ));
      setError(err instanceof Error ? err.message : '重新生成失败');
    }
  }, [slides, styleDescription, resolution]);

  const reorderSlides = useCallback(async (slideIds: number[]) => {
    try {
      const response = await api.reorderSlides({ slide_ids: slideIds });
      setSlides(response.slides);
    } catch (err) {
      setError(err instanceof Error ? err.message : '排序失败');
    }
  }, []);

  const updateSlide = useCallback((slideId: number, updates: Partial<SlideItem>) => {
    setSlides(prev => prev.map(s =>
      s.id === slideId ? { ...s, ...updates } : s
    ));
  }, []);

  const uploadStyle = useCallback(async (file: File) => {
    try {
      const response = await api.uploadStyle(file);
      setStyleImageUrl(response.style_image_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    }
  }, []);

  return {
    slides, isLoading, isGenerating, progress, error,
    styleDescription, resolution, styleImageUrl,
    setStyleDescription, setResolution,
    splitContent, generateAll, regenerateSlide, reorderSlides,
    updateSlide, setSlides, uploadStyle, clearError,
  };
}
