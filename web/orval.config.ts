import { defineConfig } from "orval";

const input = "./src/shared/api/schemas/openapi.yaml";
const targetBaseDir = "./src/shared/api/generated";

export default defineConfig({
  api: {
    input,
    output: {
      target: "./src/shared/api/generated/api.ts",
      client: "react-query",
      mode: "split",
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
      afterAllFilesWrite: "npx prettier --write",
    },
  },
  zod: {
    input,
    output: {
      workspace: targetBaseDir,
      target: "zod/index.ts",
      client: "zod",
      indexFiles: false,
    },
    hooks: {
      afterAllFilesWrite: "npx prettier --write",
    },
  },
});
