import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
    text?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ text = "" }) => {
    return (
        <div className="flex-1 flex items-center justify-center min-h-[100vh]">
            <div className="flex flex-col items-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-500" />

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
