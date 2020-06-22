let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
  // Update UI notify the user they can install the PWA
  showInstallPromotion();
});

installPwa.addEventListener('click', (e) => {
    // Hide the app provided install promotion
    hideMyInstallPromotion();
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
    });
  });

function loadCorpora(key = ""){
    $.ajax({
        url: "/api/loadCorpora/",
        method: "POST",
        data: {
            'key': key
        }
    })
    .done(function(data){
        $("#openCorpus").html(data.data.length ? data.data : "Nada encontrado. Que tal criar uma nova coleção?</a>")
        $('#filterOpenCorpus').toggleClass("is-invalid", data.data.length ? false : true)
    })
}

$('#filterOpenCorpus').on('keyup', function(e){
    key = $(this).val()
    loadCorpora(key)
    if (e.which == 13){
        $.ajax({
            url: '/api/findOrCreateCorpus',
            method: 'POST',
            data: {
                'name': $(this).val()
            }
        })
        .done(function(data){
            window.location.href = "/corpus/" + data.data + "?file=README"
        })
    }
})

$(window).ready(function(){
    loadCorpora()
    $('#filterOpenCorpus').focus()
})