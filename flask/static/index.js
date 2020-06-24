var selectedCorpus = -1

function selectCorpus(nCorpus){
    selectedCorpus = nCorpus
    $('.openCorpus').css("color", "")
    if (nCorpus > -1){
        $($('#openCorpus').find("a")[nCorpus]).css("color", "red")[0].scrollIntoView()
    }
}

$(window).bind("keydown", function(event){
    if (event.ctrlKey || event.metaKey) {
        if (String.fromCharCode(event.which).toLowerCase() == "p") {
            event.preventDefault()
            $("#filterOpenCorpus").focus()
        }
    }
    if (event.key == "ArrowDown" || event.key == "ArrowUp") {
        event.preventDefault()
    }
})

$(window).bind("keyup", function(){
    if (event.key == "ArrowDown" && selectedCorpus < $('#openCorpus').find("a").length-1) {
        event.preventDefault()
        selectCorpus(selectedCorpus+1)
    }
    if (event.key == "ArrowUp") {
        event.preventDefault()
        if (selectedCorpus > 0) {
            selectCorpus(selectedCorpus-1)
        } else {
            $("#filterOpenCorpus").focus()
        }
    }
    if (event.which == 13 && selectedCorpus > -1){
        window.location.href = $($('.openCorpus')[selectedCorpus]).attr('href')
    }
})

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
    selectCorpus(-1)
    $.ajax({
        url: "/api/loadCorpora/",
        method: "POST",
        data: {
            'key': key,
            'recent': key.length ? "" : getRecent().recent
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

$('#filterOpenCorpus').on('focus', function(){
    selectCorpus(-1)
    if (isMobile) {
        setTimeout(function(){
            window.scrollTo(0, $('#filterOpenCorpus').offset().top-30)
        }, 300)
    }
})

$('#filterOpenCorpus').on('keyup', function(e){
    key = $(this).val()
    if (e.key != "ArrowUp" && e.key != "ArrowDown") {
        loadCorpora(key)
    } else {
        $('#filterOpenCorpus').blur()
    }
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
    $('#filterOpenCorpus').val("")
    if (!isMobile) {
        $('#filterOpenCorpus').focus()
    }
    scrollTo(0,0)
})