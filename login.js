import initRoomsWithUser from "./rooms.js";

const d = document;
const $form = d.getElementById("userLoginForm");
const $input = d.getElementById("userLoginInput");
const $errorP = d.querySelector(".userLoginError");
const $loginWindow = d.querySelector(".userLogin");
const $roomsWindow = d.querySelector(".rooms");
initFlow();

function showRooms(username){
    $loginWindow.classList.add("hide");
    $roomsWindow.classList.remove("hide");
    initRoomsWithUser(username);
}

async function initFlow(){
    const {username} = await chrome.storage.sync.get('username');
    if(username){
        showRooms(username)
    }else{
        $form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = $input.value;
        chrome.storage.sync.set({username})
        showRooms(username);
    });
}
}
