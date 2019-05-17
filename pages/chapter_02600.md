---
template: page
title: Appendix
---

###Ubuntu Locale Fix 

```bash
export LC_ALL="en_US.UTF-8" && echo -e '\nexport LC_ALL="en_US.UTF-8"' >> ~/.bashrc
```

If you prefer another default locale, substitute it for en_US. 

Even if your locale is configured correctly, your terminal may attempt to set environment variables and corrupt the locale settings in the process. This seems to be particularly be an issue when connecting via ssh from macOS. 

Explicitly setting the default locale in `.bashrc` should fix this.
 
