import {io} from "./socket.io.esm.min.js"
import initRoomsWithUser from "./rooms.js";
const socket = io('http://localhost:9000');

socket.on('connect', ()=>{
    console.log("un cliente se ha conectado!")
})

const d = document;
const $form = d.getElementById("userLoginForm"),
$input = d.getElementById("userLoginInput"),
$errorP = d.querySelector(".userLoginError"),
$loginWindow = d.querySelector(".userLogin"),
$roomsWindow = d.querySelector(".rooms")

$form.addEventListener("submit", e => {
    e.preventDefault();
    const username = $input.value;
    joinRooms(username);
})

const joinRooms = async(username) => {
    const serverRes = await socket.emitWithAck('loginRequest', username);
    if(serverRes.type === "success"){
        $loginWindow.classList.add("hide");
        $roomsWindow.classList.remove("hide");
        initRoomsWithUser(username, serverRes.rooms, socket);
    }else{
        $errorP.textContent = serverRes.msg;
    }
}

