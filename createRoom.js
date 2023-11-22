import ServerEndpoints from "./ServerEndpoints.js";
import {showError} from "./errorModal.js";
import initHeader from "./header.js";

export default async function initCreateRoom() {
    const d = document;
    const username = await initHeader('.createRoomSection');

    let url = "",
        videoProvider = "",
        currentTab;

    const generateUniqueId = () => {
        return crypto.randomUUID();
    }

    const $createRoomForm = d.getElementById('createRoomForm');

    // Slider
    const $slider = d.getElementById('usersLimit'),
        $rangeDialogNumber = d.querySelector('.rangeDialogNumber'),
        $rangeNumber = d.querySelector('.rangeNumber'),
        maxLimit = $slider.max,
        minLimit = $slider.min;
    $rangeDialogNumber.style.left = calcDialogMovement(maxLimit, minLimit, $slider.offsetWidth, $slider.value) - 21 + 'px';
    $rangeNumber.textContent = $slider.value;

    $slider.addEventListener('input', e => {
        const userLimit = e.target.value;
        $rangeNumber.textContent = $slider.value;
        $rangeDialogNumber.style.left = calcDialogMovement(maxLimit, minLimit, $slider.offsetWidth, userLimit) - 21 + 'px';
    })
//Toggle
    const $toggle = d.querySelector('.toggle');
    $toggle.addEventListener('click', e => {
        d.querySelector('.toggleSlider').classList.toggle('toggleLeft');
        d.querySelector('.toggleUnlock').classList.toggle('hidePadlock');
        d.querySelector('.toggleLock').classList.toggle('hidePadlock');
        $toggle.classList.toggle('lock');
    })

    function calcDialogMovement(maxLimit, minLimit, width, currentLimit) {
        return ((currentLimit * width) / maxLimit) - minLimit;
    }

    $createRoomForm.addEventListener("submit", async e => {
        e.preventDefault();
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true})
            currentTab = tab;
            url = currentTab.url;
            const urlCleaner = new URL(url);
            url = urlCleaner.origin + urlCleaner.pathname

        } catch (error) {
            console.log("No se encontro una url");
        }

        try {
            videoProvider = await chrome.tabs.sendMessage(currentTab.id, {type: "videoRequest"});
        } catch (error) {
            console.log("No se encontro un video");
        }

        const regex = /^https:\/\/www3\.animeflv\.net\/ver\/.*$/;

        if (regex.test(url)) {

            if (videoProvider) {
                console.log("video encontrado!!!", videoProvider)
                const $partyNameInput = $createRoomForm.elements['partyName'];
                const partyName = $partyNameInput.value;
                const newRoomId = generateUniqueId()
                const partyData = {
                    roomId: newRoomId,
                    roomName: partyName,
                    avatar: "male",
                    username: username,
                    lock: $toggle.classList.contains('lock'),
                    usersLimit: $slider.value,
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
                        const tabs = await chrome.tabs.query({active: true, currentWindow: true})
                        chrome.tabs.sendMessage(tabs[0].id, {type: "roomCreated", partyData});
                    } else {
                        showError("Hubo un error al crear la room: " + response.message);
                    }
                } catch (error) {
                    console.error('Error creating room:', error);
                    showError("El servidor esta caido, contactate con el desarrollador para mas detalles");
                }
            } else {
                showError("No se encontro un video para iniciar la party, por favor, reproduce un video con YourUpload o SW.")
            }
        } else {
            showError("Para iniciar una party debes seleccionar un anime de la pagina AnimeFLV.")
        }
    })

}