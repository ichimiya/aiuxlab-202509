# AWS Transcribe Streaming Integration Guide

このドキュメントは、WebアプリケーションでAWS Transcribe Streaming APIを使用したリアルタイム音声認識の実装方法を説明します。本プロジェクトで実装した音声入力処理システムを他のプロジェクトで参考にするためのガイドです。

## 目次

1. [アーキテクチャ概要](#アーキテクチャ概要)
2. [主要コンポーネント](#主要コンポーネント)
3. [実装詳細](#実装詳細)
4. [セットアップガイド](#セットアップガイド)
5. [使用方法](#使用方法)
6. [設定とカスタマイズ](#設定とカスタマイズ)
7. [トラブルシューティング](#トラブルシューティング)
8. [パフォーマンス最適化](#パフォーマンス最適化)

## アーキテクチャ概要

本システムは以下の3つの主要レイヤーで構成されています：

```
┌─────────────────────────────────────┐
│         UI Components               │
│    (Voice Input Controls)           │
└─────────────────────────────────────┘
                    │
┌─────────────────────────────────────┐
│      Integration Layer              │
│  WebAudioTranscribeConnector        │
│    VoiceAIPipeline                  │
└─────────────────────────────────────┘
                    │
┌─────────────────────────────────────┐
│       Service Layer                 │
│   TranscribeStreamingService        │
│     BedrockRuntimeService           │
└─────────────────────────────────────┘
                    │
┌─────────────────────────────────────┐
│         AWS Services                │
│   Transcribe Streaming API          │
│     Bedrock Runtime API             │
└─────────────────────────────────────┘
```

### データフロー

1. **音声キャプチャ**: WebAudio APIでマイクから音声データを取得
2. **音声処理**: Float32ArrayをPCM16形式に変換
3. **ストリーミング**: AWS Transcribeにリアルタイムで音声データを送信
4. **結果処理**: 音声認識結果を受信・処理
5. **AI連携**: 必要に応じてBedrockでAI応答を生成

## 主要コンポーネント

### 1. TranscribeStreamingService (`aws-transcribe.ts`)

AWS Transcribe Streaming APIのクライアントサービス

**主要機能:**

- リアルタイム音声認識の開始・停止
- 音声データの形式変換（Float32Array → PCM16）
- 接続状態管理
- エラーハンドリング

**主要メソッド:**

```typescript
class TranscribeStreamingService {
  async startTranscription(sampleRate: number): Promise<void>;
  sendAudioData(audioData: Float32Array): void;
  async stopTranscription(): Promise<void>;
  getConnectionStatus(): ConnectionStatus;
  setEventHandlers(handlers: TranscriptionEventHandlers): void;
}
```

### 2. WebAudioTranscribeConnector (`webaudio-transcribe-connector.ts`)

WebAudio APIとTranscribeサービスの連携を行うコネクター

**主要機能:**

- マイクアクセス管理
- AudioContextによる音声処理
- 無音検出とCPU負荷軽減
- 音声統計の計算

**主要メソッド:**

```typescript
class WebAudioTranscribeConnector {
  async startRecording(config: AudioStreamConfig): Promise<void>;
  async stopRecording(): Promise<void>;
  isRecording(): boolean;
  getProcessingStats(): AudioProcessingStats;
}
```

### 3. VoiceAIPipeline (`voice-ai-pipeline.ts`)

音声からAI応答までの完全なパイプライン

**主要機能:**

- Transcribe → Bedrockの連携
- 処理統計の管理
- 履歴管理

## 実装詳細

### 音声データの変換処理

```typescript
// Float32ArrayをPCM16に変換
private convertFloat32ToPCM16(float32Array: Float32Array): Uint8Array {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < float32Array.length; i++) {
    // Float32 (-1.0 to 1.0) を Int16 (-32768 to 32767) に変換
    const sample = Math.max(-1, Math.min(1, float32Array[i]));
    const int16Value = Math.floor(sample * 32767);
    view.setInt16(i * 2, int16Value, true); // little-endian
  }

  return new Uint8Array(buffer);
}
```

### ストリーミング処理

```typescript
// オーディオストリームの生成
private async *createAudioStream(): AsyncGenerator<AudioStream, void, unknown> {
  while (this.connectionStatus === 'connecting' || this.connectionStatus === 'connected') {
    // バッファからデータを取得して蓄積
    while (this.audioBuffer.length > 0 && (!this.accumulatedBuffer || this.accumulatedBuffer.length < this.CHUNK_SIZE)) {
      const chunk = this.audioBuffer.shift();
      if (chunk) {
        // バッファを結合
        if (!this.accumulatedBuffer) {
          this.accumulatedBuffer = chunk;
        } else {
          const newBuffer = new Uint8Array(this.accumulatedBuffer.length + chunk.length);
          newBuffer.set(this.accumulatedBuffer);
          newBuffer.set(chunk, this.accumulatedBuffer.length);
          this.accumulatedBuffer = newBuffer;
        }
      }
    }

    // 十分なデータが蓄積されたら送信
    if (this.accumulatedBuffer && this.accumulatedBuffer.length >= this.CHUNK_SIZE) {
      const toSend = this.accumulatedBuffer.slice(0, this.CHUNK_SIZE);
      this.accumulatedBuffer = this.accumulatedBuffer.length > this.CHUNK_SIZE
        ? this.accumulatedBuffer.slice(this.CHUNK_SIZE)
        : null;

      yield {
        AudioEvent: {
          AudioChunk: toSend,
        },
      };
    }

    // CPU使用率を抑制するための遅延
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
```

### 無音検出とCPU最適化

```typescript
// オーディオ処理での無音検出
this.processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
  const inputBuffer = event.inputBuffer;
  const channelData = inputBuffer.getChannelData(0);

  // 現在のバッファの最大値を計算
  let currentMax = 0;
  for (let i = 0; i < channelData.length; i++) {
    currentMax = Math.max(currentMax, Math.abs(channelData[i]));
  }

  // 無音の場合はスキップ（CPU負荷軽減）
  if (currentMax < 0.001) {
    return;
  }

  // オーディオデータをTranscribeサービスに送信
  this.transcribeService.sendAudioData(channelData);
};
```

## セットアップガイド

### 1. 依存関係のインストール

```bash
npm install @aws-sdk/client-transcribe-streaming @aws-sdk/client-bedrock-runtime
```

### 2. AWS設定

#### 環境変数

```bash
# AWS認証情報
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-northeast-1

# Bedrock用（オプション）
AWS_BEARER_TOKEN_BEDROCK=your_bedrock_token
```

#### AWS設定ファイル (`lib/aws-config.ts`)

```typescript
export interface AWSConfig {
  region: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export function getAWSConfig(): AWSConfig {
  return {
    region: import.meta.env.VITE_AWS_REGION || "ap-northeast-1",
    credentials: {
      accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || "",
      secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || "",
    },
  };
}

export function validateAWSConfig(config: AWSConfig): boolean {
  return !!(
    config.region &&
    config.credentials.accessKeyId &&
    config.credentials.secretAccessKey
  );
}
```

### 3. IAMポリシー設定

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["transcribe:StartStreamTranscription"],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "*"
    }
  ]
}
```

## 使用方法

### 基本的な使用例

```typescript
import { TranscribeStreamingService } from "./services/aws-transcribe";
import { WebAudioTranscribeConnector } from "./services/webaudio-transcribe-connector";

// サービスの初期化
const transcribeService = new TranscribeStreamingService();
const connector = new WebAudioTranscribeConnector(transcribeService);

// イベントハンドラーの設定
transcribeService.setEventHandlers({
  onTranscriptionResult: (text, isFinal) => {
    console.log("認識結果:", text, "最終:", isFinal);
  },
  onError: (error) => {
    console.error("エラー:", error);
  },
});

// 録音開始
const config = {
  sampleRate: 48000,
  bufferSize: 4096,
  channels: 1,
};

try {
  await connector.startRecording(config);
  console.log("録音開始");

  // 録音停止（任意のタイミング）
  setTimeout(async () => {
    await connector.stopRecording();
    console.log("録音停止");
  }, 10000);
} catch (error) {
  console.error("録音エラー:", error);
}
```

### React Componentでの使用例

```typescript
import React, { useState, useRef } from 'react';
import { WebAudioTranscribeConnector } from '../services/webaudio-transcribe-connector';
import { TranscribeStreamingService } from '../services/aws-transcribe';

export const VoiceInput: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const connectorRef = useRef<WebAudioTranscribeConnector | null>(null);

  const initializeServices = () => {
    const transcribeService = new TranscribeStreamingService();
    connectorRef.current = new WebAudioTranscribeConnector(transcribeService);

    transcribeService.setEventHandlers({
      onTranscriptionResult: (text, isFinal) => {
        setTranscript(prev => isFinal ? text : `${prev} ${text}`);
      },
      onError: (error) => {
        console.error('Transcribe error:', error);
        setIsRecording(false);
      }
    });
  };

  const startRecording = async () => {
    if (!connectorRef.current) {
      initializeServices();
    }

    try {
      await connectorRef.current?.startRecording({
        sampleRate: 48000,
        bufferSize: 4096,
        channels: 1
      });
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = async () => {
    try {
      await connectorRef.current?.stopRecording();
      setIsRecording(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  return (
    <div>
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={!connectorRef.current && isRecording}
      >
        {isRecording ? '録音停止' : '録音開始'}
      </button>

      <div>
        <h3>認識結果:</h3>
        <p>{transcript}</p>
      </div>
    </div>
  );
};
```

## 設定とカスタマイズ

### サポートされているサンプリングレート

```typescript
const SUPPORTED_SAMPLE_RATES = [8000, 16000, 24000, 48000];
```

### チャンクサイズの調整

```typescript
private readonly CHUNK_SIZE = 32768; // 32KB chunks for Transcribe
```

### 無音検出の閾値調整

```typescript
// 無音検出の閾値（0.001 = -60dB程度）
if (currentMax < 0.001) {
  return; // 無音としてスキップ
}
```

### 言語設定のカスタマイズ

```typescript
// 現在は日本語固定、他言語に変更する場合
getLanguageCode(): LanguageCode {
  return 'en-US'; // 英語に変更
  // return 'ko-KR'; // 韓国語
  // return 'zh-CN'; // 中国語（簡体字）
}
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. マイクアクセスエラー

```typescript
// エラー: Failed to access microphone: Permission denied
```

**解決方法:**

- ブラウザのマイク権限を確認
- HTTPSでのアクセスを確認（WebAudio APIはHTTPS必須）
- マイクが他のアプリケーションで使用されていないか確認

#### 2. AWS認証エラー

```typescript
// エラー: Invalid AWS configuration
```

**解決方法:**

- 環境変数の設定を確認
- AWS認証情報の形式を確認
- IAMポリシーの権限を確認

#### 3. 音声データが送信されない

```typescript
// ログ: Cannot send audio data: Transcribe not connected
```

**解決方法:**

- Transcribe接続状態を確認
- ネットワーク接続を確認
- サンプリングレートがサポート範囲内か確認

#### 4. 認識結果が返ってこない

**デバッグ方法:**

```typescript
// デバッグログを有効化
console.log("Transcriptイベント受信:", event);
console.log("音声データ送信:", {
  currentLevel: currentMax,
  bufferLength: channelData.length,
});
```

### パフォーマンス問題

#### CPU使用率が高い場合

1. **バッファサイズを増加**

```typescript
const config = {
  bufferSize: 8192, // 4096から8192に増加
  // ...
};
```

2. **無音検出閾値を調整**

```typescript
if (currentMax < 0.01) {
  // より高い閾値に設定
  return;
}
```

3. **処理間隔を調整**

```typescript
await new Promise((resolve) => setTimeout(resolve, 20)); // 10msから20msに増加
```

## パフォーマンス最適化

### 1. メモリ使用量の最適化

```typescript
// バッファのクリーンアップ
async stopTranscription(): Promise<void> {
  this.connectionStatus = 'disconnected';
  this.audioBuffer = []; // バッファをクリア
  this.accumulatedBuffer = null; // 蓄積バッファをクリア
}
```

### 2. ネットワーク最適化

```typescript
// チャンクサイズの最適化（ネットワーク状況に応じて調整）
private readonly CHUNK_SIZE = 16384; // より小さいチャンクでレスポンス向上
// private readonly CHUNK_SIZE = 65536; // より大きいチャンクで効率化
```

### 3. エラー回復の実装

```typescript
// 接続エラー時の自動再接続
private async handleConnectionError(error: Error) {
  console.error('Connection error:', error);

  // 一定時間後に再接続を試行
  setTimeout(async () => {
    if (this.connectionStatus === 'error') {
      try {
        await this.startTranscription(this.lastSampleRate);
        console.log('Reconnection successful');
      } catch (retryError) {
        console.error('Reconnection failed:', retryError);
      }
    }
  }, 5000);
}
```

## まとめ

このガイドでは、AWS Transcribe Streaming APIを使用したリアルタイム音声認識システムの実装方法を説明しました。主なポイント：

1. **モジュラー設計**: 各機能を独立したサービスクラスに分離
2. **エラーハンドリング**: 堅牢なエラー処理とユーザーフレンドリーなメッセージ
3. **パフォーマンス最適化**: 無音検出、バッファリング、CPU負荷軽減
4. **テスト駆動開発**: 各コンポーネントに対する包括的なテストスイート

このアーキテクチャと実装例を参考に、他のプロジェクトでも効率的な音声認識機能を実装できます。

## 関連リソース

- [AWS Transcribe Streaming API Documentation](https://docs.aws.amazon.com/transcribe/latest/dg/streaming.html)
- [Web Audio API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [TypeScript Best Practices](https://typescript-eslint.io/docs/linting/type-linting/)
