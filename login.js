import initRoomsWithUser from "./rooms.js";
import ServerEndpoints from "./ServerEndpoints.js";

const d = document;
const $form = d.getElementById("userLoginForm");
const $input = d.getElementById("userLoginInput");
const $errorP = d.querySelector(".userLoginError");
const $loginWindow = d.querySelector(".userLogin");
const $roomsWindow = d.querySelector(".rooms");

$form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = $input.value;
    const rooms = await loginRequest();

    if (rooms) {
        $loginWindow.classList.add("hide");
        $roomsWindow.classList.remove("hide");
        initRoomsWithUser(username, rooms);
    } else {
        console.log("Error in joinRooms");
        $errorP.textContent = rooms.msg;
    }
});

const loginRequest = async () => {
    try {
        const response = await fetch(ServerEndpoints.getRooms, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (response.ok) {
            const rooms = await response.json();
            return rooms
        } else {
            throw new Error("HTTP request failed");
        }
    } catch (error) {
        console.error("Error in loginRequest", error);
        return { type: "error", msg: "Failed to connect to the server" };
    }
};
