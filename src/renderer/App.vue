<template>
  <div>
    <div class="title-bar">
      <div class="title">{{ subWindow ? '器物卡片' :
        '东组陶瓦整理　ようこそ！'}}</div>
      <div class="window-controls">
        <button @click="minimize">-</button>
        <button @click="close">×</button>
      </div>
      <Menu style="width: 100%;" :subWindow="subWindow"></Menu>
    </div>
    
    <template v-if="subWindow">
      <div class="page page-subWindow" style="width: calc(100vw - 20px);">
        <router-view />
      </div>
    </template>
    <template v-else>
      <div class="page">
        <Left style="flex: 1;" />
        <router-view style="width: 400px;" />
      </div>
    </template>
  </div>
</template>

<script>
const { ipcRenderer } = window.require('electron');
import Menu from './components/Menu.vue';
import Left from './components/Left.vue';

export default {
  components: {
    Menu,
    Left
  },
  name: 'App',
  computed: {
    subWindow() {
      return this.$route.path === '/card';
    }
  },
  mounted() {
    ipcRenderer.on('navigate', (event, route) => {
      this.$router.push(`/${route}`);
    });

    const windowId = process.argv.find(arg => arg.startsWith('windowId=')).split('=')[1];

    window.electronAPI = {
      sendMinimize: () => ipcRenderer.send('window-minimize', windowId),
      sendClose: () => ipcRenderer.send('window-close', windowId),
      toggleAlwaysOnTop: () => ipcRenderer.send('toggle-always-on-top', windowId)
    };
  },
  beforeUnmount() {
    ipcRenderer.removeAllListeners('navigate');
  },
  methods: {
    minimize() {
      window.electronAPI?.sendMinimize();
    },
    close() {
      window.electronAPI?.sendClose();
    },
  },
};
</script>

<style>
/* 窗口设计 */
.title-bar {
  position: absolute;
  left: 0;
  top: 0;
  width: calc(100vw - 20px);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  background-color: #000;
  color: white;
  padding: 5px 10px;
  -webkit-app-region: drag;
}
.title-bar *{
  -webkit-app-region: drag;
}
.title-bar button {
  -webkit-app-region: no-drag;
}
.window-controls {
  display: flex;
}
.window-controls button {
  cursor: pointer;
  padding: 0;
  width: 30px;
  max-width: 30px;
}
.window-controls button:hover {
  background-color: #34495e;
}
.page {
  position: fixed;
  top: 80px;
  width: 100vw;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
}

.page-subWindow {
  height: calc(100vh - 90px);
  overflow-y: scroll;
}

.page-subWindow::-webkit-scrollbar {
  display: none;
}

/* 页面布局 */
.content {
  padding: 10px 30px;
  width: calc(100% - 60px);
    display: flex;
    flex-direction: column;
}
.subpage {
  width: 368.5px!important;
  margin: 0 10px;
  margin-right: 20px;
  border: #000 solid 1px;
  height: calc(100vh - 95px);
  display: flex;
  flex-direction: column;
}
.subpage .content {
  margin-top: 10px;
  padding: 20px 30px;
  overflow-y: scroll;
}

.subpage .content::-webkit-scrollbar {
  display: none;
}

textarea {
    overflow-y: scroll;
}
textarea::-webkit-scrollbar {
  display: none;
}

.buttons {
  margin-top: 20px;
  display: flex;
}

.buttons button {
  width: 70px;
  margin-right: 10px;
}

.operate-button {
  --bg-color: transparent;
}

.operate-button:hover {
  --bg-color: var(--color-3);
}
</style>
