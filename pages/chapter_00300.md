---
template: page
title: Blockchain 101
---

## Enter the Blockchain

First of all, what is a blockchain?

*A blockchain is a secure, distributed and Byzantine-fault tolerant ledger of transactions.*

While a large portion of humans may view blockchains as "digital money", this is a poor analogy. When we think of money we tend to think of physical money &mdash; coins and bills. These have copy protections (in their designs and legally) and can only be, by the laws of physics, in one place at one time.

It's impossible to create a digital good that shares those attributes. Because they are pure information, they will always be freely copyable. Imagine saying the number '123456789' is worth a million dollars!

But if we extend our "digital money" analogy into, say, bank transfers, things make sense. Of course banks dont physically transfer money (in most cases), they simply update a ledger of debits and credits.

A ledger is something that can represent the transfer of value (and therefore value itself) and can be designed in such a way that they're not copyable.

## Whiteboard Analogy

Imagine we are opening a bank.

In order to keep track of everyone's credits and debits, we're going to use a white board.

Because this white board represents millions or even billions of dollars, we have to ensure that no one modifies transactions they're not authorized to.

If everyone's bank transactions &mdash; and therefore bank balance &mdash; is on a whiteboard, the addition of a single "0" could make someone a whole lot richer. Or, a quick erasure could bankrupt your arch enemy!

### Private, Centralized Model (Inside Whiteboard)

Because our ledger is so sensitive, we're going to do the most sane thing possible: We're going to lock it in a vault and make sure only select people have access to that vault. If our vault is secure, our whiteboard is secure.

This works perfectly fine if everyone trusts the bank &mdash; and trusts the bank not to raise fees to be unreasonable or to not deny banking to "undesirable" people (where undesirable could mean someone who challenges prevailing political opinions).

But what if we want to do the same without trusting the bank?

### Public, Decentralized Model (Outside Whiteboard)

Now, if keeping billions of dollars worth of transactions on a whiteboard in a vault wasn't crazy enough, let's put the whiteboard *outside, in the bank's parking lot*!

Obviously this is crazy, now anyone can erase transactions, add zeros, do anything they want to anyone's account, including their own.

*But this is precisely what blockchain allows us to do.* Is it magic? Kind of.

It's a novel combination of our three fundamental ideas:

## Foundations of Blockchain

Blockchains are built on three fundamental ideas or technologies:

1. Cryptography
2. Peer to Peer Networking
3. Game Theory

Like the Internet (a network of computers) and Computer Science in general, these are *relatively* new ideas (i.e., having been largely developed in the last few decades) (TODO: check this).

In blockchain, these concepts have been combined in a unique way to solve a unique problem: How do we create a cooperating network, without a central authority, where the network may be unreliable and parts of the network may be hostile towards the whole!

More specifically, how do we create a public, shared resources (a ledger of transactions) that is secure from hostile actors without relying on centralization or privatization.


## Cryptography

Cryptography, precisely *Public Key Cryptography* is *already* the backbone of the Internet as we know it. Without Public Key Cryptography, there would be no HTTPS, no secure logins, no e-commerce, no Internet banking.

In short, Public Key Cryptography allows to to create a secret number (a private key) and *derive* a non-secret number (a public key) in such a way that we can encrypt a message with a public key &mdash; and that message can only be decrypted with the private key.

(We can encrypt with a private key and decrypt with a public key, but that's usually called 'signing' and is used to prove ownership of a private key.)

What's more, we can easily derive a public key from our private key, but it's computationally infeasible to derive our private key from our public key. Mathematically, it involves prime numbers and is a type of one-way or trapdoor function.

It works because it's simple to multiple numbers together, but on the other hand, it takes a *long time* to factor prime numbers, where *long time* can be billions of years.

Public Key Cryptography is used extensively in blockchain, with its most fundamental use being the derivation of keypairs for crypto wallets. A public key, in essence, becomes an address that coins can be sent to and the matching private key is the secret needed to send money *out of* that address.

## P2P

Peer to Peer networking is another foundational element to blockchain, with the main idea being that individual computers participating with a blockchain (nodes) are equal: There is (usually) no central node or authority.

Additionally, each node generally holds a complete copy of the list of transactions that the blockchain contains.

This is somewhat similar to BitTorrent, where many nodes may have a complete copy of a pirated movie, each sending a piece of it to someone requesting that movie. By many nodes having a full copy of the movie, it muddies the legal waters to the point where it's infeasible to prosecute individual participants or shut them down.

(There are non-pirating reasons to use BitTorrent as well, such as increased download speeds, censorship resistance, etc. but we won't go any deeper.)

## Game Theory

The fundamental limitation of Peer-to-Peer networks is exactly their strength. That is, their key benefit is that they operate without a central authority.

That is also their biggest challenge. If we *don't* have a central authority (no whiteboard in a vault) how do we ensure the network isn't manipulated by nefarious actors?

If anyone can update the network, how to we prevent nodes from giving themselves huge bank balances with transactions created out of thin air?

This is where Game Theory comes into play. This problem is usually referred to as the Byzantine Generals Problem, which is based on a related (but simpler) problem known as the Two Generals Problem.
