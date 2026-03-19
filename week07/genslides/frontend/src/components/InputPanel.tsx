import { useState, useRef } from 'react';
import type { SlideItem } from '../types';

interface InputPanelProps {
  slides: SlideItem[];
  isLoading: boolean;
  isGenerating: boolean;
  styleDescription: string;
  resolution: '1024x576' | '1920x1080' | '3840x2160';
  styleImageUrl: string | null;
  onSplit: (content: string, slideCount: number) => Promise<void>;
  onGenerate: () => void;
  onStyleDescriptionChange: (desc: string) => void;
  onResolutionChange: (res: '1024x576' | '1920x1080' | '3840x2160') => void;
  onStyleUpload: (file: File) => Promise<void>;
  onUpdateSlide: (id: number, updates: Partial<SlideItem>) => void;
}

function InputPanel({
  slides,
  isLoading,
  isGenerating,
  styleDescription,
  resolution,
  styleImageUrl,
  onSplit,
  onGenerate,
  onStyleDescriptionChange,
  onResolutionChange,
  onStyleUpload,
  onUpdateSlide,
}: InputPanelProps) {
  const [content, setContent] = useState('');
  const [slideCount, setSlideCount] = useState(8);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSplit = () => {
    if (content.trim().length < 10) return;
    onSplit(content, slideCount);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onStyleUpload(file);
  };

  const resolutionOptions = [
    { value: '1024x576' as const, label: '1K' },
    { value: '1920x1080' as const, label: '2K' },
    { value: '3840x2160' as const, label: '4K' },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
      <h2 className="text-lg font-semibold text-gray-800">GenSlides</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          输入内容 / 大纲
        </label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="输入主题或大纲，至少 10 个字符..."
          rows={6}
          className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            页数
          </label>
          <select
            value={slideCount}
            onChange={e => setSlideCount(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {Array.from({ length: 18 }, (_, i) => i + 3).map(n => (
              <option key={n} value={n}>{n} 页</option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            分辨率
          </label>
          <div className="flex gap-1">
            {resolutionOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => onResolutionChange(opt.value)}
                className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                  resolution === opt.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          风格描述
        </label>
        <input
          type="text"
          value={styleDescription}
          onChange={e => onStyleDescriptionChange(e.target.value)}
          placeholder="如：科技感，深色背景，霓虹色调"
          className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          风格参考图片
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            上传图片
          </button>
          {styleImageUrl && (
            <span className="text-xs text-green-600">已上传</span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSplit}
          disabled={isLoading || content.trim().length < 10}
          className="flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-500 text-white hover:bg-blue-600"
        >
          {isLoading ? '拆分中...' : '拆分内容'}
        </button>
        <button
          onClick={onGenerate}
          disabled={isGenerating || slides.length === 0}
          className="flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-green-500 text-white hover:bg-green-600"
        >
          {isGenerating ? '生成中...' : '生成图片'}
        </button>
      </div>

      {slides.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-gray-700">
            Slide 列表 ({slides.length} 页)
          </h3>
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {slides.map(slide => (
              <div
                key={slide.id}
                className="border border-gray-200 rounded-lg p-3 bg-gray-50"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-400 font-mono">
                    #{slide.id}
                  </span>
                  <input
                    type="text"
                    value={slide.title}
                    onChange={e =>
                      onUpdateSlide(slide.id, { title: e.target.value })
                    }
                    className="flex-1 text-sm font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none px-1"
                  />
                </div>
                <ul className="ml-6 text-xs text-gray-600 list-disc">
                  {slide.points.map((point, idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default InputPanel;
