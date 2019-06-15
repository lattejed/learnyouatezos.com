---
template: page
title: Handling Protocol Upgrades
---

## Handling Protocol Upgrades

We're only going to handle the case of an active baker?

History & verifying snapshots:
https://blog.nomadic-labs.com/release-of-mainnet-may.html

```
tezos-node snapshot export alphanet-$(date +%F).full
tezos-node snapshot export alphanet-$(date +%F).experimental-rolling --rolling
```

Upgrade:

```
sudo systemctl stop tezos-node.service
sudo systemctl status tezos-node.service
> Active: inactive (dead) ...
```

```
eval $(opam env)
make clean
make build-deps # Answer Y at prompt <~~ Some (minor) errors here, but overall success?
make <~~ ended with a warning, seemed to work ok
```


```
sudo apt install liblz4-tool -y
wget http://quicksync.tzdutch.com/mainnet-BLBkkYEhhPUk36marQSdYY3G6Aexi5YGGFFBoRNzriw6eTJw1da.full.tar.lz4
lz4 -d mainnet-BLBkkYEhhPUk36marQSdYY3G6Aexi5YGGFFBoRNzriw6eTJw1da.full.tar.lz4 | tar xf -

# cleanup
```

```
cd .tezos-node
rm -rf context/ protocol/ store/
rm peers.json version.json
cd -
```

NOTE: DO NOT delete `identity.json` unless you know what you're doing

```
tezos-node snapshot import mainnet-BLBkkYEhhPUk36marQSdYY3G6Aexi5YGGFFBoRNzriw6eTJw1da.full
```

```
May 28 09:05:15 - shell.snapshots: Importing data from snapshot file mainnet-BLBkkYEhhPUk36marQSdYY3G6Aexi5YGGFFBoRNzriw6eTJw1da.full
May 28 09:05:15 - shell.snapshots: You may consider using the --block <block_hash> argument to verify that the block imported is the one you expect
May 28 09:05:15 - shell.snapshots: Retrieving and validating data. This can take a while, please bear with us
Context: 1518K elements, 119MiB read
```

```
May 28 09:14:04 - shell.snapshots: Setting current head to block BLBkkYEhhPUk
May 28 09:14:05 - shell.snapshots: Setting history-mode to full
May 28 09:14:06 - shell.snapshots: Successful import from file mainnet-BLBkkYEhhPUk36marQSdYY3G6Aexi5YGGFFBoRNzriw6eTJw1da.full
```

```
rm BLBkkYEhhPUk36marQSdYY3G6Aexi5YGGFFBoRNzriw6eTJw1da.full
```

```
cd /etc/systemd/system/
sudo mv tezos-accuser.service tezos-accuser-003.service
sudo mv tezos-baker.service tezos-baker-003.service
sudo mv tezos-endorser.service tezos-endorser-003.service

sudo rm -r tezos-*.service.requires

sudo cp tezos-accuser-003.service tezos-accuser-004.service
sudo cp tezos-baker-003.service tezos-baker-004.service
sudo cp tezos-endorser-003.service tezos-ensorser-004.service


```


```
- ExecStart = /home/deploy/tezos/tezos-node run --rpc-addr 127.0.0.1
+ ExecStart = /home/deploy/tezos/tezos-node run --rpc-addr 127.0.0.1 --history-mode full
- RequiredBy = tezos-baker.service tezos-endorser.service tezos-accuser.service
+ RequiredBy = tezos-baker-003.service tezos-endorser-003.service tezos-accuser-003.service tezos-baker-004.service tezos-endorser-004.service tezos-accuser-004.service
```

```
- ExecStart = /home/deploy/tezos/tezos-accuser-003-PsddFKi3 run
+ ExecStart = /home/deploy/tezos/tezos-accuser-004-Pt24m4xi run
```

```
- ExecStart = /home/deploy/tezos/tezos-baker-003-PsddFKi3 run with local node /home/deploy/.tezos-node baked_ledger
+ ExecStart = /home/deploy/tezos/tezos-baker-004-Pt24m4xi run with local node /home/deploy/.tezos-node baked_ledger
```

```
- ExecStart = /home/deploy/tezos/tezos-endorser-003-PsddFKi3 run baked_ledger
+ ExecStart = /home/deploy/tezos/tezos-endorser-004-Pt24m4xi run baked_ledger
```

```
sudo systemctl enable tezos-node.service
sudo systemctl enable tezos-*-003.service
sudo systemctl enable tezos-*-004.service
sudo systemctl daemon-reload
```

Other terminal:
```
sudo tail -f /var/log/syslog
```


```
sudo systemctl start tezos-node.service
sudo systemctl start --all tezos-*-003.service
sudo systemctl start --all tezos-*-004.service

sudo systemctl status tezos-*.service
```

https://blog.nomadic-labs.com/introducing-snapshots-and-history-modes-for-the-tezos-node.html
http://tezos.gitlab.io/master/releases/may-2019.html#activation-of-athens
https://www.tzdutch.com/quicksync/#1542893582358-8174186e-15de
https://blog.nomadic-labs.com/release-of-mainnet-may.html
