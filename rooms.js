
import { showError } from "./errorModal.js";

export default function initRoomsWithUser(user, rooms, socket){
    const d = document;
    const $roomTemplate = d.getElementById("template-room").content,
    $fragment = d.createDocumentFragment(),
    $roomsFragment = d.createDocumentFragment(),
    $container = d.querySelector(".roomsContainer"),
    $createRoomForm = d.getElementById("createRoomForm"),
    $createRoomError = d.querySelector(".createRoomError"),
    roomContentTest = [
        {
            iconSrc: "female",
            usersConnected: 5,
            lock: true,
            username: 'Amelia',
            roomName: 'Party pa ver jujutsu',
        },
        {
            iconSrc: "male",
            usersConnected: 10,
            lock: false,
            username: 'Gomas',
            roomName: 'You have no enemies',
        }
    ];

    let url = "",
    videoFounded = false;

    roomContentTest.forEach(el => {
        const $clone = d.importNode($roomTemplate, true);
        $clone.querySelector(".profileIcon").setAttribute("src", `./resources/profileIcons/${el.iconSrc}.png`);
        $clone.querySelector(".usersConnectedNumber").textContent = el.usersConnected;
        $clone.querySelector(".lock").setAttribute("src", el.lock ? "resources/tools/lock.svg" : "resources/tools/unlock.svg");
        $clone.querySelector(".username").textContent = el.username;
        $clone.querySelector(".roomName").textContent = el.roomName;
        $fragment.appendChild($clone);
    })
    $container.appendChild($fragment);

    for(const roomId in rooms){
        const room = rooms[roomId];
        const $clone = d.importNode($roomTemplate, true);
        $clone.querySelector(".profileIcon").setAttribute("src", `./resources/profileIcons/${room.iconSrc}.png`);
        $clone.querySelector(".usersConnectedNumber").textContent = room.usersConnected;
        $clone.querySelector(".lock").setAttribute("src", room.lock ? "resources/tools/lock.svg" : "resources/tools/unlock.svg");
        $clone.querySelector(".username").textContent = room.username;
        $clone.querySelector(".roomName").textContent = room.roomName;
        $roomsFragment.appendChild($clone);
    }
    $container.appendChild($roomsFragment);

    $createRoomForm.addEventListener("submit", async e => {
        e.preventDefault();
        try {
            const tabs = await chrome.tabs.query({active:true, currentWindow: true})
            url = await chrome.tabs.sendMessage(tabs[0].id,{type:"urlRequest"});
        } catch (error) {
            console.log("No se encontro una url");
        }
        const regex = /^https:\/\/www3\.animeflv\.net\/ver\/.*$/;

        try {
            const tabs = await chrome.tabs.query({active:true, currentWindow: true})
            videoFounded = await chrome.tabs.sendMessage(tabs[0].id,{type:"videoRequest"});
        } catch (error) {
            console.log(error)
        }

        if (regex.test(url)) {

            if(videoFounded){
                console.log("video encontrado!!!")
            }else{
                showError("No se encontro un video para iniciar la party, por favor, reproduce un anime.")
            }
        }else{
                showError("Para iniciar una party debes seleccionar un anime de la pagina AnimeFLV.")
            }


        const $partyNameInput = $createRoomForm.elements['partyName'];
        const partyName = $partyNameInput.value;
        const serverRes = await socket.emitWithAck("createRoomRequest", {partyName, user});
        if(serverRes.status === "success"){
            
        }else{
            $createRoomError.textContent = serverRes.msg;
        }
    })

}