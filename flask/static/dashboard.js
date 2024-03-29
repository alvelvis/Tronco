function countWords(str) {
    return str.trim().split(/\s+/).length
}

$('#search').on('blur', function(){
    setTimeout(function(){
        if (isMobile) {
            $('#search').slideUp()
        }
        if ($('.filename').attr('file') != "README" || $('#recentFiles').text() == 'Nenhum arquivo encontrado.') { 
            isMobile ? $('#breadcrumb-nav').slideUp() : $('#breadcrumb-nav').slideUp()
        }
    }, 150)
    //$('#search').fadeOut()
    //if ($('.filename').attr('file') != "README" || $('#recentFiles').text() == 'Nenhum arquivo encontrado.') { $('#breadcrumb-nav').fadeOut() }
    if ($('.files.active').length) {
        $(fade_on_search_focus).fadeIn()
    }
})

function updateReplaceControls(){
    $('.undo').prop('disabled', replaceUndo.length == 0)
    $('.redo').prop('disabled', replaceRedo.length == 0)
    $('#mainText').trigger('input')
}

$('.sortAction').click(function(){
    oldText = $('#mainText').val()
    action = $(this).attr('action')
    toggleProgress("Organizando...")

    $.ajax({
        url: "/api/sort",
        method: "POST",
        data: {
            old_text: oldText,
            action: action,
        },
        success: function(data){
            if (data.error == "0") {
                if (data.new_text != oldText) {
                    replaceUndo.push(oldText)
                    $('#mainText').val(data.new_text)
                    saveFile()
                    updateReplaceControls()
                    toggleProgress(false)
                }
            } else {
                    alert(data.error)
                    toggleProgress(false)
            }
        }
    })
})

$('#replaceGo').click(function(){
    toggleProgress("Substituindo...")
    oldText = $('#mainText').val()
    replaceFrom = $('#replaceFrom').val()
    replaceTo = $('#replaceTo').val()
    replaceRegex = $('#replaceRegex').prop('checked')
    replaceCase = $('#replaceCase').prop('checked')

    if (replaceFrom.length > 0) {

        $.ajax({
            url: "/api/replace",
            method: 'POST',
            data: {
                replace_regex: replaceRegex,
                replace_case: replaceCase,
                replace_from: replaceFrom,
                replace_to: replaceTo,
                old_text: oldText,
            },
            success: function(data){
                if (data.error == "0") {
                    $('#replaceLabel').html(data.occurrences + " ocorrências substituidas.")
                    $('#replaceLabel').show(true)
                    if (data.new_text != oldText) {
                        replaceUndo.push(oldText)
                        $('#mainText').val(data.new_text)
                        saveFile()
                        updateReplaceControls()
                        toggleProgress(false)
                    }
                } else {
                    alert(data.error)
                    toggleProgress(false)
                }
            }
        })
        .fail(function(){
            alert("Falha na expressão de busca")
            toggleProgress(false)
        })
    }
})

$('.undo').click(function(){
    if ($(this).attr('id') == "replaceUndo") {
        $('#replaceLabel').hide()
    }
    replaceRedo.push($('#mainText').val())
    $('#mainText').val(replaceUndo[replaceUndo.length-1])
    saveFile()
    replaceUndo.pop()
    updateReplaceControls()
})

$('.redo').click(function(){
    if ($(this).attr('id') == "replaceRedo") {
        $('#replaceLabel').hide()
    }
    replaceUndo.push($('#mainText').val())
    $('#mainText').val(replaceRedo[replaceRedo.length-1])
    saveFile()
    replaceRedo.pop()
    updateReplaceControls()
})

$('#history').click(function(){
    $('.historyControls').hide()
    $('.retrieveHistory').css('font-weight', 'normal').removeClass("historyActive")
    $('#historyCharacters').html($('#mainText').val().length)
})

$('#restoreHistory').click(function(){
    filename = $('#filename').attr('file')
    if (confirm("Tem certeza de que deseja restaurar o arquivo \"" + filename + "\" para a versão do dia " + $('.historyActive').html() + "?\nA versão atual, com " + $('#historyCharacters').html() + " caracteres, será descartada.")) {
        $('#mainText').val($('#historyMainText').text())
        saveFile()
        $('#history').click()
        $('#mainText').trigger('input')
        updateToolbar()
    }
})

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;")
}

updateQuickSearch()
function updateQuickSearch() {
    $('.quickSearch').unbind('click').click(function(){
        $('#clearAdvancedSearchMetadata').click()
        $('#advancedSearchInput').val($(this).attr('params'))
        $('#advancedSearchGo').click()
    })
}

var max_update_files = 200

$('#fullUpdateFiles').click(function(){
    alert("Limite de " + max_update_files + " arquivos atingido, utilize a barra de busca para encontrar o arquivo que deseja")
})

$('#clearAdvancedSearchMetadata').click(function(){
    $('#advancedSearchMetadataCount').html("0")
    $('.advancedSearchMetadataItem').remove()
})

$('.toggleAdvancedSearchToolbar').click(function(){
    $(".advanced-toolbar-panel").toggle(false)
    if ($(this).hasClass("btn-secondary")) {
        $("[advanced-toolbar-panel='" + $(this).attr('advanced-toolbar') + "']").toggle(true)
    }
    $('.toggleAdvancedSearchToolbar').toggleClass("btn-secondary", false).toggleClass("btn-outline-secondary", true)
    if ($("[advanced-toolbar-panel='" + $(this).attr('advanced-toolbar') + "']") && $("[advanced-toolbar-panel='" + $(this).attr('advanced-toolbar') + "']").length) {
        $("[advanced-toolbar-panel='" + $(this).attr('advanced-toolbar') + "']").toggle()
    }
    if ($("[advanced-toolbar-panel='" + $(this).attr('advanced-toolbar') + "']:visible").length) {
        $(this).toggleClass("btn-secondary", true).toggleClass("btn-outline-secondary", false)
    }
    $('.advancedSearchMetadataItem').each(function(){
        if (!$(this).find("input").val().length){
            $(this).remove()
        }
    })
    $('#advancedSearchMetadataCount').html($('.advancedSearchMetadataItem').length)
    if ($(this).attr('advanced-toolbar') == 'metadata' && $('#advancedSearchMetadataCount').text() == "0" && $('[advanced-toolbar-panel="metadata"]:visible').length) {
        $('#addAdvancedSearchMetadata').click()
    }
})

function configureRecentQueries(queries) {
    $('#builder-recent').html("")
    $('#recentSearches').toggle(queries.length > 0)
    queries_reverse = queries.reverse().slice(-10)
    for (query of queries_reverse){
        $('#builder-recent').append($($('#builder-buttons').find('button')[0]).clone().attr('title', 'Realizar busca').attr('params', query).text(query))
    }
    updateQuickSearch()
}

function indexCorpus(force=false) {
    if (force) {
        $('#navSearchPanels, .searchPanel').hide()
    }
    $('.toggleAdvancedSearchToolbar.btn-primary').click()
    toggleMain(false)
    toggleProgress("Indexando coleção...")
    runningActivities['indexing'] = setInterval(function(){
        $.ajax({
            url: "/api/getProgress",
            method: "POST",
            data: {
                'method': 'indexing',
                'session_token': getSessionToken(),
            }
        })
        .done(function(data){
            if (data.error == "0") {
                if (data.data[0] > 0) {
                    toggleProgress('Indexando coleção... (' + parseInt(data.data[1] - data.data[0]).toString() + '/' + data.data[1] + ')')
                } else {
                    clearInterval(runningActivities['indexing'])
                    toggleProgress("Só mais um pouco...")
                    runningActivities['indexing'] = setInterval(function(){
                        $.ajax({
                            url: "/api/isCorpusReady",
                            method: "POST",
                            data: {
                                'name': $('#name').html(),
                                'tronco_token': getTroncoToken(),
                            }
                        })
                        .done(function(data){
                            if (data.error == "0") {
                                clearInterval(runningActivities['indexing'])
                                toggleProgress(false)
                                toggleMain("search")
                                $('#advancedSearch').find("a").toggleClass("active", true)
                                if (!isMobile) {
                                    $('#advancedSearchInput').focus()
                                }
                                $('#advancedSearchSentences').html(" em " + data.data + " frases")
                                configureRecentQueries(data.recent_queries)
                                allMetadata = data.metadata
                                $('#indexedTime').toggle(data.indexed_time.toString().length > 0)
                                if (data.indexed_time.toString().length > 0) {
                                    indexed_time = new Date(data.indexed_time * 1000)
                                    indexed_date = indexed_time.getDate() + "/" + (parseInt(indexed_time.getMonth())+1).toString() + "/" + indexed_time.getFullYear() + " às " + indexed_time.getHours() + ":" + (indexed_time.getMinutes().toString().length == 1 ? "0" + indexed_time.getMinutes() : indexed_time.getMinutes())
                                    $('#indexedTime').html("Indexado em " + indexed_date)
                                }
                            }
                        })
                    }, 10000)
                }
            }
        })
    }, 10000)
    $.ajax({
        url: "/api/loadAdvancedCorpus",
        method: "POST",
        data: {
            "name": $('#name').html(),
            "tronco_token": getTroncoToken(),
            'session_token': getSessionToken(),
            "force": force,
        }
    })
    .done(function(data){
        clearInterval(runningActivities['indexing'])
        toggleProgress(false)
        switch (data.error) {
            case '0':
                toggleMain("search")
                $('#advancedSearch').find("a").toggleClass("active", true)
                if (!isMobile) {
                    $('#advancedSearchInput').focus()
                }
                $('#advancedSearchSentences').html(" em " + data.data + " frases")
                configureRecentQueries(data.recent_queries)
                allMetadata = data.metadata
                $('#indexedTime').toggle(data.indexed_time.toString().length > 0)
                if (data.indexed_time.toString().length > 0) {
                    indexed_time = new Date(data.indexed_time * 1000)
                    indexed_date = indexed_time.getDate() + "/" + (parseInt(indexed_time.getMonth())+1).toString() + "/" + indexed_time.getFullYear() + " às " + indexed_time.getHours() + ":" + (indexed_time.getMinutes().toString().length == 1 ? "0" + indexed_time.getMinutes() : indexed_time.getMinutes())
                    $('#indexedTime').html("Indexado em " + indexed_date)
                }
                break
            case '1':
                alert("Você não tem permissão")
                break
            case '2':
                alert("Não foram encontrados arquivos nesta coleção")
                gotoFile("README")
                break
        }
    })
    .fail(function(){
        
    })
}

$('#reindexCorpus').click(function(){
    if (confirm("Deseja indexar a coleção novamente? Pode demorar um pouco, a depender do tamanho da coleção.")) {
        indexCorpus(true)
    }
})

$('.toggleSearch').click(function(){
    $('.toggleSearch').toggleClass("active", false)
    $(this).toggleClass("active", true)
    $('.searchPanel').toggle(false)
    $('#' + $(this).attr('panel')).toggle(true)
})

function toggleMain(panel) {
    $('#filename-div, #filename, #mainText, #saved, #toolbarRow, #toolbar, #hr, #breadcrumb-nav').toggle(false)
    $('#search').toggle(!isMobile)
    $('#searchMain').toggle(false)
    if (panel) {
        switch (panel) {
            case "file":
                $('#advancedSearch').find('a').toggleClass("active", false)
                $('#filename-div, #filename').toggle(!isMobileFromBeginning)
                $('#saved, #mainText, #toolbarRow, #toolbar, #hr').toggle(true)
                break
            case "search":
                $('#searchMain').toggle(true)
                $('#advancedSearchToolbarRow').scrollLeft(0)
                $('.files').toggleClass("active", false)
                $('#filenameMobile').html("")
                break
        }
    }
    if (isMobile && $('#sidebar:visible').length) {
        $('.toggleSettings')[0].click()
    }
}

$('#addAdvancedSearchMetadata').click(function(){
    if ($('#advancedSearchMetadataCount').html()) {
        count = parseInt($('#advancedSearchMetadataCount').html())
    } else {
        count = 0
    }
    $('#advancedSearchMetadataCount').html(count + 1)
    newMetadata = `<div class="advancedSearchMetadataItem input-group mb-3">
                        <div class="input-group-prepend">
                            <select class="custom-select">`
    for (metadata of allMetadata) {
        if (default_metadata.indexOf(metadata) == -1){
            newMetadata = newMetadata + '<option>' + metadata + '</option>'
        }
    }
    newMetadata = newMetadata + `</select>
                        </div>
                        <input type="text" class="form-control">
                    </div>`
    $('#advancedSearchMetadata').append(newMetadata)
    checkTheme()
})

function toggleProgress(label=false){
    if (label) {
        title = ($('title').html().indexOf(") ") >= 0 ? $('title').html().split(") ")[1] : $('title').html())
        $('title').html("(" + label + ") " + title)
        $('#progress-label').html(label)
        $('#progress-div').show()
    } else {
        if ($('title').html().indexOf(") ") >= 0) {
            $('title').html($('title').html().rsplit(") ", 1)[1])
        }
        $('#progress-div').hide()
    }
}

function metadataItemUpdate() {
    $('.metadataItem').unbind('keyup').on('keyup', function(e){
        if (e.which == 13) {
            $('#saveMetadata').click()
        }
    })
}

function updateSearchTables(data, tables) {

    if (tables.indexOf("query_results") >= 0) {
        $('#query_results').find('.dynamic').html(`
        <table class="searchTable table" style="word-break:break-all">
            <tr>
                <th style="cursor:pointer; min-width:50px; ` + (!$('#advancedSearchShowId').prop('checked') ? "" : "display:none") + `" onclick="sortTable(0, 'float')" scope="col">#</th>
                <th style="cursor:pointer; min-width:100px; ` + (!$('#advancedSearchShowFilename').prop('checked') ? "" : "display:none") + `" onclick="sortTable(1, 'string')" scope="col">Arquivo</th>
                <th style="cursor:pointer;" onclick="sortTable(2, 'string')" scope="col">Frase</th>
            </tr>
        </table>
        `).append('<nav class="justify-content-center"><ul style="overflow-x:' + (isMobile ? 'scroll' : 'auto') + '" class="pagination"><li class="page-item ' + (data.data.page == 1 ? "disabled" : "") + '"><a table="query_results" class="page-link">Anterior</a></li><li class="page-item page-item-next ' + (data.data.page == data.data.pages.query_results ? "disabled" : "") + '"><a table="query_results" class="page-link">Próximo</a></li></ul></nav>')

        for (i of Array(data.data.pages.query_results).keys()) {
            $('#query_results').find('.page-item-next').before('<li class="page-item ' + (data.data.page == i+1 ? "active" : "") + '"><a class="page-link" table="query_results">' + parseInt(i+1).toString() + '</a></li>')
        }

        n = 1
        for (sentence of data.data.query_results) {
            $('#query_results').find("table").append("<tr>" + "<td " + (!$('#advancedSearchShowId').prop("checked") ? "" : "style='display:none'") + ">" + parseInt(n+((data.data.page-1)*100)).toString() + "</td>" + "<td " + (!$('#advancedSearchShowFilename').prop("checked") ? "" : "style='display:none'") + "><a title='Ir para arquivo' class='gotoFile'>" + sentence[0].rsplit("-", 1)[0] + "</td>" + "<td>" + sentence[1] + "</td></tr>")
            n ++
        }
        if ($('#advancedSearchShowGaps').prop('checked')) {
            $('#query_results').find("b").html("________________")
        }
    }

    if (tables.indexOf("word_distribution") >= 0) {

        $('#word_distribution').find('.dynamic').html(`
        <table class="searchTable table" style="word-break:break-all">
            <tr>
                <th style="cursor:pointer; min-width:50px;" onclick="sortTable(0, 'float')" scope="col">#</th>
                <th style="cursor:pointer" onclick="sortTable(1, 'string')" scope="col">Palavra</th>
                <th style="cursor:pointer; min-width:50px;" onclick="sortTable(2, 'float')" scope="col">Oc.</th>
            </tr>
        </table>
        `).append('<nav class="justify-content-center"><ul style="overflow-x:' + (isMobile ? 'scroll' : 'auto') + '" class="pagination"><li class="page-item ' + (data.data.page == 1 ? "disabled" : "") + '"><a table="word_distribution" class="page-link">Anterior</a></li><li class="page-item page-item-next ' + (data.data.page == data.data.pages.word_distribution ? "disabled" : "") + '"><a table="word_distribution" class="page-link">Próximo</a></li></ul></nav>')

        for (i of Array(data.data.pages.word_distribution).keys()) {
            $('#word_distribution').find('.page-item-next').before('<li class="page-item ' + (data.data.page == i+1 ? "active" : "") + '"><a class="page-link" table="word_distribution">' + parseInt(i+1).toString() + '</a></li>')
        }

        n = 1
        for (word of data.data.word_distribution) {
            $('#word_distribution').find("table").append("<tr><td>" + parseInt(n+((data.data.page-1)*100)).toString() + "</td><td><a title='Buscar esta palavra' class='gotoWord'>" + word[0] + "</td><td>" + word[1] + "</td></tr>")
            n ++
        }
    }

    if (tables.indexOf("lemma_distribution") >= 0) {

        $('#lemma_distribution').find('.dynamic').html(`
        <table class="searchTable table" style="word-break:break-all">
            <tr>
                <th style="cursor:pointer; min-width:50px;" onclick="sortTable(0, 'float')" scope="col">#</th>
                <th style="cursor:pointer" onclick="sortTable(1, 'string')" scope="col">Lema</th>
                <th style="cursor:pointer; min-width:50px;" onclick="sortTable(2, 'float')" scope="col">Oc.</th>
            </tr>
        </table>
        `).append('<nav class="justify-content-center"><ul style="overflow-x:' + (isMobile ? 'scroll' : 'auto') + '" class="pagination"><li class="page-item ' + (data.data.page == 1 ? "disabled" : "") + '"><a table="lemma_distribution" class="page-link">Anterior</a></li><li class="page-item page-item-next ' + (data.data.page == data.data.pages.lemma_distribution ? "disabled" : "") + '"><a table="lemma_distribution" class="page-link">Próximo</a></li></ul></nav>')

        for (i of Array(data.data.pages.lemma_distribution).keys()) {
            $('#lemma_distribution').find('.page-item-next').before('<li class="page-item ' + (data.data.page == i+1 ? "active" : "") + '"><a class="page-link" table="lemma_distribution">' + parseInt(i+1).toString() + '</a></li>')
        }

        n = 1
        for (lemma of data.data.lemma_distribution) {
            $('#lemma_distribution').find("table").append("<tr><td>" + parseInt(n+((data.data.page-1)*100)).toString() + "</td><td><a title='Buscar este lema' class='gotoLemma'>" + lemma[0] + "</td><td>" + lemma[1] + "</td></tr>")
            n ++
        }
    }

    $('.gotoWord').click(function(){
        $('#advancedSearchInput').val('word = "' + $(this).text() + '"')
        $('#advancedSearchGo').click()
    })

    $('.gotoLemma').click(function(){
        $('#advancedSearchInput').val('lemma = "' + $(this).text() + '"')
        $('#advancedSearchGo').click()
    })

    $('.gotoFile').click(function(){
        gotoFile($(this).text())
    })

    $('[table="query_results"], [table="word_distribution"], [table="lemma_distribution"]').unbind('click').click(function(){
        page = $(this).html()
        table = $(this).attr('table')
        switch (page) {
            case 'Anterior':
                page = parseInt($('#' + table).find('.active').find('.page-link').html())-1
                break
            case 'Próximo':
                page = parseInt($('#' + table).find('.active').find('.page-link').html())+1
                break
        }
        $.ajax({
            url: "/api/queryPagination",
            method: "POST",
            data: {
                'name': $('#name').html(),
                'tronco_token': getTroncoToken(),
                'table': table,
                'page': page,
                'session_token': getSessionToken()
            }
        })
        .done(function(data){
            updateSearchTables(data, [table])
        })
    })
    window.scrollTo(0,0)
    checkTheme()
}

$('#advancedSearchGo').click(function(){
    $('.toggleAdvancedSearchToolbar.btn-primary').click()
    $('#advancedSearchToolbarRow').scrollLeft(0)
    if ($('#advancedSearchInput').val().length) {
        $('#advancedSearchInput').toggleClass("is-invalid", false)
        metadata = []
        metadata_dic = {}
        $('.advancedSearchMetadataItem').each(function(){
            if (!$(this).find("input").val().length){
                $(this).remove()
            } else {
                metadata.push(encodeURIComponent($(this).find("select").val()) + "=" + encodeURIComponent($(this).find("input").val()))
                metadata_dic[$(this).find("select").val()] = $(this).find("input").val()
            }
        })
        window.history.pushState("", "", '/corpus/' + name + "?search=" + encodeURIComponent($('#advancedSearchInput').val()) + "&" + metadata.join("&"))
        //$('[panel="searchResults"].toggleSearch').click()
        toggleProgress("Buscando...")
        $('#advancedSearchToolbarRow button').prop('disabled', true)
        window.scrollTo(0, 0)
        $.ajax({
            url: "/api/query",
            method: "POST",
            data: {
                "name": $('#name').html(),
                "tronco_token": getTroncoToken(),
                "session_token": getSessionToken(),
                "params": $('#advancedSearchInput').val(),
                "metadata": JSON.stringify(metadata_dic)
            }
        })
        .done(function(data){
            $('#navSearchPanels').show()
            $('[panel="query_results"].toggleSearch').click()
            switch (data.error) {
                case '0':
                    $('#query_results').find('.sentences').html(data.data.sentences)
                    $('#query_results').find('.occurrences').html(data.data.occurrences)
                    $('#word_distribution').find('.words').html(data.data.words)
                    $('#word_distribution').find('.occurrences').html(data.data.word_occurrences)
                    $('#lemma_distribution').find('.lemmas').html(data.data.lemmas)
                    $('#lemma_distribution').find('.occurrences').html(data.data.lemma_occurrences)
                    updateSearchTables(data, ["query_results", "word_distribution", "lemma_distribution"])
                    configureRecentQueries(data.recent_queries)
                    break
                case '1':
                    alert("Você não permissão para realizar a busca")
                    break
            }
            toggleProgress(false)
            $('#advancedSearchToolbarRow button').prop('disabled', false)
        })
        .fail(function(){
            toggleProgress(false)
            $('#advancedSearchToolbarRow button').prop('disabled', false)
            alert("A busca retornou um erro")
        })
    } else {
        $('#advancedSearchInput').toggleClass("is-invalid", true)
    }
})

$('#advancedSearch').click(function(){
    $('title').html($('title').html().replace(/(\(.*?\))?.*/, "$1" + " " + $('#name').html() + " - Tronco"))
    toggleMobile('mobileAdvancedSearch')
    indexCorpus()
})

$('#saveMetadata').click(function(){
    $('.metadataItem').prop('disabled', true)
    $('.changeMetadata').prop('disabled', true)
    $('.removeMetadata').unbind("click")
    toggleProgress("Atualizando metadados...")
    metadata = {}
    $('.metadataItem').each(function(){
        metadata[$(this).attr('key')] = $(this).val()
    })
    $.ajax({
        url: "/api/saveMetadata",
        method: "POST",
        data: {
            "name": $('#name').html(),
            "filename": $('#filename').attr('file'),
            "metadata": JSON.stringify(metadata),
            "tronco_token": getTroncoToken(),
        }
    })
    .done(function(){
        $('#saveMetadata').toggleClass("btn-primary", false).toggleClass("btn-success", true)
        $('.metadataItem').prop('disabled', false)
        $('.changeMetadata').prop('disabled', false)
        $('#saveMetadataLabel').html("Salvo!")
        toggleProgress(false)
        updateMetadataRemove()
        setTimeout(function(){
            $('#saveMetadata').toggleClass("btn-primary", true).toggleClass("btn-success", false)
            $('#saveMetadataLabel').html("")
        }, 2000)
    })
    .fail(function(){
        alert("Falha na sincronização")
    })
})

function updateMetadataRemove() {
    $('.removeMetadata').unbind("click")
    if (permEdit) {
        $('.removeMetadata').click(function(){
            value = $(this).parents(".metadataDiv").children('.metadataItem').val()
            key = $(this).parents(".metadataDiv").children(".metadataItem").attr('key')
            if(confirm("Deseja remover o metadado " + key + "?")) {
                $(this).parents(".metadataDiv").remove()
                $('#saveMetadata').click()
            }
        })
    }
    $('.metadataItem').prop('disabled', !permEdit)
    $('.removeMetadata svg, .removeMetadata span').toggle(permEdit)
}

$('#newMetadata').click(function(){
    newKey = prompt("Dê um nome ao novo metadado:", "")
    if (newKey && newKey.length) {
        if (default_metadata.indexOf(newKey) >= 0 || $('[key="' + newKey + '"]').length) {
            alert("Metadado já existe!")
        } else {
            $('#metadataItems').append('<div class="input-group pb-3 metadataDiv"><div class="input-group-prepend"><a class="metadataKey removeMetadata input-group-text"><span title="Remover metadado" class="removeMetadata" data-feather="x"></span>' + newKey + '</a></div><input type="text" class="metadataItem form-control" key="' + newKey + '"></div>')
            checkTheme()
            updateMetadataRemove()
            metadataItemUpdate()
            $('#saveMetadata').click()
            feather.replace()
        }
    }
})

function loadMetadata(metadata, readme=false) {
    first_seen = new Date(metadata.first_seen * 1000)
    first_seen_string = "<div class='py-2'><span data-feather='calendar'></span> Data de criação: " + first_seen.getDate() + "/" + (parseInt(first_seen.getMonth())+1).toString() + "/" + first_seen.getFullYear() + " às " + first_seen.getHours() + ":" + (first_seen.getMinutes().toString().length == 1 ? "0" + first_seen.getMinutes() : first_seen.getMinutes()) + "</div>"
    if (readme) {
        metadataItems = "<div class='pb-2'>Dica: Os metadados deste arquivo serão aplicados a todos os outros arquivos da coleção.<br>" + first_seen_string + "</div>"
    } else {
        metadataItems = "<div class='pb-2'>" + first_seen_string + "</div>"
    }
    for (key of Object.keys(metadata)) {
        if (default_metadata.indexOf(key) == -1)
        metadataItems = metadataItems + '<div class="input-group pb-3 metadataDiv"><div class="input-group-prepend"><a class="metadataKey removeMetadata input-group-text"><span title="Remover metadado" data-feather="x"></span>' + key + '</a></div><input type="text" class="metadataItem form-control" key="' + key + '"></div>'
    }
    $('#metadataItems').html(metadataItems)
    $('.metadataItem').each(function(){
        $(this).val(metadata[$(this).attr("key")])
    })
    checkTheme()
    updateMetadataRemove()
    metadataItemUpdate()
    feather.replace()
}

$('.pinFileContext').click(function(){
    pinFile(filedivcontext.attr('file'))
})

$('.renameFileContext').click(function(){
    renameFile(filedivcontext.attr('file'))
})

$('.deleteFileContext').click(function(){
    deleteFile(filedivcontext.attr('file'))
})

$('.newDownCheckbox').click(function(){
    checkboxString = checkboxdiv.find(".custom-control-label").text()
    pattern = RegExp("\\[[xX]?\\]\\s?" + escapeRegExp(checkboxString), "g")
    is_checked = checkboxdiv.find("[type=checkbox]").prop("checked")
    newString = prompt("Novo item:", "")
    if (newString && newString.length) {
        $('#mainText').val($('#mainText').val().replace(pattern, "[" + (is_checked ? "x" : "") + "] " + checkboxString + "\n[] " + newString))
        saveFile()
        updateToolbar()
    }
})

$('.newUpCheckbox').click(function(){
    checkboxString = checkboxdiv.find(".custom-control-label").text()
    pattern = RegExp("\\[[xX]?\\]\\s?" + escapeRegExp(checkboxString), "g")
    is_checked = checkboxdiv.find("[type=checkbox]").prop("checked")
    newString = prompt("Novo item:", "")
    if (newString && newString.length) {
        $('#mainText').val($('#mainText').val().replace(pattern, "[] " + newString + "\n[" + (is_checked ? "x" : "") + "] " + checkboxString))
        saveFile()
        updateToolbar()
    }
})

$('.editCheckbox').click(function(){
    checkboxString = checkboxdiv.find(".custom-control-label").text()
    pattern = RegExp("\\[[xX]?\\]\\s?" + escapeRegExp(checkboxString), "g")
    is_checked = checkboxdiv.find("[type=checkbox]").prop("checked")
    newString = prompt("Editar item:", checkboxString)
    if (newString && newString.length && newString != checkboxString) {
        $('#mainText').val($('#mainText').val().replace(pattern, "[" + (is_checked ? "x" : "") + "] " + newString))
        saveFile()
        updateToolbar()
    }
})

$('.deleteCheckbox').click(function(){
    checkboxString = checkboxdiv.find(".custom-control-label").text()
    pattern = RegExp("\\[[xX]?\\]\\s?" + escapeRegExp(checkboxString) + "\n?", "g")
    $('#mainText').val($('#mainText').val().replace(pattern, ""))
    saveFile()
    updateToolbar()
})

function toggleInsertSuccess(){
    $('.insertLabel').html("Adicionado!")
    updateToolbar()
    $('.dropdown-toggle').toggleClass("btn-outline-secondary", false).toggleClass("btn-success", true)
    setTimeout(() => { 
        $('.insertLabel').html('Inserir')
        feather.replace()
        $('.dropdown-toggle').toggleClass("btn-outline-secondary", true).toggleClass("btn-success", false)
    }, 2000)
}

function gotoFile(filename=$('#search').val(), forceUpdate=false, skipFind=false){
    recentFiles('')
    toggleMain(false)
    $('.files').toggleClass("active", false)
    if ($('[file="' + filename + '"].files')) {
        $('[file="' + filename + '"].files').toggleClass('active', true)
        $('#advancedSearch').find('a').toggleClass("active", false)
    }
    if (skipFind) {
        updateFiles("", load=filename, forceUpdate)
        $('#advancedSearch').find('a').toggleClass("active", false)
        if (special_files.indexOf(filename) == -1) {
            $('title').html($('title').html().replace(/(\(.*?\))?.*/, "$1" + " " + filename + " - Tronco"))
        } else {
            $('title').html($('title').html().replace(/(\(.*?\))?.*/, "$1" + " " + $('#name').html() + " - Tronco"))
        }
    } else {
        $.ajax({
            url: '/api/findOrCreateFile',
            method: 'POST',
            data: {
                "name": $('#name').html(),
                "filename": filename,
                "tronco_token": getTroncoToken()
            }
        })
        .done(function(data){
            updateFiles("", load=data.data, forceUpdate)
            $('#advancedSearch').find('a').toggleClass("active", false)
            if (special_files.indexOf(filename) == -1) {
                $('title').html($('title').html().replace(/(\(.*?\))?.*/, "$1" + " " + data.data + " - Tronco"))
            } else {
                $('title').html($('title').html().replace(/(\(.*?\))?.*/, "$1" + " " + $('#name').html() + " - Tronco"))
            }
            $('#search').val('')
            //$('#search').blur()
        })
    }
}

function toggleMobile(el) {
    $('#mobile-nav').toggle(false)
    $('.mobile-btn').toggle(false)
    if (el && isMobile) {
        $('#mobile-nav').toggle(true)
        switch (el) {
            case "mobileFile":
                $('#mobileHome').show()
                $('#mobileMenu').show()
                $('#mobileSearch').show()
                $('#mobileTronco').show()
                $('.mobileEdit').toggle(permEdit)
                $('#mobileMenu').toggleClass("mobile-btn-active", false)
                break
            case "mobileAdvancedSearch":
                $('#mobileHome').show()
                $('#mobileMenu').show()
                $('#mobileSearch').show()
                $('#mobileTronco').show()
                $('#mobileHome').toggleClass("mobile-btn-active", false)
                $('#mobileMenu').toggleClass("mobile-btn-active", false)
                break
            case "mobileNoPerm":
                $('#mobileMenu').show()
                $('#mobileTronco').show()
                $('#mobileMenu').toggleClass("mobile-btn-active", false)
                break
            case "mobileSidebar":
                $('#mobileMenu').show()
                $('#mobileTronco').show()
                $('#mobileHome').toggle(permView)
                $('#mobileSearch').toggle(permView)
                $('#mobileMenu').toggleClass("mobile-btn-active", true)
                break
            case "mobileLeft":
                $('#mobile-nav').toggle(false)
                $('#mobileLeft').show()
                break
        }
    }
}

$('#mobileTronco').click(function(){
    window.location.href = '/?load=false'
})

$('#mobileHome').click(function(){
    $('[file=README]').click()
})

$('#mobileSearch').click(function(){
    if (isMobile && !$('#sidebar').hasClass('d-none')) {
        $('.toggleSettings')[0].click()
    }
    $('#search').show()
    $('#search').focus()
})

$('#mobileEdit').click(function(){
    mainTextEdit()
    $('#mainText').trigger('input')
})

$('#mobileLeft').click(function(){
    mainTextBlur()
    $('#mainText').trigger('input')
})

String.prototype.rsplit = function(sep, maxsplit) {
    var split = this.split(sep);
    return maxsplit ? [ split.slice(0, -maxsplit).join(sep) ].concat(split.slice(-maxsplit)) : split;
}

$('.insertDate').click(function(){
    date = new Date()
    $('#mainText').val(date.getDate() + "/" + (parseInt(date.getMonth())+1).toString() + "/" + date.getFullYear() + " " + date.getHours() + ":" + (date.getMinutes().toString().length == 1 ? "0" + date.getMinutes() : date.getMinutes()) + "\n" + $('#mainText').val())
    saveFile()
    $('#mainText').trigger("input")
    toggleInsertSuccess()
});

$('.insertChecklist').click(function(){
    n_checklists = $('#mainText').val().match(/\[(x)?\]/gi)
    where_to_insert = $(this).attr('where')
    item_label = prompt("Novo item de checklist:", "")
    if (item_label && item_label.length) {
        switch (where_to_insert) {
            case 'bottom':
                $('#mainText').val($('#mainText').val() + "\n[] " + item_label)
                break
            case 'top':
                $('#mainText').val("[] " + item_label + "\n" + $('#mainText').val())
                break
        }
        saveFile()
        $('#mainText').trigger("input")
        toggleInsertSuccess()
    }
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
        extension = file.name.rsplit(".", 1)[1]
        filename = prompt("Dê um nome para o arquivo:", file.name.rsplit(".", 1)[0])
        if (filename.length) {
            toggleProgress("Enviando...")
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
                        $('#mainText').val("tronco/" + result.filename + "\n" + $('#mainText').val())
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
            .done(function(){
                toggleProgress(false)
                $('.uploadFile').val('')
            })
            .fail(function(){
                alert("Não foi possível enviar")
                toggleProgress(false)
            })
        }
    }
})

$('#settingsDiv').click(function(){
    $('#settings').toggle()
    $(this).css('font-weight', ($('#settings').is(':visible') ? 'bold' : 'normal'))
})

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function changeATitle(link){
    $.ajax({
        url: "https://textance.herokuapp.com/title/" + link,
        complete: function(data) {
            if (link.indexOf('"') == -1 && data.responseText){ 
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

    list_media = $('#mainText').val().matchAll(/tronco\/(\S+)(\s|$|\n)/gi)
    for (media of list_media) {
        if (media[1].match(/.*\.(png|jpe?g|jfif|bmp|gif|ico)$/)) {
            images.push([media[1], "/media/" + media[1], media[1]])
        } else {
            files.push([media[1], "/media/" + media[1]])
        }
    }

    list_check = $('#mainText').val().matchAll(/\[(x)?\]\s?(.+)($|\n)/gi)
    for (check of list_check) {
        checklist.push([check[1] ? true : false, check[2]])
    }

    list_files = $('#mainText').val().matchAll(/\[([^\]]+:)?([^\]]+?)\]/gi)
    for (file of list_files) {
        if (file[1]) {
            files.push(file[2] + ":" + file[1])
        }
        if (file[2].indexOf('"') == -1 && file[2].indexOf("'") == -1 && $('[file="' + file[2] + '"]').length) {
            files.push(file[2])
        }
    }

    shared_n = $('#mainText').val().toString().replace(/\n/g, '<troncolb>').replace(/\s/g, "  ")
    shared_n = shared_n.replace(/<troncolb>/g, "\n\n")
    list_links = shared_n.matchAll(/(^|\n)([^\n]*?)(https?:\/\/(www\.)?([^\s\n]*?))(\s|\n|$)/gi)
    for (link of list_links) {
        if (link[3].match(/\.(png|jpe?g|jfif|bmp|gif|ico)$/i)) {
            images.push([link[5], link[3], link[2].trim().replace(/\[x?\]/g, "")])
        } else {
            links.push([link[5], link[3], link[2].trim().replace(/\[x?\]/g, "")])
        }
    }

    if (checklist.length) {
        $('#checklist').toggle(true)
        $('#checklistLabel').html("Checklist (" + checklist.filter(x => x[0]).length + "/" + checklist.length + ")")
        $('[toolbar=checklist] .checklist-items').html('')
        for (check in checklist) {
            $('[toolbar=checklist] .checklist-items').append('<div class="form-row checkbox-item-div align-items-left"><div ' + (isMobile ? ' ' : " ") + ' class="pl-1 ml-1 my-1' + (isMobile ? " cancelDrag " : " ") + 'checkbox-item-subdiv"><div class="custom-control custom-checkbox mr-sm-2"><input type="checkbox" ' + (checklist[check][0] ? 'checked="true"' : '') + ' class="custom-control-input file-checkbox" id="checkbox-' + check + '">' + (isMobile ? '<span style="cursor:pointer" class="mr-2 checklist-draggable" data-feather="more-vertical"></span>': "" ) + '<label class="custom-control-label' + (isMobile ? " " : " checklist-draggable ") + 'checklist-label" style="cursor:pointer; user-select: none; -webkit-user-select: none; -khtml-user-select: none; -moz-user-select: none; -ms-user-select: none;" for="checkbox-' + check + '">' + escapeHtml(checklist[check][1]) + '</label></div></div></div>')
        }
        $(".checklist-items").sortable({
            revert: false,
            axis: "y",
            handle: '.checklist-draggable',
            start: function(event, ui) {
                ui.item.css('font-weight', 'bold')
            },
            stop: function(event, ui) {
                
                previousIndex = parseInt(ui.item.find('input').attr('id').split("-")[1])
                previousDiv = $('.checkbox-item-subdiv').eq(previousIndex)
                previousTop = previousDiv.parents('.checkbox-item-div').position().top
                newTop = ui.item.position().top
                previousIndex = ui.item.index()
                
                if (previousTop < newTop) {
                    newIndex = previousIndex + 1
                } else {
                    newIndex = previousIndex - 1
                }
                previousDiv = $('.checkbox-item-subdiv').eq(previousIndex)
    
                previousString = previousDiv.find(".custom-control-label").text()
                previousPattern = RegExp("\\[[xX]?\\]\\s?" + escapeRegExp(previousString) + "\n?", "g")
                previous_is_checked = previousDiv.find("[type=checkbox]").prop("checked")
        
                new_is_checked = $($('.checkbox-item-subdiv')[newIndex]).find("[type=checkbox]").prop("checked")//$('.checkbox-item-subdiv').length-1
                newString = $($('.checkbox-item-subdiv')[newIndex]).find(".custom-control-label").text()
                newPattern = RegExp("\\[[xX]?\\]\\s?" + escapeRegExp(newString), "g")
                
                if (previousIndex == 0) {
                    $('#mainText').val("[" + (previous_is_checked ? "x" : "") + "] " + previousString + "\n" + $('#mainText').val().replace(previousPattern, ""))
                } else {
                    if (previousIndex == $('.checkbox-item-subdiv').length -1) {
                        $('#mainText').val($('#mainText').val().replace(previousPattern, "") + "\n" + "[" + (previous_is_checked ? "x" : "") + "] " + previousString)
                    } else {
                        if (previousTop < newTop) {
                            $('#mainText').val($('#mainText').val().replace(previousPattern, "").replace(newPattern, "[" + (previous_is_checked ? "x" : "") + "] " + previousString + "\n" + "[" + (new_is_checked ? "x" : "") + "] " + newString))
                        } else {
                            $('#mainText').val($('#mainText').val().replace(previousPattern, "").replace(newPattern, "[" + (new_is_checked ? "x" : "") + "] " + newString + "\n" + "[" + (previous_is_checked ? "x" : "") + "] " + previousString))
                        }
                    }
                }
                saveFile()
                updateToolbar()
            }
        })
        
        $('.checklist-items').disableSelection()
        $('.checkbox-item-subdiv').css('overflow-x', isMobile ? "scroll" : "auto").css("white-space", "nowrap")
        $('.file-checkbox').change(function(){
            checkString = $('[for="' + $(this).attr('id') + '"]').text()
            toCheck = $(this).prop('checked')
            pattern = RegExp("\\[[xX]?\\]\\s?" + escapeRegExp(checkString), "g")
            $('#mainText').val($('#mainText').val().replace(pattern, "[" + (toCheck ? "x" : "") + "] " + checkString))
            saveFile($('#filename').attr('file'), $('#mainText').val())
            updateToolbar()
        })

        $('.checkbox-item-subdiv').on('contextmenu', function(e) {
            toggleMobile(false)
            $('.checkbox-item-subdiv').removeClass('highlight')
            $(this).addClass("highlight")
            checkboxdiv = $(this)
            var top = e.pageY
            var left = e.pageX
            $("#context-menu-checklist").css({
                display: "block",
                top: top,
                left: left
            }).addClass("show")
            return false //blocks default Webbrowser right click menu
        })

    } else {
        $('#checklist').toggle(false)
        if ($('[toolbar=checklist]').is(':visible')) {
            $('#checklist').click()
        }        
    }
    
    if (links.length) {
        $('#links').toggle(true)
        $('#linksLabel').html("Links (" + links.length + ")")
        $('[toolbar=links]').html("")
        for (link in links) {
            $('[toolbar=links]').append('<div class="link-div"><a target="_blank" class="px-1" href="' + links[link][1] + '">' + (links[link][2].length > 0 ? links[link][2] : escapeHtml(links[link][0])) + '</a></div>' + (link == links.length -1 ? "" : ""))
            if (links[link][2].length <= 0) {
                changeATitle(links[link][1])
            }
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
            $('[toolbar=images]').append('<div class="image-div"><a target="_blank" class="px-1" href="' + images[link][1] + '">' + (images[link][2].length > 0 ? images[link][2] : escapeHtml(images[link][0])) + '</a></div>' + (link == images.length -1 ? "" : ""))
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
                $('[toolbar=filesLink]').append('<div class="file-div"><a href="' + files[link][1] + '" target="' + target_href + '" class="openFileLink px-1">' + escapeHtml(files[link][0]) + '</a></div>' + (link == files.length -1 ? "" : ""))
            } else {
                $('[toolbar=filesLink]').append('<div class="file-div"><a href="/corpus/' + (files[link].indexOf(":") == -1 ? $('#name').html() : files[link].split(":")[1]) + '?file=' + files[link].split(":")[0] + '" class="openFileLink px-1">' + (files[link].indexOf(":") == -1 ? "" : "(" + files[link].split(":")[1] + ") ") + escapeHtml(files[link].split(":")[0]) + '</a></div>' + (link == files.length -1 ? "" : ""))
            }
        }
        $('.file-div').css('overflow-x', isMobile ? "scroll" : "auto").css("white-space", "nowrap")
    } else {
        $('#filesLink').toggle(false)
        $('[toolbar=filesLink]').toggle(false)
    }

    $('#shareText').toggle(!is_local && $('#filename').attr('file') != "ARCHIVE")
    $('#metadata').toggle($('#advancedEditingCheckbox').prop('checked') && permView && $('#filename').attr('file') != "ARCHIVE")
    $('#replace').toggle($('#advancedEditingCheckbox').prop('checked') && permEdit && $('#filename').attr('file') != "ARCHIVE")
    $('#sort').toggle($('#advancedEditingCheckbox').prop('checked') && permEdit && $('#filename').attr('file') != "ARCHIVE")
    $('#dropdown, .insertChecklist').toggle(permEdit)
    if (isMobile) {
        $('#toolbarRow').scrollLeft(0)
    }
    
    feather.replace()
    /*
    if (!isMobile) {
        $('#mainText').css("margin-top", $("#editingPanel").height())  
    } else {
        $('#mainText').css("margin-top", "")
    }*/

    $('.openFileLink').click(function(e){
        name = $('#name').html()
        filename = $(this).text()
        if ($('#filename').attr('file') == "ARCHIVE") {
            e.preventDefault()
            if (confirm('Deseja restaurar o arquivo "' + filename + '"?')) {
                $.ajax({
                    url: '/api/restoreFile',
                    method: "POST",
                    data: {
                        'name': name,
                        'tronco_token': getTroncoToken(),
                        'filename': filename,
                    }
                })
                .done(function(data){
                    switch(data.error) {
                        case '0':
                            pattern = RegExp("tronco/" + filename + "\n", "g")
                            saveFile("ARCHIVE", $('#mainText').val().replace(pattern, ""))
                            gotoFile(filename, true)
                            break
                        case '1':
                            alert('Permissões inválidas.')
                            break
                        case '2':
                            alert("Arquvo não está mais na lixeira.")
                            break
                    }                    
                })
            }
        }
    })

    if ($('.toolbarButton.btn-primary').length) {
        if ($('.toolbarButton.btn-primary').is(":visible")) {
            if ($('.toolbarButton.btn-primary').attr('id') != "shareText") {
                $('[toolbar=' + $('.toolbarButton.btn-primary').attr('id') + ']').show()
            }
        } else {
            $('[toolbar=' + $('.toolbarButton.btn-primary').attr('id') + ']').hide()
        }
    } else {
        $('[toolbar=' + $('.toolbarButton.btn-primary').attr('id') + ']').hide()
    }

    // resize toolbar buttons in mobile
    if ($('#history').find('.toolbar-label').html().length == 0 || (!isMobile && $('#toolbar-group')[0].scrollWidth > $('#toolbarRow')[0].clientWidth) || (isMobile && $('#toolbarRow')[0].clientWidth / $('#toolbar-group')[0].scrollWidth < 0.7)) {
        $('.toolbar-label').each(function(){
            $(this).html($(this).html().replace(/[^\(]*/, ""))
        })
    }
}

$('#troncoHome').click(function(){
    window.location.href = '/?load=false'
})

function shouldReload(should){
    $('#mainText').prop("readOnly", should)
    $('#reloadPage').toggle(should)
    if (should) {
        $('#mobileEdit').toggle(false)
        reloadPage.scrollIntoView()
        $('#saved').remove()
        $('.toolbarButton, #dropdown').remove()
        $('.toolbar').remove()
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
    /*if (!isMobile) {
        $('#mainText').css("margin-top", $("#editingPanel").height())  
        $('[toolbar=checklist]').toggleClass("mb-5", false)
    } else {
        $('#mainText').css("margin-top", "")
        $('[toolbar=checklist]').toggleClass("mb-5", true)
        $('#mainText').toggle(!$('[toolbar=checklist]').is(":visible"))
        $('#mainText').trigger('input')
    }*/
})

$('#reloadPage').click(function(){
    window.location.reload()
})

function shareFile(filename, share) {
    $.ajax({
        url: "/api/shareFile",
        method: "POST",
        data: {
            'name': $('#name').html(),
            'filename': filename,
            'tronco_token': getTroncoToken(),
            'share': share
        }
    })
    .done(function(data){
        switch (data.error) {
            case '0':
                if (share == "true") {
                    
                } else {
                    $('#shareText').click()
                    $('#shareLinkLabel').html("Acesso revogado")
                    $('#shareText').toggleClass("btn-danger", true)
                    $('#shareText').toggleClass("btn-outline-secondary", false)
                    setTimeout(function(){
                        $('#shareText').toggleClass("btn-danger", false)
                        $('#shareText').toggleClass("btn-outline-secondary", true)
                        $('#shareLinkLabel').html("Compartilhar")
                    }, 2000)
                }
                break
        }
        updateFiles("", "", true)
    })
}

$('#shareText').click(function(){
    $('[toolbar=shareText]').find('span').html("Visitantes " + (visitant_view_perm ? "" : " não ") + "podem visualizar esta coleção" + (visitant_view_perm ? ", basta compartilhar o link deste arquivo." : ", exceto por este arquivo, que está público." + (permEdit ? "<br><a href='#' id='revokeFileAccess'>Clique aqui para tornar o arquivo privado.</a><br>" : "")))
    link = window.location.href.match(/^.*\//)[0] + $('#name').html().replace(/\s/g, "%20") + "?file=" + $('#filename').attr('file').replace(/\s/g, "%20")
    $('[toolbar=shareText]').find('span').append("<br>Link para o arquivo: <a href='" + link + "'>" + link + "</a>")
    $('#revokeFileAccess').unbind('click').click(function(){
        shareFile($('#filename').attr('file'), "false")
    })
    if ($('[toolbar=shareText]:visible').length) {
        if (!visitant_view_perm) {
            shareFile($('#filename').attr('file'), "true")
        }
        $('#shareLink').show()
        $('#shareLink').val(link)
        $('#shareLink').select()
        document.execCommand('copy')
        $('#shareLink').hide()
        $('#shareLinkLabel').html("Link copiado!")
        $('#shareText').toggleClass("btn-success", true)
        $('#shareText').toggleClass("btn-outline-secondary", false)
        setTimeout(function(){
            //$('#shareText').toggleClass("btn-success", false)
            //$('#shareText').toggleClass("btn-outline-secondary", true)
            $('#shareLinkLabel').html(visitant_view_perm ? "Compartilhar" : "Público")
        }, 2000)
    }
})

function mainTextEdit(){
    if (isMobile) {
        $('#mainHeadbar').toggle(false)
        $('#search').toggle(false)
        toggleMobile("mobileLeft")
        $('#troncoHome').toggle(false)
        $('#sidebar').toggleClass("d-none", true)
        $('#toolbarRow, #toolbar').toggle(false)
        $('#breadcrumb-nav').toggle(false)
        $('#mainText').prop('readonly', false)
        //$('#blurHeadbar').toggle(true)
        $('#mainText').show()
    }
}

function mainTextBlur(){
    if (isMobile) {
        $('#mainHeadbar').toggle(true)
        $('#search').toggle(permView && !isMobile)
        $('#troncoHome').toggle(true)
        $('#toolbarRow, #toolbar').toggle(true)
        if ($('.filename').attr('file') == "README" && $('#recentFiles').text() != 'Nenhum arquivo encontrado.') {
            $('#breadcrumb-nav').toggle(true)
        }
        $('.toolbarButton.btn-primary').click()
        $('.toolbar').hide()
        toggleMobile(permView ? "mobileFile" : "mobileNoPerm")
        $('#mainText').prop('readonly', true)
        //if ($('[toolbar=checklist]').is(':visible')) { $('#mainText').hide() }
    }
}

$('#search').on('focus', function(){
    window.scrollTo(0, 0)    
    $('#breadcrumb-nav').toggle(true)
    $('.breadcrumb').scrollLeft(0)
    if ($('.files.active').length) {
        $(fade_on_search_focus).fadeOut()
    }
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
    $(this).css('font-weight', ($('#permissionsDiv').is(':visible') ? "bold" : "normal"))
})

$('#setPassword').click(function(){
    name = $('#name').html()
    message = ($('#conected').html() == 'Crie uma senha' ? "Você é dono(a) desta coleção, mas ela ainda não tem senha.\nCaso queira editá-la a partir de outro dispositivo ou queira configurar as permissões de visitantes, defina uma senha para \"" + name + "\":" : "Crie uma nova senha para \"" + name + "\":")
    new_password = prompt(message)
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
            if (confirm("Deseja se desconectar de \"" + name + "\"?")) {
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
        $('#login').toggle(!is_local)
        $('#setPermissions').toggle(!is_local)
        $('#setPassword').toggle(!is_local)
        $('#conected').html(!data.has_password && permSetup ? "Crie uma senha" : (permSetup ? "Você é dono" : (permEdit ? "Você pode editar" : (permView ? "Você pode visualizar" : "Você não pode visualizar"))))
        $('#permissionsSettings').toggle(!data.has_password ? false : (permSetup ? true : false))
        $('#uploadTextDiv').toggle(permEdit)
        if (isMobile) {
            $('#corpusSettings').toggle(permSetup)
            if (!permView) {
                toggleMobile("mobileNoPerm")
            }
            //toggleMobile(permView ? "mobileFile" : "mobileNoPerm")
        }
        $('#newFile').toggle(permEdit)
        $('#mainText').prop('readonly', (isMobile) || (!isMobile && !permEdit)).toggleClass("p-3", !permEdit)
        $('#saveModifications').attr('disabled', !permEdit)
        $('#menu-svg').toggle(permSetup)
        $('#permSaved').toggle(permEdit)
        storeSessionToken(data.token)
        if (!token.length) {
            setTroncoToken(data.tronco_token)
        }
        loadConfig()
        search = window.location.href.match(/\?search=(.*)/)
        if (search) {
            if (search[1] != "true") {
                $('#advancedSearchInput').val(decodeURIComponent(search[1].split("&")[0]))
                for (metadata of window.location.href.split("&")){
                    if (metadata.indexOf("=") > 0 && metadata.indexOf("?search=") == -1) {
                        $('#advancedSearchMetadata').append(`
                        <div class="advancedSearchMetadataItem input-group mb-3">
                            <div class="input-group-prepend">
                                <select class="custom-select">
                                    <option value="` + decodeURIComponent(metadata.split("=")[0]) + `">` + decodeURIComponent(metadata.split("=")[0]) + `</option>
                                </select>
                            </div>
                            <input type="text" class="form-control" value="` + decodeURIComponent(metadata.split("=")[1]) + `">
                        </div>
                        `)
                    }
                }
                $('#advancedSearchMetadataCount').html($('.advancedSearchMetadataItem').length)
            }
            checkTheme()
            $('#advancedSearch').click()
            updateFiles("", "", true)
        } else {
            gotoFile($('#filename').attr('file'), true)
        }

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

$('#advancedSearchInput, #search')
.on('focus', function(){
    //toggleMobile(false)
})
.on('blur', function(){
    //toggleMobile(permView && $('#sidebar').hasClass("d-none") ? "mobileFile" : "mobileSidebar")
})

$('#advancedSearchInput').on('keyup', function(e){
    if (e.which == 13){
        $('#advancedSearchGo').click()
    }
})

$('#search').on('keyup', function(e){
    if ($('#filename:visible').length) {
        $("#search").focus()
    }
    clearTimeout(searchTimer)
    searchTimer = setTimeout(doneSearch, doneSearchInterval)
    if (e.which == 13){
        filename = ($('.recentFiles').length > 0 ? $($('.recentFiles')[0]).attr('file') : $(this).val())
        $('#search').blur()
        if (!$('[file="' + filename + '"].files').length) {
            gotoFile(filename, true)
        } else {
            gotoFile(filename, false)
        }
    }
})

function sortTable(n, type="float") {
    var table, rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0
    table = $(".searchTable:visible").get(0)
    switching = true;
    // Set the sorting direction to ascending:
    dir = "asc"
    /* Make a loop that will continue until
    no switching has been done: */
    while (switching) {
        // Start by saying: no switching is done:
        switching = false
        rows = table.rows
        /* Loop through all table rows (except the
        first, which contains table headers): */
        for (i = 1; i < (rows.length - 1); i++) {
            // Start by saying there should be no switching:
            shouldSwitch = false
            /* Get the two elements you want to compare,
            one from current row and one from the next: */
            x = rows[i].getElementsByTagName("TD")[n]
            y = rows[i + 1].getElementsByTagName("TD")[n]
            /* Check if the two rows should switch place,
            based on the direction, asc or desc: */
            if (dir == "asc") {
                if ((type == "string" && x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) || (type == "float" && parseFloat(x.innerHTML) > parseFloat(y.innerHTML))) {
                    // If so, mark as a switch and break the loop:
                    shouldSwitch = true;
                    break;
                }
            } else if (dir == "desc") {
                if ((type == "string" && x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) || (type == "float" && parseFloat(x.innerHTML) < parseFloat(y.innerHTML))) {
                    // If so, mark as a switch and break the loop:
                    shouldSwitch = true;
                    break;
                }
            }
        }
        if (shouldSwitch) {
            /* If a switch has been marked, make the switch
            and mark that a switch has been done: */
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
            // Each time a switch is done, increase this count by 1:
            switchcount ++;
        } else {
            /* If no switching has been done AND the direction is "asc",
            set the direction to "desc" and run the while loop again. */
            if (switchcount == 0 && dir == "asc") {
                dir = "desc";
                switching = true;
            }
        }
    }
}

var searchTimer
var doneSearchInterval = 200

function doneSearch () {
    recentFiles($('#search').val(), $('#search').val())
}

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
            new_data = '<li class="breadcrumb-item">' + (data.data.toLowerCase().split("|").indexOf(typing.toLowerCase()) >= 0 ? 'Abrir ' + typing + '?' : '<a href="#" class="createFile" file="' + typing + '">Criar <b>' + typing + '</b></a>') + "</li>"
        } else {
            new_data = ""
        }
        for (x of data.data.split("|")){
            if (special_files.indexOf(x) == -1 && x.length){
                new_data = new_data + '<li class="breadcrumb-item"><a class="recentFiles" href="#" file="' + x + '">' + x + '</a></li>'
            }
        }
        $('#recentFiles').html(data.data.length ? new_data : new_data + '<li class="breadcrumb-item">Nenhum arquivo encontrado.</li>')
        $('.recentFiles').unbind('click').click(function(){
            gotoFile($(this).attr('file'))
        })
        $('.createFile').unbind('click').click(function(){    
            gotoFile($(this).attr('file'), true)
        })
    })
}

$('#deleteCorpus').click(function(){
    name = $('#name').html()
    confirmName = prompt("Digite o nome da coleção (" + name + ") para confirmar que deseja excluí-la:")
    if (confirmName && confirmName.length && confirmName == name) {
        toggleProgress("Excluindo a coleção...")
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
        toggleProgress("Só um momento...")
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
        $('#settings').toggle(false)
        $('#settingsDiv').css('font-weight', 'normal')
        $('#mainHeadbar').toggle(true)
        $('#sidebar').toggleClass("d-none")
        if (theme == "light") {
            $('#mainHeadbar, #troncoHomeBar').css('background-color', ($('#sidebar').hasClass('d-none') ? "#bf6724" : 'white')).toggleClass('bg-dark', !$('#sidebar').hasClass('d-none'))
        }
        if ($('#sidebar').hasClass("d-none")) {
            $('#main').toggle(true)
            if (permView) {
                if ($('#toolbar-group:visible').length) {
                    toggleMobile("mobileFile")
                } else {
                    toggleMobile("mobileAdvancedSearch")
                }
            } else {
                toggleMobile("mobileNoPerm")
            }
        } else {
            $('#main').toggle(false)
            toggleMobile("mobileSidebar")
        }
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
            url: '/api/archiveFile',
            method: "POST",
            data: {
                'name': $('#name').html(),
                'filename': filename,
                'tronco_token': getTroncoToken(),
            }
        })
        .done(function(){
            if ($('#filename').attr('file') == "ARCHIVE") {
                gotoFile("ARCHIVE", true)
            } else {
                if ($('#filename').attr('file') == filename) {
                    gotoFile("README", true)
                } else {
                    updateFiles("", "", true)
                }
            }
        })
    }
}

$('#deleteFile').click(function(){
    deleteFile($('#filename').attr('file'))
})

function pinFile(filename) {
    $.post({
        url: '/api/pinFile',
        data: {
            'name': name,
            'filename': filename,
            'tronco_token': getTroncoToken()
        }
    })
    .done(function(data){
        if (data.data == "true") {
            updateFiles("", "", true)
        } else {
            alert("Você não tem permissão para editar.")
        }
    })
    return
}

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
                    gotoFile(data.data, true)
                } else {
                    updateFiles("", "", true)
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

function updateFiles(key = "", load = "", forceUpdate = false){
    name = $('#name').html()
    if (forceUpdate) {
        $.ajax({
            url: '/api/updateFiles',
            async: false,
            data: {
                'name': name,
                'key': key,
                "tronco_token": getTroncoToken()
            }            
        })
        .done(function(data){
        
            $('#files').html("")
            $('#nFiles').html(data.data.split("|").length)
            
            n = 0
            $('#divFullUpdateFiles').toggle(data.data.split("|").length >= max_update_files)
            for (i of ["pinned", "not_pinned"]) {
                for (x of data.data.split("|")){
                    is_public = x.indexOf("-is_public") > 1
                    is_pinned = x.indexOf("-is_pinned") > 1
                    x = x.split("-is_public")[0]
                    x = x.split("-is_pinned")[0]
                    n ++
                    if (n == max_update_files) {
                        break
                    }
                    
                    if (x.length && x.indexOf("README") != 0 && ((i == "pinned" && is_pinned) || (i == "not_pinned" && !is_pinned))) {
                        $('#files').append(`
                        <li class="nav-item d-flex py-1 justify-content-between align-items-center">
                            <a class="nav-link one-of-the-files` + (theme == "dark" ? ' dark' : "") + ` files d-flex align-items-center ` + (load.length && load == x ? 'active' : '') + `" style="width:100%;" pinned="` + is_pinned + `" file="` + x + `">
                                ` + (is_pinned ? "<span data-feather='bookmark'></span>" : "") + `
                                <!--span data-feather="file-text"></span-->
                                ` + (!visitant_view_perm && is_public ? "<span data-feather='share-2'></span>" : "") + `
                                <span class="files-name" style="max-width: 98%; display:inline-block; white-space: nowrap; overflow:hidden; text-overflow:ellipsis; user-select: none; -webkit-user-select: none; -khtml-user-select: none; -moz-user-select: none; -ms-user-select: none;">` + x + `</span>
                            </a>
                        </li>`)
                    } else {
                        if (x.indexOf("README") == 0) {
                            $('#home-share').toggle(!visitant_view_perm && is_public)
                        }
                    }
                }
            }

            new_archive = archive.cloneNode(true)
            $(new_archive).removeClass('archive-template')
            $(new_archive).addClass('archive')
            $(new_archive).toggle(data.has_archive && permEdit)
            $('#files').append(new_archive)

            if (!isMobile) {
                $('.one-of-the-files').on('mouseenter mouseleave', function(){
                    $(this).toggleClass("files-hover")
                })
            }

            $('.files').unbind('click').click(function(){
                gotoFile($(this).attr('file'), false, true)
            })

            $('[file!=README][file!=ARCHIVE].files').on('contextmenu', function(e) {
                toggleMobile(false)
                $('.files').removeClass('highlight')
                $(this).addClass('highlight')
                filedivcontext = $(this)
                var top = e.pageY
                var left = e.pageX
                $("#context-menu-file").css({
                    display: "block",
                    top: top,
                    left: left
                }).addClass("show")
                $('.pinFileContext').text($(this).attr('pinned') == "true" ? "Desafixar" : "Fixar")
                return false //blocks default Webbrowser right click menu
            })
            $('[file=README], [file=ARCHIVE]').on('contextmenu', function(e) {
                e.preventDefault()
            })

            feather.replace()

            if (load) {
                recentFiles()
                loadFile(load)
                $('[file="' + load + '"].files').toggleClass('active', true)
            } else {
                $('.files').removeClass('active')
                $('[file="' + $('#filename').attr('file') + '"].files').addClass('active')
            }

        })
    } else {

        if (load) {
            loadFile(load)
        } else {
           
        }
    }

}

$('#newFile').click(function(){
    if (isMobile) {
        $('.toggleSettings')[0].click()
        $('#search').show()
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
            case 'd':
                event.preventDefault()
                $(".insertDate").click()
                break
            }
    }
})

var textareas = document.getElementsByTagName('textarea');
var count = textareas.length;
for(var i=0;i<count;i++){
    textareas[i].onkeydown = function(e){
        if(e.keyCode==9 || e.which==9){
            e.preventDefault();
            var s = this.selectionStart;
            this.value = this.value.substring(0,this.selectionStart) + "    " + this.value.substring(this.selectionEnd);
            this.selectionEnd = s+4; 
        }
    }
}

var failedSave = false

function saveFile(filename=$('#filename').attr('file'), text=$('#mainText').val()){

    if (permEdit || permSetup) {

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
                    alert("Sessão expirada, ou o arquivo está sendo editado por outra pessoa. Recarregue a página.")
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
                            $('#saved').find("svg").attr('stroke', 'green').attr('stroke-width', 3)
                            setTimeout(function(){
                                $('#saved').find("svg").attr('stroke', 'currentColor').attr('stroke-width', 2)
                            },2000)
                            textModified(true)
                            date = new Date()
                            $('#savedSpan').html("Salvo às " + date.getHours() + ":" + (date.getMinutes().toString().length == 1 ? "0" + date.getMinutes() : date.getMinutes()))
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
    if ($('#mainText').val().length) {
        saveFile($('#filename').attr('file'), $('#mainText').val())
    }
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
    updateToolbar()
})

$('#mainText').on('input', function(){
    $('#sortLines').html($('#mainText').val().split("\n").length)
    $('#sortWords').html(countWords($('#mainText').val()))
    $('#sortCharacters').html($('#mainText').val().length)
})

function textModified(state){
    $('#saveModifications').toggleClass('btn-success', state)
    $('#saveModifications').toggleClass('btn-outline-secondary', !state)
    if (!$('#autoSaveCheckbox').prop('checked')) {
        $('#filename').toggleClass('text-danger', state)
    }
}

var whoClaimedAccess = ""

function updateMainTextPlaceholder(){
    $('#mainText').attr('placeholder', $('#conected').html() == "Crie uma senha" ? "Só você pode editar os arquivos desta coleção. Esta coleção ainda não tem uma senha definida, crie uma caso deseje editá-la a partir de outros dispositivos ou para torná-la invisível a outras pessoas." + (isMobile ? '\n\nToque no lápis para editar este arquivo' : '\nInsira aqui algum conteúdo') + (isMobile ? "" : " ou solte arquivos e imagens") + "." : ( !permEdit ? "" : (!visitant_view_perm ? "Só você pode visualizar os arquivos desta coleção." : (!visitant_edit_perm ? "Todos podem visualizar esta coleção, mas só você pode editar seus arquivos." : "Todos podem editar os arquivos desta coleção.")) + (isMobile ? '\n\nToque no lápis para editar este arquivo' : '\nInsira aqui algum conteúdo') + (isMobile ? "" : " ou solte arquivos e imagens") + "."))
}

function loadFile(filename){
    
    name = $('#name').html()
        
    window.history.pushState("", "", '/corpus/' + name + "?file=" + filename)
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
            $('#savedSpan').html("Salvo")
            $('#renameFile').toggle((permEdit || permSetup) && special_files.indexOf(filename) == -1 ? true : false)
            $('#deleteFile').toggle((permEdit || permSetup) && special_files.indexOf(filename) == -1 ? true : false)
            textModified(false)
            $('#search').val('')
            toggleMain("file")
            toggleMobile(permView ? "mobileFile" : "mobileNoPerm")
            $('#mobileHome').toggleClass("mobile-btn-active", filename == 'README')
            $('#filename').html(special_files.indexOf(filename) >= 0 ? name : filename)
            $('#filenameMobile').html(special_files.indexOf(filename) >= 0 ? "" : filename)
            $('.filename').html(special_files.indexOf(filename) >= 0 ? name : filename)
            $('#filename').attr('file', filename)
            $('#filename').scrollLeft(0)
            $('#mainText').val(data.data.text)
            loadMetadata(data.data.metadata, filename == "README")
            //if ( isMobile && $('#checklist').is(":visible") && !$('.toolbarButton.btn-primary').length) {
                //if (($('.checkbox-item-div').length / $('#mainText').val().split("\n").filter(function(e){return e.trim().length > 0}).length) > 0.6) {
                    //$('#checklist').click()
                //}
            //}
            whoClaimedAccess = data['who_claimed_access']
            $('#mainText').trigger('input')//pra dar resize ao carregar
            if (data.is_public && !visitant_view_perm) {
                $('#shareLinkLabel').html("Público")
                $('#shareText').toggleClass("btn-success", true)
                $('#shareText').toggleClass("btn-outline-secondary", false)
                $('#shareText').toggleClass("btn-primary", false)
            } else {
                $('#shareLinkLabel').html("Compartilhar")
                $('#shareText').toggleClass("btn-success", false)
                $('#shareText').toggleClass("btn-primary", false)
                $('#shareText').toggleClass("btn-outline-secondary", true)
            }

            $('[toolbar=shareText]').toggle(false)
            if ($('.filename').attr('file') == "README" && $('#recentFiles').text() != 'Nenhum arquivo encontrado.') { 
                $('#breadcrumb-nav').toggle(true) 
            }
            if (!isMobile) {
                //$('#mainText').focus()
            }

            $('#historyList').html("")
            $('.historyControls').hide()
            $('.undo, .redo').prop('disabled', true)
            $('#replaceLabel').hide()
            updateToolbar()
            replaceUndo = []
            replaceRedo = []
            if (data.history.length > 0) {
                for (item of data.history.sort( (a, b) => { return b[0] - a[0] })) {
                    var date = new Date(item[0] * 1000)
                    $('#historyList').append('<a href="#" title="Clique para visualizar o histórico" class="my-2 retrieveHistory" label="' + item[1] + '">' + date.getDate() + " de " + months[date.getMonth()] + " de " + date.getFullYear() + ' (' + item[3] + ' caracteres)</a><div></div>')
                }
            } else {
                $('#historyList').append('<span>Nenhum histórico encontrado para o arquivo.</span>')
            }
            $('#history').toggle(data.history.length > 0 && permEdit)

            $('.retrieveHistory').click(function(){
                $('.retrieveHistory').css('font-weight', 'normal').removeClass("historyActive")
                $(this).css('font-weight', 'bold').addClass("historyActive")
                label = $(this).attr('label')
                name = $('#name').html()
                filename = $('#filename').attr('file')
                $('.historyControls').show()
                $.ajax({
                    url: '/api/retrieveHistory',
                    method: 'POST',
                    data: {
                        name: name,
                        filename: filename,
                        label: label,
                        tronco_token: getTroncoToken(),
                    }
                }).done(function(data){
                    if (data.error != '0') {
                        alert(data.error)
                    } else {
                        $('#historyMainText').html(data.data)
                    }
                })
            })

            // open checklist if more than 90% of lines are checklist item
            if (true) {//(isMobile) {
                //$('#checklist').toggle(true)
                if ($('#checklist:visible').length && ($('#checklist').hasClass('btn-primary') || !$('.toolbarButton.btn-primary').length)) {
                    if (($('.checkbox-item-div').length / $('#mainText').val().split("\n").filter(function(e){return e.trim().length > 0}).length) > 0.9) {
                        $('#checklist').removeClass('btn-primary')
                        $('#checklist').click()
                    }
                }
            }        

        } else {
            if (data.error == 2) {
                $('#changePassword').click()
                //alert("Você não tem permissão para visualizar esta coleção")
                //$('[file="README"].files').click()
                //return false
            } else {
                if (data.error == 3){
                    alert("Este arquivo não existe")
                    gotoFile("README")
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
            gotoFile("README")
        }
    })
}

$('#corpusLanguage').on('change', function(){
    name = $('#name').html()
    language = $(this).val()
    $.ajax({
        url: '/api/changeTroncoConfig',
        method: 'POST',
        data: {
            'name': name,
            'corpus_language': language,
            "tronco_token": getTroncoToken()
        }
    })
    loadConfigFromCheckboxes()
})

$('#advancedEditingCheckbox').on('change', function(){
    name = $('#name').html()
    advancedEditing = $(this).prop('checked')
    $.ajax({
        url: '/api/changeTroncoConfig',
        method: 'POST',
        data: {
            'name': name,
            'advanced_editing': advancedEditing,
            "tronco_token": getTroncoToken()
        }
    })
    loadConfigFromCheckboxes()
})

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
    $('#corpusLanguageDiv').toggle($('#advancedEditingCheckbox').prop('checked') && permView)
    $('#advancedSearch').toggle(permView)
    $('.changeMetadata').toggle(permEdit)
    $('#saveModifications').toggle(!$('#autoSaveCheckbox').prop('checked'))
    $('#mainText').attr('wrap', $('#wrapTextCheckbox').prop('checked') ? 'on' : 'off')
    $('#mainText').css('overflow', $('#wrapTextCheckbox').prop('checked') ? "hidden" : "auto")
    updateToolbar()
}

var default_metadata = ["times_seen", "last_seen", "first_seen"]
var special_files = ["README", "tronco.json", "ARCHIVE", "recent_queries.json", "history.json"]
var months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

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
        advanced_editing = data.advanced_editing == "true" ? true : false
        visitant_view_perm = data.view_perm
        visitant_edit_perm = data.edit_perm
        visitant_setup_perm = data.setup_perm
        default_metadata = data.default_metadata
        $('#corpusLanguage').html("")
        for (language in data.languages) {
            $('#corpusLanguage').append("<option value='" + language + "'>" + data.languages[language].label + "</option>")
        }
        $('#corpusLanguage').val(data.corpus_language)
        $('#autoSaveCheckbox').prop('checked', auto_save)
        $('#wrapTextCheckbox').prop('checked', auto_wrap)
        $('#advancedEditingCheckbox').prop('checked', advanced_editing)
        $('#viewPermission').prop('checked', visitant_view_perm)
        $('#editPermission').prop('checked', visitant_edit_perm)
        $('#visitante-perms').html(visitant_view_perm ? "Todos podem " + (visitant_edit_perm ? "editar" : "ver") : "Só você pode ver")
        loadConfigFromCheckboxes()
        updateMainTextPlaceholder()
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
        if (e.originalEvent.touches[0].pageY > $('#toolbar-group').offset().top + $('#toolbar-group').height() || e.originalEvent.touches[0].pageY < $('#toolbar-group').offset().top) {
            openingPanel = true
        }
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

var mobileInterval
var runningActivities = {}

function triggerResize(first=false){
    name = $('#name').html()
    if ($('#sidebar:hidden').length || $(window).width() < 600) {
        if (first) {
            //$('#search').addClass("border-bottom")
            isMobileFromBeginning = true
            $('.toolbarButton, #dropdownMenuLink').removeClass("btn-sm")
            $('#sidebar').css("max-width", "")
            $('#settings').append($('#renameCorpus, #deleteCorpus, #permissionsSettings').detach())
            mobileInterval = window.setInterval(function(){
                $('#mobileLeft').css({top: window.innerHeight-75, left: window.innerWidth-75})
                $('#mobileEdit').css({top: window.innerHeight-51, left: (window.innerWidth/2)-20})
            })
            $('#filename, #filename-div').hide().removeClass("pb-2").removeClass("mt-4").addClass("mt-3")
            //$('#troncoHomeLabel').css('overflow-x', 'scroll').css('white-space', 'nowrap')
        }
        isMobile = true
        filename = $('#filename').attr('file')
        $('#troncoHomeLabel').html("<span class='mt-3 py-1 mb-2 ml-3' style='overflow-x: scroll; max-width:90%; width:100%; display:inline-block; white-space: nowrap; font-weight:bold; font-size:16px;'>" + name + " > <span id='filenameMobile'>" + (special_files.indexOf(filename) == -1 ? filename : "") + "</span>" + "</span>")
        $('#troncoLogo').hide()
        $('.navbar-brand').hide()
        $('#toolbar-group, #searchHeader, .dynamic, [advanced-toolbar-panel!="builder"].advanced-toolbar-panel, [advanced-toolbar-panel!="builder"] .h5, [advanced-toolbar-panel="builder"] .btn-group, #toolbar, #advancedSearchToolbarRow .btn-group, #filename, #saved, #mainText, #hr').toggleClass("px-5", false).toggleClass("px-4", true)
        $('#toolbar').toggleClass("px-4", false)
        $('#hr').show()
        $('.breadcrumb, #filename').css('overflow-x', "scroll").css("white-space", "nowrap").css('-ms-overflow-style', 'none').css('scrollbar-width', 'none')
        $('#toolbarRow, #advancedSearchToolbarRow, #builder-buttons, #builder-recent').css('overflow-x', "scroll")
        $('#toolbarRow').css('-ms-overflow-style', 'none').css('scrollbar-width', 'none')
        $('#sidebar-scroll').unbind('mouseenter').unbind('mouseleave').css({'overflow-y': 'auto'})
    } else {
        if (mobileInterval) {
            clearInterval(mobileInterval)
        }
        isMobile = false
        $('#toolbar-group, #searchHeader, .dynamic, [advanced-toolbar-panel!="builder"].advanced-toolbar-panel, [advanced-toolbar-panel!="builder"] .h5, [advanced-toolbar-panel="builder"] .btn-group, #toolbar, #advancedSearchToolbarRow .btn-group, #filename, #saved, #mainText, #hr').toggleClass("px-5", true).toggleClass("px-4", false)
        $('#troncoLogo').show()
        $('#troncoHomeLabel').html("")
        $('.navbar-brand').show()
        $('#hr').show()
        $('.breadcrumb, #filename').css('overflow-x', "").css("white-space", "")
        $('#toolbarRow, #advancedSearchToolbarRow, #builder-buttons, #builder-recent').css('overflow-x', "auto")
        //$('#editingPanel').css("z-index", "1200").toggleClass("sticky-top", true)
        toggleMobile(false)
        $('#sidebar-scroll').on('mouseenter touchstart', function(){
            $(this).css({'overflow-y': 'auto'})
        }).on('mouseleave', function(){
            $(this).css({'overflow-y': 'hidden'})
        })
    }
    if (first && !isMobile) {
        $('.btn-outline-secondary').on('mouseenter mouseleave', function(){
            $(this).toggleClass("btn-toolbar-hover")
        })
        $('#afterSearch').before($('#search').detach().toggleClass("mt-3 mx-4", false).css("color", ""))
        $('#search').show()
    }
    $('#troncoHomeBar').css("width", (isMobile ? "100%" : ""))
    $('#troncoHomeBar').toggleClass("mt-0", isMobile)//.toggleClass("ml-3", isMobile)
    //$('#sidebar').css('margin-top', $('#sidebar').css('top') == "0px" ? (isMobile ? "50px" : '54px') : '10px')
    $('#sidebar').css('margin-top', $('#mainHeadbar').height())
    $('#troncoLogo').css('margin-bottom', isMobile ? "" : "4px")
    //$('#main').css('margin-left', !isMobile ? '260px' : '0px')
    $('#main').toggleClass("col-md-10 ml-sm-auto col-lg-10", !isMobile)

    $('#uploadTextLabel').html(isMobile ? "Enviar arquivos" : "Enviar arquivos")

    feather.replace()
    fade_on_search_focus = '#saved, #toolbar-group, #toolbar, #mainText' + (isMobile ? "" : ", #filename")
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

function checkTheme(){
    theme = document.cookie.split("theme=")[1].split("; ")[0]
    elements = "#main, .prepend, .dropdown-toggle, .page-link, .page-item.active, .advancedSearchMetadataItem select, .advancedSearchMetadataItem input, #advancedSearchInput, .metadataItem, .metadataKey, .row, #mainText, #historyMainText, #sidebar, html, .replaceControl"
    elements2 = "#corpusSettings, #settings .custom-control-label, #corpusLanguageDiv, #mainHeadbar, #troncoHomeBar"
    elements3 = ".sortAction, #mobile-nav, .toolbar"
    elements4 = "#sidebar-scroll, #recentFiles"
    elements5 = "[file=README],[file=ARCHIVE]"
    if (theme == "dark") {
        $(elements).css("background-color", "#343a40").css("color", "white")
        $(elements2 + ", " + elements3).css("background-color", "#272b30").css("color", "white").toggleClass("bg-dark", false)
        $(elements4).css('background-color', '#2e3238')
        if (isMobile) {
            $('#search').toggleClass("form-control-dark", false).css("background-color", "#343a40").css("color", "white").css("border-style", "none")
        }
        $(elements5).addClass("dark")
        if (!isMobile) {
            var styles = `
            ::-webkit-scrollbar { width: 15px; height: 3px;}
            `
            var styleSheet = document.createElement("style")
            styleSheet.type = "text/css"
            styleSheet.innerText = styles
            document.head.appendChild(styleSheet)
        }

    } else {
        $(elements).css("background-color", "white").css("color", "black")
        $(elements2).css("background-color", "white").css("color", "white").toggleClass("bg-dark", true)
        if (isMobile) {
            $('#mainHeadbar, #troncoHomeBar').css('background-color', "#bf6724").toggleClass('bg-dark', false)
        }
        $(elements3).css("color", "black").toggleClass("form-control", true)
        $('#mobile-nav').toggleClass("bg-dark", true)
        $(elements4).css("background-color", "rgb(243, 243, 243)")
        if (isMobile) {
            $('#search').toggleClass("form-control-dark", true).css("background-color", "white").css("color", "black").css("border-style", "")
        }
    }
}

$(document).ready(function(){
    feather.replace()
    if (document.cookie.indexOf("tt=") == -1){
        document.cookie = "tt={}; expires=" + expirationDate
    }
    if (document.cookie.indexOf("st=") == -1){
        document.cookie = "st={}; expires=" + expirationDate
    }
    name = $('#name').html()
    document.cookie = "name=" + name + "; expires=" + expirationDate
    $('#mainText').autosize()
    validatePassword(name)
    
    var uploadText = new Dropzone(".uploadText", { url: "/api/uploadText", clickable: ".uploadText" })
    uploadText.on("success", function(file, result){
        if (result.error == "1") {
            alert(result.filename + " é pesado demais!")
        } else {
            if (result.error == "2") {
                alert("Não foi possível extrair texto do arquivo " + result.filename)
            }
        }
    })
    .on("queuecomplete", function(){
        gotoFile("README", true)
        toggleProgress(false)
    })
    .on("sending", function(file, xhr, formData){
        formData.append("name", name)
        formData.append("tronco_token", getTroncoToken())
        toggleProgress("Enviando...")
    })

    var mainTextDropzone = new Dropzone("#mainText", { url: "/api/uploadDrop", clickable: false })
    mainTextDropzone.on("success", function(file, result){
        if (result.error == "0") {
            $('#mainText').val("tronco/" + result.filename + "\n" + $('#mainText').val())
            saveFile()
            $('#mainText').trigger("input")
            toggleInsertSuccess()
        } else {
            if (result.error == "1") {
                alert(result.filename + " é pesado demais!")
            } else {
                if (result.error == "2") {
                    alert("Não foi possível extrair texto do arquivo " + result.filename)
                }
            }
        }
    })
    .on("sending", function(file, xhr, formData) {
        formData.append("name", name)
        formData.append("tronco_token", getTroncoToken())
        toggleProgress("Enviando...")
    })
    .on("queuecomplete", function(){
        toggleProgress(false)
    })
    $(document).on("click touchmove", function(){
        if ($('.dropdown-menu:visible').length > 0) {
            toggleMobile($('#sidebar').hasClass('d-none') && permView ? "mobileFile" : "mobileSidebar")
        }
        $("#context-menu-checklist, #context-menu-file, #context-menu-metadata").removeClass("show").hide()
        $('.checkbox-item-subdiv, .files').removeClass('highlight')
    })
    triggerResize(true)
    checkTheme()
    
})