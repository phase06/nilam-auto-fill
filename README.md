# NILAM Form Auto-Filler Chrome Extension

A Chrome extension built with Manifest V3 that allows users to save book information profiles and automatically populate data into the "Advance Integrated NILAM System" (AINS) forms with a single click.

## Features

- **Google Sheets Integration**: Save book data directly to Google Sheets with timestamps
- **Data Management**: View all saved entries and select which one to fill
- **Fill Status Tracking**: Automatically track which entries have been used for form filling
- **Smart Field Detection**: Uses multiple selector strategies to find form fields
- **Visual Feedback**: Highlights filled fields and shows confirmation messages
- **Cloud Storage**: All data is stored in Google Sheets for backup and accessibility

## Installation

1. **Set up Google Sheets Integration** (see `GOOGLE_SHEETS_SETUP.md` for detailed instructions):
   - Create a Google Cloud project
   - Enable Google Sheets API
   - Create OAuth2 credentials
   - Update the Client ID in `manifest.json`

2. Clone or download this project to your local machine
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top right corner
5. Click "Load unpacked" and select the project folder
6. The extension icon should appear in your Chrome toolbar

## Initial Setup

1. **Configure Google Sheets**:
   - Create a Google Sheet and copy its ID
   - Click the extension icon and enter the Sheet ID
   - Click "Authorize Google Sheets" and complete the OAuth flow

2. **Start Using**:
   - Fill in book details and click "Save Data"
   - Data will be saved locally and to your Google Sheet
   - Use "Fill Form" to auto-populate AINS forms

## Usage

### Saving Book Data
1. Click the extension icon to open the popup
2. Configure Google Sheets if not already done (see setup section)
3. Fill in the book details in the form fields
4. Click "Save to Sheet" to store the information in Google Sheets

### Auto-Filling Forms
1. Navigate to the AINS website (ains.moe.gov.my)
2. Click the extension icon to open the popup
3. Click "Refresh Data" to load entries from Google Sheets
4. Select a book entry from the list (entries marked as "✓ Filled" have been used before)
5. Click "Fill Selected" to automatically populate the AINS form
6. The entry will be automatically marked as "filled" with a timestamp

## File Structure

```
nilam/
├── manifest.json          # Extension configuration
├── popup.html            # Extension popup interface
├── popup.css             # Popup styling
├── popup.js              # Popup logic and storage management
├── content.js            # Form filling logic for AINS website
├── images/               # Extension icons
│   ├── icon16.svg
│   ├── icon48.svg
│   └── icon128.svg
└── README.md             # This file
```

## Technical Details

### Permissions Required
- `storage`: For saving book profiles
- `scripting`: For injecting content scripts
- `activeTab`: For accessing the current tab
- `host_permissions`: For AINS website access

### Browser APIs Used
- `chrome.storage.sync`: Profile data persistence
- `chrome.scripting.executeScript()`: Content script injection
- `chrome.tabs.sendMessage()`: Communication between popup and content script
- `chrome.runtime.onMessage`: Message listening in content script

## Troubleshooting

### Form Not Filling
If the form doesn't fill automatically, the AINS website structure may have changed. To fix this:

1. Open the browser console (F12) when on the AINS site
2. Right-click on form fields and select "Inspect Element"
3. Note the field attributes (placeholder, name, id, class)
4. Update the selector arrays in `content.js` with the correct selectors

### Common Form Field Selectors
The extension tries multiple selectors for each field. If needed, update these in `content.js`:

**Title Field:**
- `input[placeholder*="TAJUK BUKU"]`
- `input[name*="title"]`
- `#book-title`

**Author Field:**
- `input[placeholder*="NAMA PENULIS"]`
- `input[name*="author"]`
- `#author`

**Publisher Field:**
- `input[placeholder*="PENERBIT"]`
- `input[name*="publisher"]`
- `#publisher`

**Year Field:**
- `input[placeholder*="TAHUN"]`
- `input[name*="year"]`
- `input[type="number"]`

**Summary Field:**
- `textarea[placeholder*="SINOPSIS"]`
- `textarea[placeholder*="RUMUSAN"]`
- `textarea[name*="summary"]`

## Icon Replacement

The current icons are SVG placeholders. For production use:

1. Create PNG versions of the icons in the required sizes (16x16, 48x48, 128x128)
2. Replace the SVG files in the `images/` folder with PNG files
3. Update the file extensions in `manifest.json` if needed

## Version History

- **v1.1**: Initial release with core functionality
  - Profile saving and loading
  - Automatic form filling
  - Smart field detection
  - Visual feedback system

## License

This project is provided as-is for educational and personal use.

## Contributing

To contribute to this project:
1. Test the extension on the actual AINS website
2. Update selectors if the website structure has changed
3. Report any bugs or suggest improvements
4. Ensure all changes maintain Chrome Extension Manifest V3 compliance

## Support

For support or questions:
1. Check the browser console for error messages
2. Verify you're on the correct AINS domain
3. Ensure the extension has proper permissions
4. Test with simple form data first

---

**Note**: This extension is designed specifically for the AINS system at ains.moe.gov.my. It may require updates if the website structure changes.
