// Background script for TabTerminator extension

// Tab activation tracking system
let tabAccessMap = new Map(); // { tabId: timestamp }
let lastSaveTime = 0;
const SAVE_THROTTLE = 5000; // Save every 5 seconds max

// Load tab access map from storage
async function loadTabAccessMap() {
  try {
    const result = await browser.storage.local.get("tabAccessMap");
    if (result.tabAccessMap) {
      tabAccessMap = new Map(Object.entries(result.tabAccessMap).map(([k, v]) => [parseInt(k), v]));
      console.log("Loaded tab access map:", tabAccessMap.size, "entries");
    }
  } catch (error) {
    console.error("Error loading tab access map:", error);
  }
}

// Throttled save to prevent excessive writes
async function throttledSave() {
  const now = Date.now();
  if (now - lastSaveTime > SAVE_THROTTLE) {
    lastSaveTime = now;
    try {
      const obj = Object.fromEntries(tabAccessMap);
      await browser.storage.local.set({ tabAccessMap: obj });
    } catch (error) {
      console.error("Error saving tab access map:", error);
    }
  }
}

// Track tab activations
browser.tabs.onActivated.addListener(async (activeInfo) => {
  tabAccessMap.set(activeInfo.tabId, Date.now());
  await throttledSave();
});

// Clean up closed tabs from tracking
browser.tabs.onRemoved.addListener((tabId) => {
  tabAccessMap.delete(tabId);
});

// Initialize on startup
browser.runtime.onStartup.addListener(async () => {
  await loadTabAccessMap();
});

// Load tab access map when script loads
loadTabAccessMap();

// Listen for keyboard commands
browser.commands.onCommand.addListener(async (command) => {
  try {
    const config = await loadConfig();
    let results;

    if (command === "run-normal") {
      results = await runTabTerminatorNormal(config, tabAccessMap);
      showNotification("TabTerminator - Clean Complete", results);
    } else if (command === "run-purge") {
      results = await runTabTerminatorPurge(config, tabAccessMap);
      showNotification("TabTerminator - Purge Complete", results);
    }
  } catch (error) {
    console.error("Error executing command:", error);
    browser.notifications.create({
      type: "basic",
      iconUrl: "icons/tt-48.png",
      title: "TabTerminator Error",
      message: `Error: ${error.message}`
    });
  }
});

// Show completion notification
function showNotification(title, results) {
  const details = [];

  if (results.singularClosed > 0) {
    details.push(`${results.singularClosed} singular tab${results.singularClosed !== 1 ? 's' : ''} closed`);
  }
  if (results.closed > 0) {
    details.push(`${results.closed} tab${results.closed !== 1 ? 's' : ''} closed`);
  }
  if (results.merged > 0) {
    details.push(`${results.merged} tab${results.merged !== 1 ? 's' : ''} merged`);
  }
  if (results.duplicatesRemoved > 0) {
    details.push(`${results.duplicatesRemoved} duplicate${results.duplicatesRemoved !== 1 ? 's' : ''} removed`);
  }
  if (results.sorted > 0) {
    details.push(`${results.sorted} tab${results.sorted !== 1 ? 's' : ''} sorted`);
  }

  const message = details.length > 0 ? details.join(', ') : 'No changes made';

  browser.notifications.create({
    type: "basic",
    iconUrl: "icons/tt-48.png",
    title: title,
    message: message
  });
}

// Listen for messages from popup
browser.runtime.onMessage.addListener((message, sender) => {
  // Handle async operations by returning a promise
  if (message.action === "runNormal") {
    return (async () => {
      try {
        const config = await loadConfig();
        const results = await runTabTerminatorNormal(config, tabAccessMap);
        showNotification("TabTerminator - Clean Complete", results);
        return { success: true, results };
      } catch (error) {
        console.error("Error in runNormal:", error);
        browser.notifications.create({
          type: "basic",
          iconUrl: "icons/tt-48.png",
          title: "TabTerminator Error",
          message: `Error in Clean mode: ${error.message}`
        });
        return { success: false, error: error.message };
      }
    })();
  } else if (message.action === "runPurge") {
    return (async () => {
      try {
        const config = await loadConfig();
        const results = await runTabTerminatorPurge(config, tabAccessMap);
        showNotification("TabTerminator - Purge Complete", results);
        return { success: true, results };
      } catch (error) {
        console.error("Error in runPurge:", error);
        browser.notifications.create({
          type: "basic",
          iconUrl: "icons/tt-48.png",
          title: "TabTerminator Error",
          message: `Error in Purge mode: ${error.message}`
        });
        return { success: false, error: error.message };
      }
    })();
  } else if (message.action === "getConfig") {
    return (async () => {
      try {
        const config = await loadConfig();
        return { success: true, config };
      } catch (error) {
        console.error("Error loading config:", error);
        return { success: false, error: error.message };
      }
    })();
  } else if (message.action === "saveConfig") {
    return (async () => {
      try {
        const success = await saveConfig(message.config);
        return { success };
      } catch (error) {
        console.error("Error saving config:", error);
        return { success: false, error: error.message };
      }
    })();
  }
});

console.log("TabTerminator background script loaded");
