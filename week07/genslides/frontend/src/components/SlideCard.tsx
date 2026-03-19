import type { SlideItem } from '../types';

interface SlideCardProps {
  slide: SlideItem;
  onRegenerate: (id: number) => void;
}

function SlideCard({ slide, onRegenerate }: SlideCardProps) {
  const handleRegenerate = () => onRegenerate(slide.id);

  const statusColors: Record<string, string> = {
    pending: 'bg-gray-400',
    generating: 'bg-yellow-400 animate-pulse',
    done: 'bg-green-500',
    error: 'bg-red-500',
  };

  const statusLabels: Record<string, string> = {
    pending: '等待中',
    generating: '生成中',
    done: '已完成',
    error: '失败',
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="aspect-video bg-gray-100 relative">
        {slide.image_url ? (
          <img
            src={slide.image_url}
            alt={slide.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            {slide.status === 'generating' ? (
              <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <span className="text-sm">暂无图片</span>
            )}
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors[slide.status]}`} />
          <h3 className="text-sm font-medium text-gray-800 truncate">{slide.title}</h3>
        </div>
        <p className="text-xs text-gray-500 mb-2">{statusLabels[slide.status]}</p>

        {(slide.status === 'done' || slide.status === 'error') && (
          <button
            onClick={handleRegenerate}
            className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
          >
            {slide.status === 'error' ? '重试' : '重新生成'}
          </button>
        )}
      </div>
    </div>
  );
}

export default SlideCard;