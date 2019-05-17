---
template: page
title: "Baking: Remote Signer"
---

###Considerations

1. HSM
2. Availability
3. Security (MITM)
4. Key backups
5. Costs 

###Top Choice: Azure 

####Setting up account

If you do not already have an account, sign up for one at [Azure Signup](https://signup.azure.com).

You'll likely have to go through a privacy-violating ID verificaiton with a phone number *and* credit card, but given that you'll be supplying them with billing information anyway, it's a moot point.

####Install the Azure CLI (Ubuntu 16.04.6)

The easiest way to install is to run the following `bash` script:

```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

Or do the installation process manually, as outlined [here](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli-apt?view=azure-cli-latest).

Note: if you see errors or warnings about default locale go [here](/appendix.html#ubuntu-locale-fix) to find a fix.

Check the version of `az` and ensure it has some meaningful output and you don't get any errors:

```bash
az --version
```

Now, login:

```bash
az login
```

You should get a response that looks like:

```bash
To sign in, use a web browser to open the page https://microsoft.com/devicelogin and enter the code XXXXXXXXX to authenticate.
```

Open that page, copy and paste the code and select the account you want to use. Wait a momemnt and you should get some json as a response to `az login`:

```json
[
  {
    "cloudName": "AzureCloud",
    ...
  }
]
```

Before you get started with the cli, find a location close to you. A list of regions supporting Key Vault is [here](https://azure.microsoft.com/en-us/global-infrastructure/services/?products=key-vault). But this list does not contain the identifiers that the cli expects.

To find these, run the following command:

```bash
az account list-locations | grep -A 5 "Southeast Asia"
```

Replace "Southeast Asia" with the region you prefer. This may be the region with the lowest latency to your current location or some other criteria. You should get a response like:

```bash
    "displayName": "Southeast Asia",
    "id": "/subscriptions/<UUID>/locations/southeastasia",
    "latitude": "1.283",
    "longitude": "103.833",
    "name": "southeastasia",
    "subscriptionId": null
```

In this case the identifier is the name field `southeastasia`. 

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

```bash
az keyvault key create \
	--name KeyVaultTest-SignerKey \
	--vault-name KeyVaultTest-KeyVault \
	--curve P-256K \
	--kty EC-HSM \
	--ops sign \
	--protection hsm
```

List keys:

```bash
az keyvault key list --vault-name KeyVaultTest-KeyVault
```

Show key:

```bash
az keyvault key show --vault-name KeyVaultTest-KeyVault --name KeyVaultTest-SignerKey
```





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

Sign via REST API:

```bash
curl -i -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" -X POST -d "alg=ES256K&value=SIGNME" https://keyvaulttest-keyvault.vault.azure.net/keys/KeyVaultTest-SignerKey/768675a6df2144b4a691681ac064f92f/sign?api-version=7.0
```

```bash
curl -X GET -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" https://keyvaulttest-keyvault.vault.azure.net/keys/KeyVaultTest-SignerKey/versions?api-version=7.0
```

>>>>>>>

sudo apt install python3-pip
pip3 install base58check==1.0.2

>>>>>>>

>>>>>>>

RLEeHDxakX8J5Zp7GDCjaZvSNjyBYZl3MrjKQGuOlaE=
seCZT/jwbgynt5/wbjG6pDESjN1CA4lF2yiL5KoaUGk=

> tz3YeCiKJobmUf84bVN3t5b4wnqURtzRcST5

>>>>>>>

*******

```python
#!/usr/bin/env python3

import argparse
import base64
from hashlib import blake2b, sha256
from base58check import b58encode

parser = argparse.ArgumentParser(description='TODO:')

parser.add_argument('-X', help='EC Base64-encoded X value')
parser.add_argument('-Y', help='EC Base64-encoded Y value')

args = parser.parse_args()

X = base64.b64decode(args.X)
Y = base64.b64decode(args.Y)

P2PK_MAGIC = bytes.fromhex('03b28b7f')
P2HASH_MAGIC = bytes.fromhex('06a1a4')

parity = bytes([2])
if int.from_bytes(Y, 'big') % 2 == 1:
    parity = bytes([3])

shabytes = sha256(sha256(P2PK_MAGIC + parity + X).digest()).digest()[:4]

public_key = b58encode(P2PK_MAGIC + parity + X + shabytes).decode()

blake2bhash = blake2b(parity + X, digest_size=20).digest()

shabytes = sha256(sha256(P2HASH_MAGIC + blake2bhash).digest()).digest()[:4]

pkhash = b58encode(P2HASH_MAGIC + blake2bhash + shabytes).decode()

print(pkhash)
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

Where `xxx` is a non-existent node.

> http://www.ocamlpro.com/2018/11/21/an-introduction-to-tezos-rpcs-signing-operations/



https://docs.microsoft.com/en-us/azure/key-vault/quick-create-cli
https://docs.microsoft.com/en-us/cli/azure/keyvault?view=azure-cli-latest
