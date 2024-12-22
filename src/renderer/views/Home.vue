<template>
  <div>
    <div class="content">
      <div class="form-row">
        <label  style="align-items: center;
        display: flex;">
          <input style="flex:none; margin-right:5px;" type="checkbox" v-model="hideExported" @change="updateHideExported" /> 隐藏已导出
        </label>      <input
        style="margin-left: 30px;"
        type="text"
        v-model="searchQuery"
        placeholder="搜索堆积..."
      />
      </div>
      <ul class="folder-list">
        <li v-for="(item, index) in folderList" v-show="(!hideExported || !item.hasExport) && (!Boolean(searchQuery) || item.name.includes(searchQuery))" :key="index" @click="selectData(item)" :class="{'focused': currentFolder.absolutePath === item.absolutePath}">
          <span style="width: 200px;">{{ item.name }}</span>
          <span style="width: 70px; margin-right: 5px; white-space: nowrap;" :class="item.hasConfig ? 'configed' : 'none-configed'"></span>
          <span style="width: 70px; white-space: nowrap;" :class="item.hasExport ? 'exported' : 'unexported'"></span>
          <span @click.stop="openFolderInExplorer(item.absolutePath)" class="folder-icon">
            <i class="fa-regular fa-folder" aria-hidden="true"></i>
          </span>
        </li>
        <label class="none" v-if="folderList.length === 0">原照片文件夹中没有可整理堆积</label>
      </ul>
      <div class="form-row">
        <label>堆积号</label>
        <input style="flex: 1; margin-right: 5px;" type="text" v-model="currentFolder.tanfangno" placeholder="如：T5937" />
        <input style="flex: 1;" type="text" v-model="currentFolder.accuno" placeholder="如：③"/>
      </div>
      <div class="form-row">
        <label>表格文件          <span @click="openDataXlsx" class="folder-icon" v-if="currentFolder.dataXlsxDir">
          <i class="fa-regular fa-file" aria-hidden="true"></i>
        </span></label>
        <input :disabled="!currentFolder.absolutePath" type="text" v-model="currentFolder.dataXlsxDir" readonly @click="selectFile('dataXlsxDir')" />
      </div>
      <div class="form-row">
        <label>表格</label>
        <select v-model="currentFolder.table" :disabled="!currentFolder.sheetNames">
          <option value="" disabled>请选择表格</option>
          <option v-for="(sheet, index) in currentFolder.sheetNames" :key="index" :value="sheet">{{ sheet }}</option>
        </select>
        <button class="operate-button" :disabled="!currentFolder.dataXlsxDir || !currentFolder.table" @click="checkClassification">检查分类</button> 
      </div>
      <div class="form-row">
        <label>输出目录          <span @click="openOutputExplorer" class="folder-icon" v-if="currentFolder.hasExport">
            <i class="fa-regular fa-folder" aria-hidden="true"></i>
          </span></label>
        <input type="text" v-model="currentFolder.outputDir" />
        <button class="operate-button" :disabled="!currentFolder.absolutePath" @click="generateDefaultOutputDirByJPGFilesTime">计算日期</button> 
      </div>

      <div class="buttons">
        <button @click="saveConfig">保存配置</button>
        <button :disabled="!currentFolder.absolutePath || !currentFolder.outputDir || !currentFolder.dataXlsxDir || !currentFolder.table" @click="runScript('organizer')">整理照片</button>
        <button :disabled="!currentFolder.absolutePath || !currentFolder.outputDir || !currentFolder.dataXlsxDir || !currentFolder.table" @click="runScript('formFiller')">导出表格</button>
        <button style="margin-right: 0;" :disabled="!login || !currentFolder.tanfangno || !currentFolder.accuno" @click="goToCardPage">器物卡片</button>
      </div>
      <label class="tips">整理照片前请先检查分类，然后将表格用Excel手动排序表格，先升序排列C列，然后升序排列B列，然后升序排列A列，保证顺序统一</label>
    </div>
  </div>
</template>

<script>
const { ipcRenderer, shell } = window.require('electron');
const fs = require('fs');
const path = require('path');
import '@fortawesome/fontawesome-free/css/all.min.css';
import * as XLSX from 'xlsx';
import { useGlobalStore } from '../stores/global';

export default {
  data() {
    return {
      hideExported: false, 
      folderList: [],
      currentFolder: {},
      login: false,
      searchQuery: ''
    };
  },
  methods: {
    async refreshFolders() {
      const store = useGlobalStore();
      this.hideExported = store.getHideExported();
      
      const config = await ipcRenderer.invoke('get-config');
      if (!config.sourceFolder || !config.exportFolder) {
        alert('尚未配置原照片和到处目录，即将跳转到配置页！');
        this.$router.push('/config');
        return;
      }
      
      try {
        const folders = await ipcRenderer.invoke('get-folders', config.sourceFolder, config.exportFolder);
        this.folderList = folders.map(folder => {
          const relativePath = path.relative(config.sourceFolder, folder.absolutePath).replace(/\\/g, '/');

          const formattedName = relativePath
            .split('/')
            .map(part => part.replace(/\（.+$/, ''))
            .join('/');

          return {
            absolutePath: folder.absolutePath,
            name: formattedName,
            hasExport: folder.hasExport || false,
            hasConfig: folder.hasConfig || false
          };
        });

        const currentIndex = store.getCurrentIndex();
        if (currentIndex >= 0 && currentIndex < this.folderList.length) {
          const selectedFolder = this.folderList[currentIndex];
          if(selectedFolder){
            await this.selectData(selectedFolder);
          }
        }else{
          this.currentFolder = {};
        }

      } catch (error) {
        console.error('获取配置失败:', error);
      }

      try{
        const info = await ipcRenderer.invoke("get-login-info");
        this.login = Boolean(info.userName);
        
      }catch (error) {
        console.error('获取登录信息失败:', error);
      }
    },
    updateHideExported(){
      const store = useGlobalStore();
      store.setHideExported(this.hideExported);
    },
    async selectFile(key) {
      try {
        const config = await ipcRenderer.invoke('get-config');
        const defaultPath = this.currentFolder.absolutePath || null;

        const result = ipcRenderer.sendSync('select-file', {
          defaultPath,
          filters: [
            { name: 'Excel Files', extensions: ['xlsx'] }
          ],
        });

        if (result && !result.canceled && result.filePaths.length > 0) {
          const filePath = result.filePaths[0];
          this.currentFolder[key] = path.relative(config.sourceFolder, filePath).replace(/\\/g, '/');
          await this.readExcelSheets(filePath);
        }
      } catch (error) {
        console.error('选择文件失败:', error);
        alert('无法打开文件选择对话框');
      }
    },
    async readExcelSheets(filePath) {
      try {
        const fileData = fs.readFileSync(filePath);
        const workbook = XLSX.read(fileData, { type: 'buffer' });
        this.currentFolder.sheetNames = workbook.SheetNames;
      } catch (error) {
        console.error('读取Excel文件失败:', error);
        alert('无法读取Excel文件');
      }
    },
    async openDataXlsx(){
      const { dataXlsxDir } = this.currentFolder;
      if ((dataXlsxDir || '') !== '') {
        const config = await ipcRenderer.invoke('get-config');
        const dataXlsxAb = path.join(config.sourceFolder, dataXlsxDir);

        shell.openPath(dataXlsxAb).then(() => {
            }).catch((err) => {
            console.error('Error opening file:', err);
            });
      }
    },
    openFolderInExplorer(folderPath) {
      const { ipcRenderer } = window.require('electron');
      try {
        ipcRenderer.invoke('open-folder', folderPath);
      } catch (error) {
        console.error('Failed to open folder:', error);
      }
    },
    async openOutputExplorer() {
      const { hasExport, outputDir } = this.currentFolder;
      if (hasExport) {
        const config = await ipcRenderer.invoke('get-config');
        const outputDirAb = path.join(config.exportFolder, outputDir);

        this.openFolderInExplorer(outputDirAb);
      }
    },
    async selectData(item) {
      const store = useGlobalStore();
      const currentIndex = store.getCurrentIndex();
      const selectedIndex = this.folderList.findIndex(folder => folder.absolutePath === item.absolutePath); // 找到选中项的索引
      if (currentIndex !== selectedIndex) {
        store.setCurrentIndex(selectedIndex);
      }

      const configPath = path.join(item.absolutePath, 'info.json');
      if (fs.existsSync(configPath)) {
        const config = this.parseConfigFile(configPath);
        this.currentFolder = {
          ...item,
          ...config
        };
        if(config.dataXlsxDir){
          const gconfig = await ipcRenderer.invoke('get-config');
          await this.readExcelSheets(path.join(gconfig.sourceFolder, config.dataXlsxDir));
        }
      } else {
        const defaultOutputDir = this.generateDefaultOutputDir(item.absolutePath, item.name);
        const defaultAccuno = this.generateDefaultAccuno(item.name);
        this.currentFolder = {
          ...item,
          dataXlsxDir: '',
          table: '',
          outputDir: defaultOutputDir,
          tanfangno: defaultAccuno.tanfangno,
          accuno: defaultAccuno.accuno
        };
      }
    },
    parseConfigFile(filePath) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
      } catch (error) {
        console.error('解析配置文件失败:', error);
        return {};
      }
    },
    async checkClassification() {
      const config = await ipcRenderer.invoke('get-config');
      const dataXlsxDir = path.join(config.sourceFolder, this.currentFolder.dataXlsxDir);
      const tableName = this.currentFolder.table;

      this.$router.push({
        path: '/checker',
        query: {
          dataXlsxDir: dataXlsxDir,
          table: tableName
        }
      });
    },
    generateDefaultAccuno(name){
      const parts = name.split('/');
      const tanfangno = parts[0];
      const accuno = parts[1] ? parts[1].replace(tanfangno, '') : '';
    
      return { tanfangno, accuno };
    },
    generateDefaultOutputDir(absolutePath, name) {
      const pathParts = absolutePath.split(path.sep).filter(part => part !== '');
      const lastLevel = pathParts[pathParts.length - 1];
      const secondLastLevel = pathParts[pathParts.length - 2];
      const regex = /（(.*?)）/;
      const lastLevelMatch = lastLevel.match(regex);
      if (lastLevelMatch) {
        return `${name}（${lastLevelMatch[1]}整理）`;
      } else {
        const secondLastLevelMatch = secondLastLevel.match(regex);
        if (secondLastLevelMatch) {
          return `${name}（${secondLastLevelMatch[1]}整理）`
        }
      }

      return `${name}（整理）`;
    },
    generateDefaultOutputDirByJPGFilesTime(){
      const folderPath = this.currentFolder.absolutePath;
      const times = this.getJPGFilesTime(folderPath);
      if (times) {
        const start = times.startTime.toISOString().split('T')[0].replace(/-/g, '');
        const end = times.endTime.toISOString().split('T')[0].replace(/-/g, '');
        this.currentFolder.outputDir = `${this.currentFolder.name}（${start}-${end}整理）`;
      }else{
        this.currentFolder.outputDir = `${this.currentFolder.name}（整理）`;
      }
    },
    getJPGFilesTime(folderPath) {
      let startTime = null;
      let endTime = null;
      const files = fs.readdirSync(folderPath);

      files.forEach(file => {
        const filePath = path.join(folderPath, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          const times = this.getJPGFilesTime(filePath);
          if(times){
            if (!startTime || times.startTime < startTime) startTime = times.startTime;
            if (!endTime || times.endTime > endTime) endTime = times.endTime;
          }
        } else {
          if (file.toLowerCase().endsWith('.jpg')) {
            const fileTime = stat.mtime;
            if (!startTime || fileTime < startTime) startTime = fileTime;
            if (!endTime || fileTime > endTime) endTime = fileTime;
          }
        }
      });

      if (startTime && endTime) {
        return {
          startTime, endTime
        };
      }
      return null;
    },
    saveConfig() {
      const { dataXlsxDir, table, outputDir, tanfangno, accuno } = this.currentFolder;
      const configPath = path.join(this.currentFolder.absolutePath, 'info.json');
      const config = {
        tanfangno,
        accuno,
        dataXlsxDir: dataXlsxDir.replace(/\\/g, '/'),
        table,
        outputDir: outputDir.replace(/\\/g, '/'),
      };

      try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
        this.refreshFolders();
        alert('配置已保存！');
      } catch (error) {
        console.error('保存配置失败:', error);
        alert('保存配置失败，请检查日志！');
      }
    },
    async runScript(script) {
      const { absolutePath, dataXlsxDir, table, outputDir, tanfangno, accuno } = this.currentFolder;
      const config = await ipcRenderer.invoke('get-config');
      const args = [
        `"${absolutePath}"`,
        `"${path.join(config.sourceFolder, dataXlsxDir)}"`,
        `"${table}"`,
        `"${path.join(config.exportFolder, outputDir)}"`,
        `"${tanfangno}"`,
        `"${accuno}"`
      ];
      try {
        await ipcRenderer.invoke('run-script', { script, args });
      } catch (error) {
        console.error(`运行脚本失败: ${script}`, error);
      }
    },
    async goToCardPage() {
      try {
        const config = await ipcRenderer.invoke('get-config');
        const dataXlsxDir = path.join(config.sourceFolder, this.currentFolder.dataXlsxDir);
        const tableName = this.currentFolder.table;

        this.$router.push({
          path: '/cardList',
          query: {
            tanfangno: this.currentFolder.tanfangno,
            accuno: this.currentFolder.accuno,
            dataXlsxDir: encodeURIComponent(dataXlsxDir),
            tableName: encodeURIComponent(tableName)
          }
        });
      } catch (error) {
          this.$router.push({
            path: '/cardList',
            query: {
              tanfangno: this.currentFolder.tanfangno,
              accuno: this.currentFolder.accuno
            }
          });
      }
    }
  },
  mounted() {
    this.refreshFolders();

    ipcRenderer.invoke("get-login-info").then((loginInfo) => {
      this.login = Boolean(loginInfo.userName);
    });

    ipcRenderer.on('login-success', (event, loginInfo) => {
      this.login = Boolean(loginInfo.userName);
    });
  },
  beforeUnmount() {
    ipcRenderer.removeAllListeners('login-success');
  }
};
</script>

<style scoped>
.tips {
  color: #ccc;
  display: flex;
  justify-content: center;
  font-size: 10px;
  margin-top: 10px;
}

.folder-list {
  margin: 0;
  margin-bottom: 20px;
  padding: 10px;
  height: calc(100vh - 400px);
  background-color: var(--table-bg);
  overflow-y: auto;
  box-shadow: 4px 4px 0 black;
}

.none {
  color: #ccc;
  display: flex;
  justify-content: center;
  height: calc(100vh - 400px);
  align-items: center;
}

.folder-list::-webkit-scrollbar {
  width: 8px;
}

.folder-icon {
  margin-left: 5px;
  cursor: pointer;
}

.buttons {
  margin-top: 10px;
}

.configed::after{
  content: '已配置';
  color: green;
}

.none-configed::after{
  content: '未配置';
  color: red;
}

.exported::after{
  content: '已导出';
  color: green;
}

.unexported::after{
  content: '未导出';
  color: red;
}

.form-row {
  display: flex;
  width: 100%;
  padding: 5px 0;
}

.form-row label {
  min-width: 100px;
}

.form-row input, .form-row select {
  flex: 1;
  min-width: 0;
}
.form-row button,
.buttons button {
  height: 34px;
  width: calc( (340px - 30px) / 4);
  line-height: 34px;
}

.form-row button {
  height: 24px;
  margin-left: 10px;
  line-height: 24px;
}
</style>