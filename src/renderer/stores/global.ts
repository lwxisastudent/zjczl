import { defineStore } from 'pinia';

export const useGlobalStore = defineStore('global', {
  state: () => ({
    currentIndex: null, // 当前选中序号
  }),
  actions: {
    setCurrentIndex(index) {
      this.currentIndex = index;
    },
    getCurrentIndex() {
      return this.currentIndex;
    },
  },
});
