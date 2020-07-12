ubuntu run flask/uvenv/bin/pip3 freeze > requirements_untouched.txt
ubuntu run sed '/pkg-resources==0.0.0/d' requirements_untouched.txt > requirements.txt
ubuntu run rm requirements_untouched.txt
cd flask
rmdir /s /q dist
IF NOT EXIST wvenv (
  virtualenv wvenv
  wvenv\Scripts\pip3.exe install -r ../requirements.txt
)
pyinstaller wtronco.spec
ubuntu run /home/elvis/.local/bin/pyinstaller utronco.spec; cd dist; zip -r ../../Tronco-Ubuntu.zip Tronco-Ubuntu; zip -r ../../Tronco-Windows.zip Tronco-Windows
cd ..
"C:\Program Files (x86)\Inno Setup 6\Compil32.exe" /cc Tronco-Windows.iss
move Output\Tronco-Windows.exe Tronco-Windows.exe
ubuntu run gcloud compute scp Tronco-Windows.exe Tronco-Windows.zip Tronco-Ubuntu.zip Tronco-Android-PWA.apk tronco:/var/www/Tronco/flask/static
ubuntu run sh update_tronco.sh
rem change latest_release? change objects tronco_version? git add commit push?
pause
