// Arcanum desktop app. Opens the studio in its own window. Projects, pictures and sounds are saved on
// this computer (in the app's own storage), never uploaded.
const { app, BrowserWindow, protocol, net, shell, session, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// The app had four earlier names (Armatice, Armatus, Talebox, then LunaPen Studio) before Arcanum. If this computer has projects saved under
// one of them and none under the new name, keep using that folder, so nothing seems to go missing after the update.
try {
  const base = app.getPath('appData'),
    now = path.join(base, 'Arcanum'),
    old = ['Luna' + 'Pen Studio', 'Armat' + 'ice VN Studio', 'Armat' + 'us VN Studio', 'Tale' + 'box VN Studio'].map((n) => path.join(base, n)).find((p) => fs.existsSync(p));
  if (old && !fs.existsSync(now)) app.setPath('userData', old);
} catch (e) {}

// A fixed address (app://studio/) so saved projects stay put wherever the app is installed.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } }
]);

if (!app.requestSingleInstanceLock()) { app.quit(); }

const APP_DIR = path.join(__dirname, 'app');
const stateFile = () => path.join(app.getPath('userData'), 'window.json');
function readState() { try { return JSON.parse(fs.readFileSync(stateFile(), 'utf8')); } catch (e) { return {}; } }
function writeState(win) {
  try { const s = { bounds: win.getNormalBounds(), maximized: win.isMaximized(), fullscreen: win.isFullScreen() }; fs.writeFileSync(stateFile(), JSON.stringify(s)); } catch (e) {}
}

let win = null;
function createWindow() {
  const s = readState();
  win = new BrowserWindow({
    width: (s.bounds && s.bounds.width) || 1600, height: (s.bounds && s.bounds.height) || 960,
    x: s.bounds && s.bounds.x, y: s.bounds && s.bounds.y,
    minWidth: 900, minHeight: 600, backgroundColor: '#121016', title: 'Arcanum', show: false,
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: process.platform !== 'darwin',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: true }
  });
  if (s.maximized) win.maximize();
  if (s.fullscreen) win.setFullScreen(true);
  win.once('ready-to-show', () => win.show());
  win.loadURL('app://studio/index.html');
  ['resize', 'move', 'close'].forEach(ev => win.on(ev, () => writeState(win)));
  // Links to websites and email open in your usual browser or mail app, not inside the studio.
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^(https?|mailto):/i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://')) { e.preventDefault(); if (/^(https?|mailto):/i.test(url)) shell.openExternal(url); } });
  // Nothing waits to be saved when the window closes: ask the studio to write what is pending, then close.
  let flushed = false;
  win.on('close', (e) => {
    if (flushed || !win) return;
    e.preventDefault();
    flushed = true;
    const done = () => { if (win) win.close(); };
    const t = setTimeout(done, 1500);
    win.webContents.executeJavaScript('window.VN && VN.flushAll ? VN.flushAll() : 0', true)
      .catch(() => {}).then(() => { clearTimeout(t); done(); });
  });
  win.on('closed', () => { win = null; });
}

// The native menu presses the studio's own File menu items, so both always do the same thing.
function press(sel) {
  if (!win) return;
  win.webContents.executeJavaScript('(()=>{const b=document.querySelector(' + JSON.stringify(sel) + '); if(b) b.click();})()', true).catch(() => {});
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

app.whenReady().then(() => {
  protocol.handle('app', req => {
    const { pathname } = new URL(req.url);
    let rel = decodeURIComponent(pathname); if (rel === '/' || rel === '') rel = '/index.html';
    const file = path.normalize(path.join(APP_DIR, rel));
    if (!file.startsWith(APP_DIR)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  // The microphone (recording dialogue), full screen and the clipboard are allowed; nothing else is.
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(['media', 'fullscreen', 'clipboard-read', 'clipboard-sanitized-write'].includes(perm)));
  // Saving a file (project files, videos, players) asks where to put it.
  session.defaultSession.on('will-download', (e, item) => {
    item.setSaveDialogOptions({ title: 'Save', defaultPath: path.join(app.getPath('documents'), item.getFilename()) });
  });
  const isMac = process.platform === 'darwin';
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(isMac ? [{ role: 'appMenu' }] : []),
    { label: 'File', submenu: [
      { label: 'New Project…', accelerator: 'CmdOrCtrl+N', click: () => press('#fileMenu [data-fm="new"]') },
      { label: 'Open Project File…', accelerator: 'CmdOrCtrl+O', click: () => press('#fileMenu [data-fm="load"]') },
      { label: 'Manage Projects…', click: () => press('#fileMenu [data-fm="manage"]') },
      { type: 'separator' },
      { label: 'Save Project File…', accelerator: 'CmdOrCtrl+Shift+S', click: () => press('#fileMenu [data-fm="save"]') },
      { label: 'Versions && Snapshots…', click: () => press('#fileMenu [data-fm="versions"]') },
      { type: 'separator' },
      { label: 'Export', submenu: [
        { label: 'Web Player…', click: () => press('#fileMenu [data-fm="web"]') },
        { label: 'Standalone Player…', click: () => press('#fileMenu [data-fm="standalone"]') },
        { label: 'Script…', click: () => press('#fileMenu [data-fm="script"]') },
        { label: 'Video…', click: () => press('#fileMenu [data-fm="video"]') },
      ] },
      { type: 'separator' },
      { label: 'Preferences…', accelerator: 'CmdOrCtrl+,', click: () => press('#fileMenu [data-fx="prefs"]') },
      { type: 'separator' },
      isMac ? { role: 'close' } : { role: 'quit' },
    ] },
    { role: 'editMenu' },
    { label: 'View', submenu: [{ role: 'reload' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }, { type: 'separator' }, { role: 'toggleDevTools' }] },
    { role: 'windowMenu' },
    { role: 'help', submenu: [
      { label: 'User Guide', click: () => press('#helpMenu [data-rel="guide"]') },
      { label: 'Keyboard Shortcuts', click: () => press('#helpMenu [data-hm="keys"]') },
      { label: "What's New", click: () => press('#helpMenu [data-rel="news"]') },
      { label: 'About Arcanum', click: () => press('#helpMenu [data-rel="about"]') },
      { type: 'separator' },{ label: 'Where are my projects saved?', click: () => dialog.showMessageBox(win, { type: 'info', message: 'Your projects are saved on this computer', detail: 'Arcanum keeps your projects, pictures and sounds in its own folder:\n\n' + app.getPath('userData') + '\n\nTo back up a project or move it to another computer, use File ▸ Save project file inside the studio, and Load project file on the other computer.' }) }] }
  ]));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
