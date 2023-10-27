const d = document;
const $mensajeContainer = d.querySelector(".mensajeContainer"),
$input = d.querySelector(".inputMensaje"),
$botonEnviar = d.querySelector(".botonEnviar"),
$copyPartyLink = d.getElementById("clipPath");
let partyData = {};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Mensaje recibido en chatScript.js:", message);
  switch (message.type) {
    case "getPartyData":
      partyData = message.partyData;
      break;
  
    default:
      break;
  }
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

function partyLinkToClipboard(){
  navigator.clipboard.writeText(`${partyData.url}?partyId=${partyData.roomId}`);
}

$botonEnviar.addEventListener('click', agregarMensaje);

$copyPartyLink.addEventListener("click", partyLinkToClipboard)