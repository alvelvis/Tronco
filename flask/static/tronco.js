document.addEventListener('DOMContentLoaded', function() {

    var url = 'http://127.0.0.1:5241/GUI-is-still-open'; 
    fetch(url, { mode: 'no-cors'});
    setInterval(function(){ fetch(url, { mode: 'no-cors'});}, 5000);//();

});

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Update UI notify the user they can install the PWA
    showInstallPromotion();
});

$('#downloadTronco').click(function(e){
    if (isMobile) {
        e.preventDefault()
        // Hide the app provided install promotion
        hideMyInstallPromotion();
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
    };
})