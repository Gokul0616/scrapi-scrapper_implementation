import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export const ActorCardSkeleton = () => {
  const { theme } = useTheme();
  
  return (
    <div
      className={`border rounded-xl p-5 transition-all ${
        theme === 'dark' 
          ? 'bg-card border-border' 
          : 'bg-white border-gray-200'
      }`}
    >
      {/* Icon and Info Skeleton */}
      <div className="flex items-start gap-3 mb-4">
        <div 
          className={`w-10 h-10 rounded flex-shrink-0 border animate-pulse ${
            theme === 'dark' ? 'bg-muted border-border' : 'bg-gray-200 border-gray-300'
          }`}
        />
        <div className="flex-1 min-w-0">
          <div 
            className={`h-4 rounded mb-2 animate-pulse ${
              theme === 'dark' ? 'bg-muted' : 'bg-gray-200'
            }`} 
            style={{ width: '70%' }}
          />
          <div 
            className={`h-3 rounded animate-pulse ${
              theme === 'dark' ? 'bg-muted' : 'bg-gray-200'
            }`} 
            style={{ width: '40%' }}
          />
        </div>
      </div>

      {/* Description Skeleton */}
      <div className="mb-5 space-y-2">
        <div 
          className={`h-3 rounded animate-pulse ${
            theme === 'dark' ? 'bg-muted' : 'bg-gray-200'
          }`} 
        />
        <div 
          className={`h-3 rounded animate-pulse ${
            theme === 'dark' ? 'bg-muted' : 'bg-gray-200'
          }`} 
          style={{ width: '90%' }}
        />
        <div 
          className={`h-3 rounded animate-pulse ${
            theme === 'dark' ? 'bg-muted' : 'bg-gray-200'
          }`} 
          style={{ width: '60%' }}
        />
      </div>

      {/* Stats Skeleton */}
      <div className="flex items-center gap-5">
        <div 
          className={`h-3 rounded animate-pulse ${
            theme === 'dark' ? 'bg-muted' : 'bg-gray-200'
          }`} 
          style={{ width: '50px' }}
        />
        <div 
          className={`h-3 rounded animate-pulse ${
            theme === 'dark' ? 'bg-muted' : 'bg-gray-200'
          }`} 
          style={{ width: '80px' }}
        />
      </div>
    </div>
  );
};

export const SkeletonGrid = ({ count = 6, columns = 3 }) => {
  const gridCols = columns === 3 ? 'grid-cols-3' : 'grid-cols-4';
  
  return (
    <div className={`grid ${gridCols} gap-6`}>
      {Array.from({ length: count }).map((_, idx) => (
        <ActorCardSkeleton key={idx} />
      ))}
    </div>
  );
};

// Small actor card skeleton for recently viewed section
export const RecentActorSkeleton = () => {
  const { theme } = useTheme();
  
  return (
    <div
      className={`border rounded-lg p-3 h-[68px] flex items-start gap-3 ${
        theme === 'dark' 
          ? 'bg-card border-border' 
          : 'bg-white border-gray-200'
      }`}
    >
      <div 
        className={`w-9 h-9 rounded flex-shrink-0 border animate-pulse ${
          theme === 'dark' ? 'bg-muted border-border' : 'bg-gray-200 border-gray-300'
        }`}
      />
      <div className="min-w-0 flex flex-col justify-center h-full flex-1">
        <div 
          className={`h-3 rounded mb-2 animate-pulse ${
            theme === 'dark' ? 'bg-muted' : 'bg-gray-200'
          }`} 
          style={{ width: '75%' }}
        />
        <div 
          className={`h-2.5 rounded animate-pulse ${
            theme === 'dark' ? 'bg-muted' : 'bg-gray-200'
          }`} 
          style={{ width: '55%' }}
        />
      </div>
    </div>
  );
};

// Suggested actor card skeleton
export const SuggestedActorSkeleton = () => {
  const { theme } = useTheme();
  
  return (
    <div
      className={`border rounded-xl p-5 flex flex-col h-full ${
        theme === 'dark' 
          ? 'bg-card border-border' 
          : 'bg-white border-gray-200'
      }`}
    >
      {/* Icon and Info Skeleton */}
      <div className="flex items-start gap-4 mb-3">
        <div 
          className={`w-[40px] h-[40px] border rounded-lg flex-shrink-0 animate-pulse ${
            theme === 'dark' ? 'bg-muted border-border' : 'bg-gray-200 border-gray-300'
          }`}
        />
        <div className="min-w-0 pt-0.5 flex-1">
          <div 
            className={`h-4 rounded mb-1.5 animate-pulse ${
              theme === 'dark' ? 'bg-muted' : 'bg-gray-200'
            }`} 
            style={{ width: '80%' }}
          />
          <div 
            className={`h-3 rounded animate-pulse ${
              theme === 'dark' ? 'bg-muted' : 'bg-gray-200'
            }`} 
            style={{ width: '50%' }}
          />
        </div>
      </div>

      {/* Description Skeleton */}
      <div className="mb-5 space-y-2">
        <div 
          className={`h-3 rounded animate-pulse ${
            theme === 'dark' ? 'bg-muted' : 'bg-gray-200'
          }`} 
        />
        <div 
          className={`h-3 rounded animate-pulse ${
            theme === 'dark' ? 'bg-muted' : 'bg-gray-200'
          }`} 
          style={{ width: '95%' }}
        />
        <div 
          className={`h-3 rounded animate-pulse ${
            theme === 'dark' ? 'bg-muted' : 'bg-gray-200'
          }`} 
          style={{ width: '70%' }}
        />
      </div>

      {/* Stats Skeleton */}
      <div className="mt-auto pt-4 border-t border-border flex items-center gap-5">
        <div 
          className={`h-3 rounded animate-pulse ${
            theme === 'dark' ? 'bg-muted' : 'bg-gray-200'
          }`} 
          style={{ width: '40px' }}
        />
        <div 
          className={`h-3 rounded animate-pulse ${
            theme === 'dark' ? 'bg-muted' : 'bg-gray-200'
          }`} 
          style={{ width: '60px' }}
        />
      </div>
    </div>
  );
};

// Table row skeleton for runs
export const RunRowSkeleton = () => {
  const { theme } = useTheme();
  
  return (
    <tr className={theme === 'dark' ? 'bg-card' : 'bg-white'}>
      <td className="px-4 py-2">
        <div 
          className={`h-6 rounded animate-pulse ${
            theme === 'dark' ? 'bg-muted' : 'bg-gray-200'
          }`} 
          style={{ width: '70px' }}
        />
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-3">
          <div 
            className={`w-6 h-6 border rounded-[4px] flex-shrink-0 animate-pulse ${
              theme === 'dark' ? 'bg-muted border-border' : 'bg-gray-200 border-gray-300'
            }`}
          />
          <div className="min-w-0 flex-1">
            <div 
              className={`h-3 rounded mb-1.5 animate-pulse ${
                theme === 'dark' ? 'bg-muted' : 'bg-gray-200'
              }`} 
              style={{ width: '60%' }}
            />
            <div 
              className={`h-2.5 rounded animate-pulse ${
                theme === 'dark' ? 'bg-muted' : 'bg-gray-200'
              }`} 
              style={{ width: '40%' }}
            />
          </div>
        </div>
      </td>
      <td className="px-4 py-2">
        <div 
          className={`h-3 rounded animate-pulse ${
            theme === 'dark' ? 'bg-muted' : 'bg-gray-200'
          }`} 
          style={{ width: '30px' }}
        />
      </td>
      <td className="px-4 py-2">
        <div 
          className={`h-3 rounded animate-pulse ${
            theme === 'dark' ? 'bg-muted' : 'bg-gray-200'
          }`} 
          style={{ width: '90px' }}
        />
      </td>
      <td className="px-4 py-2">
        <div 
          className={`h-3 rounded animate-pulse ${
            theme === 'dark' ? 'bg-muted' : 'bg-gray-200'
          }`} 
          style={{ width: '45px' }}
        />
      </td>
    </tr>
  );
};
