
import { showError } from "./errorModal.js";
import ServerEndpoints from "./ServerEndpoints.js";

export default function initRoomsWithUser(user){
    const d = document;
    const generateUniqueId = () => {
        return crypto.randomUUID();
    }
    const $roomTemplate = d.getElementById("template-room").content,
    $roomsFragment = d.createDocumentFragment(),
    $container = d.querySelector(".roomsContainer"),
    $createRoomForm = d.getElementById("createRoomForm"),
    $createRoomError = d.querySelector(".createRoomError");

    let url = "",
    videoProvider = "",
    rooms = {};
    
    loadRooms();

async function loadRooms(){
    try {
        const response = await fetch(ServerEndpoints.getRooms, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (response.ok) {
            rooms = await response.json();
            for(const roomId in rooms){
                const room = rooms[roomId];
                const $clone = d.importNode($roomTemplate, true);
                $clone.querySelector(".profileIcon").setAttribute("src", `./resources/profileIcons/${room.avatar}.png`);
                $clone.querySelector(".usersConnectedNumber").textContent = room.usersConnected;
                $clone.querySelector(".lock").setAttribute("src", room.lock ? "resources/tools/lock.svg" : "resources/tools/unlock.svg");
                $clone.querySelector(".username").textContent = room.username;
                $clone.querySelector(".roomName").textContent = room.roomName;
                $clone.querySelector(".roomEnterBtn").setAttribute("data-roomId", room.roomId);
                $roomsFragment.appendChild($clone);
            }
            $container.appendChild($roomsFragment);            
        } else {
            throw new Error(response.msg);
        }

    } catch (error) {
        console.log("Error al cargar las rooms", error);
        showError("Error al cargar las rooms: ", error)
    }


}


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
        } catch (error) {
            console.log("No se encontro un video");
        }

        const regex = /^https:\/\/www3\.animeflv\.net\/ver\/.*$/;

        if (regex.test(url)) {

            if(videoProvider){
                console.log("video encontrado!!!", videoProvider)
                const $partyNameInput = $createRoomForm.elements['partyName'];
                const partyName = $partyNameInput.value; 
                const newRoomId = generateUniqueId()           
                const partyData = {
                    roomId: newRoomId,
                    roomName: partyName,
                    avatar: "male",
                    username: user,
                    url: url,
                    videoProvider: videoProvider
                }

                try {
                    const response = await fetch(ServerEndpoints.createRoom, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(partyData)
                    });
            
                    if (response.ok) {
                        const tabs = await chrome.tabs.query({active:true, currentWindow: true})
                        chrome.tabs.sendMessage(tabs[0].id,{type:"roomCreated", partyData});      
                    } else {
                        showError("Hubo un error al crear la room: "+response.message);
                    }
                } catch (error) {
                    console.error('Error creating room:', error);
                }                   
            }else{
                showError("No se encontro un video para iniciar la party, por favor, reproduce un video con YourUpload o SW.")
            }
        }else{
                showError("Para iniciar una party debes seleccionar un anime de la pagina AnimeFLV.")
            }
    })

    d.addEventListener("click", e => {
        if(e.target.matches(".roomEnterBtn")){
            const roomId = e.target.getAttribute("data-roomId");
            const thisRoom = rooms[roomId];
            window.open(`${thisRoom.url}?roomId=${roomId}`,"_blank")
        }
    })

}