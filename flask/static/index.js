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
        //window.location.href = 
        $('.openCorpus')[selectedCorpus].click()//.attr('href')
    }
})

var expirationDate = 'Fri, 31 Dec 9999 23:59:59 GMT'

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

function setRecent (newRecent) {
    recent = getRecent()
    recent.recent = newRecent
    document.cookie = "tr=" + JSON.stringify(recent) + '; expires=' + expirationDate
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
        if (key.length && data.data.toLowerCase().split("|").indexOf(key.toLowerCase()) >= 0) {
            pre_list = "<a class='text-muted'>Abrir " + key + "?</a>"
        }
        if (key.length && data.data.toLowerCase().split("|").indexOf(key.toLowerCase()) == -1) {
            pre_list = "<a class='text-muted'>Criar " + key + "?</a>"
        }
        if (!key.length) {
            pre_list = ""
        }
        new_data = ""
        for (x of data.data.split("|")) {
            new_data = new_data + "<li><a class='openCorpus' corpus='" + x + "' href='/corpus/" + x + "?file=README'>" + x + "</a></li>"
        }
        if (pre_list.length) {
            $('#randomTip').html(pre_list)
        }
        $('#openCorpus').html("")
        if (key.length) {
            $("#openCorpus").append(data.data.length ? new_data : new_data + "Nada encontrado.")
        } else {
            let recent = data["new_recent"]
            setRecent(recent)
            for (name of recent.split("|").reverse()){
                $('#openCorpus').append("<li><a corpus='" + name + "' class='openCorpus' href='/corpus/" + name + "?file=README'>" + name + "</a></li>")
            }
            $("#openCorpus").append(new_data)
        }
        $('#filterOpenCorpus').toggleClass("is-invalid", data.data.length ? false : true)
        $('.openCorpus').click(function(){
            addRecent($(this).attr('corpus'))
        })
    })
}

$('#filterOpenCorpus').on('focus', function(){
    selectCorpus(-1)
    if (isMobile) {
        setTimeout(function(){
            window.scrollTo(0, $('#filterOpenCorpus').offset().top-80)
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
    domain = window.location.href.match(/https?:\/\/(.*?)\//)[1].replace(/\//g, "")
    $('#tronco').html(domain == "tronco.ga" ? "tronco.ga" : "Tronco")
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