// Tab Manager - Core logic for tabterminator extension

// Special URL prefixes to skip
const SPECIAL_URL_PREFIXES = ["about:", "chrome:", "moz-extension:"];

// Common multi-level TLDs (country code second-level domains)
const MULTI_LEVEL_TLDS = new Set([
  // UK
  "co.uk", "ac.uk", "gov.uk", "org.uk", "me.uk",
  // Australia
  "com.au", "net.au", "org.au", "edu.au", "gov.au",
  // New Zealand
  "co.nz", "net.nz", "org.nz", "govt.nz",
  // Japan
  "co.jp", "ne.jp", "or.jp", "go.jp",
  // India
  "co.in", "net.in", "org.in", "gen.in", "firm.in",
  // Brazil
  "com.br", "net.br", "org.br", "gov.br",
  // Canada
  "co.ca", "gc.ca",
  // South Africa
  "co.za", "org.za", "net.za", "gov.za",
  // Other common ones
  "com.cn", "com.mx", "com.ar", "com.sg", "com.hk",
  "co.kr", "co.th", "co.id"
]);

// Extract base domain from URL (e.g., bserve.io from audio.bserve.io)
// Handles multi-level TLDs like co.uk, com.au, etc.
function getDomainFromUrl(url) {
  try {
    const urlObj = new URL(url);
    let hostname = urlObj.hostname;

    // Remove www. prefix
    if (hostname.startsWith("www.")) {
      hostname = hostname.substring(4);
    }

    const parts = hostname.split(".");

    // Single part (localhost, etc.)
    if (parts.length === 1) {
      return hostname.toLowerCase();
    }

    // Check for multi-level TLD
    // Try 3-part TLD first (very rare, but check anyway)
    if (parts.length >= 4) {
      const potentialTld3 = parts.slice(-3).join(".");
      if (MULTI_LEVEL_TLDS.has(potentialTld3)) {
        // Return domain + 3-part TLD (4 parts total)
        return parts.slice(-4).join(".").toLowerCase();
      }
    }

    // Check for 2-part TLD (e.g., co.uk)
    if (parts.length >= 3) {
      const potentialTld2 = parts.slice(-2).join(".");
      if (MULTI_LEVEL_TLDS.has(potentialTld2)) {
        // Return domain + 2-part TLD (3 parts total)
        return parts.slice(-3).join(".").toLowerCase();
      }
    }

    // Standard TLD - return last 2 parts (domain.tld)
    if (parts.length >= 2) {
      return parts.slice(-2).join(".").toLowerCase();
    }

    return hostname.toLowerCase();
  } catch (error) {
    return url.toLowerCase();
  }
}

// Check if URL matches domain (exact match or subdomain)
function urlMatchesDomain(url, domain) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const domainLower = domain.toLowerCase();
    return hostname === domainLower || hostname.endsWith("." + domainLower);
  } catch (error) {
    return false;
  }
}

// Check if URL should be skipped (special browser URLs)
function shouldSkipUrl(url) {
  return SPECIAL_URL_PREFIXES.some(prefix => url.startsWith(prefix));
}

// Get domain group info for a domain
function getDomainGroup(domain, domainGroups) {
  // Handle both array and object formats
  let groupEntries;
  if (Array.isArray(domainGroups)) {
    // New array format: [{ name: "groupName", domains: [...] }]
    groupEntries = domainGroups.map(g => [g.name, g.domains]);
  } else {
    // Old object format: { groupName: [...] }
    groupEntries = Object.entries(domainGroups);
  }

  for (let i = 0; i < groupEntries.length; i++) {
    const [groupName, domains] = groupEntries[i];
    for (const groupDomain of domains) {
      if (domain === groupDomain || domain.endsWith("." + groupDomain)) {
        return { groupIndex: i, groupName };
      }
    }
  }

  // Not found in any group - return as "Other"
  return { groupIndex: groupEntries.length, groupName: "Other" };
}

// Close tabs by domain
async function closeTabsByDomain(domain) {
  const tabs = await browser.tabs.query({});
  const tabsToClose = tabs.filter(tab => urlMatchesDomain(tab.url, domain));

  if (tabsToClose.length === 0) {
    return 0;
  }

  const tabIds = tabsToClose.map(tab => tab.id);
  await browser.tabs.remove(tabIds);

  console.log(`Closed ${tabsToClose.length} tabs for domain: ${domain}`);
  return tabsToClose.length;
}

// Close tabs by domain group
async function closeTabsByDomainGroup(groupName, domainGroups) {
  // Handle both array and object formats
  let domains;
  if (Array.isArray(domainGroups)) {
    // New array format
    const group = domainGroups.find(g => g.name === groupName);
    if (!group) {
      console.warn(`Domain group '${groupName}' not found`);
      return 0;
    }
    domains = group.domains;
  } else {
    // Old object format
    if (!domainGroups[groupName]) {
      console.warn(`Domain group '${groupName}' not found`);
      return 0;
    }
    domains = domainGroups[groupName];
  }

  if (domains.length === 0) {
    return 0;
  }

  const tabs = await browser.tabs.query({});
  const tabsToClose = [];

  for (const domain of domains) {
    const matchingTabs = tabs.filter(tab => urlMatchesDomain(tab.url, domain));
    tabsToClose.push(...matchingTabs);
  }

  if (tabsToClose.length === 0) {
    return 0;
  }

  const tabIds = tabsToClose.map(tab => tab.id);
  await browser.tabs.remove(tabIds);

  console.log(`Closed ${tabsToClose.length} tabs for domain group: ${groupName}`);
  return tabsToClose.length;
}

// Keep only the most recently accessed tab for a domain
async function keepOnlyMostRecentTab(domain, tabAccessMap) {
  const tabs = await browser.tabs.query({});
  const matchingTabs = tabs.filter(tab => urlMatchesDomain(tab.url, domain));

  if (matchingTabs.length <= 1) {
    // 0 or 1 tab = nothing to close
    return 0;
  }

  // Find the most recently accessed tab
  let mostRecentTab = matchingTabs[0];
  let mostRecentTime = tabAccessMap.get(mostRecentTab.id) || 0;

  for (let i = 1; i < matchingTabs.length; i++) {
    const tab = matchingTabs[i];
    const accessTime = tabAccessMap.get(tab.id) || 0;

    if (accessTime > mostRecentTime) {
      mostRecentTime = accessTime;
      mostRecentTab = tab;
    }
  }

  // Close all tabs except the most recent
  const tabsToClose = matchingTabs
    .filter(tab => tab.id !== mostRecentTab.id)
    .map(tab => tab.id);

  if (tabsToClose.length > 0) {
    await browser.tabs.remove(tabsToClose);
    console.log(`Kept most recent tab for ${domain}, closed ${tabsToClose.length} others`);
  }

  return tabsToClose.length;
}

// Remove duplicate tabs (same URL)
async function removeDuplicateTabs() {
  const tabs = await browser.tabs.query({});
  const urlMap = new Map();
  const duplicates = [];

  for (const tab of tabs) {
    if (shouldSkipUrl(tab.url)) {
      continue;
    }

    if (urlMap.has(tab.url)) {
      // This is a duplicate, mark for closing
      duplicates.push(tab.id);
    } else {
      // First occurrence of this URL
      urlMap.set(tab.url, tab.id);
    }
  }

  if (duplicates.length > 0) {
    await browser.tabs.remove(duplicates);
    console.log(`Removed ${duplicates.length} duplicate tabs`);
  }

  return duplicates.length;
}

// Close empty/new tabs
async function closeEmptyTabs() {
  try {
    const tabs = await browser.tabs.query({});
    const emptyTabs = [];

    for (const tab of tabs) {
      const url = tab.url || "";
      const title = tab.title;

      // Check if tab is empty based on criteria:
      // - about:blank
      // - about:newtab
      // - about:home
      // - Special URLs with no title (undefined, null, or empty)
      const isEmptyUrl = url === "about:blank" || url === "about:newtab" || url === "about:home";
      const hasNoTitle = !title || title.trim() === "";

      // Close if it's an empty URL, or if it's a special URL with no title
      if (isEmptyUrl || (url.startsWith("about:") && hasNoTitle)) {
        emptyTabs.push(tab.id);
      }
    }

    // Don't close all tabs - keep at least one
    if (emptyTabs.length > 0 && emptyTabs.length < tabs.length) {
      await browser.tabs.remove(emptyTabs);
      console.log(`Closed ${emptyTabs.length} empty tabs`);
      return emptyTabs.length;
    }

    // If all tabs are empty, keep at least one
    if (emptyTabs.length === tabs.length && tabs.length > 1) {
      // Keep the first tab, close the rest
      const tabsToClose = emptyTabs.slice(1);
      await browser.tabs.remove(tabsToClose);
      console.log(`Closed ${tabsToClose.length} empty tabs (kept one)`);
      return tabsToClose.length;
    }

    console.log("No empty tabs to close");
    return 0;
  } catch (error) {
    console.error("Error in closeEmptyTabs:", error);
    return 0;
  }
}

// Merge all windows into a single window
async function mergeAllWindows() {
  const windows = await browser.windows.getAll({ populate: true });

  if (windows.length <= 1) {
    console.log("Only one window found, nothing to merge");
    return { merged: 0, targetWindow: null };
  }

  // Use the first window as target
  const targetWindow = windows[0];
  let totalMerged = 0;

  // Move tabs from other windows to the target window
  for (let i = 1; i < windows.length; i++) {
    const window = windows[i];

    for (const tab of window.tabs) {
      // Skip special URLs
      if (!shouldSkipUrl(tab.url)) {
        // Move tab to target window
        await browser.tabs.move(tab.id, {
          windowId: targetWindow.id,
          index: -1  // Append to end
        });
        totalMerged++;
      } else {
        // Close special tabs (can't be moved)
        await browser.tabs.remove(tab.id);
      }
    }
  }

  console.log(`Merged ${totalMerged} tabs into window ${targetWindow.id}`);
  return { merged: totalMerged, targetWindow: targetWindow.id };
}

// Sort tabs by domain groups
async function sortTabsByDomainGroups(domainGroups) {
  const windows = await browser.windows.getAll({ populate: true });
  let totalSorted = 0;

  for (const window of windows) {
    const tabs = window.tabs;

    // Create tab info with sorting keys
    const tabInfos = tabs.map(tab => {
      const domain = getDomainFromUrl(tab.url);
      const { groupIndex, groupName } = getDomainGroup(domain, domainGroups);

      return {
        tab,
        domain,
        groupIndex,
        groupName,
        title: tab.title || "",
        url: tab.url,
        isSpecial: shouldSkipUrl(tab.url)
      };
    });

    // Sort by: group index, domain, title
    tabInfos.sort((a, b) => {
      // Special URLs go first (to preserve their position)
      if (a.isSpecial && !b.isSpecial) return -1;
      if (!a.isSpecial && b.isSpecial) return 1;
      if (a.isSpecial && b.isSpecial) return 0;

      // Compare group index
      if (a.groupIndex !== b.groupIndex) {
        return a.groupIndex - b.groupIndex;
      }

      // Compare domain
      if (a.domain !== b.domain) {
        return a.domain.localeCompare(b.domain);
      }

      // Compare title
      return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
    });

    // Move tabs to their sorted positions
    for (let i = 0; i < tabInfos.length; i++) {
      const tabInfo = tabInfos[i];
      await browser.tabs.move(tabInfo.tab.id, {
        windowId: window.id,
        index: i
      });
      totalSorted++;
    }
  }

  console.log(`Sorted ${totalSorted} tabs by domain groups`);
  return totalSorted;
}

// Main tabterminator function - normal mode
async function runTabTerminatorNormal(config, tabAccessMap = new Map()) {
  console.log("Running TabTerminator in normal mode");

  const results = {
    emptyTabsClosed: 0,
    singularClosed: 0,
    closed: 0,
    merged: 0,
    duplicatesRemoved: 0,
    sorted: 0
  };

  // Step 1: Close empty tabs
  results.emptyTabsClosed = await closeEmptyTabs();

  // Step 2: Process singular domains (keep only most recent)
  if (config.singularDomains && config.singularDomains.length > 0) {
    for (const domain of config.singularDomains) {
      results.singularClosed += await keepOnlyMostRecentTab(domain, tabAccessMap);
    }
  }

  // Step 3: Close configured domains
  if (config.domainsToClose && config.domainsToClose.length > 0) {
    for (const domain of config.domainsToClose) {
      results.closed += await closeTabsByDomain(domain);
    }
  }

  // Step 4: Merge all windows
  const mergeResult = await mergeAllWindows();
  results.merged = mergeResult.merged;

  // Wait a bit for tabs to settle after merge
  await new Promise(resolve => setTimeout(resolve, 500));

  // Step 5: Remove duplicate tabs
  results.duplicatesRemoved = await removeDuplicateTabs();

  // Step 6: Sort tabs by domain groups
  results.sorted = await sortTabsByDomainGroups(config.domainGroups);

  console.log("TabTerminator normal mode complete:", results);
  return results;
}

// Main tabterminator function - purge mode
async function runTabTerminatorPurge(config, tabAccessMap = new Map()) {
  console.log("Running TabTerminator in PURGE mode");

  const results = {
    emptyTabsClosed: 0,
    singularClosed: 0,
    closed: 0,
    merged: 0,
    duplicatesRemoved: 0,
    sorted: 0
  };

  // Step 1: Close empty tabs
  results.emptyTabsClosed = await closeEmptyTabs();

  // Step 2: Process singular domains (keep only most recent)
  if (config.singularDomains && config.singularDomains.length > 0) {
    for (const domain of config.singularDomains) {
      results.singularClosed += await keepOnlyMostRecentTab(domain, tabAccessMap);
    }
  }

  // Step 3: Close domains from all purge sources
  // Close domainsToClose
  if (config.domainsToClose && config.domainsToClose.length > 0) {
    for (const domain of config.domainsToClose) {
      results.closed += await closeTabsByDomain(domain);
    }
  }

  // Close purgeDomains
  if (config.purgeDomains && config.purgeDomains.length > 0) {
    for (const domain of config.purgeDomains) {
      results.closed += await closeTabsByDomain(domain);
    }
  }

  // Close purgeDomainGroups
  if (config.purgeDomainGroups && config.purgeDomainGroups.length > 0) {
    for (const groupName of config.purgeDomainGroups) {
      results.closed += await closeTabsByDomainGroup(groupName, config.domainGroups);
    }
  }

  // Step 4: Merge all windows
  const mergeResult = await mergeAllWindows();
  results.merged = mergeResult.merged;

  // Wait a bit for tabs to settle after merge
  await new Promise(resolve => setTimeout(resolve, 500));

  // Step 5: Remove duplicate tabs
  results.duplicatesRemoved = await removeDuplicateTabs();

  // Step 6: Sort tabs by domain groups
  results.sorted = await sortTabsByDomainGroups(config.domainGroups);

  console.log("TabTerminator purge mode complete:", results);
  return results;
}
