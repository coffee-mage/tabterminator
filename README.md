# TabTerminator Firefox Extension

Browser tab management extension for Firefox - merge windows, close specific domains, and sort by domain groups.

## Features

### Clean Mode
- **Close configured domains**: Automatically close tabs from domains you specify
- **Close extra copies of singular domains**: Automatically close extra copies of tabs at the same domain.
- **Merge all windows**: Combine all browser windows into a single window
- **Remove duplicates**: Remove duplicate tabs (identical URL)
- **Sort tabs**: Sort tabs by domain groups, then by domain, then by title

### Purge Mode
- All features from Clean Mode
- **Close purge domains**: Close additional domains specified for purge mode
- **Close domain groups**: Close entire groups of related domains (news, social media, etc.)

## Installation

### Temporary Installation (for testing)

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the left sidebar
3. Click "Load Temporary Add-on"
4. Navigate to the `extension` directory and select the `manifest.json` file
5. The extension will be loaded temporarily (until you restart Firefox)

### Permanent Installation (unsigned)

For personal use, you can load the extension permanently:

1. Open Firefox and navigate to `about:config`
2. Search for `xpinstall.signatures.required`
3. Set it to `false` (this allows unsigned extensions)
4. Navigate to `about:addons`
5. Click the gear icon and select "Install Add-on From File"
6. Select the extension directory or create a .xpi file

### Creating a .xpi file

```bash
cd extension
zip -r ../tabterminator.xpi *
```

Then install the .xpi file through `about:addons`.

## Configuration

Click the "Configure Domains" button in the extension popup to open the options page.

### Domain Groups

Define groups of related domains for sorting and purging:

```json
{
  "news": ["cnn.com", "bbc.com", "foxnews.com"],
  "social": ["twitter.com", "facebook.com", "reddit.com"],
  "shopping": ["amazon.com", "ebay.com"]
}
```

Tabs will be sorted by: **group → domain → title**. Domains not in any group will be sorted last under "Other".

### Domains to Close (Clean Mode)

Add domains (one per line) that should be closed every time you run TabTerminator in normal mode:

```
ads.example.com
tracker.example.com
```

### Singular Domains to Close (Clean Mode)

Add domains (one per line) that should be closed every time TabTerminator encounters more than one tab from the same domain (e.g. several tabs all talking to your AI chatbot):

```
ads.example.com
tracker.example.com
```


### Purge Domains

Additional domains to close when running in purge mode:

```
reddit.com
twitter.com
```

### Purge Domain Groups

Domain group names (from your domain groups configuration) to close when running in purge mode:

```
news
social
shopping
```

## Usage

1. Click the TabTerminator icon in your browser toolbar
2. Choose a mode:
   - **Clean Mode**: Close configured domains, merge windows, remove duplicates, and sort tabs
   - **Purge Mode**: Same as normal mode, plus close all purge domains and purge domain groups

The extension will show a status message with the results:
- Number of tabs closed
- Number of tabs merged
- Number of duplicates removed
- Number of tabs sorted

## Technical Details

### Files

- `manifest.json` - Extension manifest
- `background.js` - Background script that handles messages
- `tabManager.js` - Core tab management logic
- `config.js` - Configuration management
- `popup.html` / `popup.js` - Extension popup UI
- `options.html` / `options.js` - Configuration UI
- `icons/` - Extension icons

### Permissions

- `tabs` - Required to query, move, and close tabs
- `storage` - Required to store configuration

### Browser Compatibility

This extension is designed for Firefox (manifest v2). For Chrome/Edge compatibility, the manifest would need to be updated to v3 and some APIs would need adjustment.

## Development

To modify the extension:

1. Edit the source files in the `extension` directory
2. Reload the extension in `about:debugging` to see changes
3. Check the Browser Console for any errors or logs

### Debugging

- Background script logs: Browser Console (Ctrl+Shift+J)
- Popup script logs: Right-click the popup → Inspect Element
- Options page logs: Right-click the options page → Inspect Element

## License

MIT - See [LICENSE](../LICENSE) file in the parent directory.
