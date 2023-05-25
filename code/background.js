const WEBSOCKET_ADDR = "wss://relay-pool.online:8765";
const timestampOpts = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };

function explainThis(info, tab) {
    const selectedText = info.selectionText;
    chrome.tabs.sendMessage(tab.id, { action: "showTooltip", text: selectedText });
}

chrome.runtime.onInstalled.addListener(function() {
    chrome.contextMenus.create({
        id: "explain-this",
        title: "Explain this...",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if(info.menuItemId === "explain-this") {
        explainThis(info, tab);
    }
});

function getCurrentTimestamp() {
    let date = new Date();
    return date.toLocaleDateString(undefined, timestampOpts)
}

chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.action === "closeTooltip") {
        chrome.tabs.sendMessage(sender.tab.id, { action: "removeTooltip" });
    } else if(message.action === "ping") {
        message.waitUntil(Promise.resolve()); // keep service_worker alive
    } else if(message.action === "websocketAction") {
        let pingIntervalId = setInterval(() => {
            chrome.runtime.sendMessage({
                'action': 'ping'
            });
        }, 3000);
        let history = message.data;

        let socket;
        try {
            socket = new WebSocket(WEBSOCKET_ADDR);
            socket.binaryType = 'blob';
            socket.onopen = function (ev) {
                socket.send(JSON.stringify({
                    'action': 'chat',
                    'history': history,
                }));
            };
        } catch {
            chrome.runtime.sendMessage({
                'action': 'websocketAnswer',
                'data': {
                    'sender': 'assistant',
                    'timestamp': getCurrentTimestamp(),
                    'text': "Sorry, I am unavailable at the moment, try again later :)"
                }
            });
            console.warn("Failed to connect via websocket");
            clearInterval(pingIntervalId);
            return;
        }

        // TODO: streaming
        socket.onmessage = function (ev) {
            ev.data.text().then((txt) => {
                let resp = JSON.parse(txt);
                if(resp.error != undefined) {
                    let answer = {
                        'sender': 'assistant',
                        'timestamp': getCurrentTimestamp(),
                        'text': "Sorry, I can't answer right now, try later"
                    }
                    history.push(answer);
                    chrome.storage.session.set({ chat_history: history }); // update chat history
                    try {
                        chrome.runtime.sendMessage({
                            'action': 'websocketAnswer',
                            'data': answer
                        });
                    } catch { }
                    clearInterval(pingIntervalId);
                    console.warn(`Failed to retrieve data: ${resp.error}`);
                    socket.close();
                } else {
                    if(resp.type === "answer") {
                        let timestamp = getCurrentTimestamp();
                        let answer = {
                            'sender': 'assistant',
                            'timestamp': timestamp,
                            'text': resp.data
                        };
                        history.push(answer);
                        chrome.storage.session.set({ chat_history: history }); // update chat history
                        try {
                            chrome.runtime.sendMessage({
                                'action': 'websocketAnswer',
                                'data': answer
                            });
                        } catch { }
                    } else if(resp.type === "stop") {
                        clearInterval(pingIntervalId);
                        socket.close();
                    }
                }
            });
        };
    }
});
