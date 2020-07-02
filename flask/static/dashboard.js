$('.renameFileContext').click(function(){
    renameFile(filedivcontext.attr('file'))
})

$('.deleteFileContext').click(function(){
    deleteFile(filedivcontext.attr('file'))
})

$('.moveBottomCheckbox').click(function(){
    checkboxString = checkboxdiv.find(".custom-control-label").text()
    pattern = RegExp("\\[[xX]?\\]\\s?" + escapeRegExp(checkboxString) + "\n?", "g")
    is_checked = checkboxdiv.find("[type=checkbox]").prop("checked")

    bottom_is_checked = $($('.checkbox-item-subdiv')[$('.checkbox-item-subdiv').length-1]).find("[type=checkbox]").prop("checked")
    bottomString = $($('.checkbox-item-subdiv')[$('.checkbox-item-subdiv').length-1]).find(".custom-control-label").text()
    bottomPattern = RegExp("\\[[xX]?\\]\\s?" + escapeRegExp(bottomString), "g")
    
    if (bottomString != checkboxString) {
        $('#mainText').val($('#mainText').val().replace(pattern, "").replace(bottomPattern, "[" + (bottom_is_checked ? "x" : "") + "] " + bottomString + "\n" + "[" + (is_checked ? "x" : "") + "] " + checkboxString))
        saveFile()
    }
})

$('.moveTopCheckbox').click(function(){
    checkboxString = checkboxdiv.find(".custom-control-label").text()
    pattern = RegExp("\\[[xX]?\\]\\s?" + escapeRegExp(checkboxString) + "\n?", "g")
    is_checked = checkboxdiv.find("[type=checkbox]").prop("checked")

    top_is_checked = $($('.checkbox-item-subdiv')[0]).find("[type=checkbox]").prop("checked")//$('.checkbox-item-subdiv').length-1
    topString = $($('.checkbox-item-subdiv')[0]).find(".custom-control-label").text()
    topPattern = RegExp("\\[[xX]?\\]\\s?" + escapeRegExp(topString), "g")
    
    if (topString != checkboxString) {
        $('#mainText').val($('#mainText').val().replace(pattern, "").replace(topPattern, "[" + (is_checked ? "x" : "") + "] " + checkboxString + "\n" + "[" + (top_is_checked ? "x" : "") + "] " + topString))
        saveFile()
    }
})

$('.editCheckbox').click(function(){
    checkboxString = checkboxdiv.find(".custom-control-label").text()
    pattern = RegExp("\\[[xX]?\\]\\s?" + escapeRegExp(checkboxString), "g")
    is_checked = checkboxdiv.find("[type=checkbox]").prop("checked")
    newString = prompt("Editar item:", checkboxString)
    if (newString && newString.length) {
        $('#mainText').val($('#mainText').val().replace(pattern, "[" + (is_checked ? "x" : "") + "] " + newString))
        saveFile()
    }
})

$('.deleteCheckbox').click(function(){
    checkboxString = checkboxdiv.find(".custom-control-label").text()
    pattern = RegExp("\\[[xX]?\\]\\s?" + escapeRegExp(checkboxString) + "\n?", "g")
    $('#mainText').val($('#mainText').val().replace(pattern, ""))
    saveFile()
})

function toggleInsertSuccess(){
    $('.insertLabel').html("Adicionado!")
    $('.dropdown-toggle').toggleClass("btn-outline-secondary", false).toggleClass("btn-success", true)
    setTimeout(() => { 
        $('.insertLabel').html("Inserir")
        $('.dropdown-toggle').toggleClass("btn-outline-secondary", true).toggleClass("btn-success", false)
    }, 2000)
    
}

function returnSearch(){
    $.ajax({
        url: '/api/findOrCreateFile',
        method: 'POST',
        data: {
            "name": $('#name').html(),
            "filename": $('#search').val(),
            "tronco_token": getTroncoToken()
        }
    })
    .done(function(data){
        //recentFiles("", filename)
        updateFiles("", data.data)
        $('#search').val('')
    })
}

function toggleMobile(el) {
    $('.mobile-btn').toggle(false)
    $('.mobile-btn-secondary').toggle(false)
    if (el && isMobile) {
        $('#' + el).toggle(true)
        if (el == "mobileSearch") {
            $('#mobileTronco').show()
        }
    }
}

$('#mobileTronco').click(function(){
    $('#troncoHome').click()
})

$('#mobileSearch').click(function(){
    $('#search').focus()
})

$('#mobileLeft').click(function(){
    $('#mainText').blur()
})

String.prototype.rsplit = function(sep, maxsplit) {
    var split = this.split(sep);
    return maxsplit ? [ split.slice(0, -maxsplit).join(sep) ].concat(split.slice(-maxsplit)) : split;
}

$('.insertDate').click(function(){
    date = new Date()
    $('#mainText').val($('#mainText').val() + "\n" + date.getDate() + "/" + (parseInt(date.getMonth())+1).toString() + "/" + date.getFullYear() + " " + date.getHours() + ":" + date.getMinutes())
    saveFile()
    $('#mainText').trigger("input")
    toggleInsertSuccess()
});

$('.insertChecklist').click(function(){
    n_checklists = $('#mainText').val().match(/\[(x)?\]/gi)
    $('#mainText').val($('#mainText').val() + "\n[] Item " + (n_checklists ? n_checklists.length+1 : 1).toString())
    saveFile()
    $('#mainText').trigger("input")
    toggleInsertSuccess()
});

$('.insertImage').click(function(){
    $('#upload-image').click()
})

$('.insertDocument').click(function(){
    $('#upload-document').click()
})

$('.uploadFile').change(function(){    
    formdata = new FormData()
    if($(this).prop('files').length > 0)
    {
        file = $(this).prop('files')[0]
        extension = file.name.rsplit(".")[1]
        filename = prompt("Dê um nome para o arquivo:", file.name.rsplit(".")[0])
        if (filename.length) {
            formdata.append("uploading", file)
            formdata.append("filename", filename + "." + extension)
            formdata.append("tronco_token", getTroncoToken())
            formdata.append("name", $('#name').html())
            $.ajax({
                url: "/api/uploadFile",
                type: "POST",
                data: formdata,
                processData: false,
                contentType: false,
                success: function (result) {
                    if (result.error == "0") {
                        $('#mainText').val($('#mainText').val() + "\ntronco/" + result.filename)
                        saveFile()
                        $('#mainText').trigger("input")
                        toggleInsertSuccess()
                    } else {
                        if (result.error == "1") {
                            alert(result.filename + " é pesado demais!")
                        }
                    }
                }
            })
        }
    }
})

$('#settingsDiv').click(function(){
    $('#settings').toggle()
})

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function changeATitle(link){
    $.ajax({
        url: "https://textance.herokuapp.com/title/" + link,
        complete: function(data) {
            if (data.responseText){ 
                $('[href="' + link + '"]').html(data.responseText)
            }
        }
    })
}

function updateToolbar(){
    links = []
    images = []
    files = []
    checklist = []

    list_images = $('#mainText').val().matchAll(/tronco\/(\S+\.(png|jpe?g|bmp|gif|ico))(\s|$|\n)/gi)
    for (image of list_images) {
        images.push([image[1], "/media/" + image[1]])
    }

    list_files = $('#mainText').val().matchAll(/tronco\/(\S+\.(zip|rar|pdf|rtf|txt|htm|html|doc|docx|tsv|csv|xls|xlsx))(\s|$|\n)/gi)
    for (file of list_files) {
        files.push([file[1], "/media/" + file[1]])
    }

    list_check = $('#mainText').val().matchAll(/\[(x)?\]\s?(.+)($|\n)/gi)
    for (check of list_check) {
        checklist.push([check[1] ? true : false, check[2]])
    }

    list_files = $('#mainText').val().matchAll(/\[([^\]]+:)?(.*?)\]/gi)
    for (file of list_files) {
        if (file[1]) {
            files.push(file[2] + ":" + file[1])
        }
        if ($('[file="' + file[2] + '"]').length) {
            files.push(file[2])
        }
    }

    list_links = $('#mainText').val().matchAll(/(https?:\/\/(www\.)?(.*?)(\/|$|\n)(.*\/)?(.*?))(\s|\n|$)/gi)
    for (link of list_links) {
        if (link[1].match(/\.(png|jpe?g|bmp|gif|ico)$/i)) {
            images.push([link[6], link[1]])
        } else {
            links.push([link[3], link[1]])
        }
    }

    if (checklist.length) {
        $('#checklist').toggle(true)
        $('#checklistLabel').html("Checklist (" + checklist.filter(x => x[0]).length + "/" + checklist.length + ")")
        $('[toolbar=checklist]').html("")
        for (check in checklist) {
            $('[toolbar=checklist]').append('<div class="form-row checkbox-item-div align-items-left"><div class="col-auto my-1 checkbox-item-subdiv"><div class="custom-control custom-checkbox mr-sm-2"><input type="checkbox" ' + (checklist[check][0] ? 'checked="true"' : '') + ' class="custom-control-input file-checkbox" id="checkbox-' + check + '"><label class="custom-control-label" style="cursor:pointer; user-select: none; -webkit-user-select: none; -khtml-user-select: none; -moz-user-select: none; -ms-user-select: none;" for="checkbox-' + check + '">' + checklist[check][1] + '</label></div></div></div>')
        }
        $('.checkbox-item-div').css('overflow-x', isMobile ? "scroll" : "auto").css("white-space", "nowrap")
        $('.file-checkbox').change(function(){
            checkString = $('[for="' + $(this).attr('id') + '"]').text()
            toCheck = $(this).prop('checked')
            pattern = RegExp("\\[[xX]?\\]\\s?" + escapeRegExp(checkString), "g")
            $('#mainText').val($('#mainText').val().replace(pattern, "[" + (toCheck ? "x" : "") + "] " + checkString))
            saveFile($('#filename').attr('file'), $('#mainText').val())
        })

        $('.checkbox-item-subdiv').on('contextmenu', function(e) {
            checkboxdiv = $(this)
            var top = e.pageY
            var left = e.pageX
            $("#context-menu-checklist").css({
                display: "block",
                top: top,
                left: left
            }).addClass("show")
            return false //blocks default Webbrowser right click menu
            }).on("click", function() {
                $("#context-menu-checklist").removeClass("show").hide()
            })

            $("#context-menu-checklist a").on("click", function() {
                $(this).parent().removeClass("show").hide()
            })

    } else {
        $('#checklist').toggle(false)
        $('[toolbar=checklist]').toggle(false)
    }
    
    if (links.length) {
        $('#links').toggle(true)
        $('#linksLabel').html("Links (" + links.length + ")")
        $('[toolbar=links]').html("")
        for (link in links) {
            $('[toolbar=links]').append('<div class="link-div"><a target="_blank" class="px-1" href="' + links[link][1] + '">' + links[link][0] + '</a></div>' + (link == links.length -1 ? "" : ""))
            changeATitle(links[link][1])
        }
        $('.link-div').css('overflow-x', isMobile ? "scroll" : "auto").css("white-space", "nowrap")
    } else {
        $('#links').toggle(false)
        $('[toolbar=links]').toggle(false)
    }

    if (images.length) {
        $('#images').toggle(true)
        $('#imagesLabel').html("Imagens (" + images.length + ")")
        $('[toolbar=images]').html("")
        for (link in images) {
            $('[toolbar=images]').append('<div class="image-div"><a target="_blank" class="px-1" href="' + images[link][1] + '">' + images[link][0] + '</a></div>' + (link == images.length -1 ? "" : ""))
        }
        $('.image-div').css('overflow-x', isMobile ? "scroll" : "auto").css("white-space", "nowrap")
    } else {
        $('#images').toggle(false)
        $('[toolbar=images]').toggle(false)
    }

    if (files.length) {
        $('#filesLink').toggle(true)
        $('#filesLinkLabel').html("Arquivos (" + files.length + ")")
        $('[toolbar=filesLink]').html("")
        for (link in files) {
            if (files[link][1].indexOf("/media/") >= 0) {
                $('[toolbar=filesLink]').append('<div class="file-div"><a href="' + files[link][1] + '" target="_blank" class="px-1">' + files[link][0] + '</a></div>' + (link == files.length -1 ? "" : ""))
            } else {
                $('[toolbar=filesLink]').append('<div class="file-div"><a href="/corpus/' + (files[link].indexOf(":") == -1 ? $('#name').html() : files[link].split(":")[1]) + '?file=' + files[link].split(":")[0] + '" class="px-1">' + (files[link].indexOf(":") == -1 ? "" : "(" + files[link].split(":")[1] + ") ") + files[link].split(":")[0] + '</a></div>' + (link == files.length -1 ? "" : ""))
            }
        }
        $('.file-div').css('overflow-x', isMobile ? "scroll" : "auto").css("white-space", "nowrap")
    } else {
        $('#filesLink').toggle(false)
        $('[toolbar=filesLink]').toggle(false)
    }

    $('#shareText').show()
    $('#dropdown').toggle(permEdit)
    if (isMobile) {
        $('#toolbarRow').scrollLeft(0)
    }
    if (!isMobile) {
        $('#mainText').css("margin-top", $("#editingPanel").height())  
    } else {
        $('#mainText').css("margin-top", "")
    }
}

$('#troncoHome').click(function(){
    window.location.href = '/?load=false'
})

function shouldReload(should){
    $('#mainText').prop("readOnly", should)
    $('#reloadPage').toggle(should)
    if (should) {
        reloadPage.scrollIntoView()
    }
}

$('.toolbarButton').click(function(){
    $(".toolbar").toggle(false)
    if ($(this).hasClass("btn-primary")) {
        $("[toolbar='" + $(this).attr('id') + "']").toggle(true)
    }
    $('.toolbarButton').toggleClass("btn-primary", false).toggleClass("btn-outline-secondary", true)
    if ($("[toolbar='" + $(this).attr('id') + "']") && $("[toolbar='" + $(this).attr('id') + "']").length) {
        $("[toolbar='" + $(this).attr('id') + "']").toggle()
    }
    if ($("[toolbar='" + $(this).attr('id') + "']:visible").length) {
        $(this).toggleClass("btn-primary", true).toggleClass("btn-outline-secondary", false)
    }
    if (!isMobile) {
        $('#mainText').css("margin-top", $("#editingPanel").height())  
    } else {
        $('#mainText').css("margin-top", "")
    }
})

$('#reloadPage').click(function(){
    window.location.reload()
})

$('#shareText').click(function(){
    $('#shareLink').show()
    $('#shareLink').val(window.location.href.match(/^.*\//)[0] + $('#name').html().replace(/\s/g, "%20") + "?file=" + $('#filename').attr('file').replace(/\s/g, "%20"))
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
        toggleMobile("mobileLeft")
        $('#troncoHome').toggle(false)
        $('#sidebar').toggleClass("d-none", true)
        $('#toolbarRow, #toolbar').toggle(false)
        $('#breadcrumb-nav').toggle(false)
        //$('#blurHeadbar').toggle(true)
    }
})

$('#mainText').on("blur", function(){
    if (isMobile) {
        $('#mainHeadbar').toggle(true)
        $('#search').toggle(permView)
        $('#troncoHome').toggle(true)
        $('#toolbarRow, #toolbar').toggle(true)
        toggleMobile(permEdit ? "mobileSearch" : "mobileTronco")
        //$('#blurHeadbar').toggle(false)
        //$('#breadcrumb-nav').toggle(true)
    }
})

$('#search').on('focus', function(){
    window.scrollTo(0, 0)
    $(this).select()
    $('#breadcrumb-nav').toggle(true)
    $('.breadcrumb').scrollLeft(0)
    toggleMobile("mobileTronco")
})

$('#search').on('blur', function(){
    toggleMobile(permEdit ? "mobileSearch" : "mobileTronco")
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
            "tronco_token": getTroncoToken()
        }
    })
    .done(function(){
        loadConfig()
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
                        "tronco_token": getTroncoToken()
                    }
                })
                .done(function(){
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
    switch ($('#conected').html()) {
        case "Crie uma senha":
            $('#setPassword').click()
            break
        case "Você é dono":
            if (confirm("Deseja se desconectar de " + name + "?")) {
                storePassword(name, "default")
            }
            break
        default:
            password = prompt("Insira a senha para " + name + ":")
            if (password && password.length){
                storePassword(name, password)
            }
            break
    }
})

var expirationDate = 'Fri, 31 Dec 9999 23:59:59 GMT'
var permissions = []

function validatePassword (name){

    token = getTroncoToken()
    $.ajax({
        url: '/api/validatePassword',
        method: 'POST',
        data: {
            'name': name,
            'token': token
        }
    })
    .done(function(data){
        permissions = data.permissions.split("|")
        permView = permissions.indexOf("visualizar") >= 0
        permEdit = permissions.indexOf("editar") >= 0
        permSetup = permissions.indexOf("configurar") >= 0
        if (permSetup) { permEdit = true }
        if (!permEdit) { permSetup = false }
        $('#conected').html(!data.has_password && permSetup ? "Crie uma senha" : (permSetup ? "Você é dono" : (permEdit ? "Você pode editar" : (permView ? "Você pode visualizar" : "Você não pode visualizar"))))
        $('#permissionsSettings').toggle(!data.has_password ? false : (permSetup ? true : false))
        $('#uploadTextDiv').toggle(permEdit)
        if (isMobile) {
            $('#corpusSettings').toggle(permSetup)
            $('#search').toggle(permView)
            toggleMobile(permEdit ? "mobileSearch" : "mobileTronco")
        }
        $('#newFile').css('visibility', permEdit ? "visible" : "hidden")
        $('#mainText').prop('readonly', !permEdit).toggleClass("p-3", !permEdit)
        $('#saveModifications').attr('disabled', !permEdit)
        $('#menu-svg').toggle(permSetup)
        storeSessionToken(data.token)
        if (!token.length) {
            setTroncoToken(data.tronco_token)
        }
        loadConfig()
        updateFiles("", $('#filename').attr('file'))
    })
    return true
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

function getTroncoToken (){
    troncoToken = JSON.parse(document.cookie.split("tt=")[1].split("; ")[0])
    return "token" in troncoToken ? troncoToken.token : ""
}

function setTroncoToken (token){
    troncoToken = JSON.parse(document.cookie.split("tt=")[1].split("; ")[0])
    troncoToken['token'] = token
    document.cookie = "tt=" + JSON.stringify(troncoToken) + "; expires=" + expirationDate
}

function storePassword(name, password){
    $.ajax({
        url: "/api/storePassword",
        method: "POST",
        data: {
            "name": name,
            "password": password,
            "tronco_token": getTroncoToken()
        }
    })
    .done(function(){
        validatePassword(name)
    })
}

function revokePassword(name){
    $.ajax({
        url: "/api/revokePassword",
        method: "POST",
        data: {
            "name": name,
            "tronco_token": getTroncoToken()
        }
    })
}

$('#search').on('keyup', function(e){
    filename = $(this).val()
    recentFiles(filename, filename)
    if (e.which == 13){
        returnSearch()
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
            "tronco_token": getTroncoToken()
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
                new_data = new_data + '<li class="breadcrumb-item"><a class="recentFiles" href="#" file="' + x + '">' + (x == "README" ? $('#name').html() : x) + '</a></li>'
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
    confirmName = prompt("Digite o nome da coleção (" + name + ") para confirmar que deseja excluí-la:")
    if (confirmName && confirmName.length && confirmName == name) {
        $.ajax({
            url: '/api/deleteCorpus',
            method: 'POST',
            data: {
                'name': name,
                "tronco_token": getTroncoToken()
            }
        })
        .done(function(){
            window.location.href = "/?load=false"
            return false
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
                "tronco_token": getTroncoToken(),
            }
        })
        .done(function(data){
            if (data.data != "false"){
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
        $('#search').toggle($('#sidebar').hasClass("d-none") && permView)
        toggleMobile($('#sidebar').hasClass("d-none") && permEdit ? "mobileSearch" : "mobileTronco")
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

function deleteFile(filename){
    if (confirm("Tem certeza de que deseja excluir " + filename + "?")) {
        $.ajax({
            url: '/api/deleteFile',
            method: "POST",
            data: {
                'name': name,
                'filename': filename,
                "tronco_token": getTroncoToken()
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
}

$('#deleteFile').click(function(){
    deleteFile($('#filename').attr('file'))
})

function renameFile(filename) {
    new_filename = prompt("Como " + filename + " deve passar a se chamar?", filename)
    if (new_filename && new_filename.length) {
        $.ajax({
            url: '/api/renameFile',
            method: "POST",
            data: {
                'name': name,
                'filename': filename,
                'new_filename': new_filename,
                "tronco_token": getTroncoToken()
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
}

$('#renameFile').click(function(){
    renameFile($('#filename').attr('file'))
})

function updateFiles(key = "", click = ""){
    name = $('#name').html()
    $.ajax({
        url: '/api/updateFiles',
        data: {
            'name': name,
            'key': key,
            "tronco_token": getTroncoToken()
        }
    })
    .done(function(data){
        $('#files').html("")
        $('#nFiles').html(data.data.split("|").length)

        for (x of data.data.split("|")){
            if (x.length) {
                $('#files').append(`
                <li class="nav-item one-of-the-files d-flex py-1 justify-content-between align-items-center">
                    <a class="nav-link files d-flex align-items-center" style="width:100%;" file="` + x + `">
                        <span data-feather="file-text"></span>
                        <span style="max-width: 98%; display:inline-block; white-space: nowrap; overflow:hidden; text-overflow:ellipsis; user-select: none; -webkit-user-select: none; -khtml-user-select: none; -moz-user-select: none; -ms-user-select: none;">` + x + `</span>
                    </a>
                </li>`)
            }
        }

        if (!isMobile) {
            $('.one-of-the-files').on('mouseenter mouseleave', function(){
                $(this).toggleClass("files-hover")
            })
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

        $('[file!=README].files').on('contextmenu', function(e) {
            filedivcontext = $(this)
            var top = e.pageY
            var left = e.pageX
            $("#context-menu-file").css({
                display: "block",
                top: top,
                left: left
            }).addClass("show")
            return false //blocks default Webbrowser right click menu
        }).on("click", function() {
            $("#context-menu-file").removeClass("show").hide()
        })

        $("#context-menu-file a").on("click", function() {
            $(this).parent().removeClass("show").hide()
        })

        feather.replace()
        if (click.length) {
            $('[file="' + click + '"].files').toggleClass('active', true).click()
        } else {
            $('[file="' + $('#filename').attr('file') + '"].files').toggleClass('active')
        }
    })
}

$('#newFile').click(function(){
    if (isMobile) {
        $('.toggleSettings')[0].click()
    }
    $('#search').focus()
})

$(window).bind('keydown', function(event) {
    if (event.which === 27){
        if ($('#mainText').is(":focus")) {
            $('#mainText').blur()
        } else {
            $('#mainText').focus()
        }
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

function saveFile(filename=$('#filename').attr('file'), text=$('#mainText').val()){

    if (permEdit || permSetup) {

        name = $('#name').html()
        updateToolbar()

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
                                "tronco_token": getTroncoToken(),
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
}

var typingTimer
var doneTypingInterval = 1000

function doneTyping () {
    saveFile($('#filename').attr('file'), $('#mainText').val())
}

$('#mainText').on('keyup', function(event){
    if ((!event.ctrlKey && !event.metaKey && event.which != 17 && event.which != 27) || (event.ctrlKey && String.fromCharCode(event.which).toLowerCase() == "v")) {
        if ($('#autoSaveCheckbox').prop('checked')){
            clearTimeout(typingTimer)
            if ($('#mainText').val()) {
                typingTimer = setTimeout(doneTyping, doneTypingInterval)
            }
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
        
    $('#breadcrumb-nav').toggle(false)//filename == "README" && permView
    window.history.pushState("", "", '/corpus/' + name + "?file=" + filename);
    $.ajax({
        url: '/api/loadFile',
        data: {
            'name': name,
            'filename': filename,
            "tronco_token": getTroncoToken(),
            'token': getSessionToken(),
        }
    })
    .done(function(data){
        if (!data.error) {
            $('#renameFile').toggle((permEdit || permSetup) && filename != "README" ? true : false)
            $('#deleteFile').toggle((permEdit || permSetup) && filename != "README" ? true : false)
            textModified(false)
            $('#search').val('')
            $('#filename').html(filename == "README" ? name : filename)
            $('.filename').html(filename == "README" ? name : filename)
            $('#filename').attr('file', filename)
            $('#filename').scrollLeft(0)
            $('#mainText').val(data.data.text)
            updateToolbar()
            $('#mainText').attr('placeholder', !permEdit ? "" : (filename == "README" ? 'Este arquivo é uma introdução à coleção "' + name + '". Você pode criar novos arquivos na barra de busca acima e criar uma senha para proteger esta coleção, mas este arquivo de introdução poderá sempre ser visto por todos.' : 'Insira aqui o conteúdo' + (isMobile ? "" : " ou solte arquivos e imagens")))
            whoClaimedAccess = data['who_claimed_access']
            $('#mainText').trigger('input')//pra dar resize ao carregar
            recentFiles()
            if (!isMobile) {
                //$('#mainText').focus()
            }
        } else {
            if (data.error == 2) {
                alert("Você não tem permissão para visualizar esta coleção")
                window.location.href = "/?load=false"
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
        alert("Falha na sincronização")
        if (filename == "README") {
            window.location.href = "/?load=false"
            return false
        } else {
            $('[file=README].files').click()
        }
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
            "tronco_token": getTroncoToken()
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
            "tronco_token": getTroncoToken()
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
            "tronco_token": getTroncoToken()
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
        $('#visitante-perms').html(view_perm ? "Visitantes podem " + (edit_perm ? "editar" : "visualizar") : "Visitantes não podem visualizar")
        loadConfigFromCheckboxes()
    })
}

var isMobile = false
var isMobileFromBeginning = false
var openingPanel = false
var closingPanel = false

$(document).on('touchstart', function(e){
    if (isMobile && !$('#sidebar').hasClass('d-none') && e.originalEvent.touches[0].pageX > $('#sidebar').width() && e.originalEvent.touches[0].pageY > $('#troncoHomeBar').height()){
        $('.toggleSettings')[0].click()
        return true
    }
    if (isMobile && e.originalEvent.touches[0].pageX < 20 && !$('#sidebar:visible').length) {
        openingPanel = true
    }
    if (isMobile && e.originalEvent.touches[0].pageX > ($(window).width()-20) && $('#sidebar:visible').length){
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
    if (!isMobileFromBeginning) {
        triggerResize()
    }
})

let mobileInterval

function triggerResize(first=false){
    name = $('#name').html()
    if ($('#sidebar:hidden').length || $(window).width() < 600) {
        mobileInterval = window.setInterval(() => {
            $('.mobile-btn').css({left: $(window).width()-75, top: document.documentElement.clientHeight-75})
            $('.mobile-btn-secondary').css({left: $(window).width()-75, top: document.documentElement.clientHeight-75-65})
        }, 200)
        if (first) {
            isMobileFromBeginning = true
            $('#sidebar').css("max-width", "")
        }
        isMobile = true
        $('#troncoHomeLabel').html("<a class='mt-4 mb-0' style='max-width:70vw; width:100%; display:inline-block; white-space: nowrap; overflow:hidden; font-weight:bold; text-overflow:ellipsis'><span class='mr-2' data-feather='menu'></span> Tronco / " + name + "</a>")
        $('#troncoLogo').toggleClass("mb-3", true)
        $('.navbar-brand').hide()
        $('#toolbar-group, #toolbar, #filename-div, #breadcrumb-nav, #mainText, #hr').toggleClass("px-5", false).toggleClass("px-4", true)
        $('#hr').show()
        $('.breadcrumb, #filename').css('overflow-x', "scroll").css("white-space", "nowrap")
        $('#toolbarRow').css('overflow-x', "scroll")
    } else {
        if (mobileInterval) {
            clearInterval(mobileInterval)
        }
        isMobile = false
        $('#toolbar-group, #toolbar, #filename-div, #breadcrumb-nav, #mainText, #hr').toggleClass("px-5", true).toggleClass("px-4", false)
        $('#troncoLogo').toggleClass("mb-3", false)
        $('#troncoHomeLabel').html("")
        $('.navbar-brand').show()
        $('#hr').show()
        $('.breadcrumb, #filename').css('overflow-x', "").css("white-space", "")
        $('#toolbarRow').css('overflow-x', "")
        //$('#editingPanel').css("z-index", "1200").toggleClass("sticky-top", true)
        toggleMobile(false)
    }
    if (first && !isMobile) {
        $('.toolbarButton').on('mouseenter mouseleave', function(){
            $(this).toggleClass("btn-toolbar-hover")
        })
        $('#afterSearch').before($('#search').detach().toggleClass("mt-3 mx-4", false).css("color", ""))
    }
    $('#troncoHomeBar').css("width", (isMobile ? "100%" : ""))
    $('#troncoHomeBar').toggleClass("mt-0", isMobile)
    $('#sidebar').css('margin-top', $('#sidebar').css('top') == "0px" ? (isMobile ? "58px" : '54px') : '10px')
    $('#troncoLogo').css('margin-bottom', isMobile ? "" : "4px")
    //$('#main').css('margin-left', !isMobile ? '260px' : '0px')
    $('#main').toggleClass("col-md-9 ml-sm-auto col-lg-10", !isMobile)

    $('#uploadTextLabel').html(isMobile ? "Enviar arquivos" : "Solte arquivos aqui")

    feather.replace()
}

$('.dropdown').on('show.bs.dropdown', function(){
    clone = $(this).clone().toggleClass("deleteThis", true)
    $('body').append($(this).css({
        position: 'absolute',
        left: $(this).offset().left,
        top: $(this).offset().top
    }).detach())
    $('#reloadPage').after(clone)
})

$('.dropdown').on('hidden.bs.dropdown', function() {
    $('.deleteThis').remove()
    $('#reloadPage').after($(this).css({position: "", left: "", top: ""}).detach())
})

$(document).ready(function(){
    feather.replace()
    if (document.cookie.indexOf("tt=") == -1){
        document.cookie = "tt={}; expires=" + expirationDate
    }
    if (document.cookie.indexOf("st=") == -1){
        document.cookie = "st={}; expires=" + expirationDate
    }
    name = $('#name').html()
    $('#mainText').autosize()
    validatePassword(name)
    
    var uploadText = new Dropzone(".uploadText", { url: "/api/uploadText", clickable: ".uploadText" })
    uploadText.on("success", function(file, result){
        if (result.error == "1") {
            alert(result.filename + " é pesado demais!")
        }
    })
    .on("queuecomplete", function(){
        updateFiles("", "README")
    })
    .on("sending", function(file, xhr, formData){
        formData.append("name", name)
        formData.append("tronco_token", getTroncoToken())
    })

    var mainTextDropzone = new Dropzone("#mainText", { url: "/api/uploadDrop", clickable: false })
    mainTextDropzone.on("success", function(file, result){
        if (result.error == "0") {
            $('#mainText').val($('#mainText').val() + "\ntronco/" + result.filename)
            saveFile()
            $('#mainText').trigger("input")
            toggleInsertSuccess()
        } else {
            if (result.error == "1") {
                alert(result.filename + " é pesado demais!")
            }
        }
    })
    .on("sending", function(file, xhr, formData) {
        formData.append("name", name)
        formData.append("tronco_token", getTroncoToken())
    })
    $(document).on("click touchmove", function(){
        $("#context-menu-checklist, #context-menu-file").removeClass("show").hide()
    })
    triggerResize(true)
})