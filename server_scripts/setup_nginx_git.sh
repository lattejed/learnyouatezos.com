#!/bin/bash

# Update & install missing packages

sudo apt-get update
sudo apt-get install git nginx -y

# Get site name

if [ -z "$SITE" ]; then
    read -p "Enter site name: " SITE
fi

# Create a git repo that can be pushed to

mkdir $SITE.git
cd $SITE.git
git --bare init

# Create a post-receive hook for deployment

cat << EOF > hooks/post-receive

GIT_WORK_TREE=/home/deploy/$SITE git checkout -f
sudo nginx restart
EOF

chmod +x hooks/post-receive
cd -

# Create site directory and repo

mkdir $SITE
cd $SITE
git init
cd -

sudo chmod -R 755 $SITE

cat << EOF > $SITE.nginx 
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /home/deploy/$SITE;
    index index.html index.htm index.nginx-debian.html;

    server_name $SITE www.$SITE;

    location / {
        try_files $uri $uri/ =404;
    }
}
EOF

sudo ln -s $SITE.nginx /etc/nginx/sites-enabled/
sudo nginx restart

