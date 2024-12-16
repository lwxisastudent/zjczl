const { Menu } = require('electron');

module.exports = (mainWindow) => {
    const isDevelopment = process.env.NODE_ENV === 'development';

    const menuTemplate = [{
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