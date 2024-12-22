<template>
    <div class="left">
      <img class="avatar" src="/assets/cirno.png" />
      <template v-if="userName === ''">
        <button @click="menuAction('login')">登录</button>
      </template>
      <template v-else>
        <label style="color: #BCBABD; margin-top: 5px;">已登录：{{userName}}</label>
        <div style="display: flex; justify-content: space-between;">
        <button style="width: 60px" @click="logout">退出登录</button>
        <button style="width: 60px" @click="menuAction('login')">切换账号</button>
        </div>
      </template>
      <div class="tips">
        <label>†表格格式†</label>
        <label>Row1:板瓦/筒瓦</label>
        <label>Row2:瓦头/瓦尾/瓦身</label>
        <label>Row3:凸面XXX，凹面XXX</label>
        <label>Row4:分类照组号</label>
        <label>Row5:标本号</label>
        <label>Row6:标本照组号</label>
        <label>Row7:总数量</label>
        <label>Row8:总重量</label>
        <label>Row9:标本数量</label>
        <label>Row10:标本重量</label>
        <label>Row11:标本残宽</label>
        <label>Row12:标本残高</label>
        <label>Row13:标本厚度</label>
        <label>请使用†英文逗号†！</label>
      </div>
    </div>
  </template>
  
  <script>
  const { ipcRenderer } = require('electron');
  
  export default {
  data() {
    return {
      userName: '',
    };
  },
    methods: {
      menuAction(action) {
        ipcRenderer.send('menu-action', action);
      },
      async logout(){    
        const response = await ipcRenderer.invoke("logout");
      }
    },
    mounted() {
      ipcRenderer.invoke("get-login-info").then((loginInfo) => {
        this.userName = loginInfo.userName || '';
      });

      ipcRenderer.on('login-success', (event, loginInfo) => {
        this.userName = loginInfo.userName || '';
      });
    },
  beforeUnmount() {
    ipcRenderer.removeAllListeners('login-success');
  }
  };
  </script>
  
  <style scoped>
    .left {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100vh;
        background-color: black;
    align-items: center;
    margin-left: -10px;
    margin-top: -20px;
    }

    .left .avatar {
        margin-top: 35px;
        width: 100px;
        border-radius: 100px;
        /*border: var(--color-1) solid 2px;*/
    }

    .left button {
        margin-top: 20px;
        width: 100px;
        --border-color: var(--ft);
        --bg-color: var(--color-1);
    }

    .left button:hover {
      --bg-color: var(--color-1-h);
    }

    .tips {
      display: flex;
      flex-direction: column;
      margin-top: 20px;
      color: #BCBABD;
    }
  </style>
  