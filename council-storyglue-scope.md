# Council opinions: should StoryGlue be a new forked product?

## Claude

**Don't fork. This is classic distraction masquerading as strategy.**

You have one actual product with real technical value: **the identity-lock mechanism that works across scenes**. That's the core IP. Everything else is just different entry points to that same capability, and splitting it into three separate apps will kill you.

Here's what's actually happening: genstock.photo is 48 hours into soft launch with real users forming first impressions *right now*, and instead of obsessing over their onboarding friction, retention signals, and whether the "Story" project type even makes sense in that context, you're designing logos for StoryGlue. That's a red flag.

**My direct recommendation:**

1. **Kill the StoryGlue standalone app idea entirely.** The "distinct audience" you're imagining (storyboard artists, comic creators) would be better served by a focused product that owns that positioning completely, not a fork of infrastructure you built for something else. If you want that market, build FOR that market later, with purpose-built UX. Right now you're just renaming the same backend.

2. **Keep unread.ink as a separate product**, but ONLY because it's a complete end-to-end experience (AI writes + illustrates + publishes). It's a finished artifact, not a tool. That's genuinely different from genstock's tool positioning.

3. **Radically simplify genstock.photo immediately.** The fact that it launched with TWO project types ("Photos" and "Story") in the same week is already scope creep. Pick one. My vote: kill "Story" from genstock entirely for now. The product is genstock.photo - the name literally says "photos." Having a text-to-illustrated-scenes feature muddies what it is. Users who showed up for "lock a photo, get variations" don't want a scene-writing interface.

4. **Use the StoryGlue name, if anywhere, as the technical brand** for the identity-lock engine that powers both products under the hood - like how "Unreal Engine" powers games, or "Stripe" powers checkout flows. Make it a feature callout: "Powered by StoryGlue technology" on both sites. Developer-facing eventually if you license it. But not a user-facing product.

**The real warning sign:** Yes, this is overextension. You have two products live for less than a week, zero validated product-market fit on either, and you're already proposing a third surface. That's not ambition, that's avoidance. The hard work right now is watching those 20-50 users on genstock, seeing where they struggle, and rebuilding the onboarding flow five times this week. Shipping StoryGlue would let you avoid learning whether genstock actually works.

Consolidate now or drown in maintenance debt by month two.

---

## Gemini

Okay, let's cut to the chase.

**My direct, unequivocal recommendation is this: Absolutely DO NOT fork StoryGlue as a separate product with its own domain and deploy.**

This isn't just about resource allocation; it's about focus, market signal, and strategic sanity for a small team.

Here's why:

1.  **Massive Overextension Risk:** You are one small team. You've just launched two distinct products in the last week or so, and one (`genstock.photo`) is in a critical soft-launch phase. Proposing a *third* separate deployed application for a capability that *already exists in two other places* is the textbook definition of overextension. Each new app, domain, and codebase is a new marketing effort, a new customer support queue, a new deployment pipeline, and a new maintenance burden. Your team will burn out trying to spread itself so thin.

2.  **It's a Feature, Not a Product:** The "identity-lock-across-scenes mechanism" is a powerful, innovative *feature*. It is not, in itself, a distinct product line that warrants its own domain and app. You've already proven its value by integrating it into `genstock.photo`'s "Story" type and `unread.ink`'s illustration pipeline. Trying to sell "the illustration engine" standalone, without the context of a full stock-photo workflow or a full book-writing pipeline, will be incredibly difficult to position and market, especially against full-suite tools.

3.  **Dilution of Focus & Brand:** Right now, your primary strategic imperative should be to get `genstock.photo` to product-market fit. Observe how those 20-50 soft-launch users are actually using it. What are their biggest pain points? Where are they getting stuck? What features are they asking for? Diverting attention and engineering cycles to launch a third product now will cripple your ability to iterate rapidly on `genstock.photo` and find its footing. You can't learn three things deeply at once.

**Where to use the "StoryGlue" name, if anywhere:**

The name "StoryGlue" brilliantly captures the essence of that identity-locking, scene-based generation. I recommend you use it as a **branded feature name or project type within genstock.photo.**

Specifically:
*   Rename `genstock.photo`'s "Story" project type to **"genstock.photo StoryGlue"** or simply **"StoryGlue Projects"** within the `genstock.photo` application.
*   Market this as the unique, powerful capability that differentiates `genstock.photo` for creators building consistent narratives. "Lock your character, generate your story – powered by StoryGlue."

This allows you to capitalize on the strong branding without incurring the enormous overhead of a separate product. It simplifies your messaging and keeps all your eggs in one (or two, with `unread.ink` for a truly different use case) baskets for now.

**Real Risk Check:**
Yes, this pattern – proposing a new branded product for a capability that already exists in two places – is absolutely a warning sign of the team overextending. It often stems from the excitement of realizing a technology's versatility, but without the discipline to constrain scope and focus on singular, achievable goals. You're building cool tech, now learn to sell and support it effectively for *one primary audience* first. Deepen, don't broaden, for now.

---

## ChatGPT

Given the current situation, I strongly advise against forking "StoryGlue" into its own standalone product, at least at this stage. Here’s why:

The core mechanism of "StoryGlue" – the identity-lock-across-scenes illustration capability – is already embedded in two existing products: genstock.photo's "Story" project type and unread.ink's illustration step. Creatively reframing it as yet another product not only risks overextending your team but also fragments your branding and dilutes focus from enhancing and building traction with the existing offerings.

### Let's break it down:

1. **Distinct Product Justification:**
   StoryGlue, as a standalone offering, lacks a clearly distinct consumer value proposition from what is already available within genstock and unread.ink. While StoryGlue might seem appealing as a focused tool for storyboard artists/comic creators, the distinctiveness isn’t substantial enough to justify a separate product domain and operational overhead. These niche markets can be effectively targeted through streamlined functionality and clear positioning within existing platforms rather than creating external complexity.

2. **Timing and Focus:**
   Introducing a new product is particularly risky when another substantial application (genstock) is still in its nascent soft-launch phase. Prioritize stabilizing and enhancing what you already have. This early stage is crucial for gathering user feedback, iterating, and ensuring operational stability, rather than dividing your team’s attention and resources with multiple parallel launches.

3. **Utilizing "StoryGlue" as a Name:**
   Consider leveraging "StoryGlue" as an internally marketed name for the illustration feature within current products. This could mean branding genstock's "Story" project type or unread.ink’s illustration engine as “powered by StoryGlue.” It keeps the appeal and recognition you’re building under one unified platform umbrella, opening opportunities for cross-promotion and tighter integration without the pressures of maintaining another standalone product.

4. **Warning Sign:**
   Encountering the temptation to spin out new branded products for existing capabilities can indeed indicate a risk of overextending. It’s more productive to optimize and deepen capabilities where you already have a foothold rather than disperse efforts across new, nascent channels.

### Recommendation:
Integrate StoryGlue as a feature name within genstock or unread.ink, or propose it as a future offering within your existing interfaces to cater directly to those targeted for illustration-specific needs. This strategy centralizes your efforts, minimizes overhead, and primes your current solutions for stronger market traction and consumer value.

---

## Radium

## Honest Take: Do Not Fork StoryGlue. This Is Scope Creep, Not Strategy.

**Direct recommendation:** Absorb "StoryGlue" as a **branded feature label** inside genstock.photo—specifically as how you talk about the Story project type's illustration engine. Do not register a domain, do not deploy a separate app, do not start another codebase. You have *two* live products with overlapping character-lock generation, and you're proposing a third that is literally the same mechanism without "baggage" you chose to add. That's not product differentiation; that's you trying to escape decisions you already made.

**The warning sign is obvious:** You shipped genstock with two project types (Photos and Story). Then you built unread.ink—which uses Story's mechanism plus a writing pipeline. Now you want to extract Story's mechanism *again* as a standalone, renaming the writing pipeline "baggage." But *you* chose to bundle that writing pipeline. If it's baggage, why is it the centerpiece of unread.ink? You're accumulating surfaces faster than you're learning from any of them.

**Real risk:** Three apps means three sets of onboarding, three auth flows, three error-handling layers, three landing pages to optimize, three sets of user feedback to triage. With one team and two products already in soft launch, you are not resourced to learn from any of them properly. This pattern—reach for a new domain when a feature feels constrained—is exactly how small teams burn out without ever finding product-market fit.

**Where "StoryGlue" should live:** Rename genstock's "Story" project type to "StoryGlue" in the UI. Market it as the character-lock illustration engine. Let genstock be the umbrella: Photos for single-subject variation, StoryGlue for multi-scene illustration. If later you discover that users only want illustration with zero photographic variation, *then* spin it out—after you have revenue traction and user interviews proving the split is demanded, not hypothesized.

**Bottom line:** One team, two live products, mid-soft-launch. Your job right now is to listen, not launch. Shelve the new domain. Name the feature. Ship nothing else until you have real signals from real users.
