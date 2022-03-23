import os
import re
import sys
import time
import shutil
import datetime
from scripts import estrutura_ud
from scripts import interrogar_UD
import textract
from scripts import objects
sys.path.append("scripts")

def chunkIt(seq, num):
    avg = len(seq) / float(num)
    out = []
    last = 0.0
    while last < len(seq):
        out.append(seq[int(last):int(last + avg)])
        last += avg
    return out

def save_metadata(name, filename, metadata):
    filename_dir = os.path.join(objects.root_path, "corpora", name, filename)
    corpus_dir = os.path.join(objects.root_path, "corpora", name)

    with open(filename_dir) as f:
        text = f.read().splitlines()
    text_metadata = {
        x.split("# ", 1)[1].split(" = ", 1)[0]: x.split(" = ")[1]
        for x in text if x.strip().startswith("# ") and " = " in x
    }
    text = "\n".join([x for x in text if not x.strip().startswith("# ") and not ' = ' in x])
    
    for item in objects.tronco_metadata:
        metadata.update({item: text_metadata[item]})

    with open(filename_dir, "w") as f:
        f.write("\n".join(["# " + x + " = " + y for x, y in metadata.items()]) + "\n" + text)

    if filename == "README":
        for ordinary_file in os.listdir(corpus_dir):
            if not ordinary_file in objects.tronco_special_files:
                ordinary_filename = os.path.join(objects.root_path, "corpora", name, ordinary_file)
                with open(ordinary_filename) as f:
                    ordinary_text = f.read().splitlines()
                ordinary_metadata = {
                    x.split("# ", 1)[1].split(" = ", 1)[0]: x.split(" = ")[1]
                    for x in ordinary_text if x.strip().startswith("# ") and " = " in x
                }
                ordinary_text = "\n".join([x for x in ordinary_text if not x.strip().startswith("# ") and not ' = ' in x])
                for metadado in metadata:
                    if metadado not in objects.tronco_metadata:
                        if metadado not in ordinary_metadata:
                            ordinary_metadata[metadado] = metadata[metadado]
                        elif metadado in ordinary_metadata and metadado in text_metadata and ordinary_metadata[metadado] == text_metadata[metadado]:
                            ordinary_metadata[metadado] = metadata[metadado]
                for metadado in text_metadata:
                    if metadado not in objects.tronco_metadata:
                        if metadado in text_metadata and metadado in ordinary_metadata and metadado not in metadata and ordinary_metadata[metadado] == text_metadata[metadado]:
                            del ordinary_metadata[metadado]

                with open(ordinary_filename, "w") as f:
                    f.write("\n".join(["# " + x + " = " + y for x, y in ordinary_metadata.items()]) + "\n" + ordinary_text)
                        
    return {'error': '0'}

def upload_file(uploading, filename, corpus=False):
    filename = secure_filename(filename).replace(" ", "_")
    upload_dir = os.path.join(objects.root_path, "uploads") if not corpus else os.path.join(objects.root_path, "corpora", corpus)
    if not os.path.isdir(upload_dir):
        os.mkdir(upload_dir)
    files_in_folder = [x.lower() for x in os.listdir(upload_dir)]
    n_files = len(files_in_folder)
    if filename.lower() in files_in_folder or filename.lower() + ".txt" in files_in_folder:
        filename = "{}_{}{}".format(filename.rsplit(".", 1)[0], n_files, "." + filename.rsplit(".", 1)[1] if "." in filename else "")
    uploaded_dir = os.path.join(objects.root_path, "uploads", filename) if not corpus else os.path.join(objects.root_path, "corpora", corpus, filename)
    if not isinstance(uploading, str):
        uploading.save(uploaded_dir)
    else:
        shutil.copyfile(os.path.join(objects.root_path, "corpora", uploading), uploaded_dir)
    if os.stat(uploaded_dir).st_size > 5000000:
        os.remove(uploaded_dir)
        return {'filename': filename, 'error': "1"}
    if corpus:
        text = ""
        for encoding in ["utf-8", "latin-1"]:
            if not text:
                try:
                    text = textract.process(uploaded_dir, encoding=encoding)
                except:
                    try:
                        text = textract.process(uploaded_dir, extension="txt", encoding=encoding)
                    except:
                        try:
                            with open(uploaded_dir, "r", encoding=encoding) as f:
                                text = f.read()
                        except:
                            pass
        if text:
            if isinstance(text, bytes):
                mode = "wb"
            else:
                mode = "w"
            with open(uploaded_dir + (".txt" if not uploaded_dir.endswith(".txt") else ""), mode) as f:
                f.write(text)
            if not uploaded_dir.endswith(".txt"):
                os.remove(uploaded_dir)
        if not text:
            #if not uploaded_dir.endswith(".txt"):
            os.remove(uploaded_dir)
            return {'filename': filename, 'error': '2'}

    return {
        'filename': filename,
        'error': "0",
    }

def find_or_create_file(name, filename, create):
    name_dir = os.path.join(objects.root_path, "corpora", name)
    filename = secure_filename(filename)
    for item in os.listdir(name_dir):
        if item.lower().strip() == filename.lower().strip():
            return item
    if create:
        return create_new_file(name, filename)
    else:
        return None

def recent_files(name, key="", max_results=30):
    name_dir = os.path.join(objects.root_path, "corpora", name)
    files = {}
    for item in os.listdir(name_dir):
        if item not in objects.tronco_special_files:
            files[item] = {
                'stats': [0, 0],
                'text': ""
            }
            item_dir = os.path.join(objects.root_path, "corpora", name, item)
            with open(item_dir) as f:
                try:
                    text = f.read()
                except:
                    text = ""
            files[item]['text'] = text
            if all(x in text for x in ["# times_seen = ", "# last_seen = "]):
                files[item]['stats'][0] = float(text.split("# last_seen = ")[1].split("\n")[0])
                files[item]['stats'][1] = int(text.split("# times_seen = ")[1].split("\n")[0])

    return [x for x in sorted(files, key=lambda y: -files[y]['stats'][0]) if not key or (key and all((k.lower() in x.lower() or k.lower() in files[x]['text'].lower()) for k in key.split()))][:max_results]

def rename_file(name, filename, new_filename):
    name_dir = os.path.join(objects.root_path, "corpora", name)
    filename_dir = os.path.join(objects.root_path, "corpora", name, filename)
    new_filename = secure_filename(new_filename)
    new_filename_dir = os.path.join(objects.root_path, "corpora", name, new_filename)
    for item in os.listdir(name_dir):
        if item.lower().strip() == new_filename.lower().strip():
            return False
    shutil.move(filename_dir, new_filename_dir)
    return new_filename

def secure_filename(filename):

    if isinstance(filename, str):
        from unicodedata import normalize

        #filename = normalize("NFKD", filename)#.encode("ascii", "ignore").decode("ascii")
    for sep in os.path.sep, os.path.altsep:
        if sep:
            filename = filename.replace(sep, " ")
    filename = str(objects._filename_ascii_strip_re.sub("", filename)).strip(
        "._"
    ).strip()

    # on nt a couple of special files are present in each folder.  We
    # have to ensure that the target file is not such a filename.  In
    # this case we prepend an underline
    if (
        os.name == "nt"
        and filename
        and filename.split(".")[0].upper() in objects._windows_device_files
    ):
        filename = f"_{filename}"

    return filename

def find_or_create_corpus(name):
    corpora_dir = os.path.join(objects.root_path, "corpora")
    name = secure_filename(name)
    name_dir = os.path.join(objects.root_path, "corpora", name)
    for item in os.listdir(corpora_dir):
        if item.lower() == name.lower():
            return item
    os.mkdir(name_dir)
    return name

def delete_corpus(name):
    shutil.rmtree(os.path.join(objects.root_path, "corpora", name))

def rename_corpus(name, new_name):
    new_name = secure_filename(new_name)
    corpora_dir = os.path.join(objects.root_path, 'corpora')
    name_dir = os.path.join(objects.root_path, 'corpora', name)
    new_name_dir = os.path.join(objects.root_path, 'corpora', new_name)
    if not any(x.lower().strip() == new_name.lower().strip() for x in os.listdir(corpora_dir)):
        shutil.move(name_dir, new_name_dir)
        return new_name
    else:
        return False

def delete_file(name, filename):
    os.remove(os.path.join(objects.root_path, "corpora", name, filename))

def update_files(name):
    corpus_dir = os.path.join(objects.root_path, "corpora", name)
    return sorted([x for x in os.listdir(corpus_dir) if x not in objects.tronco_special_files or x == "README"], key=lambda y: y.lower().strip())

def save_file(name, filename, text):
    filename_dir = os.path.join(objects.root_path, "corpora", name, filename)
    with open(filename_dir) as f:
        previous_text = f.read()
    metadata = [x for x in previous_text.splitlines() if x.strip().startswith("# ") and " = " in x]
    with open(filename_dir, "w") as f:
        f.write("\n".join(metadata) + "\n" + text)

def load_file(name, filename):
    filename_dir = os.path.join(objects.root_path, "corpora", name, filename)
    
    if filename.upper().strip() == "README":
        create_new_file(name, filename)
    else:
        if not os.path.isfile(filename_dir):
            return False        

    with open(filename_dir) as f:
        texto = f.read()
    if not '# times_seen = ' in texto:
        texto = "# times_seen = 0\n" + texto
    if not '# last_seen = ' in texto:
        texto = "# last_seen = 0\n" + texto
    if not '# first_seen = ' in texto:
        texto = f"# first_seen = {time.time()}\n" + texto
    times_seen = int(texto.split("# times_seen = ")[1].split("\n")[0].strip())
    last_seen = texto.split('# last_seen = ')[1].split("\n")[0].strip()
    texto = texto.replace(f'# times_seen = {times_seen}', f'# times_seen = {times_seen + 1}')
    texto = texto.replace(f'# last_seen = {last_seen}', f'# last_seen = {time.time()}')
    with open(filename_dir, "w") as f:
        f.write(texto)

    with open(filename_dir) as f:
        text = f.read()
        return {
            "text": "\n".join([x for x in text.splitlines() if not (x.strip().startswith("# ") and " = " in x)]),
            "metadata": {
                y.split(" = ")[0].split("# ")[1]: y.split(" = ", 1)[1] 
                for y in [x for x in text.splitlines() if x.strip().startswith("# ") and " = " in x]
                },
            }

def create_new_file(name, filename, text=""):
    filename = secure_filename(filename)
    filename_dir = os.path.join(objects.root_path, "corpora", name, filename)
    readme_dir = os.path.join(objects.root_path, "corpora", name, "README")
    if not any(x.lower().strip() == filename.lower().strip() for x in os.listdir(os.path.join(objects.root_path, "corpora", name))):
        text = f'''# times_seen = 0
# last_seen = 0
# first_seen = {time.time()}
'''
        if filename not in [objects.tronco_special_files]:
            if os.path.isfile(readme_dir):
                with open(readme_dir) as f:
                    readme = f.read()
                readme_metadata = {
                    y.split(" = ")[0].split("# ")[1]: y.split(" = ", 1)[1] 
                    for y in [x for x in readme.splitlines() if x.strip().startswith("# ") and " = " in x]
                    }
                for metadata in readme_metadata:
                    if metadata not in objects.tronco_metadata:
                        text = '# ' + metadata + " = " + readme_metadata[metadata] + "\n" + text
        with open(filename_dir, "w") as f:
            f.write(text)
        return filename
    else:
        return False

def load_corpora(key="", max_results=20, recent=""):
    corpora_dir = os.path.join(objects.root_path, "corpora")
    if not os.path.isdir(corpora_dir):
        os.mkdir(corpora_dir)
    corpora = {}

    recent_lower = recent.lower().split("|")
    recent = recent.split("|")
    corpora_list = os.listdir(corpora_dir)
    corpora_list_lower = [x.lower() for x in corpora_list]
    
    for recent_corpus in recent:
        if recent_corpus.lower() not in corpora_list_lower:
            recent.remove(recent_corpus)

    for item in corpora_list:
        if item.lower() not in recent_lower:        
            item_dir = os.path.join(objects.root_path, "corpora", item)
            readme_dir = os.path.join(objects.root_path, "corpora", item, "README")
            stats = (0, 0)
            if os.path.isfile(readme_dir):
                with open(readme_dir) as f:
                    README = f.read()
                if all(x in README for x in ["# last_seen = ", "# times_seen = "]):
                    stats = (float(README.split("# last_seen = ")[1].split("\n")[0]), int(README.split("# times_seen = ")[1].split("\n")[0]))

            if os.path.isdir(item_dir):
                corpora[item] = {'files': len([x for x in os.listdir(item_dir) if x not in objects.tronco_special_files]), 'stats': stats}

    return {
        'sorted_list': sorted([{**{'name': x}, **corpora[x]} for x in corpora if not key.strip() or (key.strip() and all(k in x.lower() for k in key.lower().split()))], key=lambda y: -y['stats'][1])[:max_results],
        'new_recent': recent
    }
