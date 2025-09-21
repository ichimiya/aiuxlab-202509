"use client";

import React, {
  type HTMLAttributes,
  type ReactNode,
  type CSSProperties,
} from "react";
import Image from "next/image";
import { VoiceRecognitionButton } from "../VoiceRecognitionButton";
import { useVoiceRecognitionStore } from "@/shared/stores/voiceRecognitionStore";

const mergeClassNames = (...classes: Array<string | undefined>): string =>
  classes.filter(Boolean).join(" ");

const OUTER_BASE_CLASSES =
  "relative inline-flex w-fit max-w-full max-h-[calc(100vh-40px)] overflow-hidden rounded-[40px] p-5 bg-transparent border border-white/20 backdrop-blur";

const INNER_BASE_CLASSES =
  "relative z-0 flex w-fit max-w-full flex-col items-center justify-center overflow-hidden rounded-[36px] bg-[#121224cc] p-6 space-y-8";

interface AppWindowProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  innerClassName?: string;
}

export function AppWindow({
  children,
  className,
  innerClassName,
  ...rest
}: AppWindowProps) {
  const listeningStatus = useVoiceRecognitionStore(
    (state) => state.listeningStatus,
  );
  const isActive = listeningStatus === "active";
  const isTransitioning =
    listeningStatus === "starting" || listeningStatus === "stopping";

  const logoStyle: CSSProperties = {
    filter: isActive ? "grayscale(0%)" : "grayscale(100%)",
    transition: "filter 0.3s ease",
  };

  return (
    <div {...rest} className={mergeClassNames(OUTER_BASE_CLASSES, className)}>
      <div className={mergeClassNames(INNER_BASE_CLASSES, innerClassName)}>
        <VoiceRecognitionButton
          className="focus:outline-none"
          disabled={isTransitioning}
        >
          <Image
            src="/LogoNova.png"
            alt="NOVA logo"
            width={300}
            height={86}
            priority
            style={logoStyle}
          />
        </VoiceRecognitionButton>
        {children}
      </div>
    </div>
  );
}
