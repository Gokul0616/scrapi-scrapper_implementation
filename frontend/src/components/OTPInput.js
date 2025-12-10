import React, { useRef, useEffect, useState } from 'react';

const OTPInput = ({ length = 6, value, onChange, disabled = false }) => {
  const inputRefs = useRef([]);
  const [isPasting, setIsPasting] = useState(false);
  const [filledIndices, setFilledIndices] = useState(new Set());

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Track which indices have values for animation
  useEffect(() => {
    const newFilledIndices = new Set();
    for (let i = 0; i < value.length; i++) {
      if (value[i]) {
        newFilledIndices.add(i);
      }
    }
    setFilledIndices(newFilledIndices);
  }, [value]);

  const handleChange = (index, e) => {
    const val = e.target.value;
    
    // Only allow numbers
    if (val && !/^\d+$/.test(val)) {
      return;
    }

    const newValue = value.split('');
    newValue[index] = val.slice(-1); // Only take last character
    const newOTP = newValue.join('');
    
    onChange(newOTP);

    // Auto-focus next input with smooth transition
    if (val && index < length - 1) {
      setTimeout(() => {
        inputRefs.current[index + 1]?.focus();
      }, 50); // Small delay for smooth transition
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        // If current box is empty, go to previous box
        setTimeout(() => {
          inputRefs.current[index - 1]?.focus();
        }, 50);
      }
    }
    // Handle left arrow
    else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Handle right arrow
    else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = async (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim().replace(/\D/g, '').slice(0, length);
    
    if (!pastedData) {
      return;
    }

    setIsPasting(true);

    // Animate character-by-character fill (like Grok)
    const newValue = value.split('');
    
    for (let i = 0; i < pastedData.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 80)); // 80ms delay between each character
      newValue[i] = pastedData[i];
      onChange(newValue.join('').padEnd(length, ''));
      
      // Focus current input for visual feedback
      if (inputRefs.current[i]) {
        inputRefs.current[i].focus();
      }
    }

    // Focus the next empty field or last one
    const nextEmptyIndex = newValue.findIndex(digit => !digit);
    const focusIndex = nextEmptyIndex === -1 ? length - 1 : Math.min(nextEmptyIndex, length - 1);
    
    setTimeout(() => {
      inputRefs.current[focusIndex]?.focus();
      setIsPasting(false);
    }, 100);
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={`
            w-12 h-12 text-center text-lg font-semibold 
            border-2 rounded-md
            transition-all duration-200 ease-in-out
            focus:outline-none
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${value[index] 
              ? 'border-green-500 bg-green-50 text-green-900' 
              : 'border-gray-300 bg-white'
            }
            ${!disabled && 'hover:border-gray-400'}
            focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-opacity-20
            focus:scale-105 focus:shadow-lg
            ${isPasting ? 'animate-pulse' : ''}
            ${filledIndices.has(index) && !isPasting ? 'animate-scale-in' : ''}
          `}
          style={{
            animationDelay: isPasting ? `${index * 80}ms` : '0ms'
          }}
        />
      ))}
      <style jsx>{`
        @keyframes scale-in {
          0% {
            transform: scale(0.95);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.08);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default OTPInput;
