
import { showError } from "./errorModal.js";

export default function initRoomsWithUser(user, rooms, socket){
    const d = document;
    const generateUniqueId = () => {
        return crypto.randomUUID();
    }
    const $roomTemplate = d.getElementById("template-room").content,
    $fragment = d.createDocumentFragment(),
    $roomsFragment = d.createDocumentFragment(),
    $container = d.querySelector(".roomsContainer"),
    $createRoomForm = d.getElementById("createRoomForm"),
    $createRoomError = d.querySelector(".createRoomError"),
    roomContentTest = [
        {
            roomId: generateUniqueId(),
            iconSrc: "female",
            username: 'Amelia',
            roomName: 'Party pa ver jujutsu',
            url: 'https://www3.animeflv.net/ver/jujutsu-kaisen-2nd-season-14',
            videoProvider: 'YourUpload',            
            lock: true,
            usersConnected: 5
        },
        {
            roomId: generateUniqueId(),
            iconSrc: "male",
            username: 'Gomas',
            roomName: 'Goblin slayer',
            url: 'https://www3.animeflv.net/ver/goblin-slayer-ii-4',
            videoProvider: 'SW',
            lock: false,            
            usersConnected: 10

        }
    ];

    let url = "",
    videoProvider = "";

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

        try {
            const tabs = await chrome.tabs.query({active:true, currentWindow: true})
            videoProvider = await chrome.tabs.sendMessage(tabs[0].id,{type:"videoRequest"});
            console.log("videoFounded: ", videoProvider)
        } catch (error) {
            console.log("No se encontro un video");
        }

        const regex = /^https:\/\/www3\.animeflv\.net\/ver\/.*$/;

        if (regex.test(url)) {

            if(videoProvider){
                console.log("video encontrado!!!")
                const $partyNameInput = $createRoomForm.elements['partyName'];
                const partyName = $partyNameInput.value; 
                const newRoomId = generateUniqueId()           
                const partyData = {
                    roomId: newRoomId,
                    roomName: partyName,
                    iconSrc: "female",
                    username: user,
                    url: url,
                    videoProvider: videoProvider
                }
                 socket.emit("createRoomRequest", partyData);
                
                 try {
                    const tabs = await chrome.tabs.query({active:true, currentWindow: true})
                    chrome.tabs.sendMessage(tabs[0].id,{type:"roomCreated", partyData});      
                 } catch (error) {
                    console.log("error ocurrido al crear la room: ",error)
                 }           

            }else{
                showError("No se encontro un video para iniciar la party, por favor, reproduce un video con YourUpload o SW.")
            }
        }else{
                showError("Para iniciar una party debes seleccionar un anime de la pagina AnimeFLV.")
            }
    })

}