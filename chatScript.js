(async (d) => {
    const src = chrome.runtime.getURL("socket.io.esm.min.js");
    const socketModule = await import(src);
    const {io} = socketModule.default;
    const serverEndpointsSrc = chrome.runtime.getURL("ServerEndpoints.js");
    const serverEndpointsModule = await import(serverEndpointsSrc);
    const {getSocket} = serverEndpointsModule.default;
    const socket = io(getSocket);

    const chatParameters = new URL(window.location.href).searchParams
    const username = chatParameters.get('username'), roomId = chatParameters.get('roomId'),
        userType = chatParameters.get('type'), situation = chatParameters.get('situation')


    const $input = d.querySelector(".sendMessageInput"), $sendBtn = d.querySelector(".sendMessageBtn"),
        $copyPartyLink = d.getElementById("clipPath"), $messageTemplate = d.getElementById("templateMessage").content,
        $messagesContainer = d.querySelector(".messages");

    let roomInfo = {};

    const genericError = {
        avatar: "admin",
        avatarBackground: "pink",
        username: "Sistema",
        content: "Ocurrio un error inesperado! :cc",
        date: Date.now()
    }

    const [currentTab] = await chrome.tabs.query({active: true, currentWindow: true});
    const joinRoom = async () => {
        try {
            const serverRes = await socket.emitWithAck('joinRoom', roomId, username, userType);
            if (serverRes.type === "error") {
                buildMessageHtml({
                    ...genericError,
                    date: Date.now(),
                    content: "La room a la que tratas de unirte no existe, visita el menu de las rooms para unirte a una o pide que te vuelvan a enviar el link de la room"
                })
            } else {
                roomInfo = serverRes;
            }

        } catch (error) {
            console.log("Error al intentar conectarse: ", error)
            buildMessageHtml({
                ...genericError,
                date: Date.now(),
                content: "El servidor esta caido, si desea mas detalles puede contactarse con el desarrollador."
            })
        }
    }


    socket.on('connect', async () => {
        console.log(`El cliente de tipo ${userType} con la id ${socket.id} se ha conectado!`)
        if (situation === 'movingPartyToNewVideo') {
            await joinRoom();
            roomInfo.history.forEach(msg => {
                buildMessageHtml(msg)
            })
            const url = chatParameters.get('url')
            const videoProvider = chatParameters.get('videoProvider')
            const partyUpdated = await socket.emitWithAck('updateVideoParty', url, videoProvider);
            if (!partyUpdated) {
                console.log("No se pudo actualizar la party con el nuevo video")
            } else {
                roomInfo.url = url;
                roomInfo.videoProvider = videoProvider;
            }
        } else if (userType === 'host') {
            await joinRoom();
        } else if (userType === 'guest') {
            const waitForButtonClick = new Promise(resolve => {
                buildMessageHtml({
                    ...genericError,
                    date: Date.now(),
                    content: "Te has unido a una party! Necesitamos que confirmes que podemos sincronizar el video."
                })
                const $confirmButton = d.createElement("button");
                $confirmButton.classList.add("btn");
                $confirmButton.textContent = "Confirmar!"
                $confirmButton.style.borderRadius = "20px";
                $confirmButton.style.marginLeft = "60px";
                $confirmButton.style.marginTop = "-21px";
                $confirmButton.style.width = "110px";
                $messagesContainer.appendChild($confirmButton);
                $confirmButton.addEventListener("click", e => {
                    $confirmButton.previousElementSibling.remove();
                    $confirmButton.remove();
                    resolve();
                });
            });
            waitForButtonClick.then(async () => {
                await joinRoom()

                //obtiene el tiempo de video que lleva la room y si esta o no en pausa para sincronizarlo con este video
                let currentVideoState;
                let attempts = 0;
                const maxAttempts = 6;
                while (attempts < maxAttempts) {
                    console.log("intento: ", attempts)
                    const socketRes = await socket.emitWithAck('askCurrentVideoState', roomInfo.roomId);
                    console.log("respuesta: ", socketRes)
                    if (socketRes.type === 'error') {
                        buildMessageHtml({
                            ...genericError, date: Date.now(), content: `${socketRes.message} Volviendo a intentar.`
                        })
                        attempts++;
                    } else {
                        console.log("currentVideoState ", socketRes)
                        currentVideoState = socketRes;
                        break;
                    }

                    if (attempts === maxAttempts) {
                        buildMessageHtml({
                            ...genericError,
                            date: Date.now(),
                            content: "Se alcanzó el número máximo de intentos sin éxito."
                        })
                        break;
                    }
                }

                console.log("currentVideoState despues del while: ", currentVideoState);
                console.log("se trato de enviar mensaje syncVideoProvider a: ", currentTab)
                chrome.tabs.sendMessage(currentTab.id, {
                    type: "syncVideoProvider", provider: roomInfo.videoProvider
                });
                console.log("se trato de enviar mensaje syncVideoProvider con: ", roomInfo.videoProvider, currentTab)
                const syncVideoState = setInterval(async () => {
                    try {
                        console.log("intento1 con: ", currentTab, "currentVideoState: ", currentVideoState)
                        const res = await chrome.tabs.sendMessage(currentTab.id, {
                            type: "syncVideoState", currentVideoState
                        });
                        console.log("res fue: ", res)
                        if (res === true) {
                            clearInterval(syncVideoState)
                        }


                    } catch (error) {
                        console.log("Error al intentar sincronizar el video desde chatScript: ", error)
                    }
                }, 1000)


                roomInfo.history.forEach(msg => {
                    buildMessageHtml(msg)
                })
            })

        }

    })

    socket.on('roomMessage', messageObj => {
        buildMessageHtml(messageObj);
    })

    socket.on('getCurrentVideoState', async (message, sendResponse) => {
        try {
            const videoState = await chrome.tabs.sendMessage(currentTab.id, {type: "getCurrentVideoState"});
            sendResponse(videoState);
        } catch (error) {
            console.log("error en chatScript al getCurrentVideoState: ", error);
        }
    })

    socket.on('updateVideoState', async message => {
        try {
            const {type, senderUsername} = message;
            switch (type) {
                case 'play':
                    buildMessageHtml({
                        ...genericError, date: Date.now(), content: `${senderUsername} le ha dado play al video.`
                    })
                    chrome.tabs.sendMessage(currentTab.id, {type: "updateVideoState", state: 'play'});
                    break;
                case 'pause':
                    buildMessageHtml({
                        ...genericError, date: Date.now(), content: `${senderUsername} le ha dado pausa al video.`
                    })
                    chrome.tabs.sendMessage(currentTab.id, {type: "updateVideoState", state: 'pause'});
                    break;
                case 'time':
                    const time = message.time;
                    buildMessageHtml({
                        ...genericError,
                        date: Date.now(),
                        content: `${senderUsername} ha cambiado el tiempo del video a ${formatTime(time)}.`
                    })
                    chrome.tabs.sendMessage(currentTab.id, {type: "updateVideoState", state: 'time', time});
                    break;
                default:
                    break;
            }


        } catch (error) {
            console.log("error en chatScript al videoStateChange: ", error);
        }
    })

    socket.on('videoPartyHasChanged', (url, roomId, senderUsername) => {
        chrome.tabs.sendMessage(currentTab.id, {type: 'dontMoveParty'}, (res)=>{
            if(res){
                window.top.location.href = `${url}?roomId=${roomId}&videoPartyChangedBy=${senderUsername}`;
            }else{
                console.log("No llego el mensaje dontMoveParty, no se hara el cambio de href")
            }
        })
    })

    chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
        if (message.type === 'videoTimeChange' || message.type === 'playback') {
            const parsedUrl = new URL(sender.tab.url);
            const roomIdParam = parsedUrl.searchParams.get("roomId");
            const senderUrl = `${parsedUrl.origin}${parsedUrl.pathname}?roomId=${roomIdParam}`;
            const {roomId, url} = roomInfo;
            if (senderUrl === `${url}?roomId=${roomId}`) {
                switch (message.type) {
                    case 'playback':
                        switch (message.state) {
                            case 'play':
                                socket.emit('videoStateChange', {type: "play"})
                                break;
                            case 'pause':
                                socket.emit('videoStateChange', {type: "pause"})
                                break;
                            default:
                                break;
                        }
                        break;
                    case 'videoTimeChange':
                        socket.emit('videoStateChange', {type: "time", time: message.time})
                        break;
                    default:
                        break;
                }
            }
        }
    });

    function formatDate(date) {
        const options = {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
        };
        return new Intl.DateTimeFormat(undefined, options).format(date);
    }

    function formatTime(time) {
        let hours = Math.floor(time / 3600);
        let minutes = Math.floor((time % 3600) / 60);
        let seconds = Math.floor(time % 60);

        let formattedTime = '';

        hours = (hours < 10) ? '0' + hours : hours;
        minutes = (minutes < 10) ? '0' + minutes : minutes;
        seconds = (seconds < 10) ? '0' + seconds : seconds;

        if (hours > 0) {
            formattedTime += hours + ':';
        }

        if (minutes > 0 || hours > 0) {
            formattedTime += minutes + ':';
        }

        formattedTime += seconds;

        return formattedTime;
    }


    function buildMessageHtml(message) {
        const isAtBottom = ($messagesContainer.scrollTop + $messagesContainer.clientHeight) / $messagesContainer.scrollHeight;
        const $clone = d.importNode($messageTemplate, true);
        $clone.querySelector(".profileIcon").setAttribute("src", `./resources/profileIcons/${message.avatar}.png`);
        $clone.querySelector(".username").textContent = message.username;
        $clone.querySelector(".messageContent").textContent = message.content;
        $clone.querySelector(".messageDate").textContent = formatDate(message.date);
        if (message.avatarBackground) {
            $clone.querySelector(".profileIcon").classList.add("profileIconBackground" + message.avatarBackground)
        }
        $messagesContainer.appendChild($clone)
        if (isAtBottom === 1) {
            $messagesContainer.scrollTop = $messagesContainer.scrollHeight;
        }
    }

    function partyLinkToClipboard() {
        navigator.clipboard.writeText(`${roomInfo.url}?roomId=${roomInfo.roomId}`);
    }

    function sendMessage() {
        const content = $input.value;
        if (content) {
            socket.emit('newMessageToRoom', {
                content, date: Date.now(), avatar: 'male', username,
            })
            $input.value = "";
        }
    }


    $sendBtn.addEventListener('click', sendMessage);
    $input.addEventListener('keyup', event => event.key === 'Enter' ? sendMessage() : null);


    $copyPartyLink.addEventListener("click", partyLinkToClipboard)
})(document);

