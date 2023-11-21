import initSelectAction from "./selectAction.js";

const d = document;
const $form = d.getElementById("userLoginForm"),
 $input = d.getElementById("userLoginInput"),
 $loginWindow = d.querySelector(".userLogin"),
 $selectActionWindow = d.querySelector('.selectAction');

initFlow();

function showSelectActions(){
    $loginWindow.classList.add("hide");
    $selectActionWindow.classList.remove("hide");
    initSelectAction();
}

async function initFlow(){
    const {username} = await chrome.storage.sync.get('username');
    if(username){
        showSelectActions();
    }else{
        $form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = $input.value;
        await chrome.storage.sync.set({username})
        showSelectActions();

    });
}
}
