const { Menu } = require('electron');
const account = require('./account');

module.exports = (mainWindow) => {
    const isDevelopment = process.env.NODE_ENV === 'development';

    const menuTemplate = [{
            label: account.getLoginInfo().userName ? `用户: ${account.getLoginInfo().userName}` : '登录',
            click: () => mainWindow.webContents.send('navigate', 'login')
        },
        {
            label: '设置',
            click: () => mainWindow.webContents.send('navigate', 'config'),
            accelerator: 'CmdOrCtrl+I'
        },
        {
            label: '刷新',
            click: () => mainWindow.webContents.reload(),
            accelerator: 'CmdOrCtrl+R'
        },
        {
            label: '保持顶部',
            type: 'checkbox',
            checked: mainWindow.isAlwaysOnTop(),
            click: () => {
                const isAlwaysOnTop = mainWindow.isAlwaysOnTop();
                mainWindow.setAlwaysOnTop(!isAlwaysOnTop);
            }
        }
    ];

    if (isDevelopment) {
        menuTemplate.push({
            label: '开发者模式',
            click: () => mainWindow.webContents.openDevTools()
        });
    }

    return Menu.buildFromTemplate(menuTemplate);
};