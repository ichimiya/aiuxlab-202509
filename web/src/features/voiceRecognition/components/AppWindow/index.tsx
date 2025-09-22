"use client";

import React, {
  type HTMLAttributes,
  type ReactNode,
  type CSSProperties,
  useMemo,
} from "react";
import Image from "next/image";
import { VoiceRecognitionButton } from "../VoiceRecognitionButton";
import { useVoiceRecognitionStore } from "@/shared/stores/voiceRecognitionStore";
import { useAppWindowLayoutStore } from "@/features/voiceRecognition/stores/appWindowLayoutStore";
import { useAppWindowVisibility } from "./useAppWindowVisibility";

const mergeClassNames = (...classes: Array<string | undefined>): string =>
  classes.filter(Boolean).join(" ");

const OUTER_BASE_CLASSES =
  "relative inline-flex w-fit max-w-full max-h-[calc(100vh-40px)] rounded-[40px] p-5 bg-transparent border border-white/20 backdrop-blur";

const INNER_BASE_CLASSES =
  "relative z-0 grid w-full h-full max-w-full grid-rows-[auto_1fr] justify-items-center gap-5 rounded-[36px] bg-[#121224cc] p-5";

const HEADER_CLASSES = "flex w-full max-w-full justify-center";

const MAIN_CLASSES =
  "flex w-full h-full max-w-full flex-col items-center justify-start";

interface AppWindowProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  innerClassName?: string;
}

export function AppWindow({
  children,
  className,
  innerClassName,
  style,
  ...rest
}: AppWindowProps) {
  const listeningStatus = useVoiceRecognitionStore(
    (state) => state.listeningStatus,
  );
  const dimensions = useAppWindowLayoutStore((state) => state.dimensions);
  const isTransitioning = useAppWindowLayoutStore(
    (state) => state.isTransitioning,
  );
  const isActive = listeningStatus === "active";
  const { isHidden } = useAppWindowVisibility();

  const logoStyle: CSSProperties = {
    filter: isActive ? "grayscale(0%)" : "grayscale(100%)",
    transition: "filter 0.3s ease",
  };

  const transitionStyle: CSSProperties = useMemo(
    () => ({
      transition: "width 1s ease, height 1s ease",
      boxSizing: "border-box",
      ...dimensions,
    }),
    [dimensions],
  );

  return (
    <div
      {...rest}
      className={mergeClassNames(OUTER_BASE_CLASSES, className)}
      style={{ ...transitionStyle, ...style }}
    >
      <div className={mergeClassNames(INNER_BASE_CLASSES, innerClassName)}>
        <header className={HEADER_CLASSES}>
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
        </header>
        <main
          className={mergeClassNames(
            MAIN_CLASSES,
            "transition-opacity duration-500",
            isHidden ? "opacity-0" : "opacity-100",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
