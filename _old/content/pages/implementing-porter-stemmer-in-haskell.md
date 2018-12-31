+++
title = "Implementing Porter Stemmer in Haskell"
date = "2013-06-10T20:14:43+07:00"
aliases = [
    "/pages/005-implementing-porter-stemmer-in-haskell.html"
]

+++

I recently started learning Haskell. Like many programmers who get interested in the language I've spent as much time studying the language as I have trying to find an excuse to actually use it. It's a somewhat difficult language to learn -- at least if you haven't worked with functional programming before -- and it's not really a go-to language for most situations. Finding a reason to use it can be challenging.

My answer to this has been to work on projects that don't have an immediate application. For reasons I won't bore you with, I decided to (re)implement Porter's stemming algorithm. The point of a stemming algorithm is to reduce words to common roots, which is often used as a pre-processing step when building a search engine or doing other NLP work. For example, the words "stemmer", "stemming", "stemmed" are all based on "stem" and share a common meaning. Reducing these words to their root, "stem", makes processing them further a lot easier.

Porter's English word stemming algorithm is described [here](http://tartarus.org/martin/PorterStemmer/def.txt) and there's a Python implementation [here](https://hkn.eecs.berkeley.edu/~dyoo/python/py_lovins/porter.py) and a Haskell implementation [here](http://tartarus.org/martin/PorterStemmer/haskell.txt). I'm so new to Haskell (and functional programming) that I wanted access to both the original paper, a version in a language I'm familiar with as well as something in Haskell. Having said that, after I worked on this algorithm for a while it became apparent that working from the Python version was actually a hindrance compared to just working from the paper. Since our functional approach will be so different from our imperative approach, one doesn't really inform the other.

### A Tiny Bit About Haskell

Haskell is a purely functional language. Purely functional means that the functions are pure in a mathematical sense. They're free (with some exceptions) from side effects. If you give a Haskell function a given input, it will always return the same output. Functions are also first class and the main control structure used in the language. It's not a stretch to say that everything is a function in Haskell. Haskell is lazy. An infinite list in Haskell is valid. That's made possible by lazy evaluation, i.e., the nth value of a list isn't "created" until it's needed.

Haskell lacks a lot of the stuff you're familiar with if you're coming from an imperative background. For control flow there are conditionals but no loops. If you need to do something repeatedly you'll generally use a recursive function or operate on a list. Haskell doesn't have mutable variables (well it does, but not by default) -- with some exceptions, it doesn't have state. Again, to do most things in Haskell you do so without any mutable state. No local variables inside functions to hold intermediate values (or examine them). No variables further up in scope to hold values between function calls. It's a mad, mad world.

So why Haskell or functional programming in general? Well Haskell's purity makes it much easier to write bug-free code and write tests for that code. Functions are black boxes that can be tested without elaborate setup or teardown. They can be tested in isolation and will operate the same when working with the rest of the program. Having no side effects has its advantages. It's also a terse language. While it's debatable that writing less code (to do the same thing) makes anyone more productive, it is, at least for me, better to write and read terse languages.

I've only scratched the surface here. For a more eloquent and informative overview of the benefits this is a good place to start. While we're talking about learning materials, I can't recommend [Learn You a Haskell for Great Good](http://learnyouahaskell.com/) enough. It's humorous and dare I say beautifully illustrated -- at least if you like the doodles of people who are obviously too smart for their own good.

### Let There Be Stems

Enough bs. Let's write some Haskell. The Porter Stemmer algorithm kind of breaks down like this: We make some definitions (such as what's a consonant or a vowel, how many consonant sequences a word has) and then we apply a series of rules to our word to get its stem. I started with our definition of a consonant and vowel. From the paper, we define them as such:

> A \consonant\ in a word is a letter other than A, E, I, O or U, and other than Y preceded by a consonant.
From our Python implementation, this definition is handled like this:

```python
def cons(self, i):
    """cons(i) is TRUE <=> b[i] is a consonant."""
    if self.b[i] == 'a' or self.b[i] == 'e' or self.b[i] == 'i' or self.b[i] == 'o' or self.b[i] == 'u':
        return 0
    if self.b[i] == 'y':
        if i == self.k0:
            return 1
        else:
            return (not self.cons(i - 1))
    return 1
```

This is pretty straightforward. Our function cons returns True (or 1 in this case) if b (our word as a string in an instance variable) at the index in question is in the set "aeiou" or is both 'y' and the preceding letter is not in the set "aeiou". This function isn't particularly elegant but it's easy to understand and it gets the job done. Vowels then are anything where cons returns False.

There are a couple of problems here for the beginning Haskeller. We don't have our instance variable b for one. The other isn't a problem as much as it is a style or philosophy issue. I think you could argue that accessing lists by index isn't very Haskelly. We have an operator for it, !!, but using it means bounds checking and passing our index along with our string to the function. While this is certainly possible (the Haskell implementation listed here does it exactly that way) I wanted to find a solution that felt more natural in the context.

My only functional background comes from using the functional features present in Python. Specifically I'm comfortable with list comprehension as well as "decorating" values (in a way similar to the decorate-sort-undecorate pattern in Python) in tuples and "zipping" lists. In this case we want to not only figure out if the characters in a word are vowel or consonants, we're going to want to look at the patterns of vowels and consonants that exist in a word. This will be useful later in the algorithm. Given this, it seemed natural to figure out the entire word at once and keep that pattern as a string in a tuple along with our original word.

In Haskell I came up with this:

```haskell
-- Make a pattern to match the consonants and vowels in a word where a cons is 
-- not "aeiou" or y preceded by a cons e.g., "happy" -> ("happy", "cvccv")
wordDesc :: String -> (String, String)
wordDesc str = (str, [corv (a,b,i) | (a,b,i) <- zip3 str (rotateR str) [0..len]])
    where len = length str - 1
          corv (a,b,i)
            | a == 'y' && i /= 0 && b `notElem` vs = 'v'            
            | a `elem` vs = 'v'
            | otherwise = 'c'
            where vs = "aeiou"
```

The first interesting bit here is `wordDesc :: String -> (String, String)`. This is our function's type declaration. These are optional but considered good practice. If we don't explicitly define it, the compiler/interpreter will figure it out for itself. In this case, it says that we're going to take a String and return a tuple `(String, String)`. Our first string will be our original word, unchanged, and our second will be the matching pattern of consonant or vowel definitions. If we called it with "tree", it would give us ("tree", "ccvv"), since our consonants are "tr" and our vowels "ee".

The meat of this function is the list comprehension `[corv (a,b,i) | (a,b,i) <- zip3 str (rotateR str) [0..len]]`. This might be a bit confusing if it's new to you. It's of the form `[val | val <- list]`. This is very similar to `[val for val in list]` in Python. Our list in this case is actually three lists zipped together, `zip3 str (rotateR str) [0..len]`: Our original list (our string), that list rotated one letter to the right and the list 0 to the length of our word (less one since we're zero indexed).

The first list is obvious, but what are the other two lists for? In the case of a 'y' we have to look at two things: the preceding letter (whether or not it's a consonant) and the index of our 'y'. If our 'y' isn't at the start of a word and has a consonant before it, then it's a vowel for our purposes. Since I didn't want to pass an index into this function I decided to look at the current letter and the previous letter simultaneously. Rotating the list one letter to the right "lines up" our current and previous letters and in this case makes them available in the variables a and b. We still ended up needing that index to check if we're looking at our first letter or not. Not wanting to belabor the "no index" edict any further I zipped in a list of index values for that purpose. There is likely another, non-indexed, way to do this but I decided to make a concession and move on. Since we only have index values that match our actual string, we don't have to worry about bounds checking at least.

The pipes in our function definition are called guards. They're one way Haskell allows us to define conditional statements. The guards are evaluated in order and the provided value is assigned for the first condition that evaluates as true. The otherwise statement is mandatory and defines our default value. There where constructions allow us to define parts of our main function separately to improve readability. In this case we're defining len (the length of our string, zero-indexed) and corv, which returns a 'c' or a 'v' based on the criteria that we've defined.

Our rotateR function is simply:

```haskell
rotateR :: [a] -> [a]
rotateR [x] = [x]
rotateR xs = last xs : init xs
```

There are some other interesting Haskell bits here. First our type declaration is the variable a instead of a defined type. These are called "type variables" in Haskell. Our declaration here states that we'll take a list of type a and return a list of that same type. For our purposes, we could have used the declaration `rotateR :: String -> String`. Using type variables makes the function more generic.

The other really interesting thing going on here is called pattern matching. Pattern matching in Haskell allows us to create a set of functions that share a type declaration (and a name) but can return different results based on different attributes of the arguments they're called with. If we call our `rotateR` with a list of length one (defined as `[x]` here) we'll just return the list unchanged, since a list of length one, rotated, is itself. If we call it with a list of length > 1, we'll actually rotate it. The variable xs in this case means any list. Since the pattern matching is attempted in descending order, our first function will catch all lists of length one and our second function will catch all other lists. This is powerful stuff and makes it very easy to implement recursive functions and deal with edge cases.

To make this function more robust, we could could add in `rotateR []` as a pattern so we could define how the function handles being passed an empty list. This is a common pattern in Haskell.

This algorithm is broken down into 5 steps which process a word in order. I'll describe how I tackled step one in a moment. Before I do, I'll go over some of the foundational parts of the algorithm that we need in place before we go through the steps.

```haskell
rotateR :: [a] -> [a]
rotateR [x] = [x]
rotateR xs = last xs : init xs

-- Make a pattern to match the consonants and vowels in a word where a cons is
-- not "aeiou" or y preceded by a cons e.g., "happy" -> ("happy", "cvccv")
wordDesc :: String -> (String, String)
wordDesc str =
    (str, [corv (a,b,i) | (a,b,i) <- zip3 str (rotateR str) [0..len]])
    where len = length str - 1
          corv (a,b,i)
            | a == 'y' && i /= 0 && b `notElem` vs = 'v'
            | a `elem` vs = 'v'
            | otherwise = 'c'
            where vs = "aeiou"

-- Measure the number of consonant sequences in the word in the form
-- [c]vcvc[v] == 2 where the inner 'vc' sequences are counted.
measure :: (String, String) -> Int
measure (_,ds) =
    length $ filter (=='c') ds'
    where ds' = dropWhile (=='c') [head a | a <- group ds]

-- Tests if our word or stem ends with a given character
endswith :: (String, String) -> Char -> Bool
endswith (str,_) c = c == last str

-- Tests if our word or stem contains a vowel
hasvowel :: (String, String) -> Bool
hasvowel (_,ds) = 'v' `elem` ds

-- Tests if our word or stem ends with a double consonant
endsdblc :: (String, String) -> Bool
endsdblc (str,ds) =
    last ds == 'c' && (last $ init str) == last str

-- Tests if our word or stem ends with the pattern 'cvc' and does
-- not end with the characters 'x', 'w' or 'y'
endscvc :: (String, String) -> Bool
endscvc (str,ds) =
    drop (length ds - 3) ds == "cvc" && last str `notElem` "xwy"
```

The first two functions here were described in more detail in the last post. To recap: The first rotates a string one character to the right. The second determines which letters in a word are consonants or vowels. How this is would likely be handled in an imperative language would be to keep track of the index of the letter we're currently evaluating so we could subtract 1 from that index and check the previous letter (which we need to do in the case of a 'y'). That is, we need an index to know what character in a string we're evaluating. Haskell does have the operator !! which allows us to access a list by index but as I stated before I thought that was decidedly un-Haskelly. Instead, I opted to turn our string into a tuple where the first would be the word we're stemming and the second would be a string of either "c" or "v" to denote consonant or vowel.

The functions that follow show why I opted to do it this way: The algorithm sometimes wants to evaluate a word based on its constituent letters and sometimes wants to look at the pattern of consonants and vowels in that word. The functions endswith, hasvowel, and endsdblc (double consonant) don't need an explanation. The function measure is a bit more complex. What are we measuring? We're measuring the number of consonant-vowel sequences in a word.

```makefile
A consonant will be denoted by c, a vowel by v. A list ccc... of length greater than 0 will be 
denoted by C, and a list vvv... of length greater than 0 will be denoted by V. Any word, 
or part of a word, therefore has one of the four forms:

    CVCV ... C
    CVCV ... V
    VCVC ... C
    VCVC ... V

These may all be represented by the single form

    [C]VCVC ... [V]

where the square brackets denote arbitrary presence of their contents.
Using (VC){m} to denote VC repeated m times, this may again be written as

    [C](VC){m}[V]
```

I'll admit that the "denote arbitrary presence of their contents" part confused me for quite a while. I had to read through the Python implementation and write my Haskell version before it made sense. It just means those bracketed letters (or letter sequences) may or may not be there. In retrospect I can't figure out why I couldn't figure it out -- other than the fact that "arbitrary" isn't the correct word.

So, we need to scan through our word to the first vowel sequence and then count how many times we encounter a consonant sequence. The first part `[head a | a <- group ds]` reduces our sequence (say "ccvvccvvcc") to its transitions ("cvcvc"). We do that because for our purposes a "cc" is the same as "c". The group function in Haskell groups like elements together in a list, so "aab" becomes ["aa", "b"]. At the front of our list comprehension head takes the first of every group ["a", "b"].

The function `dropWhile` will return a list starting from the first element that doesn't match the condition. In this case we'll drop the leading consonant, if any, so "cvcv" becomes "vcv". The function filter operates in a similar way. It will return a list of elements that evaluate to true: "vcv" becomes "c". From there we just count the number of elements in the list to get our measure. Another interesting Haskell operator here: $. The $ operator changes the precedence of the expression that follows. We could rewrite `length $ filter (=='c') ds'` as `length (filter (=='c') ds')`. Using $ is often cleaner looking.

It's illustrative to take a look at the Python version:

```python
# Vivake Gupta (v@nano.com)
# http://tartarus.org/martin/PorterStemmer/python.txt

def m(self):
        n = 0
        i = self.k0
        while 1:
            if i > self.j:
                return n
            if not self.cons(i):
                break
            i = i + 1
        i = i + 1
        while 1:
            while 1:
                if i > self.j:
                    return n
                if self.cons(i):
                    break
                i = i + 1
            i = i + 1
            n = n + 1
            while 1:
                if i > self.j:
                    return n
                if not self.cons(i):
                    break
                i = i + 1
            i = i + 1
```

```haskell
measure :: (String, String) -> Int
measure (_,ds) =
    length $ filter (=='c') ds'
    where ds' = dropWhile (=='c') [head a | a <- group ds]
```

Which one is easier to read? To be fair this is a problem that Haskell is ideally suited to. (The Python version could be made more succinct as well. The version here was apparently translated line for line from the C version).

Ok, now on to the actual steps:

```haskell
getstem :: String -> String -> String
getstem str sfx = take (length str - length sfx) str

swapsfx :: String -> String -> String -> String
swapsfx str sfx [] = take (length str - length sfx) str
swapsfx str sfx sfx' = take (length str - length sfx) str ++ sfx'

step1a :: (String, String) -> String
step1a (str,_) = swapsfx str (fst sfxs') (snd sfxs')
    where sfxs' = head $ dropWhile (\ss -> not $ fst ss `isSuffixOf` str) sfxs
          sfxs = [
            ("sses", "ss"),
            ("ies" , "i" ),
            ("ss"  , "ss"),
            ("s"   , ""  ) ]

step1b :: (String, String) -> String
step1b (str,ds)
    | sfx "eed" && (measure $ wordDesc $ stm "eed") > 0 = swp "eed" "ee"
    | sfx "ed" && (hasvowel $ wordDesc $ stm "ed")  = nf $ swp "ed" ""
    | sfx "ing" && (hasvowel $ wordDesc $ stm "ing")  = nf $ swp "ing" ""
    | otherwise = str
    where stm = getstem str
          sfx = (`isSuffixOf` str)
          swp = swapsfx str
          nf = step1b' . wordDesc

step1b' :: (String, String) -> String
step1b' (str,ds)
    | or $ map sfx ["at", "bl", "iz"] = e
    | dbl && (not . or $ map end "lsz") = init str
    | measure (str,ds) == 1 && endscvc (str,ds) = e
    | otherwise = str
    where sfx = (`isSuffixOf` str)
          dbl = endsdblc (str,ds)
          end = endswith (str,ds)
          e = str ++ "e"

step1c :: (String, String) -> String
step1c (str,ds)
    | (hasvowel $ wordDesc $ stm "y") && end 'y' = init str ++ "i"
    | otherwise = str
    where stm = getstem str
          end = endswith (str,ds)
```

The two helper functions at the top of this section probably don't need an explanation. The first returns a word minus a given suffix. The second swaps a suffix with a new one. The first part of step 1 step1a begins the actual meat of our algorithm. It simply matches our word against the attached list of tuples in descending order. If our word ends with suffix on the left, we replace it with the suffix on the right.

Steps 2 - 5:

```haskell
{-
    Step 2
    (m>0) ATIONAL ->  ATE
    ...
    (m>0) BILITI  ->  BLE
-}
step2 :: String -> String
step2 str =
    if (not $ null sfxs') && (measure $ snd $ wordDesc $ stm (fst sfx)) > 0
    then swapsfx str (fst sfx) (snd sfx)
    else str
    where f = \ss -> not $ fst ss `isSuffixOf` toLowers str
          stm = getstem str
          sfx = head $ sfxs'
          sfxs' = dropWhile f sfxs
          sfxs = [
            ("ational", "ate" ),
            ("tional" , "tion"),
            ("enci"   , "ence"),
            ("anci"   , "ance"),
            ("izer"   , "ize" ),
            ("abli"   , "able"),
            ("alli"   , "al"  ),
            ("entli"  , "ent" ),
            ("eli"    , "e"   ),
            ("ousli"  , "ous" ),
            ("ization", "ize" ),
            ("ation"  , "ate" ),
            ("ator"   , "ate" ),
            ("alism"  , "al"  ),
            ("iveness", "ive" ),
            ("fulness", "ful" ),
            ("ousness", "ous" ),
            ("aliti"  , "al"  ),
            ("iviti"  , "ive" ),
            ("biliti" , "ble" )]

{-
    Step 3
    (m>0) ICATE ->  IC
    ...
    (m>0) NESS  ->
-}
step3 :: String -> String
step3 str =
    if (not $ null sfxs') && (measure $ snd $ wordDesc $ stm (fst sfx)) > 0
    then swapsfx str (fst sfx) (snd sfx)
    else str
    where f = \ss -> not $ fst ss `isSuffixOf` toLowers str
          stm = getstem str
          sfx = head $ sfxs'
          sfxs' = dropWhile f sfxs
          sfxs = [
            ("icate", "ic"),
            ("ative", ""  ),
            ("alize", "al"),
            ("iciti", "ic"),
            ("ical" , "ic"),
            ("ful"  , ""  ),
            ("ness" , ""  )]

{-
    Step 4
    (m>1) AL ->
    ...
    (m>1 and (*S or *T)) ION ->
    ...
    (m>1) IZE  ->
-}
step4 :: String -> String
step4 str =
    if (not $ null sfxs') && (measure $ snd $ wordDesc $ stm (fst sfx)) > 1
    then swapsfx str (fst sfx) (snd sfx)
    else str
    where f = \ss -> not $ fst ss `isSuffixOf` toLowers str
          stm = getstem str
          sfx = head $ sfxs'
          sfxs' = dropWhile f sfxs
          sfxs = [
            ("al"   , "" ),
            ("ance" , "" ),
            ("ence" , "" ),
            ("er"   , "" ),
            ("ic"   , "" ),
            ("able" , "" ),
            ("ible" , "" ),
            ("ant"  , "" ),
            ("ement", "" ),
            ("ment" , "" ),
            ("ent"  , "" ),
            ("sion" , "s"),
            ("tion" , "t"),
            ("ou"   , "" ),
            ("ism"  , "" ),
            ("ate"  , "" ),
            ("iti"  , "" ),
            ("ous"  , "" ),
            ("ive"  , "" ),
            ("ize"  , "" )]

{-
    Step 5a
    (m>1) E ->
    (m=1 and not *o) E ->
-}
step5a :: String -> String
step5a str
    | sfx "e" && (measure $ snd $ wordDesc $ stm "e") > 1 = swp "e" ""
    | sfx "e" && (measure $ snd $ wordDesc $ stm "e") == 1 && noto = swp "e" ""
    | otherwise = str
    where noto = not $ endscvc $ wordDesc $ stm "e"
          stm = getstem str
          sfx = (`isSuffixOf` toLowers str)
          swp = swapsfx str

{-
    Step 5b
    (m > 1 and *d and *L) ->
-}
step5b :: String -> String
step5b str =
    if (measure $ snd $ wordDesc str) > 1 && dblc && ends 'l'
    then init str
    else str
    where dblc = endsdblc $ wordDesc str
          ends = endswith str

{-
    Our public stemming function
-}
stem :: String -> String
stem str =
    steps str
    where steps = step5 . step4 . step3 . step2 . step1
          step1 = step1c . step1b . step1a
          step5 = step5b . step5a
```

As the comments suggest, each function here is the application of a series of rules, mostly with the form "(measure>n) SUFFIX -> NEWSUFFIX". What that means in the context of the paper is if the measure of the word's stem (the word minus the first suffix) is over (or equal to) some number, then go ahead and swap the stems. Remember that a word's measure is the number of consonant-vowel sequences in the word. A more thorough explanation is here.

The general form in my implementation is to use dropWhile against a list of tuples ("SUFFIX", "NEWSUFFIX"). The function dropWhile will return a list that begins with the first element that doesn't satisfy the given condition. In this case we drop all of the tuples where the first part of the tuple doesn't match our word. To check our suffix, Haskell has a function isSuffixOf that does exactly what you would expect.

The Python version of this algorithm is case-insensitive. I originally was going to make mine case sensitive (it was easier) and convert all input words to lowercase before processing them. As I was wrapping it up I decided I wanted the output to match the Python version so I could compare the two -- so I went back through and made the whole thing case insensitive. Doing so was pretty straightforward. Haskell has a built in function toLower that will lowercase a character. I couldn't find a version that worked on strings so I added the toLowers that does just that.

The module's exported function stem composes the five main steps (and sub-steps) and returns our stemmed word. Pretty simple.

### General Observations about Haskell

With the algorithm done (but not thoroughly tested yet) I thought this would be a good point to review my initial impressions of working with Haskell. As of the date on this post I've been working with the language for the equivalent of a few days (in small pieces, when I had the time), which decidedly isn't very much, but I have started to notice some patterns emerge:

1. Most errors are caught as incompatible type issues.

This is great. We can see one of the major benefits of the language's purity and strong, static typing here. For the most part, if you've screwed up your syntax it will become immediately apparent because a function will be given the wrong number and/or wrong argument types.

2. Most errors are syntax based.

Following on #1, this might just be that I'm really new to the language, but the majority of errors came from the fact that I had written an expression wrong. An common example would be to omit parentheses (or the $ or . operators). The upside here is those are generally easy to fix.

3. Functions are black boxes that once written and tested, just work.

While that's not completely true, or at least I wouldn't launch a rocket with that untested assumption, the purity of Haskell functions generally means that once you've written a function that produces the expected output, you won't have to revisit that function later. The magic here comes from the lack of side effects and typing.

4. If you're coming from an imperative-only background, there will be some head scratching, yes, but not that much.

The utter alien-ness of the language is strong at first but dissipates pretty quickly. I would imagine this is especially true if you've encountered list comprehensions and recursive functions in other languages. While those aren't the entirety of Haskell, they're the right mindset. My entirely unscientific evaluation is that functional languages do stuff "in place" while imperative languages do stuff "in order". It helps me to think of a Haskell module as a single expression (on a single, very long line). While you wouldn't write it that way, I think it's a good mental model to have.

It's worth pointing out that not only are my impressions based on a very short period of time, they're also based on only a subset of the Haskell language. While this module does use the IO Monad, I skipped over working with Haskell's juicier bits like Monads, Haskell's data structures, the Maybe type, etc. I guess my next exercise will be to find a reason to use more of the language.

