(async (d) => {
  
  const src = chrome.runtime.getURL("socket.io.esm.min.js");
  const socketModule = await import(src);
  const {io} = socketModule.default;
  const socket = io('http://localhost:9000');
  socket.on('connect', ()=>{
    console.log(`El cliente con la id ${socket.id} se ha conectado!`)
  })

  socket.on('roomMessage',messageObj=>{
    buildMessageHtml(messageObj);
  })

  const $input = d.querySelector(".sendMessageInput"),
  $sendBtn = d.querySelector(".sendMessageBtn"),
  $copyPartyLink = d.getElementById("clipPath"),
  $messageTemplate = d.getElementById("templateMessage").content,
  $messagesContainer = d.querySelector(".messages");
  let roomInfo = {},
  isHost = false,
  eventAlreadyHappened = false,
  username;

  chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log("Mensaje recibido en chatScript.js:", message);
    switch (message.type) {
      case "hostRoomJoined":
        if(!eventAlreadyHappened){
          isHost = true;
          username = message.username;
          roomInfo = await socket.emitWithAck('joinRoom',message.roomId);
          eventAlreadyHappened = true;
        }
        break;
      case "guestRoomJoined":
        if(!eventAlreadyHappened){
          isHost = false;
          username = message.username;
          roomInfo = await socket.emitWithAck('joinRoom',message.roomId);
          roomInfo.history.forEach(msg=>{
            buildMessageHtml(msg)
          })
          eventAlreadyHappened = true;
        }
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

