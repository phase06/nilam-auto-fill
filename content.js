/**
 * NILAM Auto-Filler Extension - Content Script
 * Handles automatic form filling on the AINS website
 * This script is injected into the AINS webpage to perform form filling
 */

// Listen for messages from the popup script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  if (message.action === 'fillForm' && message.profile) {
    try {
      fillFormFields(message.profile);
      sendResponse({ success: true, message: 'Form filled successfully' });
    } catch (error) {
      console.error('Error filling form:', error);
      sendResponse({ success: false, message: 'Error filling form: ' + error.message });
    }
  }
  
  return true; // Keep the message channel open for asynchronous response
});

/**
 * Main function to fill form fields with profile data
 * Uses robust selectors that may need adjustment based on actual AINS website structure
 * @param {Object} profile - The book profile data to fill into the form
 */
function fillFormFields(profile) {
  console.log('Attempting to fill form with profile:', profile);
  
  // Counter for successful field fills
  let filledCount = 0;
  
  // Book Title Field
  // Try multiple possible selectors for the title field
  const titleSelectors = [
    'input[placeholder*="TAJUK BUKU"]',
    'input[placeholder*="Book Title"]',
    'input[name*="title"]',
    'input[id*="title"]',
    '#book-title',
    '[name="book_title"]'
  ];
  
  if (profile.title) {
    filledCount += fillField(titleSelectors, profile.title, 'Book Title');
  }
  
  // Author Field
  // Try multiple possible selectors for the author field
  const authorSelectors = [
    'input[placeholder*="NAMA PENULIS"]',
    'input[placeholder*="Author"]',
    'input[name*="author"]',
    'input[id*="author"]',
    '#author',
    '[name="book_author"]'
  ];
  
  if (profile.author) {
    filledCount += fillField(authorSelectors, profile.author, 'Author');
  }
  
  // Publisher Field
  // Try multiple possible selectors for the publisher field
  const publisherSelectors = [
    'input[placeholder*="PENERBIT"]',
    'input[placeholder*="Publisher"]',
    'input[name*="publisher"]',
    'input[id*="publisher"]',
    '#publisher',
    '[name="book_publisher"]'
  ];
  
  if (profile.publisher) {
    filledCount += fillField(publisherSelectors, profile.publisher, 'Publisher');
  }
  
  // Year Field
  // Try multiple possible selectors for the year field
  const yearSelectors = [
    'input[placeholder*="TAHUN"]',
    'input[placeholder*="Year"]',
    'input[name*="year"]',
    'input[id*="year"]',
    '#year',
    '[name="publication_year"]',
    'input[type="number"]'
  ];
  
  if (profile.year) {
    filledCount += fillField(yearSelectors, profile.year, 'Year Published');
  }
  
  // Summary/Synopsis Field
  // Try multiple possible selectors for the summary field
  const summarySelectors = [
    'textarea[placeholder*="SINOPSIS"]',
    'textarea[placeholder*="RUMUSAN"]',
    'textarea[placeholder*="Summary"]',
    'textarea[placeholder*="Synopsis"]',
    'textarea[name*="summary"]',
    'textarea[name*="synopsis"]',
    'textarea[id*="summary"]',
    'textarea[id*="synopsis"]',
    '#summary',
    '[name="book_summary"]',
    'textarea'
  ];
  
  if (profile.summary) {
    filledCount += fillField(summarySelectors, profile.summary, 'Summary');
  }
  
  // Log results
  console.log(`Successfully filled ${filledCount} fields out of ${Object.keys(profile).length} available data points`);
  
  // Show a visual confirmation on the page
  showFillConfirmation(filledCount);
  
  if (filledCount === 0) {
    throw new Error('No matching form fields found. The website structure may have changed.');
  }
}

/**
 * Attempts to fill a field using multiple selector strategies
 * @param {Array} selectors - Array of CSS selectors to try
 * @param {string} value - Value to fill into the field
 * @param {string} fieldName - Human-readable field name for logging
 * @returns {number} - 1 if field was filled successfully, 0 otherwise
 */
function fillField(selectors, value, fieldName) {
  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector);
      
      if (element) {
        // Clear existing value and set new value
        element.value = '';
        element.value = value;
        
        // Trigger input events to ensure the website recognizes the change
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));
        
        console.log(`✓ Successfully filled ${fieldName} field using selector: ${selector}`);
        
        // Add visual feedback
        highlightField(element);
        
        return 1;
      }
    } catch (error) {
      console.warn(`Error with selector "${selector}" for ${fieldName}:`, error);
    }
  }
  
  console.warn(`✗ Could not find ${fieldName} field with any of the provided selectors:`, selectors);
  return 0;
}

/**
 * Provides visual feedback by briefly highlighting filled fields
 * @param {HTMLElement} element - The form field that was filled
 */
function highlightField(element) {
  const originalStyle = element.style.cssText;
  
  element.style.cssText += `
    border: 2px solid #4CAF50 !important;
    background-color: #E8F5E8 !important;
    transition: all 0.3s ease !important;
  `;
  
  setTimeout(() => {
    element.style.cssText = originalStyle;
  }, 2000);
}

/**
 * Shows a confirmation message on the page
 * @param {number} filledCount - Number of fields that were successfully filled
 */
function showFillConfirmation(filledCount) {
  // Remove any existing confirmation
  const existing = document.getElementById('nilam-autofill-confirmation');
  if (existing) {
    existing.remove();
  }
  
  // Create confirmation element
  const confirmation = document.createElement('div');
  confirmation.id = 'nilam-autofill-confirmation';
  confirmation.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      font-weight: bold;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      animation: slideIn 0.3s ease;
    ">
      ✓ NILAM Auto-Filler: ${filledCount} field${filledCount !== 1 ? 's' : ''} filled successfully!
    </div>
    <style>
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    </style>
  `;
  
  document.body.appendChild(confirmation);
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    if (confirmation.parentNode) {
      confirmation.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        confirmation.remove();
      }, 300);
    }
  }, 4000);
  
  // Add slideOut animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

// Log that the content script has loaded
console.log('NILAM Auto-Filler content script loaded and ready');

/*
IMPORTANT NOTES FOR USERS:
1. The selectors used in this script are based on common AINS form patterns
2. If the AINS website structure changes, you may need to update the selectors in the arrays above
3. To find the correct selectors:
   - Right-click on a form field on the AINS website
   - Select "Inspect Element"
   - Look for attributes like 'placeholder', 'name', 'id', or 'class'
   - Update the corresponding selector arrays in this script
4. The script tries multiple selectors for each field to increase compatibility
5. Check the browser console for detailed logs about which fields were found/filled
*/
