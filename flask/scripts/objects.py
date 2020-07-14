import time
import json
import os
import re
import sys
import estrutura_ud
import interrogar_UD
import functions
import psutil
from ufal.udpipe import Model, Pipeline

tronco_version = 1.63
tronco_online = "tronco.ga"
tronco_metadata = ["last_seen", "first_seen", "times_seen"]
tronco_default_language = "pt"
root_path = ""
computer_memory = psutil.virtual_memory().total/1024/1024

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

    def query(self, name, params, metadata={}):
        if metadata or not name in self.corpora or (not params in self.corpora[name]['default_queries'] and (not name in self.temporary_queries or not params in self.temporary_queries[name])):
            corpus = self.structured[name]
            if metadata:
                new_corpus = estrutura_ud.Corpus()
                for sent_id in corpus.sentences:
                    new_sentence = estrutura_ud.Sentence(recursivo=True)
                    if all(metadado in corpus.sentences[sent_id].metadados and re.search(metadata[metadado], corpus.sentences[sent_id].metadados[metadado], flags=re.I) for metadado in metadata):
                        new_sentence.build(corpus.sentences[sent_id].to_str())
                    new_corpus.sentences[new_sentence.sent_id] = new_sentence
            else:
                new_corpus = corpus
            criterio = 5 if len(params.split('"')) >= 3 else 1
            query = interrogar_UD.main(new_corpus, criterio, params, fastSearch=True)
            output = query['output']
            sentences = len(output)
            occurrences = query['casos']
            results = []
            for sentence in output:
                if "# sent_id = " in sentence['resultado'] and '# text = ' in sentence['resultado']:
                    results.append([interrogar_UD.cleanEstruturaUD(sentence['resultado'].split("# sent_id = ")[1].split("\n")[0]), interrogar_UD.fromInterrogarToHtml(sentence['resultado'].split("# clean_text = " if '# clean_text = ' in sentence['resultado'] else "# text = ")[1].split("\n")[0])])
            
            word_distribution = interrogar_UD.getDistribution(query, params, "word", criterio=criterio)
            lemma_distribution = interrogar_UD.getDistribution(query, params, "lemma", criterio=criterio)

            query_return = {
                'results': results,
                'sentences': sentences,
                'occurrences': occurrences,
                'words': len(word_distribution['lista']),
                'word_occurrences': sum([x for x in word_distribution['lista'].values()]),
                'lemma_occurrences': sum([x for x in lemma_distribution['lista'].values()]),
                'lemmas': len(lemma_distribution['lista']),
                'word_distribution': sorted(list(word_distribution['lista'].items()), key=lambda x: (-x[1], x[0].lower())),
                'lemma_distribution': sorted(list(lemma_distribution['lista'].items()), key=lambda x: (-x[1], x[0].lower())),
            }

            if params not in ['word = ".*"', '\\tNOUN\\t', "\\tADJ\\t", "# text = .*"]:
                if not name in self.temporary_queries:
                    self.temporary_queries[name] = {}
                self.temporary_queries[name][params] = query_return

            return query_return

        else:
            if params in self.corpora[name]['default_queries']:
                query = self.corpora[name]['default_queries'][params]
            elif params in self.temporary_queries[name]:
                query = self.temporary_queries[name][params]
            return {
                "results": query['results'],
                "sentences": query['sentences'],
                "occurrences": query['occurrences'],
                "words": query['words'],
                "word_occurrences": query['word_occurrences'],
                "lemma_occurrences": query['lemma_occurrences'],
                "lemmas": query['lemmas'],
                "word_distribution": query['word_distribution'],
                "lemma_distribution": query['lemma_distribution'],
            }

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
            n = 1
            for filename in self.files[name]:
                for sent in self.files[name][filename].split("\n\n"):
                    if sent:
                        sentence = estrutura_ud.Sentence(recursivo=True)
                        sentence.build(sent, sent_id=filename + '-' + str(n))
                        sent_id = sentence.sent_id
                        all_metadata.update(self.metadata[name][filename])
                        for metadado in self.metadata[name][filename]:
                            sentence.metadados[metadado] = self.metadata[name][filename][metadado]
                        corpus.sentences[sent_id] = sentence
                        n += 1
            
            del self.files[name]
            del self.metadata[name]

            self.structured[name] = corpus
            self.corpora[name] = {
                'corpus': corpus.to_str(), 
                'metadata': list(all_metadata.keys()),
                'default_queries': {
                    'word = ".*"': self.query(name, 'word = ".*"'),
                    'upos = "NOUN"': self.query(name, "\\tNOUN\\t"),
                    'upos = "ADJ"': self.query(name, "\\tADJ\\t"),
                    "# text = .*": self.query(name, "# text = .*"),
                },
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
            metadata = {'filename': filename}
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
        if name in self.structured:
            del self.structured[name]

    def save(self):
        with open(self.config_file, "w") as f:
            json.dump(self.corpora, f)

    def get_number_sentences(self, name):
        if not name in self.structured and name in self.corpora:
            corpus = estrutura_ud.Corpus(recursivo=True)
            corpus.build(self.corpora[name]['corpus'])
            self.structured[name] = corpus
        return len(self.structured[name].sentences) if name in self.structured else 0

    def __init__(self):
        self.structured = {}
        self.metadata = {}
        self.corpora = {}
        self.temporary_queries = {}
        self.files = {}
        self.models = {}
        self.config_file = os.path.join(root_path, "advanced_corpora.json")
        if os.path.isfile(self.config_file):
            with open(self.config_file, "r") as f:
                self.corpora = json.load(f)

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
        if not os.path.isdir(os.path.join(root_path, "corpora")):
            os.mkdir(os.path.join(root_path, "corpora"))
        self.load()

