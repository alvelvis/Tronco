import re

htmls = ["flask/templates/dashboard.html", "flask/templates/index.html"]
files = {}

for html in htmls:
    with open(html) as f:
        files[html] = f.read()

versions = [int(x) for x in re.findall(r"\?version=(\d+)", "\n".join(files.values()))]

update = lambda x, y: x.replace("?version={}'".format(y), "?version={}'".format(y+1)).replace('?version={}"'.format(y), '?version={}"'.format(y+1))

for html in htmls:
    for version in versions:
        files[html] = update(files[html], version)
    with open(html, "w") as f:
        f.write(files[html])