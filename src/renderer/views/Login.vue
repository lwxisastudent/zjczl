<template>
    <div class="subpage">
        <Header title="登录" @close="goHome" />

        <div class="content">
            <form @submit.prevent="handleLogin">
                <div class="form-row">
                    <label for="userId">用户名</label>
                    <input
                    id="userId"
                    v-model="userId"
                    type="text"
                    placeholder="请输入用户名"
                    required
                    />
                </div>
                <div class="form-row">
                    <label for="password">密码</label>
                    <input
                    id="password"
                    v-model="password"
                    type="password"
                    placeholder="请输入密码"
                    required
                    />
                </div>
                <div class="form-row">
                  <button style="margin-left: auto;" type="submit" :disabled="isLoading">
                      {{ isLoading ? "登录中..." : "登录" }}
                  </button>
                </div>
                <div v-if="projects.length > 0" class="form-row">
                  <select style="margin-left: auto;" v-model="selectedProjectId" @change="handleProjectChange">
                      <option
                      v-for="project in projects"
                      :key="project.projectId"
                      :value="project.projectId"
                      >
                      {{ project.name }}
                      </option>
                  </select>
                </div>
            </form>

            <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        </div>
    </div>
</template>

<script>
import Header from '../components/Header.vue';
const { ipcRenderer } = window.require('electron');

export default {
  components: {
    Header,
  },
  data() {
    return {
      userId: "",
      password: "",
      isLoading: false,
      projects: [],
      selectedProjectId: "",
      errorMessage: "",
    };
  },
  methods: {
        async goHome() {
            this.$router.push('/');
        },
    async handleLogin() {
      this.isLoading = true;
      this.errorMessage = "";

      try {
        const response = await ipcRenderer.invoke("login", {
          userId: this.userId,
          password: this.password,
        });

        if (response.success) {
          const { loginInfo } = response;
          const projects = await ipcRenderer.invoke("get-projects");
          this.projects = projects;
          this.selectedProjectId = loginInfo.projectId;

          // 登陆成功
        } else {
          this.errorMessage = response.message;
        }
      } catch (error) {
        this.errorMessage = "登录失败，请检查网络或账号信息";
        console.error(error);
      } finally {
        this.isLoading = false;
      }
    },
    async handleProjectChange() {
      try {
        const response = await ipcRenderer.invoke(
          "select-project",
          this.selectedProjectId
        );

        if (!response.success) {
          alert('项目切换成功');
        } else {
          this.errorMessage = response.message;
        }
      } catch (error) {
        this.errorMessage = "切换项目失败，请重试";
        console.error(error);
      }
    },
  },
};
</script>

<style scoped>

.form-row {
  display: flex;
  width: 100%;
  padding: 5px 0;
  margin-bottom: 10px;
}

.form-row label {
  min-width: 100px;
}

.form-row input {
  flex: 1;
  min-width: 0;
}

select {
  height: 20px;
}

.error-message {
  color: red;
  margin-top: 1em;
}
</style>
