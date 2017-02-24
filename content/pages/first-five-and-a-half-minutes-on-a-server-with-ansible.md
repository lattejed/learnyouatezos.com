+++
title = "First Five (and a Half) Minutes on a Server with Ansible"
date = "2013-09-03T20:14:43+07:00"
aliases = [
    "001-first-five-and-a-half-minutes-on-a-server-with-ansible.html"
]

+++

**Note: The Ansible script below is unusable due to breaking changes. I've written about a similar approach [here](/pages/first-five-and-a-half-minutes-on-a-server-with-a-shell-script) using a simple shell script**

This is a response/addendum to two really good "first five minutes" style posts discussing the setting up and basic hardening of a remote server. Brian Kennedy discusses his first five minutes here<sup>1</sup> on Ubuntu. It's a great tutorial covering the basics of security. Of course, if you've gone through it once you'll want to automate it. There is also a post on automating the process<sup>2</sup> (actually using the steps described in Brian's post) with Ansible. The latter was either not tested or only worked on earlier version of Ubuntu/Ansible. I'll cover an updated version here that works with the most recent version of Ansible and Ubuntu 13.04 x64 and includes some helpful additions.

So, starting from a virgin install of Ubuntu server we're going to want to perform the following steps:

1. Update & upgrade the system via apt-get
2. Install vim & mosh (personal preferences)
3. Install fail2ban to block ssh brute-force attempts
4. Reset our root password to something strong
5. Create a new user so we don't have to use root
6. Copy over our pub key
7. Lock down sudo
8. Lock down ssh to prevent root & password login
9. Setup the ufw firewall
10. Configure unattended security upgrades
11. Configure logwatch to email daily server logs

Even if you can do all of that in five minutes, this is obviously complicated enough that we want an automation tool to handle it. After reviewing popular automation tools like Chef and Puppet, I decided to go with the slightly lesser known and arguably simpler Ansible. Ansible is simpler because it doesn't require any server side installs to work. All Ansible commands are run via ssh from your computer and only need a password or private key to run. Ansible commands are organized in "playbooks" and Ansible has a extensive set of modules that simplify common tasks.

Installing Ansible is easy (here for OS X 10.8.x):

```bash
git clone git://github.com/ansible/ansible.git
cd ./ansible
sudo make install

sudo easy_install jinja2
sudo easy_install pyyaml
sudo easy_install paramiko

source ./hacking/env-setup

ssh-agent bash
ssh-add ~/.ssh/id_rsa
```

This assumes the following: You're running OS X with Python installed and you've already setup a public/private keypair on your machine. This also assumes that you've pre-installed your public key on the server. I'm using DigitalOcean which allows you to setup your public key ahead of time. If memory serves AWS does as well. If not, you'll have to check the Ansible docs on passing a password to the server when you run the playbook.

Now let's make sure Ansible is working properly:

```bash
echo "" > host.ini
ansible all -i host.ini -m ping -u root
# x.x.x.x | success >> {
#    "changed": false,
#    "ping": "pong"
# }
```

You should get a "pong" as a result. If not, check the Ansible docs for installation and configuration.

Now that we're setup, we need to create a playbook to run the steps outlined above. I'll give it here in its entirety and then go over some of the more important bits:

```yaml
---
- hosts: newservers
  vars:
  - ubuntu_release: raring
  - logwatch_email: 
    # crypted passwords, generated on a Linux box using: 
    # echo 'import crypt,getpass; print crypt.crypt(getpass.getpass(), "$6$YOURSALT")' | python -
  - root_password: ''
  - deploy_password: ''


  tasks:
  - name: Change root password
    action: user name=root password=$root_password

  - name: Update APT package cache
    action: apt update_cache=yes

  - name: Upgrade APT to the lastest packages
    action: apt upgrade=safe

  - name: Install mosh
    action: apt pkg=mosh state=installed

  - name: Install vim
    action: apt pkg=vim state=installed

  - name: Install fail2ban
    action: apt pkg=fail2ban state=installed

  - name: Add deployment user
    action: user name=deploy password=$deploy_password

  - name: Add authorized deploy key
    action: authorized_key user=deploy key='$FILE(id_rsa.pub)'

 - name: Remove sudo group rights
    action: lineinfile dest=/etc/sudoers regexp="^%sudo" state=absent

  - name: Add deploy user to sudoers
    action: lineinfile dest=/etc/sudoers regexp="deploy ALL" line="deploy ALL=(ALL) ALL" state=present

  - name: Disallow password authentication
    action: lineinfile dest=/etc/ssh/sshd_config regexp="^PasswordAuthentication" line="PasswordAuthentication no" state=present
    notify: Restart ssh

  - name: Install unattended-upgrades
    action: apt pkg=unattended-upgrades state=present

  - name: Adjust APT update intervals
    action: copy src=config/apt_periodic dest=/etc/apt/apt.conf.d/10periodic

  - name: Make sure unattended-upgrades only installs from $ubuntu_release-security
    action: lineinfile dest=/etc/apt/apt.conf.d/50unattended-upgrades regexp="$ubuntu_release-updates" state=absent

  - name: Copy debconf selections so that Postfix can configure itself non-interactively
    copy: src=config/postfix_selections  dest=/tmp/postfix_selections

  - name: Set up Postfix to relay mail
    action: command debconf-set-selections /tmp/postfix_selections

  - name: Install logwatch
    action: apt pkg=logwatch state=installed

  - name: Make logwatch mail $logwatch_email daily
    action: lineinfile dest=/etc/cron.daily/00logwatch regexp="^/usr/sbin/logwatch" line="/usr/sbin/logwatch --output mail --mailto $logwatch_email --detail high" state=present create=yes

  - name: Setup ufw
    action: shell ufw allow 22/tcp

  - name: Setup ufw
    action: shell ufw allow 443/tcp

  - name: Setup ufw
    action: shell ufw allow 60023/udp

  - name: Enable ufw
    action: shell echo 'y' | ufw enable

  - name: Disallow root SSH access
    action: lineinfile dest=/etc/ssh/sshd_config regexp="^PermitRootLogin" line="PermitRootLogin no" state=present
    notify: Restart ssh

  handlers:
  - name: Restart ssh
    action: service name=ssh state=restarted:
```

As you can see an Ansible playbook is a simple yaml file with commands. Most commands reference modules (as in `action: apt <command>` for the apt package manager) and you can run vanilla shell commands with the "shell" module. The first order of business in our playbook is to reset our root password to something secure. I'm doing this because DigitalOcean creates a random password and emails it. If you've created your root password by some other (secure) means you can skip changing the root password and just do the new user.

Ansible takes a hashed password to improve security. The hashing can be done on a Linux box using the supplied Python command (in the comments). The command takes your password (via the terminal) and a config/salt string of the format `<algo number><your salt>` and returns a string of the format `<algo number><your salt><your hashed password>`. In this case we're using the algo number 6 which corresponds on Linux machines to SHA-512. Nota bene: The algo number 6 on OS X does not correspond to SHA-512 and therefore will produce an incompatible hash. I usually generate the password in my newly installed server by logging in via ssh and running the command.

After we change our root password we update and upgrade with apt-get and then install some packages. I added the installation of Vim and Mosh to the original playbook. This would be a good place to change/add any software you want on the server.

### Mosh

If you're not familiar with Mosh<sup>3</sup> already it stands for mobile shell and is an alternative/enhancement to ssh for working on a server remotely. I've only used it for a little while but it's infinitely nicer than using ssh, especially on high latency connections. Mosh supports local echo for a lot of terminal work and has a nice catch-up animation to show what's happening remotely. It also supports interrupted connections. That means you can work on a dodgy connection or sleep your computer and pick up where you left off. Highly recommended.

### Running the Playbook

Now that we've sorted out our hashed password, we can go ahead and run our playbook. To run the playbook, use the following command:

```bash
ansible-playbook -i hosts.ini bootstrap.yml --user root
```

You'll notice that the last command will disallow root access. If you don't do it last and something fails, you'll need to run the script again, except with a different user. It's much easier to allow root until everything else has completed successfully.

<sup>1</sup> http://plusbryan.com/my-first-5-minutes-on-a-server-or-essential-security-for-linux-servers

<sup>2</sup> http://practicalops.com/my-first-5-minutes-on-a-server.html

<sup>3</sup> http://mosh.mit.edu/

