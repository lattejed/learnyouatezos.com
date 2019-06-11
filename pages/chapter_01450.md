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

<aside>
To be precise, Azure does not allow you to back up your HSM-generated keys. The backup functionaly it has will only allow you to move your key within the same availability region. However, they do allow you to generate your own keys and import them. 
</aside>

###Baker VM + Signer VM + HSM

This setup calls for a separate baker and signer VM. It is possible run the signing service on the same VM as the baker, so why not do that? 

1. An attacker who could gain access to your baker could sign any operation, including moving all of your Tezos to another address.
2. Your baker *may* be known to the rest of the network, increasing the chances it is targeted for attack.
3. Running a separate signer allows you to whitelist baking and endorsing operations and require intervention for other operations (transfers, voting, etc.)
4. A separate signer requires that *two* VMs are compromised before signing operations could be done by a rogue actor.

Since your signer will only be known to your baker, the baker itself would have to be accessed to discover the IP address. After that, your signer VM would also have to be compromised. 

To help offset this, the signing software dicussed here is very lightweight and can be run on the cheapest available VM.

##Getting started with Azure

###Get an Azure account

If you don't already have one, go here [https://azure.microsoft.com/en-us/free](https://azure.microsoft.com/en-us/free) to get a new Azure account.

You'll likely have to go through a privacy-violating ID verificaiton with a phone number *and* credit card, but given that you'll be supplying them with billing information anyway, it's a moot point.

[TODO: Add 2FA setup]

###Install Azure CLI

It's recommended that you install the CLI on your local machine or on a local VM. It is *not recommended* to install the cli on the remote signer you'll provision nor your baker's VM. We'll be authenticating the CLI and having those credentails on a remote machine can be a security issue. 

NOTE: VMs on a compromised machine *do not* protect you against keyloggers and other forms of malicious monitoring, though they offer some protection in the other direction (e.g., it's safter to browse malicious websites on a VM). If you are unsure of your local computer's security, you may want to do a clean install of your OS before continuing.

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

###Create resource group

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

```bash
az group delete \
	--name "TezosSigner-ResourceGroup" \
	--yes
```

WARNING: This will delete *everything* inside the resource group. Only use this command when trying things out.

##Setting up a VM

###Create Virtual Machine

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

----------------------------------------------

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

-------------------------------------------



WARNING: Using `sudo dd` is a destructive command. Make sure you double check the location of your USB drive as described below. Also make sure you've backed up the contents of the USB drive if they're important to you.

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

----------------------------------------------

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

Note: `--sku premium` is mandatory as that will allow for HSM operations.

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
# tz3 addresses:
openssl ecparam -genkey -name prime256v1 | openssl ec -aes256 -out prime256v1_sk.pem

# tz2 addresses:
openssl ecparam -genkey -name secp256k1 | openssl ec -aes256 -out secp256k1_sk.pem
```

```
openssl ec -in encrypted_key.pem
```

```
openssl ec -in encrypted_key.pem -pubout
```

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

NOTE: This has to be P-256, P-256K is incompatible

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

4444
> blake2b 4444
52c2d9812b24bc8bdfed1ab234270fb132d62a94493ba726107144a2eed8a178

"4444"
0e5751c026e543b2e8ab2eb06099daa1d1e5df47778f7787faab45cdf12fe3a8

*******

Since we were just testing things out, we'll now clean this up:

```bash
az keyvault delete --name KeyVaultTest-KeyVault
az group delete --name KeyVaultTest-ResourceGroup
```

You'll need to answer `y` when prompted. This operation may take a while. Check that everything has been deleted:

```bash
az keyvault list
az group list
```

These should all return an empty json array `[]`. 



Rest API:

```bash
PASSWORD='XXXXXXXXXXXXXXXXXX'
az ad sp create-for-rbac --name KeyVaultTest-App --password $PASSWORD

# Response
{
  "appId": <UUID 1>,
  "displayName": "KeyVaultTest-App",
  "name": "http://KeyVaultTest-App",
  "password": "XXXXXXXXXXXXXXXXXX",
  "tenant": <UUID 2>
}
```

```bash
APP_ID = <UUID 1>
TENANT_ID = <UUID 2>
```

```bash
curl -X POST -d "grant_type=client_credentials&client_id=$APP_ID&client_secret=$PASSWORD&resource=https://management.azure.com/" https://login.microsoftonline.com/$TENANT_ID/oauth2/token
```

```bash
{
	"token_type": "Bearer", 	
	...
	"access_token": "XXXXXXXX...XXXXXXXXXXXX"
}
```

```bash
ACCESS_TOKEN=XXXXXXXX...XXXXXXXXXXXX
unset PASSWORD APP_ID TENANT_ID
```

```bash
az ad sp show --id http://KeyVaultTest-App
az ad sp delete --id http://KeyVaultTest-App
```

Sign via REST API: ??

```bash
curl -i -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" -X POST -d "alg=ES256K&value=SIGNME" https://keyvaulttest-keyvault.vault.azure.net/keys/KeyVaultTest-SignerKey/768675a6df2144b4a691681ac064f92f/sign?api-version=7.0
```

```bash
curl -X GET -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" https://keyvaulttest-keyvault.vault.azure.net/keys/KeyVaultTest-SignerKey/versions?api-version=7.0
```

Test sign with node:

```bash
tezos-client sign bytes 0x03 for temp
```

Signing error:
> Invalid length of 'value': 1 bytes. ES256K requires 32 bytes, encoded with base64url.


>>>>>>>

sudo apt install python3-pip
pip3 install base58check==1.0.2

>>>>>>>

>>>>>>>

RLEeHDxakX8J5Zp7GDCjaZvSNjyBYZl3MrjKQGuOlaE=
seCZT/jwbgynt5/wbjG6pDESjN1CA4lF2yiL5KoaUGk=

> tz3YeCiKJobmUf84bVN3t5b4wnqURtzRcST5

>>>>>>>

```bash
sudo apt install libsodium-dev libsecp256k1-dev libgmp-dev
pip3 install git+https://github.com/baking-bad/pytezos
```

*******



```bash
ZURE_KEYVAULT_URI='https://keyvaulttest-keyvault.vault.azure.net' node index.js --address 0.0.0.0
```

Generate unencrypted keys:

```bash
tezos-client -A xxx gen keys test_p256 --force --sig p256
> tz3bTaf8H68dnTExvYgBcfx2nFU9kfHHxXzZ
> unencrypted:p2pk68L7YPVrEe1Fp4DjbxLv9adqDRMrmmsFxspKShNj8iaozaRV5CD
> unencrypted:p2sk44FcYdThs69sEEsRmvC2nGAgHfeExoyLqaq9HjRFQkGdVwo7BP 
```

```python
import base58check
base58check.b58decode(b'p2sk44FcYdThs69sEEsRmvC2nGAgHfeExoyLqaq9HjRFQkGdVwo7BP').hex()[8:72]
> e1d751bd819cec377bc223de545f0fecd0bde857c06997997b2e912c9618d3b6
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
