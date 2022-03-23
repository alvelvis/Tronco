import sys, time, os
if os.path.isdir("/var/www/Tronco"):
	activate_this = '/var/www/Tronco/flask/uvenv/bin/activate_this.py'
	with open(activate_this) as file_:
	    exec(file_.read(), dict(__file__=activate_this))

os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'

sys.path.insert(0, "/var/www/Tronco/flask")

from app import app as application
