$('#indexGo').click(function(){
    if (!$('#filterOpenCorpus').val()) {
        $('#filterOpenCorpus').toggleClass("is-invalid", true)
    } else {
        $.ajax({
            url: '/api/findOrCreateCorpus',
            method: 'POST',
            data: {
                'name': $('#filterOpenCorpus').val()
            }
        })
        .done(function(data){
            addRecent(data.data.split(":l")[0])
            window.location.href = "/corpus/" + data.data + "?file=README"
        })
    }
})

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
    /*if (event.key == "ArrowDown" || event.key == "ArrowUp") {
        event.preventDefault()
    }*/
})
/*
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
})*/

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
        if (key.length && data.data.toLowerCase().replace(/:l/g, "").split("|").indexOf(key.toLowerCase()) >= 0) {
            pre_list = "<a class='text-muted'>Abrir " + key + "?</a>"
        }
        if (key.length && data.data.toLowerCase().replace(/:l/g, "").split("|").indexOf(key.toLowerCase()) == -1) {
            pre_list = "<a class='text-muted'>Criar " + key + "?</a>"
        }
        if (!key.length) {
            pre_list = ""
        }
        new_data = ""
        for (x of data.data.split("|")) {
            if (is_local || key.length) {
                new_data = new_data + '<li class="list-group-item"><a class="openCorpus" corpus="' + x.split(":l")[0] + '" href="/corpus/' + x.split(":l")[0] + '?file=README">' + (x.indexOf(":l") >= 0 ? '<span class="pt-2 mr-1" title="Visitantes não podem visualizar" data-feather="lock"></span>' : "") + "<span>" + x.split(":l")[0] + '</span></a></li>'
            }
        }
        if (pre_list.length) {
            $('#randomTip').html(pre_list)
        }
        $('#openCorpus').html("")
        if (key.length) {
            $("#openCorpus").append(data.data.length ? new_data : new_data + "<span class='mt-3'>Nada encontrado.</span>")
        } else {
            let recent = data["new_recent"]
            setRecent(recent.replace(/:l/g, ""))
            for (name of recent.split("|").reverse()){
                $('#openCorpus').append('<li class="list-group-item"><a class="openCorpus" corpus="' + name.split(":l")[0] + '" href="/corpus/' + name.split(":l")[0] + '?file=README">' + (name.indexOf(":l") >= 0 ? '<span class="pt-2 mr-1" title="Visitantes não podem visualizar" data-feather="lock"></span>' : "") + "<span>" + name.split(":l")[0] + '</span></a></li>')
            }
            $("#openCorpus").append(new_data)
        }
        //$('#filterOpenCorpus').toggleClass("is-invalid", data.data.length ? false : true)
        $('.openCorpus').click(function(){
            addRecent($(this).attr('corpus').split(":l")[0])
        })
        checkTheme()
        feather.replace()
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
        $('#indexGo').click()
    }
})

function checkTheme(){
    theme = document.cookie.split("theme=")[1].split("; ")[0]
    elements = "#mainDiv, #footer, li, #openCorpus, #filterOpenCorpus, html"
    if (theme == "dark") {
        $('#moon-div').html("<span data-feather='sun'></span>")
        feather.replace()
        $(elements).css("background-color", "#343a40").css("color", "white")
    } else {
        $('#moon-div').html("<span data-feather='moon'></span>")
        feather.replace()
        $(elements).css("background-color", "").css("color", "")
    }
}

$('#toggleTheme').click(function(){
    theme = document.cookie.split("theme=")[1].split("; ")[0]
    if (theme == "dark") {
        document.cookie = "theme=light; expires=" + expirationDate
    } else {
        document.cookie = "theme=dark; expires=" + expirationDate
    }
    checkTheme()
})

$(window).ready(function(){
    feather.replace()
    domain = window.location.href.match(/https?:\/\/(.*?)\//)[1].replace(/\//g, "")
    $('#tronco').html(domain == "tronco.ga" ? "tronco.ga" : "Tronco")
    if ($('#tronco:hidden').length) {
        isMobile = true
    } else {
        isMobile = false
    }
    $('#footer').toggleClass("fixed-bottom", !isMobile)
    loadCorpora()
    $('#filterOpenCorpus').val("")
    if (!isMobile) {
        $('#filterOpenCorpus').focus()
    }
    scrollTo(0,0)
    if (window.location.href.match(/app=true/)) {
        $('#downloadTronco').toggleClass("h1", true)
        $('#downloadTronco').slideToggle(2000)
    } else {
        $('#aboutTronco, #downloadTronco, #toggleTheme').show()
    }
    $('#leadToggle').toggle(!is_local)
    checkTheme()
})