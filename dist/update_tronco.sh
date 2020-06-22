git add -u; git commit -m "update"; git push
gcloud compute ssh tronco -- "cd /var/www/Tronco && sudo git pull"
