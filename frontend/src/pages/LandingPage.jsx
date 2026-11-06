
import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background-dark text-white overflow-x-hidden">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border-dark bg-background-dark/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-3xl">bolt</span>
            <span className="text-xl font-bold tracking-tight text-white font-display">MailForge</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            {['Features', 'Templates', 'Pricing', 'Blog'].map(item => (
              <a key={item} href="#" className="text-sm font-medium text-slate-300 hover:text-primary transition-colors">{item}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-4 py-2">Sign In</Link>
            <Link to="/signup" className="h-9 px-5 rounded-lg bg-primary text-background-dark font-bold text-sm hover:bg-primary-hover transition-all shadow-[0_0_20px_rgba(232,255,71,0.3)] flex items-center">
              Start Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-24 pb-20 lg:pt-36 lg:pb-28 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary/8 blur-[120px] rounded-full pointer-events-none z-0"></div>
        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-6 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-lighter border border-border-dark w-fit">
                <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                <span className="text-xs font-medium text-slate-300">GPT-4o Integration Live</span>
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight text-white font-display">
                Cold Emails That<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-400">Actually Get Replies</span>
              </h1>
              <p className="text-lg text-text-secondary leading-relaxed max-w-lg">
                Boost your reply rates by 300% with AI-driven hyper-personalization. Stop sending generic templates, start real conversations at scale.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Link to="/signup" className="h-12 px-8 rounded-lg bg-primary text-background-dark font-bold text-base hover:bg-primary-hover transition-all shadow-[0_0_30px_rgba(232,255,71,0.25)] flex items-center">
                  Start for Free
                </Link>
                <button className="h-12 px-8 rounded-lg border border-border-dark bg-surface-dark text-white font-medium hover:bg-surface-lighter transition-all flex items-center gap-2 group">
                  <span className="material-symbols-outlined text-[20px] group-hover:text-primary transition-colors">play_circle</span>
                  View Demo
                </button>
              </div>
              <p className="text-sm text-text-secondary">✓ 50 free credits &nbsp; ✓ No credit card required &nbsp; ✓ Cancel anytime</p>
            </div>

            {/* Mock UI */}
            <div className="relative flex items-center justify-center">
              <div className="w-full max-w-md bg-surface-dark border border-border-dark rounded-2xl shadow-2xl p-6">
                <div className="flex items-center justify-between border-b border-border-dark pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">JD</div>
                    <div>
                      <div className="text-sm font-bold text-white">John Doe</div>
                      <div className="text-xs text-text-secondary">CEO @ TechFlow</div>
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-green-900/30 border border-green-500/30 rounded text-green-400 text-xs font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">bolt</span> 94% Match
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <p className="text-slate-300 leading-relaxed">
                    Hi John,<br /><br />
                    Noticed you recently expanded TechFlow's engineering team — congrats on the Series B!<br /><br />
                    We helped DevScale cut cloud bills by <span className="bg-primary/20 text-primary px-1 rounded">40% in 3 weeks</span>. Open to a 5-min chat?
                  </p>
                  <div className="pt-4 flex gap-3">
                    <button className="flex-1 py-2 bg-primary text-background-dark font-bold rounded text-xs">Send Email</button>
                    <button className="px-3 py-2 bg-surface-lighter text-white rounded text-xs border border-border-dark">Regenerate</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-surface-dark border-y border-border-dark">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-display">3 Steps to Personalization</h2>
            <p className="text-text-secondary text-lg">Automate your outreach without losing the human touch.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: 'tune', title: '1. Define Your Target', desc: 'Input persona, pain points, company info and your unique offer. The more specific, the better.' },
              { icon: 'auto_awesome', title: '2. AI Generation', desc: 'Our GPT-4o engine creates a personalized, human-like email optimized for reply rates.' },
              { icon: 'send', title: '3. Send & Scale', desc: 'Review, copy, and send. Save to history and generate follow-ups with one click.' }
            ].map((f, i) => (
              <div key={i} className="group p-8 rounded-2xl bg-background-dark border border-border-dark hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-surface-lighter border border-border-dark flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl">{f.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3 font-display">{f.title}</h3>
                <p className="text-text-secondary leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 bg-background-dark" id="pricing">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-display">Simple Pricing</h2>
            <p className="text-text-secondary text-lg">Start free, upgrade when you're ready to scale.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Free */}
            <div className="p-8 rounded-2xl bg-surface-dark border border-border-dark">
              <h3 className="text-xl font-bold text-white mb-2 font-display">Free</h3>
              <div className="text-4xl font-bold text-white mb-6">₹0</div>
              <ul className="space-y-3 mb-8">
                {['50 credits', '5 credits per cold email', 'Email history', 'Basic templates'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-text-secondary text-sm">
                    <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span> {f}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="block w-full py-3 text-center rounded-lg border border-border-dark text-white font-medium hover:bg-surface-lighter transition-colors">
                Get Started Free
              </Link>
            </div>
            {/* Premium */}
            <div className="p-8 rounded-2xl bg-surface-lighter border-2 border-primary relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-background-dark text-xs font-bold rounded-full">MOST POPULAR</div>
              <h3 className="text-xl font-bold text-white mb-2 font-display">Premium</h3>
              <div className="text-4xl font-bold text-primary mb-1">₹999<span className="text-lg text-text-secondary font-normal">/month</span></div>
              <p className="text-text-secondary text-sm mb-6">Best for serious outreach</p>
              <ul className="space-y-3 mb-8">
                {['1,000 credits/month', '5 credits per cold email', '3 credits per follow-up', 'Priority AI generation', 'Full history & search', 'Follow-up sequences'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-white text-sm">
                    <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span> {f}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="block w-full py-3 text-center rounded-lg bg-primary text-background-dark font-bold hover:bg-primary-hover transition-colors shadow-[0_0_20px_rgba(232,255,71,0.3)]">
                Start Premium
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-dark py-12 bg-surface-dark">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">bolt</span>
            <span className="font-bold text-white font-display">MailForge</span>
          </div>
          <p className="text-text-secondary text-sm">© 2024 MailForge. All rights reserved.</p>
          <div className="flex gap-6">
            {['Privacy', 'Terms', 'Support'].map(l => (
              <a key={l} href="#" className="text-text-secondary hover:text-white text-sm transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
