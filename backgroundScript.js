console.log("backgroundScript.js")
import ServerEndpoints from './ServerEndpoints.js'

chrome.runtime.onMessage.addListener(async function (message, sender) {

    const senderMustBeInAparty = /^https:\/\/www3\.animeflv\.net\/ver\/(.*)\?roomId=.*$/;
    const match = senderMustBeInAparty.exec(sender.tab.url);
    if (sender.tab && match) {
        switch (message.type) {
            case 'movePartyToNewVideo':
                const [, oldVideoTitle] = match;
                const queryOptions = {active: true, lastFocusedWindow: true};
                const [tab] = await chrome.tabs.query(queryOptions);
                if (tab.pendingUrl) {
                    const newVideoMustBeFrom = /^https:\/\/www3\.animeflv\.net\/ver\/(.*)$/;
                    const [, newVideoTitle] = newVideoMustBeFrom.exec(tab.pendingUrl);

                    if (oldVideoTitle !== newVideoTitle) {
                        fetch(`${ServerEndpoints.getRooms}/${message.roomId}`)
                            .then(response => {
                                if (!response.ok) {
                                    return Promise.reject(response);
                                }
                                return response.json();
                            })
                            .then(async room => {
                                if (room.url === tab.pendingUrl) {
                                    //Alguien ya ha cambiado la party por el nuevo video, no hacer nada
                                    console.log("no hace nada")
                                } else {
                                    const maxAttempts = 8;
                                    let attempts = 0;
                                    let newRoomTab = undefined;
                                    const obtainNewTab = setInterval(async () => {
                                        try {
                                            attempts++;
                                            newRoomTab = await chrome.tabs.query({url: tab.pendingUrl});
                                            if (newRoomTab[0].status === 'complete') {
                                                console.log("Se encontro un tab", newRoomTab[0]);
                                                clearInterval(obtainNewTab);
                                                const suggestionReceived = await chrome.tabs.sendMessage(newRoomTab[0].id, {
                                                    type: "suggestToUsePreviousProvider",
                                                    suggestedProvider: room.videoProvider
                                                });
                                                if (suggestionReceived) {
                                                    const getVideo = setInterval(async () => {
                                                        const videoProvider = await chrome.tabs.sendMessage(newRoomTab[0].id, {type: "videoRequest"});
                                                        if (videoProvider) {
                                                            clearInterval(getVideo)
                                                            chrome.tabs.sendMessage(newRoomTab[0].id, {
                                                                type: "updatePartyToNewVideo",
                                                                roomId: room.roomId,
                                                                url: newRoomTab[0].url,
                                                                videoProvider,
                                                                username: message.username,
                                                                userType: message.userType
                                                            });

                                                        }
                                                    }, 1000)


                                                } else {
                                                    console.log("no hubo click registrado para el provider sugerido")
                                                }

                                            } else if (attempts === maxAttempts) {
                                                clearInterval(obtainNewTab);
                                                console.log("Se alcanzo el limite de intentos para obtener la nueva tab ")
                                            }

                                        } catch (error) {
                                            console.log("No se pudo obtener la pestaña: ", error);
                                        }
                                    }, 1000);
                                }

                            })
                            .catch(error => {
                                console.log("catch err: ", error)
                                if (error instanceof Response) {
                                    error.json().then(errorData => {
                                        console.log("Error de respuesta: ", errorData.message)
                                    })
                                } else {
                                    console.log("El servidor está caído")
                                }
                            })

                    }
                }


        }
    }

});
