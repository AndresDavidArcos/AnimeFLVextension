const socket = io('http://localhost:9000');
socket.on('connect', ()=>{
  console.log("Connected!")
  socket.emit('clientConnect');
})

socket.on('welcome', data =>{
  console.log(data);
})



const d = document;
const $mensajeContainer = d.querySelector(".mensajeContainer");
const $input = d.querySelector(".inputMensaje");
const $clipPath = d.getElementById("clipPath");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Mensaje recibido en el script interno:", message);
});

function agregarMensaje() {

  const mensaje = $input.value;
  if (mensaje) {
    const $mensaje = d.createElement('p');
    $mensaje.textContent = mensaje;
    $mensaje.classList.add('mensaje');
    $mensajeContainer.appendChild($mensaje);
    $input.value = '';
  }
}

function generateUniqueId() {
    const timestamp = Date.now();
    const random = Math.random();
    const uniqueId = Math.floor(timestamp * random);
  
    return uniqueId.toString();
  }

  const partyId = generateUniqueId();
  
  function partyLink() {
    const actualLink = window.location.href;
    const roomLink = actualLink + `?partyId=${partyId}`;
    console.log(roomLink);
    return roomLink;
  }
   


// Manejar el evento de clic en el botón de enviar
const $botonEnviar = d.querySelector(".botonEnviar");
$botonEnviar.addEventListener('click', agregarMensaje);

//Event delegation for all click events:
d.addEventListener("click", e => {

    if(e.target.matches("#clipPath")) console.log("jejejeje", partyLink());
})