+++
title = "First Five (and a Half) Minutes on a Server with a Shell Script"
date = "2014-10-29T20:14:43+07:00"
aliases = [
    "/pages/005-implementing-porter-stemmer-in-haskell.html"
]

+++

About a year ago I wrote [this](/pages/first-five-and-a-half-minutes-on-a-server-with-ansible) about hardening a fresh server using Ansible. This post has received about 10x as much traffic as anything else I've written. Oddly, admin is the area I'm probably least knowledgable about when it comes to software.

Anyway, the Ansible script I wrote about in that post is out of date. I realized this recently after trying to use it on a fresh install. I went about updating it (Ansible has made some breaking changes since then) and came to the realization that it would be faster and easier to just write a shell script.

That's not to say Ansible (and tools like it) don't have their place. They obviously do. But for one-off installs or occasional use the learning curve is too steep. It's much easier to stay current with shell scripting than it is to stay current with a tool that is constantly being changed (improved) and meant for administering very large installations.

```bash
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
```

I've stripped this down a bit from the original version. Logwatch, in particular, seemed more annoying than useful. You may or may not want to install that yourself.

### Danger

A couple of notes about using this:

* This script does two things that when combined can render your instance unusable: It creates a new user and password and disallows ssh from logging in as root. If something goes wrong with the creation of the new user you'll be locked out and / or won't be able to make any root-level changes.
* Also in the potentially unusable category: This script overwrites your /etc/sudoers file. If anything goes wrong here you'll probably have to start over from scratch.
* The script isn't idempotent. For all practical purposes, the individual actions are idempotent, but you should be aware of that.

In other words, only run this on a fresh install and be prepared to have to start over from scratch if anything goes wrong.

### Simple, Fast

The upside to using this is it's easy to change with only basic shell scripting knowledge and it's faster than Ansible to run. Much faster actually. Having said that, Ansible may have made improvements in speed since I used it last.

To actually run it, just run the following commands:

```bash
curl https://gist.githubusercontent.com/lattejed/5047d9f85896b8946c7d/raw/e3534c6ac5248ad7bc711c053fec45c22441c87a/gistfile1.sh > secure_ubuntu_10.04_x64.sh
scp secure_ubuntu_10.04_x64.sh root@<ip_address or host>:/root/
ssh root@<ip_address or host> chmod +x secure_ubuntu_10.04_x64.sh
ssh root@<ip_address or host> ./secure_ubuntu_10.04_x64.sh
```

