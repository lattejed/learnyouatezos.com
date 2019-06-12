---
template: page
title: "Baking: Remote Signer"
---

##Remote signers

<highlight>[TODO: Tie this into previous discussion of security and baker topology]</highlight>

###Why an HSM?

While baking is relatively straightforward, *key security* is not and necessitates an approach that usually means separating private keys from a baker, preferably residing in a hardware security module (HSM).

An HSM's primary security feature is that signing (and other cryptographic) operations take place on a dedicated hardward chip that contains your private key and handles operations *without your private key leaving the device.* The key material is not exposed to the attached computer, meaning a compromise of that computer does not leak your private key.

Low cost, consumer-grade HSMs are common in the cryptocurrency world, with Ledger Nano being probably the most common. While Tezos signing (and wallet) software is avaiable for the Ledger, it requies a physical USB connection to a computer, requiring either the signing computer or the entire baking node reside in your home or office.

While this can be simple and low-cost, it does require an always-avaiable internet connection, the ability to open ports to the public network and an uninterruptible power supply. In practice it's not easy to achieve high availability with this setup. Lots of things can go wrong, especially when the setup is unattended (e.g., you're on holiday).

A cloud signer with an attached HSM is a solution to this problem, but dedicated HSMs are expensive to operate, really out of the range of any but the largest baking operations. 

However, Google Cloud KMS and Azure Key Vault <highlight>TODO: Check names</highlight> have started to offer per-use pricing that makes HSM-backed signing operations very inexpensive, making them affordable for even very small bakers.

###Why Azure?

As both Google and Microsoft's offerings are compaible with Tezos, the main consideration is whether or not private keys can be backed up. Azure allows for it and Google does not.

It is *strongly not recommended* to use a cloud HSM service that does not allow for backing up of private keys. Ask yourself these questions:

1. Do you trust this company to *never*, under any circumstances, lose your private key?
2. Do you trust this company to never lock your account for any reason?

The answer to both of those has to be no.

<note>
To be precise, Azure does not allow you to back up your HSM-generated keys. The backup functionaly it has will only allow you to move your key within the same availability region. However, they do allow you to generate your own keys and import them. 
</note>

###Baker VM + signer VM + HSM

This setup calls for a separate baker and signer VM. It is possible run the signing service on the same VM as the baker, so why not do that? 

1. An attacker who could gain access to your baker could sign any operation, including moving all of your Tezos to another address
2. Your baker *may* be known to the rest of the network, increasing the chances it is targeted for attack
3. Running a separate signer allows you to whitelist baking and endorsing operations and require intervention for other operations (transfers, voting, etc.)
4. A separate signer requires that *two* VMs are compromised before signing operations could be done by a rogue actor

Since your signer will only be known to your baker, the baker itself would have to be accessed to discover the IP address. After that, your signer VM would also have to be compromised. 

To help offset this, the signing software dicussed here is very lightweight and can be run on the cheapest available VM.

##Getting started with Azure

###Get an Azure account

If you don't already have one, go here [https://azure.microsoft.com/en-us/free](https://azure.microsoft.com/en-us/free) to get a new Azure account.

You'll likely have to go through a privacy-violating ID verificaiton with a phone number *and* credit card, but given that you'll be supplying them with billing information anyway, it's a moot point.

[TODO: Add 2FA setup]

###Install Azure CLI

It's recommended that you install the CLI on your local machine or on a local VM. It is *not recommended* to install the cli on the remote signer you'll provision nor your baker's VM. We'll be authenticating the CLI and having those credentails on a remote machine can be a security issue. 

<note>
VMs on a compromised machine *do not* protect you against keyloggers and other forms of malicious monitoring, though they offer some protection in the other direction (e.g., it's safter to browse malicious websites on a VM). If you are unsure of your local computer's security, you may want to do a clean install of your OS before continuing.
</note>


```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

You may want to download the script and review it before running it. Alternately, you can install manually as outlined here: [https://docs.microsoft.com/en-us/cli/azure/install-azure-cli-apt?view=azure-cli-latest](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli-apt?view=azure-cli-latest).

Note: if you see errors or warnings about default locale go to [learnyouatezos.com/appendix.html#ubuntu-locale-fix](/appendix.html#ubuntu-locale-fix) to find a fix.

Check the version of `az` and ensure it has some meaningful output and you don't get any errors:

```bash
az --version
```

###Authenticate and determine region

Now, login:

```bash
az login
```

You should get a response that looks like:

```plaintext
To sign in, use a web browser to open the page https://microsoft.com/devicelogin and enter the code XXXXXXXXX to authenticate.
```

Open that page, copy and paste the code and select the account you want to use. Wait a moment and you should get some json as a response to `az login`:

```json
[
  {
    "cloudName": "AzureCloud",
    ...
  }
]
```

Before you get started with the cli, decide what region to set up your signer in. You'll want to set up as close to your baker as possible.

A list of regions supporting Key Vault is here [https://azure.microsoft.com/en-us/global-infrastructure/services/?products=key-vault](https://azure.microsoft.com/en-us/global-infrastructure/services/?products=key-vault), but this list does not contain the identifiers that the cli expects.

To find these, run the following command:

```bash
az account list-locations | grep -A 5 "Southeast Asia"
```

Replace "Southeast Asia" with the region you prefer from the previous list. You should get a response like:

```bash
"displayName": "Southeast Asia",
"id": "/subscriptions/<UUID>/locations/southeastasia",
"latitude": "1.283",
"longitude": "103.833",
"name": "southeastasia",
"subscriptionId": null
```

In this case the identifier is the name field `southeastasia`. Copy that down as you'll need it for the next step.

###Create a resource group

Create a resource group, giving it the name of your choice and using the location we've just determined.

```bash
az group create \
	--name "TezosSigner-ResourceGroup" \
	--location southeastasia
```

You should get a response that looks like this:

```bash
{
  "id": "/subscriptions/<UUID>/resourceGroups/TezosSigner-ResourceGroup",
  "location": "southeastasia",
  "managedBy": null,
  "name": "TezosSigner-ResourceGroup",
  "properties": {
    "provisioningState": "Succeeded"
  },
  "tags": null,
  "type": null
}
```

If you need to delete the resource group, you can use the command:

<warning>
This will delete *everything* inside the resource group. Only use this command when trying things out.
</warning>

```bash
az group delete \
	--name "TezosSigner-ResourceGroup" \
	--yes
```

##Setting up a VM

###Create a virtual machine

Next let's create the VM we'll be running out signer in. We use the `az vm create` command for this.

```bash
az vm create \
	--name "TezosSigner-VM" \
	--resource-group "TezosSigner-ResourceGroup" \
	--image Canonical:UbuntuServer:18.04-LTS:latest \
	--size Standard_B1ls \
	--storage-sku Standard_LRS \
	--admin-username deploy \
	--authentication-type ssh \
	--nsg-rule ssh \
	--ssh-key-values ~/.ssh/id_rsa.pub \
	--assign-identity
```

You should get output that looks like this:

```bash
{
  ...
  "powerState": "VM running",
  "privateIpAddress": <Private IP Address>,
  "publicIpAddress": <Public IP Address>,
  ...
}
```

You'll want to record your public IP address for future reference.

Test that you can log into your VM:

```bash
ssh deploy@<Public IP Address>
```

You should have logged in successfully.

###Secure Virtual Machine

Become root user:

```bash
sudo -i
```

Download and run this script to further secure your VM:

```bash
curl -sO https://gist.githubusercontent.com/lattejed/94488cb5d0004af16c0c99b1c92fbdb6/raw/ubuntu_basic_setup_az.sh && bash ubuntu_basic_setup_az.sh
```

Feel free to download it first and review it. It does the following:

1. Sets a password for your `deploy` user
2. Makes your sudoers file more secure
3. Upgrades all installed packages 
4. Installs fail2ban to block machines attacking your ssh port
5. Enables unattended security upgrades
6. Makes your ssh settings more secure 

Exit the root user account:

```bash
exit
```

If you need to delete the VM while testing, use the following command:

```bash
az vm delete \
	--name "TezosSigner-VM" \
	--resource-group "TezosSigner-ResourceGroup" \
	--yes
```

##Generating private keys

<warning>
Key security is a very big topic. The guidelines here offer one possible way to securely create and backup keys. They are not bulletproof and only represent an acceptable level of security for the author, for the author's own needs. It is strongly recommended that you research best practices on your own. If your private keys are controlling non-trivial amounts of Tezos, you should consider hiring a security consultant.
</warning>

To generate and back up keys securely, we're going to use the following procedure:

1. Download and create a fresh installation of Ubuntu 18.04 on a USB drive
2. Run that on an air-gapped computer
3. Create strong passphrases using `openssl` to encrypt our keys
4. Create our keys using `openssl`
5. Back up our keys and passphrases in separate locations
5. Delete our UBS key

This procedure is not flawless, but it is what the author considers acceptable and uses for his own keys. 

###Download Ubuntu 18.04

We're going to first download Ubuntun 18.04 *desktop* edition. It has to be the desktop edeition in order to run it as a live CD (UBS). 

<note>
If you do have a CD burner creating an actual live CD offers better sercurity, providedd it is a write-once CD. Since CD burners are less common these days, the instructions here are for a UBS drive.
</node>

Search for "Ubuntu download". A link is not provided here as that opens up an avenue for attack. Ensure that the link you follow is on `https://ubunutu.com` and that your browser indicates that it is a secure connection. The actual download should be labeled "Ubuntu 18.04.2 LTS". 

On that page should be instructions for verifying the download once it is complete. It will look something like:

On Linux:

```bash
echo "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX *ubuntu-18.04.2-desktop-amd64.iso" | sha256sum --check
```

<note>
If your local machine doesn't have `sha256sum` installed, you can use `shasum` in its place. The latter should be available on many Linux distros and macOS.
</note>

Make sure you get a result like:

```bash
ubuntu-18.04.2-desktop-amd64.iso: OK
```

###Creating a USB drive 

You'll need a USB drive that will fit the ISO you downloaded. Plug that into your computer and run the following command:

```bash
diskutil list
```

You'll get a lot of output, look for something like:

```bash
/dev/disk2 (external, physical) 
```

Pull the drive out. Ensure that it's *missing* this time:

```
diskutil list
```

If it's missing, that's your USB drive.

Now ensure that it is unmounted:

```
diskutil unmountDisk /dev/disk2
```

Then write the ISO to the drive:

```
sudo dd if=~/<path>/ubuntu-18.04.2-desktop-amd64.iso of=/dev/disk2 bs=1m
```

This will take a while. Eventually the command will exit and your drive will be usable.

<warning>
Using `sudo dd` is a destructive command. Make sure you double check the location of your USB drive as described above. Also make sure you've backed up the contents of the USB drive if they're important to you.
</warning>

###Run on an air-gapped machine

What is an air-gapped machine? That means our machine does not have the ability to connect to the internet or other networks. In this case, it should be sufficient to do two things:

1. Unplug any LAN or other networking cables
2. *Do not* connect wifi after booting from the USB drive

After booting up, you should open a web browser and ensure the internet is *not* accessible.

<note>
If you're using Mac hardware, you may need to plug in a wired keyboard and mouse as Ubuntu does not support all Mac hardware.
</note>

<note>
If you're using a new Mac with a T2 security chip, you may have to disable Secure Boot in order to boot from a USB drive. More information can be found <highlight>TODO:</highlight>
</nope>

Plug it in and boot it up!

###Generating a passphrase

We're going to use `openssl` to generate a passphrase that we'll use to encrypt our private key. 

```bash
openssl rand -base64 16
> 59oER7LlKbJfNgmsPljYwg== # EXAMPLE DO NOT USE
```

Creating a passphrase 16 bytes long will give us 128 bits of entropy, which should be impossible to brute force if your private keys are ever stolen. 

<warning>
*Do not* use a normal password to encrypt your private key. Using a normal password opens your key up to brute force decryption. Using 16 random *bytes* is not the same as using a password that is 16 characters long.
</warning>

Carefull copy your passphrase to a piece of paper that you can store securely. 

<warning>
*Do not* take a photograph of your passphrase or store it in a password manager. These open up more avenues of attack than storing a physical copy.
</warning>

Consider writing this on paper with e.g., the following format:

```
59oER7LlKbJfNgmsPljYwg== # EXAMPLE DO NOT USE
NNLUUNULULULULLLULLULL
```

Where `N = number`, `L = lowercase` and `U = uppercase`. This will prevent confusing `0` with `O` or `5` with `S` when reading it back.

<note>
Base 58 encoding helps eliminate this ambiguity but there is no base 58 software installed on Ubuntu by default.
</note>

###Generating your key

You'll need to decide if you want to generate a `tz2` or `tz3` address for your baking operation. There is currently no practial difference between the two and Azure has support for both. Azure does not support `tz1` addresses.

To generate a `tz2` address:

```bash
openssl ecparam -genkey -name secp256k1 | openssl ec -aes256 -out secp256k1_sk.pem
```

To generate a `tz3` address:

```bash
openssl ecparam -genkey -name prime256v1 | openssl ec -aes256 -out prime256v1_sk.pem
```

You'll be prompted to enter your passphrase that was generated in the previous step.

###Testing your passphrase

Before you use your copy your key to a USB drive, you should test that your passphrase was recorded correctly. 

```bash
openssl ec -check -noout -in <keyname>.pem
```

After entering your passphrase, the response should be:

```bash
EC Key valid.
```

If it is not, start over from the beginning.

###Securing your key

It's strongly recommended that you back up your key redundantly (e.g., mutliple USB drives in multiple secure locations). Your passphrase should also be backed up in a separate secure location.

<warning>
If you lose your key *or* your passphrase the associated `tz` address can *never be* recovered. If you have any XTZ in that address, it will be lost forever. It is not possible, by design, to recover a passphrase or a key using any method.
</warning>

<warning>
If someone were to find your key and passphrase, they would have full access to the associated `tz` address. 
</warning>

###Clean up

You should delete the contents of the USB drive containing Ubuntu.

```bash
sudo dd if=/dev/urandom of=/dev/disk2 bs=10M
```

Again, *double check* that this is the correct drive using the procedure above. This is a destructive procedure.

This operation will take a long time, depending on the size of your device.

##Azure key import

Now that we've securely generated our key and passphrase, we can import our key into the Azure Key Vault. This is also a highly sensitive procedure.







```bash
az account show
{
  ...
  "id": "600cbff5-ab52-43ca-9dd6-0a3bd4401169",
  ...
}
```

```
npm audit
```

```
                       === npm audit security report ===

found 0 vulnerabilities
 in 1098 scanned packages
```

```
npm shrinkwrap
```

```
npm notice package-lock.json has been renamed to npm-shrinkwrap.json. npm-shrinkwrap.json will be used for future installations.
```



You'll first need to create a resource group:

```bash
az group create --name "KeyVaultTest-ResourceGroup" --location southeastasia
```

In the response ensure you see our new group with the property `provisioningState: Succeeded`. 

Now, create a Key Vault:

```bash
az keyvault create \
	--name "KeyVaultTest-KeyVault" \
	--resource-group "KeyVaultTest-ResourceGroup" \
	--location southeastasia \
	--sku premium
```

<note>
`--sku premium` is mandatory as that will allow for HSM operations.
</node>

You'll get a lot of output, but you'll want to record the `vaultUri` property, which should look something like: `https://<...>.vault.azure.net/`.  

`EC-HSM` and `P-256K` should create a `tz2` key.


```bash
az keyvault key create \
	--name KeyVaultTest-SignerKey2 \
	--vault-name KeyVaultTest-KeyVault \
	--curve P-256K \
	--kty EC-HSM \
	--ops sign \
	--protection hsm
```

```bash
openssl rand -base64 16 // 128 bits of entropy
> 59oER7LlKbJfNgmsPljYwg== # EXAMPLE DO NOT USE
```

Consider writing this on paper with the following format:

```
59oER7LlKbJfNgmsPljYwg== # EXAMPLE DO NOT USE
NNLUUNULULULULLLULLULL
```

Where `N = number`, `L = lowercase` and `U = uppercase`. This will prevent confusing `0` with `O` or `5` with `S` when reading it back.

Base 58 encoding helps eliminate this ambiguity but there is no base 58 software installed on Ubuntu by default.


```bash
az keyvault key import \
	--name KeyVaultTest-SignerKeyED25519 \
	--vault-name KeyVaultTest-KeyVault \
	--ops sign \
	--pem-file ed25519 \
	--protection hsm;
```

```bash
read -sp "Passphrase: " PASS; echo; \
az keyvault key import \
	--name KeyVaultTest-SignerKeyP256 \
	--vault-name KeyVaultTest-KeyVault \
	--ops sign \
	--pem-file prime256v1_sk.pem \
	--pem-password "$PASS" \
	--protection hsm; \
unset PASS
```

List keys:

```bash
az keyvault key list --vault-name KeyVaultTest-KeyVault
```

Show key:

```bash
az keyvault key show --vault-name KeyVaultTest-KeyVault --name KeyVaultTest-SignerKey
```


```bash
tezos-client import secret key temp http://52.187.116.146:5001/tz3XTrPiQaqJW33BcRXpBBLXURPwqNiNw1no --force

tezos-client list known addresses
tezos-client list forget address temp --force 
```
















// TODO:
```
No access was given yet to the 'TezosSigner-VM', because '--scope' was not provided. You should setup by creating a role assignment, e.g. 'az role assignment create --assignee <principal-id> --role contributor -g TezosSigner-ResourceGroup' would let it access the current resource group. To get the pricipal id, run 'az vm show -g TezosSigner-ResourceGroup -n TezosSigner-VM --query "identity.principalId" -otsv'
```

Where `xxx` is a non-existent node.


```bash
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
v10.15.3 # Or similar 
```

> http://www.ocamlpro.com/2018/11/21/an-introduction-to-tezos-rpcs-signing-operations/



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

It looks like tz3 (P-256) have been deprecated (https://github.com/murbard/pytezos/blob/master/tests/test_crypto.py `tezos-client sign bytes` does not support P256) (https://medium.com/tezos-capital/introducing-the-new-tezos-tz2-staking-wallet-4c9573fe9dcb)
