'use client';

import { useState, useEffect, CSSProperties } from 'react';

type Phase = 'question' | 'feedback';

const QUESTION = {
  topic: 'Preflight Preparation',
  text: 'You are planning a VFR cross-country flight from KFXE to KORL. How will you prepare for the trip?',
};

const FEEDBACK = {
  score: 2,
  label: 'Adequate, but incomplete',
  covered: ['Weather briefing', 'Fuel planning'],
  missed: ['NOTAMs', 'Weight & Balance'],
  strongerAnswer:
    'For this flight, I would review the latest METARs and TAFs, check NOTAMs, and calculate the weight and balance to ensure we are within limits.',
  whyMatters: 'Neglecting NOTAMs could lead to restricted airspace violations.',
};

// ─── Tokens ───────────────────────────────────────────────────────────────────
const F = {
  display: "var(--font-bebas), 'Bebas Neue', sans-serif",
  serif:   "'Georgia', 'Times New Roman', serif",
  body:    "var(--font-dm), 'DM Sans', system-ui, sans-serif",
} as const;

const C = {
  silver:  'linear-gradient(160deg,#5a5a5a 0%,#a8a8a8 18%,#e0e0e0 36%,#ffffff 50%,#e8e8e8 62%,#b8b8b8 78%,#d0d0d0 100%)',
  orange:  'linear-gradient(135deg,#e07010 0%,#f09030 45%,#ea6800 100%)',
  orangeH: 'linear-gradient(135deg,#f08020 0%,#ffa040 45%,#f07010 100%)',
  // iOS 26 glass surfaces — lighter, more translucent
  g0: 'rgba(255,255,255,0.10)',  // outer panel
  g1: 'rgba(255,255,255,0.13)',  // cards
  g2: 'rgba(255,255,255,0.09)',  // subtle surfaces
  b0: 'rgba(255,255,255,0.22)',  // border bright
  b1: 'rgba(255,255,255,0.14)',  // border mid
  b2: 'rgba(255,255,255,0.07)',  // border faint
  text0: 'rgba(255,255,255,0.92)',
  text1: 'rgba(255,255,255,0.62)',
  text2: 'rgba(255,255,255,0.38)',
} as const;

// ─── iOS 26 liquid glass SVG filter (low-scale displacement = subtle lens) ────
function LiquidFilters() {
  return (
    <svg aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <defs>
        {/* Main glass — very low scale for iOS 26 subtlety */}
        <filter id="gMain" x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.022" numOctaves="3" seed="12" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation="0.3" />
        </filter>
        {/* Card glass — even softer */}
        <filter id="gCard" x="-6%" y="-6%" width="112%" height="112%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.022 0.028" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {/* Textarea — softest */}
        <filter id="gTx" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.010 0.014" numOctaves="3" seed="20" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="10" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation="0.25" />
        </filter>
      </defs>
    </svg>
  );
}

// ─── iOS 26 glass surface ─────────────────────────────────────────────────────
// Lighter bg, lower blur (12–18px), vivid border highlights
function ios26(blur = 16, extra: CSSProperties = {}): CSSProperties {
  return {
    position: 'relative',
    background: C.g1,
    backdropFilter: `url(#gCard) blur(${blur}px) saturate(1.9) brightness(1.12)`,
    WebkitBackdropFilter: `url(#gCard) blur(${blur}px) saturate(1.9) brightness(1.12)`,
    border: `1px solid ${C.b1}`,
    boxShadow: [
      '0 4px 24px rgba(0,0,0,0.28)',
      'inset 0 1.5px 0 rgba(255,255,255,0.32)',
      'inset 0 -1px 0 rgba(255,255,255,0.06)',
      '0 1px 0 rgba(0,0,0,0.12)',
    ].join(', '),
    borderRadius: 20,
    overflow: 'hidden',
    ...extra,
  };
}

// ─── Specular top edge ────────────────────────────────────────────────────────
function TopEdge({ opacity = 0.45 }: { opacity?: number }) {
  return (
    <div aria-hidden="true" style={{
      position: 'absolute', top: 0, left: '6%', right: '6%', height: 1,
      background: `linear-gradient(90deg,transparent,rgba(255,255,255,${opacity * 0.5}),rgba(255,255,255,${opacity}),rgba(255,255,255,${opacity * 0.5}),transparent)`,
      pointerEvents: 'none', zIndex: 4,
    }} />
  );
}

// ─── Section overline ─────────────────────────────────────────────────────────
function Label({ children }: { children: string }) {
  return (
    <p style={{
      margin: '0 0 7px', fontFamily: F.body, fontSize: 10, fontWeight: 700,
      letterSpacing: '0.20em', textTransform: 'uppercase', color: C.text2,
    }}>
      {children}
    </p>
  );
}

// ─── Feedback row ─────────────────────────────────────────────────────────────
function Row({ text, ok }: { text: string; ok: boolean }) {
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, listStyle: 'none' }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="5.8" stroke={ok ? 'rgba(140,210,180,0.70)' : 'rgba(240,175,80,0.70)'} strokeWidth="1.3" fill={ok ? 'rgba(100,200,150,0.10)' : 'rgba(240,175,80,0.08)'} />
        {ok
          ? <path d="M4.2 7l2 2 3.6-3.6" stroke="rgba(140,225,190,0.88)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          : <path d="M4.8 4.8l4.4 4.4M9.2 4.8l-4.4 4.4" stroke="rgba(245,185,80,0.88)" strokeWidth="1.4" strokeLinecap="round" />
        }
      </svg>
      <span style={{ fontFamily: F.body, fontSize: 13, color: C.text0, fontWeight: 300, lineHeight: 1.5 }}>{text}</span>
    </li>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
type V = 'orange' | 'glass' | 'ghost';
function Btn({ label, onClick, v = 'ghost' }: { label: string; onClick: () => void; v?: V }) {
  const [ho, setHo] = useState(false);
  const [pr, setPr] = useState(false);
  const s: Record<V, CSSProperties> = {
    orange: {
      background: ho ? C.orangeH : C.orange,
      color: '#fff',
      border: '1px solid rgba(255,165,60,0.30)',
      boxShadow: ho
        ? '0 4px 20px rgba(240,110,14,0.52),inset 0 1.5px 0 rgba(255,225,170,0.28)'
        : '0 4px 14px rgba(220,90,8,0.38),inset 0 1.5px 0 rgba(255,210,150,0.18)',
    },
    glass: {
      background: ho ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.10)',
      border: `1px solid ${ho ? C.b0 : C.b1}`,
      color: ho ? C.text0 : C.text1,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.20)',
    },
    ghost: {
      background: ho ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${ho ? C.b2 : 'transparent'}`,
      color: ho ? C.text1 : C.text2,
    },
  };
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHo(true)}
      onMouseLeave={() => { setHo(false); setPr(false); }}
      onMouseDown={() => setPr(true)}
      onMouseUp={() => setPr(false)}
      style={{
        flex: 1, height: 46, borderRadius: 14,
        fontFamily: F.body, fontSize: 12.5, fontWeight: 600, letterSpacing: '0.06em',
        cursor: 'pointer', touchAction: 'manipulation',
        transform: pr ? 'scale(0.96)' : 'scale(1)',
        transition: 'all 0.18s ease', position: 'relative', overflow: 'hidden',
        ...s[v],
      }}
    >
      {v === 'orange' && (
        <span aria-hidden="true" style={{
          position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
          background: `rgba(255,235,200,${ho ? 0.32 : 0.16})`, pointerEvents: 'none',
        }} />
      )}
      {label}
    </button>
  );
}

// ─── iOS 26 answer textarea ───────────────────────────────────────────────────
function AnswerField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative', marginBottom: 14 }}>
      {/* Prismatic focus ring */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: -1, borderRadius: 19, pointerEvents: 'none', zIndex: 0,
        background: focused
          ? 'conic-gradient(from 200deg,rgba(255,255,255,0.36) 0deg,rgba(200,215,245,0.22) 90deg,rgba(230,235,255,0.28) 180deg,rgba(210,222,250,0.22) 270deg,rgba(255,255,255,0.36) 360deg)'
          : 'rgba(255,255,255,0.10)',
        transition: 'background 0.28s ease',
      }} />
      <div aria-hidden="true" style={{
        position: 'absolute', top: 1, left: '8%', right: '8%', height: 1,
        background: `linear-gradient(90deg,transparent,rgba(255,255,255,${focused ? 0.45 : 0.18}),transparent)`,
        pointerEvents: 'none', zIndex: 3, transition: 'background 0.28s ease',
      }} />
      <textarea
        id="answer-field"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Type your answer here…"
        rows={4}
        aria-label="Your answer"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          position: 'relative', zIndex: 1,
          display: 'block', width: '100%', boxSizing: 'border-box',
          resize: 'none', borderRadius: 18, padding: '14px 18px',
          fontFamily: F.body, fontSize: 14, lineHeight: 1.68, fontWeight: 300,
          background: focused ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.08)',
          backdropFilter: `url(#gTx) blur(14px) saturate(2.0) brightness(${focused ? 1.18 : 1.10})`,
          WebkitBackdropFilter: `url(#gTx) blur(14px) saturate(2.0) brightness(${focused ? 1.18 : 1.10})`,
          border: 'none', outline: 'none',
          color: C.text0,
          boxShadow: focused
            ? 'inset 0 2px 8px rgba(0,0,0,0.14), 0 0 0 0.5px rgba(255,255,255,0.20)'
            : 'inset 0 2px 6px rgba(0,0,0,0.12)',
          caretColor: 'rgba(245,130,28,0.90)',
          transition: 'background 0.24s ease, box-shadow 0.24s ease',
        }}
      />
    </div>
  );
}

// ─── Left step tracker ────────────────────────────────────────────────────────
const STEPS: Array<{ id: Phase; num: number; title: string; sub: string }> = [
  { id: 'question', num: 1, title: 'Question',  sub: 'Read & Answer'   },
  { id: 'feedback', num: 2, title: 'Feedback',  sub: 'Review Results'  },
];

function StepTracker({ phase }: { phase: Phase }) {
  const activeIdx = STEPS.findIndex(s => s.id === phase);

  return (
    <div style={{
      width: 148, flexShrink: 0, padding: '36px 16px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      borderRight: `1px solid ${C.b2}`,
    }}>
      {/* Step list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, alignItems: 'center', width: '100%' }}>
        {STEPS.map((step, i) => {
          const done    = i < activeIdx;
          const current = i === activeIdx;
          const future  = i > activeIdx;

          return (
            <div key={step.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                {/* Circle + connector column */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  {/* Step circle */}
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    background: current
                      ? C.orange
                      : done
                        ? 'rgba(255,255,255,0.14)'
                        : 'rgba(255,255,255,0.06)',
                    border: current
                      ? '1px solid rgba(255,165,60,0.40)'
                      : done
                        ? `1px solid ${C.b1}`
                        : `1px solid ${C.b2}`,
                    boxShadow: current
                      ? '0 0 18px rgba(235,100,10,0.45), 0 4px 12px rgba(220,90,8,0.30), inset 0 1.5px 0 rgba(255,210,140,0.28)'
                      : done
                        ? 'inset 0 1px 0 rgba(255,255,255,0.18)'
                        : 'none',
                    transition: 'all 0.38s cubic-bezier(0.22,1,0.36,1)',
                  }}>
                    {done ? (
                      /* Checkmark */
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                        <path d="M3 6.5l2.5 2.5 4.5-4.5" stroke="rgba(255,255,255,0.75)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <span style={{
                        fontFamily: F.display, fontSize: 15, fontWeight: 400, letterSpacing: '0.04em',
                        color: current ? '#fff' : C.text2,
                        lineHeight: 1, userSelect: 'none',
                        transition: 'color 0.38s ease',
                      }}>
                        {step.num}
                      </span>
                    )}
                  </div>

                  {/* Connector line — only between items */}
                  {i < STEPS.length - 1 && (
                    <div style={{
                      width: 1.5, height: 40, marginTop: 3, marginBottom: 3,
                      background: done
                        ? 'linear-gradient(to bottom, rgba(255,255,255,0.22), rgba(255,255,255,0.10))'
                        : 'rgba(255,255,255,0.08)',
                      borderRadius: 1,
                      transition: 'background 0.38s ease',
                    }} />
                  )}
                </div>

                {/* Step label */}
                <div style={{ paddingTop: 5, paddingBottom: i < STEPS.length - 1 ? 0 : 0 }}>
                  <p style={{
                    margin: '0 0 2px', fontFamily: F.body, fontSize: 13, fontWeight: current ? 600 : 400,
                    color: current ? C.text0 : done ? C.text1 : C.text2,
                    transition: 'color 0.38s ease',
                  }}>
                    {step.title}
                  </p>
                  <p style={{
                    margin: 0, fontFamily: F.body, fontSize: 10.5, fontWeight: 400,
                    color: current ? C.text1 : C.text2,
                    transition: 'color 0.38s ease',
                  }}>
                    {step.sub}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Difficulty badge at bottom */}
      <div style={{ marginTop: 'auto', paddingTop: 36, display: 'flex', justifyContent: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 8,
          background: 'rgba(255,255,255,0.07)', border: `1px solid ${C.b2}`,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(240,175,60,0.75)' }} />
          <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.text2 }}>
            Intermediate
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Question phase ───────────────────────────────────────────────────────────
function QuestionPhase({ answer, setAnswer, onSubmit, onSkip, onMark }: {
  answer: string; setAnswer: (v: string) => void;
  onSubmit: () => void; onSkip: () => void; onMark: () => void;
}) {
  return (
    <div>
      {/* Heading */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{
          margin: '0 0 8px', fontFamily: F.display,
          fontSize: 'clamp(58px, 9vw, 96px)', fontWeight: 400, letterSpacing: '0.10em', lineHeight: 0.95,
          color: 'rgba(255,255,255,0.96)',
          textShadow: '0 2px 24px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.20)',
        }}>
          Oral Evaluation
        </h1>
        <p style={{
          margin: 0,
          fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
          fontSize: 'clamp(15px, 2.2vw, 20px)', fontWeight: 400, fontStyle: 'italic', letterSpacing: '0.04em',
          color: 'rgba(255,165,55,0.95)',
          textShadow: '0 1px 12px rgba(215,92,8,0.50), 0 0 32px rgba(240,110,10,0.25)',
        }}>
          {QUESTION.topic}
        </p>
      </div>

      {/* Question card */}
      <div style={ios26(14, { marginBottom: 12 })}>
        <TopEdge opacity={0.42} />
        <div style={{ padding: '20px 24px' }}>
          <label htmlFor="answer-field" style={{
            display: 'block', fontFamily: F.body, fontSize: 14, lineHeight: 1.76,
            color: C.text0, fontWeight: 300,
          }}>
            {QUESTION.text}
          </label>
        </div>
      </div>

      <AnswerField value={answer} onChange={setAnswer} />

      <div style={{ display: 'flex', gap: 8 }}>
        <Btn label="Submit" onClick={onSubmit} v="orange" />
        <Btn label="Skip"   onClick={onSkip}   v="ghost"  />
        <Btn label="Mark for Review" onClick={onMark} v="glass" />
      </div>
    </div>
  );
}

// ─── Feedback phase ───────────────────────────────────────────────────────────
function FeedbackPhase({ onContinue, onReviewLater }: { onContinue: () => void; onReviewLater: () => void }) {
  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <p style={{ margin: '0 0 5px', fontFamily: F.body, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: C.text2 }}>
          Your Score
        </p>
        <h1 style={{
          margin: 0, fontFamily: F.display,
          fontSize: 'clamp(34px, 5vw, 54px)', fontWeight: 400, letterSpacing: '0.06em', lineHeight: 1.1,
          color: 'rgba(255,255,255,0.96)',
          textShadow: '0 2px 20px rgba(0,0,0,0.50), 0 1px 0 rgba(255,255,255,0.18)',
        }}>
          {FEEDBACK.score} — {FEEDBACK.label}
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div style={ios26(12, { padding: '15px 17px' })}>
          <TopEdge opacity={0.38} />
          <Label>Covered</Label>
          <ul style={{ margin: 0, padding: 0 }}>{FEEDBACK.covered.map(t => <Row key={t} text={t} ok />)}</ul>
        </div>
        <div style={ios26(12, { padding: '15px 17px' })}>
          <TopEdge opacity={0.38} />
          <Label>Missed</Label>
          <ul style={{ margin: 0, padding: 0 }}>{FEEDBACK.missed.map(t => <Row key={t} text={t} ok={false} />)}</ul>
        </div>
      </div>

      <div style={ios26(12, { padding: '15px 20px', marginBottom: 10 })}>
        <TopEdge opacity={0.38} />
        <Label>Stronger Answer</Label>
        <p style={{ margin: 0, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.74, color: C.text1, fontWeight: 300 }}>
          {FEEDBACK.strongerAnswer}
        </p>
      </div>

      <div style={ios26(12, { padding: '15px 20px', marginBottom: 16 })}>
        <TopEdge opacity={0.38} />
        <Label>Why This Matters</Label>
        <p style={{ margin: 0, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.74, color: C.text1, fontWeight: 300 }}>
          {FEEDBACK.whyMatters}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Btn label="Continue"     onClick={onContinue}    v="orange" />
        <Btn label="Review Later" onClick={onReviewLater} v="glass"  />
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function OralEvaluationClient() {
  const [phase, setPhase]   = useState<Phase>('question');
  const [answer, setAnswer] = useState('');
  const [mounted, setMounted] = useState(false);
  const [fading, setFading]   = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  const go = (fn: () => void) => {
    setFading(true);
    setTimeout(() => { fn(); setFading(false); }, 260);
  };

  return (
    <>
      <style>{`
        ::placeholder { color: rgba(255,255,255,0.22); font-family: var(--font-dm),'DM Sans',sans-serif; }
        @media (prefers-reduced-motion: reduce) {
          *,*::before,*::after { animation-duration:0.01ms!important; transition-duration:0.01ms!important; }
        }
      `}</style>

      <LiquidFilters />

      {/* ── Viewport ─────────────────────────────────────────────────────── */}
      <div style={{
        minHeight: '100dvh', width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative', padding: '24px',
        // Lighter overlays — let the background image breathe more
        backgroundImage: `
          radial-gradient(ellipse 60% 50% at 50% 100%, rgba(18,10,3,0.70) 0%, transparent 65%),
          radial-gradient(ellipse 45% 30% at 10% 80%,  rgba(4,10,32,0.45) 0%, transparent 55%),
          radial-gradient(ellipse 45% 30% at 90% 80%,  rgba(4,10,32,0.45) 0%, transparent 55%),
          linear-gradient(180deg, rgba(0,0,2,0.30) 0%, rgba(1,3,6,0.30) 100%),
          url('/wmremove-transformed.png')
        `,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}>
        {/* Fine scanline grain */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.018) 2px,rgba(0,0,0,0.018) 3px)',
          zIndex: 1,
        }} />

        {/* ── OUTER GLASS PANEL ──────────────────────────────────────────── */}
        <div style={{
          position: 'relative', zIndex: 10,
          width: '100%', maxWidth: 860,
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0) scale(1)' : 'translateY(22px) scale(0.98)',
          transition: 'opacity 0.70s cubic-bezier(0.22,1,0.36,1), transform 0.70s cubic-bezier(0.22,1,0.36,1)',

          // iOS 26 outer panel — lighter, vivid specular, lower blur
          background: C.g0,
          backdropFilter: `url(#gMain) blur(20px) saturate(2.0) brightness(1.15)`,
          WebkitBackdropFilter: `url(#gMain) blur(20px) saturate(2.0) brightness(1.15)`,
          borderRadius: 28,
          border: `1px solid ${C.b1}`,
          boxShadow: [
            '0 20px 60px rgba(0,0,0,0.52)',
            '0 1px 0 rgba(255,255,255,0.30)',           // top chrome
            'inset 0 1.5px 0 rgba(255,255,255,0.28)',   // inner top highlight
            'inset 0 -1px 0 rgba(255,255,255,0.05)',
            '0 0 0 0.5px rgba(255,255,255,0.08)',
          ].join(', '),
          display: 'flex',
          overflow: 'hidden',
        }}>
          {/* Panel top-edge shimmer */}
          <div aria-hidden="true" style={{
            position: 'absolute', top: 0, left: '4%', right: '4%', height: 1.5,
            background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.22),rgba(255,255,255,0.50),rgba(255,255,255,0.22),transparent)',
            pointerEvents: 'none', zIndex: 30,
          }} />

          {/* ── LEFT: STEP TRACKER ───────────────────────────────────────── */}
          <StepTracker phase={phase} />

          {/* ── RIGHT: EVAL CONTENT ──────────────────────────────────────── */}
          <main style={{ flex: 1, padding: '36px 36px 36px 28px', minWidth: 0, overflow: 'auto' }}>
            <div style={{
              opacity: fading ? 0 : 1,
              transform: fading ? 'translateY(4px)' : 'translateY(0)',
              transition: 'opacity 0.26s ease, transform 0.26s ease',
            }}>
              {phase === 'question' ? (
                <QuestionPhase
                  answer={answer} setAnswer={setAnswer}
                  onSubmit={() => go(() => setPhase('feedback'))}
                  onSkip={() => go(() => setAnswer(''))}
                  onMark={() => go(() => {})}
                />
              ) : (
                <FeedbackPhase
                  onContinue={() => go(() => { setPhase('question'); setAnswer(''); })}
                  onReviewLater={() => go(() => { setPhase('question'); setAnswer(''); })}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
