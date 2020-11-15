import os, sys, shutil
import re
import requests
import random
import json
from flask import Flask, redirect, render_template, request, url_for, send_from_directory
#from webui import WebUI
from flaskwebgui import FlaskUI
from uuid import uuid4
sys.path.append("scripts")

app = Flask(__name__)
#ui = WebUI(app)
ui = FlaskUI(app, port=5240, maximized=True)
#sys.path.append(os.path.join(app.root_path, "scripts") if isinstance(app.root_path, str) else "scripts")
#import objects
#import functions
from scripts import objects
from scripts import functions

objects.root_path = app.root_path
tronco_config = objects.TroncoConfig()
session_tokens = objects.SessionTokens()
tronco_tokens = objects.TroncoTokens()
temporary_objects = objects.TemporaryObjects()
advanced_corpora = objects.AdvancedCorpora()
corpora_history = objects.CorporaHistory()
app.jinja_env.globals.update(tronco_config=tronco_config)

@app.route("/api/sort", methods=["POST"])
def sort():
    old_text = request.values.get("old_text")
    action = request.values.get("action")

    if action == "abcCrescent":
        new_text = "\n".join(sorted(old_text.splitlines(), key=lambda x: x))
    elif action == "abcDecrescent":
        new_text = "\n".join(sorted(old_text.splitlines(), key=lambda x: x, reverse=True))
    elif action == "abcCase":
        new_text = "\n".join(sorted(old_text.splitlines(), key=lambda x: x.lower()))
    elif action == "lower":
        new_text = old_text.lower()
    elif action == "upper":
        new_text = old_text.upper()
    elif action == "title":
        new_text = old_text.title()
    elif action == "blankNewLine":
        new_text = old_text
        while "\n\n" in new_text:
            new_text = new_text.replace("\n\n", "\n")
    elif action == "trimSpaces":
        new_text = "\n".join([x.strip() for x in old_text.splitlines()])
    elif action == "doubleSpaces":
        new_text = old_text
        while "  " in new_text:
            new_text = new_text.replace("  ", " ")

    return {
        'new_text': new_text,
        'error': '0',
    }

@app.route("/api/replace", methods=["POST"])
def replace():
    regex = True if request.values.get("replace_regex") == "true" else False
    case = True if request.values.get("replace_case") == "true" else False
    replace_from = request.values.get("replace_from")
    replace_to = request.values.get("replace_to")
    old_text = request.values.get("old_text")

    expression = replace_from if regex else re.escape(replace_from)
    new_string = replace_to if regex else re.escape(replace_to)
    flags = re.DOTALL|re.IGNORECASE if not case else re.DOTALL
    occurrences = len(re.split(expression, old_text, flags=flags)) - 1
    new_text = re.sub(expression, new_string, old_text, flags=flags)

    return {
        'new_text': new_text,
        'occurrences': occurrences,
        'error': '0',
    }

@app.route("/api/retrieveHistory", methods=["POST"])
def retrieveHistory():
    name = request.values.get("name")
    filename = request.values.get("filename")
    date = request.values.get("label")
    password = tronco_tokens.get_password(name, request.values.get("tronco_token"))
    if not tronco_config.has_permission(name, password, "editar"):
        return {'error': 'Permissões inválidas.'}
    if not name in corpora_history.corpora or \
            not filename in corpora_history.corpora[name] or \
            not date in corpora_history.corpora[name][filename]:
        return {'error': 'Erro ao buscar histórico.'}
    return {
        'data': corpora_history.corpora[name][filename][date]['text'],
        'error': '0',
        }

@app.route("/api/restoreFile", methods=["POST"])
def restoreFile():
    name = request.values.get("name")
    filename = request.values.get("filename")
    upload_dir = os.path.join(objects.root_path, "uploads")
    password = tronco_tokens.get_password(name, request.values.get("tronco_token"))
    if not tronco_config.has_permission(name, password, "editar"):
        return {'error': '1'}
    if not os.path.isfile(os.path.join(upload_dir, filename)):
        return {'error': '2'}
    shutil.move(os.path.join(upload_dir, filename), os.path.join(objects.root_path, "corpora", name))
    return {'error': '0'}

@app.route("/api/shareFile", methods=["POST"])
def shareFile():
    name = request.values.get("name")
    filename = request.values.get("filename")
    password = tronco_tokens.get_password(name, request.values.get("tronco_token"))
    if not tronco_config.has_permission(name, password, "editar"): return None
    share = request.values.get("share")
    if share == "true" and (not "shared_files" in tronco_config.corpora[name]['permissions'] or not filename in tronco_config.corpora[name]['permissions']['shared_files']):
        if not 'shared_files' in tronco_config.corpora[name]['permissions']:
            tronco_config.corpora[name]['permissions']['shared_files'] = []
        tronco_config.corpora[name]['permissions']['shared_files'].append(filename)
        tronco_config.save()
    elif share == "false":
        if 'shared_files' in tronco_config.corpora[name]['permissions'] and filename in tronco_config.corpora[name]['permissions']['shared_files']:
            tronco_config.corpora[name]['permissions']['shared_files'].remove(filename)
            tronco_config.save()
    return {'error': '0'}

@app.route("/api/archiveFile", methods=["POST"])
def archive_file():
    name = request.values.get("name")
    filename = request.values.get("filename")
    archive_dir = os.path.join(objects.root_path, "corpora", name, "ARCHIVE")
    password = tronco_tokens.get_password(name, request.values.get("tronco_token"))
    if not tronco_config.has_permission(name, password, "editar"): return None
    if not os.path.isfile(archive_dir):
        functions.create_new_file(name, "ARCHIVE")
    new_filename = functions.upload_file(name + "/" + filename, filename)['filename']
    with open(archive_dir) as f:
        text = f.read()
    functions.save_file(name, "ARCHIVE", "tronco/" + new_filename + "\n" + text)
    functions.delete_file(name, filename)
    corpora_history.deleteFile(name, filename)
    if 'shared_files' in tronco_config.corpora[name]['permissions'] and filename in tronco_config.corpora[name]['permissions']['shared_files']:
        tronco_config.corpora[name]['permissions']['shared_files'].remove(filename)
        tronco_config.save()
    return {'error': '0'}

@app.route("/api/getProgress", methods=["POST"])
def get_percentage():
    session_token = request.values.get("session_token")
    method = request.values.get("method")
    if session_token in temporary_objects.objects[method]:
        return {'data': temporary_objects.objects[method][session_token], 'error': '0'}
    else:
        return {'error': '1'}

@app.route("/api/queryPagination", methods=["POST"])
def query_pagination():
    session_token = request.values.get("session_token")
    page = int(request.values.get("page"))
    table = request.values.get("table")
    name = request.values.get("name")
    password = tronco_tokens.get_password(name, request.values.get("tronco_token"))
    if not tronco_config.has_permission(name, password, "visualizar"): return None
    return {
        'data': {
            table: temporary_objects.get_page(table, page-1, session_token),
            'pages': {
                table: len(temporary_objects.objects[table][session_token])
            },
            'page': page,
        }
    }

@app.route("/api/query", methods=["POST"])
def query():
    name = request.values.get("name")
    session_token = request.values.get("session_token")
    password = tronco_tokens.get_password(name, request.values.get("tronco_token"))
    if not tronco_config.has_permission(name, password, "visualizar"): return {'error': '1'}
    params = request.values.get("params")
    metadata = json.loads(request.values.get("metadata"))
    query = advanced_corpora.query(name, params, metadata)
    query['query_results'] = temporary_objects.push_objects('query_results', query['results'], session_token)
    query['word_distribution'] = temporary_objects.push_objects('word_distribution', query['word_distribution'], session_token)
    query['lemma_distribution'] = temporary_objects.push_objects('lemma_distribution', query['lemma_distribution'], session_token)
    query['pages'] = {
        'query_results': len(temporary_objects.objects['query_results'][session_token]),
        'word_distribution': len(temporary_objects.objects['word_distribution'][session_token]),
        'lemma_distribution': len(temporary_objects.objects['lemma_distribution'][session_token]),
    }
    query['page'] = 1
    return {'data': query, 'error': '0', 'recent_queries': list(advanced_corpora.recent_queries[name].keys())}

@app.route("/api/isCorpusReady", methods=["POST"])
def is_corpus_ready():
    name = request.values.get("name")
    password = tronco_tokens.get_password(name, request.values.get("tronco_token"))
    if not tronco_config.has_permission(name, password, "visualizar"): return {'error': '2'}
    if not name in advanced_corpora.corpora:
        return {'error': '1'}
    return {'error': '0', 'data': advanced_corpora.get_number_sentences(name), 'metadata': advanced_corpora.corpora[name]['metadata']}

@app.route("/api/loadAdvancedCorpus", methods=["POST"])
def load_advanced_corpus():
    name = request.values.get("name")
    corpus_dir = os.path.join(objects.root_path, "corpora", name)
    password = tronco_tokens.get_password(name, request.values.get("tronco_token"))
    session_token = request.values.get("session_token")
    force = request.values.get("force")
    if not tronco_config.has_permission(name, password, "visualizar"): return {'error': '1'}
    corpus_language = tronco_config.corpora[name]['settings']['corpus_language'] if 'corpus_language' in tronco_config.corpora[name]['settings'] else objects.tronco_default_language
    if name in advanced_corpora.files:
        del advanced_corpora.files[name]
    if name in advanced_corpora.metadata:
        del advanced_corpora.metadata[name]
    if force == "true":
        advanced_corpora.delete_corpus(name)
    if not name in advanced_corpora.corpora:
        n_files = len(os.listdir(corpus_dir))
        temporary_objects.set_max_indexing_files('indexing', session_token, n_files-len(objects.tronco_special_files))
        for filename in os.listdir(corpus_dir):
            advanced_corpora.load_file(name, filename, corpus_language)
            temporary_objects.decrease_n_indexing_files('indexing', session_token, 1)
        advanced_corpora.mount_corpus(name)
    if not name in advanced_corpora.corpora:
        return {'error': '2'}
    return {
        'error': '0', 
        'data': advanced_corpora.get_number_sentences(name), 
        'metadata': advanced_corpora.corpora[name]['metadata'],
        'recent_queries': list(advanced_corpora.recent_queries[name]),
        'indexed_time': advanced_corpora.corpora[name]['indexed_time'] if 'indexed_time' in advanced_corpora.corpora[name] else ""
        }

@app.route("/api/saveMetadata", methods=["POST"])
def save_metadata():
    name = request.values.get("name")
    filename = request.values.get("filename")
    metadata = json.loads(request.values.get("metadata"))
    password = tronco_tokens.get_password(name, request.values.get("tronco_token"))
    if not tronco_config.has_permission(name, password, "editar"): return None
    return functions.save_metadata(name, filename, metadata)

@app.route("/.well-known/assetlinks.json")
def get_asset():
    return send_from_directory(objects.root_path, "assetlinks.json")

@app.route("/media/<filename>", methods=["GET"])
def get_uploads(filename):
    return send_from_directory(os.path.join(objects.root_path, "uploads"), filename)

@app.route("/api/uploadText", methods=["POST"])
def upload_text():
    name = request.values.get("name")
    password = tronco_tokens.get_password(name, request.values.get("tronco_token"))
    if not tronco_config.has_permission(name, password, "editar"): return None
    result = functions.upload_file(request.files.get("file"), request.files.get("file").filename, corpus=name)
    return {
        'filename': result['filename'],
        'error': result['error'],
    }

@app.route("/api/uploadDrop", methods=["POST"])
def upload_drop():
    name = request.values.get("name")
    password = tronco_tokens.get_password(name, request.values.get("tronco_token"))
    if not tronco_config.has_permission(name, password, "editar"): return None
    result = functions.upload_file(request.files.get("file"), request.files.get("file").filename)
    return {
        'filename': result['filename'],
        'error': result['error'],
    }

@app.route("/api/uploadFile", methods=["POST"])
def upload_file():
    result = functions.upload_file(request.files.get("uploading"), request.values.get("filename"))
    return {
        'filename': result['filename'],
        'error': result['error'],
    }

@app.route("/app")
def download_app():
    return redirect("/?app=true")

@app.route("/pwabuilder-sw.js")
@app.route("/corpus/pwabuilder-sw.js")
def pwa():
    return send_from_directory(os.path.join(objects.root_path, "static"), "pwabuilder-sw.js")

@app.route("/api/claimAccess", methods=["POST"])
def claim_access():
    name = request.values.get("name")
    filename = request.values.get("filename")
    token = request.values.get("token")
    session_tokens.just_edited(name, filename, token)
    return {'error': 0}

@app.route("/api/whoClaimedAccess", methods=["POST"])        
def who_claimed_access():
    name = request.values.get("name")
    filename = request.values.get("filename")
    return {
        'error': 0,
        'token': session_tokens.who_claimed_access(name, filename)
        }

@app.route("/api/revokeToken", methods=["POST"])
def revoke_token():
    name = request.values.get("name")
    filename = request.values.get("filename")
    token = request.values.get("token")
    session_tokens.stopped_editing(name, filename, token)
    return {'error': 0}

@app.route("/api/togglePerm", methods=["POST"])
def toggle_perm():
    name = request.values.get("name")
    password = tronco_tokens.get_password(name, request.values.get("tronco_token"))
    if not tronco_config.has_permission(name, password, "configurar"): return None

    perm = request.values.get("perm")
    value = str(request.values.get("value")).lower()
    old_set = tronco_config.corpora[name]['permissions']['disconnected']
    new_set = []
    for permission in objects.all_permissions:
        if (permission != perm and permission in old_set) or (permission == perm and value == "true"):
            new_set.append(permission)
    tronco_config.change_permissions(name, new_set)
    return {'data': ''}

@app.route("/api/revokePassword", methods=["POST"])
def revoke_password():
    name = request.values.get("name")
    token = request.values.get("tronco_token")
    tronco_tokens.revoke_password(name, token)
    return {'data': ''}

@app.route("/api/storePassword", methods=["POST"])
def store_password():
    name = request.values.get("name")
    password = request.values.get("password")
    token = request.values.get("tronco_token")
    tronco_tokens.store_password(name, password, token)
    return {'data': ''}

@app.route("/api/setPassword", methods=["POST"])
def set_password():
    name = request.values.get("name")
    token = request.values.get("tronco_token")
    password = tronco_tokens.get_password(name, token)
    if not tronco_config.has_permission(name, password, "configurar"): return None
    new_password = request.values.get("new_password")
    tronco_tokens.store_password(name, new_password, token)
    tronco_config.change_password(name, new_password)
    return {'data': ''}

@app.route("/api/loadConfig", methods=["POST"])
def load_config():
    name = request.values.get("name")     
    return {
        'auto_save': tronco_config.corpora[name]['settings']['auto_save'],
        'auto_wrap': tronco_config.corpora[name]['settings']['auto_wrap'],
        'advanced_editing': tronco_config.corpora[name]['settings']['advanced_editing'] if 'advanced_editing' in tronco_config.corpora[name]['settings'] else "true",
        'corpus_language': tronco_config.corpora[name]['settings']['corpus_language'] if 'corpus_language' in tronco_config.corpora[name]['settings'] else objects.tronco_default_language,
        'view_perm': "visualizar" in tronco_config.corpora[name]['permissions']['disconnected'],
        'edit_perm': "editar" in tronco_config.corpora[name]['permissions']['disconnected'],
        'setup_perm': "configurar" in tronco_config.corpora[name]['permissions']['disconnected'],
        'languages': objects.udpipe_models,
        'default_metadata': objects.tronco_metadata,
        }

@app.route("/api/validatePassword", methods=["POST"])
def validate_password():
    name = request.values.get("name")
    token = request.values.get("token")
    if not token:
        token = str(uuid4())
    password = tronco_tokens.get_password(name, token)
    if password == "default" and tronco_config.corpora[name]['permissions']['password'] == "default":
        tronco_config.change_password(name, "default-" + token)
        tronco_tokens.store_password(name, "default-" + token, token)
        password = "default-" + token
    if (tronco_config.is_owner(name, password)):
        permissions = objects.all_permissions
    else:
        permissions = tronco_config.corpora[name]['permissions']['disconnected']
    return {
        'permissions': "|".join(permissions),
        'token': str(uuid4()),
        "tronco_token": token,
        "has_password": not password.startswith("default-")
        }

@app.route("/api/findOrCreateFile", methods=["POST"])
def find_or_create_file():
    name = request.values.get("name")
    password = tronco_tokens.get_password(name, request.values.get("tronco_token"))
    filename = request.values.get("filename")
    return {'data': functions.find_or_create_file(name, filename, create=tronco_config.has_permission(name, password, "editar"))}

@app.route("/api/recentFiles", methods=["POST"])
def recent_files():
    name = request.values.get("name")
    password = tronco_tokens.get_password(name, request.values.get("tronco_token"))
    if not tronco_config.has_permission(name, password, "visualizar"):
        return {"data": ""}
    key = request.values.get("key", "")
    return {'data': "|".join(functions.recent_files(name, key))}

@app.route("/api/renameFile", methods=["POST"])
def rename_file():
    name = request.values.get("name")
    password = tronco_tokens.get_password(name, request.values.get("tronco_token"))
    if not tronco_config.has_permission(name, password, "editar"): return None
    filename = request.values.get("filename")
    new_filename = functions.rename_file(name, filename, request.values.get("new_filename"))
    corpora_history.renameFile(name, filename, new_filename)
    if 'shared_files' in tronco_config.corpora[name]['permissions'] and filename in tronco_config.corpora[name]['permissions']['shared_files']:
        tronco_config.corpora[name]['permissions']['shared_files'].remove(filename)
        tronco_config.corpora[name]['permissions']['shared_files'].append(new_filename)
        tronco_config.save()
    if new_filename:
        return {'data': new_filename}
    else:
        return {'data': 'false'}

@app.route("/api/findOrCreateCorpus", methods=["POST"])
def find_or_create_corpus():
    name = request.values.get("name")
    result = functions.find_or_create_corpus(name)
    if not result in tronco_config.corpora:
        tronco_config.add_corpus(result)
    return {'data': result}

@app.route("/api/deleteCorpus", methods=["POST"])
def delete_corpus():
    name = request.values.get("name")
    token = request.values.get("tronco_token")
    password = tronco_tokens.get_password(name, token)
    if not tronco_config.has_permission(name, password, "configurar"): return None
    functions.delete_corpus(name)
    tronco_tokens.revoke_password(name, token)
    tronco_config.delete_corpus(name)
    advanced_corpora.remove_corpus(name)
    corpora_history.deleteCorpus(name)
    return {'data': ''}

@app.route("/api/renameCorpus", methods=["POST"])
def rename_corpus():
    name = request.values.get("name")
    token = request.values.get("tronco_token")
    password = tronco_tokens.get_password(name, token)
    if not tronco_config.has_permission(name, password, "configurar"): return None
    new_name = functions.rename_corpus(name, request.values.get("new_name"))
    tronco_tokens.store_password(new_name, password, token)
    tronco_tokens.revoke_password(name, token)
    tronco_config.corpora.update({new_name: tronco_config.corpora[name]})
    tronco_config.delete_corpus(name)
    if name in advanced_corpora.corpora:
        advanced_corpora.corpora.update({new_name: advanced_corpora.corpora[name]})
    advanced_corpora.remove_corpus(name)
    corpora_history.renameCorpus(name, new_name)
    if new_name:
        return {'data': new_name}
    else:
        return {'data': 'false'}

@app.route("/api/newFile", methods=["POST"])
def new_file():
    name = request.values.get("name")
    password = tronco_tokens.get_password(name, request.values.get("tronco_token"))
    if not tronco_config.has_permission(name, password, "editar"): return None
    filename = request.values.get("filename")
    result = functions.create_new_file(name, filename)
    if result:
        return {'data': result}
    else:
        return {'data': "false"}

#NOT IN USE, FOR THE FILE IS NOW ARCHIVE
@app.route("/api/deleteFile", methods=["POST"])
def delete_files():
    name = request.values.get("name")
    password = tronco_tokens.get_password(name, request.values.get("tronco_token"))
    if not tronco_config.has_permission(name, password, "editar"): return None
    filename = request.values.get("filename")
    functions.delete_file(name, filename)
    if 'shared_files' in tronco_config.corpora[name]['permissions'] and filename in tronco_config.corpora[name]['permissions']['shared_files']:
        tronco_config.corpora[name]['permissions']['shared_files'].remove(filename)
        tronco_config.save()
    return {'data': ''}

@app.route("/api/updateFiles")
def update_files():
    name = request.values.get("name")
    password = tronco_tokens.get_password(name, request.values.get("tronco_token"))
    if not tronco_config.has_permission(name, password, "visualizar"):
        return {'data': "", 'has_archive': False}
    return {'data': "|".join(functions.update_files(name)), 'has_archive': os.path.isfile(os.path.join(objects.root_path, "corpora", name, "ARCHIVE"))}

@app.route('/api/changeTroncoConfig', methods=["POST"])
def change_tronco_config():
    name = request.values.get("name")
    password = tronco_tokens.get_password(name, request.values.get("tronco_token"))
    if not tronco_config.has_permission(name, password, "configurar"): return None
    for value in request.values:
        if value not in ["name", "password"]:
            tronco_config.corpora[name]['settings'][value] = request.values.get(value)
    tronco_config.save()
    return {'data': ''}

@app.route('/api/saveFile', methods=["POST"])
def save_file():
    name = request.values.get('name')
    password = tronco_tokens.get_password(name, request.values.get("tronco_token"))
    if not tronco_config.has_permission(name, password, "editar"): return None
    filename = request.values.get('filename')
    text = request.values.get('text')
    corpora_history.record(name, filename, text)
    functions.save_file(name, filename, text)
    return {'error': 0}

@app.route('/api/loadFile')
def load_file():
    name = request.values.get('name')
    password = tronco_tokens.get_password(name, request.values.get("tronco_token"))
    filename = request.values.get('filename')
    if not tronco_config.has_permission(name, password, "visualizar") and (not 'shared_files' in tronco_config.corpora[name]['permissions'] or not filename in tronco_config.corpora[name]['permissions']['shared_files']):#filename != "README" and 
        return {'error': 2}
    history = [[y['date'], x, y['text'], y['characters']] for x, y in corpora_history.corpora[name][filename].items()] if tronco_config.has_permission(name, password, "editar") and name in corpora_history.corpora and filename in corpora_history.corpora[name] else []
    text = functions.load_file(name, filename)
    if text:
        return {
            'data': text, 
            'history': history,
            'error': 0,
            'who_claimed_access': session_tokens.who_claimed_access(name, filename),
            'is_public': 'shared_files' in tronco_config.corpora[name]['permissions'] and filename in tronco_config.corpora[name]['permissions']['shared_files']
            }
    else:
        return {'error': 3}

@app.route('/corpus/<name>')
def load_corpus(name):
    corpus_dir = os.path.join(objects.root_path, "corpora", name)
    if os.path.isdir(corpus_dir):
        filename = request.args.get("file", None)
        if filename and filename not in objects.tronco_special_files and not os.path.isfile(os.path.join(objects.root_path, "corpora", name, filename)):
            return redirect("/?load=false")
        return render_template('dashboard.html',
            name=name,
            filename=filename if filename else "README",
        )
    else:
        return redirect("/?load=false")

@app.route('/api/loadCorpora/', methods=["POST"])
def load_corpora():
    key = request.values.get('key')
    recent = request.values.get("recent")
    corpora = functions.load_corpora(key=key, recent=recent)
    return {
        'data': "|".join([x['name'] + (':l' if not 'visualizar' in tronco_config.corpora[x['name']]['permissions']['disconnected'] else '') for x in corpora['sorted_list']]),
        'new_recent': "|".join([x + (':l' if not 'visualizar' in tronco_config.corpora[x]['permissions']['disconnected'] else '') for x in corpora['new_recent'] if x in tronco_config.corpora])
    }

@app.route('/')
def home():
    r = 0
    try:
        r = requests.get("https://raw.githubusercontent.com/alvelvis/Tronco/master/latest_version")
    except:
        sys.stderr.write("Can't connect to the server to get the latest version.")
    return render_template(
        'index.html', 
        corpora=functions.load_corpora(),
        version=objects.tronco_version,
        latest_version=float(r.text) if r else objects.tronco_version,
        random_tip="Dica: " + random.choice(objects.startup_tips),
        random_salutation=random.choice(objects.startup_salutations)
        )

if __name__ == "__main__":
    #from pyfladesk import init_gui
    #init_gui(app, port=5240, width=1200, height=680,
             #window_title="Tronco", icon=os.path.join(app.root_path, "static", "favicon.png"))
    ui.run()