export default defineBackground(() => {
  console.log("한자한자 Background Script 로드됨");

  // 우클릭 컨텍스트 메뉴: 단어장에 추가
  browser.contextMenus.create({
    id: "add-to-vocabulary",
    title: "한자한자 단어장에 추가",
    contexts: ["selection"],
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "add-to-vocabulary" && info.selectionText) {
      // TODO: 선택된 텍스트를 단어장에 저장하는 로직
      console.log("단어장 저장 요청:", info.selectionText);
    }
  });
});
