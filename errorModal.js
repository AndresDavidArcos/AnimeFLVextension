const d = document;
const $errorModal = d.querySelector(".frame"),
$errorModalBtn = d.querySelector(".footer"),
$contentErrorMsg = d.querySelector(".contentErrorMsg");

$errorModalBtn.addEventListener("click", e => {
    // $errorModal.textContent = "";
    $errorModal.classList.add("hide");
})

const showError = (err) => {
    $errorModal.classList.remove("hide");
    $contentErrorMsg.textContent = err;
}

export {showError};