document.addEventListener('DOMContentLoaded', function() {

    var url = 'http://127.0.0.1:5241/GUI-is-still-open'; 
    fetch(url, { mode: 'no-cors'});
    setInterval(function(){ fetch(url, { mode: 'no-cors'});}, 5000);//();

});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register("/static/pwabuilder-sw.js");
  }