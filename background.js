// background.js

// 1. Listen for clicks on the extension icon in the toolbar.
chrome.action.onClicked.addListener(async (tab) => {
    // We only proceed if we have a valid URL.
    if (!tab.url) return;

    // 2. We need to fetch the tokens the user saved in the options page.
    chrome.storage.local.get(['telegramBotToken', 'telegramChatId'], async (result) => {
        const { telegramBotToken, telegramChatId } = result;

        // 3. Fallback check: Did the user actually configure the extension?
        if (!telegramBotToken || !telegramChatId) {
            notifyUser('Configuration Missing', 'Please right-click the extension icon and select "Options" to add your Bot Token and Chat ID.');
            return;
        }

        // 4. Format the URL and sanitize tracking parameters
        // Many URLs contain junk like ?utm_source= or ?ref=. We want to strip those, 
        // but keep legitimate search parameters like ?q=shoes or ?id=123 (used heavily by PHP shops).
        const sanitizeUrl = (rawUrl) => {
            try {
                const urlObj = new URL(rawUrl);
                const paramsToKeep = new URLSearchParams();
                
                // We define a list of common tracking/referral parameters to drop
                const junkParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'ref_src', 'click_id', 'affiliate', 'gclid', 'fbclid'];

                // Loop through all existing params. If it's NOT in our junk list, we keep it!
                for (const [key, value] of urlObj.searchParams.entries()) {
                    // Check if the parameter starts with any of our junk prefixes (e.g. utm_)
                    const isJunk = junkParams.some(junk => key.toLowerCase().startsWith(junk) || key.toLowerCase() === junk);
                    
                    if (!isJunk) {
                        paramsToKeep.append(key, value);
                    }
                }

                // Reconstruct the URL with the cleaned parameters
                urlObj.search = paramsToKeep.toString();
                return urlObj.toString();
            } catch (e) {
                // If it's somehow not a valid URL (e.g. a local file), just return the original
                return rawUrl;
            }
        };

        const cleanUrl = sanitizeUrl(tab.url);

        // 5. Format the message for Telegram. 
        // Let's create a quick helper to escape HTML characters in the title just in case the title itself has < or &
        const escapeHTML = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const safeTitle = escapeHTML(tab.title || "Saved Link");

        const messageText = `🔖 <b>${safeTitle}</b>\n\n${cleanUrl}`;

        // 6. Build the Telegram API URL for sending a message
        const telegramApiUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;

        try {
            // 6. Execute the HTTP POST request to Telegram
            const response = await fetch(telegramApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chat_id: telegramChatId,
                    text: messageText,
                    // Use HTML instead of Markdown to safely allow unformatted URLs
                    parse_mode: 'HTML' 
                })
            });

            // 7. Check if the Telegram API was happy
            if (response.ok) {
                notifyUser('Saved!', `Successfully sent "${tab.title}" to Telegram.`);
            } else {
                const errorData = await response.json();
                console.error("Telegram API Error:", errorData);
                notifyUser('Failed to Save', `Telegram Error: ${errorData.description || 'Unknown error'}`);
            }

        } catch (error) {
            // 8. Catch network errors (e.g. no internet connection)
            console.error("Fetch Error:", error);
            notifyUser('Network Error', 'Could not reach Telegram. Check your internet connection.');
        }
    });
});

/**
 * A helper function to show native browser notifications.
 */
function notifyUser(title, message) {
    chrome.notifications.create({
        type: 'basic',
        // Because we downloaded a placeholder icon earlier, we use it here.
        iconUrl: 'icons/icon48.png', 
        title: title,
        message: message,
        // Optional priority: 0 to 2
        priority: 1
    });
}
