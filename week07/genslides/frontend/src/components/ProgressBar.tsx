interface ProgressBarProps {
  progress: string;
}

function ProgressBar({ progress }: ProgressBarProps) {
  if (!progress) return null;

  const parts = progress.split('/');
  const current = parseInt(parts[0], 10);
  const total = parseInt(parts[1], 10);
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span>生成进度</span>
        <span>{progress}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
