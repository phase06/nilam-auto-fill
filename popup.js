/**
 * NILAM Auto-Filler Extension - Popup Script
 * Handles UI logic for the tabbed interface, Google Sheets interaction, and form filling.
 */

// Global state
let sheetsService;
let currentData = [];
let selectedRowNumber = null;

/**
 * Main initialization function runs when the popup DOM is ready.
 */
document.addEventListener('DOMContentLoaded', () => {
    sheetsService = new GoogleSheetsService();
    initializeTabs();
    loadGoogleSheetsConfig();
    setupEventListeners();

    // Activate the default tab
    document.querySelector('.tab-link[data-tab="fill-form-tab"]').click();
});

/**
 * Sets up the tab switching mechanism.
 */
function initializeTabs() {
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetTab = link.getAttribute('data-tab');

            // Deactivate all tabs and content
            tabLinks.forEach(l => l.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Activate the clicked tab and its content
            link.classList.add('active');
            document.getElementById(targetTab).classList.add('active');

            // Refresh data automatically when switching to the "Fill Form" tab
            if (targetTab === 'fill-form-tab') {
                refreshData();
            }
        });
    });
}

/**
 * Attaches all necessary event listeners for the extension's functionality.
 */
function setupEventListeners() {
    // Config Tab
    document.getElementById('auth-btn').addEventListener('click', authenticateGoogleSheets);
    document.getElementById('clear-auth-btn').addEventListener('click', clearAuthentication);
    document.getElementById('sheet-id').addEventListener('blur', saveSheetId);

    // Save Data Tab
    document.getElementById('save-btn').addEventListener('click', saveDataToSheet);

    // Fill Form Tab
    document.getElementById('refresh-btn').addEventListener('click', refreshData);
    document.getElementById('fill-btn').addEventListener('click', fillForm);
    document.getElementById('fill-all-btn').addEventListener('click', fillAllNew);
}

/**
 * Loads the saved Google Sheet ID and checks the current authentication status.
 */
async function loadGoogleSheetsConfig() {
    try {
        const sheetId = await sheetsService.getSheetId();
        if (sheetId) {
            document.getElementById('sheet-id').value = sheetId;
        }

        const isAuth = await sheetsService.isAuthenticated();
        updateAuthStatus(isAuth);

    } catch (error) {
        console.error('Error loading config:', error);
        updateAuthStatus(false, `Error: ${error.message}`);
    }
}

/**
 * Saves the entered Google Sheet ID to storage.
 */
async function saveSheetId() {
    const sheetId = document.getElementById('sheet-id').value.trim();
    if (sheetId) {
        await sheetsService.setSheetId(sheetId);
        console.log('Sheet ID saved.');
        // Attempt to initialize the sheet if authenticated
        if (await sheetsService.isAuthenticated()) {
            try {
                await sheetsService.initializeSheet();
                updateAuthStatus(true, 'Authorized and sheet is ready.');
            } catch (e) {
                updateAuthStatus(true, `Auth OK, but sheet error: ${e.message}`);
            }
        }
    }
}

/**
 * Handles the Google Sheets authentication flow.
 */
async function authenticateGoogleSheets() {
    try {
        updateAuthStatus(false, 'Authenticating...');
        const success = await sheetsService.authenticate();
        if (success) {
            updateAuthStatus(true, 'Authentication successful. Checking sheet...');
            await saveSheetId(); // This will also initialize the sheet
        } else {
            updateAuthStatus(false, 'Authentication failed. Please try again.');
        }
    } catch (error) {
        console.error('Authentication error:', error);
        updateAuthStatus(false, `Authentication error: ${error.message}`);
    }
}

/**
 * Clears the cached authentication token.
 */
async function clearAuthentication() {
    try {
        await sheetsService.clearAuth();
        updateAuthStatus(false, 'Authentication cleared.');
    } catch (error) {
        console.error('Error clearing authentication:', error);
        updateAuthStatus(false, `Error clearing auth: ${error.message}`);
    }
}

/**
 * Updates the UI to reflect the current authentication status.
 * @param {boolean} isAuth - Whether the user is authenticated.
 * @param {string} [message=''] - An optional message to display.
 */
function updateAuthStatus(isAuth, message = '') {
    const authStatus = document.getElementById('auth-status');
    const authBtn = document.getElementById('auth-btn');
    const clearAuthBtn = document.getElementById('clear-auth-btn');

    if (isAuth) {
        authStatus.textContent = message || 'Authorized';
        authStatus.className = 'auth-status authorized';
        authBtn.style.display = 'none';
        clearAuthBtn.style.display = 'block';
    } else {
        authStatus.textContent = message || 'Not Authorized';
        authStatus.className = 'auth-status error';
        authBtn.style.display = 'block';
        clearAuthBtn.style.display = 'none';
    }
}

/**
 * Saves the data from the form to the Google Sheet.
 */
async function saveDataToSheet() {
    try {
        if (!await sheetsService.isAuthenticated()) {
            showStatusMessage('save-status-message', 'Please authorize on the Config tab first.', 'error');
            return;
        }

        const data = {
            title: document.getElementById('book-title').value,
            author: document.getElementById('author').value,
            publisher: document.getElementById('publisher').value,
            year: document.getElementById('year').value,
            summary: document.getElementById('summary').value,
        };

        if (!data.title || !data.author) {
            showStatusMessage('save-status-message', 'Book Title and Author are required.', 'error');
            return;
        }

        showStatusMessage('save-status-message', 'Saving...', 'info');
        await sheetsService.insertRow(data);
        showStatusMessage('save-status-message', 'Data saved successfully!', 'success');
        document.getElementById('profile-form').reset();

    } catch (error) {
        console.error('Error saving data:', error);
        showStatusMessage('save-status-message', `Error: ${error.message}`, 'error');
    }
}

/**
 * Fetches the latest data from the Google Sheet and updates the list.
 */
async function refreshData() {
    try {
        if (!await sheetsService.isAuthenticated() || !await sheetsService.getSheetId()) {
            showStatusMessage('fill-status-message', 'Please configure and authorize on the Config tab.', 'error', 0);
            document.getElementById('data-list').innerHTML = '<div class="data-item" style="text-align:center; cursor: default;color: red; font-weight: bold; font-style: italic;">Configuration needed.</div>';
            return;
        }

        showStatusMessage('fill-status-message', 'Refreshing data...', 'info', 0);
        currentData = await sheetsService.getAllData();
        displayDataList(currentData);

        const message = currentData.length > 0 ?
            `Loaded ${currentData.length} entries.` :
            'No data found in sheet.';
        showStatusMessage('fill-status-message', message, 'success');

    } catch (error) {
        console.error('Error refreshing data:', error);
        showStatusMessage('fill-status-message', `Error loading data: ${error.message}`, 'error', 0);
    }
}

/**
 * Renders the list of book entries in the "Fill Form" tab.
 * @param {Array} data - The array of book data from the sheet.
 */
function displayDataList(data) {
    const dataList = document.getElementById('data-list');
    selectedRowNumber = null;
    document.getElementById('fill-btn').disabled = true;

    if (!data || data.length === 0) {
        dataList.innerHTML = '<div class="data-item" style="text-align:center; cursor: default;">No data available</div>';
        document.getElementById('fill-all-btn').disabled = true;
        return;
    }

    let hasUnfilledItems = false;
    dataList.innerHTML = data.map(item => {
        const isFilled = item.filledStatus && item.filledStatus.startsWith('filled_');
        if (!isFilled) {
            hasUnfilledItems = true;
        }
        const statusClass = isFilled ? 'filled' : '';
        return `
            <div class="data-item ${statusClass}" data-row="${item.rowNumber}">
                <div class="data-item-title">${escapeHtml(item.title)}</div>
                <div class="data-item-author">by ${escapeHtml(item.author)}</div>
            </div>
        `;
    }).join('');

    document.getElementById('fill-all-btn').disabled = !hasUnfilledItems;

    // Add click listeners to each item
    dataList.querySelectorAll('.data-item').forEach(item => {
        item.addEventListener('click', function() {
            if (this.classList.contains('filled')) return; // Don't select filled items

            dataList.querySelectorAll('.data-item').forEach(i => i.classList.remove('selected'));
            this.classList.add('selected');
            selectedRowNumber = parseInt(this.dataset.row, 10);
            document.getElementById('fill-btn').disabled = false;
        });
    });
}

/**
 * Sends the selected book data to the content script to fill the form.
 */
async function fillForm() {
    if (selectedRowNumber === null) {
        showStatusMessage('fill-status-message', 'Please select an item from the list first.', 'error');
        return;
    }

    const selectedData = currentData.find(d => d.rowNumber === selectedRowNumber);
    if (!selectedData) {
        showStatusMessage('fill-status-message', 'Could not find the selected data.', 'error');
        return;
    }

    try {
        // Send data to content script
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.tabs.sendMessage(tab.id, {
            action: 'fillForm',
            data: selectedData
        });

        // Mark as filled in the sheet
        await sheetsService.markRowAsFilled(selectedRowNumber);
        showStatusMessage('fill-status-message', `'${selectedData.title}' filled successfully!`, 'success');

        // Refresh the list to show the updated status
        await refreshData();

    } catch (error) {
        console.error('Error filling form:', error);
        showStatusMessage('fill-status-message', `Error: ${error.message}`, 'error', 0);
    }
}

/**
 * Fills all new (unfilled) items one by one.
 */
async function fillAllNew() {
    const unfilledItems = currentData.filter(item => !(item.filledStatus && item.filledStatus.startsWith('filled_')));

    if (unfilledItems.length === 0) {
        showStatusMessage('fill-status-message', 'No new items to fill.', 'info');
        return;
    }

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        document.getElementById('fill-all-btn').disabled = true;
        document.getElementById('fill-btn').disabled = true;

        for (let i = 0; i < unfilledItems.length; i++) {
            const item = unfilledItems[i];
            showStatusMessage('fill-status-message', `Filling item ${i + 1} of ${unfilledItems.length}: ${item.title}`, 'info', 0);

            // Send data to content script
            await chrome.tabs.sendMessage(tab.id, {
                action: 'fillForm',
                data: item
            });

            // Mark as filled in the sheet
            await sheetsService.markRowAsFilled(item.rowNumber);

            // Wait for 2 seconds before filling the next item
            if (i < unfilledItems.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        showStatusMessage('fill-status-message', 'All new items have been filled!', 'success');
        await refreshData();

    } catch (error) {
        console.error('Error during fill all:', error);
        showStatusMessage('fill-status-message', `An error occurred: ${error.message}`, 'error', 0);
    } finally {
        // Re-enable buttons after completion or error
        document.getElementById('fill-all-btn').disabled = false;
    }
}

/**
 * Displays a status message in a designated element.
 * @param {string} elementId - The ID of the status message element.
 * @param {string} message - The message to display.
 * @param {'info'|'success'|'error'} type - The type of message.
 * @param {number} [duration=4000] - How long to display the message in ms. 0 for permanent.
 */
function showStatusMessage(elementId, message, type, duration = 4000) {
    const statusElement = document.getElementById(elementId);
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status-message ${type}`;

        if (duration > 0) {
            setTimeout(() => {
                if (statusElement.textContent === message) {
                    statusElement.textContent = '';
                    statusElement.className = 'status-message';
                }
            }, duration);
        }
    }
}

/**
 * Escapes HTML special characters to prevent XSS.
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 */
function escapeHtml(str) {
    const p = document.createElement('p');
    p.appendChild(document.createTextNode(str));
    return p.innerHTML;
}
