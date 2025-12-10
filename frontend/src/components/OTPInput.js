import React, { useRef, useEffect, useState } from 'react';
import './OTPInput.css';

const OTPInput = ({ length = 6, value, onChange, disabled = false }) => {
  const inputRefs = useRef([]);
  const [isPasting, setIsPasting] = useState(false);
  const [animatingIndices, setAnimatingIndices] = useState(new Set());

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

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

    // Trigger animation for this index
    if (val) {
      setAnimatingIndices(prev => new Set([...prev, index]));
      setTimeout(() => {
        setAnimatingIndices(prev => {
          const newSet = new Set(prev);
          newSet.delete(index);
          return newSet;
        });
      }, 150);
    }

    // Auto-focus next input immediately
    if (val && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        // If current box is empty, go to previous box immediately
        inputRefs.current[index - 1]?.focus();
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

    // Smooth character-by-character fill with faster animation
    const newValue = value.split('');
    const animationDelay = 15; // Faster delay - sweet spot between instant and smooth
    
    for (let i = 0; i < pastedData.length; i++) {
      await new Promise(resolve => setTimeout(resolve, animationDelay));
      newValue[i] = pastedData[i];
      onChange(newValue.join('').padEnd(length, ''));
      
      // Add to animating indices
      setAnimatingIndices(prev => new Set([...prev, i]));
      
      // Focus current input for smooth visual feedback
      if (inputRefs.current[i]) {
        inputRefs.current[i].focus();
      }
    }

    // Focus the next empty field or last one
    const nextEmptyIndex = newValue.findIndex(digit => !digit);
    const focusIndex = nextEmptyIndex === -1 ? pastedData.length - 1 : Math.min(nextEmptyIndex, length - 1);
    
    setTimeout(() => {
      inputRefs.current[focusIndex]?.focus();
      setIsPasting(false);
      // Clear all animating indices after animation completes
      setTimeout(() => setAnimatingIndices(new Set()), 200);
    }, 50);
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={`
            otp-input
            w-12 h-12 text-center text-lg font-semibold 
            border-2 rounded-lg
            transition-all duration-150 ease-out
            focus:outline-none
            disabled:bg-gray-100 disabled:cursor-not-allowed
            bg-white
            ${value[index] 
              ? 'border-[#0ea5e9] text-gray-900 filled shadow-[0_0_0_3px_rgba(14,165,233,0.1)]' 
              : 'border-gray-300'
            }
            focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9] focus:ring-opacity-20
            focus:shadow-md
            ${isPasting ? 'pasting' : ''}
            ${animatingIndices.has(index) ? 'filled' : ''}
          `}
        />
      ))}
    </div>
  );
};

export default OTPInput;
