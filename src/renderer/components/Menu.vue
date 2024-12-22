<template>
    <div class="menu">
      <button v-if="!subWindow" @click="menuAction('config')">设置</button>
      <button @click="menuAction('reload')">刷新</button>
      <button @click="toggleAlwaysOnTop" v-if="top" style="--bg-color: var(--color-1-h);">取消顶部</button>
      <button @click="toggleAlwaysOnTop" v-else>保持顶部</button>
    </div>
  </template>
  
  <script>
  const { ipcRenderer } = window.require('electron');
  
  export default {
    props: {
        subWindow: {
        type: Boolean,
        default: true
        },
      },
  data() {
    return {
      top: false,
    };
  },
    methods: {
      menuAction(action) {
        ipcRenderer.send('menu-action', action);
      },
      toggleAlwaysOnTop(){
        window.electronAPI?.toggleAlwaysOnTop();
        this.top = !this.top;
      }
    },
    async mounted() {
      const windowId = process.argv.find(arg => arg.startsWith('windowId=')).split('=')[1];
      this.top = await ipcRenderer.invoke('get-always-on-top', windowId);
    },
  };
  </script>
  
  <style scoped>
    .menu {
        display: flex;
    }
  .menu button {
    margin: 5px;
    border: none;
    cursor: pointer;
  --bg-color: var(--color-1);
  --border-color: var(--ft);

    height: 25px;
    width: 80px;
  }
  .menu button:hover {
    --bg-color: var(--color-1-h);
  }
  </style>
  