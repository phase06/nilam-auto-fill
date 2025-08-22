# Google Sheets Integration Setup

This guide will help you set up Google Sheets integration for the NILAM Auto-Filler extension.

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note down your Project ID

## Step 2: Enable Google Sheets API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google Sheets API"
3. Click on it and press "Enable"

## Step 3: Create OAuth2 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen first:
   - Choose "External" user type
   - Fill in required fields (App name, User support email, Developer email)
   - Add your email to test users
   - Save and continue through all steps
4. For Application type, choose "Chrome Extension"
5. Add your extension ID to "Application ID" field
   - You can find the extension ID in Chrome's extension management page
   - It looks like: `abcdefghijklmnopqrstuvwxyzabcdef`
6. Click "Create"
7. Copy the Client ID (it ends with `.apps.googleusercontent.com`)

## Step 4: Configure the Extension

1. Open the `manifest.json` file
2. Replace `YOUR_GOOGLE_CLIENT_ID_HERE` with your actual Client ID:
   ```json
   "oauth2": {
     "client_id": "your-actual-client-id.apps.googleusercontent.com",
     "scopes": [
       "https://www.googleapis.com/auth/spreadsheets"
     ]
   }
   ```

## Step 5: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Copy the Sheet ID from the URL:
   - URL: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit#gid=0`
   - The SHEET_ID_HERE part is what you need
4. Make sure the sheet is accessible (either public or shared with your account)

## Step 6: Configure the Extension

1. Load the extension in Chrome
2. Click the extension icon
3. In the "Google Sheets Configuration" section:
   - Paste your Sheet ID
   - Click "Authorize Google Sheets"
   - Complete the OAuth flow
4. The extension will automatically create headers in your sheet if it's empty

## Sheet Structure

The extension will create the following columns in your Google Sheet:

| Timestamp | Book Title | Author | Publisher | Year Published | Summary | Fill Status |
|-----------|------------|--------|-----------|----------------|---------|-------------|
| 2025-08-20 10:30:15 | Example Book | John Doe | ABC Publishing | 2023 | This is a sample summary... | new |
| 2025-08-20 11:45:22 | Another Book | Jane Smith | XYZ Press | 2024 | Another summary... | filled_2025-08-20 12:00:15 |

- **Fill Status**: Tracks whether an entry has been used for form filling
  - `new`: Entry hasn't been used yet
  - `filled_[timestamp]`: Entry was used for form filling at the specified time

## Troubleshooting

### "Authentication failed" error
- Check that your Client ID is correctly configured in `manifest.json`
- Ensure the extension ID in Google Cloud Console matches your actual extension ID
- Make sure Google Sheets API is enabled

### "Google Sheets API error" 
- Verify the Sheet ID is correct
- Check that the sheet exists and is accessible
- Ensure you have edit permissions on the sheet

### "Sheet not found" error
- Double-check the Sheet ID
- Make sure the sheet hasn't been deleted or moved
- Verify you're using the correct Google account

## Security Notes

- The extension only requests access to Google Sheets, not other Google services
- Your authentication token is stored locally in Chrome's secure storage
- Data is transmitted securely over HTTPS to Google's servers
- You can revoke access anytime in your Google Account settings

## Usage

Once configured, every time you click "Save Data" in the extension:
1. Data is saved locally for form filling
2. A new row is added to your Google Sheet with timestamp
3. You'll see confirmation of both actions

This allows you to maintain a permanent log of all books you've catalogued while still having the form-filling functionality.
