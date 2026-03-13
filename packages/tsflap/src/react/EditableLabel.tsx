import React, { useEffect, useRef, useState } from "react";

import type { IPoint } from "../core/point";
import type { Controller } from "../engine/controller";

interface EditableLabelProps {
  value: string;
  position: IPoint;
  maxLength: number;
  onComplete: (value: string) => boolean;
  onCancel: () => void;
  controller?: Controller;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function EditableLabel({ value, position, maxLength, onComplete, onCancel, controller }: EditableLabelProps) {
  const [inputValue, setInputValue] = useState(value);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const mountedRef = useRef(false);

  useEffect(() => {
    // Delay focus slightly to avoid immediate blur from parent re-renders
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
        mountedRef.current = true;
        // Tell the controller an input is active (prevents node creation on canvas click)
        if (controller) {
          controller.state.editableTextInputField = inputRef.current;
        }
      }
    }, 50);
    return () => {
      if (controller) {
        controller.state.editableTextInputField = null;
      }
      clearTimeout(timer);
    };
  }, [controller]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        onCancel();
        return;
      }
      const success = onComplete(inputValue);
      if (!success) {
        setError(true);
        setTimeout(() => setError(false), 1500);
      }
    }
  };

  const handleBlur = () => {
    // Guard against blur firing before the input is properly mounted
    if (!mountedRef.current) return;
    const success = onComplete(inputValue);
    if (!success) onCancel();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      setInputValue(newValue);
      if (newValue.length === maxLength) {
        const success = onComplete(newValue);
        if (!success) {
          setError(true);
          setTimeout(() => setError(false), 1500);
        }
      }
    }
  };

  return (
    <foreignObject x={position.x - 30} y={position.y - 15} width={60} height={30}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        maxLength={maxLength}
        style={{
          width: "100%",
          height: "100%",
          textAlign: "center",
          border: "none",
          outline: "none",
          backgroundColor: error ? "#ffebee" : "#fff",
          borderRadius: "100%",
          fontSize: "12px",
          fontWeight: "bold",
          padding: "3px",
          color: error ? "#c62828" : "#000",
          caretColor: error ? "#c62828" : "#000",
          boxShadow: "none",
          transition: "all 0.2s",
        }}
      />
    </foreignObject>
  );
}
