import type { SlideItem } from '../types';
import ProgressBar from './ProgressBar';
import SlideCard from './SlideCard';

interface PreviewPanelProps {
  slides: SlideItem[];
  isGenerating: boolean;
  progress: string;
  onRegenerate: (id: number) => void;
  onPlay: () => void;
}

function PreviewPanel({
  slides,
  isGenerating,
  progress,
  onRegenerate,
  onPlay,
}: PreviewPanelProps) {
  const hasImages = slides.some(s => s.image_url);

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">预览</h2>
        {hasImages && (
          <button
            onClick={onPlay}
            className="px-4 py-2 text-sm font-medium bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            全屏播放
          </button>
        )}
      </div>

      {isGenerating && <ProgressBar progress={progress} />}

      {slides.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          拆分内容后，Slide 预览将显示在这里
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {slides.map(slide => (
            <SlideCard
              key={slide.id}
              slide={slide}
              onRegenerate={onRegenerate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default PreviewPanel;
