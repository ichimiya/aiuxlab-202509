import { describe, it, expect } from "vitest";
import { getQueryClient, createQueryClient } from "./serverQueryClient";

describe("serverQueryClient", () => {
  describe("getQueryClient", () => {
    it("QueryClientを作成する", () => {
      const client = getQueryClient();

      // QueryClientのインスタンスが作成されることを確認
      expect(client).toBeDefined();
      expect(client.constructor.name).toBe("QueryClient");
    });

    it("サーバーサイド用の設定が適用される", () => {
      const client = getQueryClient();
      const options = client.getDefaultOptions();

      expect(options.queries?.staleTime).toBe(1000 * 60 * 5); // 5分
      expect(options.queries?.gcTime).toBe(1000 * 60 * 30); // 30分
      expect(options.queries?.retry).toBe(false);
      expect(options.queries?.refetchOnWindowFocus).toBe(false);
      expect(options.queries?.refetchOnMount).toBe(false);
      expect(options.queries?.refetchOnReconnect).toBe(false);
      expect(options.mutations?.retry).toBe(false);
    });
  });

  describe("createQueryClient", () => {
    it("新しいQueryClientインスタンスを毎回作成する", () => {
      const client1 = createQueryClient();
      const client2 = createQueryClient();

      // 異なるインスタンスが返されることを確認
      expect(client1).not.toBe(client2);
    });

    it("サーバーサイド用の設定が適用される", () => {
      const client = createQueryClient();
      const options = client.getDefaultOptions();

      expect(options.queries?.staleTime).toBe(1000 * 60 * 5);
      expect(options.queries?.gcTime).toBe(1000 * 60 * 30);
      expect(options.queries?.retry).toBe(false);
      expect(options.queries?.refetchOnWindowFocus).toBe(false);
      expect(options.queries?.refetchOnMount).toBe(false);
      expect(options.queries?.refetchOnReconnect).toBe(false);
      expect(options.mutations?.retry).toBe(false);
    });
  });
});
