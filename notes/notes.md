### Bootable live USB

DOES NOT WORK ON NEWER VERSIONS OF MACOS

Ubuntu recommends:

https://www.balena.io/etcher/

Source is here: 

https://github.com/balena-io/etcher

You'll get a message asking you to initialize or ignore the disk. Ignore it.


Security settings do not allow this Mac to use an external startup disk 

Reboot in recovery mode (Command-R)

Startup Security Utility

Enter password 

Secure Boot > No Security

External Boot > Allow booting from external media 

NOTE: If you're using a very recent Mac, you may have to plug in an external keyboard and mouse.

```
diskutil list
```
> /dev/disk2 (external, physical) 

Pull the drive out. Ensure that it's *missing* this time.

```
diskutil list
```
If so, that's your USB drive. 

```
diskutil unmountDisk /dev/disk2
```

> Unmount of all volumes on disk2 was successful

```
cd ~/Downloads #Or wherever you keep ISOs
sudo dd if=ubuntu-18.04.2-server-amd64.iso of=/dev/disk2 bs=1m
```

WAIT. Nothing will happen for a while a number of minutes.

WARNING: Using `sudo dd` is a destructive command. Make sure you double check the location of your USB drive as described below. Also make sure you've backed up the contents of the USB drive if they're important to you.
