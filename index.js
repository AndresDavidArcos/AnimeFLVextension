const src = chrome.runtime.getURL("ServerEndpoints.js");
import(src).then(endpointsModule => {
    const {getRooms} = endpointsModule.default;
    const d = document;
    let animeUrl = "",
    videoFounded = false;
    const currentUrl = window.location.href;
    const verifyUrl = "https://www3.animeflv.net/ver/";
    
    
    if (window.frameElement === null && currentUrl.startsWith(verifyUrl)) {
    
        const createChatView = (type, roomId, username) => {
            const $animePartyChatView = d.querySelector(".animePartyChatView")
            if($animePartyChatView){
                $animePartyChatView.remove();
            }
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const $chatIframe = d.createElement('iframe');
            $chatIframe.src = chrome.runtime.getURL('chatView.html');
            $chatIframe.classList.add("animePartyChatView");
            $chatIframe.allow = "clipboard-read; clipboard-write"
            $chatIframe.style.width = `${viewportWidth * 0.23}px`;
            $chatIframe.style.height = `${viewportHeight * 0.7}px`;
            $chatIframe.style.position = 'absolute';
            $chatIframe.style.top = '100px';
            $chatIframe.style.right = '-100px'; 
            $chatIframe.addEventListener("load", e => {
                chrome.runtime.sendMessage({ type, roomId, username});
            })
            const $animeNews = d.querySelector(".CpCnC"); 
            $animeNews.style.top = "700px"             
            $animeNews.insertAdjacentElement('beforebegin', $chatIframe);
        }
    
        const verifyRoomAndJoin = (eventType, roomId, username) => {
            fetch(`${getRooms}/${roomId}`)
            .then(response => {
                if (!response.ok) {
                console.log("error index.js al acceder a room", response)
                return Promise.reject(response);
                }
                return response.json();
            })
            .then(room => {
                createChatView(eventType, roomId, username)                         
            })
            .catch(error => {
                console.log("catch err: ", error)
                error.json().then(errorData => {
                    const errorModalHtml = `        
                    <div class="frame">
                    <div class="modalWindow modalWindowError">
                        <h2>Error en AnimeParty</h2>
                        <p>${errorData.message}</p>
                        <button>Ok</button>
                    </div>
                    </div>
                  `
                  d.querySelector("body").insertAdjacentHTML("afterbegin", errorModalHtml);
                  const $modal = d.querySelector(".frame");
        
                  d.querySelector(".modalWindowError button").addEventListener("click", e => {
                  $modal.remove();              
                  })
                })
    
            });
        }
    
        animeUrl = currentUrl;
        const searchParams = new URL(animeUrl).searchParams;
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
                            verifyRoomAndJoin("guestRoomJoined",roomId, inputValue)
                        }
                       
                    })
                }else{
                    const roomId = searchParams.get('roomId');
                    verifyRoomAndJoin("guestRoomJoined",roomId, username)
                }
            });
    
        }
        chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
            switch (msg.type) {
                case "urlRequest":
                    sendResponse(animeUrl);
                    break;
                case "roomCreated":
                    const roomId = msg.partyData.roomId;
                    const username = msg.partyData.username;
    
                   createChatView("hostRoomJoined", roomId, username)
                default:
                    break;
            }
        })
    
        
    
    } 
    
    
    d.querySelectorAll("video").forEach((item) => {
        console.log("video encontrado!")
        chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
            switch (msg.type) {
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
            
                default:
                    break;
            }
        })
        item.addEventListener("play", function() {
            chrome.runtime.sendMessage({ type: "playback", state: "play" });
        });
            
        item.addEventListener("pause", function() {
            chrome.runtime.sendMessage({ type: "playback", state: "pause" });
         });
            
         item.addEventListener("seeked", function() {
            chrome.runtime.sendMessage({ type: "videoTimeChange", time: item.currentTime });
      });   
    });
})
.catch(err => {
    console.log("error al cargar modulo: ", err)
})


