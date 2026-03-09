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
    // 고정 확장 ID: 개발용만 (웹스토어는 자체 ID 부여하므로 key 불필요)
    ...(process.env.NODE_ENV !== "production" && {
      key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyAPTLvU49hFpoQmXHrjlRjVXaKdzKw+smyUQTln/YQ9YCSz6ksEya3pql/AWDDv6p7PwrQvFg4WLqV61mr1J45EHTIw3uPGBk9dgk8VvnF7um36Rz/MBqW0Bs/7n7GM27iTmTRUcUEd01c35RcDxQsA/PuwUJ4Qp8XC0EkvkoAkGnFE68AdAkWANMtcHOQWrZ+ykCuEKR2mq0jgn0VVvwK+4TdI59aDPAXkExa5dxeCWSuES1B1aHWyrlKJryxHWLW+8rF9fxWizWaOZExkLg1QWslZ/zm4xo2oxx76kQIy7A1SCtaaTF5AQeMeueDSm709oEj4eJWd28a9wLG71LwIDAQAB",
    }),
    name: "한자한자 - 한자 자동 변환",
    description:
      "웹페이지의 한자어를 자동으로 한자로 변환하여 자연스럽게 한자를 학습하세요.",
    permissions: ["storage", "contextMenus", "activeTab", "tabs"],
    host_permissions: ["<all_urls>"],
    web_accessible_resources: [
      {
        resources: ["dict/*", "kuromoji-dict/*", "wsd/*"],
        matches: ["<all_urls>"],
      },
    ],
  },
});
