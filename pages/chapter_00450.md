---
template: page
title: Blockchain 301
---

## Economics of Blockchain

The last point we made was that we not only have to make attacking our blockchain impractical, we also need to encourage people to participate at all. In fact, the number of participants in our blockchain network is one of the most basic measures of the health of the blockchain. A blockchain with participants is more vulnerable to attack.

## Proof of Work Mining

Bitcoin's Proof of Work protocol, in which miners process billions of disposable cryptographic hashing operations in a race to be selected to generate the next block, has a built in incentive: The winning miner gets newly minted [TODO: Check this] Bitcoin as a reward.

Losing miners get no rewards, but over time should win the number of blocks relative to their hashing power vs the network. That is, if a mining operating represents 10% of the total hashing power of the network, they should win 10% of the blocks over a larger timeframe.

These rewards offset the CAPEX and OPEX of the mining operations.

[TODO: Profitabilty vs price]
[TOOD: Difficulty adjustments, upcoming issues]

## Proof of Stake Baking

Although "baking" isn't the universally accepted term for Proof of Stake "mining" it is what Tezos uses and is the term that will be used here.

Baking fills the same role as mining: The creation of new blocks to encapsulate transactions and extend the blockchain. The economic incentive is the same as well: Successfully baking the next block includes rewards.

Tezos has a slightly different model:

While baking (and endorsing) *bonds* are captured by the network in order to de-incentivize [TODO: dis?] bad actors. These bonds can be forfeit if the node acts maliciously. On the other side of it, when these bonds are returned to the baker (unfrozen), they will have a reward added.

Current this reward is X% and this number will move towards zero as time goes on. The idea behind this *decrease* in rewards is that over time transaction fees will increase (due to increasing number of transactions in the network) and replace them. To incdentive early participation, baking includes a reward of newly created XTZ.

## Network Inflation

When people talk about mining and baking, there are often discussions of *inflation* and what economic effects this has.

Specifically, there tends to be concern about the inflation of cryptocurrencies. Is it harmful? Does it mean participants will lose value over time?

### Blockchain Inflation?

Inflation, when used in an economic sense, usually means the *decrease* of purchasing power over time due to the price of things increasing. That is, the $10k you put under your mattress today will be effectively worth less than $10k at some point in the future, because your rent, car payment and takeout food have all become more expensive.

Periods of economic turmoil aside, there tends to be, globally, a slow but steady increase in the price of things. Inflation is measured as a few percentage points per year in many countries that have otherwise normally functioning economies.

When it comes to blockchain, inflation has a specific, if somewhat related, meaning: Inflation is the increase of circulating cryptocurrency units over time, usually due to them being created as a side effect of baking or mining.

In other words, baking and mining often create new coins "out of thin air". For some spectators, this is troubling.

### Price and Market Capitalization

To understand what effect inflation can have on a cryptocurrency, we have to understand the two main measuring sticks we use to assess a cryptocurrency's value:

1. Price
2. Market capitalization

Price is straightforward. Prices are expressed in pairs, e.g., XTZ is worth 0.1 BTC. That means, in simple form, that we can exchange 1 XTZ for 0.1 BTC and vice versa.

Cryptocurrency is like fiat currency (e.g. USD) in that regard. It doesn't have an *absolute* value, but it has a value relative to other currencies and also relative to purchasable things.

For the sake of being thorough, we can argue that some currency-like things (e.g., gold) do have an absolute value since they themselves are intrinsically useful (gold is used jewelry and electronics). That is, if we didn't trade gold (and gold derivatives) we could still sell it. In contrast, if the world suddenly decided that USD had no value, it would be worthless. That sounds absurd, but there have been plenty of cases where hyperinflation has effectively caused a national currency to lose all value.

Market capitalization, on the other hand, is a little hazier. How we calculate it is straightforward: Current price x the total number of units in circulation.

When we talk about "market cap" we're often talking about the publicly traded stock of a company. If we create a fictitious company AweseomCo and issue 10000 shares at $100 each, then AweseomCo's market cap is $100 x 10000 = $1000000.

Market cap can be useful for comparing the value of two entities because share price is one-dimension. Imagine our rivals set up EliteCo and issue 1000 shares at $1000 each. If we look at share price, EliteCo is worth 10x what AwesomeCo is. If we look at market cap, we can say that the companies have exactly the same value.

But beyond that market cap gets pretty hazy. Market cap *only* means unit price x total number of units. What it *does not* mean include the following:

1. The total value of the company or asset
2. The "money in" of that asset

Market cap does not measure the value of a company since in order to realize that value, 100% of the stock of that company would have to be sold (and bought) which, due to market dynamics, would crash the price and the market cap along with it.

(An exception to that could be in the case of the sale of a company, though we are then talking about the sale price, even if that number happened to match its market cap.)

Nor does it represent the "money in" of that asset. If AwesomeCo's market cap doubles due to its share price reaching $200, that does not mean an additional $1M "flowed into" that asset.

While this may be Econ 101, it's important to keep these basic concepts in mind when discussing cryptocurrencies and their relatively values.

The crypto space in general puts a high value on the market cap of different cryptocurrencies and their relative rankings. In practice that mental model is too restrictive and limits conversations about what the future crypto market will look like.

It's common, for example, to hear things along the lines of Bitcoin could never be worth X because that would mean a market cap of Y where Y is usually over $1T.

But, again, a market capitalization of $1T *is neither* the value of the cryptocurrency, in any meaningful sense, nor does it mean $1T has flowed from some other market into the cryptocurrency market.

### Inflation and Price

One of the supposed issues with inflation is along the axis of market capitalization: That is, if AwesomeCo has a market cap of $1M &mdash; by extension is "worth" $1M &mdash; what happens if we issue more shares? Theoretically, our company is worth $1M so increasing our shares by 100% should cut our share price in half, yes? The math is $1M / 20000 = $50, correct?

No, not correct. Market cap is not an intrinsic value that the market will adjust price against. Nor does the inflation of a cryptocurrency mean each individual unit is losing value over time.

This error in thinking is probably a carryover from privately held companies, where an individual's share (say a founder or early employee) may be meaningfully diluted by the issuance of new shares, usually to new investors. In that case, they may end up with a significantly lower percentage of the company, which may mean less money in their pocket if the company is sold.

...

## Speculation vs Rewards

The first cryptocurrency markets were built solely on speculation. What had been missing for the average holder of cryptocurrency has been a mechanism similar to dividends, whereby long-term holders of an asset could enjoy the success of the underlying organization.

Proof of Work does not have any such mechanism, apart from people wanting to set up mining operations. This is complex and expensive and completely out of the question for most participants.

As Proof of Stake becomes more mainstream, this gap has been filled. With assets like Tezos' XTZ, which appreciate at a fixed rate, it's now possible for the average participant to be rewarded for simply holding an asset.

While speculation still plays a major role in these markets, additional avenues for ROI add depth to these markets and will attract new types of investors, which is positive for the market overall.
