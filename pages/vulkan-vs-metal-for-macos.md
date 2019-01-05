---
template: post
title: Vulkan vs Metal for Mac OS
date: 2019-01-05
---

![Vulkan Logo](/static/img/Vulkan_500px_Dec16.jpg)

#Vulkan vs Metal for Mac OS

This is a prelude to a series I'm writing on using Vulkan as your rendering API on macOS, by way of MoltenVK, including how to set it up in Xcode and how to get a basic renderer built and running.

I hope to show it's both very doable and worthwhile and help get you started. In short, yes, you *can* use Vulkan for your next graphics project, target macOS and not worry about vendor lock in or having to write two separate rendering engines.

###The Vulkan vs Metal Drama

The go-to cross platform rendering API has been OpenGL for ages. If you haven't worked with it, just know that it's awful. It's full of legacy cruft, operates as a giant state machine and otherwise is a big dated piece of dookie.

(Attempting to do anything advanced with it on macOS is *especially* unpleasant.)

The people who are behind OpenGL, Khronos, decided it was time to build a modern GPU API to take advantage of new device capabilities and clear out the cruft. Yes!

And Apple considered using Vulkan. For a moment.*

![Isildur](/static/img/LOTR_Isildur.jpg)

This was like that moment in *Lord of the Rings* when evil could have been destroyed forever, simply by tossing a gold ring into a lava pit, but human greed and pride got in the way.

Apple decided it would be cooler to do their own thing and called it Metal and any hope the world had of a *good* cross-platform graphics API was lost.

Then someone said, fuck it, let's just do Vulkan on Metal and MoltenVK was born. MoltenVK started out as a commercial project but has since been made free and open source (thanks to a donation from Valve?).

Shortly after, Apple deprecated OpenGL support, more or less forcing people to use Metal. *Or so they hoped!*

**[Edit] Thanks to [Fedy](https://twitter.com/fedyac) for pointing that Metal's release predates the release of Vulkan.*

From what I’ve been able to piece together the Khronos Group, (probably) including member Apple,  were discussing a new API and Apple came out of nowhere with Metal. Khronos kicked it into high gear and AMD donated Mantle to speed things up.

Apple was to market first with Metal but to what extent within the group it looked like Apple would participate is unclear. Maybe they were never expected to though their *GL involvement suggests they would have.

###Is Vulkan on Metal Viable?

Running one graphics API on another, compatible-ish API seems less than ideal. I know at least one company that passed on the idea (as a replacement for OpenGL) because of the potential complexity.

In practice, however, it's very clean. That's because MoltenVK operates as a Layer-0 driver for Vulkan. It's completely transparent from the point of view of your application. Once it's included as a (static or dynamic) library, you don't interact with it anymore. All client code interfaces directly with Vulkan, just as it would on any other platform.

You don't interact with MoltenVK or Metal, only Vulkan. *One API to rule them all.*

MoltenVK operates as any other Vulkan driver would, with the exception that it translates commands to Metal and Metal talks to the GPU.

###Performance?

If there are performance issues, I haven't seem them yet. Ditto bugs and compatibility issues. I'm not saying the integration is flawless, but it's certianly promising out of the box. MoltenVK is an active project, so any issues are likely to be dealt with. It's also open source, which means you don't have to wait for fixes, you can do them yourself.

Beyond that, I haven't put together any benchmarks to directly compare the two approaches. I may in the future.

###Vulkan vs Metal?

You could, of course, just use Metal. Metal *is* a modern GPU API that fills the same role as Vulkan. You *will* get the same performance as you would with Vulkan. 

However, if you need &mdash; or would like to leave open the door for &mdash; cross platform support, you'll need to use Vulkan or commit to building two separate renderers. 

That won't mean building two separate applications, of course, but there will be the overhead of abstracting rendering so that Metal and Vulkan can be swapped as easily as possible. Having done it, I can say confidently that it's a non-trivial amount of work to make a renderer back-end agnostic.

###Working with Vulkan vs Metal?

They're both new, performance-oriented and share a lot of similarities. Vulkan, however, is *way* more verbose. You can get a Hello Triangle running on Metal in a few hundred lines of code, on Vulkan you'd be hard pressed to do it in less than 1k. That is, *one thousand lines of code for a Hello Triangle*.

The upside to that is Vulkan attempts to give as much control as possible so the rendered can be tailored for the task at hand, giving the best possible performance.

It's not that Metal *doesn't* give this amount of flexibility, it's just that these decisions are made explicitly with Vulkan, whereas you're working with a lot more defaults with Metal and two languages (Objective-C and Swift) that tend to be less verbose than Vulkan's default C++.

###Language Choices

Metal of course gives you Objective-C and Swift. For shaders you have to use Apple's *metal* format. Metal is similar to GLSL in the sense that they're both C-like, but the two are not compatible.

Vulkan is written in C++, although bindings do exist, of assorted levels of maturity, for other languages. For our macOS project, however, it doesn't really make sense to work with anything but the default C++.

Vulkan's shaders have to be in its binary SPIR-V format. Vulkan ships with compilers that accept GLSL and HLSL. I'm pretty sure Metal to SPIR-V compilers exist as well, though you're likely to be using GLSL in this case.

The upside to that is GLSL is more or less the 'standard' format for shaders, and a wealth of information exists online for them.

*[Edit] As [Sascha Willems](https://twitter.com/SaschaWillems2) pointed out to me, Vulkan is a C API, with optional C++ headers. I had swapped those two in my mind.*

###Let's Get Started

In the next post, I'll cover how to obtain Vulkan, MoltenVK and how to set up an Xcode project to incorporate them. I'll also cover integrating Vulkan's validation layers, which take a lot of the guesswork out of working with Vulkan.

Coming soon...
