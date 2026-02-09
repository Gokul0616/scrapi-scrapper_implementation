import React, { useState, useEffect } from 'react';

const LOADING_TEXTS = [
    "Initializing Scrapi Engine...",
    "Connecting to Proxy Network...",
    "Loading Actor Configuration...",
    "Preparing Data Pipelines...",
    "Almost there..."
];

const LoadingScreen: React.FC = () => {
    const [textIndex, setTextIndex] = useState(0);
    const [displayedText, setDisplayedText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const currentText = LOADING_TEXTS[textIndex];
        const typeSpeed = isDeleting ? 30 : 50;
        const pauseTime = 1500;

        const timer = setTimeout(() => {
            if (!isDeleting && displayedText === currentText) {
                // Finished typing, wait before deleting
                setTimeout(() => setIsDeleting(true), pauseTime);
            } else if (isDeleting && displayedText === "") {
                // Finished deleting, move to next text
                setIsDeleting(false);
                setTextIndex((prev) => (prev + 1) % LOADING_TEXTS.length);
            } else {
                // Typing or deleting
                const nextText = isDeleting
                    ? currentText.substring(0, displayedText.length - 1)
                    : currentText.substring(0, displayedText.length + 1);
                setDisplayedText(nextText);
            }
        }, typeSpeed);

        return () => clearTimeout(timer);
    }, [displayedText, isDeleting, textIndex]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-black transition-colors duration-200">
            <div className="relative flex items-center justify-center mb-8">
                {/* Background Track */}
                <div className="w-16 h-16 rounded-full border-[3px] border-gray-100 dark:border-zinc-800"></div>

                {/* Active Spinner */}
                <div className="absolute w-16 h-16 rounded-full border-[3px] border-transparent border-t-[#3083ED] animate-spin"></div>

                {/* Centered Logo */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <img
                        src="/logo.png"
                        alt="Scrapi"
                        className="w-7 h-7 object-contain dark:brightness-0 dark:invert"
                    />
                </div>
            </div>

            {/* Typing Text */}
            <div className="h-6 flex items-center justify-center">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 font-mono">
                    {displayedText}
                    <span className="animate-pulse ml-1">|</span>
                </p>
            </div>
        </div>
    );
};

export default LoadingScreen;
