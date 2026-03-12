// options.js

// This function runs immediately securely inside the extension environment.
document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('saveBtn').addEventListener('click', saveOptions);

/**
 * Saves options to chrome.storage
 */
function saveOptions() {
    const botToken = document.getElementById('botToken').value.trim();
    const chatId = document.getElementById('chatId').value.trim();
    const statusEl = document.getElementById('status');

    // Basic validation
    if (!botToken || !chatId) {
        statusEl.textContent = 'Please fill out both fields.';
        statusEl.style.color = '#dc3545'; // red
        return;
    }

    // Chrome Storage API is asynchronous.
    // We are saving an object with keys matching what we want to store.
    chrome.storage.local.set({
        telegramBotToken: botToken,
        telegramChatId: chatId
    }, () => {
        // Callback after save is complete
        statusEl.textContent = 'Settings saved successfully!';
        statusEl.style.color = '#28a745'; // green

        // Clear the status message after 3 seconds
        setTimeout(() => {
            statusEl.textContent = '';
        }, 3000);
    });
}

/**
 * Restores the configuration inputs state using the preferences
 * stored in chrome.storage.
 */
function restoreOptions() {
    // We request the keys we want from storage. The second argument is a callback.
    chrome.storage.local.get(['telegramBotToken', 'telegramChatId'], (result) => {
        if (result.telegramBotToken) {
            document.getElementById('botToken').value = result.telegramBotToken;
        }
        if (result.telegramChatId) {
            document.getElementById('chatId').value = result.telegramChatId;
        }
    });
}
