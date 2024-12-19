import { defineStore } from 'pinia';

export const useGlobalStore = defineStore('global', {
  state: () => ({
    currentIndex: null,
    hideExported: true,
    cardListData: {
      searchParams: {
        tanfangno: '',
        accuno: ''
      },
      list: []
    }
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
    },
    setCardListData(data) {
      this.cardListData = data;
    },
    getCardListData() {
      return this.cardListData;
    }
  },
});
