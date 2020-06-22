import sys
import time, os

os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'

sys.path.insert(0, "/var/www/Tronco")
import site

site.addsitedir('uvenv/lib/python3.6/site-packages')

from app import app as application