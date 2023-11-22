
import { showError } from "./errorModal.js";
import ServerEndpoints from "./ServerEndpoints.js";
import initHeader from "./header.js";

export default async function initRooms() {
    const d = document;
    const username = await initHeader('.rooms');

    const $roomTemplate = d.getElementById("template-room").content,
        $roomsFragment = d.createDocumentFragment(),
        $container = d.querySelector(".roomsContainer"),
        $emptyState = d.querySelector('.roomsEmptyStateContainer');

    let rooms = {};


    loadRooms();

    async function loadRooms() {
        try {
            const response = await fetch(ServerEndpoints.getRooms, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (response.ok) {
                rooms = await response.json();
                for (const roomId in rooms) {
                    $emptyState.classList.contains('hide') || $emptyState.classList.add('hide')
                    const room = rooms[roomId];
                    if (!room.lock) {
                        const $clone = d.importNode($roomTemplate, true);
                        $clone.querySelector(".profileIcon").setAttribute("src", `./resources/profileIcons/${room.avatar}.png`);
                        $clone.querySelector(".usersConnectedNumber").textContent = `${room.usersConnected}/${room.usersLimit}`;
                        $clone.querySelector(".username").textContent = room.username;
                        $clone.querySelector(".roomName").textContent = room.roomName;
                        $clone.querySelector(".roomEnterBtn").setAttribute("data-roomId", room.roomId);
                        $roomsFragment.appendChild($clone);
                    }
                }
                $container.appendChild($roomsFragment);

            } else {
                throw new Error(response.msg);
            }

        } catch (error) {
            showError("El servidor esta caido, para mas detalles, contactate con el desarrollador.")
        }
    }

    d.addEventListener("click", e => {
        if (e.target.matches(".roomEnterBtn")) {
            const roomId = e.target.getAttribute("data-roomId");
            const thisRoom = rooms[roomId];
            window.open(`${thisRoom.url}?roomId=${roomId}`, "_blank")
        }
    })

}