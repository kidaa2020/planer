const { app, BrowserWindow, dialog, Notification } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Intervalo en ms para revisar tareas
const CHECK_INTERVAL = 60 * 1000; // 1 minuto

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Revisar tareas periódicamente y mostrar notificaciones
  win.webContents.once('dom-ready', () => {
    win.webContents.executeJavaScript(`
      setInterval(() => {
        const stateRaw = localStorage.getItem("planificador:state");
        const state = stateRaw ? JSON.parse(stateRaw) : { events: [] };
        const now = new Date();

        state.events.forEach(ev => {
          if (!ev.notified && new Date(ev.date) <= now) {
            new Notification({
              title: "Tarea pendiente",
              body: ev.title + " vence hoy"
            }).show();
            ev.notified = true;
          }
        });

        localStorage.setItem("planificador:state", JSON.stringify(state));
      }, ${CHECK_INTERVAL});
    `);
  });

  win.loadFile('index.html');
}

// Eventos del auto-updater
autoUpdater.on('update-available', () => {
  dialog.showMessageBox({ message: 'Nueva versión disponible. Descargando...' });
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    buttons: ['Reiniciar ahora', 'Después'],
    title: 'Actualización lista',
    message: 'Se descargó una nueva versión. ¿Reiniciar ahora?'
  }).then(result => {
    if (result.response === 0) autoUpdater.quitAndInstall();
  });
});

app.whenReady().then(() => {
  createWindow();

  // Buscar actualizaciones
  autoUpdater.checkForUpdatesAndNotify();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
