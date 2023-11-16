const src = chrome.runtime.getURL("ServerEndpoints.js");
import(src).then(endpointsModule => {
    const {getRooms} = endpointsModule.default;
    const d = document;
    let animeUrl = "";
    const currentUrl = window.location.href;
    const verifyUrl = "https://www3.animeflv.net/ver/";    

    if (window.frameElement === null && currentUrl.startsWith(verifyUrl)) {
        animeUrl = currentUrl;
        const searchParams = new URL(animeUrl).searchParams;
        
        const createChatView = (type, roomId, username, exceptionalCase) => {
            const $animePartyChatView = d.querySelector(".animePartyChatView")
            if($animePartyChatView){
                $animePartyChatView.remove();
            }
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const $chatIframe = d.createElement('iframe');
            if(exceptionalCase){
                const {situation,url, videoProvider} = exceptionalCase
                switch (situation) {
                    case 'movingPartyToNewVideo':
                        $chatIframe.src = chrome.runtime.getURL('chatView.html')+`?username=${username}&roomId=${roomId}&type=${type}&situation=${situation}&url=${url}&videoProvider=${videoProvider}`;
                        break;
                
                    default:
                        break;
                }
            }else{
              $chatIframe.src = chrome.runtime.getURL('chatView.html')+`?username=${username}&roomId=${roomId}&type=${type}`;
            }            
            $chatIframe.classList.add("animePartyChatView");
            $chatIframe.allow = "clipboard-read; clipboard-write"
            $chatIframe.style.width = `${viewportWidth * 0.24}px`;
            $chatIframe.style.height = `${viewportHeight * 0.8}px`;
            $chatIframe.style.position = 'absolute';
            $chatIframe.style.top = '100px';
            $chatIframe.style.right = '-50px'; 
          
            $chatIframe.addEventListener("load", e => {
                if(type === 'host'){
                    window.history.replaceState(null, null, `?roomId=${roomId}`);
                }

                if(exceptionalCase){
                    const {situation,url, videoProvider} = exceptionalCase
                    switch (situation) {
                        case 'movingPartyToNewVideo':
                            window.history.replaceState(null, null, `?roomId=${roomId}`);
                            break;
                    
                        default:
                            break;
                    }
                }
            })
            const $animeNews = d.querySelector(".CpCnC"); 
            $animeNews.style.top = "700px"             
            $animeNews.insertAdjacentElement('beforebegin', $chatIframe);
            window.addEventListener('beforeunload', e => {
                chrome.runtime.sendMessage({type: 'movePartyToNewVideo', roomId, username, userType: type})
            })
        }
    
        const verifyRoomAndJoin = (type, roomId, username) => {
            fetch(`${getRooms}/${roomId}`)
            .then(response => {
                if (!response.ok) {
                console.log("error index.js al acceder a room", response)
                return Promise.reject(response);
                }
                return response.json();
            })
            .then(room => {
                    createChatView(type, roomId, username)
            })
            .catch(error => {
                console.log("catch err: ", error)
                const handleErrorResponse = errorMessage => {
                    const errorModalHtml = `
                        <div class="frame">
                            <div class="modalWindow modalWindowError">
                                <h2>Error en AnimeParty</h2>
                                <p>${errorMessage}</p>
                                <button>Ok</button>
                            </div>
                        </div>
                    `;
                    d.querySelector("body").insertAdjacentHTML("afterbegin", errorModalHtml);
                    const $modal = d.querySelector(".frame");
            
                    d.querySelector(".modalWindowError button").addEventListener("click", e => {
                        $modal.remove();
                    });
                };

                if(error instanceof Response){
                    error.json().then(errorData => {
                        handleErrorResponse(errorData.message)
                    })
                }else{                  
                handleErrorResponse("El servidor esta caido, para mas detalles, contactate con el desarrollador")
                }

    
            });
        }
        
        if (searchParams.has('roomId')) {
            chrome.storage.sync.get('username', (data) => {
                const {username} = data;
                if(!username){
                    const modalHtml = `
                    <div class="frame">
                    <div class="modalWindow">
                        <h2>Bienvenido a AnimeParty!</h2>
                        <p>Date a conocer</p>
                        <input type="text" placeholder="Escribe tu nickname">
                        <button>Enviar</button>
                    </div>
                    </div>
                    `;
        
                    d.querySelector("body").insertAdjacentHTML("afterbegin", modalHtml);
                    const $modal = d.querySelector(".frame");
                    d.querySelector(".modalWindow button").addEventListener("click", e => {
                        const inputValue = $modal.querySelector("input").value;
                        if(inputValue){
                            chrome.storage.sync.set({username: inputValue})
                            $modal.remove();
                            const roomId = searchParams.get('roomId');
                            verifyRoomAndJoin("guest",roomId, inputValue)
                        }
                       
                    })
                }else{
                    const roomId = searchParams.get('roomId');
                    verifyRoomAndJoin("guest",roomId, username)
                }
            });
    
        }
        chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
            switch (msg.type) {
                case "roomCreated":{
                    const roomId = msg.partyData.roomId;
                    const username = msg.partyData.username;
                    const $videoOptionsContainerHost = d.querySelector(".nav-pills");
                    if ($videoOptionsContainerHost) {
                        const noSyncOptionsHost = $videoOptionsContainerHost.querySelectorAll(`li:not(:is([data-original-title="${msg.partyData.videoProvider}"], [title="${msg.partyData.videoProvider}"]))`);
                        noSyncOptionsHost.forEach(li => {
                            li.remove();
                        })
                    }  
                   createChatView("host", roomId, username)
                    }
                   break;
                case "syncVideoProvider":{
                    const {provider} = msg;
                    const $videoOptionsContainer = d.querySelector(".nav-pills");
                    if ($videoOptionsContainer) {
                        const noSyncOptions = $videoOptionsContainer.querySelectorAll(`li:not(:is([data-original-title="${provider}"], [title="${provider}"]))`);
                        noSyncOptions.forEach(li => {
                            li.remove();
                        })
                        const $syncOption = $videoOptionsContainer.querySelector(`li:is([data-original-title="${provider}"], [title="${provider}"])`)                        
                        $syncOption.click();
                      }else{
                        console.log("No se encontraron opciones de video");
                      }
                     }
                    break;    
                case "suggestToUsePreviousProvider" :{
                    const {suggestedProvider} = msg;
                    const $videoOptions = d.querySelector(".nav-pills");
                    if ($videoOptions) {
                        const $syncOption = $videoOptions.querySelector(`li:is([data-original-title="${suggestedProvider}"], [title="${suggestedProvider}"])`)  
                        try {
                            $syncOption.click();
                        } catch (error) {
                            console.log("No existe el provider sugerido");
                        }
                      }else{
                        console.log("No se encontraron opciones de video");
                      } 
                      sendResponse(true);
                    }
                    break;
                case "updatePartyToNewVideo":{
                    const {roomId, videoProvider, username, userType, url} = msg;
                    const $videoOptionsContainer = d.querySelector(".nav-pills");
                    if ($videoOptionsContainer) {
                        const noSyncOptions = $videoOptionsContainer.querySelectorAll(`li:not(:is([data-original-title="${videoProvider}"], [title="${videoProvider}"]))`);
                        noSyncOptions.forEach(li => {
                            li.remove();
                        })
                        createChatView(userType, roomId, username, {situation: 'movingPartyToNewVideo',url, videoProvider});

                      }else{
                        console.log("No se encontraron opciones de video");
                      }
                     }                    
                break;               
                default:
                    break;
            }
        })
    
        
    
    }else{        
        d.querySelectorAll("video").forEach((item) => {
            console.log("video encontrado!", item);
            
            let playBySync = false;
            let pauseBySync = false;
            let seekBySync = false;

            const handlePlay = () =>{
                if(!playBySync){
                    chrome.runtime.sendMessage({ type: "playback", state: "play" });
                }else{
                    playBySync = false;
                }
            }

            const handlePause = () =>{
                if(!pauseBySync){
                chrome.runtime.sendMessage({ type: "playback", state: "pause" });
            }else{
                pauseBySync = false;
            }                
            }

            const handleSeek = () =>{
                if(!seekBySync){
                chrome.runtime.sendMessage({ type: "videoTimeChange", time: item.currentTime });
                }else{
                    seekBySync = false;
                }                    
            }
                        
            
            chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
                switch (msg.type) {
                    case "syncVideoState":
                        const {time, paused} = msg.currentVideoState;
                        seekBySync = true;
                        item.currentTime = time;
                        if(!paused){
                            playBySync = true;
                            item.play();
                        }else{
                            pauseBySync = true;
                            item.pause();
                        }
                        sendResponse(true);
                        break;       
                    case "videoRequest":
                        const videoProviderServer = new URL(new URL(item.src).origin).hostname;
                        let videoProvider = "";
                        switch (videoProviderServer) {
                            case "vidcache.net":
                                videoProvider = "YourUpload";
                                break;
                            case "streamwish.to":
                                videoProvider = "SW";
                                break;                        
                        
                            default:
                                break;
                        }
                        sendResponse(videoProvider);
                        break;
                    case "getCurrentVideoState":
                        sendResponse({time: item.currentTime, paused: item.paused});
                        break;
                    case "updateVideoState":
                        switch (msg.state) {
                            case 'play':
                             if(item.paused){
                                playBySync = true;
                                item.play();
                             }
                             break;
                            case 'pause':
                            if(!item.paused){
                                pauseBySync = true;
                                item.pause();
                            }                                
                             break;
                            case 'time':                                
                            if(Math.abs(item.currentTime-msg.time) > 3){
                                seekBySync = true;
                                item.currentTime = msg.time;   
                            }
                             break;                                                        
                            default:
                                break;
                        }
                        break;                        
                    default:
                        break;
                }
            })
            
            item.addEventListener("play", handlePlay);
                
            item.addEventListener("pause", handlePause);
                
             item.addEventListener("seeked", handleSeek);   
        });
    } 
})
.catch(err => {
    console.log("error al cargar modulo: ", err)
})