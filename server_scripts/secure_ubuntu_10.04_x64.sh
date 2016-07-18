#!/bin/bash

# Note: This is for the Ubunutu 10.04 x64 image available on Digital Ocean
# and may not work for other images / OS versions.

# Warning: This script directy edits some configuration files that may
# render your OS unusable if there is an error. Use at your own risk.

useradd deploy
mkdir /home/deploy
mkdir /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chsh -s /bin/bash deploy
cp .bashrc .profile /home/deploy

cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chmod 400 /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy -R

echo "Set password for user deploy"
passwd deploy

apt-get update
apt-get upgrade -y
apt-get install fail2ban mosh ufw vim unattended-upgrades -y

cat << EOF > ~/.vimrc 
set tabstop=4
set shiftwidth=4
set expandtab
set smarttab
set autoindent
set textwidth=79
set background=light
filetype plugin indent on
syntax on
EOF

cat << EOF > /etc/sudoers
Defaults        env_reset
Defaults        mail_badpass
Defaults        secure_path="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

root    ALL=(ALL:ALL) ALL
deploy  ALL=(ALL:ALL) ALL
EOF

cat << EOF > /etc/ssh/sshd_config
Port 22
Protocol 2
HostKey /etc/ssh/ssh_host_rsa_key
HostKey /etc/ssh/ssh_host_dsa_key
HostKey /etc/ssh/ssh_host_ecdsa_key
HostKey /etc/ssh/ssh_host_ed25519_key
UsePrivilegeSeparation yes
KeyRegenerationInterval 3600
ServerKeyBits 1024
SyslogFacility AUTH
LogLevel INFO
LoginGraceTime 120
PermitRootLogin no
StrictModes yes
RSAAuthentication yes
PubkeyAuthentication yes
IgnoreRhosts yes
RhostsRSAAuthentication no
HostbasedAuthentication no
PermitEmptyPasswords no
ChallengeResponseAuthentication no
PasswordAuthentication no
X11Forwarding yes
X11DisplayOffset 10
PrintMotd no
PrintLastLog yes
TCPKeepAlive yes
AcceptEnv LANG LC_*
Subsystem sftp /usr/lib/openssh/sftp-server
UsePAM yes
EOF

service ssh restart

ufw allow 22
ufw allow 80
ufw allow 443
ufw allow 60000:61000/udp
ufw --force enable

cat << EOF > /etc/apt/apt.conf.d/10periodic
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF

cat << EOF > /etc/apt/apt.conf.d/50unattended-upgrades 
Unattended-Upgrade::Allowed-Origins {
    "Ubuntu lucid-security";
};
EOF

