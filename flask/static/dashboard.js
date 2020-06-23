$('#main').click(function(){
    if (isMobile && !$('#sidebar').hasClass('d-none')){
        $('.toggleSettings').click()
    }
})

$('#shareText').click(function(){
    $('#shareLink').val(window.location.href.match(/^.*\//) + $('#name').html().replaceAll(" ", "%20") + "?file=" + $('#filename').html().replaceAll(" ", "%20"))
    $('#shareLink').show()
    $('#shareLink').select()
    document.execCommand('copy')
    $('#shareLink').val("Copiado!")
    $('#shareText').toggleClass("btn-success", true)
    $('#shareText').toggleClass("btn-outline-secondary", false)
    setTimeout(function(){
        $('#shareLink').hide()
        $('#shareText').toggleClass("btn-success", false)
        $('#shareText').toggleClass("btn-outline-secondary", true)
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
    .done(
        //loadConfig()
    )
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

var expirationDate = '2038-01-19, 03:14:08 UTC'

function validatePassword (name){
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
        
        permEdit = permissions.indexOf("editar") >= 0
        permSetup = permissions.indexOf("configurar") >= 0
        if (permSetup) { permEdit = true }
        if (!permEdit) { permSetup = false }
        $('#conected').html(password == "default" && permSetup ? "Crie uma senha" : (permSetup ? "Você é dono" : "Conectar"))
        $('#permissionsSettings').toggle(password == "default" ? false : (permSetup ? true : false))
        if (isMobile) {
            $('#corpusSettings').toggle(permSetup)
        }
        $('#mainText').prop('readonly', !permEdit)
        $('#saveModifications').attr('disabled', !permEdit)
        $('#menu-svg').toggle(permSetup)
        $('.fileSettings').css('visibility', permEdit ? "visible" : "hidden")
        $('#newFile').css('visibility', permEdit ? "visible" : "hidden")
        $('#permissions').html("Permissões: " + permissions.join(" / "))
        loadConfig()
    })
}

function storePassword (name, pass){
    troncoPasswords = JSON.parse(document.cookie.split("<troncoPasswords>")[1].split("</troncoPasswords>")[0])
    troncoPasswords[name] = pass
    document.cookie = document.cookie.replace(/<troncoPasswords>.*<\/troncoPasswords>/, "<troncoPasswords>" + JSON.stringify(troncoPasswords) +'</troncoPasswords>;expires=' + expirationDate)
}

function getPassword (name){
    if (document.cookie.indexOf("<troncoPasswords>") == -1){
        document.cookie = "tp=<troncoPasswords>{}</troncoPasswords>;expires=" + expirationDate
    }
    troncoPasswords = JSON.parse(document.cookie.split("<troncoPasswords>")[1].split("</troncoPasswords>")[0])
    if (name in troncoPasswords){
        return troncoPasswords[name]
    } else {
        return "default"
    }
}

function revokePassword (name){
    troncoPasswords = JSON.parse(document.cookie.split("<troncoPasswords>")[1].split("</troncoPasswords>")[0])
    delete troncoPasswords[name]
    document.cookie = document.cookie.replace(/<troncoPasswords>.*<\/troncoPasswords>/, "<troncoPasswords>" + JSON.stringify(troncoPasswords) +'</troncoPasswords>;expires=' + expirationDate)
}

$('#search').on('keyup', function(e){
    filename = $(this).val()
    recentFiles(filename)
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
            recentFiles()
            updateFiles("", data.data)
            $('#search').val('')
        })
    }
})

function recentFiles(key = ""){
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
        $('#recentFiles').html(data.data.length ? data.data : 'Nenhum arquivo encontrado. Criar um novo?')
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
                revokePassword(name)
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
        $('#troncoHome').toggle($('#sidebar').hasClass("d-none"))
        if ($('#menu-svg:visible') && $('#menu-svg:visible').length) {
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
        $('#files').html(data.data)
        validatePassword(name)
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
                $('.toggleSettings').click()
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
                    if ($('#filename').html() == filename) {
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
                        if ($('#filename').html() == filename) {
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

        feather.replace()
        if (click.length) {
            $('[file="' + click + '"].files').toggleClass('active', true).click()
        } else {
            $('[file="' + $('#filename').html() + '"].files').toggleClass('active')
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
        case 'o':
            event.preventDefault()
            if ($('#newFile').css('visibility') != "hidden") {
                $('#newFile').click()
            }
            break
        case 's':
            event.preventDefault()
            saveFile($('#filename').html(), $('#mainText').val()) 
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

function saveFile(filename ,text){
    name = $('#name').html()
    $.ajax({
        url: '/api/saveFile',
        method: 'POST',
        data: {
            'name': name,
            'filename': filename,
            'text': text,
            "password": getPassword(name)
        }
    })
    textModified(false)
}

$('#mainText').on('keyup', function(event){
    if ((!event.ctrlKey && !event.metaKey && event.which != 17) || (event.ctrlKey && String.fromCharCode(event.which).toLowerCase() == "v")) {
        if ($('#autoSaveCheckbox').prop('checked')){
            saveFile($('#filename').html(), $('#mainText').val())
        } else {
            textModified(true)
        }
    }
})

$('#mainText').on('change', function(){
    if ($('#autoSaveCheckbox').prop('checked')){
        saveFile($('#filename').html(), $('#mainText').val())
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

function loadFile(filename){
    if (filename != "README") {
        $('#recentFiles').toggle(false)
        if (permissions.indexOf("visualizar") == -1){
            alert("Você não tem permissão para visualizar esta coleção")
            window.location.href = "/"
        }
    } else {
        $('#recentFiles').toggle(true)
    }
    name = $('#name').html()
    window.history.pushState("", "", '/corpus/' + name + "?file=" + filename);
    $.ajax({
        url: '/api/loadFile',
        data: {
            'name': name,
            'filename': filename,
            "password": getPassword(name)
        }
    })
    .done(function(data){
        textModified(false)
        $('#filename').html(filename)
        $('.filename').html(filename)
        $('#mainText').val(data.data.text)
        $('#mainText').trigger('input')
        recentFiles()
    })
}

$('#autoSaveCheckbox').on('change', function(){
    name = $('#name').html()
    autoSave = $(this).prop('checked')
    if (autoSave){
        saveFile($('#filename').html(), $('#mainText').val())
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
        view_perm = data.view_perm// == "true" ? true : false
        edit_perm = data.edit_perm// == "true" ? true : false
        setup_perm = data.setup_perm// == "true" ? true : false
        $('#autoSaveCheckbox').prop('checked', auto_save)
        $('#wrapTextCheckbox').prop('checked', auto_wrap)
        $('#viewPermission').prop('checked', view_perm)
        $('#editPermission').prop('checked', edit_perm)
        $('#setupPermission').prop('checked', setup_perm)
        loadConfigFromCheckboxes()        
    })
}

var isMobile = false
var openingPanel = false
var closingPanel = false

$(document).on('touchstart', function(e){
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
        $('.toggleSettings').click()
        openingPanel = false
    }
    if(closingPanel && e.originalEvent.touches[0].pageX < $(window).width()-($(window).width()/3)){
        $('.toggleSettings').click()
        closingPanel = false
    }
})

$(document).on('touchend', function(){
    openingPanel = false
    closingPanel = false
})

$(window).on('resize', function(){
    if (!isMobile) {
        $('#main').css('margin-left', $('#sidebar:visible').length ? '260px' : '0px')
    }
    $('#troncoHome').css("width", isMobile ? "100%" : "")
})

$(document).ready(function(){
    if ($('#sidebar').offset().top == 0){
        $('#sidebar').toggleClass('pt-5')
    }
    if ($('#sidebar:hidden').length) {
        isMobile = true
        $('#search').css('background-color', "white")
        $('#troncoHomeLabel').html("Tronco")
    } else {
        isMobile = false
        $('#troncoHomeLabel').html("")
        $('#search').css('background-color', "")
    }
    $(window).trigger('resize')
    filename = $('#filename').html()
    loadConfig()
    updateFiles("", filename)
    $('#mainText').autosize()
    //$('#search').focus()
})