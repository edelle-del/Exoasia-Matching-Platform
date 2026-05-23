---

## name: founders-arena-brand description: \> Applies the Founders Arena 2026 brand identity system — combined palette from Exoasia Innovation Hub, Success Academy, and Game Changer Funnel — to any deliverable: landing pages, presentations, documents, social posts, email headers, event collateral, and UI components. Trigger whenever the user asks to create, update, or style anything under the Founders Arena brand, or uses phrases like "brand guide," "FA colors," "Founders Arena style," "make it look like Founders Arena," or "apply the brand." Enforces typography (Montserrat 900 headlines, JetBrains Mono labels), the three-layer dark background scale, and the Tangerine/Gold/Pink/Magenta accent system.

# Founders Arena Brand Identity System

## Combined Brand Guide — Exoasia × Success Academy × Game Changer Funnel

**Document:** Brand Guide v1.0 · May 2026  
**Custodian:** Exoasia Innovation Hub OPC · 21F 8 Rockwell, Makati City  
**Platform:** Founders Arena Inc. · Organized by Exoasia Innovation Hub  
**Tagline:** *Not by chance. By design.*

---

## 1\. Brand Essence

### Mission

Connect the right capital to the right founder — not by chance, but by design.

### Vision

The default platform for startup-investor matching across Southeast Asia and beyond.

### Positioning

AI-powered precision meets human-curated trust — where the best founders find the right capital partners.

### Brand Personality

- **Precise** — Every match is scored, explained, and filtered. No guesswork.  
- **Global** — Southeast Asian roots. Borderless ambition. 15+ countries.  
- **Trusted** — Verified investors. Curated founders. Transparent reasoning.  
- **Decisive** — Results in under 3 minutes. Ranked. Explained. Actionable.

### Primary Tagline

**Not by chance. By design.**

Use on: hero sections, final CTAs, footer signoffs, event collateral, email closings. Always close every primary CTA section with this line.

---

## 2\. Color System

### Design Philosophy

The palette fuses three Exoasia house brands:

- **Deep backgrounds** from GCF Blackberry \+ Exoasia Deep Purple/Maroon → premium, dark, cinematic  
- **Primary action accent** from GCF Tangerine → high energy, conversion-focused  
- **Refined accent** from Success Academy Gold → trust, labels, editorial  
- **Vibrant gradient** from GCF Hot Pink \+ Magenta → featured moments, event energy  
- **Light surfaces** from Success Academy Cream → warmth, elegance

### CSS Custom Properties (copy-paste ready)

:root {

  /\* ── GCF Base ── \*/

  \--fa-navy:         \#1A0B2E;   /\* GCF Blackberry — deepest bg, hero, nav \*/

  \--fa-navy-mid:     \#2D0A28;   /\* Exoasia Deep Purple — secondary dark sections \*/

  \--fa-navy-light:   \#4A1040;   /\* Exoasia Maroon — mid-dark elements \*/

  /\* ── Exoasia Purple Scale ── \*/

  \--fa-purple:       \#7B3FA0;   /\* Focus states, mid accent \*/

  \--fa-lavender:     \#B095C5;   /\* Subtle purple accents, dividers \*/

  /\* ── GCF × SA Accents ── \*/

  \--fa-tangerine:    \#FF6B1F;   /\* Primary CTAs, active states, H1 accent \*/

  \--fa-tangerine-lt: \#FFA04F;   /\* Hover states, tints \*/

  \--fa-gold:         \#C9A040;   /\* SA Academy Gold — eyebrows, labels, taglines \*/

  \--fa-hot-pink:     \#FF2E93;   /\* GCF Hot Pink — vibrant moments, gradient start \*/

  \--fa-magenta:      \#C81E78;   /\* GCF Magenta — gradient anchor \*/

  /\* ── SA Cream Surfaces ── \*/

  \--fa-cream:        \#F5EFE0;   /\* SA Cream — warm light backgrounds \*/

  \--fa-white:        \#FFFFFF;   /\* Card surfaces \*/

  \--fa-gray-100:     \#EDE5D5;   /\* Subtle warm backgrounds \*/

  \--fa-gray-200:     \#D4C5A9;   /\* Borders on cream \*/

  \--fa-gray-300:     \#C9B89A;   /\* Dividers, borders \*/

  \--fa-gray-500:     \#7A6A5A;   /\* Muted warm text \*/

  \--fa-gray-700:     \#3D2D1F;   /\* Dark text on light backgrounds \*/

}

### Color Reference Table

| Name | Hex | Source Brand | Primary Usage |
| :---- | :---- | :---- | :---- |
| GCF Blackberry | `#1A0B2E` | Game Changer Funnel | Deepest bg · Hero · Nav · Dark sections |
| Exoasia Deep Purple | `#2D0A28` | Exoasia | Secondary dark sections |
| Exoasia Maroon | `#4A1040` | Exoasia | Mid-dark elements, section alternates |
| Exoasia Purple | `#7B3FA0` | Exoasia | Focus states, mid accent |
| Exoasia Lavender | `#B095C5` | Exoasia | Subtle accents, borders |
| GCF Tangerine | `#FF6B1F` | Game Changer Funnel | Primary CTA · Active states · H1 accent |
| Tangerine Light | `#FFA04F` | GCF derived | Hover states, tints |
| SA Academy Gold | `#C9A040` | Success Academy | Eyebrows · Labels · Taglines · Metadata |
| GCF Hot Pink | `#FF2E93` | Game Changer Funnel | Vibrant moments · Gradient start |
| GCF Magenta | `#C81E78` | Game Changer Funnel | Gradient anchor |
| SA Cream | `#F5EFE0` | Success Academy | Light section backgrounds · Forms |
| White | `#FFFFFF` | — | Card surfaces |

### Standard Gradients

/\* Primary CTA gradient — buttons, featured moments \*/

background: linear-gradient(135deg, \#FF6B1F, \#FF2E93);

/\* CTA hover gradient \*/

background: linear-gradient(135deg, \#FF2E93, \#C81E78);

/\* Exoasia deep gradient — section covers, headers \*/

background: linear-gradient(135deg, \#2D0A28, \#4A1040, \#7B3FA0);

/\* Dark section fade \*/

background: linear-gradient(135deg, \#1A0B2E, \#2D0A28);

/\* Accent bar — divider above final CTA \*/

background: linear-gradient(90deg, \#FF6B1F, \#FF2E93, \#C81E78);

### Approved Color Combinations

| Foreground | Background | Usage |
| :---- | :---- | :---- |
| Tangerine `#FF6B1F` | Blackberry `#1A0B2E` | Hero headline accent · Section eyebrows on dark |
| Blackberry `#1A0B2E` | Tangerine `#FF6B1F` | Primary CTA buttons |
| SA Gold `#C9A040` | Blackberry `#1A0B2E` | Eyebrows · Labels · Tagline "Not by chance. By design." |
| White `#FFFFFF` | Blackberry `#1A0B2E` | Body text on dark sections |
| Blackberry `#1A0B2E` | SA Cream `#F5EFE0` | Body text on light sections · Forms |
| Lavender `#B095C5` | Deep Purple `#2D0A28` | Subtle mid sections |
| White gradient text | GCF gradient | Event banners · Featured callouts |

---

## 3\. Typography

### Typeface System

| Font | Weights Used | Role |
| :---- | :---- | :---- |
| **Montserrat** | 900 (Black) | All headlines, wordmark, CTAs, display numbers |
| **Montserrat** | 700 (Bold) | Subheadings, card titles, navigation labels |
| **Montserrat** | 600 (SemiBold) | Emphasis, strong body, labels |
| **Montserrat** | 500 (Medium) | Navigation links, secondary actions |
| **Montserrat** | 400 (Regular) | Body copy, descriptions, captions |
| **JetBrains Mono** | 400/500/600 | ALL labels, eyebrows, tags, metadata, hex codes, monospace |

### Critical Rule

Montserrat 900 is mandatory for ALL headlines without exception.  
JetBrains Mono is the exclusive font for labels, metadata, and eyebrows.  
No other typefaces are permitted in Founders Arena brand materials.

### Google Fonts Import

\<link rel="preconnect" href="https://fonts.googleapis.com"\>

\<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin\>

\<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900\&family=JetBrains+Mono:wght@400;500;600\&display=swap" rel="stylesheet"\>

### Type Scale

/\* Display — Hero H1 \*/

font-family: 'Montserrat', sans-serif;

font-weight: 900;

font-size: clamp(2.4rem, 5vw, 4.2rem);

line-height: 1.05;

letter-spacing: \-0.02em;

/\* Section H1 \*/

font-family: 'Montserrat', sans-serif;

font-weight: 900;

font-size: clamp(1.8rem, 3.5vw, 2.8rem);

line-height: 1.1;

letter-spacing: \-0.01em;

/\* H2 Subheading \*/

font-family: 'Montserrat', sans-serif;

font-weight: 700;

font-size: 1.5rem;

line-height: 1.3;

/\* H3 Component title \*/

font-family: 'Montserrat', sans-serif;

font-weight: 700;

font-size: 1.1rem;

line-height: 1.35;

/\* Body \*/

font-family: 'Montserrat', sans-serif;

font-weight: 400;

font-size: 1.05rem;

line-height: 1.75;

color: rgba(255,255,255,0.75); /\* on dark \*/

color: \#3D2D1F;                /\* on cream/light \*/

/\* Caption / Small \*/

font-family: 'Montserrat', sans-serif;

font-weight: 400;

font-size: 0.85rem;

line-height: 1.6;

/\* Eyebrow / Label — ALWAYS JetBrains Mono \*/

font-family: 'JetBrains Mono', monospace;

font-weight: 500;

font-size: 0.68rem to 0.75rem;

letter-spacing: 0.12em to 0.18em;

text-transform: uppercase;

color: \#C9A040; /\* SA Gold on dark backgrounds \*/

color: \#C81E78; /\* Magenta on light backgrounds \*/

---

## 4\. Logo System

### Wordmark Rules

- Always: `FOUNDERS ARENA` — ALL CAPS, Montserrat 900  
- Never: lowercase, mixed case, serif font, thin weight, gradient fill, drop shadow  
- Year badge: `2026` — JetBrains Mono 600, background matches the logo's host context

### Approved Logo Combinations

On Dark Navy:   white wordmark \+ gold year badge

On White:       navy wordmark \+ navy year badge (gold text)

On Gold/Cream:  navy wordmark \+ navy year badge

### Wordmark HTML

\<\!-- On dark background \--\>

\<div style="display:flex;align-items:center;gap:12px"\>

  \<span style="font-family:'Montserrat',sans-serif;font-weight:900;

               font-size:1.5rem;color:\#fff;letter-spacing:0.05em"\>

    FOUNDERS ARENA

  \</span\>

  \<span style="font-family:'JetBrains Mono',monospace;font-weight:600;

               font-size:0.65rem;background:\#C9A040;color:\#1A0B2E;

               padding:3px 9px;border-radius:5px;letter-spacing:0.06em"\>

    2026

  \</span\>

\</div\>

---

## 5\. UI Component Patterns

### Navigation Bar

.fa-nav {

  position: fixed;

  top: 0; left: 0; right: 0;

  height: 68px;

  background: rgba(26, 11, 46, 0.92);

  backdrop-filter: blur(16px);

  border-bottom: 1px solid rgba(201, 160, 64, 0.15);

  z-index: 1000;

}

- Logo: Montserrat 900, white \+ Gold year badge  
- Nav links: Montserrat 500, rgba(255,255,255,0.7), hover white  
- CTA button: Tangerine→Hot Pink gradient, white text, Montserrat 700

### Primary CTA Button

.fa-btn-primary {

  background: linear-gradient(135deg, \#FF6B1F, \#FF2E93);

  color: \#ffffff;

  padding: 14px 28px;

  border-radius: 10px;

  font-family: 'Montserrat', sans-serif;

  font-weight: 700;

  font-size: 0.9rem;

  border: none;

  cursor: pointer;

  transition: all 0.2s;

}

.fa-btn-primary:hover {

  background: linear-gradient(135deg, \#FF2E93, \#C81E78);

  transform: translateY(-2px);

  box-shadow: 0 8px 32px rgba(255, 46, 147, 0.35);

}

### Secondary CTA Button

.fa-btn-secondary {

  background: transparent;

  color: \#ffffff;

  padding: 14px 28px;

  border-radius: 10px;

  font-family: 'Montserrat', sans-serif;

  font-weight: 700;

  font-size: 0.9rem;

  border: 2px solid rgba(255, 255, 255, 0.4);

}

.fa-btn-secondary:hover {

  border-color: rgba(255,255,255,0.8);

  transform: translateY(-2px);

}

### Event/Status Badges

/\* Gold badge — used for event labels, platform status \*/

.fa-badge-gold {

  font-family: 'JetBrains Mono', monospace;

  font-size: 0.65rem;

  font-weight: 600;

  letter-spacing: 0.08em;

  padding: 4px 12px;

  border-radius: 100px;

  background: rgba(201, 160, 64, 0.15);

  color: \#C9A040;

  border: 1px solid rgba(201, 160, 64, 0.3);

}

/\* Dark badge — investor type, role labels \*/

.fa-badge-dark {

  background: \#1A0B2E;

  color: \#C9A040;

  border: 1px solid \#1A0B2E;

}

### Sector / Filter Chips

/\* Default chip \*/

.fa-chip {

  font-family: 'Montserrat', sans-serif;

  font-size: 0.8rem;

  font-weight: 500;

  padding: 7px 16px;

  border-radius: 100px;

  border: 1.5px solid \#1A0B2E;

  color: \#1A0B2E;

  background: transparent;

  cursor: pointer;

}

/\* Selected chip \*/

.fa-chip.selected {

  background: \#1A0B2E;

  color: \#ffffff;

}

### Ticker / Marquee Banner

.fa-ticker {

  background: linear-gradient(90deg, \#1A0B2E 0%, \#2D0A28 50%, \#4A1040 100%);

  border-top: 1px solid rgba(255, 107, 31, 0.3);

  border-bottom: 1px solid rgba(255, 107, 31, 0.3);

  padding: 9px 0;

  overflow: hidden;

}

.fa-ticker-item {

  font-family: 'JetBrains Mono', monospace;

  font-size: 0.68rem;

  font-weight: 500;

  color: \#FF6B1F;

  padding: 0 28px;

}

.fa-ticker-dot {

  width: 4px; height: 4px;

  border-radius: 50%;

  background: \#C9A040;

  opacity: 0.7;

}

### Match Score Card

/\* Score badge — Excellent (80–100) \*/

.fa-score-badge {

  background: \#E1F5EE;

  border-radius: 8px;

  padding: 4px 12px;

}

.fa-score-num {

  font-family: 'Montserrat', sans-serif;

  font-weight: 900;

  font-size: 28px;

  color: \#085041;

}

/\* Score colors by band \*/

/\* 80–100 Excellent: \#E1F5EE bg, \#085041 text \*/

/\* 65–79  Strong:    \#E6F1FB bg, \#0C447C text \*/

/\* 50–64  Moderate:  \#FAEEDA bg, \#633806 text \*/

/\* Below 50 Low:     \#FCEBEB bg, \#A32D2D text \*/

---

## 6\. Section Layout Patterns

### Hero Section (Dark — Cinematic)

.fa-hero {

  min-height: 100vh;

  background: \#1A0B2E;

  display: flex;

  align-items: center;

  justify-content: center;

  position: relative;

  overflow: hidden;

}

/\* Sector gradient overlay cycles through 8 scenes \*/

/\* Inner container max-width: 680px, centered \*/

/\* Eyebrow: JetBrains Mono, SA Gold \#C9A040, badge pill \*/

/\* H1: Montserrat 900, white first line, Tangerine accent line \*/

/\* Tagline: JetBrains Mono, SA Gold, underline border \*/

/\* Body: Montserrat 400, rgba(255,255,255,0.7) \*/

/\* CTAs: primary gradient button \+ outline button \*/

### Section Eyebrow Pattern

\<span style="font-family:'JetBrains Mono',monospace;

             font-size:0.72rem;letter-spacing:0.14em;

             text-transform:uppercase;color:\#C9A040;

             margin-bottom:1rem;display:block"\>

  SECTION LABEL

\</span\>

### Dark Section

- Background: `#1A0B2E` or `#2D0A28`  
- Heading: Montserrat 900, white  
- Body: Montserrat 400, `rgba(255,255,255,0.7)`  
- Cards: `#2D0A28` background, `rgba(255,255,255,0.07)` border

### Light Section

- Background: `#F5EFE0` (SA Cream)  
- Heading: Montserrat 900, `#1A0B2E`  
- Body: Montserrat 400, `#3D2D1F`  
- Eyebrow: `#C81E78` (Magenta on light)  
- Cards: white bg, `#D4C5A9` border

### Mid Section (Dark Purple)

- Background: `linear-gradient(135deg, #1A0B2E, #2D0A28)`  
- Stats: Montserrat 900 numbers in Tangerine `#FF6B1F`  
- Labels: JetBrains Mono, SA Gold

---

## 7\. The 8 Sector Background Scenes

Each is a pure CSS gradient — no images required. Used in the hero section with JS crossfade.

/\* AI / Machine Learning \*/

.scene-ai {

  background:

    radial-gradient(ellipse 70% 60% at 25% 35%, rgba(120,40,255,0.8), transparent 60%),

    radial-gradient(ellipse 55% 45% at 78% 65%, rgba(60,10,190,0.65), transparent 55%),

    linear-gradient(135deg, \#0D0320, \#0D0530, \#1A0050);

}

/\* Fintech & Capital Markets \*/

.scene-fintech {

  background:

    radial-gradient(ellipse 65% 55% at 68% 38%, rgba(0,160,100,0.7), transparent 58%),

    radial-gradient(ellipse 50% 40% at 22% 68%, rgba(201,160,64,0.45), transparent 55%),

    linear-gradient(160deg, \#010D06, \#041A0E, \#081F12);

}

/\* Smart Cities & Infrastructure \*/

.scene-city {

  background:

    radial-gradient(ellipse 90% 40% at 50% 100%, rgba(255,100,0,0.75), rgba(180,40,0,0.45) 30%, transparent 62%),

    radial-gradient(ellipse 50% 60% at 78% 45%, rgba(30,60,130,0.6), transparent 58%),

    linear-gradient(180deg, \#0D0420, \#1A0B2E, \#200800);

}

/\* Healthtech & MedTech \*/

.scene-health {

  background:

    radial-gradient(ellipse 65% 55% at 32% 28%, rgba(0,180,216,0.75), transparent 58%),

    radial-gradient(ellipse 50% 50% at 72% 62%, rgba(0,100,170,0.55), transparent 55%),

    linear-gradient(135deg, \#000C14, \#001A2A, \#000F1E);

}

/\* Climate Tech & Clean Energy \*/

.scene-energy {

  background:

    radial-gradient(ellipse 75% 50% at 38% 22%, rgba(0,200,80,0.65), transparent 55%),

    radial-gradient(ellipse 55% 60% at 68% 52%, rgba(0,150,60,0.55), transparent 58%),

    linear-gradient(155deg, \#000D04, \#001808, \#002810);

}

/\* Agritech & Food Systems \*/

.scene-agri {

  background:

    radial-gradient(ellipse 70% 50% at 58% 32%, rgba(201,160,64,0.65), transparent 55%),

    radial-gradient(ellipse 50% 60% at 22% 65%, rgba(139,90,20,0.6), transparent 55%),

    linear-gradient(145deg, \#100800, \#1C1000, \#120600);

}

/\* Deep Tech & Semiconductors \*/

.scene-deep {

  background:

    radial-gradient(ellipse 62% 52% at 43% 38%, rgba(0,220,255,0.7), transparent 55%),

    radial-gradient(ellipse 48% 60% at 78% 22%, rgba(0,100,210,0.55), transparent 55%),

    linear-gradient(160deg, \#00070A, \#000E15, \#000F18);

}

/\* Enterprise SaaS & B2B \*/

.scene-saas {

  background:

    radial-gradient(ellipse 65% 55% at 28% 28%, rgba(60,100,210,0.65), transparent 58%),

    radial-gradient(ellipse 52% 48% at 73% 58%, rgba(100,140,230,0.5), transparent 55%),

    linear-gradient(135deg, \#030710, \#07101E, \#0A1428);

}

/\* Sector label pill (overlay) \*/

.fa-scene-label {

  font-family: 'JetBrains Mono', monospace;

  font-size: 0.7rem;

  letter-spacing: 0.16em;

  text-transform: uppercase;

  color: rgba(255,255,255,0.75);

  background: rgba(26, 11, 46, 0.6);

  backdrop-filter: blur(12px);

  padding: 7px 22px;

  border-radius: 100px;

  border: 1px solid rgba(201, 160, 64, 0.35);

}

---

## 8\. Spacing System

| Token | Value | Usage |
| :---- | :---- | :---- |
| xs | 4px | Icon gaps, tight internal spacing |
| sm | 8px | Badge padding, chip gaps |
| md | 12px | Button gaps, compact card padding |
| lg | 16px | Grid gaps (mobile), paragraph spacing |
| xl | 24px | Card grid gaps, standard component spacing |
| 2xl | 32px | Card internal padding, section intro |
| 3xl | 48px | Section padding (mobile) |
| 4xl | 80px | Section vertical padding (desktop) |
| 5xl | 100px | Full-width section vertical padding |

### Border Radius Scale

| Value | Usage |
| :---- | :---- |
| 6px | Badge/tag pill background |
| 8px | Year badge |
| 10px | Buttons |
| 12px | Small cards |
| 16px | Logo backgrounds |
| 20px | Large cards, sections |
| 100px | Pills, badge pills, circular chips |

---

## 9\. Voice & Tone

### Brand Voice Pillars

1. **Confident** — Direct assertions. "The right capital partner exists — AI finds them." Never "AI might help you find a partner."  
2. **Precise** — Numbers over adjectives. "50+ compatibility signals" not "comprehensive matching."  
3. **Human** — Acknowledge the founder's pain before pitching the solution.

### Headline Formula

Line 1 (white):    \[Provocative command — Stop/Don't/No more \+ pain\]

Line 2 (tangerine): \[The promise that follows — Your \+ positive outcome\]

Max 12 words per line. Montserrat 900 throughout.

Example:

Stop Pitching Blind.  
Your Next Investor Is Already Looking for You.

### Subheadline Formula

\[Assertion\] — \[mechanism\]. \[Full audience coverage\].

\[Additional evidence sentence\]. Not by chance. By design.

### Eyebrow Formula

\[SECTION THEME IN ALL CAPS\]

Font: JetBrains Mono 500, 0.72rem, letter-spacing: 0.14em

Color: SA Gold \#C9A040 on dark · Magenta \#C81E78 on light

### Copy Rules

| ✓ Write | × Never Write |
| :---- | :---- |
| "50+ compatibility signals" | "game-changing AI platform" |
| "Every match is scored, explained, and filtered" | "world-class matching algorithm" |
| "Stop pitching to investors who don't fund your stage" | "amazing opportunities for your journey" |
| "The right investor is already looking" | "join the Founders Arena family" |
| "Not by chance. By design." | "unlimited potential" |

---

## 10\. Full-Width (Full-Bleed) Deployment

When deployed inside GCF (Game Changer Funnel) or any platform with a constrained content wrapper, use this CSS to force sections to full viewport width:

/\* GCF PARENT OVERRIDE — add at top of any embedded stylesheet \*/

html, body {

  width: 100% \!important;

  max-width: 100% \!important;

  padding-left: 0 \!important;

  padding-right: 0 \!important;

  margin-left: 0 \!important;

  margin-right: 0 \!important;

  overflow-x: hidden \!important;

}

/\* Full-bleed section breakout \*/

.fa-fullbleed {

  width: 100vw \!important;

  max-width: 100vw \!important;

  position: relative \!important;

  left: 50% \!important;

  transform: translateX(-50%) \!important;

  margin-left: 0 \!important;

  margin-right: 0 \!important;

  box-sizing: border-box \!important;

}

Apply `.fa-fullbleed` to every `<section>`, the ticker `<div>`, the final CTA, and the footer.  
Inner content containers: `max-width: 1200px; margin: 0 auto; padding: 0 40px;`

---

## 11\. Do & Don't

### Always Do

- Montserrat 900 for all headlines — no exceptions  
- Write `FOUNDERS ARENA` in all-caps for the wordmark  
- Use Tangerine `#FF6B1F` as the primary action color (CTAs, active states)  
- Use SA Gold `#C9A040` for eyebrows, labels, and the tagline — not for CTAs  
- Use JetBrains Mono exclusively for labels, tags, metadata, and eyebrows  
- Close every primary CTA section with "Not by chance. By design."  
- Apply the dark overlay on sector background scenes for text legibility  
- Credit "Organized by Exoasia Innovation Hub" in all official event materials  
- Use the three-button CTA group (gradient primary, outline secondary, ghost text) as a unit

### Never Do

- Use "Founders Arena" in mixed case or title case for the wordmark  
- Apply gradient fills, glow effects, or drop shadows to the wordmark  
- Use purple, red, or green as primary brand colors (semantic status colors only)  
- Use Inter, Arial, Roboto, or any sans-serif other than Montserrat for UI copy  
- Use hype language: "game-changer," "world-class," "revolutionary," "amazing"  
- Place the wordmark on a gradient or photograph without a solid color shield  
- Use Montserrat 300 or 400 for headlines or the wordmark  
- Reference GACPh, Global AI Council Philippines, or Cybersecurity Council Philippines in any Founders Arena material

---

## 12\. Entity & Legal Credits

**Founders Arena Inc.**  
Philippine stock corporation, Makati City  
Organized by Exoasia Innovation Hub OPC

**Brand Custodian**  
Exoasia Innovation Hub OPC  
21F 8 Rockwell, Makati City, Philippines  
[mackcomandante@exoasia.org](mailto:mackcomandante@exoasia.org) · \+63 917 505 2409 · exoasia.org

*All brand usage requests, co-branding applications, and design approvals require written consent from Exoasia Innovation Hub OPC.*

---

*Founders Arena Brand Guide v1.0 · May 2026 · Confidential*  
*Not by chance. By design.*  
