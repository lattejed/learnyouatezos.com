---
template: page
title: Appendix
---

## Ubuntu Locale Fix

```bash
sudo locale-gen "en_US.UTF-8"
echo -e '\nexport LANG="en_US.UTF-8"\nexport LC_ALL="en_US.UTF-8"' >> ~/.bashrc
source ~/.bashrc
```

If you prefer another default locale, substitute it for en_US.

Even if your locale is configured correctly, your terminal may attempt to set environment variables and corrupt the locale settings in the process. This seems to be particularly be an issue when connecting via ssh from macOS.

Explicitly setting the default locale in `.profile` should fix this.

## Host Key Verification Failed

If you have an issue while provisioning a VM, you make run into an issue where your ssh 'knowns_hosts' file has a bad entry. To remove without having to edit the file manually, run:

```bash
ssh-keygen -R <ip address or host>
```
