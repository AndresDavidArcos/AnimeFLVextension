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
    avatar: "admin",
    avatarBackground: "pink",
    username: "Sistema",
    content: "Ocurrio un error inesperado! :cc",
    date: Date.now()
  }

  const joinRoom = async () => {
    try {
      const serverRes = await socket.emitWithAck('joinRoom', roomId, username, userType);
      if(serverRes.type === "error"){
        buildMessageHtml({...genericError, date: Date.now(), content: "La room a la que tratas de unirte no existe, visita el menu de las rooms para unirte a una o pide que te vuelvan a enviar el link de la room"})
      }else{
        roomInfo = serverRes;
      }
    } catch (error) {
      console.log("Error al intentar conectarse: ", error)
      buildMessageHtml({...genericError, date: Date.now(), content: "El servidor esta caido, si desea mas detalles puede contactarse con el desarrollador."})
    }
  }


  socket.on('connect', async ()=>{
    console.log(`El cliente de tipo ${userType} con la id ${socket.id} se ha conectado!`)
    if(userType === 'host'){
      joinRoom();
    }
    else if(userType === 'guest'){
      const waitForButtonClick = new Promise(resolve => {
        buildMessageHtml({...genericError, date: Date.now(), content: "Te has unido a una party! Necesitamos que confirmes que podemos sincronizar el video."})
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
        await joinRoom();
        let attempts = 0;
        const maxAttempts = 6;             
        while (attempts < maxAttempts) {
          const socketRes = await socket.emitWithAck('askCurrentVideoState', roomInfo.roomId);  
    
          if (socketRes.type === 'error') {
            buildMessageHtml({...genericError, date: Date.now(),  content: `${socketRes.message} Volviendo a intentar.`})
            attempts++;
          } else {
              const currentVideoState = socketRes;
              const roomTab = await chrome.tabs.query({ url: `${roomInfo.url}?roomId=${roomInfo.roomId}` });
              chrome.tabs.sendMessage(roomTab[0].id,{type:"syncVideoProvider", provider: roomInfo.videoProvider});
              const syncVideoState = setInterval(async ()=>{
                try {
                  const res = await chrome.tabs.sendMessage(roomTab[0].id,{type:"syncVideoState", currentVideoState});
                  if(res === true){
                    clearInterval(syncVideoState)
                  }
                } catch (error) {
                  console.log("Error al intentar sincronizar el video desde chatScript: ", error)
                }
              }, 1000)

              break;
              }
            }
          
          if (attempts === maxAttempts) {
              buildMessageHtml({...genericError, date: Date.now(),  content: "Se alcanzó el número máximo de intentos sin éxito."})
          }      
    
          roomInfo.history.forEach(msg=>{
          buildMessageHtml(msg)
        })    
      })
       
      }

  })

  socket.on('roomMessage',messageObj=>{
    buildMessageHtml(messageObj);
  })

  socket.on('getCurrentVideoState', async (message, sendResponse)=> {
        try {     
          const roomTab = await chrome.tabs.query({ url: `${roomInfo.url}?roomId=${roomInfo.roomId}` });
          const videoState = await chrome.tabs.sendMessage(roomTab[0].id,{type:"getCurrentVideoState"});
          sendResponse(videoState);
        } catch (error) {
            console.log("error en chatScript al getCurrentVideoState: ", error);
        }
  })

  socket.on('updateVideoState', async message => {
    try {
      console.log("updateVideoState: ", message)
      const {type, senderId, senderUsername} = message;
      if(socket.id !== senderId){
        const roomTab = await chrome.tabs.query({ url: `${roomInfo.url}?roomId=${roomInfo.roomId}` });
        switch (type) {
            case 'play':
              buildMessageHtml({...genericError, date: Date.now(),  content: `${senderUsername} le ha dado play al video.`})
              chrome.tabs.sendMessage(roomTab[0].id,{type:"updateVideoState", state: 'play'});
            break;
            case 'pause':
              buildMessageHtml({...genericError, date: Date.now(),  content: `${senderUsername} le ha dado pausa al video.`})
              chrome.tabs.sendMessage(roomTab[0].id,{type:"updateVideoState", state: 'pause'});
            break;
            case 'time':
              const time = message.time;
              buildMessageHtml({...genericError, date: Date.now(),  content: `${senderUsername} ha cambiado el tiempo del video a ${formatTime(time)}.`})
              chrome.tabs.sendMessage(roomTab[0].id,{type:"updateVideoState", state: 'time', time});
            break;
          default:
            break;
        }
      }

    } catch (error) {
      console.log("error en chatScript al videoStateChange: ", error);
    }
  })

  chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if(sender.tab.url === `${roomInfo.url}?roomId=${roomInfo.roomId}`){
      console.log("Mensaje recibido en chatScript.js:", message);
      console.log("sender: ", sender.tab.url);
      switch (message.type) {       
          case 'playback':
            switch (message.state) {
              case 'play':
                socket.emit('videoStateChange', {type: "play"})
                break;
              case 'pause':
                socket.emit('videoStateChange', {type: "pause"})
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


  function buildMessageHtml(message){
    const isAtBottom = ($messagesContainer.scrollTop + $messagesContainer.clientHeight) / $messagesContainer.scrollHeight;
    const $clone = d.importNode($messageTemplate, true);
    $clone.querySelector(".profileIcon").setAttribute("src", `./resources/profileIcons/${message.avatar}.png`);
    $clone.querySelector(".username").textContent = message.username;
    $clone.querySelector(".messageContent").textContent = message.content;
    $clone.querySelector(".messageDate").textContent = formatDate(message.date);
    if(message.avatarBackground){
      $clone.querySelector(".profileIcon").classList.add("profileIconBackground"+message.avatarBackground)
    }
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

