// Popup script for TabTerminator extension

const runNormalBtn = document.getElementById("runNormal");
const runPurgeBtn = document.getElementById("runPurge");
const openOptionsBtn = document.getElementById("openOptions");
const statusDiv = document.getElementById("status");

// Show status message
function showStatus(message, type = "info", details = null) {
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = "block";

  let html = message;
  if (details) {
    html += `<div class="status-details">${details}</div>`;
  }

  statusDiv.innerHTML = html;

  if (type === "success") {
    setTimeout(() => {
      statusDiv.style.display = "none";
    }, 5000);
  }
}

// Disable buttons during operation
function setButtonsEnabled(enabled) {
  runNormalBtn.disabled = !enabled;
  runPurgeBtn.disabled = !enabled;
}

// Run normal mode
runNormalBtn.addEventListener("click", async () => {
  try {
    setButtonsEnabled(false);
    runNormalBtn.innerHTML = '<span class="spinner"></span>Running...';
    showStatus("Running TabTerminator in normal mode...", "info");

    const response = await browser.runtime.sendMessage({ action: "runNormal" });

    if (response.success) {
      const details = buildResultsDetails(response.results);
      showStatus("✓ Clean complete!", "success", details);
    } else {
      showStatus("Error: " + response.error, "error");
    }

    // Close popup after 2 seconds to show results
    setTimeout(() => {
      window.close();
    }, 2000);
  } catch (error) {
    console.error("Error running normal mode:", error);
    showStatus("Error: " + error.message, "error");
    setButtonsEnabled(true);
    runNormalBtn.textContent = "Clean";
  }
});

// Run purge mode
runPurgeBtn.addEventListener("click", async () => {
  try {
    setButtonsEnabled(false);
    runPurgeBtn.innerHTML = '<span class="spinner"></span>Purging...';
    showStatus("Running TabTerminator in PURGE mode...", "info");

    const response = await browser.runtime.sendMessage({ action: "runPurge" });

    if (response.success) {
      const details = buildResultsDetails(response.results);
      showStatus("✓ Purge complete!", "success", details);
    } else {
      showStatus("Error: " + response.error, "error");
    }

    // Close popup after 2 seconds to show results
    setTimeout(() => {
      window.close();
    }, 2000);
  } catch (error) {
    console.error("Error running purge mode:", error);
    showStatus("Error: " + error.message, "error");
    setButtonsEnabled(true);
    runPurgeBtn.textContent = "Purge";
  }
});

// Build results details string
function buildResultsDetails(results) {
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

  return details.length > 0 ? details.join(', ') : 'No changes made';
}

// Open options page
openOptionsBtn.addEventListener("click", () => {
  browser.runtime.openOptionsPage();
  window.close();
});
