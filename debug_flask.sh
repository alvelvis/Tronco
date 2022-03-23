code .
cd flask
if [ ! -d uvenv ]; then
	virtualenv -p python3 uvenv
	uvenv/bin/pip3 install -r ../requirements.txt
fi
. uvenv/bin/activate
export FLASK_ENV=development
flask run
