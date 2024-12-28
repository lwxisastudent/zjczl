const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const electronPrompt = require('electron-prompt');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const account = require('./account');

let mainWindow;
const windows = new Map();

app.whenReady().then(async () => {
  mainWindow = new BrowserWindow({
    width: 570,
    height: 800,
    minHeight: 500,
    minWidth: 570,
    maxWidth: 570,
    frame: false,
    icon: path.join(__dirname,'../../resources/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      additionalArguments: ['windowId=main'],
    },
  });

  if (process.env.NODE_ENV === 'development') {
    const rendererPort = process.argv[2];
    mainWindow.loadURL(`http://localhost:${rendererPort}`);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
  else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'renderer', 'index.html'));
  }

  mainWindow.webContents.once('did-finish-load', async () => {
    await account.loadLoginInfo();
    mainWindow.webContents.send('login-success', account.getLoginInfo());
  });
  windows.set('main', mainWindow);
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

ipcMain.handle('show-prompt', async () => {
  try {
    const result = await electronPrompt({
      title: '添加备注',
      label: '请输入图片备注',
      type: 'input',
      inputAttrs: {
        type: 'text'
      }
    });
    return result;
  } catch (error) {
    console.error('Error showing prompt:', error);
    return null;
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
  mainWindow.webContents.send('login-success', r.loginInfo);
  return r;
});
ipcMain.handle('logout', async (_) => {
  const r = await account.logout();
  mainWindow.webContents.send('login-success', r.loginInfo);
  return r;
});
ipcMain.handle('get-login-info', () => account.getLoginInfo());
ipcMain.handle('get-projects', () => account.getProjects());
ipcMain.handle('select-project', (_, projectId) => {
  return account.selectProject(projectId);
});


ipcMain.handle('open-card-window', async (event, query) => {
  try {
    const subWindowId = uuidv4();
    const cardWindow = new BrowserWindow({
      width: 720,
      height: 600,
      maxWidth: 720,
      frame: false,
      icon: path.join(__dirname,'../../resources/icon.png'),
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        additionalArguments: [`windowId=${subWindowId}`]
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
    
  if (process.env.NODE_ENV === 'development') {
    cardWindow.webContents.openDevTools({ mode: 'detach' });
  }

  windows.set(subWindowId, cardWindow);
  cardWindow.on('closed', () => {
    windows.delete(subWindowId);
  });

    return { success: true };
  } catch (error) {
    console.error('打开新窗口失败:', error);
    return { success: false };
  }
});

// 菜单功能
ipcMain.on('window-minimize', (event, windowId) => {
  const targetWindow = windows.get(windowId);
  if (targetWindow) {
    targetWindow.minimize();
  }
});

ipcMain.on('window-close', (event, windowId) => {
  const targetWindow = windows.get(windowId);
  if (targetWindow) {
    targetWindow.close();
  }
});

ipcMain.handle('get-always-on-top', (event, windowId) => {
  const targetWindow = windows.get(windowId);
  if (targetWindow) {
    const isAlwaysOnTop = targetWindow.isAlwaysOnTop();
    return isAlwaysOnTop;
  }
});

ipcMain.on('toggle-always-on-top', (event, windowId) => {
  const targetWindow = windows.get(windowId);
  if (targetWindow) {
    const isAlwaysOnTop = targetWindow.isAlwaysOnTop();
    targetWindow.setAlwaysOnTop(!isAlwaysOnTop);
  }
});

ipcMain.on('refresh', (event, windowId) => {
  const targetWindow = windows.get(windowId);
  if (targetWindow) {
    targetWindow.reload();
  }
});

ipcMain.on('menu-action', (event, action) => {
  switch (action) {
    case 'login':
      mainWindow.webContents.send('navigate', 'login');
      break;
    case 'config':
      mainWindow.webContents.send('navigate', 'config');
      break;
    default:
      console.error(`Unknown menu action: ${action}`);
  }
});