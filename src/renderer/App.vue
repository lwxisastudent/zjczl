<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
const { ipcRenderer } = window.require('electron');

export default {
  name: 'App',
  mounted() {
    ipcRenderer.on('navigate', (event, route) => {
      this.$router.push(`/${route}`);
    });

    ipcRenderer.on('refresh-folders', () => {
      this.$root.$emit('refresh-folders');
    });
  },
  beforeUnmount() {
    ipcRenderer.removeAllListeners('navigate');
    ipcRenderer.removeAllListeners('refresh-folders');
  },
};
</script>

<style>
.content {
  padding: 10px 30px;
}
.subpage .content {
  margin-top: 95px;
}

.buttons {
  margin-top: 20px;
  display: flex;
  justify-content: space-around;
}

.buttons button {
  width: 110px;
}
</style>
