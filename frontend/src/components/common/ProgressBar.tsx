import React from 'react';
import clsx from 'clsx';

interface Props {
  value: number; // 0-100
  showLabel?: boolean;
  size?: 'sm' | 'md';
  color?: 'blue' | 'green' | 'orange' | 'red';
}

const COLOR_MAP = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
};

const ProgressBar: React.FC<Props> = ({ value, showLabel = false, size = 'md', color = 'blue' }) => {
  const pct = Math.min(100, Math.max(0, value));
  const barColor = pct >= 80 ? COLOR_MAP.green : pct >= 50 ? COLOR_MAP.blue : pct >= 25 ? COLOR_MAP.orange : COLOR_MAP.red;

  return (
    <div className="flex items-center gap-2 w-full">
      <div className={clsx('progress-bar flex-1', size === 'sm' && 'h-1.5')}>
        <div
          className={clsx('progress-fill', color !== 'blue' ? COLOR_MAP[color] : barColor, size === 'sm' && 'h-1.5')}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
      )}
    </div>
  );
};

export default ProgressBar;
