---
template: page
title: Installing a Tezos node
---

In a further chapter it's recommended to use Azure to run a remote (HSM-backed) signer. Azure is a requirement, in that specific case, for reasons dicussed in that chaper.

For this chapter the following are *suggestions*:

1. If you're running a node locally for testing, you should use a virtual machine as a guest inside your computer as a host
2. If you're running a node to participate in the network, run it with a cloud provider, specifically Digital Ocean

Note that these are merely suggestions. Installing on macOS and Windows will also be covered.

The author is not affilicated with Digital Ocean in any way and recommends it because of ease of use, low cost and their use of high-performance SSDs by default. While DO is nice to use in general, the performance is particularly a good fit for running a node.

Running the node in a VM on your local machine is mostly about being able to isolve the node and cleanly remove its installation afterwards. Also using the same OS everywhere simplifies administration.

Ubuntu 18.04 is recommended as it's the current long term support (LTS) version, available everywhere and well suited for the task.

## Installing on Ubuntu (18.04)

Fresh install 18.04.2 (ON DO)




Lock down Ubuntu
```bash
ssh root@<ip address>
curl -sO https://gist.githubusercontent.com/lattejed/5047d9f85896b8946c7d/raw/ubuntu_basic_setup_do.sh && bash ubuntu_basic_setup_do.sh
```


TODO: Explain
Create a new user:

```bash
useradd deploy

```

This assumes your pubkey has been added for root already:

```bash
cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys

```

...

Make sure there we no errors. Log out and log back in as *deploy*.

exit
ssh *deploy*<ip address>

*********************************

Optional:

```bash
sudo apt install mosh -y
sudo ufw allow 60000:61000/udp
curl -s https://gist.githubusercontent.com/lattejed/60ebc7ef7d82b8323e3ad9b562bb036f/raw/vimrc_basic > ~/.vimrc
```

```bash
sudo apt update
```

```bash
sudo apt install -y rsync git m4 build-essential patch unzip bubblewrap wget pkg-config libgmp-dev libev-dev libhidapi-dev
```


> If bubblewrap is not available in your distribution you can also skip it and init opam with --disable-sandbox.
> `which` may not show up as a package but it's also most likely already installed

```bash
wget https://github.com/ocaml/opam/releases/download/2.0.3/opam-2.0.3-x86_64-linux
sudo mv opam-2.0.3-x86_64-linux /usr/local/bin/opam
sudo chmod a+x /usr/local/bin/opam
```

```bash
git clone https://gitlab.com/tezos/tezos.git
cd tezos
git checkout alphanet
git branch # double check that it is `alphanet`
```

```bash
opam init --bare
> Do you want opam to modify ~/.profile? [N/y/f]
> A hook can be added to opam's init scripts to ensure that the shell remains in
sync with the opam environment when they are loaded. Set that up? [y/N]
> Answer defaults N, N
```

```bash
make build-deps
> [ERROR] No repository tezos found <-- is normal, ignore
> This can be slow
```

```bash
eval $(opam env)
make
```

```bash
echo -e '\nexport PATH=~/tezos:$PATH\nsource ~/tezos/src/bin_client/bash-completion.sh\nexport TEZOS_CLIENT_UNSAFE_DISABLE_DISCLAIMER=Y' >> ~/.bashrc

source ~/.bashrc
```

```bash
sudo ufw allow 9732
```




```bash
tezos-node identity generate
```

There is some proof of work here (to prevent spam -- which is why it was conceived)


```bash
tezos-node run --rpc-addr 127.0.0.1 --history-mode full
```

TODO: History modes:

1. Appropriateness
2. Sync speed
3.

Locally:
Started syncing at 15:18 May 25 - finished sometime before 16:53 <~~ failed to resync the second time for a very long time
<~~ THis is probably not correct, syncing takes a long time with alphanet

Syncing may appear to start slowly, with `BLockGenesis` as current head for a long time.



Remote:
19:16 27 May -

```bash
tezos-client bootstrapped
```

^This will wait (on alphanet)
NOTE: If CPU is maxed out, the bootstrap command can return successful even if it's not

```bash
tezos-client gen keys local --sig secp256k1 --force
tezos-client list known addresses
```

```bash
tezos-client import secret key remote http://52.187.116.146:6732/tz2KVjptLTqUH5tUk6cTHsTGi7pSHL4Xe1mZ --force
```

Get Tezos from alphanet faucet

```bash
https://faucet.tzalpha.net
```

// THESE SEEM TO BE THE SAME:

tezos-client set delegate for x to x
=
tezos-client register key x as delegate

Copy wallet JSON to file `faucet_wallet.json`

```bash
tezos-client activate account my_faucet_2 with "faucet_wallet_2.json"
> This will wait on alphanet
>
> Operation successfully injected in the node.
> Operation hash is 'op7mihw1uoybFBBRyeEjzEsYYtX1gLptpWkZu8PThDcCdV8vbpq'
> Waiting for the operation to be included...
```

```bash
Uncaught (asynchronous) exception (30827):
Unix.Unix_error(Unix.EAGAIN, "launch_thread", "")
  Backtrace:
    Raised by primitive operation at file "src/unix/lwt_unix.cppo.ml", line 183, characters 5-31
    Called from file "lwt/lwt_cstruct.ml", line 26, characters 4-8
    Called from file "lwt/nocrypto_entropy_lwt.ml", line 40, characters 17-39
    Called from file "lwt/nocrypto_entropy_lwt.ml", line 33, characters 25-29
    Called from file "src/core/lwt.ml", line 2463, characters 16-20
```

>> Unix.EAGAIN <-- may be 100% mem or CPU usage
>> 2GB / 1 CPU is too small, hitting both CPU and MEM limits
>> Trying 4GB / 2 CPU
>>

// not enough in one account:
tezos-client transfer 35096.918915 from secondary to primary --dry-run
// exclude some for fees



// Send to remote signer address:
Fatal error:
  The operation will burn 0.257 which is higher than the configured burn cap ( 0).
   Use `--burn-cap 0.257` to emit this operation.

tezos-client set delegate for azure_tz3 to azure_tz3

```bash
tezos-client activate account my_faucet_2 with "faucet_wallet_2.json" --force
```

```bash
  Rpc request failed:
     - meth: POST
     - uri: http://localhost:8732/chains/main/blocks/head/helpers/preapply/operations
     - error: Unable to connect to the node: "Resource temporarily unavailable"
```

```bash
tezos-client activate account my_faucet_2 with "faucet_wallet_2.json" --force
```

```bash
Error:
  Unregistred error:
    { "kind": "generic",
      "error":
        "Error while applying operation ooukGv44JRkeYXG48JKW9RjhaEQf2rqYvNni4aUN7tyHH6eUSPi:\nrefused (Error:\n           Invalid activation. The public key tz1aiRi3UMWAcq4qg9oPfD2xAZisavD8A1QS does not match any commitment.\n)" }
```

Copy the operation hash
https://alphanet.tzscan.io/op7mihw1uoybFBBRyeEjzEsYYtX1gLptpWkZu8PThDcCdV8vbpq

```bash
tezos-client get balance for faucet
```

View address (before activation)
https://alphanet.tzscan.io/tz1aiRi3UMWAcq4qg9oPfD2xAZisavD8A1QS

Balance is 0


```
{
  "tz2KVjptLTqUH5tUk6cTHsTGi7pSHL4Xe1mZ": {
    "tz2": "tz2KVjptLTqUH5tUk6cTHsTGi7pSHL4Xe1mZ",
    "sppk": "sppk7ammMu3bhurNViCr6EeBQWK45jKxxHaMDuE9JrophZeUMC5WfHH",
    "privateKey": "52f4062e20bb2d103d553f693280d3ecafb68d3fd898142e3cf45d84058c90e3",
    "publicKey": "04c14bf6c71a7c44fd413e5976462f08443424f27bd77018ed9e2b3b88ac33a78a4e16b9a6c06ca5e9ba60f27de1ad21fc6edbc87e85b973dd11d5ccc77b9ee4bc"
  }
}
```


## Installing on macOS (10.x)

## Other platforms (Some generic info)

## Setting up env. vars, autocompletion





#ZERONET NOTES

Upgrade step -- if you get prompted about service restarts (pink screen) select 'yes'
