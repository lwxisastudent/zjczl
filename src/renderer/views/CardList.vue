<template>
    <div class="content">
      <div class="form-row" style="margin-bottom: 20px;">
        <input
          v-model="searchParams.tanfangno"
          placeholder="单位号"
          class="input"
        />
        <input
          v-model="searchParams.accuno"
          placeholder="堆积号"
          class="input"
        />
        <button @click="search" class="btn" :disabled="isLoading">
          {{ isLoading ? "搜索中..." : "搜索" }}</button>
      </div>
  
      <div v-if="list.length > 0">
        <div class="item-list-header">
            <label style="width: 40px;">编号</label>
            <label style="width: 80px;">材质</label>
            <label style="width: 80px;">名称</label>
            <label style="width: 100px">记录时间</label>
        </div>
        <div v-for="item in list" :key="item.utensilsno" class="item-list" @click="goToCard(item)">
            <label style="width: 40px;">{{ item.utensilsno }}</label>
            <label style="width: 80px;">{{ item.texture }}</label>
            <label style="width: 80px;">{{ item.name }}</label>
            <label style="width: 100px">{{ item.ctime }}</label>
        </div>
      </div>
      <div v-else>暂无数据</div>
    </div>
  </template>
  
  <script>
  import axios from "axios";
  const { ipcRenderer } = window.require('electron');
  import { useGlobalStore } from '../stores/global';
  
  export default {
    data() {
      return {
        searchParams: {
          tanfangno: "",
          accuno: "",
          isLoading: false
        },
        list: [],
        loginInfo: null,
      };
    },
    async created() {
      const loginInfo = await this.getLoginInfo();
      if (!loginInfo) {
        this.$router.push("/login");
        return;
      }
      this.loginInfo = loginInfo;
  
      const { tanfangno, accuno } = this.$route.query;
      if (tanfangno || accuno) {
        this.searchParams.tanfangno = tanfangno || "";
        this.searchParams.accuno = accuno || "";
        this.search();
      }else{
        const store = useGlobalStore();
        const sd = store.getCardListData();
        if(sd){
            this.searchParams = sd.searchParams;
            this.list = sd.list;
        }
      }
    },
    methods: {
      async getLoginInfo() {
        try {
          const response = await ipcRenderer.invoke("get-login-info");
          return response;
        } catch (error) {
          console.error("获取登录信息失败:", error);
          return null;
        }
      },
      async search() {
        this.isLoading = true;
        try {
          const { tanfangno, accuno } = this.searchParams;
  
          const postData = {
            currPage: 1,
            pageSize: 200,
            data: {
              danweino: tanfangno,
              accuno: accuno,
              utensilsno: "",
              userName: "",
              texture: "",
              name: "",
              isaudit: "8",
              userId: "",
              viewType: 1,
              proUserType: this.loginInfo.proUserType,
            },
            token: this.loginInfo.token,
            projectId: this.loginInfo.projectId,
            userId: this.loginInfo.userId,
            userName: this.loginInfo.userName,
            projectName: this.loginInfo.projectName,
            proUserType: this.loginInfo.proUserType,
          };
  
          const response = await axios.post(
            "http://www.kggis.com/kgfj/interFinishing/pageOne.htm",
            postData,
            { headers: { "Content-Type": "application/json" } }
          );
  
          const data = response.data;
          if (data && data.list) {
            this.list = response.data.list.map(item => ({
                ...item,
                ctime: this.formatDate(item.ctime)
            }));
          } else {
            this.list = [];
          }

            const store = useGlobalStore();
            store.setCardListData({
                searchParams: this.searchParams,
                list: this.list
            });
            this.isLoading = false;
        } catch (error) {
          console.error("搜索失败:", error);
          alert('搜索失败，请检查网络重试')
          this.list = [];
          this.isLoading = false;
        }
      },
      goToCard(item) {
        this.$router.push({
          path: "/card",
          query: item,
        });
      },
      formatDate(timestamp) {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份从0开始，所以加1
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    },
  };
  </script>
  
<style scoped>
.form-row {
    display: flex;
    width: 100%;
    align-items: center;
}

.form-row input {
    height: 20px;
    width: 100px;
    margin-right: 10px;
}

.item-list-header {
    font-weight: 1000;
}
  
.item-list, .item-list-header {
    display: flex;
    justify-content: space-between;
}

.item-list{
    padding: 5px;
    border-bottom: 1px solid #d3d3d3;
}
  
.item-list:hover {
    background-color: #f9f9f9;
}
</style>
  