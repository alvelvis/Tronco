var expirationDate = 'Fri, 31 Dec 9999 23:59:59 GMT'

function getRecent (){
    if (document.cookie.indexOf("tr=") == -1){
        document.cookie = 'tr={"recent": ""}; expires=' + expirationDate
    }
    cookie = JSON.parse(document.cookie.split("tr=")[1].split("; ")[0])
    return cookie
}

function addRecent (newName){
    recent = getRecent()
    newRecent = []
    for (name of recent.recent.split("|")){
        if (name.length && name.toLowerCase() != newName.toLowerCase()){
            newRecent.push(name)
        }
    }
    newRecent.push(newName)
    recent.recent = newRecent.join("|")
    document.cookie = "tr=" + JSON.stringify(recent) +'; expires=' + expirationDate
}

function loadCorpora(key = ""){
    $.ajax({
        url: "/api/loadCorpora/",
        method: "POST",
        data: {
            'key': key
        }
    })
    .done(function(data){
        if (key.length) {
            $("#openCorpus").html(data.data.length ? data.data : "Nada encontrado. Que tal criar uma nova coleção?")
        } else {
            recent = getRecent().recent
            $('#openCorpus').html("")
            for (name of getRecent().recent.split("|").reverse()){
                $('#openCorpus').append("<li><a corpus='" + name + "' class='openCorpus' href='/corpus/" + name + "?file=README'>" + name + "</a></li>")
            }
            $("#openCorpus").append(data.data)
        }
        $('#filterOpenCorpus').toggleClass("is-invalid", data.data.length ? false : true)
        $('.openCorpus').click(function(e){
            //e.preventDefault()
            addRecent($(this).attr('corpus'))
        })
    })
}

$('#filterOpenCorpus').on('click', function(){
    if (isMobile) {
        setTimeout(function(){
            window.scrollTo(0, $('#filterOpenCorpus').offset().top-30)
        }, 300)
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
            addRecent(data.data)
            window.location.href = "/corpus/" + data.data + "?file=README"
        })
    }
})

$(window).ready(function(){
    if ($('#tronco:hidden').length) {
        isMobile = true
    } else {
        isMobile = false
    }
    loadCorpora()
    $('#filterOpenCorpus').focus()
})