<template>
  <div class="subpage">
    <Header title="设置" @close="goHome" />

    <div class="content">
      <div class="form-row">
        <label><span class="require">*</span>原照片文件夹</label>
        <input type="text" v-model="sourceFolder" readonly @click="selectFolder('sourceFolder')" />
      </div>
      <div class="form-row">
        <label><span class="require">*</span>导出文件夹</label>
        <input type="text" v-model="exportFolder" readonly @click="selectFolder('exportFolder')" />
      </div>
      <div class="form-row">
        <label><span class="require">*</span>python.exe运行路径 (填python为系统默认)</label>
        <input style="flex: 1;" type="text" v-model="pythonFile" readonly @click="selectFile('pythonFile')" />
        <button class="operate-button" @click="resetPythonFile">恢复默认</button>
        <label class="tips">执行脚本需要openpyxl和pandas模块，请提前安装：<span style="white-space: nowrap;">pip install openpyxl pandas</span></label>
      </div>
      <div class="form-row">
        <label>替换规则 (每行一项，格式：“替换前|替换后”，或“替换前|替换后|筒瓦”)</label>
        <textarea v-model="replacementRulesText" placeholder="例如：瓦尾,凸面斜绳纹+素面|瓦尾,凸面特殊"></textarea>
        <button class="operate-button" @click="resetReplacementRule" style="margin: 0; margin-left: auto;">恢复默认</button>
      </div>
      <button style="margin-top: 20px;" @click="saveConfig">保存</button>
    </div>
  </div>
</template>

<script>
import Header from '../components/Header.vue';

const { ipcRenderer, sendSync } = window.require('electron');
const path = require('path');

export default {
  components: {
    Header,
  },
  data() {
    return {
      sourceFolder: '',
      exportFolder: '',
      pythonFile: '',
      replacementRulesText: ''
    };
  },
  methods: {
    selectFolder(key) {
      try {
        const defaultPath = this[key] || null;

        const selectedFolder = ipcRenderer.sendSync('select-folder', defaultPath);

        if (selectedFolder) {
          this[key] = selectedFolder;
        }
      } catch (error) {
        console.error('选择文件夹失败:', error);
        alert('无法打开文件夹选择对话框');
      }
    },
    async selectFile(key) {
      try {
        const config = await ipcRenderer.invoke('get-config');
        const result = ipcRenderer.sendSync('select-file', {
          defaultPath: null,
          filters: [
            { name: 'python', extensions: ['exe'] }
          ],
        });

        if (result && !result.canceled && result.filePaths.length > 0) {
          const filePath = result.filePaths[0];
          this[key] = filePath;
        }
      } catch (error) {
        console.error('选择文件失败:', error);
        alert('无法打开文件选择对话框');
      }
    },
    resetPythonFile(){
      this.pythonFile = 'python';
    },
    async resetReplacementRule(){
      const defaultConfig = await ipcRenderer.invoke('get-default-config');
      this.replacementRulesText = (defaultConfig.replacementRules)
        .map(rule => rule.join('|'))
        .join('\n');
    },
    async saveConfig() {
      if (!this.sourceFolder || !this.exportFolder || !this.pythonFile) {
        alert('请确保所有文件夹路径都已选择');
        return;
      }
      try {
        const rules = this.replacementRulesText.split('\n').filter(line => line.trim());
        const replacementRules = rules.map(line => {
          const parts = line.split('|');
          if (parts.length !== 2 && parts.length !== 3) {
            throw new Error(`替换规则格式错误: ${line}`);
          }
          return parts;
        });

        await ipcRenderer.invoke('save-config', {
          sourceFolder: this.sourceFolder.replace(/\\/g, '/'),
          exportFolder: this.exportFolder.replace(/\\/g, '/'),
          pythonFile: this.pythonFile,
          replacementRules,
        });
        alert('配置已保存！');
      } catch (error) {
        console.error('保存配置失败:', error);
        alert(error.message);
      }
    },
    async goHome() {
      this.$router.push('/');
    },
  },
  async mounted() {
    try {
      const config = await ipcRenderer.invoke('get-config');
      this.sourceFolder = path.resolve(config.sourceFolder) || '';
      this.exportFolder = path.resolve(config.exportFolder) || '';
      this.pythonFile = config.pythonFile || 'python';
      this.replacementRulesText = (config.replacementRules || [])
        .map(rule => rule.join('|'))
        .join('\n');
    } catch (error) {
      console.error('加载配置失败:', error);
      alert('加载配置失败，请重试');
    }
  },
};
</script>

<style scoped>
:root {
  background-color: #FAFAFA;
}

.form-row {
  display: flex;
  flex-wrap: wrap;
}

.form-row label {
  width: 100%;
}

.form-row button {
  margin-left: 10px;
  height: 24px;
  width: 80px;
  line-height: 24px;
}

.require {
  color: red;
}

input, textarea {
  width: 100%;
  padding: 8px;
  margin: 5px 0;
  margin-bottom: 10px;
}

textarea {
  height: 100px;
  resize: vertical;
}

.tips {
  color: #ccc;
  font-size: 12px;
  margin-bottom: 10px;
}

button {
  padding: 10px 20px;
  margin-top: 10px;
}
</style>
