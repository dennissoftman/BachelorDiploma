const WEBSOCKET_ADDR = "wss://relay-pool.online:8765"

let tooltip;
let loadingCircle;
let currentSocket;

function createTooltip() {
    tooltip = document.createElement("div");
    tooltip.id = "explain-this-tooltip";
    tooltip.style.position = "absolute";
    tooltip.style.zIndex = "10000";
    tooltip.style.backgroundColor = "#f9f9f9";
    tooltip.style.color = "black";
    tooltip.style.border = "1px solid #ccc";
    tooltip.style.padding = "8px";
    tooltip.style.borderRadius = "4px";
    tooltip.style.maxWidth = "800px";
    tooltip.classList.add("fade-in");
    // loading circle
    loadingCircle = document.createElement("div");
    loadingCircle.id = "explain-this-loading";
    loadingCircle.classList.add("loading-circle");
    tooltip.appendChild(loadingCircle);
    document.body.appendChild(tooltip);

    return tooltip;
}

function removeTooltip() {
    if (tooltip) {
        tooltip.remove();
        tooltip = null;
    }
}

function positionTooltip(x, y) {
    if (tooltip) {
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
    }
}

function getSelectionPosition() {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    return {
        x: rect.right + window.scrollX,
        y: rect.top + window.scrollY,
    };
}

function connectSocket() {
    disconnectSocket();
    currentSocket = new WebSocket(WEBSOCKET_ADDR);
    return currentSocket;
}

function disconnectSocket() {
    if(currentSocket) {
        currentSocket.close(1000, "Request cancelled by user");
        currentSocket = null;
    }
}

chrome.runtime.onMessage.addListener(async (msg) => {
    if (msg.action === "showTooltip") {
        removeTooltip();
        let tooltipRef = createTooltip();
        
        // make websocket
        currentSocket = connectSocket();
        currentSocket.binaryType = 'blob';
        currentSocket.onopen = function (ev) {
            currentSocket.send(JSON.stringify({
                'action': 'explain',
                'text': msg.text
            }));
        };

        let firstAnswer = true;
        currentSocket.onmessage = async function (ev) {
            ev.data.text().then((txt) => {
                let resp = JSON.parse(txt);
                if(resp.type === "answer") {
                    if(firstAnswer) {
                        firstAnswer = false;
                        if(loadingCircle) {
                            tooltipRef.removeChild(loadingCircle);
                            loadingCircle.remove();
                            loadingCircle = null;
                        }
                    }
                    tooltipRef.textContent += resp.text;
                } else if(resp.type === "stop") {
                    disconnectSocket();
                }
            });
        };

        const position = getSelectionPosition();
        positionTooltip(position.x, position.y);
    } else if (msg.action === "removeTooltip") {
        removeTooltip();
        disconnectSocket();
    }
});

document.addEventListener("click", (event) => {
    if (tooltip && !tooltip.contains(event.target)) {
        tooltip.classList.remove("fade-in");
        tooltip.classList.add("fade-out");
        setTimeout(() => {
            removeTooltip();
        }, 500);
    }
});

const style = document.createElement("style");
style.textContent = `
#explain-this-tooltip.fade-out {
    animation: fade-out 0.4s forwards;
}

#explain-this-tooltip.fade-in {
    animation: fade-in 0.4s forwards;
}

@keyframes fade-in {
    0% {
        opacity: 0;
    }
    100% {
        opacity: 1;
    }
}

@keyframes fade-out {
    0% {
        opacity: 1;
    }
    100% {
        opacity: 0;
    }
}

#explain-this-loading.loading-circle {
    display: inline-block;
    width: 32px;
    height: 32px;
    border: 4px solid #f3f3f3;
    border-top-color: #3498db;
    border-radius: 50%;
    animation: spin 1s ease-in-out infinite;
  }
  
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;
document.head.appendChild(style);