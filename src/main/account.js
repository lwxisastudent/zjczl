const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { app } = require('electron');
const accountPath = path.join(app.getPath('userData'), 'account.json');

let loginInfo = {
    projectId: '',
    token: '',
    userId: '',
    userName: '',
    projectName: '',
    proUserType: 0,
};
let projects = [];

function saveLoginInfo(userId, password) {
    try {
        fs.writeFileSync(accountPath, JSON.stringify({
            userId,
            password
        }));
    } catch (error) {
        console.error('保存登录信息失败:', error);
    }
}
async function loadLoginInfo() {
    try {
        if (fs.existsSync(accountPath)) {
            const data = JSON.parse(fs.readFileSync(accountPath, 'utf-8'));
            await login(data.userId, data.password, true);
            return true;
        }
    } catch (error) {
        console.error('读取登录信息失败:', error);
    }
    return false;
}

function clearLoginInfo() {
    try {
        if (fs.existsSync(accountPath)) {
            fs.unlinkSync(accountPath);
        }
    } catch (error) {
        console.error('清空登录信息失败:', error);
    }
}

async function login(userId, password, autoLogin = false) {
    try {
        const response = await axios.post(
            'http://www.kggis.com/kgUser/open/system/login.htm',
            new URLSearchParams({
                userId,
                password,
                projectType: 'kgfj',
            }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
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

            if (autoLogin) {
                saveLoginInfo(userId, password);
            } else {
                clearLoginInfo();
            }
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
    loadLoginInfo
};