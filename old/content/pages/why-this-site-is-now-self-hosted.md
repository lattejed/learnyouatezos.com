+++
date = "2016-07-19T19:36:48+07:00"
title = "Why this Site is now Self Hosted"
aliases = [
    "/pages/007-why-this-site-is-now-self-hosted.html"
]

+++

**Note: While this site is still self-hosted, it's now managed by Hugo so most of what's below doesn't apply**

This site, now in its ~~current brutalist form~~, has been hosted in a few different places over the years. I don't write that often but I've made some effort to maintain a site since I got into software. That's usually meant picking a decent blog hosting platform and writing something about 1/10th of the times I've thought I should. I've used Tubmlr, Posterous, Posthaven (the post sale reboot of Posterous), GitHub and was considering Medium and then said fuck it, I'll just put it on a server somewhere and be done with it.

Here's why:

1. Simplicity. A static website is an exceedingly simple thing. I'd rather just write one in vim than deal with a webpage-as-text-editor.
2. Style. ~~While this site may be (intentionally) ugly~~, it was exaclty what I wanted and didn't require dealing with a theme interface nor did someone else decide what my site should look like for aesthetic or technlogical reasons.
3. Dumbed down services. Hosting a site for any length of time almost invariably requires redirects or file hosting or a form or whatever. Existing services don't provide some or all of these. 
4. Performance. It's really hard to beat a VPS from a decent provider (I use Digital Ocean) with CloudFlare's free plan as a CDN. If my site is simple I expect it to load in a microsecond. Most servies aren't that great.

I was actually hosting this most recent version on GitHub. GitHub's offering has a lot of nerd appeal. You can edit locally, deploy with a `git push`, they've got a CDN (as far as I know) and it's free or included in whatever plan you've already got with them.

Then I spent 45 minutes trying to figure out how people set up 301s when using gh-pages and was disappointed to find out they don't. Some people recommend using refresh and canonical meta tags on a basic page (supposedly SEO acceptible). There's even a Jekyll plugin for it. To me that just sounds silly.

Also, Jekyll. Whenever you push to GitHub it treats your site as a Jekyll site and tries to "compile" it. Even if it's not a Jekyll site. It fails sometime without reason and "fixing" it usually means pushing empty commits until it works.

Anyway, my point wasn't to complain about hosting a site on GitHub, but rather the fact that these services will likely end up costing you more time than they're worth. Setting up nginx or apache to host a static site isn't very complicated and it's a much better skill to learn than the quirks of some service.

