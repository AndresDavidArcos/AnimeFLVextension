export default async function initHeader(sectionClass) {
    const d = document;
    const {username} = await chrome.storage.sync.get('username');
    const $header = d.querySelector(sectionClass+'Header');
    $header.querySelector('.headerUsername').textContent = username;
    $header.querySelector('.headerLeft').addEventListener('click', e => {
        d.querySelector(sectionClass).classList.add('hide');
        d.querySelector('.selectAction').classList.remove('hide');
    })
    return username;
}