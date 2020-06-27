import time
import json
import os
import app
import re
import sys

tronco_version = 1.0
tronco_metadata = ["last_seen", "first_seen", "times_seen"]
all_permissions = ["visualizar", "editar", "configurar"]
startup_salutations = [
    "Saudações,",
    "Olá,",
    "Bem-vindo,",
    "Oi,",
    "Bom te ver,",
    "Ciao,",
    "Hi,",
    "Salut,",
    "Hallo,",
    "Konnichiwa,",
    "Namastê,",
]
startup_tips = [
    "Você pode sempre acessar a barra de buscas apertando Ctrl+P",
    "Está sem internet? Você pode sempre utilizar a versão off-line do Tronco",
    "Está na rua e precisa tomar nota? Experimente nosso aplicativo",
    "Buscar coleções ou textos que não existem é uma maneira rápida de criá-los",
    "Você pode sempre configurar se outras pessoas terão acesso aos seus arquivos",
    "Os metadados do arquivo de introdução são aplicados a todos os arquivos da coleção",
    "Depois de criar uma senha para uma coleção, ela não poderá mais ser recuperada!",
    "Você sabia que pode utilizar o Tronco com apenas poucos comandos do teclado?",
    "Quer selecionar outra coleção de textos? Ctrl+E",
    "Precisa criar um novo arquivo rapidamente? Ctrl+P",
    "O arquivo de introdução será sempre exibido ao abrir uma coleção",
    "Você pode compartilhar qualquer texto, mas fique atento às permissões de visitante",
    "Utilize as setas do teclado para navegar pelas coleções na tela inicial",
    "Com a barra de buscas você pode tanto pesquisar quanto criar novos arquivos ou coleções",
    "O arquivo de introdução pode ser visto por todos, mesmo visitantes"
]

_filename_ascii_strip_re = re.compile(r"[^ a-zçáéíóúãõàèìòùâêîôû0-9_.-]", flags=re.IGNORECASE)

_windows_device_files = (
    "CON",
    "AUX",
    "COM1",
    "COM2",
    "COM3",
    "COM4",
    "LPT1",
    "LPT2",
    "LPT3",
    "PRN",
    "NUL",
)

class TroncoTokens:

    def load(self):
        if os.path.isfile(self.tokens_file):
            with open(self.tokens_file, "rb") as f:
                self.tokens = json.load(f)

    def save(self):
        with open(self.tokens_file, "w") as f:
            json.dump(self.tokens, f)

    def store_password(self, name, password, token):
        if not token in self.tokens:
            self.tokens[token] = {}
        self.tokens[token][name] = password
        self.save()

    def revoke_password(self, name, token):
        if token in self.tokens and name in self.tokens[token]:
            del self.tokens[token][name]
            self.save()

    def get_password(self, name, token):
        if not token in self.tokens:
            return "default"
        if not name in self.tokens[token]:
            return "default"
        return self.tokens[token][name]

    def __init__(self):
        self.tokens = {}
        self.tokens_file = os.path.join(app.root_path, "tronco_tokens.json")
        self.load()

class SessionTokens:

    def __init__(self):
        self.tokens = {}

    def who_claimed_access(self, name, filename):
        key = name + "|" + filename
        if not key in self.tokens:
            return "none"
        return self.tokens[key]['token']

    def just_edited(self, name, filename, token):
        key = name + "|" + filename
        self.tokens[key] = {
            'token': token,
            'date': time.time(),
        }

    def stopped_editing(self, name, filename, token):
        key = name + "|" + filename
        if key in self.tokens and token == self.tokens[key]['token']:
            del self.tokens[key]

class TroncoConfig:

    def delete_corpus(self, name):
        if name in self.corpora:
            del self.corpora[name]
            self.save()

    def change_password(self, name, new_password):
        if name in self.corpora:
            self.corpora[name]['permissions']['password'] = new_password
            self.save()

    def change_permissions(self, name, permissions):
        if name in self.corpora:
            self.corpora[name]['permissions']['disconnected'] = permissions
            self.save()

    def has_permission(self, name, password, permission):
        if not name in self.corpora:
            self.add_corpus(name)
        if password == self.corpora[name]['permissions']['password']:
            return True
        elif permission in self.corpora[name]['permissions']['disconnected']:
            return True
        return False

    def is_owner(self, name, password):
        if not name in self.corpora:
            self.add_corpus(name)
        return password == self.corpora[name]['permissions']['password']

    def load(self):
        if os.path.isfile(self.config_file):
            with open(self.config_file, "rb") as f:
                self.corpora = json.load(f)
        
    def save(self):
        with open(self.config_file, "w") as f:
            json.dump(self.corpora, f)

    def add_corpus(self, name):
        if not name in self.corpora:
            self.corpora[name] = {
                'permissions': {
                    'password': "default",
                    'disconnected': ["visualizar"]
                    },
                'settings': {
                    'auto_wrap': "true",
                    'auto_save': "true",
                    }
                }
            self.save()

    def __init__(self):
        self.corpora = {}
        self.config_file = os.path.join(app.root_path, "tronco.json")
        self.load()

