
https://docs.microsoft.com/en-us/azure/key-vault/quick-create-cli
https://docs.microsoft.com/en-us/cli/azure/keyvault?view=azure-cli-latest
https://medium.com/tezos-capital/introducing-the-new-tezos-tz2-staking-wallet-4c9573fe9dcb
https://gitlab.com/polychainlabs/key-encoder/blob/master/encoder/tezos.go
http://www.ocamlpro.com/2018/11/21/an-introduction-to-tezos-rpcs-signing-operations/
https://github.com/bitcoinjs/tiny-secp256k1
https://github.com/ludios/node-blake2
https://github.com/bitcoinjs/bs58check

https://github.com/Azure/azure-sdk-for-node/issues/4603


https://github.com/bitcoin/bips/blob/master/bip-0062.mediawiki#Low_S_values_in_signatures



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
