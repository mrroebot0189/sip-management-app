import React from 'react';
import clsx from 'clsx';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingSpinner: React.FC<Props> = ({ size = 'md', className }) => {
  const sizeClass = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size];
  return (
    <div className={clsx('flex items-center justify-center', className)}>
      <div className={clsx('animate-spin rounded-full border-2 border-gray-200 border-t-blue-600', sizeClass)} />
    </div>
  );
};

export default LoadingSpinner;
