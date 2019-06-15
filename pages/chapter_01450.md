---
template: page
title: "Baking: Remote Signer"
---

##Remote signers

<highlight>[TODO: Tie this into previous discussion of security and baker topology]</highlight>

###Why an HSM?

While baking is relatively straightforward, *key security* is not and necessitates an approach that usually means separating private keys from a baker, ideally residing in a hardware security module (HSM).

An HSM's primary security feature is that signing (and other cryptographic) operations take place on a dedicated hardward chip that contains your private key and handles operations *without your private key leaving the device.* The key material is not exposed to the attached computer, meaning a compromise of that computer does not leak your private key.

Low cost, consumer-grade HSMs are common in the cryptocurrency world, with Ledger Nano being probably the most common. While Tezos signing (and wallet) software is avaiable for the Ledger, it requies a physical USB connection to a computer, requiring either the signing computer or the entire baking node reside in your home or office.

While this can be simple and low-cost, it does require an always-available internet connection, the ability to open ports to the public network and an uninterruptible power supply. In practice it's not easy to achieve high availability with this setup. Lots of things can go wrong, especially when the setup is unattended (e.g., you're on holiday).

A cloud signer with an attached HSM is a solution to this problem, but dedicated HSMs are expensive to operate, out of the price range of any but the largest baking operations. 

However, Google Cloud KMS and Azure Key Vault have started to offer per-use pricing that makes HSM-backed signing operations very inexpensive, making them affordable for even very small bakers.

###Why Azure?

As both Google and Microsoft's offerings are compatible with Tezos, the main consideration is whether or not private keys can be backed up. Azure allows for it and Google does not.

It is *strongly not recommended* to use a cloud HSM service that does not allow for backing up of private keys. Ask yourself these questions:

1. Do you trust this company to *never*, under any circumstances, lose your private key?
2. Do you trust this company to never lock your account for any reason?

The answer to both of those has to be no.

<note>
To be precise, Azure does not allow you to back up your HSM-generated keys. The backup functionality will only allow you to move your key within the same availability region. However, they do allow you to generate your own keys and import them, which is what we're going to do.
</note>

###Two VMs and an HSM?

This setup calls for a separate baker and signer VM. It is possible run the signing service on the same VM as the baker, so why not do that? The answer is it's less secure.

1. An attacker who could gain access to your baker could sign any operation, including moving all of your XTZ to another address
2. Your baker *may* be known to the rest of the network, increasing the chances it is targeted for attack
3. Running a separate signer allows you to whitelist baking and endorsing operations and require intervention for other operations (transfers, voting, etc.)
4. A separate signer requires that *two* VMs are compromised before signing operations could be done by a rogue actor

Since your signer will only be known to your baker, the baker itself would have to be accessed to discover the IP address. After that, your signer VM would also have to be compromised. 

To help offset this, the signing software provided here is very lightweight and can be run on the cheapest available VM.

This also allows for the entire signer to reside on Azure (which simplifies authentication for the signer and makes it more secure) while allowing you to run your baker node on another service, as the author does.

##Getting started with Azure

###Get an Azure account

If you don't already have one, go here [https://azure.microsoft.com/en-us/free](https://azure.microsoft.com/en-us/free) to get a new Azure account.

You'll likely have to go through a privacy-violating ID verification with a phone number *and* credit card, but given that you'll be supplying them with billing information anyway, it's a moot point.

It is *strongly recommended* that you set up two-factor authentication (2FA) for the Microsoft account you use to access Azure. Someone gaining acess to you Azure account could change your security settings and allow access to your signer from a rogue computer. More info [here](https://support.microsoft.com/en-us/help/12408/microsoft-account-how-to-use-two-step-verification).

###Install Azure CLI

It's recommended that you install the CLI on your local machine or on a local VM. It is *not recommended* to install the cli on the remote signer you'll provision nor your baker's VM. We'll be authenticating the CLI and having those credentials on a remote machine can be a security issue. 

<note>
Running a VM on your local computer *do not* protect you against key loggers and other forms of malicious monitoring. If you are unsure of your local computer's security, you should at least do a clean install of your OS before continuing.
</note>


```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

You may want to download the script and review it before running it. Alternately, you can install manually as outlined here: [https://docs.microsoft.com/en-us/cli/azure/install-azure-cli-apt?view=azure-cli-latest](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli-apt?view=azure-cli-latest).

<note>
If you see errors or warnings about default locale go to [learnyouatezos.com/appendix.html#ubuntu-locale-fix](/appendix.html#ubuntu-locale-fix) to find a fix.
</note>

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

Before you get started with the cli, decide what region to set up your signer in. Usually, you'll want to set up as close to your baker as possible.

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
	--name TezosSigner-ResourceGroup \
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
  ...
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

##Setting up a signer VM

###Create a virtual machine

Next let's create the VM we'll be running our signer in. We use the `az vm create` command for this. We won't do anything with this until later, but we'll need to get its public IP so we can set up the firewall of our Key Vault.

```bash
az vm create \
	--name TezosSigner-VM \
	--resource-group TezosSigner-ResourceGroup \
	--image Canonical:UbuntuServer:18.04-LTS:latest \
	--size Standard_B1s \
	--storage-sku Standard_LRS \
	--admin-username deploy \
	--authentication-type ssh \
	--nsg-rule ssh \
	--ssh-key-values ~/.ssh/id_rsa.pub \
	--assign-identity
```

<note>
If you do not have a keypair set up for ssh (i.e., you don't have an `id_rsa.pub` present, run `ssh-keygen` first to create one.
</note>

You should get output that looks like this:

```bash
{
  ...
  "identity": {
    "principalId": "<UUID>",
    ...
  },
  ...
}
```

Record the `principalId` so we can assign it to our Key Vault.

We'll also need to get the VM's public IP:

```bash
az vm list-ip-addresses \
	--name TezosSigner-VM \
	--resource-group TezosSigner-ResourceGroup
```

Test that you can log into your VM:

```bash
ssh deploy@<public IP address>
```

You should have logged in successfully.

###Secure your VM

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

##Setting up your Key Vaults

###Create a Key Vault

Next, create a Key Vault that will contain your imported keys.

```bash
az keyvault create \
	--name TezosSigner-KeyVault \
	--resource-group TezosSigner-ResourceGroup \
	--location southeastasia \
	--sku premium
```

<note>
`--sku premium` is mandatory as that will allow for HSM operations.
</note>

You should get output that looks like this:

```json
{
  ...
  "properties": {
	...
    "vaultUri": "https://tezossigner-keyvault.vault.azure.net/"
  },
  ...
}
```

Record your vault URI.

<note>
Make sure you copy down your vault URI as you'll need it to run your signer.
</note>

If you need to delete the key vault, you can use the command:

```bash
az keyvault delete \
	--name TezosSigner-KeyVault
```

###Set up Key Vault firewall

This is a multi-step process, but is *strongly recommended* as it will secure the connection between your signer VM and your Key Vault.

First, get a list of virtual networks in your resource group:

```bash
az network vnet list \
	--resource-group TezosSigner-ResourceGroup
```

Your output will look like this:

```json
[
  {
    ...
    "name": "TezosSigner-VMVNET",
    ...
    "subnets": [
      {
        ...
        "name": "TezosSigner-VMSubnet",
        ...
      }
    ],
    ...
  }
]
```

We want to record the virtual network name as well as the subnet name.

Next, we need to add a Key Vault service endpoint to our subnet. Use the following command, filling in your values as necessary:

```bash
az network vnet subnet update \
	--resource-group TezosSigner-ResourceGroup \
	--vnet-name TezosSigner-VMVNET \
	--name TezosSigner-VMSubnet \
	--service-endpoints "Microsoft.KeyVault"
```

Next, add the subnet to your Key Vault's firewall:

```bash
az keyvault network-rule add \
	--name TezosSigner-KeyVault \
	--vnet-name TezosSigner-VMVNET \
	--subnet TezosSigner-VMSubnet
```

Then add the public IP address of your signer VM:

```bash
az keyvault network-rule add \
	--name TezosSigner-KeyVault \
	--ip-address <public IP address of signer VM>
```

To activate the firewall, set the default action to `Deny`:

```bash
az keyvault update \
	--name TezosSigner-KeyVault \
	--default-action Deny
```

To ensure your firewall is active, run the following command:

```bash
az keyvault network-rule list \
	--name TezosSigner-KeyVault
```

Your output should look like this:

```json
{
  "bypass": "AzureServices",
  "defaultAction": "Deny",
  "ipRules": [
    {
      "value": "<public IP address of VM>"
    }
  ],
  "virtualNetworkRules": [
    {
      "id": "/<path>/tezossigner-vmvnet/subnets/tezossigner-vmsubnet",
      ...
    }
  ]
}
```

Ensure that the default action is `Deny` and that your subnet and signer's IP address are listed.

###Set Key Vault service principal

This will authorize our VM to access our Key Vault. When we created our VM, we used the flag `--assign-identity` to create an identity suitable for this purpose.

To connect these two, use the following command, adding our the UUID of the service principal that we recorded when we created our VM.

```bash
az keyvault set-policy \
	--name TezosSigner-KeyVault \
	--key-permissions get sign \
	--object-id <VM service principal ID>
```
	
##Generating private keys

<warning>
Key security is a very big topic. The guidelines here offer one possible way to securely create and backup keys. They are not bulletproof and only represent an acceptable level of security for the author, for the author's own needs. It is strongly recommended that you research best practices on your own. If your private keys are controlling non-trivial amounts of XTZ, you should consider hiring a security consultant.
</warning>

To generate and back up keys securely, we're going to use the following procedure:

1. Download and create a fresh installation of Ubuntu 18.04 on a USB drive
2. Run that on an air-gapped computer
3. Create strong passphrase using `openssl` to encrypt our key
4. Create our key using `openssl`
5. Back up our key and passphrase in separate locations
5. Wipe our USB key

This procedure is not flawless, but it is what the author considers acceptable and uses for his own keys. 

###Download Ubuntu 18.04

We're going to first download Ubuntu 18.04 *desktop* edition. It has to be the desktop edition in order to run it as a live CD (USB).

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

<note>
The `diskutil` command is macOS-specific. If you are on Linux, use `sudo fdisk -l` instead.
</note>

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

Plug it back in, then unmount it:

```
diskutil unmountDisk /dev/disk2
```

Then write the ISO to the drive:

<warning>
Using `sudo dd` is a destructive command. Make sure you double check the location of your USB drive as described above. Also make sure you've backed up the contents of the USB drive if they're important to you.
</warning>

```
sudo dd if=~/<path>/ubuntu-18.04.2-desktop-amd64.iso of=/dev/disk2 bs=1m
```

This will take a while. Eventually the command will exit and your drive will be usable.

###Run on an air-gapped machine

What is an air-gapped machine? That means our machine does not have the ability to connect to the internet or other networks. In this case, it should be sufficient to do two things:

1. Unplug any LAN or other networking cables
2. *Do not* connect wifi after booting from the USB drive

After booting up, you should open a web browser and ensure the internet is *not* accessible.

<warning>
For this purpose, it is *not* enough to unplug a machine with an already installed OS. We want a fresh OS *and* no network connection for this procedure.
</warning>

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

Creating a passphrase of 16 random bytes will give us 128 bits of entropy, which should be impossible to brute force if your private keys are ever stolen. 

<warning>
*Do not* use a normal password to encrypt your private key. Using a normal password opens your key up to brute force decryption. Using 16 random *bytes* is not the same as using a password that is 16 characters long.
</warning>

Carefull copy your passphrase to a piece of paper that you can store securely. 

<warning>
*Do not* take a photograph of your passphrase, print it out or store it in a password manager. These open up more avenues of attack than storing a hand written copy.
</warning>

Consider writing this on paper with e.g., the following format:

```bash
59oER7LlKbJfNgmsPljYwg== # EXAMPLE DO NOT USE
NNLUUNULULULULLLULLULLPP
```

Where `N = number`, `L = lowercase`, `U = uppercase` and `P = punctuation`. This will prevent confusing `0` with `O` or `5` with `S` when reading it back.

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

Before you copy your key to a USB drive, you should test that your passphrase was recorded correctly. 

<warning>
*Do not* copy and paste the passphrase for this step. You want to ensure that your phyiscal backup has been recorded correctly. Read it from your backup and type it in by hand.
</warning>

```plaintext
openssl ec -check -noout -in <key file>.pem
```

After entering your passphrase, the response should be:

```plaintext
EC Key valid.
```

If it is not, start over from the beginning.

###Securing your key

It's strongly recommended that you back up your key redundantly (e.g., mutliple USB drives in multiple secure locations). Your passphrase should also be backed up in a *separate* secure location.

<warning>
If you lose your key *or* your passphrase the associated `tz` address can *never be* recovered. If you have any XTZ in that address, it will be lost forever.
</warning>

<warning>
If someone were to find your key and passphrase, they would have full access to the associated `tz` address. 
</warning>

###Clean up

You should wipe the contents of the USB drive containing Ubuntu.

```bash
sudo dd if=/dev/urandom of=/dev/disk2 bs=10m
```

Again, *double check* that this is the correct drive using the procedure above. This is a destructive procedure.

This operation will take a long time, depending on the size of your device.

##Azure key import

Now that we've securely generated our key and passphrase, we can import our key into the Azure Key Vault. We're going to follow a procedure very similar to the one we used for generating our keys, except this time we will not be able to air-gap this computer as it needs to talk to Azure.

<warning>
Azure Key Vault does not offer a way to import keys with a key pair, which would be more secure than this method. That means your private key (and passphrase) will exist, in unencrypted form, in your machine's RAM until your computer is rebooted. If you are dealing with non-trivial amounts of XTZ, you should hire a security consultant.
</warning>

This time, we will:

1. Create a fresh installation of Ubuntu 18.04 on a USB drive
2. Run that on a computer with a network connection
3. Install and authenticate the Azure CLI
4. Import our key to Azure
5. Wipe our USB key

<note>
Ubuntu tends to be picky about WiFi adaptors. If possible, use a machine with a wired ethernet connection.
</note>

###Get Azure running (again)

As above, install the CLI and then log in:

```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
az login
```

```plaintext
To sign in, use a web browser to open the page https://microsoft.com/devicelogin and enter the code XXXXXXXXX to authenticate.
```

Open a browser to the url that is returned and enter the code given.

###Import your key

Use the following commands, adding in your desired key name, the name of the vault you've already created and the path to the encrypted `pem` file you've backed up on USB.

If you're creating a `tz2` address, you could use the following:

```bash
read -sp "Passphrase: " PASS; echo; \
az keyvault key import \
	--name TezosSigner-KeyP256K \
	--vault-name TezosSigner-KeyVault \
	--ops sign \
	--pem-file secp256k1_sk.pem \
	--pem-password "$PASS" \
	--protection hsm; \
unset PASS
```

If you're creating a `tz3` address:

```bash
read -sp "Passphrase: " PASS; echo; \
az keyvault key import \
	--name TezosSigner-KeyP256 \
	--vault-name TezosSigner-KeyVault \
	--ops sign \
	--pem-file prime256v1_sk.pem \
	--pem-password "$PASS" \
	--protection hsm; \
unset PASS
```

<warning>
Do not copy and paste your passphrase from somewhere. Type it in by hand from the piece of paper you've written it on, which is the only place it should exist.
</warning>

You should get output that looks like:

```bash
{
  ...
  "key": {
    "crv": "P-256",
    ...
    "keyOps": [
      "sign"
    ],
    "kid": "https://<URI>/keys/TezosSigner-KeyP256/<ID>",
    "kty": "EC-HSM",
    ...
  },
  ...
}
```

Note the `crv` value, which should be `SECP256K1` for a `tz2` key and `P-256` for a `tz3` key.

Also take note of the `kty` property. Make sure that it is `EC-HSM` which means an elliptic curve key with HSM storage.

If you need to delete a key and start over, use e.g.:

```bash
az keyvault key delete \
	--name TezosSigner-KeyP256K \
	--vault-name TezosSigner-KeyVault
```

To list keys:

```bash
az keyvault key list \
	--vault-name TezosSigner-KeyVault
```

Now, remove your USB drive(s) and reboot your computer.

###Clean up

It is *strongly recommended* that you wipe the contents of the USB drive 
containing Ubuntu.

```bash
sudo dd if=/dev/urandom of=/dev/disk2 bs=10m
```

Again, *double check* that this is the correct drive using the procedure above. This is a destructive procedure.

This operation will take a long time, depending on the size of your device.


##Setting up signing software

The author has created signing software for this application with the following features:

1. Supports `tz2` and `tz3` addresses
2. Allows whitelisting operations (e.g., baking and endorsing)
3. Checks high-water marks to ensure that it doesn't double-bake or double-endorse
4. Has a built in client to authorize other operations (transfers, voting, etc.)
5. The default settings are the most secure

Non-features:

1. Does not support high-availabilty setups where more than one baker or signer may be operating at the same time.

###Why Node.js?

A number of existing signers use the Python scripting language, so why use JavaScript instead? In short, Node has a more user-friendly system for handling versioning and package management. Installing Node and NPM-based software is hassle free in general.

###Node.js security?

There have been a couple of recent cases of popular packages having malicious code added to them to target cryptocurrency private keys. The reasons the author still considers Node acceptable for this purpose:

1. These exploits targeted popular wallets and *private keys*. This signer *does not* have access to your private keys
2. The group behind the NPM package manager maintains security audits of popular packages, updated regularly
3. Using `npm shinkwrap` ensures that the signer is installed with known safe versions of its dependencies

You can run npm audit yourself:

```bash
npm audit
```

The output should look like:

```bash
...
found 0 vulnerabilities
 in 1098 scanned packages
```

###Installing Node.js

SSH into your signer VM, if you haven't already:

```bash
ssh deploy@<signer IP address>
```

We're going to install Node version 10. We first need to add the repository and then install.

```bash
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get install -y build-essential nodejs
```

If you have objections to piping installation scripts to bash, you can find instructions for manually installing here: [https://github.com/nodesource/distributions/blob/master/README.md](https://github.com/nodesource/distributions/blob/master/README.md).

Confirm installation:

```bash
node --version # e.g., v10.16.0
npm --version # e.g., 6.9.0
```

###Installing the signer

```bash
git clone https://github.com/lattejed/tezos-azure-hsm-signer.git
cd tezos-azure-hsm-signer
npm install
```

The response should look like:

```bash
added 307 packages from 666 contributors and audited 1098 packages in 21.286s
found 0 vulnerabilities
```

###Testing the installation

We're first going to run the inlcluded tests, to make sure everything is working correctly.

```bash
npm run test
```

The response should look like:

```bash
...
...
30 passing (38ms)
```

Now we're going to test our connection to our KeyVault. You'll need the Azure Key Vault URI from when we setup our Key Vault above. It should look like `https://<...>.vault.azure.net/`.

```bash
AZURE_KEYVAULT_URI='https://tezossigner-keyvault.vault.azure.net/' node server.js
```

If everything has been set up correctly, you should see output like:

```json
{
  "tz3...": {
    "kid": "https://tezossigner-keyvault.vault.azure.net/keys/TezosSigner-KeyP256/...",
    "pk": "p2pk...",
    "pkh": "tz3...",
    "signAlgo": "ES256"
  }
}
```

The signing algorithm should be `ECDSA256` for `tz2` keys and `ES256` for `tz3` keys.

###Finishing signer installation

We're going to run our signing server as a daemon, using `systemd`. 

```bash
cp tezos-signer.service.template tezos-signer.service
```

Now edit the `tezos-signer.service` file, adding in your vault URI at this line:

```bash
Environment = AZURE_KEYVAULT_URI=https://<REPLACE ME>.vault.azure.net/
```

When finished, do the following:

```bash
sudo cp tezos-signer.service /etc/systemd/system/tezos-signer.service
sudo systemctl enable tezos-signer.service
sudo systemctl start tezos-signer.service
sudo systemctl status tezos-signer.service
```

Make sure you see a line starting `Active: active (running)...`. 

##Final setup and testing

<highlight>TODO: Link to tezos alphanet setup.</highlight>

<warning>
It is *strongly recommended* that you first test out your signer on `zeronet` or `alphanet` using a test key.
</warning>

Now that we've got our signer running, it's time to test it out against our baker node. 

###Setting up the firewall

First, ensure that your default inbound rule is set to `Deny`:

```bash
az network nsg list \
	--resource-group TezosSigner-ResourceGroup \
	--query '[].defaultSecurityRules[].name'
```

You should get output that looks like:

```json
[
  ...
  "DenyAllInBound",
  ...
]
```

<warning>
The string `DenyAllInBound` tells us we have to explicitly add inbound port rules, which is critical. Make sure it is there before using your signer.
</warning>

Now, get the name of your network security group:

```bash
az network nsg list \
	--resource-group TezosSigner-ResourceGroup \
	--query '[].name'
```

You should get a response like:

```json
[
  "TezosSigner-VMNSG"
]
```

Now, list your current rules.

```bash
az network nsg rule list \
	--nsg-name TezosSigner-VMNSG \
	--resource-group TezosSigner-ResourceGroup
```

The results should look like this:

```json
[
  {
    "access": "Allow",
    ...
    "destinationPortRange": "22",
    "direction": "Inbound",
    ...
    "name": "default-allow-ssh",
    "priority": 1001,
    ...
    "sourceAddressPrefix": "*",
  }
]
```

This is the ssh rule we added when the VM was created. It basically says allow any inbound address to connect to port 22.

Now, let's add a rule to allow our baker to access our VM. We're going to pick a priority of 1001 as the default ssh rule should have a priority of 1000 and each rule's priority must be unique. If you add additional rules, use 1002, etc.

Let's say your baker's IP is 127.127.127.127, the command could look like this:


```bash
az network nsg rule create \
	--name Rule_127_127_127_127__6732 \
	--nsg-name TezosSigner-VMNSG \
	--resource-group TezosSigner-ResourceGroup \
	--priority 1001 \
	--access Allow \
	--destination-port-ranges 6732 \
	--source-address-prefixes 127.127.127.127
```

If you move your baker, you *must* delete this rule, using:

```bash
az network nsg rule delete \
	--name Rule_127_127_127_127__6732 \
	--nsg-name TezosSigner-VMNSG \
	--resource-group TezosSigner-ResourceGroup
```
	
###Testing out the firewall

Now, let's test that our firewall will reject requests from everywhere except our baker. From a machine that's not your baker, run the following:

```bash
curl --connect-timeout 10 http://<signer VM address>:6732/keys/<tz address>
```

After ten seconds, you should get a response like:

```plaintext
curl: (28) Connection timed out after 10001 milliseconds
```

If you get any other response, do not use your signer until you've diagnosed the problem.

###Importing the key

Now, from your baker, issue the following command:

```bash
tezos-client import secret key my_azure_key http://<signer IP address>:6732/<tz address>
```

The response should be:

```plaintext
Tezos address added: <tz address>
```

###Testing the key

<highlight>TODO: Link to tezos alphanet setup.</highlight>

To test that our setup is safe to use, we're going to transfer a small amount of XTZ to it (e.g., 1 xtz) from an existing address and then transfer it back. This assumes that you already have an account and key set up on your baker node.

```bash
tezos-client transfer 1 from my_account to my_azure_key
```

<note>
It's always a good idea to first test a transaction by appending `--dry-run` to it. This will execute all parts of the transaction other than injecting it into the network.
</note>

You may get an error transferring to your new address that looks like:

```plaintext
Fatal error:
  The operation will burn 0.257 which is higher than the configured burn cap ( 0).
   Use `--burn-cap 0.257` to emit this operation.
```

This is the cost of a "reveal" operation, where a new account has its public key included in the blockchain. This is a one time *storage fee* for newly created accounts. To allow this transaction, add the `--burn-cap 0.257` flag to the end of the `transfer` command.

You should get a confirmation. Check the balance of your new account with:

```plaintext
tezos-client get balance for my_azure_key
```

Make sure the balance has been updated before continuing.

*Before* we transfer back, we're going to have to start the `client` of our signer. From your signer VM, do the following:

```bash
cd tezos-azure-hsm-signer	
node client.js
```

You should see:

```plaintext
Waiting for signing request. Ctrl-C to quit.
```

<warn>
You *have to* start your signer client *before* you attempt a transaction. By design, it will ignore any signing requests that have been made before it was started.
</warn>

Now, from your node:

```plaintext
tezos-client transfer 0.5 from my_azure_key to my_account
```

We're only going to transfer half of the amount back so we can ignore the fee calculation. You should get the following prompt on your `client`:

```plaintext
Confirm transaction 03... [Ny]?
```

Press `y` to accept it.

You should get a response that looks like:

```plaintext
The operation has only been included 0 blocks ago.
We recommend to wait more.
Use command
  tezos-client wait for XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX to be included --confirmations 30 --branch XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
and/or an external block explorer.
```

<warning>
If you were not able to transfer XTZ in *and* out of your new `tz` address, *DO NOT* use it until you've diagnosed the problem.
</warning>

###Whew!

If you made it this far, congratulations on your new HSM signer!












