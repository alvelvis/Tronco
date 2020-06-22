del Tronco-Ubuntu.zip
del Tronco-Windows.zip
del Tronco-Windows.exe
cd ..
ubuntu run flask/uvenv/bin/pip3 freeze > requirements_untouched.txt
ubuntu run sed '/pkg-resources==0.0.0/d' requirements_untouched.txt > requirements.txt
ubuntu run rm requirements_untouched.txt
cd flask
ubuntu run rm -r dist; rm -r wvenv
virtualenv wvenv
wvenv\Scripts\pip3.exe install -r ../requirements.txt
pyinstaller wtronco.spec
ubuntu run /home/elvis/.local/bin/pyinstaller utronco.spec; cd dist; zip -r ../../dist/Tronco-Ubuntu.zip Tronco-Ubuntu; zip -r ../../dist/Tronco-Windows.zip Tronco-Windows
cd ../dist
"C:\Program Files (x86)\Inno Setup 6\Compil32.exe" /cc Tronco-Windows.iss
move Output\Tronco-Windows.exe Tronco-Windows.exe
rem missing: apk
rem change latest_release? change objects tronco_version? git add commit push?
pause
