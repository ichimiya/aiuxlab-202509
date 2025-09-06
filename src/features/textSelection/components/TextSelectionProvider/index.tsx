"use client";

import React, { useEffect } from "react";
import { useTextSelectionProviderViewModel } from "./useTextSelectionProviderViewModel";

/**
 * TextSelectionProvider
 * - グローバルに選択イベントをハンドリングし、Zustandへ反映
 * - ブラウザのデフォルト選択表示を使用
 */
export function TextSelectionProvider() {
  const { updateSelection, hasSelection } = useTextSelectionProviderViewModel();

  useEffect(() => {
    const onSelectionChange = () => updateSelection();
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      // 型上はオプショナルだが、use-debounceが提供するcancelを呼んで保険
      // @ts-expect-error use-debounceが関数にメソッドを付与するため
      updateSelection.cancel?.();
    };
  }, [updateSelection]);

  return (
    <>
      {/* アクセシビリティ: 選択状態のライブリージョン（簡易） */}
      <div aria-live="polite" className="sr-only">
        {hasSelection ? "テキスト選択中" : ""}
      </div>
    </>
  );
}

export default TextSelectionProvider;
