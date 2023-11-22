import initRooms from "./rooms.js";
import initCreateRoom from "./createRoom.js"
export default function initSelectAction() {
    const d = document;
    const $join = d.querySelector('.actionJoin'),
        $create = d.querySelector('.actionAdd'),
        $selectAction = d.querySelector('.selectAction');

    $join.addEventListener('click', () => {
        d.querySelector(".rooms").classList.remove('hide');
        $selectAction.classList.add('hide');
        initRooms();
    })

    $create.addEventListener('click', () => {
        d.querySelector(".createRoomSection").classList.remove('hide');
        $selectAction.classList.add('hide');
        initCreateRoom();
    })

}

