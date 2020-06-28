document.addEventListener('DOMContentLoaded', function() {

    if (window.location.href.match(/127.0.0.1|localhost/)) {
        var url = 'http://127.0.0.1:5241/GUI-is-still-open'; 
        fetch(url, { mode: 'no-cors'});
        setInterval(function(){ fetch(url, { mode: 'no-cors'});}, 5000);//();
    }

});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register("/pwabuilder-sw", {scope: '/'});
  }