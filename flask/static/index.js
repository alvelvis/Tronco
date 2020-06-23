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

$('#filterOpenCorpus').on('click', function(){
    if (isMobile) {
        setTimeout(function(){
            window.scrollTo(0, $('#filterOpenCorpus').offset().top-30)
        }, 500)
    }
})

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
    if ($('#tronco:hidden').length) {
        isMobile = true
    }
    loadCorpora()
    $('#filterOpenCorpus').focus()
})