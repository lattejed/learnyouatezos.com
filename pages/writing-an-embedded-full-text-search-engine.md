---
template: post
title: Writing an Embedded Full Text Search Engine
date: 2015-10-06
---

**Note: While this monster post might be of interest to anyone working on full text search, I no longer recommend the approach outlined here. 1) In practice, Levenshtein indexes don't give a real advantage vs a properly implemented n-gram index. 2) Levenshtein indexes, even using the technique below, take up too much space. 3) LevelDB isn't a good choice for this**

I'm currently working on a project and had the opportunity to write an embedded search engine for it. I say opportunity because this is the kind of project that is lots of fun and would be a hard sell to a team. That is, even though there isn't a go-to embeddable search engine, one could almost certainly be put together with existing libraries at a much higher level than how I wrote this one. SQLite, for example, which is more or less the go-to DB for apps, has support for full text search. Apple has SearchKit, which is far from complete or easy to use, but nevertheless would likely be much faster than writing something from scratch.

From scratch is a very nebulous phrase in software development since it's exceedingly rare to write something that isn't built on a whole lot of other, preexisting stuff. This project is no different and while it's about as low level as you'd want to get when writing a search engine, it is based on a set of libraries, most notably LevelDB and ICU. LevelDB is an embedded key-value store that is tiny and fast and has a good pedigree. Like SQLite, LevelDB does not run as a separate process and does not have a client-server model. It gets compiled into your app. Hence the embedded part. ICU is the de facto standard for dealing with Unicode -- dealing with things like text tokenization in problematic languages like Chinese as well as Unicode normalization and a host of other things.

So I didn't really start from scratch. I started from a sane set of base libraries. From there however it's still a lot of work to build something that can store and search a set of documents. Before I get into the how I should take a moment to address the why.

### Why Build a Search Engine from Scratch?

This is a great question. The high level answer is that I want an end result that is blazingly fast and very accurate. I want something lightweight enough that it can run on OS X as well as iOS or other mobile devices. Now, as a software engineer, I have to be able to answer the question, "Is alternative X or Y lacking in any measurable way that is relevant to the application at hand?" The problem with that is it's not possible to benchmark a piece of software that hasn't been written yet so I can't say if this approach is better than using SQLite or SearchKit. While I could have tested the performance and features of SQLite and SearchKit, the reality is that I decided to write one from scratch for this project for emotional reasons -- because I wanted to. When this is production-ready it certainly will be interesting to benchmark it against something like SQLite.

### High Level Design

So what is a full text search engine? The goal is to end up with a black box that contains a bunch of documents that can be queried for a word or a phrase. The simplest approach would be to have a set of documents on disk (or in memory) and go through them one by one, breaking them into terms and checking if our search term matches any of those. In essence that's what every search engine does except that practical designs will do a lot of pre-processing to speed up that matching.

A more usable design will take pieces of the documents and create one or more indexes. These indexes are shortcuts -- a manifestation of the ability to trade off between processing time and disk space. The most basic index for full text search would be a word index (in this context usually called an inverted index) -- a list of words that point to the documents that contain them. Here we take up some more space (size of documents + size of word index) but gain the ability to scan through a smaller list of words (alphabetized, duplicates and unimportant words removed) to find matches. Instead of searching all of the documents for the word "beautiful" we search the index for the word. We can then fetch the set of documents with the word "beautiful" in them and do some other stuff to decide if those documents are the ones we want or not.

If all we want to do is find exact matches, we're actually most of the way there. This very simple index will allow us to find documents with the word "beautiful" in them if the following conditions are met:

* The word beautiful is spelled correctly as a search term.
* The word beautiful is spelled correctly in the document that contains it.
* The word beautiful doesn't have a prefix or suffix, e.g., "beautifully".
* The word beautiful was tokenized properly (related to #3).
* And others...

The point is this type of all or nothing term search is exceedingly fragile when dealing with human language and human operators. To improve on this, we'll need some manner of approximate or "fuzzy" matching of terms. When we're talking about matching terms based on similarity we're usually going to look at some type of edit distance, like [Levenshtein distance](https://en.wikipedia.org/wiki/Levenshtein_distance) (which is what we will eventually use here), but there are interesting alternatives such as [cosine similarity](http://blog.nishtahir.com/2015/09/19/fuzzy-string-matching-using-cosine-similarity/). Regardless of how we determine it, we're calculating how similar our search term is with the terms in each document. For example the words "that" and "than" have a Levenshtein distance of 1 (one substitution) and a cosine similarity of ~0.8164 (a score of 1 meaning identical, 0 meaning no similarity). What we consider "close enough" is an arbitrary threshold.

A naive "fuzzy" approach would be to calculate the edit distance of our search term against each word in our index. Again, this will be slow as we'll be spending most of our time comparing words that have little or no similarity. While not as bad as testing every word in every document, it's still far from ideal. We could try to speed this up by doing things like only testing words that share a common prefix, but there are plenty of cases where that will fail, such as a spelling error in the first few letters of a word. If we want something more robust we're going to have to get more creative.

### Precomputed N-Gram Index

Since we want to trade disk space for processing time, we want to do as much of the work required for searching ahead of time as possible. That will lead us to an index that is larger and more complex. One of the more common types of precomputed indexes is an n-gram index. N-grams (unigrams, bigrams, trigrams, ..., 25-grams, ...) in this case are our words broken into groups of n letters. Our word "beautiful" could be broken into the trigrams, "bea", "eau", "aut", "uti", etc. What n-grams allow us to do is search for partial word matches. We'll end up fetching a lot of unrelated words (there's an "aut" in "flautist") but the total number will probably be a reasonable amount to do another round of testing for a match (such as calculating cosine similarity). N-grams are neat. They're almost an ideal, universal solution to our problem and they're conceptually very simple.

Where they fall down, however, is their ability to deal with incorrect spelling. It's fairly likely that two words can be similar (in terms of their edit distance) but have zero trigrams in common. (For reasons beyond the scope of this, n-grams for partial word matches are almost always trigrams.) An example would be ["vodka" misspelled as "votka"](http://ntz-develop.blogspot.com/2011/03/fuzzy-string-search.html). The Levenshtein distance is 1 but no trigrams match between the two. Since this is going to fail often (I don't have any numbers for this but I think it's a reasonable assumption that it's significant) we're going to have to keep looking.

### Precomputed Levenshtein Index

Since Levenshtein is the go-to measure of string similarity, it kind of makes sense to combine that with the concept of indexing. The question is how. We could pre-compute "Levenshtein variations" of words but that's probably going to be zillions of words, right? Right. The problem here is edit distance encompasses all transpositions, insertions, deletions and replacements of letters in a word. For the [English alphabet and a word 9 letters long, we're looking at over 110,000 possible combinations](http://norvig.com/spell-correct.html). That's bad enough but if we get into languages with larger alphabets, like Chinese, we're talking absolutely enormous indexes.

This is where I got stuck for a bit. I felt like I was on the right track but I didn't know how to solve this particular issue. Then I found [this blog post about a similar approach](http://blog.faroo.com/2012/06/07/improved-edit-distance-based-spelling-correction/) where they addressed the index size issue. Bingo! It's always humbling when someone beats you to the punch but at the same time it's nice to have a solution present itself.

The basic concept here is instead of pre-calculating all possible Levenshtein variations of word, we only calculate the variations created by deleting letters from a word. The number of variations then is a number much smaller, for our purposes practically so. How does that work? How can we ignore insertions and everything else? The trick is to also calculate the deletion variants of our search term and then query each of those terms against our index. This is actually equivalent to querying a single term against a full Levenshtein index. For further reading, [a similar approach is described here](http://fastss.csg.uzh.ch/).

The stated way to calculate the number of variations is:

* x = n for an edit distance of 1
* x = n * (n-1) / 2 for an edit distance of 2
* x = n! / d! / (n-d)! for edit distances > 2

Where n is the length of the word and d is the edit distance. For our 9 letter word above, we're looking at 45 combinations for the same edit distance. Much better than 110,000!

For the record, the [above calculation](http://blog.faroo.com/2012/06/07/improved-edit-distance-based-spelling-correction/) isn't 100% correct. Since we're going to be discarding duplicate variations (of the same word) we're going to end up with a smaller total number. Duplication happens when we have repeated letters in a word (the two l's in "hello") for example. That's actually good news since the fewer terms we have in our index the better. It should be kept in mind however if trying to determine the total number of variations programmatically for some purpose, such as allocating memory.

### Edit Distance

We should talk about edit distance for a moment. We're going to want to find a "Goldilocks" edit distance -- one that gives us enough variations to be usable without generating an index that is too large to be practical. If you remember the note about trigrams above, you can guess that this magic number is going to be 3. When we're dealing with the individual letters of a word, two seems to be too few (generates too many matches) and four seems to be too many (generates too few matches). In terms of handling misspellings we're ok too. According to [this informal study, over 98% of all spelling errors are within edit distance 2 or less](http://norvig.com/spell-correct.html). So we're going to end up building our Levenshtein index with an edit distance of 3. Of course, since the universe is cruel, this will lead to its own problems.

### Levenshtein Index Problem

While this approach is robust it's not without its own issues. Or, rather than blame the technique, let's say that we expect too much of it. In a practical search engine (especially one that's going to give suggestions on the fly) we're likely going to want some form of prefix matching. That is, as we type "tre" we're going to want to know if the word "trepidation" is in our search index (and in our documents). A Levenshtein edit distance of 3 is going to break down with words greater than length 6, since removing 3 letters from these words will never leave us with just the first 3 letters.

One approach could be to store a separate prefix index along with our Levenshtein index (or, more likely, combined with). The problem with that, apart from the fact that it feels like a band-aid, is that it will break down if there's a misspelling in the prefix. Again, not robust enough.

Another approach would be to extend our edit distance to accommodate a three-letter prefix. That is, we're going to calculate an edit distance, per word, of word length - 3. For our 9 letter word above, we're going to calculate an edit distance of 6. Using our calculation above, we find that the number of combinations for edit distance 6 is 465. While that's not too scary by itself, that's an order of magnitude higher than an edit distance of 3. Multiply that by all of the words in our index and we're going to end up with something too large to be practical.

So, what can we do? I ended up using a what I consider to be a clever trick. Since we want to ensure that we're storing the first three letters of every word, we can simply treat each word (over 6 letters) as two words. The first word is the entire word, regardless of the length. The second word is the first 6 letters of the word. We then combine these into one set (removing duplicates). While I've forgotten the exact increase in index size that I saw using this technique (IIRC it was around 30%), it was well within what's acceptable for this application. In essence we've given higher weight to the beginning of the word. In practice we're now going to be able to match "tre" against "trepidation" without having to use an edit distance as high as 8.

### Storing Our Index and Documents

To index a set of documents using this technique, we're actually going to have to create two indexes. The first index will be a list of our Levenshtein variations of a word that maps to a set of words, since a variation may map to more than one word at a time. The second index will be those words mapped to document ids. A third layer will be document ids to documents. We're not going to call that an index, although since everything here is a set of a values mapped to keys, the distinction is arbitrary.

* aut -> [beautiful, flautist, ...]
* beautiful -> [doc_1, doc_9, doc_31, ...]
* doc_1 -> The beautiful girl rapidly typed on the screen of her phone ...

Now that we know how to generate our index, we need to think about storing it on disk. This is where LevelDB comes in. Again, LevelDB is a key value store. That's as simple as a DB can get (and is what you'll find under the hood of more complex databases). LevelDB allows us to store bytes by some manner of key, which are just more bytes. Like magic, it also allows us to retrieve bytes by a given key, provided it exists.

There's not much point in going into the details of how LevelDB works now, but it's an interesting topic. In short, LevelDB was written by some Googlers, loosely based on Google's internet-scale BigTable. Although I'm not going to link benchmarks here, it's fast, likely due to a combination of good design and simplicity. It's an ideal fit for what we're doing here, since we don't need anything more complex than a key value store. So far our database is just three "tables", a table that stores our documents and our indexes. Having said that, these aren't actually tables as LevelDB has no concept of them.

You could separate data by creating separate database instances, but it's not required nor recommend to do so. What they do recommend is to add namespaces to keys so data with similar roles will be in contiguous blocks. That can be as simple as this:

* 000_aut -> [beautiful, flautist, ...]
* ...
* 001_beautiful -> [doc_1, doc_9, doc_31, ...]
* ...
* 002_doc_1 -> The beautiful girl rapidly typed on the screen of her phone ...

Not only is LevelDB not a relational database, it's not even a document-based database. That means if we want to store anything more complicated than a single value we're going to have to serialize and deserialize the data ourselves. That may seem tedious but it does mean we can make sure we're not wasting CPU cycles or disk space marshaling objects in a way that's more complex than we actually need. We wanted something that's close to the metal, so that's what we've got. I won't go into the details of what I did in this case other than to say that you're likely to want to use some manner of delimited values. If you don't want to go that low level, you could certainly use something like JSON or Google's protocol buffers.

### Querying Our Index

Now that we've got our index and documents on disk, we can start querying them. Like was stated before, we're going to need to calculate the Levenshtein variations of our search term (for an edit distance of up to 3) and then match each of those against our index. That means, yes, for a 9 letter word we're going to have to hit the database 45 times. Luckily our database is fast and this is actually OK in practice. Also, most of our querying is going to happen with a 3 letter prefix, for which we'll need to calculate an edit distance of zero (no variations) before testing our index. Similarly, a 4 letter term will only need an edit distance of one. In other words, our most common operations will have the least amount of complexity. A nine letter word is more towards the "worst case" end of the spectrum.

So what do we get when we run the query? We get all words that contain our search term variations. A simple example:

* Search term "this".
* Variations of search term: "this", "his", "tis", "ths", "thi".
* Words retrieved: "this", "his", "thine", "history", "thick", etc.

The members of the index we retrieve will look something like this:

* his -> [his, history, this, ...]
* this -> [this, ...]
* thi -> [thick, this, ...]

If you look at those results you'll see something interesting: the word "this" is the most common word to appear on the right hand side. In fact, we can -- and will -- use that to rank our results. That won't be the only way we score the results, but that will get us most of the way to determining what the intended word (exact match or not) most likely was.

### Ranking Results

* Right hand side word count.
* Edit distance.
* Length of common prefix.

The edit distance in this case is the edit distance of the Levenshtein variation to the original indexed word. The length of the common prefix is unrelated to anything we've discussed so far. We calculate that by counting how many letters, starting from the beginning of the word, are shared between the Levenshtein variation and the original word. This allows us to give extra weight when scoring words that, you guessed it, share a common prefix. Again, using this was empirically arrived at as it's more natural to rank words that have the same first few letters (or root) higher than others.

I won't go into details of how these individual elements are used to calculate word score. It's not a secret or anything but I wouldn't want to rob you of the joy of figuring it out (what works for your particular application) should you go down this road yourself. In a large, complicated topic, it's one of the fun parts.

### Ranking Documents

Because writing a search engine is hard, this is only going to get us part of the way there. This will allow us to figure out which word(s) were most likely meant by our querying user (incorrect spelling or not) matched up to the documents that contain those words (again, regardless of spelling or variation). Now, we're going to have to rank the resulting documents to determine which are most relevant to the query.

I should also point out that we're likely going to want to search for phrases instead of just single words. While I'm not going to directly address that here for the sake of brevity, the techniques we're outlining here form the base that phrasal search can be built on.

When we rank documents the first thing we're likely to do is some form of counting term frequency. This is a whole topic unto itself but the end result is we're most likely to end up calculating some form of tf-idf or term frequency-inverse document frequency. The basic idea here is that the more times a word appears in a document, the more relevant that document is to that word (from a query). But since that makes common but unimportant words rank very high (e.g., the word "the") that frequency is penalized by how often the word appears across the set of all documents. Using td-idf we can rank documents relevant to the query "the automobile", picking out those with "automobile" in them while ignoring documents with the word "the" in them.

### Stop Words, Canonicalization

Backing up a bit, it's worth pointing out that ignoring unimportant words is a critical part of indexing and querying documents like we're doing here. One of the most common ways of dealing with this is to use a list of so-called "stop words" to ignore words that aren't considered relevant to a meaning of a document or a query. In English stop words will likely be articles, adverbs, etc and words that are rarely considered stop words will be proper nous, etc.

Very closely related to this is a technique called stemming. Stemming is the process of canonicalizing groups of related words to a single form which makes searching more accurate (and reduces index complexity). An example would be the words "real" and "really" being mapped to the single word "real". Since these words are closely related, it's best to treat them as a single word. Again, that decreases the complexity of our index and also makes searching more robust, as searching for either "real" or "really" will bring up documents with either word in them. In English, it's common to use a Porter Stemmer, which is an algorithm first conceived by, you guessed it, Porter, for reducing related English words to common forms.

Now that we've gone over the use of stop words and stemming, we can go over why we're not using either of these techniques here. The biggest problem with stop words is that they need to be managed per-language. For an application that should handle English as well as Chinese or Hebrew, it's going to be a real pain to track down and manage word lists for all languages your application will likely encounter. There's also the issue of language detection and documents containing more than one language.

Similarly, stemming is language specific. Porter's stemmer is English only. For each additional language we're going to have to find another method, or skip it entirely. Of course, this type of canonicalization might not be needed for all languages, but the issue with language detection above still applies.

Luckily, with our current design, we can just leave these things out. One of the additional benefit of our Levenshtein index is that it's word form-agnostic. Along with dealing with spelling errors, we get matching of different word forms for free. Similarly, instead of directly dealing with stop words -- managing words by their importance relative to the meaning of our documents and queries, i.e, ranking documents by tf-idf, already accounts for this. In fact, although somewhat off topic, it's entirely possible to generate lists of stop words (for any language) using tf-idf. In a sense, anything below a certain (arbitrary) tf-idf score is treated as a stop word.

### TF-IDF

I won't go into implementing tf-idf in too much detail other than showing one of the more common ways to calculate it. A common way to calculate tf-idf is the following form:

* tf(t) = how many times t appears in the document / total number of terms in the document
* idf(t) = log( total number of documents / number of docs containing term t )
* tfidf(t) = tf(t) * idf(t)

The use of the natural log in #2 is somewhat arbitrary and just one of the many weighting schemes used. This may have to be tuned to the application at hand. Although tf-idf is a workhorse metric, it's interesting to note that there has yet to be a theoretical explanation for its effectiveness. It's loosely associated with Zipf's law but otherwise doesn't have much in terms of a foundation, probabilistic or otherwise.

### Closing the Loop

We can close the loop now. At a high level:

* Calculate the Levenshtein variations of our search term (if needed).
* Check the first index for those term(s).
* Rank those terms for relevance, discarding those below a certain threshold.
* Match those terms to documents via the second (word) index.
* Rank those documents by td-idf, discarding those below a certain threshold.
* Present documents to user.
