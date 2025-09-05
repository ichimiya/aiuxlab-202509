import { useState } from 'react';
import { useResearchStore } from '@/shared/stores/research-store';
import { useGetResearchHistory, useCreateResearch } from '@/shared/api/generated';

export function ResearchInterface() {
  const [query, setQuery] = useState('');
  const { selectedText, voiceCommand, isListening } = useResearchStore();
  
  // API hooks testing
  const { data: researchHistory, isLoading, error } = useGetResearchHistory();
  const createResearchMutation = useCreateResearch();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="space-y-6">
        {/* Main Search */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-center">AI Research POC</h1>
          <p className="text-center text-gray-600 dark:text-gray-400">
            テキスト選択 + 音声コマンドによる直感的なリサーチ体験
          </p>
        </div>

        {/* Query Input */}
        <div className="space-y-2">
          <label htmlFor="query" className="block text-sm font-medium">
            リサーチクエリ
          </label>
          <input
            id="query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="何を調べたいですか？"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600"
          />
        </div>

        {/* Selected Text Display */}
        {selectedText && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="text-sm font-medium mb-2">選択されたテキスト:</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">{selectedText}</p>
          </div>
        )}

        {/* Voice Command Display */}
        {voiceCommand && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="text-sm font-medium mb-2">音声コマンド:</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">{voiceCommand}</p>
          </div>
        )}

        {/* Voice Recognition Status */}
        {isListening && (
          <div className="flex items-center justify-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">音声認識中...</span>
            </div>
          </div>
        )}

        {/* API Test Status */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">API生成テスト状況:</h3>
          {isLoading && <p className="text-sm text-yellow-600">データ読み込み中...</p>}
          {error && <p className="text-sm text-red-600">エラー: API接続に失敗 (期待される動作)</p>}
          {researchHistory && <p className="text-sm text-green-600">データ取得成功: {researchHistory.length}件</p>}
          <p className="text-sm text-gray-500">
            ✅ TypeScript型定義生成完了<br/>
            ✅ React Queryフック生成完了<br/>
            ✅ Axios interceptor統合完了
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 justify-center">
          <button
            type="button"
            onClick={() => {
              createResearchMutation.mutate({ query, selectedText, voiceCommand });
            }}
            disabled={!query || createResearchMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {createResearchMutation.isPending ? 'リサーチ中...' : 'リサーチ開始'}
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            音声認識開始
          </button>
        </div>
      </div>
    </div>
  );
}