<template>
  <div class="subpage">
    <Header title="器物管理" @close="goHome" />

<div class="content">
  <div class="form-row">
    <label style="width: 75px;">探方号</label>
    <label style="width: 75px;">单位号</label>
    <label style="width: 75px;">堆积号</label>
  </div>
  <div class="form-row" style="margin-bottom: 20px;">
    <input
      v-model="searchParams.tanfangno"
      placeholder="探方号"
      class="input"
      style="width: 75px;"
    />
    <input
      v-model="searchParams.danweino"
      placeholder="单位号"
      class="input"
      style="width: 75px;"
    />
    <input
      v-model="searchParams.accuno"
      placeholder="堆积号"
      class="input"
      style="width: 75px;"
    />
    <button @click="search" :disabled="isLoading" style="white-space: nowrap;">
      {{ isLoading ? "搜索中..." : "搜索" }}
    </button>
  </div>

  <!-- 批量导入功能 -->
  <div v-if="totalImports > 0">
    <div style="margin-top: 10px;">
      批量导入：{{ currentImportIndex }} / {{ totalImports }}
      <button @click="continueBatchImport" style="margin: 0 5px;" :disabled="!isPaused">继续</button>
      <button @click="stopBatchImport" :disabled="isPaused">暂停</button>
    </div>
  </div>
  <div v-if="totalImports === list.length" style="margin-bottom: 20px;">
    <div>
          批量填写其他部位：{{ currentOtherImportIndex }} / {{ totalImports }}
          <button @click="continueOtherBatchImport" style="margin: 0 5px;" :disabled="!isOtherPaused">继续</button>
          <button @click="stopOtherBatchImport" :disabled="isOtherPaused">暂停</button>
        </div>
  </div>

  <!-- 表格内容 -->
  <div v-if="list.length > 0">
    <div class="item-list-header">
      <label style="width: 40px;">编号</label>
      <label style="width: 60px;">材质</label>
      <label style="width: 60px;">名称</label>
      <label style="width: 100px;">备注</label>
      <label style="width: 60px">操作</label>
    </div>
    <div
      v-for="item in list"
      :key="item.utensilsno"
      class="item-list"
      @click="goToCard(item)"
    >
      <label style="width: 40px;">{{ item.utensilsno }}</label>
      <label style="width: 60px;">{{ item.texture }}</label>
      <label style="width: 60px;">{{ item.name }}</label>
      <label style="width: 100px;">{{ item.remark }}</label>
  <button @click.stop="deleteItem(item)">删除</button>
    </div>
  </div>
  <div v-else>暂无数据</div>
</div></div>
</template>
  
  <script>
  import axios from "axios";
  const fs = require('fs');
  import Header from '../components/Header.vue';
  const { ipcRenderer } = window.require('electron');
  import { useGlobalStore } from '../stores/global';
  import * as XLSX from 'xlsx';
  
  export default {
  components: {
    Header,
  },
    data() {
      return {
        searchParams: {
          danweino: "",
          tanfangno: "",
          accuno: ""
        },
        list: [],
        otherParts: null,
        loginInfo: null,
        isLoading: false,
    isPaused: true,
    currentImportIndex: 0,
    totalImports: 0,
      isOtherPaused: true,
      currentOtherImportIndex: 0,
      };
    },
    async created() {
      const loginInfo = await this.getloginInfo();
      if (!loginInfo) {
        this.$router.push("/login");
        return;
      }
      this.loginInfo = loginInfo;
  
      const { tanfangno, accuno, dataXlsxDir, tableName } = this.$route.query;

      if (tanfangno && accuno) {
        this.searchParams.tanfangno = tanfangno;
        this.searchParams.danweino = tanfangno;
        this.searchParams.accuno = accuno;
        if(dataXlsxDir && tableName){
          this.dataXlsxDir = decodeURIComponent(dataXlsxDir);
          this.tableName = decodeURIComponent(tableName);
          await this.fetchOtherParts();
        }
        this.search();
      } else {
        const store = useGlobalStore();
        const sd = store.getCardListData();
        if(sd){
            this.searchParams = sd.searchParams;
            this.list = sd.list;
            this.dataXlsxDir = sd.dataXlsxDir;
            this.tableName = sd.tableName;
            this.fetchOtherParts();
        }
      }
    },
    methods: {
        async goHome() {
            this.$router.push('/');
        },
        async fetchOtherParts(){
          const dataXlsxDir = this.dataXlsxDir;
          const tableName = this.tableName;

          const fileData = fs.readFileSync(dataXlsxDir);
        const workbook = XLSX.read(fileData, { type: 'buffer' });
        const worksheet = workbook.Sheets[tableName];

        if (!worksheet) {
          alert('无法读取指定表格');
          return;
        }

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const otherParts = {};

        jsonData.forEach((row, index) => {
          const key = String(row[4] || '');

          if (key) {
            const type = String(row[0] || '');
            const part = String(row[1] || '');
            const width = String(row[10] || '');
            const height = String(row[11] || '');
            const thickness = String(row[12] || '');

            otherParts[key] = { 
              type,
              part,
              width,
              height,
              thickness,
              remark: `室内整理标本：${type} ${part}，${this.formatThirdColumn(row[2])}`,
              op: `${type}${part}残片，残宽${width}cm，残高${height}cm，厚度${thickness}cm`
            };
          }
        });

        this.otherParts = otherParts;
      this.totalImports = Object.keys(this.otherParts).length;
        },
  formatThirdColumn(text) {
    if (!text) return '';
    return text.trim()
      .replace(/[.,()+]/g, (match) => {
        const map = { '.': '。', ',': '，', '+': '＋', '(': '（', ')': '）' };
        return map[match];
      })
      .replace(/#/g, '')
      .replace(/\//g, '。')
      .replace(/。$/, '')
      .concat(text.endsWith('）') || text.endsWith('。') ? '' : '。');
  },
      async getloginInfo() {
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
          const { danweino, tanfangno, accuno } = this.searchParams;
  
          const postData = {
            currPage: 1,
            pageSize: 200,
            data: {
              danweino: danweino,
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
                ctime2: this.formatDate(item.ctime)
            }));
          } else {
            this.list = [];
          }

            const store = useGlobalStore();
            store.setCardListData({
                searchParams: this.searchParams,
                list: this.list,
                dataXlsxDir: this.dataXlsxDir,
                tableName: this.tableName,
                dataXlsxDir: this.dataXlsxDir,
                tableName: this.tableName
            });
            this.isLoading = false;
        } catch (error) {
          console.error("搜索失败:", error);
          alert('搜索失败，请检查网络重试')
          this.list = [];
          this.isLoading = false;
        }
      },
      async goToCard(item) {
        const query = {
          item: JSON.stringify(item),
          otherPart: JSON.stringify(this.otherParts ? this.otherParts[String(item.utensilsno)] || null : null),
        };

        const response = await ipcRenderer.invoke('open-card-window', query);
        if (!response.success) {
          console.error('打开新窗口失败:', response.message);
        }
      },
      formatDate(timestamp) {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      },

  async processNextImport() {
    if (this.isPaused) return;

    const keys = Object.keys(this.otherParts);
    if (this.currentImportIndex >= keys.length) {
      alert("批量导入完成");
      this.search();
      return;
    }

    const key = keys[this.currentImportIndex];
    const part = this.otherParts[key];

    const postData = {
      utensilsno: String(key),
      texture: "陶瓦",
      name: part.type,
      danweino: this.searchParams.danweino,
      accuno: this.searchParams.accuno,
      tanfangno: this.searchParams.tanfangno,
      fabu: "1",
      nposition: "",
      position: "",
      high: "",
      ctime: Date.now(),
      remark: part.remark,
      token: this.loginInfo.token,
      projectId: this.loginInfo.projectId,
      projectName: this.loginInfo.projectName,
      proUserType: this.loginInfo.proUserType,
      userId: this.loginInfo.userId,
      userName: this.loginInfo.userName
    };

    try {
      const response = await axios.post(
        "http://www.kggis.com/kgfj/interFinishing/add.htm",
        postData,
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.data.code === 0) {
        console.log(`记录 ${key} 添加成功`);
        this.currentImportIndex++;
        this.processNextImport();

      } else {
        console.error(`记录 ${key} 添加失败:`, response.data.message);
        this.stopBatchImport();
        alert(`编号${key}添加失败，请检查是否已存在`);
      }
    } catch (error) {
      console.error(`记录 ${key} 添加失败:`, error);
      this.stopBatchImport();
      alert(`网络错误，编号${key}添加失败`);
    }
  },

  stopBatchImport() {
    this.isPaused = true;
  },

  continueBatchImport() {
    this.isPaused = false;
    this.processNextImport();
  },
    async processNextOtherImport() {
      if (this.isOtherPaused) return;
      if (this.currentOtherImportIndex >= this.otherParts.length) {
        alert("批量填写其他部位完成");
        return;
      }
      const item = this.list[this.currentOtherImportIndex];
    const keys = Object.keys(this.otherParts);
    const key = keys[this.currentImportIndex];
    const part = this.otherParts[key];

      const postData = {
      id: "",
      xiantuID: "",
      zhaopianID: "",
      isaudit: "",
      ctqwglID: "",
      danweino: item.danweino,
      accuno: item.accuno,
      utensilsno: item.utensilsno,
      texture: item.texture,
      name: item.tanfangno,
      buwei: "",
      tanfangno: item.tanfangno,
      userName: this.loginInfo.userName,
      ctime: item.ctime2,
      repairuserName: "",
      chutuAddress: "",
      caliber: "",
      abdominalDiameter: "",
      bottomDiameter: "",
      high: "",
      wallThickness: "",
      otherParts: part.op,
      weight: "",
      capacity: "",
      material: "",
      forming: "",
      dressing: "",
      decoration: "",
      heat: "",
      heatOrDecoration: "",
      useTrace: "",
      repairTrace: "",
      switchTrace: "",
      morphology: "",
      typeDescription: "",
      typeDecoration: "",
      typeOrnamentation: "",
      testingOne: "",
      testingTwo: "",
      remark: item.remark,
      specimen: "",
      depositAddress: "",
      isauditcontent: "",
      token: this.loginInfo.token,
      projectId: this.loginInfo.projectId,
      userId: this.loginInfo.userId,
      projectName: this.loginInfo.projectName,
      proUserType: 0
    };

      try {
       const response = await axios.post("https://www.kggis.com/kgfj/qwcard/saveOrUpdate.htm", postData,
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.data.code === 0) {
        console.log(`记录 ${key} 添加成功`);
        this.currentOtherImportIndex++;
        this.processNextOtherImport();

      } else {
        console.error(`记录 ${key} 添加失败:`, response.data.message);
        this.stopOtherBatchImport();
        alert(`编号${key}填写失败，请检查是否已填过器物卡片`);
      }
      } catch (error) {
        console.error("导入失败:", error);
        this.stopOtherBatchImport();
        alert(`网络错误，编号${key}填写失败`);
      }
    },
    continueOtherBatchImport() {
      this.isOtherPaused = false;
      this.processNextOtherImport();
    },
    stopOtherBatchImport() {
      this.isOtherPaused = true;
    },
    async deleteItem(item) {
    if (!confirm(`确认删除编号为 ${item.utensilsno} 的记录吗？`)) {
      return;
    }

    try {
      const response = await axios.post(
        "https://www.kggis.com/kgfj/interFinishing/delete.htm",
        new URLSearchParams({
          id: item.id,
          token: this.loginInfo.token,
          projectId: this.loginInfo.projectId,
        }).toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      if (response.data.code === 0) {
        alert("删除成功！");
        this.list = this.list.filter((i) => i.id !== item.id);
      } else {
        alert("删除失败");
      }
    } catch (error) {
      console.error("删除失败:", error);
      alert("网络错误，删除失败");
    }
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
    min-width: 0;
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
  
.item-list button {
    height: 20px;
    width: 60px;
    white-space: nowrap;
    line-height: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
  