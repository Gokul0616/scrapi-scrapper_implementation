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
