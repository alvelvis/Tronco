if (document.cookie.indexOf("theme=") == -1){
    document.cookie = "theme=light; expires=" + expirationDate
}
/*
document.addEventListener('DOMContentLoaded', function() {

    if (window.location.href.match(/127.0.0.1|localhost/)) {
        var url = 'http://127.0.0.1:5241/GUI-is-still-open';
        fetch(url, { mode: 'no-cors'});
        setInterval(function(){ fetch(url, { mode: 'no-cors'});}, 5000)();
    }

});*/

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register("/pwa");
}

let deferredPrompt

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault()
  // Stash the event so it can be triggered later.
  deferredPrompt = e
  // Update UI notify the user they can install the PWA
  //showInstallPromotion();
  if (!window.location.href.match(/127\.0\.0\.1|localhost/)){
    $('#downloadTronco').attr('href', "#").html("Baixe o aplicativo")
    var target_href = ""
  } else {
    var target_href = "_blank"
  }
})

if (window.location.href.match(/127\.0\.0\.1|localhost/)){
    $('[target="_blank"]').attr('target', "")
}

$('#downloadTronco').click(function(e){
    if (deferredPrompt) {
        e.preventDefault()
        // Hide the app provided install promotion
        //hideMyInstallPromotion();
        // Show the install prompt
        deferredPrompt.prompt()
        // Wait for the user to respond to the prompt
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt')
            } else {
            console.log('User dismissed the install prompt')
            }
        })
    }

})