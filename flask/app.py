import os, sys
import requests
import random
from flask import Flask, redirect, render_template, request
#from pyfladesk import init_gui
from flaskwebgui import FlaskUI
from flask_pwa import PWA
import functions

app = Flask(__name__)
PWA(app)
ui = FlaskUI(app, port=5240, maximized=True)# window_title="Tronco", icon="static/favicon.png"
root_path = app.root_path

import objects
tronco_config = objects.TroncoConfig()
app.jinja_env.globals.update(tronco_config=tronco_config)

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
    tronco_config.corpora[name]['permissions']['disconnected'].remove("configurar")
    tronco_config.corpora[name]['permissions']['disconnected'].remove("editar")
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

    if (password == tronco_config.corpora[name]['permissions']['password']):
        permissions = objects.all_permissions
    else:
        permissions = tronco_config.corpora[name]['permissions']['disconnected']
    
    return {'permissions': "|".join(permissions)}

@app.route("/api/findOrCreateFile", methods=["POST"])
def find_or_create_file():
    name = request.values.get("name")
    password = request.values.get("password")
    if not tronco_config.has_permission(name, password, "visualizar"): return None
    filename = request.values.get("filename")

    return {'data': functions.find_or_create_file(name, filename, create=tronco_config.has_permission(name, password, "editar"))}

@app.route("/api/recentFiles", methods=["POST"])
def recent_files():
    name = request.values.get("name")
    password = request.values.get("password")
    if not tronco_config.has_permission(name, password, "visualizar"): return None
    key = request.values.get("key", "")
    data = [f'<li class="breadcrumb-item"><a class="recentFiles" href="#" file="{x}">{x}</a></li>' for x in functions.recent_files(name, key)]
    return {'data': data}

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
    if not tronco_config.has_permission(name, password, "editar"): return None
    functions.delete_corpus(name)
    del tronco_config.corpora[name]
    tronco_config.save()
    return {'data': ''}

@app.route("/api/renameCorpus", methods=["POST"])
def rename_corpus():
    name = request.values.get("name")
    password = request.values.get("password")
    if not tronco_config.has_permission(name, password, "editar"): return None
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
    password = request.values.get("password")
    if not tronco_config.has_permission(name, password, "visualizar"): return None

    data = [f'''
    <li class="nav-item d-flex justify-content-between align-items-center">
        <a class="nav-link files d-flex align-items-center" style="width:100%;" file="{ x }">
            <span data-feather="file-text"></span>
            <span style="max-width: 100px; display:inline-block; white-space: nowrap; overflow:hidden; text-overflow:ellipsis">{ x }</span>
        </a>
        <div class="d-flex align-items-center fileSettings">
            <a class="d-flex align-items-center renameFile" style="padding-right:10px" title="Renomear arquivo" file="{ x }">
                <span data-feather="delete"></span>
            </a>
            <a class="d-flex align-items-center deleteFile" style="padding-right:16px" title="Deletar arquivo" file="{ x }">
                <span data-feather="trash"></span>
            </a>
        </div>
    </li>''' for x in functions.update_files(name)]
    return {'data': "\n".join(data)}

@app.route('/api/changeTroncoConfig', methods=["POST"])
def change_tronco_config():
    name = request.values.get("name")
    password = request.values.get("password")
    if not tronco_config.has_permission(name, password, "editar"): return None
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
    functions.save_file(name, filename, text)
    return {'data': ''}

@app.route('/api/loadFile')
def load_file():
    name = request.values.get('name')
    password = request.values.get("password")
    if not tronco_config.has_permission(name, password, "visualizar"): return None
    filename = request.values.get('filename')
    text = functions.load_file(name, filename)
    if text:
        return {'data': text}
    else:
        return redirect("/")

@app.route('/corpus/<name>')
def load_corpus(name):
    corpus_dir = os.path.join(app.root_path, "corpora", name)
    if os.path.isdir(corpus_dir):
        filename = request.args.get("file", None)
        if filename and filename != "README" and not os.path.isfile(os.path.join(app.root_path, "corpora", name, filename)):
            return redirect("/")
        return render_template('dashboard.html',
            name=name,
            filename=filename if filename else "README",
        )
    else:
        return redirect("/")

@app.route('/api/loadCorpora/', methods=["POST"])
def load_corpora():
    key = request.values.get('key')
    corpora = functions.load_corpora(key=key)
    return {'data': "".join(["<li><a href='/corpus/{}?file=README'>".format(x['name']) + x['name'] + " ({})</a></li>".format(x['files']) for x in corpora])}

@app.route('/')
def home():
    r = requests.get("https://raw.githubusercontent.com/alvelvis/Tronco/master/latest_version")
    return render_template(
        'index.html', 
        corpora=functions.load_corpora(),
        version=objects.tronco_version,
        latest_version=float(r.text) if r else objects.tronco_version,
        random_tip="Dica: " + random.choice(objects.startup_tips)
        )

if __name__ == "__main__":
    #init_gui(app,)
    ui.run()