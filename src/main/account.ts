const axios = require('axios');

interface Project {
    projectId: string;
    name: string;
    proUserType: number;
}

let loginInfo = {
  projectId: '',
  token: '',
  userId: '',
  userName: '',
  projectName: '',
  proUserType: 0,
};

let projects: Project[] = [];

async function login(userId, password) {
  try {
    const response = await axios.post(
      'http://www.kggis.com/kgUser/open/system/login.htm',
      new URLSearchParams({
        userId,
        password,
        projectType: 'kgfj',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const data = response.data;
    if (data && data.data && data.data.project.length > 0) {
      projects = data.data.project;
      const firstProject = data.data.project[0];
      loginInfo = {
        token: data.data.token,
        userId: data.data.userId,
        userName: data.data.name,
        projectId: firstProject.projectId,
        projectName: firstProject.name,
        proUserType: firstProject.proUserType,
      };
      return { success: true, loginInfo };
    } else {
      return { success: false, message: '登录失败或项目列表为空' };
    }
  } catch (error) {
    console.error('登录失败:', error);
    return { success: false, message: '发送登录请求失败，请检查网络' };
  }
}

function getLoginInfo() {
  return loginInfo;
}

function getProjects() {
  return projects;
}

function selectProject(projectId) {
  const selectedProject = projects.find((project) => project.projectId === projectId);
  if (selectedProject) {
    loginInfo.projectId = selectedProject.projectId;
    loginInfo.projectName = selectedProject.name;
    loginInfo.proUserType = selectedProject.proUserType;
    return { success: true, loginInfo };
  } else {
    return { success: false, message: '未找到对应的项目' };
  }
}

module.exports = {
    login,
    getLoginInfo,
    getProjects,
    selectProject,
};
