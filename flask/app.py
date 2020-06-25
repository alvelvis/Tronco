import os, sys
import requests
import random
from flask import Flask, redirect, render_template, request
from flaskwebgui import FlaskUI
from flask_pwa import PWA
from uuid import uuid4
import functions
import pprint

app = Flask(__name__)
PWA(app)
ui = FlaskUI(app, port=5240, maximized=True)
root_path = app.root_path

import objects
tronco_config = objects.TroncoConfig()
session_tokens = objects.SessionTokens()
app.jinja_env.globals.update(tronco_config=tronco_config)

@app.route("/api/claimAccess", methods=["POST"])
def claim_access():
    name = request.values.get("name")
    filename = request.values.get("filename")
    token = request.values.get("token")
    #previoustoken = request.values.get("previoustoken")
    #if session_tokens.did_someone_else_edit(name, filename, token, previoustoken):
    #return {'error': 1}
    #else:
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
    password = request.values.get("password")
    if not tronco_config.has_permission(name, password, "configurar"): return None

    perm = request.values.get("perm")
    value = str(request.values.get("value")).lower()
    old_set = tronco_config.corpora[name]['permissions']['disconnected']
    new_set = []
    for permission in objects.all_permissions:
        if (permission != perm and permission in old_set) or (permission == perm and value == "true"):
            new_set.append(permission)
    tronco_config.corpora[name]['permissions']['disconnected'] = new_set
    tronco_config.save()
    return {'data': ''}

@app.route("/api/setPassword", methods=["POST"])
def set_password():
    name = request.values.get("name")
    password = request.values.get("password")
    if not tronco_config.has_permission(name, password, "configurar"): return None
    new_password = request.values.get("new_password")
    tronco_config.corpora[name]['permissions']['password'] = new_password
    tronco_config.save()
    return {'data': ''}

@app.route("/api/loadConfig", methods=["POST"])
def load_config():
    name = request.values.get("name")     
    return {
        'auto_save': tronco_config.corpora[name]['settings']['auto_save'],
        'auto_wrap': tronco_config.corpora[name]['settings']['auto_wrap'],
        'view_perm': "visualizar" in tronco_config.corpora[name]['permissions']['disconnected'],
        'edit_perm': "editar" in tronco_config.corpora[name]['permissions']['disconnected'],
        'setup_perm': "configurar" in tronco_config.corpora[name]['permissions']['disconnected']
        }

@app.route("/api/validatePassword", methods=["POST"])
def validate_password():
    name = request.values.get("name")
    password = request.values.get("password")

    if (tronco_config.is_owner(name, password)):
        permissions = objects.all_permissions
    else:
        permissions = tronco_config.corpora[name]['permissions']['disconnected']
    
    return {
        'permissions': "|".join(permissions),
        'token': str(uuid4())
        }

@app.route("/api/findOrCreateFile", methods=["POST"])
def find_or_create_file():
    name = request.values.get("name")
    password = request.values.get("password")
    filename = request.values.get("filename")
    return {'data': functions.find_or_create_file(name, filename, create=tronco_config.has_permission(name, password, "editar"))}

@app.route("/api/recentFiles", methods=["POST"])
def recent_files():
    name = request.values.get("name")
    password = request.values.get("password")
    key = request.values.get("key", "")
    return {'data': "|".join(functions.recent_files(name, key))}

@app.route("/api/renameFile", methods=["POST"])
def rename_file():
    name = request.values.get("name")
    password = request.values.get("password")
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
        tronco_config.save()
    return {'data': result}

@app.route("/api/deleteCorpus", methods=["POST"])
def delete_corpus():
    name = request.values.get("name")
    password = request.values.get("password")
    if not tronco_config.has_permission(name, password, "configurar"): return None
    functions.delete_corpus(name)
    del tronco_config.corpora[name]
    tronco_config.save()
    return {'data': ''}

@app.route("/api/renameCorpus", methods=["POST"])
def rename_corpus():
    name = request.values.get("name")
    password = request.values.get("password")
    if not tronco_config.has_permission(name, password, "configurar"): return None
    new_name = request.values.get("new_name")
    result = functions.rename_corpus(name, new_name)
    tronco_config.corpora.update({new_name: tronco_config.corpora[name]})
    del tronco_config.corpora[name]
    tronco_config.save()
    if result:
        return {'data': result}
    else:
        return {'data': 'false'}

@app.route("/api/newFile", methods=["POST"])
def new_file():
    name = request.values.get("name")
    password = request.values.get("password")
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
    password = request.values.get("password")
    if not tronco_config.has_permission(name, password, "editar"): return None
    filename = request.values.get("filename")
    functions.delete_file(name, filename)
    return {'data': ''}

@app.route("/api/updateFiles")
def update_files():
    name = request.values.get("name")
    return {'data': "|".join(functions.update_files(name))}

@app.route('/api/changeTroncoConfig', methods=["POST"])
def change_tronco_config():
    name = request.values.get("name")
    password = request.values.get("password")
    if not tronco_config.has_permission(name, password, "configurar"): return None
    for value in request.values:
        if value not in ["name", "password"]:
            tronco_config.corpora[name]['settings'][value] = request.values.get(value)
    tronco_config.save()
    return {'data': ''}

@app.route('/api/saveFile', methods=["POST"])
def save_file():
    name = request.values.get('name')
    password = request.values.get("password")
    if not tronco_config.has_permission(name, password, "editar"): return None
    filename = request.values.get('filename')
    text = request.values.get('text')
    token = request.values.get("token")
    functions.save_file(name, filename, text)
    return {'error': 0}

@app.route('/api/loadFile')
def load_file():
    name = request.values.get('name')
    password = request.values.get("password")
    filename = request.values.get('filename')
    if filename != "README" and not tronco_config.has_permission(name, password, "visualizar"):
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
    corpus_dir = os.path.join(app.root_path, "corpora", name)
    if os.path.isdir(corpus_dir):
        filename = request.args.get("file", None)
        if filename and filename != "README" and not os.path.isfile(os.path.join(app.root_path, "corpora", name, filename)):
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
        'data': "|".join([x['name'] for x in corpora['sorted_list']]),
        'new_recent': "|".join(corpora['new_recent'])
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