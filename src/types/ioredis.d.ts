declare module "ioredis" {
  export interface RedisOptions {
    maxRetriesPerRequest?: number;
  }

  export default class Redis {
    constructor(connectionString?: string, options?: RedisOptions);
    get(key: string): Promise<string | null>;
    set(
      key: string,
      value: string,
      mode?: "EX",
      ttlSeconds?: number,
    ): Promise<unknown>;
    disconnect(): void;
  }
}
