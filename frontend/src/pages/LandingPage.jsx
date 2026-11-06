import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background-dark text-white overflow-x-hidden">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border-dark bg-background-dark/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-3xl">autorenew</span>
            <span className="text-xl font-bold tracking-tight text-white font-syne">RecoverForge</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#problem" className="text-sm font-medium text-slate-300 hover:text-primary transition-colors">The Problem</a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-300 hover:text-primary transition-colors">How It Works</a>
            <a href="#architecture" className="text-sm font-medium text-slate-300 hover:text-primary transition-colors">Architecture</a>
            <Link to="/demo-store" className="text-sm font-medium text-primary hover:underline">Live Demo</Link>
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
      <section className="relative pt-20 pb-20 lg:pt-32 lg:pb-28 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary/10 blur-[130px] rounded-full pointer-events-none z-0"></div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-dark border border-border-dark">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-200">Razorpay AI Buildathon — Track 3: AI Revenue Recovery</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight text-white font-syne max-w-4xl mx-auto">
            Recover Failed Payments.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-green-400 to-emerald-400">
              Autonomously With AI.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-text-muted leading-relaxed max-w-2xl mx-auto">
            Over 20% of Indian online checkouts fail due to bank declines, insufficient balance, or network drop-offs. RecoverForge's autonomous agent perceives gateway webhooks, classifies root causes, creates fresh Razorpay payment links, and recovers revenue without friction.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              to="/signup"
              className="h-12 px-8 rounded-xl bg-primary text-slate-900 font-bold text-sm hover:bg-primary-hover transition-all shadow-[0_0_30px_rgba(232,255,71,0.3)] flex items-center gap-2"
            >
              <span>Connect Razorpay Account</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
            <Link
              to="/demo-store"
              className="h-12 px-6 rounded-xl border border-border-dark bg-surface-dark text-white font-medium hover:bg-surface-lighter transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-primary text-[20px]">smart_toy</span>
              <span>Test Interactive Demo Store</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Core Flow */}
      <section id="how-it-works" className="py-20 bg-surface-dark border-y border-border-dark">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white font-syne">The 5-Step Autonomous Recovery Cycle</h2>
            <p className="text-text-muted text-sm">How RecoverForge turns dropped transactions into settled revenue</p>
          </div>

          <div className="grid md:grid-cols-5 gap-4">
            {[
              { step: '1', title: 'Webhook Capture', desc: 'Securely receives Razorpay payment.failed webhook with HMAC verification and idempotency.' },
              { step: '2', title: 'AI Classification', desc: 'GPT-4o-mini analyzes gateway error telemetry into categories (insufficient funds, bank decline, user dropoff).' },
              { step: '3', title: 'Payment Link', desc: 'Generates fresh, dedicated Razorpay Payment Link with 48h expiration.' },
              { step: '4', title: 'Empathetic Copy', desc: 'AI writes respectful email tailored to the error with instant pay & opt-out links.' },
              { step: '5', title: 'Auto-Halt', desc: 'Follow-ups scheduled with cron; stops immediately when payment.captured or payment_link.paid fires.' }
            ].map((s) => (
              <div key={s.step} className="p-5 rounded-xl bg-background-dark border border-border-dark space-y-2">
                <span className="text-2xl font-bold text-primary font-syne">{s.step}</span>
                <h3 className="text-sm font-bold text-white">{s.title}</h3>
                <p className="text-xs text-text-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-dark py-10 bg-background-dark text-center text-xs text-text-muted">
        <div className="mx-auto max-w-7xl px-6 space-y-2">
          <div className="flex items-center justify-center gap-2 text-white font-bold font-syne text-sm">
            <span className="material-symbols-outlined text-primary">autorenew</span>
            RecoverForge
          </div>
          <p>© 2026 RecoverForge. Built for Razorpay AI Buildathon, Track 3 (AI Revenue Recovery).</p>
        </div>
      </footer>
    </div>
  );
}
