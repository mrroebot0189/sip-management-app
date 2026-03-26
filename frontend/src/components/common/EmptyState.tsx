import React, { ReactNode } from 'react';
import { FolderOpen } from 'lucide-react';

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

const EmptyState: React.FC<Props> = ({ title, description, action, icon }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
      {icon || <FolderOpen className="w-8 h-8 text-gray-400" />}
    </div>
    <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
    {description && <p className="text-sm text-gray-500 mb-6 max-w-sm">{description}</p>}
    {action}
  </div>
);

export default EmptyState;
