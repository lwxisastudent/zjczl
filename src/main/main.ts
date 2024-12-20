const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const config = require('./config');
const menu = require('./menu');
const account = require('./account');

let mainWindow;

app.whenReady().then(async () => {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 800,
    minHeight: 500,
    minWidth: 400,
    maxWidth: process.env.NODE_ENV === 'development' ? 10000 : 400,
    icon: path.join(__dirname,'../../resources/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
  });

  if (process.env.NODE_ENV === 'development') {
    const rendererPort = process.argv[2];
    mainWindow.loadURL(`http://localhost:${rendererPort}`);
  }
  else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'renderer', 'index.html'));
  }
  await account.loadLoginInfo();
  Menu.setApplicationMenu(menu(mainWindow));
});


ipcMain.on('select-folder', (event, defaultPath = null) => {
  try {
    const filePaths = dialog.showOpenDialogSync({
      title: '选择文件夹',
      defaultPath: defaultPath || process.cwd(),
      buttonLabel: '选择',
      properties: ['openDirectory', 'showHiddenFiles'],
      message: '请选择一个文件夹',
    });

    if (filePaths && filePaths.length > 0) {
      event.returnValue = filePaths[0];
    } else {
      event.returnValue = null;
    }
  } catch (error) {
    console.error('Error opening folder dialog:', error);
    event.returnValue = null;
  }
});

ipcMain.on('select-file', (event, { defaultPath = null, filters = [] }) => {
  try {
    const filePaths = dialog.showOpenDialogSync({
      title: '选择文件',
      defaultPath: defaultPath || process.cwd(),
      buttonLabel: '选择',
      properties: ['openFile'],
      filters,
      message: '请选择一个文件',
    });

    if (filePaths && filePaths.length > 0) {
      event.returnValue = { canceled: false, filePaths: filePaths };
    } else {
      event.returnValue = { canceled: true, filePaths: [] };
    }
  } catch (error) {
    console.error('Error opening file dialog:', error);
    event.returnValue = { canceled: true, filePaths: [] };
  }
});

ipcMain.handle('get-config', async () => config.readConfig());
ipcMain.handle('save-config', async (_, data) => config.saveConfig(data));
ipcMain.handle('get-default-config', async () => config.getDefaultConfig());
ipcMain.handle('apply-replacements', async (_, t, str) => config.applyReplacements(t, str));
ipcMain.handle('run-script', async (_, { script, args }) => {
  const pythonScriptPath = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '..', '..', 'src', 'python', script)
    : path.join(__dirname, '..', 'python', script);
  
  const c = config.readConfig();
  let command = `start cmd /c ${c.pythonFile} ${pythonScriptPath}.py ${args.join(' ')}`;
  
  if(script === 'formFiller'){
    const replacementRulesFormatted = c.replacementRules.map(([from, to]) => `${from}|${to}`).join('||');
    command += ` "${replacementRulesFormatted}"`;
  }

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Stderr: ${stderr}`);
    } else {
      console.log(`Output: ${stdout}`);
    }
  });
});

ipcMain.handle('get-folders', async (event, sourceFolder, exportFolder) => {
  try {
    const topFolders = fs
      .readdirSync(sourceFolder, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('T'))
      .map(dirent => path.join(sourceFolder, dirent.name));

    const folders: { absolutePath: string; hasExport: boolean; hasConfig: boolean; }[] = [];
    for (const folder of topFolders) {
      const subDirs = fs
        .readdirSync(folder, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => {
          const absolutePath = path.join(folder, dirent.name);
          const infoPath = path.join(absolutePath, 'info.json');
          const hasConfig = fs.existsSync(infoPath);
          
          let hasExport = false;
          if (hasConfig) {
            const info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
            if (info.outputDir) {
              const outputDirPath = path.join(exportFolder, info.outputDir);
              if (fs.existsSync(outputDirPath)) {
                hasExport = true;
              }
            }
          }
          return {
            absolutePath,
            hasExport,
            hasConfig,
          };
        });
      folders.push(...subDirs);
    }

    return folders;
  } catch (error) {
    console.error('读取文件夹失败:', error);
    throw new Error('读取文件夹失败');
  }
});

ipcMain.handle('open-folder', (event, folderPath) => {
  const folder = path.resolve(folderPath);
  const command = process.platform === 'win32' ? `explorer "${folder}"` : `open "${folder}"`; // For macOS or Windows

  exec(command, (err) => {
    if (err) {
      console.error('Failed to open folder:', err);
    }
  });
});

ipcMain.handle('login', async (_, { userId, password, autoLogin }) => {
  const r = await account.login(userId, password, autoLogin);
  Menu.setApplicationMenu(menu(mainWindow));
  return r;
});
ipcMain.handle('get-login-info', () => account.getLoginInfo());
ipcMain.handle('get-projects', () => account.getProjects());
ipcMain.handle('select-project', (_, projectId) => {
  return account.selectProject(projectId);
});


ipcMain.handle('open-card-window', async (event, query) => {
  try {
    const cardWindow = new BrowserWindow({
      width: 800,
      height: 600,
      icon: path.join(__dirname,'../../resources/icon.png'),
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      },
    });

    const queryString = new URLSearchParams(query).toString();
    if (process.env.NODE_ENV === 'development') {
      const rendererPort = process.argv[2];
      cardWindow.loadURL(`http://localhost:${rendererPort}/#/card?${queryString}`);
    }
    else {
      cardWindow.loadURL(`file://${path.join(app.getAppPath(), 'renderer', 'index.html')}#/card?${queryString}`);
    }
    
    const menuTemplate = [
      {
          label: '刷新',
          click: () => mainWindow.webContents.reload(),
          accelerator: 'CmdOrCtrl+R'
      },
    ];

    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment) {
        menuTemplate.push({
          label: '开发者模式',
          click: () => cardWindow.webContents.openDevTools({ mode: 'detach' }),
          accelerator: ""
        });
    }

    const menu = Menu.buildFromTemplate(menuTemplate);
    cardWindow.setMenu(menu);
    cardWindow.setTitle('器物卡片');

    return { success: true };
  } catch (error) {
    console.error('打开新窗口失败:', error);
    return { success: false };
  }
});