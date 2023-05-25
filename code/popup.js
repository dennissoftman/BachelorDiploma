const timestampOpts = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };
let typingStatusEnabled = false;

document.addEventListener('DOMContentLoaded', function () {
    let chatHistory = document.querySelector('.chat-message-list');
    let textInput = document.querySelector('.chat-input');

    function createPlaceholder() {
        let placeholder = document.createElement('div');
        placeholder.className = 'chat-placeholder';
        placeholder.textContent = 'Start asking questions!'
        return placeholder;
    }

    function loadChatHistory() {
        chrome.storage.session.get(["chat_history"]).then((result) => {
            if (result.chat_history != undefined) {
                result.chat_history.forEach(element => {
                    chatHistory.appendChild(createChatMessage(element.sender, element.timestamp, element.text));
                });
                if(result.chat_history.length == 0) {
                    if(chatHistory.querySelector('.chat-placeholder') == undefined) {
                        chatHistory.appendChild(createPlaceholder());
                    }
                }

                chatHistory.scrollTop = chatHistory.scrollHeight;
            } else {
                if(chatHistory.querySelector('.chat-placeholder') == undefined) {
                    chatHistory.appendChild(createPlaceholder());
                }
            }
        });
    }

    function handleKeyPress(event) {
        if (event.keyCode === 13) { // return key
            event.preventDefault();
            if (event.shiftKey) {
                textInput.value += '\n';
            } else {
                document.querySelector('.chat-submit').click();
            }
        }
    }

    function createChatMessage(sender, timestamp, msgText) {
        let placeholder = chatHistory.querySelector('.chat-placeholder');
        if(placeholder) {
            chatHistory.removeChild(placeholder);
            placeholder.remove();
        }

        let element = document.createElement('div');
        element.className = 'chat-message';

        let infoDiv = document.createElement('div');
        infoDiv.className = 'message-info';

        let senderSpan = document.createElement('span');
        senderSpan.className = 'sender';
        senderSpan.textContent = sender;
        infoDiv.appendChild(senderSpan);

        let timestampSpan = document.createElement('span');
        timestampSpan.className = 'timestamp';
        timestampSpan.textContent = timestamp;
        infoDiv.appendChild(timestampSpan);

        element.appendChild(infoDiv);
        element.innerHTML += msgText.replaceAll('\n', '<br>');

        return element
    }

    function getCurrentTimestamp() {
        let date = new Date();
        return date.toLocaleDateString(undefined, timestampOpts)
    }

    function startTypingStatus() {
        typingStatusEnabled = true;
        document.querySelector('.chat-container .chat-typing-status').style.display = 'inline-block';
        const dotsElements = document.querySelectorAll('.chat-container .chat-typing-status .dot');
        const dotCount = dotsElements.length;
        let dotIndex = 0;

        // Toggle the animation on the dots one by one
        const toggleAnimation = () => {
            dotsElements[dotIndex].classList.toggle('scale-animation');
            dotIndex = (dotIndex + 1) % dotCount;
            if(typingStatusEnabled) {
                setTimeout(toggleAnimation, 100); // Delay before animating the next dot
            }
        };
        toggleAnimation();
    }

    function stopTypingStatus() {
        typingStatusEnabled = false;
        document.querySelector('.chat-container .chat-typing-status').style.display = 'none';
    }

    function sendMessage() {
        let msgText = textInput.value;
        if (msgText.length <= 0) {
            return;
        }
        textInput.value = '';

        //
        let sender = 'You';
        let timestamp = getCurrentTimestamp();
        chrome.storage.session.get(["chat_history"]).then((result) => {
            let history = result.chat_history || new Array();

            history.push({
                'sender': sender,
                'timestamp': timestamp,
                'text': msgText
            });

            chrome.storage.session.set({ chat_history: history }); // update chat history

            chrome.runtime.sendMessage({
                'action': 'websocketAction',
                'data': history
            });
            startTypingStatus();
        });
        //
        chatHistory.appendChild(createChatMessage(sender, timestamp, msgText));
        chatHistory.scrollBy({
            top: chatHistory.scrollHeight,
            behavior: 'smooth'
        });
    }

    function clearChat() {
        chatHistory.querySelectorAll('.chat-message').forEach(msgItem => {
            chatHistory.removeChild(msgItem);
            msgItem.remove();
        });
        chrome.storage.session.set({ chat_history: new Array() }, () => {
            loadChatHistory();
        });
    }

    var chatInput = document.querySelector('.chat-input');
    chatInput.addEventListener('keypress', handleKeyPress);

    var chatSubmit = document.querySelector('.chat-submit');
    chatSubmit.addEventListener('click', sendMessage);

    var chatClear = document.querySelector('.chat-clear');
    chatClear.addEventListener('click', clearChat);

    loadChatHistory();

    chrome.runtime.onMessage.addListener((msg, sender) => {
        if(msg.action === "websocketAnswer") {
            // stop typing animation
            stopTypingStatus();
            //
            chatHistory.appendChild(createChatMessage(msg.data.sender, msg.data.timestamp, msg.data.text));
            chatHistory.scrollBy({
                top: chatHistory.scrollHeight,
                behavior: 'smooth'
            });
        }
    });
});