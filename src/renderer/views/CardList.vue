<template>
  <div class="subpage">
    <Header title="器物管理" @close="goHome" />

<div class="content">
  <div class="form-row">
    <label style="width: 75px;">探方号</label>
    <label style="width: 75px;">单位号</label>
    <label style="width: 75px;">堆积号</label>
  </div>
  <div class="form-row" style="margin-bottom: 10px;">
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
      <div class="form-row">
        <label style="width: 120px;">标本图片文件夹：</label>
        <input type="text" style="flex: 1;" v-model="exportFolder" readonly @click="selectFolder('exportFolder')" />
      </div>
      <div class="form-row" style="margin-bottom: 20px;">
        <label style="width: 120px;">标本图片前缀：</label>
        <input type="text" style="flex: 1;" v-model="samplePrefix" />
      </div>

  <!-- 批量导入功能 -->
  <div v-if="totalImports > 0 || (totalItems > 0 && Boolean(exportFolder))" style="margin-bottom: 20px;">

    <div v-if="totalImports > 0">
    <div style="margin-top: 10px; display: flex; width:100%;">
      批量导入：<input 
        type="number" 
        :disabled="!isPaused"
        v-model.number="currentImportIndex" 
        style="width: 30px;"
        :max="totalImports" 
        :min="minImportIndex"
      /> / {{ totalImports }}
      <button class="import-button" @click="continueBatchImport" style="margin: 0 10px; margin-left: auto;" :disabled="!isPaused">继续</button>
      <button class="import-button"  @click="stopBatchImport" :disabled="isPaused">暂停</button>
    </div>
  </div>
  <div v-if="totalImports > 0 && list.length > 0">
    <div style="display: flex; width:100%;">
          批量填写：<input 
        type="number" 
        :disabled="!isOtherPaused"
        v-model.number="currentOtherImportIndex" 
        style="width: 30px;"
        :max="totalImports" 
        :min="minImportIndex"
      /> / {{ totalImports }}
          <button class="import-button"  @click="continueOtherBatchImport" style="margin: 0 10px; margin-left: auto;" :disabled="!isOtherPaused">继续</button>
          <button class="import-button"  @click="stopOtherBatchImport" :disabled="isOtherPaused">暂停</button>
        </div>
  </div>
  <div v-if="totalItems > 0 && Boolean(exportFolder)">
    <div style="display: flex; width:100%;">
      批量传图：<input 
        type="number" 
        :disabled="!isPhotoPaused"
        v-model.number="currentPhotoImportIndex" 
        style="width: 30px;" 
        :max="totalItems" 
        :min="minImportIndex"
      />  / {{ totalItems }}
      <button class="import-button" @click="continuePhotoImport" style="margin: 0 10px; margin-left: auto;" :disabled="!isPhotoPaused">继续</button>
      <button class="import-button"  @click="stopPhotoImport" :disabled="isPhotoPaused">暂停</button>
    </div>
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
      <button class="operate-button" @click.stop="deleteItem(item)">删除</button>
    </div>
  </div>
  <div v-else>暂无数据</div>
</div></div>
</template>
  
  <script>
  import axios from "axios";
  const path = require('path');
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
        loginInfo: null,
        isLoading: false,

        dataXlsxDir: null,
        tableName: null,
        exportFolder: null,
        samplePrefix: '',
        otherParts: null,
        
    totalImports: 0,
    minImportIndex: 0,
    totalItems: 0,
    isPaused: true,
    currentImportIndex: 1,
      isOtherPaused: true,
      currentOtherImportIndex: 1,
      isPhotoPaused: true,
      currentPhotoImportIndex: 1,
      };
    },
    async created() {
      const loginInfo = await this.getloginInfo();
      if (!loginInfo) {
        this.$router.push("/login");
        return;
      }
      this.loginInfo = loginInfo;
  
      const { tanfangno, accuno, dataXlsxDir, tableName, exportFolder } = this.$route.query;
      const store = useGlobalStore();

      if(exportFolder){
        this.exportFolder = decodeURIComponent(exportFolder);
      }else{
        const sd = store.getCardListData();
        if(sd && sd.exportFolder){
          this.exportFolder = sd.exportFolder;
        }else{
          const config = await ipcRenderer.invoke('get-config');
          this.exportFolder = path.resolve(config.exportFolder);
        }
      }

      if (tanfangno && accuno) {
        this.searchParams.tanfangno = tanfangno;
        
        const match = accuno.match(/(H\d+)(.*)/);
        if (match) {
          this.searchParams.danweino = match[1];
          this.searchParams.accuno = match[2];
        } else {
          this.searchParams.danweino = tanfangno;
          this.searchParams.accuno = accuno;
        }
        
        if(dataXlsxDir && tableName){
          this.dataXlsxDir = decodeURIComponent(dataXlsxDir);
          this.tableName = decodeURIComponent(tableName);
          await this.fetchOtherParts();
          this.totalImports = Math.max(...Object.keys(this.otherParts).map(key => {
            const num = parseInt(key, 10);
            return isNaN(num) ? 0 : num;
          }));
          this.minImportIndex = Math.min(...Object.keys(this.otherParts).map(key => {
            const num = parseInt(key, 10);
            return isNaN(num) ? 0 : num;
          }));
          this.currentImportIndex = this.minImportIndex;
          this.currentOtherImportIndex  = this.minImportIndex;
          this.currentPhotoImportIndex = this.minImportIndex;
        }
        this.search(); //搜索结束后自动保存store
      } else {
        const sd = store.getCardListData();
        if(sd){
            this.searchParams = sd.searchParams;
            this.list = sd.list;
            this.dataXlsxDir = sd.dataXlsxDir;
            this.tableName = sd.tableName;
            if(this.dataXlsxDir && this.tableName){
              this.fetchOtherParts();
            }
        }
      }
    },
  watch: {
    "searchParams.tanfangno": "updateSamplePrefix",
    "searchParams.danweino": "updateSamplePrefix",
    "searchParams.accuno": "updateSamplePrefix",
  },
    methods: {
    updateSamplePrefix() {
      const { tanfangno, danweino, accuno } = this.searchParams;
      this.samplePrefix =
        tanfangno === danweino
          ? `${tanfangno || ''}${accuno || ''}`
          : `${tanfangno || ''}${danweino || ''}${accuno || ''}`;
    },
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
          const weight = String(row[9] || '');

          const keyCommaCount = (key.match(/,/g) || []).length;
          const widthCommaCount = (width.match(/,/g) || []).length;
          const heightCommaCount = (height.match(/,/g) || []).length;
          const thicknessCommaCount = (thickness.match(/,/g) || []).length;
          const weightCommaCount = (weight.match(/,/g) || []).length;

          if (keyCommaCount === widthCommaCount && 
              keyCommaCount === heightCommaCount && 
              keyCommaCount === thicknessCommaCount &&
              keyCommaCount === weightCommaCount) {
            const keys = key.split(',');
            const widths = width.split(',');
            const heights = height.split(',');
            const thicknesses = thickness.split(',');
            const weights = weight.split(',');

            keys.forEach((subKey, i) => {
              otherParts[subKey.trim()] = {
                type,
                part,
                weight: weights[i]?.trim() || '',
                width: widths[i]?.trim() || '',
                height: heights[i]?.trim() || '',
                thickness: thicknesses[i]?.trim() || '',
                remark: `室内整理标本：${type} ${part}，${this.formatThirdColumn(row[2])}`,
                op: `${type}${part}残片，残宽${widths[i]?.trim()}cm，残高${heights[i]?.trim()}cm，厚度${thicknesses[i]?.trim()}cm`
              };
            });
          } else {
            otherParts[key] = {
              type,
              part,
              weight: row[9] || '',
              width,
              height,
              thickness,
              remark: `室内整理标本：${type} ${part}，${this.formatThirdColumn(row[2])}`,
              op: `${type}${part}残片，残宽${width}cm，残高${height}cm，厚度${thickness}cm`
            };
          }
        }
      });
        this.otherParts = otherParts;
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
    selectFolder(key) {
      try {
        const defaultPath = this[key] || null;

        const selectedFolder = ipcRenderer.sendSync('select-folder', defaultPath);

        if (selectedFolder) {
          this[key] = selectedFolder;
          const store = useGlobalStore();
          store.setCardListData({
              ...store.getCardListData(),
              exportFolder: this.exportFolder
          });
        }
      } catch (error) {
        console.error('选择文件夹失败:', error);
        alert('无法打开文件夹选择对话框');
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
            this.list = response.data.list
              .filter(item => item.accuno === accuno)
              .map(item => ({
                  ...item,
                  ctime2: this.formatDate(item.ctime)
              }));
          } else {
            this.list = [];
          }

         this.totalItems = Math.max(...this.list.map(item => {
            const num = parseInt(item.utensilsno, 10);
            return isNaN(num) ? 0 : num;
          }));

            const store = useGlobalStore();
            store.setCardListData({
                searchParams: this.searchParams,
                list: this.list,
                dataXlsxDir: this.dataXlsxDir,
                tableName: this.tableName,
                dataXlsxDir: this.dataXlsxDir,
                tableName: this.tableName,
                exportFolder: this.exportFolder
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
  },
  async processNextImport() {
    if (this.isPaused) return;

    if (this.currentImportIndex > this.totalImports) {
      alert("批量导入完成");
      this.search();
      return;
    }
    
    if (this.searchParams.accuno.includes('H')) {
      if(!confirm('您的堆积号中包含 "H"，正确格式应该填入单位号中，如：\n探方号：T5457 单位号：H118 堆积号：①\n是否仍继续？')){
        return;
      }
    }

    const part = this.otherParts[String(this.currentImportIndex)];
    if(!part){
      alert("表格中不存在当前编号");
      return;
    }

    const postData = {
      utensilsno: String(this.currentImportIndex),
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
        console.log(`记录 ${String(this.currentImportIndex)} 添加成功`);
        this.currentImportIndex++;
        this.processNextImport();

      } else {
        console.error(`记录 ${String(this.currentImportIndex)} 添加失败:`, response.data.message);
        const skip = confirm(`编号${String(this.currentImportIndex)}添加失败，是否已经存在？\n是否略过并继续？`);
        if (skip) {
          this.currentImportIndex++;
          this.processNextImport();
        } else {
          this.stopBatchImport();
          this.search();
        }
      }
    } catch (error) {
      console.error(`记录 ${String(this.currentImportIndex)} 添加失败:`, error);
      this.stopBatchImport();
      alert(`网络错误，编号${String(this.currentImportIndex)}添加失败`);
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
      if (this.currentOtherImportIndex > this.totalImports) {
        alert("批量填写其他部位完成");
        return;
      }
    const part = this.otherParts[String(this.currentOtherImportIndex)];
    if(!part){
      alert("表格中不存在当前编号");
      return;
    }
    const item = this.list.find(item => item.utensilsno === String(this.currentOtherImportIndex));

    const postData1 = {
              ...item,
                token: this.loginInfo.token,
                projectId: this.loginInfo.projectId,
                projectName: this.loginInfo.projectName,
                proUserType: 3
            };

            delete postData1.ctime2;
  
          const response1 = await axios.post(
            "http://www.kggis.com/kgfj/qwcard/findByInterFinishing.htm",
            postData1,
            { headers: { "Content-Type": "application/json" } }
          );

          if (response1.data && response1.data.length > 0) {
            if (!confirm(`编号${String(this.currentOtherImportIndex)}已有器物卡片填写，是否覆盖填写“其他部位”、“重量”等部分。\n点击“取消”暂停，您可以手动改到没有冲突的编号继续填写。`)) {
             this.stopOtherBatchImport();
             return;
            }
          }

      const postData = {
      id: "",
      xiantuID: "",
      zhaopianID: "",
      isaudit: "",
      ctqwglID: "",
      buwei: "",
      userName: this.loginInfo.userName,
      repairuserName: "",
      chutuAddress: "",
      caliber: "",
      abdominalDiameter: "",
      bottomDiameter: "",
      high: "",
      wallThickness: "",
      capacity: "",
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
      specimen: "",
      depositAddress: "",
      isauditcontent: "",
        ...response1.data && response1.data.length > 0 ? response1.data[0] : {},
      danweino: item.danweino,
      accuno: item.accuno,
      utensilsno: item.utensilsno,
      texture: item.texture,
      name: item.tanfangno,
      tanfangno: item.tanfangno,
      ctime: item.ctime2,
      otherParts: part.op,
      weight: part.weight,
      remark: item.remark,
      material: "泥质陶。",
      token: this.loginInfo.token,
      projectId: this.loginInfo.projectId,
      projectName: this.loginInfo.projectName,
      proUserType: 0
    };

      try {
       const response = await axios.post("https://www.kggis.com/kgfj/qwcard/saveOrUpdate.htm", postData,
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.data.code === 0) {
        console.log(`记录 ${String(this.currentOtherImportIndex)} 添加成功`);
        this.currentOtherImportIndex++;
        this.processNextOtherImport();

      } else {
        console.error(`记录 ${String(this.currentOtherImportIndex)} 添加失败:`, response.data.message);
        this.stopOtherBatchImport();
        alert(`编号${String(this.currentOtherImportIndex)}填写失败，请检查是否已填过器物卡片`);
      }
      } catch (error) {
        console.error("导入失败:", error);
        this.stopOtherBatchImport();
        alert(`网络错误，编号${String(this.currentOtherImportIndex)}填写失败`);
      }
    },
    continueOtherBatchImport() {
      this.isOtherPaused = false;
      this.processNextOtherImport();
    },
    stopOtherBatchImport() {
      this.isOtherPaused = true;
    },  async processNextPhotoImport() {
    if (this.isPhotoPaused) return;

    if (this.currentPhotoImportIndex > this.totalItems) {
      alert("所有照片已成功导入！");
      return;
    }

    const item = this.list.find(item => item.utensilsno === String(this.currentPhotoImportIndex));
    if(!item){
      alert('编号不存在');
      return;
    }
    const { utensilsno } = item;

    const photos = await this.fetchPhotos(item);
    if (photos.length > 0) {
      if (confirm(`编号${utensilsno}器物卡片已有照片，是否清空原有照片并继续？`)) {
        for (const photo of photos) {
          await this.deleteImage(photo.id);
        }
      } else {
        this.stopPhotoImport();
        return;
      }
    }

    const samplePrefix = this.samplePrefix;
    const convexPath = path.join(
      this.exportFolder,
      `${samplePrefix}标${utensilsno}凸面.JPG`
    );
    const concavePath = path.join(
      this.exportFolder,
      `${samplePrefix}标${utensilsno}凹面.JPG`
    );

    const convexExists = fs.existsSync(convexPath);
    const concaveExists = fs.existsSync(concavePath);

    if (!convexExists || !concaveExists) {
      alert(`编号${utensilsno}无标本照或标本照不全`);
      this.stopPhotoImport();
      return;
    }

    try {
      await this.uploadImage(convexPath, item);
      await this.uploadImage(concavePath, item);

      console.log(`编号 ${utensilsno} 的照片已成功上传`);
      this.currentPhotoImportIndex++;
      this.processNextPhotoImport();
    } catch (error) {
      console.error(`编号 ${utensilsno} 的照片上传失败:`, error);
      alert(`编号${utensilsno}的照片上传失败，请检查网络`);
      this.stopPhotoImport();
    }
  },
      async fetchPhotos(item) {
            const loginInfo = this.loginInfo;
            const postData = {
              ...item,
                token: loginInfo.token,
                projectId: loginInfo.projectId,
                projectName: loginInfo.projectName,
                proUserType: 3
            };

            delete postData.ctime2;

        const response = await axios.post(
            "http://www.kggis.com/kgfj/qwcardZP/findByInterFinishing.htm",
            postData,
            { headers: { "Content-Type": "application/json" } }
          );
          
          const data = response.data;
          if (data && data.length > 0) {
            return data;
          }else{
            return [];
          }
      },
  stopPhotoImport() {
    this.isPhotoPaused = true;
  },
  continuePhotoImport() {
    this.isPhotoPaused = false;
    this.processNextPhotoImport();
  },
    async deleteImage(imageId) {
      const formData = new URLSearchParams();
      formData.append('ids', imageId);
      formData.append('token', this.loginInfo.token);
      formData.append('projectId', this.loginInfo.projectId);
      formData.append('projectName', this.loginInfo.projectName);
      formData.append('userId', this.loginInfo.userId);
      formData.append('userName', this.loginInfo.userName);
      formData.append('proUserType', this.loginInfo.proUserType);

      try {
        const response = await axios.post(
          'http://www.kggis.com/kgfj/qwcardZP/deleteAll.htm',
          formData,
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        
        if (response.status === 200) {
          return true;
        } else {
          console.error('Failed to delete image:', response);
        }
      } catch (error) {
        console.error('Error deleting image:', error);
      }

      return false;
    },
    async uploadImage(filePath, item) {
  const stats = fs.statSync(filePath);
  const modifiedTime = new Date(stats.mtime);

  const fileName = filePath.replace(/\\/g, '/').split('/').pop();
  const fileData = fs.readFileSync(filePath);
  const formData = new FormData();
  formData.append('addFile', new Blob([fileData], { type: 'image/jpeg' }), fileName);
  formData.append('key', `${this.loginInfo.userId}-${this.loginInfo.projectId}-qwtupian--false`);

  const uploadResponse = await axios.post(
    'http://47.92.38.139/kgFileServer/UploadServlet',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );

  const uploadResult = uploadResponse.data;
  if (!uploadResult || uploadResult.length === 0) {
    throw new Error('图片上传失败，服务器未返回结果。');
  }

  const uploadedFilePath = uploadResult[0].path;
  const postData = {
    danweino: item.danweino,
    qwcardId: '',
    accuno: item.accuno,
    utensilsno: item.utensilsno,
    texture: item.texture,
    name: item.name,
    ctime: this.formatDate2(modifiedTime),
    tanfangno: item.tanfangno,
    zhaopianSrc: uploadedFilePath,
    remark: '',
    token: this.loginInfo.token,
    projectId: this.loginInfo.projectId,
    userId: this.loginInfo.userId,
    userName: this.loginInfo.userName,
    projectName: this.loginInfo.projectName,
    proUserType: 0,
  };

  const saveResponse = await axios.post(
    'http://www.kggis.com/kgfj/qwcardZP/add.htm',
    postData,
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (!saveResponse.data || saveResponse.data.code !== 0) {
    throw new Error(`提交失败: ${saveResponse.data?.message || '未知错误'}`);
  }
},
  formatDate2(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  },
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
    line-height: 24px;
    display: flex;
  }

.import-button,
.operate-button {
  height: 24px;
  line-height: 24px;
}
</style>
  