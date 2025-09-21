"use client";

import React, { type ButtonHTMLAttributes, type ReactNode } from "react";
import { useVoiceRecognitionButtonViewModel } from "./useVoiceRecognitionButtonViewModel";

type Props = {
  children?: ReactNode;
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick" | "children" | "disabled"
> & {
    disabled?: boolean;
    className?: string;
  };

export function VoiceRecognitionButton({
  className,
  disabled,
  children,
  type = "button",
  ...rest
}: Props) {
  const viewModel = useVoiceRecognitionButtonViewModel();

  const isDisabled = disabled ?? viewModel.buttonState.isDisabled;

  return (
    <button
      type={type}
      onClick={viewModel.handleToggleListening}
      disabled={isDisabled}
      className={className}
      {...rest}
    >
      {children ?? <>{viewModel.buttonState.text}</>}
    </button>
  );
}
