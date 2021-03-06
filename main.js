/**
Liam McLeod, 2018.
*/

//* Modules to control application life and create native browser window
const {
	app,
	BrowserWindow,
	dialog,
	globalShortcut,
	Menu,
	Notification,
	Tray
} = require("electron");

//* Misc Imports
const path = require("path");
const fs = require("fs");
const electronLocalshortcut = require("electron-localshortcut");

//* My Modules
const crypto = require("./modules/crypto");
const steam = require("./modules/steam");
const account = require("./modules/account");
const init = require("./modules/init");

//* Stores
var accountsStore = [];
var userId = "";

//* TODOS
//todo look into below reg to remember based upon the
//todo value of index.remember
//? https://github.com/CatalystCode/windows-registry-node
//reg add "HKCU\Software\Valve\Steam" / v AutoLoginUser / t REG_SZ / d % username % /f
//reg add "HKCU\Software\Valve\Steam" / v RememberPassword / t REG_DWORD / d 1 / f

//todo improve the storage code it's messy and I've forgotten my logic behind it

//? Maybe obfuscate JSON Storage ??
//https://github.com/mongodb-js/objfuscate

//TODO separate crypto functions and base it off of below
//* https://stackoverflow.com/questions/5089841/two-way-encryption-i-need-to-store-passwords-that-can-be-retrieved

//todo move IPC stuff to controller maybe?

//todo settings file

//todo maybe adjust  crypto to use username, encrypt entire JSON output???

/**
 * Import my own log system, just to ensure
 * nothing makes it out of the application
 * in production
 */
const { log, isDebug } = require("./modules/log");

/**
 * Keep a global reference of the window object, if you don't, the window will
 * be closed automatically when the JavaScript object is garbage collected.
 */
let mainWindow;
app.disableHardwareAcceleration();
function createWindow() {
	//* Create the browser window.
	mainWindow = new BrowserWindow({
		width: 480,
		height: 380,
		resizable: isDebug(),
		fullscreenable: false,
		icon: __dirname + "/favicon-32x32.png",
		title: "Steam Switch",
		backgroundColor: "#303030",
		webPreferences: {
			darkTheme: true,
			fullscreenable: false,
			devTools: isDebug(),
			nodeIntegration: true
		}
	});

	//* and load the index.html of the app.
	mainWindow.loadFile("index.html");

	//* Misc Window  things
	mainWindow.setMenu(null);

	//* Open the DevTools.
	//! But must be off when debugging with VS Code
	if (isDebug()) {
		mainWindow.webContents.openDevTools();
	}

	//* Main Window Event Listeners
	mainWindow.on("minimize", e => {
		e.preventDefault();
		//* Create tray icon,
		createTray(e);
		//* Hide Window
		mainWindow.hide();
	});

	//* Emitted when the window is closed.
	mainWindow.on("closed", () => {
		/**
		 * Dereference the window object, usually you would store windows
		 * in an array if your app supports multi windows,  is the time
		 * when you should delete the corresponding element.
		 */
		mainWindow = null;
	});
}

/**
 * Method will be called when Electron has finished
 * initialization and is ready to create browser windows.
 * Some APIs can only be used after  event occurs.
 */
app.on("ready", () => {
	log("Debug: " + isDebug());
	//* Create folder if necessary
	init.checkFirstRun();
	//* Retrieve data
	accountsStore = account.updateStore();
	//* Get Id
	userId = crypto.getId();
	//* Create window
	createWindow();

	//* Global
	if (isDebug()) {
		globalShortcut.register("CommandOrControl+R", () => {
			mainWindow.reload();
		});
	}

	//* Attach local Shortcuts
	//todo look into solving it
	/**
     *!Seem to get this
     *!https: //github.com/parro-it/electron-localshortcut/issues/59
    electronLocalshortcut.register(mainWindow, ['Ctrl+R', 'F5'], () => {
        mainWindow.reload();
    });
     */
});

app.once("ready-to-show", () => {
	// mainWindow.show();
});

//* Quit when all windows are closed.
app.on("window-all-closed", () => {
	/**
	 * On OS X it is common for applications and their menu bar
	 * to stay active until the user quits explicitly with Cmd + Q
	 */
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	/**
	 * On OS X it's common to re-create a window in the app when the
	 * dock icon is clicked and there are no other windows open.
	 */
	if (mainWindow === null) {
		createWindow();
	}
});

/**
 *  In file you can include the rest of your app's specific main process
 *  code. You can also put them in separate files and require them here.
 */

/**
 * @param  e  Object  Event
 *
 * Create tray icon complete with
 * menu items + accounts if exists
 */
function createTray(e) {
	var tray = new Tray(path.join(__dirname, "favicon.ico"));
	//* Default Context Menu
	var menuItems = [
		{
			label: "Show",
			click: function() {
				//* Show Window
				mainWindow.show();
				//* Remove Tray Icon
				tray.destroy();
			}
		},
		{
			label: "Quit",
			click: function() {
				//* Remove Tray Icon
				tray.destroy();
				//* Quit
				app.quit();
			}
		}
	];
	//* Generate additional menu items
	if (accountsStore) {
		accountsStore.forEach(function(item) {
			menuItems.unshift({
				label: "Launch " + item.name,
				click: function() {
					//* Launch Steam Account with ID
					launchSteam(item.id);
				}
			});
		});
	}

	//* Create Menu
	var contextMenu = Menu.buildFromTemplate(menuItems);
	tray.setContextMenu(contextMenu);

	//* Add Listeners
	tray.on("right-click", e => {
		tray.popUpContextMenu(contextMenu);
	});
	tray.on("double-click", e => {
		mainWindow.show();
		tray.destroy();
	});
}

/**
 * Simple Notification from Electron Docs
 */
function createNotification() {
	if (Notification.isSupported()) {
		var notification = new Notification("Launching Steam...", {
			icon: __dirname + "/favicon-32x32.png",
			body: "Steam is launching, this shouldn't take long..."
		});
		notification.show();

		notification.onclick = () => {
			notification.hide();
		};
	}
}

/**
 * Simple Error Dialogue
 */
function createError(title, message) {
	var options = {
		title: title,
		type: "error",
		buttons: ["OK"],
		message: message
	};
	dialog.showMessageBox(mainWindow, options, () => {});
}

/**
 * @param  id  String  ID of account
 *
 * Launches Steam logging into account with ID
 */
function launchSteam(id) {
	if (!id) {
		//! ERROR MSG HERE
		return;
	} else {
		//*Begin with Steam
		steam.steamExists(id, function(id, steamExists) {
			if (steamExists) {
				steam.closeSteam(id, function(id) {
					steam.openSteam(id);
				});
			}
			steam.openSteam(id);
		});
	}
}

//* Steam Events
const steamOpen = require("./modules/steam").openEvent;
const steamClose = require("./modules/steam").closeEvent;
steamOpen.on("steamOpen", e => {
	mainWindow.setOverlayIcon(
		path.join(__dirname, "public/greenoverlay.png"),
		"Steam Switch"
	);
});

steamClose.on("steamClose", e => {
	mainWindow.setOverlayIcon(
		path.join(__dirname, "public/greenoverlay.png"),
		"Steam Switch"
	);
});

//* Event Listeners & Inter-Proc Comms
const { ipcMain } = require("electron");

//* Listener on the mainProcess to recieve renderProcess data
ipcMain.on("request-mainprocess-action", (event, proc) => {
	//* Basic controller for
	if (proc) {
		if (proc.id) {
			//* Launch Steam,
			launchSteam(proc.id);
			//* Create tray icon,
			createTray();
			//* Hide Window,
			mainWindow.hide();
		}
		if (proc.post) {
			//* Generate Id
			do {
				proc.post.id = crypto.generateId(2, "hex");
			} while (account.checkUnique(proc.post.id) !== true);

			//* Generate & Store Key
			proc.post.key = crypto.generateId(20);
			//* Hash Key
			var key = crypto.createKey(proc.post.key);

			//* Encrypt
			proc.post.password = crypto.encryptPass(key, proc.post.password);

			//TODO ERROR CHECK

			account.storeAccount(proc.post);
			accountsStore = account.updateStore();
		}
		if (proc.get) {
			var edit = account.getAccountById(proc.get);
			mainWindow.webContents.send("edit", edit);
		}
		if (proc.put) {
			//* Generate & Store Key
			proc.put.key = crypto.generateId(20);
			//* Hash Key
			var key = crypto.createKey(proc.put.key);
			//* Encrypt
			proc.put.password = crypto.encryptPass(key, proc.put.password);
			//* Store
			account.editAccount(proc.put);
			accountsStore = account.updateStore();
		}
		if (proc.delete) {
			account.deleteAccount(proc.delete);
			accountsStore = account.updateStore();
		}
	}
	// mainWindow.reload();
});

//* DOM ready, Get accounts to display
ipcMain.on("dom-ready", () => {
	var accounts = account.getAccount();
	/**
	 * Flag for rendering engine to know where templates are stored based
	 * as this differs between production and dev due to compiling
	 */
	accounts.unshift(process.env.NODE_ENV);
	mainWindow.webContents.send("ping", accounts);
});

//* Request to refresh
ipcMain.on("refresh", () => {
	mainWindow.reload();
});

//* Error feedback
ipcMain.on("show-error", (e, error) => {
	createError(error.title, error.message);
});

//* main process, for example app/main.js

//! When complete use electron-winstaller to build installer
//? https://github.com/electron/windows-installer
// var electronInstaller = require('electron-winstaller');
// resultPromise = electronInstaller.createWindowsInstaller({
//     appDirectory: './dist/SteamSwitch-win32-x64',
//     outputDirectory: './dist/installer64',
//     authors: 'Liam McLeod',
//     exe: 'SteamSwitch.exe',
//     setupMsi: 'SteamSwitch_installer.msi',
//     setupExe: 'SteamSwitch_installer.exe'
// });

// resultPromise.then(() => console.log("Success!"), (e) => console.log(`Failed: ${e.message}`));
