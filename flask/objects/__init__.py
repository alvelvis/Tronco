import time
import json
import os
import app
import re

tronco_version = 1.0
tronco_metadata = ["last_seen", "first_seen", "times_seen"]
all_permissions = ["visualizar", "editar", "configurar"]
startup_tips = [
    "Você pode sempre acessar a barra de buscas apertando Ctrl+P",
    "Caiu a luz? Não perca seu texto, ative o salvamento automático",
    "Está sem internet? Você pode sempre utilizar a versão off-line do Tronco",
    "Está na rua e precisa tomar nota? Experimente nosso aplicativo",
    "Buscar coleções ou textos que não existem é uma maneira rápida de criá-los",
    "Você pode sempre configurar se outras pessoas terão acesso aos seus arquivos",
    "Os metadados do arquivo README são aplicados a todos os arquivos da coleção",
    "Depois de criar uma senha para uma coleção, ela não poderá mais ser recuperada!",
    "Você sabia que pode utilizar o Tronco com apenas poucos comandos do teclado?",
    "Quer selecionar outra coleção de textos? Ctrl+E",
    "Precisa criar um novo arquivo rapidamente? Ctrl+O",
    "O README será sempre exibido ao abrir uma coleção",
    "Utilize o README para escrever uma introdução para a coleção!",
    "Você pode compartilhar qualquer texto, mas fique atento às permissões de visitante"
]

_filename_ascii_strip_re = re.compile(r"[^ A-Za-z0-9_.-]")

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

class TroncoConfig:

    def has_permission(self, name, password, permission):
        if not name in self.corpora:
            self.add_corpus(name)
            self.save()
        if password == self.corpora[name]['permissions']['password']:
            return True
        elif permission in self.corpora[name]['permissions']['disconnected']:
            return True
        return False

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

    def __init__(self):
        self.corpora = {}
        self.config_file = os.path.join(app.root_path, "tronco.json")
        self.load()

