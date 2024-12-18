import { defineStore } from 'pinia';

export const useGlobalStore = defineStore('global', {
  state: () => ({
    currentIndex: null,
    hideExported: true
  }),
  actions: {
    setCurrentIndex(index) {
      this.currentIndex = index;
    },
    getCurrentIndex() {
      return this.currentIndex;
    },
    setHideExported(hideExported){
      this.hideExported = hideExported;
    },
    getHideExported(){
      return this.hideExported;
    }
  },
});
