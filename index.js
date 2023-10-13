const d = document;

if(window.frameElement === null && window.location.origin === "https://www3.animeflv.net"){
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const $chatIframe = d.createElement('iframe');
    $chatIframe.src = chrome.runtime.getURL('chatView.html');
    $chatIframe.style.width = `${viewportWidth * 0.2}px`;
    $chatIframe.style.height = `${viewportHeight * 0.7}px`;
    $chatIframe.style.position = 'absolute';
    $chatIframe.style.top = '100px';
    $chatIframe.style.right = '-100px';    
    const $animeNews = d.querySelector(".CpCnC"); 
    $animeNews.style.top = "700px"
    $animeNews.insertAdjacentElement('beforebegin', $chatIframe);
}

d.querySelectorAll("video").forEach((item) => {
    console.log("video encontrado", item)
    item.addEventListener("play", function() {
        chrome.runtime.sendMessage({ type: "playback", state: "play" });
    });
        
    item.addEventListener("pause", function() {
        chrome.runtime.sendMessage({ type: "playback", state: "pause" });
     });
        
     item.addEventListener("seeked", function() {
        chrome.runtime.sendMessage({ type: "videoTimeChange", time: item.currentTime });
  });   
});

