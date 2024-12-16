const { Menu } = require('electron');

module.exports = (mainWindow) => Menu.buildFromTemplate([{
        label: '设置',
        click: () => mainWindow.webContents.send('navigate', 'config'),
        accelerator: 'CmdOrCtrl+I'
    },
    {
        label: '刷新',
        click: () => mainWindow.webContents.reload(),
        accelerator: 'CmdOrCtrl+R'
    }
    /*,
        {
            label: '开发者模式',
            click: () => mainWindow.webContents.openDevTools(),

        }*/
]);