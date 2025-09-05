import { defineConfig } from "orval";

export default defineConfig({
  api: {
    input: "./src/shared/api/schemas/openapi.yaml",
    output: {
      target: "./src/shared/api/generated/api.ts",
      client: "react-query",
      mode: "single",
      schemas: "./src/shared/api/generated/models",
      mock: false,
      clean: true,
      override: {
        query: {
          useQuery: true,
          useMutation: true,
        },
        mutator: {
          path: "./src/shared/api/mutator.ts",
          name: "customInstance",
        },
      },
    },
    hooks: {
      afterAllFilesWrite: "prettier --write",
    },
  },
});
