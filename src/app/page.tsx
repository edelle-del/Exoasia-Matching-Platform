"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "./providers";
import { createClient } from "@/lib/supabase/client";
import { getRoleFromAccessToken } from "@/lib/auth/jwt";
import { getSignedInRedirectPath } from "@/lib/auth/access";
import logo from "./logo.png";

const SECTORS = [
  { id: "web3",    label: "Web3 / DeFi",   desc: "Blockchain protocols, DeFi platforms, tokenized assets" },
  { id: "ai",      label: "AI / ML",        desc: "AI/ML infrastructure, vertical AI apps, foundation models" },
  { id: "fintech", label: "FinTech",        desc: "Payments, lending, embedded finance, open banking" },
  { id: "health",  label: "HealthTech",     desc: "Digital health, medtech, genomics, telemedicine" },
  { id: "climate", label: "ClimateTech",    desc: "Clean energy, carbon markets, agtech, circular economy" },
];

const STEPS = [
  { num: "01", title: "Apply & Get Verified",       body: "Submit your startup or investor profile. Our advisors review every application — no unverified actors." },
  { num: "02", title: "AI-Curated Matching",         body: "Our Gemini-powered engine scores fit across sector, stage, thesis, and track record — not just keywords." },
  { num: "03", title: "Advisor-Gated Introduction",  body: "Every match is reviewed by a Founders Arena advisor before both parties receive the warm intro." },
  { num: "04", title: "Deal Board & Progress",       body: "Track your pipeline through four trust stages — from Intro to Closed — in one transparent deal board." },
];

const STATS = [
  { value: "2026", label: "Demo Day" },
  { value: "₱1B+", label: "Capital Sought" },
  { value: "50+",  label: "Startups" },
  { value: "30+",  label: "Investors" },
];

const FAQS = [
  { q: "Who can join Founders Arena?", a: "Founders Arena is open to startups and investors operating in or targeting the Philippine tech and innovation ecosystem. Every applicant is manually reviewed before gaining platform access." },
  { q: "How does the AI matching work?", a: "Our Gemini-powered engine evaluates alignment across sector, funding stage, investment thesis, and founder track record. It generates a scored fit report — not just a ranked list — so both parties understand why the match was made." },
  { q: "What is the advisor review step?", a: "Every AI-generated match is reviewed and approved by a Founders Arena advisor before either party is notified. This ensures quality, removes noise, and protects everyone's time." },
  { q: "Is there a cost to join?", a: "Access to Founders Arena is currently invitation-only and free for qualified founders and investors during the 2026 Demo Day cohort. Future cohorts may introduce a membership tier." },
  { q: "What happens after the introduction?", a: "You'll use the Deal Board to track the relationship through four trust stages: Introduction → Qualified → Due Diligence → Closed. All activity is logged so advisors can support you at every step." },
];

const TICKER_ITEMS = [
  "AI-Curated Deal Flow", "Advisor-Gated Introductions", "Web3 & AI Focused",
  "Philippine Innovation", "2026 Demo Day", "Trusted by Founders",
  "Trusted by Investors", "Backed by Exoasia",
];

export default function Home() {
  const router = useRouter();
  const { signedIn, isInvitedAccount } = useAuth();

  // ── Signed-in redirect ──
  useEffect(() => {
    if (!signedIn) return;
    const redirectBasedOnProfile = async () => {
      if (isInvitedAccount) { router.replace("/accept-invite"); return; }
      try {
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token ?? null;
        const tokenRole = getRoleFromAccessToken(accessToken);
        const { data } = await supabase.auth.getUser();
        const userId = data?.user?.id;
        if (!userId) { router.replace("/dashboard"); return; }
        const { data: profile } = await supabase.from("profiles").select("id, full_name, sector").eq("id", userId).single();
        const needsOnboarding = !profile || !profile.full_name || !profile.sector;
        router.replace(getSignedInRedirectPath({ role: tokenRole, isInvitedAccount, needsOnboarding }));
      } catch { router.replace("/dashboard"); }
    };
    redirectBasedOnProfile();
  }, [signedIn, isInvitedAccount, router]);

  // ── Cinematic sector slides ──
  const [slideIdx, setSlideIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSlideIdx((i) => (i + 1) % SECTORS.length), 5000);
    return () => clearInterval(t);
  }, []);

  // ── Nav scroll hide/show ──
  const [navHidden, setNavHidden] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const lastY = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setNavScrolled(y > 40);
      setNavHidden(y > lastY.current && y > 120);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Mobile menu ──
  const [mobileOpen, setMobileOpen] = useState(false);


  // ── Fade-up scroll animations ──
  const fadeRefs = useRef<(HTMLElement | null)[]>([]);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) (e.target as HTMLElement).classList.add("visible"); }),
      { threshold: 0.12 }
    );
    fadeRefs.current.forEach((el) => { if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);
  const fadeRef = (i: number) => (el: HTMLElement | null) => { fadeRefs.current[i] = el; };

  if (signedIn) return null;

  return (
    <>
      {/* ── NAV ── */}
      <nav className={`xo-nav${navScrolled ? " xo-nav-scrolled" : ""}${navHidden ? " xo-nav-hidden" : ""}`}>
        <div className="xo-nav-inner">
          <Link href="/" className="xo-nav-logo">
            <Image src={logo} alt="Founders Arena" width={28} height={28} className="xo-logo-img" />
            <div>
              <div className="xo-nav-logo-name">Founders Arena</div>
              <div className="xo-nav-logo-sub">by Exoasia</div>
            </div>
          </Link>

          <div className="xo-nav-links">
            <a href="#how-it-works">How It Works</a>
            <a href="#for-who">For Who</a>
            <a href="#faq">FAQ</a>
            <Link href="/sign-in" className="xo-nav-cta-ghost">Member Login</Link>
            <Link href="/sign-up" className="xo-nav-cta">Apply Now</Link>
          </div>

          <button type="button" className="xo-hamburger" aria-label="Toggle menu" onClick={() => setMobileOpen((p) => !p)}>
            <i className="fas fa-bars" />
          </button>
        </div>

        {mobileOpen && (
          <div className="xo-mobile-menu open">
            <button type="button" className="xo-mobile-close" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
              <i className="fas fa-times" />
            </button>
            <a href="#how-it-works" onClick={() => setMobileOpen(false)}>How It Works</a>
            <a href="#for-who" onClick={() => setMobileOpen(false)}>For Who</a>
            <a href="#faq" onClick={() => setMobileOpen(false)}>FAQ</a>
            <Link href="/sign-in" onClick={() => setMobileOpen(false)}>Member Login</Link>
            <Link href="/sign-up" className="xo-btn-primary" onClick={() => setMobileOpen(false)}>Apply Now →</Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="xo-hero">
        <div className="xo-hero-bg" aria-hidden="true">
          {SECTORS.map((s, i) => (
            <div key={s.id} className={`xo-slide xo-scene-${s.id}${i === slideIdx ? " active" : ""}`} />
          ))}
        </div>
        <div className="xo-hero-overlay" aria-hidden="true" />

        <div className="xo-slide-label" aria-live="polite">
          {SECTORS[slideIdx].label} — {SECTORS[slideIdx].desc}
        </div>

        <div className="xo-hero-content">
          <div className="xo-hero-badge">
            <span className="dot" />
            <span className="xo-hero-badge-text">2026 Demo Day Cohort</span>
          </div>

          <h1>
            Where Philippine<br />
            <span className="xo-gradient-text">Startups Meet Capital</span>
          </h1>

          <p className="xo-hero-sub">
            Founders Arena is an invitation-only matching platform connecting verified founders and investors
            through AI-curated deals, advisor-gated introductions, and a structured deal board — built on top of the Exoasia Innovation Hub.
          </p>

          <div className="xo-cta-group">
            <Link href="/sign-up" className="xo-btn-primary">Apply Now →</Link>
            <a href="#how-it-works" className="xo-btn-ghost">See How It Works</a>
          </div>

          <div className="xo-slide-dots" aria-label="Sector slides">
            {SECTORS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Sector: ${s.label}`}
                className={`xo-dot${i === slideIdx ? " xo-dot-active" : ""}`}
                onClick={() => setSlideIdx(i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="xo-ticker" aria-hidden="true">
        <div className="xo-ticker-track">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="xo-ticker-item">
              <span className="xo-ticker-dot" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── PROBLEM ── */}
      <section className="xo-section xo-section-dark" ref={fadeRef(0) as React.Ref<HTMLElement>}>
        <div className="xo-container xo-fade-up">
          <span className="xo-eyebrow">The Problem</span>
          <h2 className="xo-section-h2">
            Great founders can&apos;t find the right investors.<br />
            Great investors can&apos;t filter the noise.
          </h2>
          <div className="xo-problem-grid">
            <div className="xo-problem-card">
              <div className="xo-problem-icon">⌂</div>
              <h3>No Signal</h3>
              <p>Cold emails and conference hallways aren&apos;t a deal sourcing strategy. Most introductions happen through luck, not merit.</p>
            </div>
            <div className="xo-problem-card">
              <div className="xo-problem-icon">▪</div>
              <h3>No Trust Layer</h3>
              <p>Without verification, investors get unqualified decks and founders get ghosted. The ecosystem loses.</p>
            </div>
            <div className="xo-problem-card">
              <div className="xo-problem-icon">◆</div>
              <h3>No Structure</h3>
              <p>Once a meeting happens, there&apos;s no shared system to track interest, diligence, or deal progress.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="xo-section xo-section-light" ref={fadeRef(1) as React.Ref<HTMLElement>}>
        <div className="xo-container xo-fade-up">
          <span className="xo-eyebrow">How It Works</span>
          <h2 className="xo-section-h2 xo-section-h2-dark">A curated process, end-to-end</h2>
          <div className="xo-steps">
            {STEPS.map((step) => (
              <div key={step.num} className="xo-step">
                <div className="xo-step-num">{step.num}</div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO IT'S FOR ── */}
      <section id="for-who" className="xo-section xo-section-dark" ref={fadeRef(2) as React.Ref<HTMLElement>}>
        <div className="xo-container xo-fade-up">
          <span className="xo-eyebrow">Who It&apos;s For</span>
          <h2 className="xo-section-h2">Built for both sides of the table</h2>
          <div className="xo-for-who-grid">
            <div className="xo-for-card">
              <div className="xo-for-sub">For Founders</div>
              <h3>Philippine startup founders</h3>
              <ul className="xo-for-list">
                <li><i className="fas fa-check" />Building in Web3, AI, FinTech, HealthTech, or ClimateTech</li>
                <li><i className="fas fa-check" />Raising Pre-Seed, Seed, or Series A</li>
                <li><i className="fas fa-check" />Looking for investors who understand the local ecosystem</li>
                <li><i className="fas fa-check" />Ready to be introduced — not just matched</li>
              </ul>
              <Link href="/sign-up" className="xo-for-cta">Apply as Founder →</Link>
            </div>
            <div className="xo-for-card featured">
              <div className="xo-for-sub">For Investors</div>
              <h3>Angels, VCs &amp; Family Offices</h3>
              <ul className="xo-for-list">
                <li><i className="fas fa-check" />Active thesis: Philippine tech, SEA cross-border, Web3 infrastructure</li>
                <li><i className="fas fa-check" />Writing checks from ₱500K to ₱50M+</li>
                <li><i className="fas fa-check" />Want curated deal flow — not a firehose</li>
                <li><i className="fas fa-check" />Value advisor-reviewed, structured introductions</li>
              </ul>
              <Link href="/sign-up" className="xo-for-cta">Apply as Investor →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── BY THE NUMBERS ── */}
      <section className="xo-section xo-section-dark xo-section-center" ref={fadeRef(3) as React.Ref<HTMLElement>}>
        <div className="xo-container xo-fade-up">
          <span className="xo-eyebrow">By the Numbers</span>
          <h2 className="xo-section-h2">2026 Demo Day Cohort</h2>
          <div className="xo-numbers-grid xo-numbers-4">
            {STATS.map((s) => (
              <div key={s.label} className="xo-number-cell">
                <span className="xo-big">{s.value}</span>
                <span className="xo-nlabel">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── POWERED BY EXOASIA ── */}
      <section className="xo-section xo-section-light" ref={fadeRef(4) as React.Ref<HTMLElement>}>
        <div className="xo-container xo-fade-up">
          <div className="xo-exoasia-wrap">
            <div className="xo-exoasia-content">
              <span className="xo-eyebrow xo-eyebrow-pink">Powered by Exoasia</span>
              <h2 className="xo-section-h2 xo-section-h2-dark xo-section-h2-left">
                Backed by the Philippine Innovation Hub
              </h2>
              <p className="xo-exoasia-body">
                Founders Arena is built on top of <strong>Exoasia Innovation Hub</strong> — the organizer behind
                Philippine Blockchain Week and a trusted convener of the Philippine startup ecosystem.
                Our network includes regulators, corporate partners, and community builders who unlock
                doors beyond the cap table.
              </p>
              <a href="https://exoasia.org" target="_blank" rel="noopener noreferrer" className="xo-btn-ghost xo-exoasia-link">
                Learn about Exoasia →
              </a>
            </div>
            <div className="xo-exoasia-badge">
              <Image src={logo} alt="Founders Arena" width={64} height={64} className="xo-exoasia-badge-img" />
              <p className="xo-exoasia-badge-name">Founders Arena 2026</p>
              <p className="xo-exoasia-badge-sub">by Exoasia Innovation Hub</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── REGISTER / APPLY ── */}
      <section className="xo-section xo-section-dark xo-section-center" ref={fadeRef(5) as React.Ref<HTMLElement>}>
        <div className="xo-container xo-fade-up">
          <span className="xo-eyebrow">Get Started</span>
          <h2 className="xo-section-h2">Ready to join the cohort?</h2>
          <p className="xo-register-desc">
            Applications for the 2026 Demo Day cohort are open. Every application is reviewed by a Founders Arena advisor.
          </p>
          <div className="xo-cta-group">
            <Link href="/sign-up" className="xo-btn-primary">Apply Now →</Link>
            <Link href="/sign-in" className="xo-btn-ghost">Member Login</Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="xo-section xo-section-dark" ref={fadeRef(6) as React.Ref<HTMLElement>}>
        <div className="xo-container xo-fade-up">
          <span className="xo-eyebrow">FAQ</span>
          <h2 className="xo-section-h2 xo-faq-heading">Common Questions</h2>
          <div className="xo-faq-list">
            {FAQS.map((item, i) => (
              <details key={i} className="xo-faq-item">
                <summary className="xo-faq-q">
                  <span>{item.q}</span>
                  <i className="fas fa-plus xo-faq-chevron" />
                </summary>
                <div className="xo-faq-a">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="xo-final-cta" ref={fadeRef(7) as React.Ref<HTMLElement>}>
        <div className="xo-container xo-fade-up">
          <h2>
            The right capital partner exists — AI finds them.<br />
            <span className="xo-gradient-text">Founders Arena</span> is the intelligent matching platform
            that connects founders, investors, and ecosystem partners by stage, sector, check size, and geography.<br />
            <span className="xo-final-cta-sub">Across Southeast Asia and beyond.</span>
          </h2>
          <div className="xo-cta-group">
            <Link href="/sign-up" className="xo-btn-primary">Apply Now →</Link>
            <Link href="/sign-in" className="xo-btn-ghost">Member Login</Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="xo-footer">
        <div className="xo-footer-inner">
          <div>
            <div className="xo-footer-brand">
              <Image src={logo} alt="Founders Arena" width={20} height={20} className="xo-footer-logo-img" />
              <span>Founders Arena</span>
            </div>
            <p className="xo-footer-desc">
              Where Philippine startups meet the capital that scales them.
            </p>
            <p className="xo-footer-copy">© 2026 Exoasia Innovation Hub. All rights reserved.</p>
          </div>
          <div className="xo-footer-links">
            <Link href="/sign-up">Apply</Link>
            <Link href="/sign-in">Member Login</Link>
            <a href="#how-it-works">How It Works</a>
            <a href="#faq">FAQ</a>
            <a href="https://exoasia.org" target="_blank" rel="noopener noreferrer">Exoasia.org</a>
          </div>
        </div>
      </footer>
    </>
  );
}
