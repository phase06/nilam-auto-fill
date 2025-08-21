/**
 * Google Sheets API Integration for NILAM Auto-Filler
 * Handles authentication and data insertion to Google Sheets
 */

class GoogleSheetsService {
  constructor() {
    this.accessToken = null;
    this.sheetId = null;
  }

  /**
   * Authenticate with Google using OAuth2
   */
  async authenticate() {
    try {
      // Clear any existing token first
      if (this.accessToken) {
        try {
          const tokenToRemove = (typeof this.accessToken === 'object' && this.accessToken.token) ? this.accessToken.token : this.accessToken;
          if (tokenToRemove && typeof tokenToRemove === 'string') {
            await chrome.identity.removeCachedAuthToken({ token: tokenToRemove });
          }
        } catch (e) {
          console.log('Could not remove cached token:', e);
        }
      }

      // Get a fresh token
      const authResult = await chrome.identity.getAuthToken({ 
        interactive: true,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      
      if (authResult) {
        const token = (typeof authResult === 'object' && authResult.token) ? authResult.token : authResult;
        if (typeof token !== 'string') {
          console.error('Authentication resulted in a non-string token:', token);
          throw new Error('Authentication failed to return a valid token.');
        }
        this.accessToken = token;
        await chrome.storage.sync.set({ 'googleAuthToken': token });
        console.log('Authentication successful, token received');
        return true;
      }
      
      console.error('No token received from authentication');
      return false;
    } catch (error) {
      console.error('Authentication failed:', error);
      throw new Error('Failed to authenticate with Google: ' + error.message);
    }
  }

  /**
   * Check if user is currently authenticated
   */
  async isAuthenticated() {
    try {
      // First try to get token from memory, then from storage
      if (!this.accessToken) {
        const result = await chrome.storage.sync.get(['googleAuthToken']);
        this.accessToken = result.googleAuthToken;
      }

      if (!this.accessToken || typeof this.accessToken !== 'string') {
        console.log('No valid access token found');
        return false;
      }

      // Verify token is still valid by making a test request to tokeninfo
      console.log('Validating token...');
      const tokenInfoResponse = await fetch(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${this.accessToken}`
      );
      
      if (!tokenInfoResponse.ok) {
        console.log('Token validation failed, attempting to refresh...');
        
        // Try to get a fresh token without interaction
        try {
          const authResult = await chrome.identity.getAuthToken({ 
            interactive: false,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
          });
          
          if (authResult) {
            const newToken = (typeof authResult === 'object' && authResult.token) ? authResult.token : authResult;
            if (typeof newToken === 'string' && newToken !== this.accessToken) {
              console.log('Got refreshed token');
              this.accessToken = newToken;
              await chrome.storage.sync.set({ 'googleAuthToken': newToken });
              return true;
            }
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
        }
        
        // Clear invalid token
        this.accessToken = null;
        await chrome.storage.sync.remove(['googleAuthToken']);
        return false;
      }
      
      const tokenInfo = await tokenInfoResponse.json();
      console.log('Token is valid, expires in:', tokenInfo.expires_in, 'seconds');
      
      // Check if token has the right scope
      if (!tokenInfo.scope || !tokenInfo.scope.includes('spreadsheets')) {
        console.error('Token does not have spreadsheets scope');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  /**
   * Set the Google Sheet ID
   */
  async setSheetId(sheetId) {
    this.sheetId = sheetId;
    await chrome.storage.sync.set({ 'googleSheetId': sheetId });
  }

  /**
   * Get the stored Google Sheet ID
   */
  async getSheetId() {
    if (!this.sheetId) {
      const result = await chrome.storage.sync.get(['googleSheetId']);
      this.sheetId = result.googleSheetId;
    }
    return this.sheetId;
  }

  /**
   * Get all data from the Google Sheet
   */
  async getAllData() {
    try {
      console.log('Getting all data from sheet...');
      
      // Ensure we have a valid token
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        throw new Error('Not authenticated - please authorize first');
      }
      
      if (!this.sheetId) {
        throw new Error('Google Sheet ID not configured');
      }

      console.log('Making API request to get sheet data...');
      
      // Get all data from the sheet
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/Sheet1`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('API response status:', response.status);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error && errorData.error.message) {
            errorMessage = errorData.error.message;
          }
          console.error('API error details:', errorData);
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
          const errorText = await response.text();
          console.error('Raw error response:', errorText);
        }
        throw new Error(`Google Sheets API error: ${errorMessage}`);
      }

      const data = await response.json();
      console.log('Raw sheet data:', data);
      
      if (!data.values || data.values.length <= 1) {
        console.log('No data rows found (only headers or empty sheet)');
        return []; // No data or only headers
      }

      // Convert rows to objects (skip header row)
      const headers = data.values[0];
      const rows = data.values.slice(1);
      
      console.log('Processing', rows.length, 'data rows');
      
      return rows.map((row, index) => ({
        rowNumber: index + 2, // +2 because we skip header and arrays are 0-indexed
        timestamp: row[0] || '',
        title: row[1] || '',
        author: row[2] || '',
        publisher: row[3] || '',
        year: row[4] || '',
        summary: row[5] || '',
        filledStatus: row[6] || 'new' // New column for tracking fill status
      }));

    } catch (error) {
      console.error('Error getting sheet data:', error);
      throw error;
    }
  }

  /**
   * Mark a row as filled in the Google Sheet
   */
  async markRowAsFilled(rowNumber) {
    try {
      // Ensure we have a valid token
      const isAuth = await this.isAuthenticated();
      if (!isAuth || !this.sheetId) {
        throw new Error('Not authenticated or sheet ID not configured');
      }

      const now = new Date();
      const filledTimestamp = now.toLocaleString('en-MY', { 
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      // Update the status column (column G) for the specific row
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/Sheet1!G${rowNumber}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [['filled_' + filledTimestamp]]
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google Sheets API error: ${errorData.error.message}`);
      }

      console.log(`Row ${rowNumber} marked as filled`);
      return true;

    } catch (error) {
      console.error('Error marking row as filled:', error);
      throw error;
    }
  }

  /**
   * Insert a new row into the Google Sheet
   */
  async insertRow(profile) {
    try {
      // Ensure we have a valid token
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        throw new Error('Not authenticated or token expired');
      }

      if (!this.sheetId) {
        throw new Error('Google Sheet ID not configured');
      }

      // Prepare the data row with timestamp
      const now = new Date();
      const timestamp = now.toLocaleString('en-MY', { 
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const values = [
        [
          timestamp,
          profile.title || '',
          profile.author || '',
          profile.publisher || '',
          profile.year || '',
          profile.summary || '',
          'new' // Initial status
        ]
      ];

      // Make the API request to append data
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/Sheet1!A:G:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: values
          })
        }
      );

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error && errorData.error.message) {
            errorMessage = errorData.error.message;
          }
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
        }
        throw new Error(`Google Sheets API error: ${errorMessage}`);
      }

      const result = await response.json();
      console.log('Successfully added row to Google Sheets:', result);
      
      return {
        success: true,
        updatedRows: result.updates.updatedRows,
        updatedRange: result.updates.updatedRange
      };

    } catch (error) {
      console.error('Error inserting row:', error);
      console.error('Sheet ID:', this.sheetId);
      console.error('Access Token exists:', !!this.accessToken);
      console.error('Profile data:', profile);
      throw error;
    }
  }

  /**
   * Test if we can access the sheet (without modifying it)
   */
  async testSheetAccess() {
    try {
      if (!this.accessToken || !this.sheetId) {
        throw new Error('Not authenticated or sheet ID not configured');
      }

      console.log('Testing sheet access...');

      // Try to read basic spreadsheet metadata
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}?fields=properties.title,sheets.properties.title`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error && errorData.error.message) {
            errorMessage = errorData.error.message;
          }
        } catch (parseError) {
          const errorText = await response.text();
          errorMessage += ` - ${errorText}`;
        }
        throw new Error(`Sheet access test failed: ${errorMessage}`);
      }

      const data = await response.json();
      console.log('Sheet access test successful:', data);
      return data;

    } catch (error) {
      console.error('Sheet access test failed:', error);
      throw error;
    }
  }

  /**
   * Ensure Sheet1 exists, create it if it doesn't
   */
  async ensureSheet1Exists() {
    try {
      console.log('Checking if Sheet1 exists...');
      
      // Get spreadsheet metadata to check sheets
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}?fields=sheets.properties`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get spreadsheet info: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const sheets = data.sheets || [];
      
      // Check if Sheet1 exists
      const sheet1Exists = sheets.some(sheet => 
        sheet.properties.title === 'Sheet1' || sheet.properties.sheetId === 0
      );

      if (!sheet1Exists) {
        console.log('Sheet1 does not exist, creating it...');
        
        // Create Sheet1
        const createResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requests: [{
                addSheet: {
                  properties: {
                    title: 'Sheet1',
                    sheetId: 0
                  }
                }
              }]
            })
          }
        );

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          throw new Error(`Failed to create Sheet1: ${createResponse.status} - ${errorText}`);
        }

        console.log('Sheet1 created successfully');
      } else {
        console.log('Sheet1 already exists');
      }

      return true;
    } catch (error) {
      console.error('Error ensuring Sheet1 exists:', error);
      throw error;
    }
  }

  /**
   * Initialize the sheet with headers if it's empty
   */
  async initializeSheet() {
    try {
      console.log('Initializing sheet...');
      
      // Ensure we have a valid token
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        throw new Error('Not authenticated - please authorize first');
      }
      
      if (!this.sheetId) {
        throw new Error('Google Sheet ID not configured');
      }

      // First ensure Sheet1 exists
      await this.ensureSheet1Exists();

      console.log('Checking if sheet has headers...');

      // Check if the sheet has headers
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/Sheet1!A1:G1`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Header check response status:', response.status);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error && errorData.error.message) {
            errorMessage = errorData.error.message;
          }
          console.error('Header check API error:', errorData);
        } catch (parseError) {
          console.error('Could not parse header check error:', parseError);
          const errorText = await response.text();
          console.error('Raw header check error:', errorText);
        }
        throw new Error(`Failed to check sheet headers: ${errorMessage}`);
      }

      const data = await response.json();
      console.log('Header check data:', data);
      
      // If no data in first row, add headers
      if (!data.values || data.values.length === 0 || !data.values[0] || data.values[0].length === 0) {
        console.log('No headers found, adding them...');
        
        const headers = [
          ['Timestamp', 'Book Title', 'Author', 'Publisher', 'Year Published', 'Summary', 'Fill Status']
        ];

        const headerResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/Sheet1!A1:G1?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: headers
            })
          }
        );

        console.log('Header insertion response status:', headerResponse.status);

        if (!headerResponse.ok) {
          let errorMessage = `HTTP ${headerResponse.status}: ${headerResponse.statusText}`;
          try {
            const errorData = await headerResponse.json();
            if (errorData.error && errorData.error.message) {
              errorMessage = errorData.error.message;
            }
            console.error('Header insertion error:', errorData);
          } catch (parseError) {
            const errorText = await headerResponse.text();
            console.error('Raw header insertion error:', errorText);
          }
          throw new Error(`Failed to initialize headers: ${errorMessage}`);
        }

        console.log('Sheet initialized with headers');
      } else {
        console.log('Sheet already has headers:', data.values[0]);
      }

      return true;
    } catch (error) {
      console.error('Error initializing sheet:', error);
      throw error;
    }
  }

  /**
   * Test function to debug Google Sheets connection
   */
  async debugConnection() {
    console.log('=== Google Sheets Debug Info ===');
    console.log('Access Token exists:', !!this.accessToken);
    if (this.accessToken) {
      console.log('Access Token (first 20 chars):', this.accessToken.substring(0, 20) + '...');
    }
    console.log('Sheet ID:', this.sheetId);
    
    try {
      const isAuth = await this.isAuthenticated();
      console.log('Authentication status:', isAuth);
      
      if (!isAuth) {
        console.log('Authentication failed - stopping debug');
        return;
      }
      
      if (this.sheetId) {
        console.log('Testing basic sheet access...');
        
        try {
          const sheetInfo = await this.testSheetAccess();
          console.log('Sheet access successful. Sheet title:', sheetInfo.properties?.title);
        } catch (accessError) {
          console.error('Sheet access test failed:', accessError);
          return; // Don't continue if we can't access the sheet
        }
        
        console.log('Testing sheet data reading...');
        
        // Test reading the sheet with detailed error logging
        const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/Sheet1!A1:B1`;
        console.log('Test URL:', testUrl);
        
        const response = await fetch(testUrl, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Test read response status:', response.status);
        console.log('Test read response headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
          const data = await response.json();
          console.log('Test read successful:', data);
        } else {
          const errorText = await response.text();
          console.error('Test read failed:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
        }
      } else {
        console.log('No Sheet ID configured');
      }
      
    } catch (error) {
      console.error('Debug connection error:', error);
    }
    
    console.log('=== End Debug Info ===');
  }

  /**
   * Revoke authentication token
   */
  async revokeAuth() {
    try {
      if (this.accessToken) {
        await chrome.identity.removeCachedAuthToken({ token: this.accessToken });
        this.accessToken = null;
      }
      
      await chrome.storage.sync.remove(['googleAuthToken']);
      console.log('Authentication cleared');
      return true;
    } catch (error) {
      console.error('Error revoking authentication:', error);
      return false;
    }
  }

  /**
   * Clear all authentication and force re-authentication
   */
  async clearAuth() {
    try {
      // Clear token from Chrome identity
      if (this.accessToken) {
        try {
          await chrome.identity.removeCachedAuthToken({ token: this.accessToken });
        } catch (e) {
          console.log('Could not remove cached token:', e);
        }
      }
      
      // Clear from memory and storage
      this.accessToken = null;
      await chrome.storage.sync.remove(['googleAuthToken']);
      
      console.log('All authentication data cleared');
      return true;
    } catch (error) {
      console.error('Error clearing authentication:', error);
      return false;
    }
  }
}

// Export for use in popup.js
window.GoogleSheetsService = GoogleSheetsService;
