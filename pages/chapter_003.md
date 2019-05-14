---
template: page
title: Blockchain 101
---

###The Foundations of Blockchain

Blockchains are built on three fundamental ideas or technologies:

1. Cryptography
2. Peer to Peer Networking
3. Game Theory

Like the Internet (a network of computers) and Computer Science in general, these are *relatively* new ideas (i.e., having been largely developed in the last few decades) (TODO: check this). 

In blockchain, these concepts have been combined in a unique way to solve a unique problem: How do we create a cooperating network, without a central authority, where the network may be unreliable and parts of the network may be hostile towards the whole!

More specifically, how do we create a public, shared resources (a ledger of transactions) that is secure from hostile actors without relying on centralization or privatization.

###Whiteboard Analogy

Imagine we are opening a bank.

In order to keep track of everyone's credits and debits, we're going to use a white board.

Because this white board represents millions or even billions of dollars, we have to ensure that no one modifies transactions they're not authorized to.

If everyone's transacvtions -- and therefore bank balance -- is on a whiteboard, the addition of a single "0" could make someone a whole lot richer.

####Private, Centralized Model

Because our ledger is so sensitive, we're doing to do the most sane thing possible: We're going to lock it in a vault and make sure only select people have access to that vault. If our vault is secure, our whiteboard is secure.

This works perfectly fine if everyone trusts the bank -- and trusts the bank not to raise fees to be unreasonable or to not deny banking to "undeseriable" people (where undesireable could mean someone who is against prevailing political opinions).

But what if we want to do the same without trusting the bank?

####Public, Decentralized Model

Now, if keeping billions of dollars worth of transactions on a whiteboard in a vault wasn't crazy enough, let's put the whiteboard *outside, in the bank's parking lot*!

Obviously this is crazy, now anyone can erase transactions, add zeros, do anything they want to anyone's account, including their own.

*But this is precisely what blockchain allows us to do.* Is it magic? Kind of.

It's a novel combination of our three fundamental ideas:

###Cryptography

Cryptography, precisely *Public Key Cryptography* is *already* the backbone of the Internet as we know it. Without Public Key Cryptography, there would be no HTTPS, no secure logins, no e-commerce, no Internet banking.

In short, Public Key Cryptography allows to to create a secret number (a private key) and *derive* a non-secret number (a public key) in such a way that we can encrypt a message with a public key &mdash; and that message can only be decrypted with the private key. 

(We can encrypt with a private key and decrypt with a public key, but that's usually called 'signing' and is used to prove ownership of a private key.)

What's more, we can easily derive a public key from our private key, but it's computationally infeasible to derive our private key from our public key. Mathematically, it involves prime numbers and is a type of one-way or trapdoor function. 

It works because it's simple to multiple numbers together, but on the other hand, it takes a *long time* to factor prime numbers, where *long time* can be billions of years.

Public Key Cryptography is used extensively in blockchain, with its most fundamental use being the derivation of keypairs for crypto wallets. A public key, in essence, becomes an address that coins can be sent to and the matching private key is the secret needed to send money *out of* that address.

###P2P

Peer to Peer networking is another foundational element to blockchain, with the main idea being that individual computers participating with a blockchain (nodes) are equal: There is (usually) no central node or authority.

Additionally, each node generally holds a complete copy of the list of transactions that the blockchain contains. 

This is somewhat similar to BitTorrent, where many nodes may have a complete copy of a pirated movie, each sending a piece of it to someone requesting that movie. By many nodes having a full copy of the movie, it muddies the legal waters to the point where it's infeasible to prosecute individual participants or shut them down.

(There are non-pirating reasons to use BitTorrent as well, such as increased download speeds, censorship resistance, etc. but we won't go any deeper.) 

###Game Theory

The fundamental limitation of Peer-to-Peer networks is exactly their strength. That is, their key benefit is that they operate without a central authority.

That is also their biggest challenge. If we *don't* have a central authority (no whiteboard in a vault) how do we ensure the network isn't manipulated by nefarious actors?

If anyone can update the network, how to we prevent nodes from giving themselves huge bank balances with transactions created out of thin air?

This is where Game Theory comes into play. This problem is usually referred to as the Byzantine Generals Problem, which is based on a related (but simpler) problem known as the Two Generals Problem.

###Two Generals Problem

![Two Generals Problem](/static/img/two_generals.png "Two Generals Problem")

The Two Generals Problem is a thought experiment that highlights the fact that communicating over an unreliable network makes coordinating or establishing common knowledge an unsolvable problem.

In other words, getting two computers to communicate over an unreliable or adversarial network (which describes any real world network) is an unsolvable problem. We simply *can't* make two computers know the same thing in an exacting way using a real world communication channel.

To illustrate this, we use the example of two generals that need to coordinate an attack (to happen at a precise time). If they attack at different times, they'll both fail. If they attack at the same time, they'll win.

To complicate things, the generals' messengers have to travel through enemy territory, which means their messages may be intercepted and never arrive.

When General 1 sends a messenger to General 2, General 1 won't know if that message arrived without an acknowledgement message from General 2.

The potential points of failure are now:

1. The message never arrives
2. No acknowledgement comes because the message was intercepted
3. No acknowledgement comes because the *acknowledgement* was intercepted

Simply sending redundant messages or extra rounds of acknowledgements won't solve the problem, since any message may be lost in transit.

Since there is no absolute solution, the problem then becomes one of achieving a degree of certainty. If we were to, say, send 100 messages simultaneously, the likelihood that one message and one acknowledgement make the round trip should be significantly higher than if we just send one.

We can never be absolutely certain, though we can achieve an acceptable degree of certainty, depending on our requirements. This probabilistic approach will become more critical as we expand this thought experiment.

###Byzantine Generals Problem

The Byzantine Generals Problem expands upon the Two Generals Problem to consider how a network of computers (usually more than two) may decide on the current state of the network while assuming it may have incomplete or incorrect information about the state of any individual computer.

In the case of a blockchain network, we usually add that one or more individual computers may be purposefully giving false information.

If a system cannot adequately recover from this uncertainty, it is said to be in *Byzantine fault*. If it can, it is said to be *Byzantine fault tolerant*.

In the general sense, a Byzantine fault is framed as a system failure resulting from a network state where parts of a network may be in a failure state *while appearing to be operating correctly*. That is, not only may the state of the network may be inconsistent, but knowledge of that inconsistency may be uncertain.

In order to deal with this uncertainly, a network has to have a predefined set of rules for reaching *concensus* of the state of the network and its individual components.

In this new thought experiment, the number of generals deciding on a plan of attack increases from two to many (let's say 11) and the decision expands from coordinating an attack to coordinating either an attack or retreat. 

Again, if the general do not act in concert, they will all be destroyed. To complicate things even further, some generals may be traitors!

To maximize chaos, bad generals can vote selectively, e.g., if the vote is split 5 and 5, they can send an 'attack' vote to the attacking generals and a 'retreat' vote to the retreating generals, thereby making both sides believe they have a majority vote.

<div class="aside">
<p><strong>Hostile networks</strong></p>
<p>It's worth noting that BFT was first formulated when the networks in question were likely to conspire against themselves through errors alone. That is, there weren't really hostile actors, but de factor conspiracies to take down the network may arise due to multiple failures within that network.</p>

<p>An example of a conspiring network could be a vehicle control system with faulty sensors.</p>
</div>

####Solutions

Solutions are complex and depend entirely on the problem at hand, but in general we find similarities along the lines of:

1. Requiring some form of majority (e.g., 2/3 of all nodes must agree)
2. Using cryptography to make messages unforgable
3. Using statistical approaches (e.g., sending messages more than once)

In the blockchain space, we find a number solutions, starting with Bitcoin's PoW.

####BFT algos in blockchain

While we won't go into Proof of Work in depth here, the anonymous creator of Bitcoin, Satoshi Nakamoto, was the first to formulate a Byzatine Fault tolerant protocol in the context of "digital money", that is, how could we build a decentralized network that could securely represent transactions that couldn't be tampered with or forged?

In this case, an economic disincentive was introduced (a feature all blockchain protocols share [TODO: Check this]) that made it infeasible, or too expensive, to attack the network.

By requiring large amounts of computing power to participate in the network, it made attacks too expensive or impractical to execute.

<div class="aside">
<p><strong>51% attacks</strong></p>
<p>While it may be the case that acquiring 51% of the computing, or hashing, power of the Bitcoin network may be impractical, these so-called 51% percent attacks have been successfully used on other, smaller, blockchains.</p>
</div>

The largest downside to Proof of Work systems is the large amount of computing power that is *wasted* by design, by the participants. That waste manifests in hardware CAPEX, hardware depreciation and electricity and storage costs.

Bitcoin mining operations cost a lot, take up a lot of space and waste a lot of electricity.

####Consensus Protocol in Tezos 

Tezos, having been conceived of after Bitcoin, chose another BFT protocol &mdash; Proof of Stake. Proof of Stake has a similar economic disincentive that makes it too expensive or impractical to attack the network, but it does not share Proof of Work's extreme inefficiency.

There are other benefits to Tezos' particular style of Proof of Stake, which we'll get into in following chapters.

###Consensus Protocols in General

It's worth pointing out blockchain protocols can vary widely in their operation, but they must share the following characteristics:

1. Provide a single version of truth without a central authority
2. De-incentivize bad actors, making attacks impractical
3. Incentivize participation of good actors

[Satoshi's original email about BFT and PoW](https://www.mail-archive.com/cryptography@metzdowd.com/msg09997.html)


