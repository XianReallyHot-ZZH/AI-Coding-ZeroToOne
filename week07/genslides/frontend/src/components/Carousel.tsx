import { useEffect, useCallback, useState, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import type { SlideItem } from '../types';

interface CarouselProps {
  slides: SlideItem[];
  autoplayInterval?: number;
  onClose: () => void;
}

function Carousel({ slides, autoplayInterval = 5000, onClose }: CarouselProps) {
  const autoplayPlugin = useRef(
    Autoplay({ delay: autoplayInterval, stopOnInteraction: false })
  );
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [autoplayPlugin.current]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const imageSlides = slides.filter(s => s.image_url);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setCurrentIndex(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi]);

  // Fullscreen on mount
  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.requestFullscreen?.().catch(() => {
        // Fullscreen may be blocked by browser policy
      });
    }

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) onClose();
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    };
  }, [onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') emblaApi?.scrollPrev();
    else if (e.key === 'ArrowRight') emblaApi?.scrollNext();
    else if (e.key === 'Escape') onClose();
  }, [emblaApi, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const togglePlay = () => {
    if (isPlaying) {
      autoplayPlugin.current.stop();
    } else {
      autoplayPlugin.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center"
    >
      <div className="w-full h-full" ref={emblaRef}>
        <div className="flex h-full">
          {imageSlides.map(slide => (
            <div
              key={slide.id}
              className="flex-[0_0_100%] min-w-0 flex items-center justify-center"
            >
              <img
                src={slide.image_url!}
                alt={slide.title}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-6 flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="px-3 py-1.5 text-sm bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
        >
          {isPlaying ? '暂停' : '播放'}
        </button>
        <span className="text-white text-sm">
          {currentIndex + 1} / {imageSlides.length}
        </span>
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-sm bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
        >
          退出
        </button>
      </div>
    </div>
  );
}

export default Carousel;
