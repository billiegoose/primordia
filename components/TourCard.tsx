"use client";

import { useContext } from "react";
import { useOnborda } from "onborda";
import type { CardComponentProps } from "onborda";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { TourCallbackContext } from "./ProductTour";

export function TourCard({ step, currentStep, totalSteps, nextStep, prevStep, arrow }: CardComponentProps) {
  const { closeOnborda } = useOnborda();
  const { onComplete, onSkip } = useContext(TourCallbackContext);

  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  function handleNext() {
    if (isLast) {
      onComplete();
      closeOnborda();
    } else {
      nextStep();
    }
  }

  function handleSkip() {
    onSkip(currentStep);
    closeOnborda();
  }

  return (
    <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-72 p-4 font-mono">
      {arrow}

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {step.icon && (
            <span className="text-base shrink-0" aria-hidden="true">{step.icon}</span>
          )}
          <h3 className="text-sm font-semibold text-white leading-snug">{step.title}</h3>
        </div>
        <button
          type="button"
          onClick={handleSkip}
          aria-label="Skip tour"
          className="shrink-0 text-gray-500 hover:text-gray-300 transition-colors mt-0.5"
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>

      {/* Content */}
      <div className="text-xs text-gray-400 leading-relaxed mb-4">
        {step.content}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-600 tabular-nums">
          {currentStep + 1} / {totalSteps}
        </span>
        <div className="flex items-center gap-1.5">
          {!isFirst && (
            <button
              type="button"
              onClick={prevStep}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-500 rounded-lg transition-colors"
            >
              <ChevronLeft size={12} strokeWidth={2} />
              Back
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            {isLast ? (
              <>
                Done
                <Check size={12} strokeWidth={2.5} />
              </>
            ) : (
              <>
                Next
                <ChevronRight size={12} strokeWidth={2} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
