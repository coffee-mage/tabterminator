// Default configuration for TabTerminator
const DEFAULT_CONFIG = {
  domainsToClose: [],
  purgeDomains: [],
  purgeDomainGroups: [],
  domainGroups: [],
  singularDomains: []
};

// Load configuration from storage or return defaults
async function loadConfig() {
  try {
    const result = await browser.storage.local.get("config");
    if (result.config) {
      // Merge with defaults to ensure all keys exist
      return {
        ...DEFAULT_CONFIG,
        ...result.config
      };
    }
    // Save default config on first run
    await browser.storage.local.set({ config: DEFAULT_CONFIG });
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error("Error loading config:", error);
    return DEFAULT_CONFIG;
  }
}

// Save configuration to storage
async function saveConfig(config) {
  try {
    await browser.storage.local.set({ config });
    return true;
  } catch (error) {
    console.error("Error saving config:", error);
    return false;
  }
}
