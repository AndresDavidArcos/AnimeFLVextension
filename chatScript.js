(async (d) => {
  const src = chrome.runtime.getURL("socket.io.esm.min.js");
  const socketModule = await import(src);
  const {io} = socketModule.default;
  const serverEndpointsSrc = chrome.runtime.getURL("ServerEndpoints.js");
  const serverEndpointsModule = await import(serverEndpointsSrc);
  const {getSocket} = serverEndpointsModule.default;
  const socket = io(getSocket);

  const chatParameters = new URL(window.location.href).searchParams
  const username = chatParameters.get('username'),
   roomId = chatParameters.get('roomId'),
   userType = chatParameters.get('type');

  const $input = d.querySelector(".sendMessageInput"),
  $sendBtn = d.querySelector(".sendMessageBtn"),
  $copyPartyLink = d.getElementById("clipPath"),
  $messageTemplate = d.getElementById("templateMessage").content,
  $messagesContainer = d.querySelector(".messages");

  let roomInfo = {};

  const genericError = {
    avatar: "male",
    username: "Sistema",
    content: "Ocurrio un error inesperado! :cc",
    date: Date.now()
  }


  socket.on('connect', async ()=>{
    console.log(`El cliente con la id ${socket.id} se ha conectado!`)
    try {
      const serverRes = await socket.emitWithAck('joinRoom', roomId);
      if(serverRes.type === "error"){
        buildMessageHtml({...genericError, content: "La room a la que tratas de unirte no existe, visita el menu de las rooms para unirte a una o pide que te vuelvan a enviar el link de la room"})
      }else{
        roomInfo = serverRes;
        if(userType === 'guest'){
          let attempts = 0;
          const maxAttempts = 6;             
          while (attempts < maxAttempts) {
            const socketRes = await socket.emitWithAck('askCurrentVideoTime', roomInfo.roomId);  
      
            if (socketRes.type === 'error') {
              buildMessageHtml({...genericError, content: `${socketRes.message} Volviendo a intentar.`})
              attempts++;
            } else {
                const currentVideoTime = socketRes;
                const roomTab = await chrome.tabs.query({ url: `${roomInfo.url}?roomId=${roomInfo.roomId}` });
                chrome.tabs.sendMessage(roomTab[0].id,{type:"syncVideoProvider", provider: roomInfo.videoProvider});
                const syncVideoTime = setInterval(async ()=>{
                  try {
                    const res = await chrome.tabs.sendMessage(roomTab[0].id,{type:"syncVideoTime", time: currentVideoTime});
                    if(res === true){
                      clearInterval(syncVideoTime)
                    }
                  } catch (error) {
                    console.log("Error al intentar sincronizar el video desde chatScript: ", error)
                  }
                }, 1000)

                break;
                }
              }
            
            if (attempts === maxAttempts) {
                buildMessageHtml({...genericError, content: "Se alcanzó el número máximo de intentos sin éxito."})
            }      
      
            roomInfo.history.forEach(msg=>{
            buildMessageHtml(msg)
          })    
        }
      }
    } catch (error) {
      console.log("Error al intentar conectarse: ", error)
      buildMessageHtml({...genericError, content: "El servidor esta caido, si desea mas detalles puede contactarse con el desarrollador."})
    }

  })

  socket.on('roomMessage',messageObj=>{
    buildMessageHtml(messageObj);
  })

  socket.on('getCurrentVideoTime', async (message, sendResponse)=> {
        try {     
          const roomTab = await chrome.tabs.query({ url: `${roomInfo.url}?roomId=${roomInfo.roomId}` });
          const videoTime = await chrome.tabs.sendMessage(roomTab[0].id,{type:"getCurrentVideoTime"});
          sendResponse(videoTime);
        } catch (error) {
            console.log("error en chatScript al getCurrentVideoTime: ", error);
        }
  })

  chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log("Mensaje recibido en chatScript.js:", message, "sender: ", sender);
    switch (message.type) {       
        case 'playback':
          switch (message.state) {
            case 'play':
              
              break;
            case 'pause':

            default:
              break;
          }
        break;
        case 'videoTimeChange':

          break;
      default:
        break;
    }
  });

  function formatDate(date) {
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    };
    const formattedDate = new Intl.DateTimeFormat(undefined, options).format(date);
    return formattedDate;
  }

  function buildMessageHtml(message){
    const isAtBottom = ($messagesContainer.scrollTop + $messagesContainer.clientHeight) / $messagesContainer.scrollHeight;
    const $clone = d.importNode($messageTemplate, true);
    $clone.querySelector(".profileIcon").setAttribute("src", `./resources/profileIcons/${message.avatar}.png`);
    $clone.querySelector(".username").textContent = message.username;
    $clone.querySelector(".messageContent").textContent = message.content;
    $clone.querySelector(".messageDate").textContent = formatDate(message.date);
    $messagesContainer.appendChild($clone)
    if(isAtBottom === 1){
      $messagesContainer.scrollTop = $messagesContainer.scrollHeight;
    }
  }
  
  function partyLinkToClipboard(){
    navigator.clipboard.writeText(`${roomInfo.url}?roomId=${roomInfo.roomId}`);
  }
  
  function sendMessage(){
    const content = $input.value;
    if(content){
      socket.emit('newMessageToRoom',{
        content,
        date: Date.now(),
        avatar: 'male',
        username,
    })
    $input.value = ""; 
    }
  }

  

  $sendBtn.addEventListener('click', sendMessage);
  
  $copyPartyLink.addEventListener("click", partyLinkToClipboard)  
})(document);

