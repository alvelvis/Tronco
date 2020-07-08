sed -r 's/(.*)(\?version=)([0-9]+)(.*)/echo "\1\2$((\3+1))\4"/ge' ../flask/templates/dashboard.html
sed -r 's/(.*)(\?version=)([0-9]+)(.*)/echo "\1\2$((\3+1))\4"/ge' ../flask/templates/index.html
git add -u; git commit -m "update"; git push
gcloud compute ssh tronco -- "cd /var/www/Tronco && sudo git pull && sudo service apache2 restart"
