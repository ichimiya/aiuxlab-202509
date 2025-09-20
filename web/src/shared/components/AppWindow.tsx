import type { ReactNode } from "react";

interface AppWindowProps {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}

const mergeClassNames = (...classes: Array<string | undefined>): string =>
  classes.filter(Boolean).join(" ");

const OUTER_BASE_CLASSES =
  "relative inline-flex w-fit max-w-full max-h-[calc(100vh-40px)] overflow-hidden rounded-[40px] p-5 bg-transparent border border-white/20 backdrop-blur";

const INNER_BASE_CLASSES =
  "relative z-0 flex w-fit max-w-full flex-col items-center justify-center overflow-hidden rounded-[36px] bg-[#121224cc] p-6";

/**
 * ガラス風のアプリ枠を形成するレイアウトコンポーネント。
 * 内部コンテンツに応じて幅が変化し、背景のWASMエフェクトと重ねて利用する。
 */
export function AppWindow({
  children,
  className,
  innerClassName,
}: AppWindowProps) {
  return (
    <div className={mergeClassNames(OUTER_BASE_CLASSES, className)}>
      <div className={mergeClassNames(INNER_BASE_CLASSES, innerClassName)}>
        {children}
      </div>
    </div>
  );
}
