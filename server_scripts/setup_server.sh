#!/bin/bash

read -p "Enter IP address: " IP
ssh-keygen -R $IP
scp secure_ubuntu_10.04_x64.sh root@$IP:/root/
ssh root@$IP chmod +x secure_ubuntu_10.04_x64.sh
ssh root@$IP ./secure_ubuntu_10.04_x64.sh
mosh deploy@$IP

