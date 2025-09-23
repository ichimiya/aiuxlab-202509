import React, {
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactElement,
} from "react";

export const GLASS_CARD_BACKGROUND =
  "color-mix(in srgb, var(--background) 20%, transparent)";

const BASE_CLASSNAME =
  "rounded-xl border bg-transparent p-4 transition-colors backdrop-blur-lg";

export function buildGlassBoxClassName(additionalClassName?: string): string {
  return additionalClassName
    ? `${BASE_CLASSNAME} ${additionalClassName}`
    : BASE_CLASSNAME;
}

type GlassBoxOwnProps = {
  className?: string;
  style?: React.CSSProperties;
};

type GlassBoxProps<C extends ElementType> = {
  as?: C;
} & GlassBoxOwnProps &
  Omit<
    ComponentPropsWithoutRef<C>,
    keyof GlassBoxOwnProps | "as" | "className" | "style"
  >;

export function GlassBox<C extends ElementType = "div">({
  as,
  className,
  style,
  ...rest
}: GlassBoxProps<C>): ReactElement | null {
  const Component = (as ?? "div") as C;
  const mergedStyle = {
    backgroundColor: GLASS_CARD_BACKGROUND,
    ...style,
  };

  return React.createElement(Component, {
    ...rest,
    className: buildGlassBoxClassName(className),
    style: mergedStyle,
  });
}
