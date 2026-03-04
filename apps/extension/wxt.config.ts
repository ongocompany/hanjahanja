import { defineConfig } from "wxt";
import path from "path";

export default defineConfig({
  extensionApi: "chrome",
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    resolve: {
      alias: {
        "kuromoji-ko": path.resolve(
          __dirname,
          "../../node_modules/.pnpm/kuromoji-ko@1.0.8/node_modules/kuromoji-ko/dist/index.js"
        ),
        pako: path.resolve(
          __dirname,
          "../../node_modules/.pnpm/pako@2.1.0/node_modules/pako"
        ),
      },
    },
  }),
  manifest: {
    name: "한자한자 - 한자 자동 변환",
    description:
      "웹페이지의 한자어를 자동으로 한자로 변환하여 자연스럽게 한자를 학습하세요.",
    permissions: ["storage", "contextMenus", "activeTab"],
    host_permissions: ["<all_urls>"],
    web_accessible_resources: [
      {
        resources: ["dict/*", "kuromoji-dict/*"],
        matches: ["<all_urls>"],
      },
    ],
  },
});
