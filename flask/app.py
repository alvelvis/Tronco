import os, sys
import requests
import random
import json
from flask import Flask, redirect, render_template, request, url_for, send_from_directory
from flaskwebgui import FlaskUI
from uuid import uuid4

app = Flask(__name__)
ui = FlaskUI(app, port=5240, maximized=True)
sys.path.insert(0, os.path.join(app.root_path, "scripts"))
import objects
import functions

objects.root_path = app.root_path
tronco_config = objects.TroncoConfig()
session_tokens = objects.SessionTokens()
tronco_tokens = objects.TroncoTokens()
temporary_objects = objects.TemporaryObjects()
app.jinja_env.globals.update(tronco_config=tronco_config)

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
    query = functions.query(name, session_token, params, objects.advanced_corpora.corpora[name]['corpus'], metadata)
    query['data']['query_results'] = temporary_objects.push_objects('query_results', query['data']['results'], session_token)
    query['data']['word_distribution'] = temporary_objects.push_objects('word_distribution', query['data']['word_distribution'], session_token)
    query['data']['lemma_distribution'] = temporary_objects.push_objects('lemma_distribution', query['data']['lemma_distribution'], session_token)
    query['data']['pages'] = {
        'query_results': len(temporary_objects.objects['query_results'][session_token]),
        'word_distribution': len(temporary_objects.objects['word_distribution'][session_token]),
        'lemma_distribution': len(temporary_objects.objects['lemma_distribution'][session_token]),
    }
    query['data']['page'] = 1
    return query

@app.route("/api/loadAdvancedCorpus", methods=["POST"])
def load_advanced_corpus():
    name = request.values.get("name")
    corpus_dir = os.path.join(objects.root_path, "corpora", name)
    password = tronco_tokens.get_password(name, request.values.get("tronco_token"))
    session_token = request.values.get("session_token")
    force = request.values.get("force")
    if not tronco_config.has_permission(name, password, "visualizar"): return {'error': '1'}
    corpus_language = tronco_config.corpora[name]['settings']['corpus_language'] if 'corpus_language' in tronco_config.corpora[name]['settings'] else objects.tronco_default_language
    if name in objects.advanced_corpora.files:
        del objects.advanced_corpora.files[name]
    if name in objects.advanced_corpora.metadata:
        del objects.advanced_corpora.metadata[name]
    if force == "true":
        objects.advanced_corpora.delete_corpus(name)
    if not name in objects.advanced_corpora.corpora:
        n_files = len(os.listdir(corpus_dir))
        temporary_objects.set_max_indexing_files('indexing', session_token, n_files-1)
        for filename in os.listdir(corpus_dir):
            if filename != "README":
                objects.advanced_corpora.load_file(name, filename, corpus_language)
                temporary_objects.decrease_n_indexing_files('indexing', session_token, 1)
        objects.advanced_corpora.mount_corpus(name)
    if not name in objects.advanced_corpora.corpora:
        return {'error': '2'}
    return {'error': '0', 'data': objects.advanced_corpora.get_number_sentences(name), 'metadata': objects.advanced_corpora.corpora[name]['metadata']}

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

@app.route("/pwa")
def pwa():
    return app.send_static_file("pwabuilder-sw.js")

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
    if (tronco_config.is_owner(name, password)):
        permissions = objects.all_permissions
    else:
        permissions = tronco_config.corpora[name]['permissions']['disconnected']
    
    return {
        'permissions': "|".join(permissions),
        'token': str(uuid4()),
        "tronco_token": token,
        "has_password": password != "default"
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
    new_filename = request.values.get("new_filename")
    result = functions.rename_file(name, filename, new_filename)
    if result:
        return {'data': result}
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
    objects.advanced_corpora.remove_corpus(name)
    return {'data': ''}

@app.route("/api/renameCorpus", methods=["POST"])
def rename_corpus():
    name = request.values.get("name")
    token = request.values.get("tronco_token")
    password = tronco_tokens.get_password(name, token)
    if not tronco_config.has_permission(name, password, "configurar"): return None
    new_name = request.values.get("new_name")
    result = functions.rename_corpus(name, new_name)
    tronco_tokens.store_password(new_name, password, token)
    tronco_tokens.revoke_password(name, token)
    tronco_config.corpora.update({new_name: tronco_config.corpora[name]})
    tronco_config.delete_corpus(name)
    if name in objects.advanced_corpora.corpora:
        objects.advanced_corpora.corpora.update({new_name: objects.advanced_corpora.corpora[name]})
    objects.advanced_corpora.remove_corpus(name)
    if result:
        return {'data': result}
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

@app.route("/api/deleteFile", methods=["POST"])
def delete_files():
    name = request.values.get("name")
    password = tronco_tokens.get_password(name, request.values.get("tronco_token"))
    if not tronco_config.has_permission(name, password, "editar"): return None
    filename = request.values.get("filename")
    functions.delete_file(name, filename)
    return {'data': ''}

@app.route("/api/updateFiles")
def update_files():
    name = request.values.get("name")
    password = tronco_tokens.get_password(name, request.values.get("tronco_token"))
    if not tronco_config.has_permission(name, password, "visualizar"):
        return {'data': ""}
    return {'data': "|".join(functions.update_files(name))}

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
    token = request.values.get("token")
    functions.save_file(name, filename, text)
    return {'error': 0}

@app.route('/api/loadFile')
def load_file():
    name = request.values.get('name')
    password = tronco_tokens.get_password(name, request.values.get("tronco_token"))
    filename = request.values.get('filename')
    if not tronco_config.has_permission(name, password, "visualizar"):#filename != "README" and 
        return {'error': 2}
    text = functions.load_file(name, filename)
    if text:
        return {
            'data': text, 
            'error': 0,
            'who_claimed_access': session_tokens.who_claimed_access(name, filename)
            }
    else:
        return {'error': 3}

@app.route('/corpus/<name>')
def load_corpus(name):
    corpus_dir = os.path.join(objects.root_path, "corpora", name)
    if os.path.isdir(corpus_dir):
        filename = request.args.get("file", None)
        if filename and filename != "README" and not os.path.isfile(os.path.join(objects.root_path, "corpora", name, filename)):
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
    ui.run()