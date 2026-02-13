import { createContext, useContext, useState, ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
}

interface TabsProps {
  defaultValue: string;
  children: ReactNode;
  className?: string;
}

export function Tabs({ defaultValue, children, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn('w-full', className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-start w-full border-b border-gray-200 dark:border-gray-700',
        className
      )}
      role="tablist"
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsTrigger({ value, children, className }: TabsTriggerProps) {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => setActiveTab(value)}
      className={cn(
        'inline-flex items-center justify-center px-4 py-3 text-sm font-medium transition-colors',
        'border-b-2 -mb-px',
        'focus:outline-none focus:ring-2 focus:ring-shelf-400 focus:ring-offset-2',
        isActive
          ? 'border-shelf-600 text-shelf-600 dark:border-shelf-400 dark:text-shelf-400'
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200',
        className
      )}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const { activeTab } = useTabs();

  if (activeTab !== value) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      className={cn('mt-6 focus:outline-none animate-fadeIn', className)}
    >
      {children}
    </div>
  );
}
