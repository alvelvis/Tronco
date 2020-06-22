function loadCorpora(key = ""){
    $.ajax({
        url: "/api/loadCorpora/",
        method: "POST",
        data: {
            'key': key
        }
    })
    .done(function(data){
        $("#openCorpus").html(data.data.length ? data.data : "Nada encontrado. Criar este corpus?</a>")
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