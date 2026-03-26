import React, { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface Props {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
}

const AppLayout: React.FC<Props> = ({ children, title, actions }) => (
  <div className="flex min-h-screen bg-gray-50">
    <Sidebar />
    <main className="flex-1 ml-64">
      <header className="bg-white border-b border-gray-200 px-8 py-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      </header>
      <div className="p-8">{children}</div>
    </main>
  </div>
);

export default AppLayout;
