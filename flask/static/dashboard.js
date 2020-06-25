window.addEventListener("beforeunload", function(){
    //storeSessionPreviousToken(getSessionToken())
    //revokeToken()
})

function revokeToken(filename=$('#filename').attr('file')) {
    $.post("/api/revokeToken", {
        "name": name,
        "filename": filename,
        'token': getSessionToken(),
    })
}

function shouldReload(should){
    $('#mainText').prop("readOnly", should)
    $('#reloadPage').toggle(should)
    if (should) {
        reloadPage.scrollIntoView()
    }
}

$('.toolbarButton').click(function(){
    $("#toolbar").toggle(false)
    if ($("[toolbar='" + $(this).attr('id') + "']") && $("[toolbar='" + $(this).attr('id') + "']").length) {
        $("[toolbar='" + $(this).attr('id') + "']").toggle(true)
    }
})

$('#reloadPage').click(function(){
    window.location.reload()
})

$('#shareText').click(function(){
    $('#shareLink').val(window.location.href.match(/^.*\//)[0] + $('#name').html().replace(/\s/g, "%20") + "?file=" + $('#filename').attr('file').replace(/\s/g, "%20"))
    $('#shareLink').show()
    $('#shareLink').select()
    document.execCommand('copy')
    $('#shareLink').hide()
    $('#shareLinkLabel').html("Link copiado!")
    $('#shareText').toggleClass("btn-success", true)
    $('#shareText').toggleClass("btn-outline-secondary", false)
    setTimeout(function(){
        $('#shareText').toggleClass("btn-success", false)
        $('#shareText').toggleClass("btn-outline-secondary", true)
        $('#shareLinkLabel').html("Compartilhar")
    }, 2000)
})

$('#mainText').on("focus", function(){

    if (isMobile) {
        $('#mainHeadbar').toggle(false)
        $('#search').toggle(false)
        $('#troncoHome').toggle(false)
        $('#sidebar').toggleClass("d-none", true)
    }

})

$('#mainText').on("blur", function(){
    if (isMobile) {
        $('#mainHeadbar').toggle(true)
        $('#search').toggle(true)
        $('#troncoHome').toggle(true)
    }
})

$('#search').on('focus', function(){
    window.scrollTo(0, 0)
    $('#recentFiles').toggle(true)
})

$('.togglePerm').on('change', function(){
    name = $('#name').html()
    perm = $(this).attr('perm')
    value = $(this).prop("checked")
    $.ajax({
        url: '/api/togglePerm',
        method: "POST",
        data: {
            "name": name,
            "perm": perm,
            "value": value,
            "password": getPassword(name)
        }
    })
})

$('#setPermissions').click(function(){
    $('#permissionsDiv').toggle()
})

$('#setPassword').click(function(){
    name = $('#name').html()
    new_password = prompt("Insira uma nova senha para " + name + ":")
    if (new_password && new_password.length) {
        new_password_twice = prompt("Insira novamente a senha, por favor:")
        if (new_password_twice && new_password_twice.length) {
            if (new_password == new_password_twice) {
                $.ajax({
                    url: "/api/setPassword",
                    method: "POST",
                    data: {
                        'name': name,
                        'new_password': new_password,
                        "password": getPassword(name)
                    }
                })
                .done(function(){
                    storePassword(name, new_password)
                    validatePassword(name)
                })
            } else {
                alert("As senhas não coincidem!")
            }
        }
    }
})

$('#changePassword').click(function(){
    name = $('#name').html()
    if (!permSetup || getPassword(name) != "default") {
        password = prompt("Insira a senha para " + name + ":")
        if (password && password.length){
            storePassword(name, password)
            validatePassword(name)
        }
    } else {
        $('#setPassword').click()
    }
})

var expirationDate = 'Fri, 31 Dec 9999 23:59:59 GMT'
var permissions = []

function validatePassword (name){
    
    if (document.cookie.indexOf("tp=") == -1 || document.cookie.indexOf("<troncoPasswords>") >= 0){
        document.cookie = "tp={}; expires=" + expirationDate
    }

    if (document.cookie.indexOf("st=") == -1){
        document.cookie = "st={}; expires=" + expirationDate
    }

    if (document.cookie.indexOf("spt=") == -1){
        document.cookie = "spt={}; expires=" + expirationDate
    }
    
    password = getPassword(name)
    $.ajax({
        url: '/api/validatePassword',
        method: 'POST',
        data: {
            'name': name,
            'password': password
        }
    })
    .done(function(data){
        permissions = data.permissions.split("|")
        permView = permissions.indexOf("visualizar") >= 0
        permEdit = permissions.indexOf("editar") >= 0
        permSetup = permissions.indexOf("configurar") >= 0
        if (permSetup) { permEdit = true }
        if (!permEdit) { permSetup = false }
        $('#conected').html(password == "default" && permSetup ? "Crie uma senha" : (permSetup ? "Você é dono" : (permEdit ? "Você pode editar" : (permView ? "Você pode visualizar" : "Você não tem permissões"))))
        $('#permissionsSettings').toggle(password == "default" ? false : (permSetup ? true : false))
        if (isMobile) {
            $('#corpusSettings').toggle(permSetup)
        }
        $('#mainText').prop('readonly', !permEdit)
        $('#saveModifications').attr('disabled', !permEdit)
        $('#menu-svg').toggle(permSetup)
        storeSessionToken(data.token)
        loadConfig()
    })
    return true
}

function storeSessionPreviousToken(token) {
    sessionToken = JSON.parse(document.cookie.split("spt=")[1].split("; ")[0])
    sessionToken['token'] = token
    document.cookie = "spt=" + JSON.stringify(sessionToken) + "; expires=" + expirationDate
}

function getSessionPreviousToken() {
    sessionToken = JSON.parse(document.cookie.split("spt=")[1].split("; ")[0])
    return sessionToken.token
}

function storeSessionToken(token) {
    sessionToken = JSON.parse(document.cookie.split("st=")[1].split("; ")[0])
    sessionToken['token'] = token
    document.cookie = "st=" + JSON.stringify(sessionToken) + "; expires=" + expirationDate
}

function getSessionToken() {
    sessionToken = JSON.parse(document.cookie.split("st=")[1].split("; ")[0])
    return sessionToken.token
}

function storePassword (name, pass){
    troncoPasswords = JSON.parse(document.cookie.split("tp=")[1].split("; ")[0])
    troncoPasswords[name] = pass
    document.cookie = "tp=" + JSON.stringify(troncoPasswords) +'; expires=' + expirationDate
}

function getPassword (name){
    troncoPasswords = JSON.parse(document.cookie.split("tp=")[1].split("; ")[0])
    if (name in troncoPasswords){
        return troncoPasswords[name]
    } else {
        return "default"
    }
}

function revokePassword (name){
    troncoPasswords = JSON.parse(document.cookie.split("tp=")[1].split("; ")[0])
    delete troncoPasswords[name]
    document.cookie = "tp=" + JSON.stringify(troncoPasswords) +'; expires=' + expirationDate
}

$('#search').on('keyup', function(e){
    filename = $(this).val()
    recentFiles(filename, filename)
    if (e.which == 13){
        $.ajax({
            url: '/api/findOrCreateFile',
            method: 'POST',
            data: {
                "name": $('#name').html(),
                "filename": filename,
                "password": getPassword(name)
            }
        })
        .done(function(data){
            //recentFiles("", filename)
            updateFiles("", data.data)
            $('#search').val('')
        })
    }
})

function recentFiles(key = "", typing = ""){
    $('#search').val(key)
    $.ajax({
        url: '/api/recentFiles',
        method: "POST",
        data: {
            "name": $('#name').html(),
            "key": key,
            "password": getPassword(name)
        }
    })
    .done(function(data){
        if (typing.length) {
            new_data = '<li class="breadcrumb-item">' + (data.data.toLowerCase().split("|").indexOf(typing.toLowerCase()) >= 0 ? 'Abrir ' + typing + '?' : 'Criar ' + typing + '?') + "</li>"
        } else {
            new_data = ""
        }
        for (x of data.data.split("|")){
            if (x !== "README"){
                new_data = new_data + '<li class="breadcrumb-item"><a class="recentFiles" href="#" file="' + x + '">' + (x == "README" ? "Introdução" : x) + '</a></li>'
            }
        }
        $('#recentFiles').html(data.data.length ? new_data : new_data + 'Nenhum arquivo encontrado.')
        $('.recentFiles').click(function(){
            $('[file="' + $(this).attr('file') + '"].files').click()
        })
    })
}

$('#deleteCorpus').click(function(){
    name = $('#name').html()
    confirmName = prompt("Digite o nome da coleção (" + name + ") para confirmar que deseja excluí-lo:")
    if (confirmName && confirmName.length && confirmName == name) {
        $.ajax({
            url: '/api/deleteCorpus',
            method: 'POST',
            data: {
                'name': name,
                "password": getPassword(name)
            }
        })
        .done(function(){
            window.location.href = "/"
        })
    } else {
        if (confirmName && confirmName.length) {
            alert("Nome da coleção não confere.")
        }
    }
})

$('#renameCorpus').click(function(){
    name = $('#name').html()
    new_name = prompt("Dê um novo nome para " + name + ":", name)
    if (new_name && new_name.length){
        $.ajax({
            url: '/api/renameCorpus',
            method: 'POST',
            data: {
                "name": name,
                "new_name": new_name,
                "password": getPassword(name)
            }
        })
        .done(function(data){
            if (data.data != "false"){
                storePassword(new_name, getPassword(name))
                //revokePassword(name)
                window.location.href = "/corpus/" + data.data
            } else {
                alert("Coleção " + new_name + " já existe!")
            }
        })
    }
})

$('.toggleSettings').click(function(){
    if (isMobile && $('#mainHeadbar:hidden').length){
        return false
    }
    if (isMobile){
        $('#mainHeadbar').toggle(true)
        $('#sidebar').toggleClass("d-none")
        $('#search').toggle($('#sidebar').hasClass("d-none"))
        if (permSetup) {
            $("#" + $(this).attr('settings')).css('display', $('#sidebar').css('display'))
        } else {
            $("#" + $(this).attr('settings')).css('display', 'none')
        }
    } else {
        if ($('#menu-svg:visible') && $('#menu-svg:visible').length) {
            $("#" + $(this).attr('settings')).toggle()
        }
    }
    corpusSettings.scrollIntoView()
})

function updateFiles(key = "", click = ""){
    name = $('#name').html()
    $.ajax({
        url: '/api/updateFiles',
        data: {
            'name': name,
            'key': key,
            "password": getPassword(name)
        }
    })
    .done(function(data){
        $('#files').html(" ")
        for (x of data.data.split("|")){
            if (x.length) {
                $('#files').append(`
                <li class="nav-item one-of-the-files d-flex py-1 justify-content-between align-items-center">
                    <a class="nav-link files d-flex align-items-center" style="width:100%;" file="` + x + `">
                        <span data-feather="file-text"></span>
                        <span style="max-width: 130px; display:inline-block; white-space: nowrap; overflow:hidden; text-overflow:ellipsis">` + x + `</span>
                    </a>
                    <div class="d-flex align-items-center fileSettings">
                        <a class="d-flex align-items-center renameFile" style="padding-right:10px" title="Renomear arquivo" file="` + x + `">
                            <span data-feather="delete"></span>
                        </a>
                        <a class="d-flex align-items-center deleteFile" style="padding-right:16px" title="Deletar arquivo" file="` + x + `">
                            <span data-feather="trash"></span>
                        </a>
                    </div>
                </li>`)
            }
        }

        $('.files').click(function(){
            $('.files').toggleClass('active', false)
            $(this).toggleClass('active', true)
            loadFile($(this).attr('file'))
            this.scrollIntoView();
            if ($(this).attr('file') != "README") {
                $('title').html($(this).attr('file') + " - Tronco")
            } else {
                $('title').html(name + " - Tronco")
            }
            if (isMobile && $('#sidebar:visible').length) {
                $('.toggleSettings')[0].click()
            }
        })

        $('.deleteFile').click(function(){
            filename = $(this).attr('file')
            if (confirm("Tem certeza de que deseja excluir " + filename + "?")) {
                $.ajax({
                    url: '/api/deleteFile',
                    method: "POST",
                    data: {
                        'name': name,
                        'filename': filename,
                        "password": getPassword(name)
                    }
                })
                .done(function(){
                    if ($('#filename').attr('file') == filename) {
                        updateFiles("", "README")
                    } else {
                        updateFiles()
                    }
                })
            }
        })

        $('.renameFile').click(function(){
            filename = $(this).attr('file')
            new_filename = prompt("Como " + filename + " deve passar a se chamar?", filename)
            if (new_filename && new_filename.length) {
                $.ajax({
                    url: '/api/renameFile',
                    method: "POST",
                    data: {
                        'name': name,
                        'filename': filename,
                        'new_filename': new_filename,
                        "password": getPassword(name)
                    }
                })
                .done(function(data){
                    if (data.data != "false") {
                        if ($('#filename').attr('file') == filename) {
                            updateFiles("", data.data)
                        } else {
                            updateFiles()
                        }
                    } else {
                        alert("Arquivo " + new_filename + " já existe!")
                    }
                })
            }
        })

        $('.fileSettings').css('visibility', permEdit ? "visible" : "hidden")
        feather.replace()
        if (click.length) {
            $('[file="' + click + '"].files').toggleClass('active', true).click()
        } else {
            $('[file="' + $('#filename').attr('file') + '"].files').toggleClass('active')
        }
    })
}

$('#newFile').click(function(){
    filename = prompt("Como deve se chamar o novo arquivo:")
    if (filename && filename.length) {
        $.ajax({
            url: '/api/newFile',
            method: 'POST',
            data: {
                'name': $('#name').html(),
                'filename': filename,
                "password": getPassword(name)
            }
        })
        .done(function(data){
            if (data.data != "false"){
                updateFiles("", data.data)
            } else {
                alert("Já existe um arquivo com o mesmo nome!")
            }
        })
    }
})

$(window).bind('keydown', function(event) {
    if (event.which === 27){
        $('#mainText').focus()
    }
    if (event.ctrlKey || event.metaKey) {
        switch (String.fromCharCode(event.which).toLowerCase()) {
        case 's':
            event.preventDefault()
            saveFile($('#filename').attr('file'), $('#mainText').val()) 
            break
        case 'p':
            event.preventDefault()
            $('#search').focus().select()
            break
        case 'e':
            event.preventDefault()
            $('#troncoHome').click()
            break
        }
    }
})

var failedSave = false

function saveFile(filename ,text){
    name = $('#name').html()

    $.ajax({
        url: "/api/whoClaimedAccess",
        method: "POST",
        data: {
            "name": $('#name').html(),
            "filename": $('#filename').attr("file")
        }
    })
    .done(function(data){
        if (data.token != whoClaimedAccess && data.token != getSessionToken()) {
            if (!failedSave) {
                failedSave = true
                shouldReload(true)
                alert("O arquivo está sendo editado por outra pessoa. Recarregue a página.")
            }
            return false
        } else {
            $.ajax({
                url: "/api/claimAccess",
                method: "POST",
                data: {
                    "name": $('#name').html(),
                    "filename": filename,
                    //"previoustoken": getSessionPreviousToken(),
                    "token": getSessionToken(),
                }
            })
            .fail(function(){
                if (!failedSave) {
                    failedSave = true
                    shouldReload(true)
                    alert("Falha na sincronização. Copie suas modificações para que não as perca e recarregue a página.")
                }
            })
            .done(function(data){
                if (!data.error){
                    $.ajax({
                        url: '/api/saveFile',
                        method: 'POST',
                        data: {
                            'name': name,
                            'filename': filename,
                            'text': text,
                            "password": getPassword(name),
                            "token": getSessionToken(),
                        }
                    })
                    .done(function(){
                        textModified(true)
                    })
                    .fail(function(){
                        if (!failedSave) {
                            failedSave = true
                            shouldReload(true)
                            alert("Falha na sincronização. Copie suas modificações para que não as perca e recarregue a página.")
                        }
                    })
                }
            })
        }
    })
}

$('#mainText').on('keyup', function(event){
    if ((!event.ctrlKey && !event.metaKey && event.which != 17 && event.which != 27) || (event.ctrlKey && String.fromCharCode(event.which).toLowerCase() == "v")) {
        if ($('#autoSaveCheckbox').prop('checked')){
            saveFile($('#filename').attr('file'), $('#mainText').val())
        } else {
            textModified(true)
        }
    }
})

$('#mainText').on('change', function(){
    if ($('#autoSaveCheckbox').prop('checked')){
        saveFile($('#filename').attr('file'), $('#mainText').val())
    } else {
        textModified(true)
    }
})

function textModified(state){
    $('#saveModifications').toggleClass('btn-success', state)
    $('#saveModifications').toggleClass('btn-outline-secondary', !state)
    if (!$('#autoSaveCheckbox').prop('checked')) {
        $('#filename').toggleClass('text-danger', state)
    }
}

var whoClaimedAccess = ""

function loadFile(filename){
    
    name = $('#name').html()
    //revokeToken($('#filename').attr('file'))
        
    $('#recentFiles').toggle(filename == "README")
    window.history.pushState("", "", '/corpus/' + name + "?file=" + filename);
    $.ajax({
        url: '/api/loadFile',
        data: {
            'name': name,
            'filename': filename,
            "password": getPassword(name),
            'token': getSessionToken(),
        }
    })
    .done(function(data){
        if (!data.error) {
            textModified(false)
            $('#search').val('')
            $('#filename').html(filename == "README" ? "Introdução" : filename)
            $('.filename').html(filename == "README" ? "Introdução" : filename)
            $('#filename').attr('file', filename)
            $('#mainText').val(data.data.text)
            whoClaimedAccess = data['who_claimed_access']
            $('#mainText').trigger('input')//pra dar resize ao carregar
            recentFiles()
            if (!isMobile) {
                $('#mainText').focus()
            }
        } else {
            if (data.error == 2) {
                alert("Você não tem permissão para visualizar esta coleção")
                window.location.href = "/"
                return false
            } else {
                if (data.error == 3){
                    alert("Este arquivo não existe")
                    $('[file="README"].files').click()
                    return false
                }
            }
        }
    })
    .fail(function(){
        alert("Falha na sincronização.")
        window.location.href = "/"
        return false
    })
}
            

$('#autoSaveCheckbox').on('change', function(){
    name = $('#name').html()
    autoSave = $(this).prop('checked')
    if (autoSave){
        saveFile($('#filename').attr('file'), $('#mainText').val())
    }
    $.ajax({
        url: '/api/changeTroncoConfig',
        method: 'POST',
        data: {
            'name': name,
            'auto_save': autoSave,
            "password": getPassword(name)
        }
    })
    loadConfigFromCheckboxes()
})

$('#wrapTextCheckbox').on('change', function(){
    name = $('#name').html()
    auto_wrap = $(this).prop('checked')
    $.ajax({
        url: '/api/changeTroncoConfig',
        method: 'POST',
        data: {
            'name': name,
            'auto_wrap': auto_wrap,
            "password": getPassword(name)
        }
    })
    loadConfigFromCheckboxes()
})

function loadConfigFromCheckboxes(){
    $('#saveModifications').toggle(!$('#autoSaveCheckbox').prop('checked'))
    $('#mainText').attr('wrap', $('#wrapTextCheckbox').prop('checked') ? 'on' : 'off')
    $('#mainText').css('overflow', $('#wrapTextCheckbox').prop('checked') ? "hidden" : "auto")
}

function loadConfig(){
    name = $('#name').html()
    $.ajax({
        url: '/api/loadConfig',
        method: 'POST',
        data: {
            'name': name,
            "password": getPassword(name)
        }
    })
    .done(function(data){
        auto_save = data.auto_save == "true" ? true : false
        auto_wrap = data.auto_wrap == "true" ? true : false
        view_perm = data.view_perm
        edit_perm = data.edit_perm
        setup_perm = data.setup_perm
        $('#autoSaveCheckbox').prop('checked', auto_save)
        $('#wrapTextCheckbox').prop('checked', auto_wrap)
        $('#viewPermission').prop('checked', view_perm)
        $('#editPermission').prop('checked', edit_perm)
        loadConfigFromCheckboxes()
    })
}

var isMobile = false
var openingPanel = false
var closingPanel = false

$(document).on('touchstart', function(e){
    if (isMobile && !$('#sidebar').hasClass('d-none') && e.originalEvent.touches[0].pageX > $('#sidebar').width() && e.originalEvent.touches[0].pageY > $('#troncoHomeBar').height()){
        $('.toggleSettings')[0].click()
        return true
    }
    if (isMobile && e.originalEvent.touches[0].pageX < 30 && !$('#sidebar:visible').length) {
        openingPanel = true
    }
    if (isMobile && e.originalEvent.touches[0].pageX > $(window).width()-30 && $('#sidebar:visible').length){
        closingPanel = true
    }
})

$(document).on('touchmove', function(e){
    if (openingPanel || closingPanel) {
        e.preventDefault()
    }
    if(openingPanel && e.originalEvent.touches[0].pageX > $(window).width()/3){
        $('.toggleSettings')[0].click()
        openingPanel = false
    }
    if(closingPanel && e.originalEvent.touches[0].pageX < $(window).width()-($(window).width()/3)){
        $('.toggleSettings')[0].click()
        closingPanel = false
    }
})

$(document).on('touchend', function(){
    openingPanel = false
    closingPanel = false
})

$(window).on('resize', function(){
    triggerResize()
})

function triggerResize(){
    name = $('#name').html()
    if ($('#sidebar:hidden').length || $(window).width() < 600) {
        isMobile = true
        $('#troncoHomeLabel').html("<span class='mr-2' style='margin-bottom:6px' data-feather='menu'></span><span class='mt-4 mb-0' style='max-width:70vw; width:100%; display:inline-block; white-space: nowrap; overflow:hidden; font-weight:bold; text-overflow:ellipsis'>Tronco / " + name + "</span>")
        $('#troncoLogo').toggleClass("mb-3", true)
        $('.navbar-brand').hide()
        $('.row').after($('#mainText').detach())
        $('#mainText').css("margin", "0px").css("padding", "0px").css("border-style", "none").toggleClass("border-bottom", true)
    } else {
        isMobile = false
        $('#troncoLogo').toggleClass("mb-3", false)
        $('#mainText').css("margin", "").css("padding", "").css("border-style", "").toggleClass("border-bottom", false)
        $('main').append($('#mainText').detach())
        $('#troncoHomeLabel').html("")
        $('.navbar-brand').show()
    }
    $('#troncoHomeBar').css("width", (isMobile ? "100%" : ""))
    $('#troncoHomeBar').toggleClass("mt-0", isMobile)
    $('#sidebar').css('margin-top', $('#sidebar').css('top') == "0px" ? (isMobile ? "58px" : '54px') : '10px')
    $('#troncoLogo').css('margin-bottom', isMobile ? "" : "4px")    
    $('#main').css('margin-left', !isMobile ? '260px' : '0px')
    feather.replace()
}

$(document).ready(function(){
    name = $('#name').html()
    triggerResize()
    if (validatePassword(name)) {
        updateFiles("", $('#filename').attr('file'))
    }
    $('#mainText').autosize()
})