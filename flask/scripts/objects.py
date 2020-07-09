import time
import json
import os
import re
import sys
import estrutura_ud
import interrogar_UD
import pickle
import functions
from ufal.udpipe import Model, Pipeline

tronco_version = 1.38
tronco_online = "tronco.ga"
tronco_metadata = ["last_seen", "first_seen", "times_seen"]
tronco_default_language = "pt"
root_path = ""

udpipe_models = {
    'pt': {
        'path': "portuguese-bosque-ud-2.5-191206.udpipe",
        'label': "Português"
    },
    'en': {
        'path': "english-ewt-ud-2.5-191206.udpipe",
        'label': 'Inglês',
    }
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

class TemporaryObjects:

    def __init__(self):
        self.objects = {
            'query_results': {},
            'word_distribution': {},
            'lemma_distribution': {},
            'sending': {},
            'indexing': {},
        }
        self.temp = {}

    def set_max_indexing_files(self, sending_or_indexing, session_token, n_files):
        self.objects[sending_or_indexing][session_token] = [n_files, n_files]

    def increase_max_indexing_files(self, method, session_token, n):
        if session_token in self.objects[method]:
            self.objects[method][session_token][1] += n

    def decrease_n_indexing_files(self, sending_or_indexing, session_token, n):
        if session_token in self.objects[sending_or_indexing]:
            self.objects[sending_or_indexing][session_token][0] -= n
            #if self.objects[sending_or_indexing][session_token][0] <= 0:
                #del self.objects[sending_or_indexing][session_token]

    def claim_alive(self, session_token):
        self.temp[session_token] = time.time()
        self.clean_timed_out()

    def clean_timed_out(self):
        for session_token in list(self.temp.keys()):
            if time.time() - self.temp[session_token] > 300:
                del self.temp[session_token]
                for key in list(self.objects.keys()):
                    if session_token in self.objects[key]:
                        del self.objects[key][session_token]

    def push_objects(self, key, full_list, session_token, max_objects_each_page=100):
        self.claim_alive(session_token)
        self.objects[key][session_token] = [x for x in functions.chunkIt(full_list, len(full_list)/max_objects_each_page if len(full_list)/max_objects_each_page > 0 else 1) if x]
        return self.objects[key][session_token][0] if self.objects[key][session_token] else []

    def get_page(self, key, page, session_token):
        self.claim_alive(session_token)
        return self.objects[key][session_token][page]

class AdvancedCorpora:

    def delete_corpus(self, name):
        if name in self.corpora:
            del self.corpora[name]
        if name in self.metadata:
            del self.metadata[name]
        if name in self.files:
            del self.files[name]

    def mount_corpus(self, name):

        if name in self.files:
            all_metadata = {}
            corpus = estrutura_ud.Corpus()
            for filename in self.files[name]:
                for sent in self.files[name][filename].split("\n\n"):
                    if sent:
                        sentence = estrutura_ud.Sentence(recursivo=True)
                        sentence.build(sent)
                        sent_id = sentence.sent_id
                        all_metadata.update(self.metadata[name][filename])
                        for metadado in self.metadata[name][filename]:
                            sentence.metadados[metadado] = self.metadata[name][filename][metadado]
                        sentence.sent_id = filename + '-' + sent_id
                        sentence.metadados['sent_id'] = filename + '-' + sent_id
                        sentence.metadados['filename'] = filename
                        corpus.sentences[filename + '-' + sent_id] = sentence
            
            del self.files[name]
            del self.metadata[name]

            all_words = interrogar_UD.main(corpus, 5, 'word = ".*"', fastSearch=True)
            all_nouns = interrogar_UD.main(corpus, 1, '\\tNOUN\\t', fastSearch=True)
            all_adjectives = interrogar_UD.main(corpus, 1, '\\tADJ\\t', fastSearch=True)
            all_sentences = interrogar_UD.main(corpus, 1, '# text = .*', fastSearch=True)

            self.corpora[name] = {
                'corpus': corpus, 
                'metadata': list(all_metadata.keys()),
                'default_queries': {
                    'word = ".*"': all_words, 
                    'upos = "NOUN"': all_nouns, 
                    'upos = "ADJ"': all_adjectives,
                    "# text = .*": all_sentences,
                    }
                }
            self.save()

    def load_file(self, name, filename, lang):
        
        if filename != "README":
            filename_dir = os.path.join(root_path, "corpora", name, filename)
            if not lang in self.models:
                self.models[lang] = Model.load(os.path.join(root_path, "udpipe", udpipe_models[lang]['path']))
            pipeline = Pipeline(self.models[lang], "tokenize", Pipeline.DEFAULT, Pipeline.DEFAULT, "conllu")
            with open(filename_dir) as f:
                try:
                    text = f.read().splitlines()
                except:
                    return False
            
            raw_text = []
            metadata = {}
            [metadata.update({x.split(" = ", 1)[0].split("# ", 1)[1]: x.split(" = ", 1)[1]}) if x.strip().startswith("# ") and " = " in x else raw_text.append(x) for x in text]

            if not name in self.files:
                self.files[name] = {}
            self.files[name][filename] = pipeline.process("\n".join(raw_text)).replace("# newdoc\n", "").replace("# newpar\n", "")
            if not name in self.metadata:
                self.metadata[name] = {}
            self.metadata[name][filename] = metadata

    def remove_corpus(self, name):
        if name in self.corpora:
            del self.corpora[name]
            self.save()

    def save(self):
        with open(self.config_file, "wb") as f:
            pickle.dump(self.corpora, f)

    def get_number_sentences(self, name):
        return len(self.corpora[name]['corpus'].sentences)

    def __init__(self):
        self.metadata = {}
        self.corpora = {}
        self.files = {}
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
                    'corpus_language': tronco_default_language,
                    'advanced_editing': "true",
                    }
                }
            self.save()

    def __init__(self):
        self.corpora = {}
        self.config_file = os.path.join(root_path, "tronco.json")
        self.load()

