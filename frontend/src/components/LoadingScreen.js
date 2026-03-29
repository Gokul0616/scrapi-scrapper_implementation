import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

const LoadingScreen = ({ text = "", className }) => {
    return (
        <div className={cn(
            "flex-1 flex items-center justify-center",
            className
        )}>
            <div className="flex flex-col items-center">
                <div className="animate-in fade-in duration-1000">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 dark:text-blue-400" />
                </div>

                {text && (
                    <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                        {text}
                    </p>
                )}
            </div>
        </div>
    );
};

export default LoadingScreen;
