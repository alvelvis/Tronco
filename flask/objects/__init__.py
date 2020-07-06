import time
import json
import os
from app import root_path
import re
import sys
import estrutura_ud
import threading
import pickle
from ufal.udpipe import Model, Pipeline

tronco_version = 1.2
tronco_online = "tronco.ga"
tronco_metadata = ["last_seen", "first_seen", "times_seen"]

udpipe_models = {
    'pt': os.path.join(root_path, "udpipe", "portuguese-bosque-ud-2.5-191206.udpipe"),
    'en': os.path.join(root_path, "udpipe", "english-ewt-ud-2.5-191206.udpipe")
}

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
    "Não quer depender de internet? Você pode baixar a versão off-line do Tronco",
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

class AdvancedCorpora:

    def load_model(self, lang):
        self.models.update({lang: Model.load(udpipe_models[lang])})
        return True

    def load_corpus(self, name, lang):
        if name in self.corpora:
            del self.corpora[name]
        corpus_dir = os.path.join(root_path, "corpora", name)
        corpus_language = lang
        if not corpus_language in self.models:
            self.load_model(corpus_language)
        pipeline = Pipeline(self.models[corpus_language], "tokenize", Pipeline.DEFAULT, Pipeline.DEFAULT, "conllu")
        corpus = estrutura_ud.Corpus(recursivo=True)
        all_metadata = {'filename': ''}
        for filename in os.listdir(corpus_dir):
            if filename != "README":
                with open(corpus_dir + "/" + filename) as f:
                    text = f.read().splitlines()
                raw_text = []
                metadata = {}
                [raw_text.append(x) if not x.startswith("# ") and not " = " in x else metadata.update({x.split(" = ", 1)[0].split("# ", 1)[1]: x.split(" = ", 1)[1]}) for x in text]
                all_metadata.update(metadata)
                processed = pipeline.process("\n".join(raw_text)).replace("# newdoc\n", "").replace("# newpar\n", "")
                temp_corpus = estrutura_ud.Corpus(recursivo=False)
                temp_corpus.build(processed)
                for sent_id, sentence in temp_corpus.sentences.items():
                    for metadado in metadata:
                        sentence.metadados[metadado] = metadata[metadado]
                    sentence.sent_id = filename + '-' + sent_id
                    sentence.metadados['sent_id'] = filename + '-' + sent_id
                    sentence.metadados['filename'] = filename
                    corpus.sentences[filename + '-' + sent_id] = sentence
        
        self.corpora[name] = {'corpus': corpus, 'metadata': list(all_metadata.keys())}
        self.save()
        return True

    def remove_corpus(self, name):
        if name in self.corpora:
            del self.corpora[name]
            self.save()

    def save(self):
        with open(self.config_file, "wb") as f:
            pickle.dump(self.corpora, f)

    def get_number_sentences_or_load(self, name, lang):
        if not name in self.corpora:
            self.load_corpus(name, lang)
        return len(self.corpora[name]['corpus'].sentences)

    def __init__(self):
        self.corpora = {}
        self.models = {}
        self.config_file = os.path.join(root_path, "advanced_corpora.p")
        if os.path.isfile(self.config_file):
            with open(self.config_file, "rb") as f:
                self.corpora = pickle.load(f)

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
        self.tokens_file = os.path.join(root_path, "tronco_tokens.json")
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
        for corpus in os.listdir(os.path.join(root_path, "corpora")):
            if not corpus in self.corpora:
                self.add_corpus(corpus)
        
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
                    'corpus_language': 'pt',
                    'advanced_editing': "false",
                    }
                }
            self.save()

    def __init__(self):
        self.corpora = {}
        self.config_file = os.path.join(root_path, "tronco.json")
        self.load()

