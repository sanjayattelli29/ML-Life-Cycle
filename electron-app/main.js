import { app, BrowserWindow } from 'electron';
import path from 'path';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      contextIsolation: true
    }
  });

  // Load your hosted Next.js app
  win.loadURL('https://ml-life-cycle.netlify.app/');
  // OR for local: win.loadFile('path-to-your-nextjs/build/index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
