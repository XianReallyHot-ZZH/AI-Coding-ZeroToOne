import { useState } from 'react';
import { useSlides } from './hooks/useSlides';
import InputPanel from './components/InputPanel';
import PreviewPanel from './components/PreviewPanel';
import Carousel from './components/Carousel';

function App() {
  const {
    slides, isLoading, isGenerating, progress, error,
    styleDescription, resolution, styleImageUrl,
    setStyleDescription, setResolution,
    splitContent, generateAll, regenerateSlide,
    updateSlide, uploadStyle, clearError,
  } = useSlides();

  const [showCarousel, setShowCarousel] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-red-700">{error}</span>
          <button
            onClick={clearError}
            className="text-red-500 hover:text-red-700 text-sm"
          >
            关闭
          </button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="w-96 flex-shrink-0 border-r border-gray-200 bg-white">
          <InputPanel
            slides={slides}
            isLoading={isLoading}
            isGenerating={isGenerating}
            styleDescription={styleDescription}
            resolution={resolution}
            styleImageUrl={styleImageUrl}
            onSplit={splitContent}
            onGenerate={generateAll}
            onStyleDescriptionChange={setStyleDescription}
            onResolutionChange={setResolution}
            onStyleUpload={uploadStyle}
            onUpdateSlide={updateSlide}
          />
        </div>
        <div className="flex-1 min-w-0">
          <PreviewPanel
            slides={slides}
            isGenerating={isGenerating}
            progress={progress}
            onRegenerate={regenerateSlide}
            onPlay={() => setShowCarousel(true)}
          />
        </div>
      </div>

      {showCarousel && (
        <Carousel
          slides={slides}
          onClose={() => setShowCarousel(false)}
        />
      )}
    </div>
  );
}

export default App;
