<template>
        <div class="content">
            <div v-if="card" class="card-detail">
                <div class="form-row">
                <label>探方号</label>
                <input disabled v-model="card.tanfangno" />
                <label>单位号</label>
                <input disabled v-model="card.danweino" />
                <label>堆积号</label>
                <input disabled v-model="card.accuno" />
                </div>
                <div class="form-row">
                <label>器物号</label>
                <input disabled v-model="card.utensilsno" />
                <label>器物类型</label>
                <input disabled v-model="card.texture" />
                <label>器物名称</label>
                <input disabled v-model="card.name" />
                </div>
                <div class="form-row">
                <label>记录者</label>
                <input disabled v-model="card.userName" />
                <label>记录时间</label>
                <input disabled v-model="card.ctime" />
                </div>
                <div class="form-row">
                <label>修复者</label>
                <input v-model="card.repairuserName" />
                <label>出土地点</label>
                <input v-model="card.chutuAddress" />
                </div>
              <label class="form-row-title">体量</label>
                <div class="form-row">
                <label>尺寸：口径</label>
                <input v-model="card.caliber" />
                <label>最大腹径</label>
                <input v-model="card.abdominalDiameter" />
                </div>
                <div class="form-row">
                <label>底径</label>
                <input v-model="card.bottomDiameter" />
                <label>通高</label>
                <input v-model="card.high" />
                <label>壁厚</label>
                <input v-model="card.wallThickness" />
                </div>
                <div class="form-row">
                <label>其他部位</label>
                <input v-model="card.otherParts" />
                <button @click="fillOtherParts">一键填写</button>
                </div>
                <div class="form-row">
                <label>重量（克）</label>
                <input v-model="card.weight" />
                <label>容量（毫升）</label>
                <input v-model="card.capacity" />
                </div>
                <label class="form-row-title">制法</label>
                <div class="form-row">
                <label>质料</label>
                <textarea v-model="card.material"></textarea>
                <label>成形</label>
                <textarea v-model="card.forming"></textarea>
                </div>
                <div class="form-row">
                <label>修整</label>
                <textarea v-model="card.dressing"></textarea>
                <label>装饰</label>
                <textarea v-model="card.decoration"></textarea>
                </div>
                <div class="form-row">
                <label>火候</label>
                <textarea v-model="card.heat"></textarea>
                <label>烧成后装饰</label>
                <textarea v-model="card.heatOrDecoration"></textarea>
                </div>
                <label class="form-row-title">使用</label>
                <div class="form-row">
                <label>使用痕迹</label>
                <textarea v-model="card.useTrace"></textarea>
                <div class="form-row-sub">
                <label>修补痕迹</label>
                <input v-model="card.repairTrace" />
                <label>转用痕迹</label>
                <input v-model="card.switchTrace" />
                </div>
                </div>
                <label class="form-row-title">形态</label>
                <div class="form-row">
                <textarea v-model="card.morphology"></textarea>
                <div class="form-row-sub">
                <label>型式描述</label>
                <input v-model="card.typeDescription" />
                <label>装饰</label>
                <input v-model="card.typeDecoration" />
                <label>纹饰</label>
                <input v-model="card.typeOrnamentation" />
                </div>
                </div>
                <label class="form-row-title">其他</label>
                <div class="form-row">
                <label>检测一</label>
                <textarea v-model="card.testingOne"></textarea>
                <label>检测二</label>
                <textarea v-model="card.testingTwo"></textarea>
                </div>
                <div class="form-row">
                <label>备注</label>
                <textarea v-model="card.remark"></textarea>
                </div>
                <div class="form-row">
                <label>标本架号</label>
                <input v-model="card.specimen" />
                <label>存放地点</label>
                <input v-model="card.depositAddress" />
                </div>
        
                <!-- 保存按钮 -->
                <button @click="saveCard" style="width: 100%; margin-top: 20px;">保存</button>
                <div class="image-gallery">
  <div class="form-row" style="margin-bottom: 0;">
                  <button @click="uploadImage" style="margin-left: 0;">＋上传图片</button>
                </div>
    <div v-for="(image, index) in card.images" :key="image.id" class="image-container">
      <img :src="getImageUrl(image.zhaopianSrc)" alt="Image" class="image" @click="openImage(image.zhaopianSrc)" />
      <button
        @click="deleteImage(image.id)"
        class="delete-btn"
      >
        Delete
      </button>
    </div>
  </div>
            </div>
            <div v-else>加载中...</div>
        </div>
  </template>
  
  <script>
  import axios from "axios";
  import '@fortawesome/fontawesome-free/css/all.min.css';
  const { ipcRenderer, shell } = window.require('electron');
  const fs = require('fs');
  
  export default {
    data() {
      return {
        item: null,
        card: null,
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
  
      const item = JSON.parse(this.$route.query.item);
      if (!item || !item.id) {
        this.$router.go(-1);
        return;
      }

      this.item = item;
      this.fetchCard();
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
      async fetchCard() {
        const item = this.item;
        try {
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
            "http://www.kggis.com/kgfj/qwcard/findByInterFinishing.htm",
            postData,
            { headers: { "Content-Type": "application/json" } }
          );
  
          const data = response.data;
          if (data && data.length > 0) {
              this.card = data[0];
              this.card.ctime = this.formatDate(this.card.ctime.time);
          }
          else{
            this.card = {
              id: "",
              xiantuID: "",
              zhaopianID: "",
              isaudit: "",
              ctqwglID: "",
              danweino: item.danweino,
              accuno: item.accuno,
              utensilsno: item.utensilsno,
              texture: item.texture,
              name: item.name,
              buwei: "",
              tanfangno: item.tanfangno,
              userName: item.userName,
              ctime: this.formatDate(Date.now()),
              repairuserName: "",
              chutuAddress: "",
              caliber: "",
              abdominalDiameter: "",
              bottomDiameter: "",
              high: "",
              wallThickness: "",
              otherParts: "",
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
              isauditcontent: ""
            }
          }

          await this.fetchPhotos();

        } catch (error) {
          console.error("获取卡片信息失败:", error);
        }
      },
      async fetchPhotos() {
        const item = this.item;
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
            this.card.images = data;
          }else{
            this.card.images = [];
          }
      },
      fillOtherParts() {
        const otherPart = JSON.parse(this.$route.query.otherPart);
        if (otherPart) {
          this.card.otherParts = otherPart.op;
          this.card.weight = otherPart.weight;
        } else {
          this.card.otherParts = `残片，残宽cm，残高cm，厚度cm`;
          alert("未传入表格信息或表格中不存在当前标本");
        }
      },
      goBack() {
        this.$router.go(-1);
      },
      async saveCard() {
        try {
          const postData = {
            ...this.card,
            ctime: this.formatDate(Date.now()),
            token: this.loginInfo.token,
            userId: this.card.id ? this.card.userId : this.loginInfo.userId,
            userName: this.card.id ? this.card.userName : this.loginInfo.userName,
            projectId: this.loginInfo.projectId,
            projectName: this.loginInfo.projectName,
            proUserType: 0
          };
          delete postData.images;
  
          const response = await axios.post(
            "http://www.kggis.com/kgfj/qwcard/saveOrUpdate.htm",
            postData,
            { headers: { "Content-Type": "application/json" } }
          );
  
          const data = response.data;
          if (data.code === 0) {
            alert("保存成功");
            this.fetchCard();
          } else {
            alert("保存失败，请重试");
          }
        } catch (error) {
          console.error("保存失败:", error);
          alert("保存失败，请重试");
        }
      },
      formatDate(timestamp) {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份从0开始，所以加1
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      },  async uploadImage() {
    try {
      const result = ipcRenderer.sendSync('select-file', {
        defaultPath: '',
        filters: [{ name: 'Image Files', extensions: ['jpg'] }],
      });

      if (!result || result.canceled) {
        console.log('No file selected');
        return;
      }

      const filePath = result.filePaths[0];
      const stats = fs.statSync(filePath);
      const modifiedTime = new Date(stats.mtime);

      const fileName = filePath.replace(/\\/g, '/').split('/').pop();
      const fileData = fs.readFileSync(filePath);
      const formData = new FormData();
      formData.append('addFile', new Blob([fileData], { type: 'image/jpeg' }), fileName);
      formData.append('key', `${this.loginInfo.userId}-${this.loginInfo.projectId}-qwtupian--false`)

      const uploadResponse = await axios.post(
        'http://47.92.38.139/kgFileServer/UploadServlet',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      const uploadResult = uploadResponse.data;
      if (!uploadResult || uploadResult.length === 0) {
        alert('图片上传失败');
        console.error('Upload failed');
        return;
      }

      const uploadedFilePath = uploadResult[0].path;

      const remark = await ipcRenderer.invoke("show-prompt");
      const postData = {
        danweino: this.card.danweino,
        qwcardId: '',
        accuno: this.card.accuno,
        utensilsno: this.card.utensilsno,
        texture: this.card.texture,
        name: this.card.name,
        ctime: this.formatDate2(modifiedTime),
        tanfangno: this.card.tanfangno,
        zhaopianSrc: uploadedFilePath,
        remark,
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

      if (saveResponse.data && saveResponse.data.code === 0) {
        this.fetchPhotos();
        alert('提交成功');
      } else {
        console.error('提交失败', saveResponse.data);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
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
      getImageUrl(imagePath) {
      return `http://47.92.38.139/kgFileServer/${imagePath}`;
    },    openImage(imagePath) {
      const imageUrl = this.getImageUrl(imagePath);
      shell.openExternal(imageUrl).catch((error) => {
        console.error('Failed to open image in browser:', error);
      });
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
          this.card.images = this.card.images.filter(image => image.id !== imageId);
          alert('删除成功');
        } else {
          console.error('Failed to delete image:', response);
        }
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    },
    },
  };
  </script>
  
  <style scoped>
    .card-detail {
      padding-bottom: 30px;
    }
  .form-row-title {
    font-weight: 1000;
    width: 100%;
  }

  .form-row {
    display: flex;
    align-items: flex-start;
    margin-bottom: 15px;
    width: 100%;
  }

  .form-row label{
    margin: 0 5px;
    white-space: nowrap;
  }

  .form-row input{
    min-width: 0;
    height: 20px;
    flex: 1;
  }
  
  .form-row textarea {
    width: 50%;
    height: 100px;
    padding: 10px;
    font-size: 14px;
    flex: 1;
  white-space: pre-wrap;
  word-wrap: break-word;
  }

  .form-row-sub{
    display: flex;
    flex-direction: column;
    margin-left: 5px;
  }
  
.form-row button {
  margin-left: 10px;
  height: 20px;
  width: 80px;
  line-height: 24px;
}

.image-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
}

.image-container {
  position: relative;
  display: inline-block;
}

.image {
  width: 200px;
  height: 200px;
  object-fit: cover;
  --border-color: var(--bg);
    box-shadow: 0 .2em var(--border-color), 0 -.2em var(--border-color), .2em 0 var(--border-color), -.2em 0 var(--border-color);
}

.delete-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: rgba(255, 0, 0, 0.7);
  color: white;
  border: none;
  padding: 5px 10px;
  cursor: pointer;
  border-radius: 5px;
}

.delete-btn:hover {
  background-color: rgba(255, 0, 0, 1);
}
  </style>
  