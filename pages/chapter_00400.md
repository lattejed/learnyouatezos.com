---
template: page
title: Blockchain 201
---

## Two Generals Problem

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

## Byzantine Generals Problem

The Byzantine Generals Problem expands upon the Two Generals Problem to consider how a network of computers (usually more than two) may decide on the current state of the network while assuming it may have incomplete or incorrect information about the state of any individual computer.

In the case of a blockchain network, we usually add that one or more individual computers may be purposefully giving false information.

If a system cannot adequately recover from this uncertainty, it is said to be in *Byzantine fault*. If it can, it is said to be *Byzantine fault tolerant*.

In the general sense, a Byzantine fault is framed as a system failure resulting from a network state where parts of a network may be in a failure state *while appearing to be operating correctly*. That is, not only may the state of the network may be inconsistent, but knowledge of that inconsistency may be uncertain.

In order to deal with this uncertainly, a network has to have a predefined set of rules for reaching *consensus* of the state of the network and its individual components.

In this new thought experiment, the number of generals deciding on a plan of attack increases from two to many (let's say 11) and the decision expands from coordinating an attack to coordinating either an attack or retreat.

Again, if the general do not act in concert, they will all be destroyed. To complicate things even further, some generals may be traitors!

To maximize chaos, bad generals can vote selectively, e.g., if the vote is split 5 and 5, they can send an 'attack' vote to the attacking generals and a 'retreat' vote to the retreating generals, thereby making both sides believe they have a majority vote.

<div class="aside">
<p><strong>Hostile networks</strong></p>
<p>It's worth noting that BFT was first formulated when the networks in question were likely to conspire against themselves through errors alone. That is, there weren't really hostile actors, but de factor conspiracies to take down the network may arise due to multiple failures within that network.</p>

<p>An example of a conspiring network could be a vehicle control system with faulty sensors.</p>
</div>

## Practical Solutions (PoW & PoS)

Solutions are complex and depend entirely on the problem at hand, but in general we find similarities along the lines of:

1. Requiring some form of majority (e.g., 2/3 of all nodes must agree)
2. Using cryptography to make messages unforgable
3. Using statistical approaches (e.g., sending messages more than once)

In the blockchain space, we find a number solutions, starting with Bitcoin's PoW.

Whereas BFT was originally formulated in networks where the conspiring may be de-facto and related to failure, in the case of blockchain we are primarily guarding against actual conspiracies to steal value or create chaos.

That is, we're designing systems that can deal successfully with *actual* bad actors -- nefarious crypto hackers who attempt to (and sometimes do) steal millions of dollars in crypto assets.

The most frequently used protocols in blockchain today are Proof of Work (like Bitcoin) and Proof of Stake (like Tezos). While they are very different in operation, they both are designed with the same end goal: To make these networks Byzantine fault tolerant.

Where they are similar is this: They both, in essence, make it too expensive for individual participants to act in bad faith and "take over" a network.

### BFT algos in blockchain

While we won't go into Proof of Work in depth here, the anonymous creator of Bitcoin, Satoshi Nakamoto, was the first to formulate a Byzatine Fault tolerant protocol in the context of "digital money", that is, how could we build a decentralized network that could securely represent transactions that couldn't be tampered with or forged?

In this case, an economic disincentive was introduced (a feature all blockchain protocols share [TODO: Check this]) that made it infeasible, or too expensive, to attack the network.

By requiring large amounts of computing power to participate in the network, it made attacks too expensive or impractical to execute.

<div class="aside">
<p><strong>51% attacks</strong></p>
<p>While it may be the case that acquiring 51% of the computing, or hashing, power of the Bitcoin network may be impractical, these so-called 51% percent attacks have been successfully used on other, smaller, blockchains.</p>
</div>

The largest downside to Proof of Work systems is the large amount of computing power that is *wasted* by design, by the participants. That waste manifests in hardware CAPEX, hardware depreciation and electricity and storage costs.

Bitcoin mining operations cost a lot, take up a lot of space and waste a lot of electricity.

### Consensus Protocol in Tezos

Tezos, having been conceived of after Bitcoin, chose another BFT protocol &mdash; Proof of Stake. Proof of Stake has a similar economic disincentive that makes it too expensive or impractical to attack the network, but it does not share Proof of Work's extreme inefficiency.

There are other benefits to Tezos' particular style of Proof of Stake, which we'll get into in following chapters.

## Consensus Protocols in General

There are also a number of other Proof of X protocols, but we won't go into them as they're not very widely used.

It's worth pointing out that while blockchain protocols can vary widely in their operation, but they must share the following characteristics:

1. Provide a single version of truth without a central authority
2. De-incentivize bad actors, making attacks impractical
3. Incentivize participation of good actors

This last point may be overlooked. We not only have to thwart bad actors, we need to attract *good* actors to participate in our blockchain, otherwise there won't be anything to hack!

[Satoshi's original email about BFT and PoW](https://www.mail-archive.com/cryptography@metzdowd.com/msg09997.html)
