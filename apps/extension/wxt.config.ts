import { defineConfig } from "wxt";

export default defineConfig({
  extensionApi: "chrome",
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "한자한자 - 한자 자동 변환",
    description:
      "웹페이지의 한자어를 자동으로 한자로 변환하여 자연스럽게 한자를 학습하세요.",
    permissions: ["storage", "contextMenus", "activeTab"],
    host_permissions: ["<all_urls>"],
  },
});
