// Options page script for TabTerminator extension

const domainGroupsContainer = document.getElementById("domainGroupsContainer");
const addGroupBtn = document.getElementById("addGroupBtn");
const saveBtn = document.getElementById("save");
const resetBtn = document.getElementById("reset");
const exportBtn = document.getElementById("exportConfig");
const importBtn = document.getElementById("importConfig");
const importFileInput = document.getElementById("importFileInput");
const statusDiv = document.getElementById("status");

// Close settings elements
const normalModeList = document.getElementById("normalModeList");
const purgeModeList = document.getElementById("purgeModeList");
const purgeGroupsList = document.getElementById("purgeGroupsList");
const singularDomainsList = document.getElementById("singularDomainsList");
const addNormalDomainBtn = document.getElementById("addNormalDomainBtn");
const addPurgeDomainBtn = document.getElementById("addPurgeDomainBtn");
const addSingularDomainBtn = document.getElementById("addSingularDomainBtn");
const normalModeCount = document.getElementById("normalModeCount");
const purgeModeCount = document.getElementById("purgeModeCount");
const purgeGroupsCount = document.getElementById("purgeGroupsCount");
const singularDomainsCount = document.getElementById("singularDomainsCount");

// State
let domainGroups = []; // Array of {name, domains} objects to preserve order
let domainsToClose = [];
let purgeDomains = [];
let purgeDomainGroups = [];
let singularDomains = [];

// Validate domain format
function isValidDomain(domain) {
  if (!domain || typeof domain !== 'string') {
    return false;
  }

  const trimmed = domain.trim();

  // Empty string is invalid
  if (trimmed.length === 0) {
    return false;
  }

  // Basic domain validation
  // Allow: example.com, sub.example.com, localhost, IP addresses
  // Disallow: URLs with protocol, paths, queries, etc.

  // Check for invalid characters (no spaces, no special chars except dots and hyphens)
  if (!/^[a-zA-Z0-9.-]+$/.test(trimmed)) {
    return false;
  }

  // Should not start or end with dot or hyphen
  if (/^[.-]|[.-]$/.test(trimmed)) {
    return false;
  }

  // Should not have consecutive dots
  if (/\.\./.test(trimmed)) {
    return false;
  }

  // Should have at least one character
  if (trimmed.length === 0) {
    return false;
  }

  // Basic format check - should be like example.com or localhost
  const parts = trimmed.split('.');

  // Each part should not be empty and should be valid
  for (const part of parts) {
    if (part.length === 0) {
      return false;
    }
    // Parts can contain letters, numbers, and hyphens (but not start/end with hyphen)
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(part)) {
      return false;
    }
  }

  return true;
}

// Create validation handler for domain inputs
function createDomainValidator(input, item) {
  return () => {
    const value = input.value.trim();
    if (value.length === 0) {
      item.classList.remove("invalid");
      return true;
    }

    const valid = isValidDomain(value);
    if (valid) {
      item.classList.remove("invalid");
    } else {
      item.classList.add("invalid");
    }
    return valid;
  };
}

// Show status message
function showStatus(message, type = "success") {
  statusDiv.className = `status ${type}`;
  statusDiv.textContent = message;
  statusDiv.style.display = "block";

  setTimeout(() => {
    statusDiv.style.display = "none";
  }, 3000);
}

// Tab switching
function initTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const tabName = btn.dataset.tab;

      // Remove active class from all buttons and contents
      tabBtns.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));

      // Add active class to clicked button and corresponding content
      btn.classList.add("active");
      document.getElementById(`${tabName}-tab`).classList.add("active");
    });
  });
}

// Create a domain item element
function createDomainItem(groupIndex, domainIndex, domain) {
  const item = document.createElement("div");
  item.className = "domain-item";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "domain-input";
  input.value = domain;
  input.placeholder = "example.com";

  // Create validator using helper function
  const validateInput = createDomainValidator(input, item);

  // Validate on input (real-time)
  input.addEventListener("input", validateInput);

  // Update domain on change
  input.addEventListener("change", () => {
    const newDomain = input.value.trim();
    if (newDomain) {
      if (isValidDomain(newDomain)) {
        domainGroups[groupIndex].domains[domainIndex] = newDomain;
        item.classList.remove("invalid");
      } else {
        item.classList.add("invalid");
      }
    } else {
      // Remove empty domains
      removeDomain(groupIndex, domainIndex);
    }
  });

  // Initial validation
  validateInput();

  // Add Enter key handler to add another domain
  input.addEventListener("keydown", (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Save current value first
      const newDomain = input.value.trim();
      if (newDomain) {
        domainGroups[groupIndex].domains[domainIndex] = newDomain;
      }
      // Add another domain
      addDomain(groupIndex);
    }
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-domain-btn";
  deleteBtn.textContent = "×";
  deleteBtn.title = "Remove domain";
  deleteBtn.addEventListener("click", () => {
    removeDomain(groupIndex, domainIndex);
  });

  item.appendChild(input);
  item.appendChild(deleteBtn);

  return item;
}

// Move group up in order
function moveGroupUp(groupIndex) {
  if (groupIndex > 0) {
    const temp = domainGroups[groupIndex];
    domainGroups[groupIndex] = domainGroups[groupIndex - 1];
    domainGroups[groupIndex - 1] = temp;
    renderDomainGroups();
  }
}

// Move group down in order
function moveGroupDown(groupIndex) {
  if (groupIndex < domainGroups.length - 1) {
    const temp = domainGroups[groupIndex];
    domainGroups[groupIndex] = domainGroups[groupIndex + 1];
    domainGroups[groupIndex + 1] = temp;
    renderDomainGroups();
  }
}

// Create a group card element
function createGroupCard(groupIndex, group) {
  const card = document.createElement("div");
  card.className = "group-card";
  card.dataset.groupIndex = groupIndex;

  // Use stored color, or assign one if missing (backward compatibility)
  if (!group.color) {
    group.color = getNextAvailableColor();
  }
  card.style.borderLeftColor = group.color;

  // Header with reorder buttons, group name and delete button
  const header = document.createElement("div");
  header.className = "group-header";

  // Reorder buttons container
  const reorderBtns = document.createElement("div");
  reorderBtns.className = "reorder-buttons";

  const upBtn = document.createElement("button");
  upBtn.className = "reorder-btn";
  upBtn.innerHTML = "▲";
  upBtn.title = "Move up";
  upBtn.disabled = groupIndex === 0;
  upBtn.addEventListener("click", () => moveGroupUp(groupIndex));

  const downBtn = document.createElement("button");
  downBtn.className = "reorder-btn";
  downBtn.innerHTML = "▼";
  downBtn.title = "Move down";
  downBtn.disabled = groupIndex === domainGroups.length - 1;
  downBtn.addEventListener("click", () => moveGroupDown(groupIndex));

  reorderBtns.appendChild(upBtn);
  reorderBtns.appendChild(downBtn);

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "group-name";
  nameInput.value = group.name;
  nameInput.placeholder = "Group Name";

  // Update group name on change
  const saveGroupName = () => {
    const oldName = group.name;
    const newName = nameInput.value.trim().toLowerCase();
    const nameExists = domainGroups.some((g, i) => i !== groupIndex && g.name === newName);

    if (newName && !nameExists) {
      // Update in purgeDomainGroups if the old name was there
      const purgeIndex = purgeDomainGroups.indexOf(oldName);
      if (purgeIndex > -1) {
        purgeDomainGroups[purgeIndex] = newName;
      }

      // Rename group
      domainGroups[groupIndex].name = newName;
      renderDomainGroups();
    } else if (!newName || nameExists) {
      // Revert if empty or duplicate
      nameInput.value = group.name;
      if (nameExists) {
        showStatus("Group name already exists", "error");
      }
    }
  };

  nameInput.addEventListener("change", saveGroupName);

  // Handle Enter key to save and blur
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveGroupName();
      nameInput.blur();
    }
  });

  const domainCount = document.createElement("span");
  domainCount.className = "domain-count";
  domainCount.textContent = group.domains.length;

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-group-btn";
  deleteBtn.textContent = "×";
  deleteBtn.title = "Delete group";
  deleteBtn.addEventListener("click", () => {
    if (confirm(`Delete group "${group.name}"?`)) {
      // Remove from purgeDomainGroups if it's there
      const purgeIndex = purgeDomainGroups.indexOf(group.name);
      if (purgeIndex > -1) {
        purgeDomainGroups.splice(purgeIndex, 1);
      }

      domainGroups.splice(groupIndex, 1);
      renderDomainGroups();
    }
  });

  header.appendChild(reorderBtns);
  header.appendChild(nameInput);
  header.appendChild(domainCount);
  header.appendChild(deleteBtn);

  // Domains list
  const domainsList = document.createElement("div");
  domainsList.className = "domains-list";

  group.domains.forEach((domain, domainIndex) => {
    domainsList.appendChild(createDomainItem(groupIndex, domainIndex, domain));
  });

  // Add domain button
  const addDomainBtn = document.createElement("button");
  addDomainBtn.className = "add-domain-btn";
  addDomainBtn.textContent = "+ Add Domain";
  addDomainBtn.addEventListener("click", () => {
    addDomain(groupIndex);
  });

  card.appendChild(header);
  card.appendChild(domainsList);
  card.appendChild(addDomainBtn);

  return card;
}

// Render all domain groups
function renderDomainGroups() {
  domainGroupsContainer.innerHTML = "";

  if (domainGroups.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = "No domain groups yet. Click '+ Add Group' to create one.";
    domainGroupsContainer.appendChild(emptyState);
  } else {
    domainGroups.forEach((group, index) => {
      domainGroupsContainer.appendChild(createGroupCard(index, group));
    });
  }

  // Update the purge groups checkbox list when domain groups change
  renderCloseSettings();
}

// Add a new domain to a group
function addDomain(groupIndex) {
  if (!domainGroups[groupIndex]) {
    return;
  }

  domainGroups[groupIndex].domains.push("");
  renderDomainGroups();

  // Focus the new domain input
  setTimeout(() => {
    const card = document.querySelector(`[data-group-index="${groupIndex}"]`);
    if (card) {
      const inputs = card.querySelectorAll(".domain-input");
      const lastInput = inputs[inputs.length - 1];
      if (lastInput) {
        lastInput.focus();
      }
    }
  }, 0);
}

// Remove a domain from a group
function removeDomain(groupIndex, domainIndex) {
  if (domainGroups[groupIndex]) {
    domainGroups[groupIndex].domains.splice(domainIndex, 1);
    renderDomainGroups();
  }
}

// Color palette for group cards
const GROUP_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Orange
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#0ea5e9', // Light Blue
  '#22c55e', // Light Green
  '#f97316', // Dark Orange
  '#8b5cf6'  // Light Purple
];

// Get next available color (not currently used by any group)
function getNextAvailableColor() {
  const usedColors = new Set(domainGroups.filter(g => g.color).map(g => g.color));

  // Find first unused color
  for (const color of GROUP_COLORS) {
    if (!usedColors.has(color)) {
      return color;
    }
  }

  // If all colors are used, pick a random one
  return GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)];
}

// Add a new group
function addGroup() {
  let counter = 1;
  let newGroupName = "new-group";

  // Find a unique name
  while (domainGroups.some(g => g.name === newGroupName)) {
    newGroupName = `new-group-${counter}`;
    counter++;
  }

  // Assign a color that persists across reordering
  const color = getNextAvailableColor();
  domainGroups.push({ name: newGroupName, domains: [], color: color });
  const newGroupIndex = domainGroups.length - 1;
  renderDomainGroups();

  // Focus and select the new group name input
  setTimeout(() => {
    const card = document.querySelector(`[data-group-index="${newGroupIndex}"]`);

    if (card) {
      const nameInput = card.querySelector(".group-name");

      if (nameInput) {
        // Ensure spacer exists
        let spacer = document.getElementById('scroll-spacer');
        if (!spacer) {
          spacer = document.createElement('div');
          spacer.style.height = '100vh';
          spacer.id = 'scroll-spacer';
          document.body.appendChild(spacer);
        }

        // Wait for layout
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Get card position and scroll to it
            const cardTop = card.getBoundingClientRect().top + window.scrollY;
            const offset = 200; // Simple offset from top
            const targetScroll = Math.max(0, cardTop - offset); // Ensure non-negative

            window.scroll({
              top: targetScroll,
              behavior: 'smooth'
            });

            // Focus after scroll starts
            setTimeout(() => {
              nameInput.focus();
              nameInput.select();

              // Add Enter key handler to jump to domain input
              const enterHandler = (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  // Save the group name first
                  const newName = nameInput.value.trim().toLowerCase();
                  const nameExists = domainGroups.some((g, i) => i !== newGroupIndex && g.name === newName);

                  if (newName && !nameExists) {
                    domainGroups[newGroupIndex].name = newName;
                  }

                  // Add a domain and focus it
                  addDomain(newGroupIndex);
                  nameInput.removeEventListener('keydown', enterHandler);
                }
              };
              nameInput.addEventListener('keydown', enterHandler);
            }, 500);
          });
        });
      }
    }
  }, 100);
}

// Create a close domain item element
function createCloseDomainItem(list, domain, index) {
  const item = document.createElement("div");
  item.className = "close-domain-item";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "close-domain-input";
  input.value = domain;
  input.placeholder = "example.com";

  // Create validator using helper function
  const validateInput = createDomainValidator(input, item);

  // Validate on input (real-time)
  input.addEventListener("input", validateInput);

  // Update domain on change
  input.addEventListener("change", () => {
    const newValue = input.value.trim();
    if (newValue) {
      if (isValidDomain(newValue)) {
        if (list === normalModeList) {
          domainsToClose[index] = newValue;
        } else if (list === purgeModeList) {
          purgeDomains[index] = newValue;
        } else if (list === singularDomainsList) {
          singularDomains[index] = newValue;
        }
        item.classList.remove("invalid");
      } else {
        item.classList.add("invalid");
      }
    } else {
      // Remove empty values
      if (list === normalModeList) {
        removeCloseDomain(normalModeList, index);
      } else if (list === purgeModeList) {
        removeCloseDomain(purgeModeList, index);
      } else if (list === singularDomainsList) {
        removeCloseDomain(singularDomainsList, index);
      }
    }
  });

  // Initial validation
  validateInput();

  // Add Enter key handler to add another domain
  input.addEventListener("keydown", (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Save current value first
      const newValue = input.value.trim();
      if (newValue) {
        if (list === normalModeList) {
          domainsToClose[index] = newValue;
        } else if (list === purgeModeList) {
          purgeDomains[index] = newValue;
        } else if (list === singularDomainsList) {
          singularDomains[index] = newValue;
        }
      }
      // Add another domain
      addCloseDomain(list);
    }
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-close-domain-btn";
  deleteBtn.textContent = "×";
  deleteBtn.title = "Remove";
  deleteBtn.addEventListener("click", () => {
    if (list === normalModeList) {
      removeCloseDomain(normalModeList, index);
    } else if (list === purgeModeList) {
      removeCloseDomain(purgeModeList, index);
    } else if (list === singularDomainsList) {
      removeCloseDomain(singularDomainsList, index);
    }
  });

  item.appendChild(input);
  item.appendChild(deleteBtn);

  return item;
}

// Render close settings lists
function renderCloseSettings() {
  // Normal Mode
  normalModeList.innerHTML = "";
  domainsToClose.forEach((domain, index) => {
    normalModeList.appendChild(createCloseDomainItem(normalModeList, domain, index));
  });
  normalModeCount.textContent = domainsToClose.length;

  // Purge Mode - Domains
  purgeModeList.innerHTML = "";
  purgeDomains.forEach((domain, index) => {
    purgeModeList.appendChild(createCloseDomainItem(purgeModeList, domain, index));
  });
  purgeModeCount.textContent = purgeDomains.length;

  // Purge Mode - Groups (checkboxes)
  purgeGroupsList.innerHTML = "";
  if (domainGroups.length === 0) {
    const emptyMsg = document.createElement("div");
    emptyMsg.className = "empty-groups-message";
    emptyMsg.textContent = "No domain groups defined yet. Create groups in the Domain Groups tab.";
    purgeGroupsList.appendChild(emptyMsg);
    purgeGroupsCount.textContent = 0;
  } else {
    domainGroups.forEach((group) => {
      const item = document.createElement("div");
      item.className = "group-checkbox-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `purge-group-${group.name}`;
      checkbox.checked = purgeDomainGroups.includes(group.name);

      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          if (!purgeDomainGroups.includes(group.name)) {
            purgeDomainGroups.push(group.name);
          }
        } else {
          const index = purgeDomainGroups.indexOf(group.name);
          if (index > -1) {
            purgeDomainGroups.splice(index, 1);
          }
        }
        purgeGroupsCount.textContent = purgeDomainGroups.length;
      });

      const label = document.createElement("label");
      label.htmlFor = `purge-group-${group.name}`;
      label.textContent = group.name;

      item.appendChild(checkbox);
      item.appendChild(label);
      purgeGroupsList.appendChild(item);
    });
    purgeGroupsCount.textContent = purgeDomainGroups.length;
  }

  // Singular Domains
  singularDomainsList.innerHTML = "";
  singularDomains.forEach((domain, index) => {
    singularDomainsList.appendChild(createCloseDomainItem(singularDomainsList, domain, index));
  });
  singularDomainsCount.textContent = singularDomains.length;
}

// Add a new close domain
function addCloseDomain(list) {
  if (list === normalModeList) {
    domainsToClose.push("");
  } else if (list === purgeModeList) {
    purgeDomains.push("");
  } else if (list === singularDomainsList) {
    singularDomains.push("");
  }
  renderCloseSettings();

  // Focus the new input
  setTimeout(() => {
    const inputs = list.querySelectorAll(".close-domain-input");
    const lastInput = inputs[inputs.length - 1];
    if (lastInput) {
      lastInput.focus();
    }
  }, 0);
}

// Remove a close domain
function removeCloseDomain(list, index) {
  if (list === normalModeList) {
    domainsToClose.splice(index, 1);
  } else if (list === purgeModeList) {
    purgeDomains.splice(index, 1);
  } else if (list === singularDomainsList) {
    singularDomains.splice(index, 1);
  }
  renderCloseSettings();
}

// Convert object format to array format (for loading)
function objectToArray(obj) {
  if (Array.isArray(obj)) {
    // Already in array format with order preserved
    return obj;
  }

  // Convert old object format to array (alphabetically sorted for first-time conversion)
  return Object.keys(obj)
    .sort()
    .map(name => ({ name, domains: obj[name] }));
}

// Load configuration and populate form
async function loadConfig() {
  try {
    const response = await browser.runtime.sendMessage({ action: "getConfig" });

    if (response.success) {
      const config = response.config;

      // Domain groups (convert to array format)
      domainGroups = objectToArray(config.domainGroups || {});
      renderDomainGroups();

      // Close settings
      domainsToClose = config.domainsToClose || [];
      purgeDomains = config.purgeDomains || [];
      purgeDomainGroups = config.purgeDomainGroups || [];
      singularDomains = config.singularDomains || [];
      renderCloseSettings();
    } else {
      showStatus("Error loading configuration", "error");
    }
  } catch (error) {
    console.error("Error loading config:", error);
    showStatus("Error loading configuration: " + error.message, "error");
  }
}

// Save configuration
async function saveConfig() {
  try {
    // Clean up domain groups (remove empty domains and empty groups)
    const cleanedGroupsArray = domainGroups
      .map(group => ({
        name: group.name,
        domains: group.domains.filter(d => d.trim().length > 0),
        color: group.color // Preserve color across saves
      }))
      .filter(group => group.domains.length > 0);

    // Clean up close settings (remove empty values)
    const cleanedDomainsToClose = domainsToClose.filter(d => d.trim().length > 0);
    const cleanedPurgeDomains = purgeDomains.filter(d => d.trim().length > 0);
    const cleanedPurgeDomainGroups = purgeDomainGroups.filter(d => d.trim().length > 0);
    const cleanedSingularDomains = singularDomains.filter(d => d.trim().length > 0);

    // Store as array to preserve order
    const config = {
      domainGroups: cleanedGroupsArray,
      domainsToClose: cleanedDomainsToClose,
      purgeDomains: cleanedPurgeDomains,
      purgeDomainGroups: cleanedPurgeDomainGroups,
      singularDomains: cleanedSingularDomains
    };

    const response = await browser.runtime.sendMessage({
      action: "saveConfig",
      config: config
    });

    if (response.success) {
      showStatus("Configuration saved successfully!", "success");
      // Update state with cleaned data
      domainGroups = cleanedGroupsArray;
      domainsToClose = cleanedDomainsToClose;
      purgeDomains = cleanedPurgeDomains;
      purgeDomainGroups = cleanedPurgeDomainGroups;
      singularDomains = cleanedSingularDomains;
      renderDomainGroups();
      renderCloseSettings();
    } else {
      showStatus("Error saving configuration", "error");
    }
  } catch (error) {
    console.error("Error saving config:", error);
    showStatus("Error saving configuration: " + error.message, "error");
  }
}

// Reset to default configuration
async function resetConfig() {
  if (!confirm("Are you sure you want to reset to default configuration? This will erase all your custom settings.")) {
    return;
  }

  const defaultConfig = {
    domainsToClose: [],
    purgeDomains: [],
    purgeDomainGroups: [],
    domainGroups: [],
    singularDomains: []
  };

  try {
    const response = await browser.runtime.sendMessage({
      action: "saveConfig",
      config: defaultConfig
    });

    if (response.success) {
      showStatus("Reset to default configuration!", "success");
      await loadConfig();
    } else {
      showStatus("Error resetting configuration", "error");
    }
  } catch (error) {
    console.error("Error resetting config:", error);
    showStatus("Error resetting configuration: " + error.message, "error");
  }
}

// Export configuration to JSON file
function exportConfig() {
  try {
    const config = {
      domainGroups: domainGroups,
      domainsToClose: domainsToClose,
      purgeDomains: purgeDomains,
      purgeDomainGroups: purgeDomainGroups,
      singularDomains: singularDomains
    };

    const jsonStr = JSON.stringify(config, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `tabterminator-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showStatus("Configuration exported successfully!", "success");
  } catch (error) {
    console.error("Error exporting config:", error);
    showStatus("Error exporting configuration: " + error.message, "error");
  }
}

// Import configuration from JSON file
function importConfig() {
  importFileInput.click();
}

// Handle file selection
importFileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const config = JSON.parse(text);

    // Validate the imported config
    if (!config || typeof config !== 'object') {
      throw new Error("Invalid configuration file format");
    }

    // Validate required fields exist
    if (!Array.isArray(config.domainGroups)) {
      config.domainGroups = [];
    }
    if (!Array.isArray(config.domainsToClose)) {
      config.domainsToClose = [];
    }
    if (!Array.isArray(config.purgeDomains)) {
      config.purgeDomains = [];
    }
    if (!Array.isArray(config.purgeDomainGroups)) {
      config.purgeDomainGroups = [];
    }
    if (!Array.isArray(config.singularDomains)) {
      config.singularDomains = [];
    }

    // Update state
    domainGroups = config.domainGroups;
    domainsToClose = config.domainsToClose;
    purgeDomains = config.purgeDomains;
    purgeDomainGroups = config.purgeDomainGroups;
    singularDomains = config.singularDomains;

    // Re-render
    renderDomainGroups();
    renderCloseSettings();

    // Clear the file input so the same file can be imported again
    importFileInput.value = '';

    // Auto-save after import
    showStatus("Configuration imported successfully! Saving...", "success");
    await saveConfig();
  } catch (error) {
    console.error("Error importing config:", error);
    showStatus("Error importing configuration: " + error.message, "error");
    importFileInput.value = '';
  }
});

// Event listeners
addGroupBtn.addEventListener("click", addGroup);
saveBtn.addEventListener("click", saveConfig);
resetBtn.addEventListener("click", resetConfig);
exportBtn.addEventListener("click", exportConfig);
importBtn.addEventListener("click", importConfig);

// Close settings event listeners
addNormalDomainBtn.addEventListener("click", () => addCloseDomain(normalModeList));
addPurgeDomainBtn.addEventListener("click", () => addCloseDomain(purgeModeList));
addSingularDomainBtn.addEventListener("click", () => addCloseDomain(singularDomainsList));

// Initialize tabs
initTabs();

// Load config on page load
loadConfig();
