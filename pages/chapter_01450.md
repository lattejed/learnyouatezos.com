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

The signer has to *run* on Azure, or else the threat model is the same as keeping keys in software. 

The Azure VM is still theoretically vulernable -- a person with access could sign arbitrary tranactions.

Can a password help with this? This could be included as a ENV var? Check this against the original AWS signer, which seems to use the same.

NOTE:

It looks like tz3 (P-256) have been deprecated (https://github.com/murbard/pytezos/blob/master/tests/test_crypto.py `tezos-client sign bytes` does not support P256) (https://medium.com/tezos-capital/introducing-the-new-tezos-tz2-staking-wallet-4c9573fe9dcb)

In Azure it looks like it's possible to use tz2 addresses (P-256K) but the client need to be updated and this needs to be tested. 

###Top Choice: Azure 

```bash
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
v10.15.3 # Or similar 
```

```bash
az account show
{
  ...
  "id": "600cbff5-ab52-43ca-9dd6-0a3bd4401169",
  ...
}
```

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



Where `xxx` is a non-existent node.

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
