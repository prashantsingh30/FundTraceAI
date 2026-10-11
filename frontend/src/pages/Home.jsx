import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../context/ThemeContext';
import LogoImage from '../assets/FundTrace_Logo.png';
import { 
  Shield, 
  Cpu, 
  Network, 
  FileText, 
  Globe, 
  Lock, 
  ChevronRight, 
  ArrowRight, 
  CheckCircle,
  Database,
  Activity,
  Layers,
  Moon,
  Sun,
  Laptop,
  Check,
  Building,
  TrendingUp,
  AlertTriangle,
  Info,
  ChevronDown,
  X,
  BookOpen,
  Scale,
  FileCheck,
  ShieldCheck,
  Terminal,
  ExternalLink,
  HelpCircle,
  Sparkles
} from 'lucide-react';

// Counter component for stats with IntersectionObserver support
const StatCounter = ({ value, label, suffix = '', prefix = '' }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const numericVal = parseInt(value.replace(/\D/g, '')) || 0;
    if (numericVal === 0) {
      setCount(value);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let startTime = null;
        const duration = 1600;

        const animate = (timestamp) => {
          if (!startTime) startTime = timestamp;
          const progress = Math.min((timestamp - startTime) / duration, 1);
          setCount(Math.floor(progress * numericVal));
          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            setCount(numericVal);
          }
        };
        requestAnimationFrame(animate);
        observer.disconnect();
      }
    }, { threshold: 0.1 });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="text-center p-5 sm:p-6 lg:p-8 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800/85 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-800 transition-all duration-300">
      <div className="text-2xl sm:text-2xl md:text-3xl lg:text-3xl xl:text-4xl font-black text-blue-600 dark:text-blue-500 font-mono mb-2 tracking-tighter truncate">
        {prefix}{typeof count === 'number' ? count.toLocaleString() : count}{suffix}
      </div>
      <div className="text-[10px] sm:text-xs uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400">{label}</div>
    </div>
  );
};

export default function Home() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSection, setActiveSection] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);

  // Track active section on scroll
  useEffect(() => {
    const sections = ['hero', 'compliance', 'capabilities', 'workflow', 'showcase', 'tech', 'stats'];
    const observers = sections.map(id => {
      const el = document.getElementById(id);
      if (!el) return null;

      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          setActiveSection(id);
        }
      }, { rootMargin: '-30% 0px -60% 0px' });
      
      observer.observe(el);
      return { observer, el };
    });

    return () => {
      observers.forEach(o => {
        if (o) o.observer.disconnect();
      });
    };
  }, []);

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  const screenshots = {
    dashboard: {
      title: 'Executive Compliance Dashboard',
      desc: 'Get an overview of active risk indicators, payment channel volumes, and live alert loads across branches.',
      color: 'from-blue-600 to-indigo-650',
      icon: Layers,
      features: [
        'Real-time transaction velocity monitoring',
        'INR transaction volume splits (NEFT, RTGS, IMPS, UPI)',
        'Active risk status charts & live environment diagnostic status'
      ]
    },
    transactions: {
      title: 'Real-Time Transaction Audit',
      desc: 'Examine detailed transaction history with customized filtering by payment type, risk level, and country origin.',
      color: 'from-orange-500 to-rose-500',
      icon: Activity,
      features: [
        'Six-factor composite risk engine calculations',
        'Direct links to SHAP feature attributions',
        'Indian rupee value-structuring highlights'
      ]
    },
    alerts: {
      title: 'Explainable AI Decisioning & SHAP',
      desc: 'Secure complete regulatory transparency with explainable prediction details backed by SHAP local feature importance.',
      color: 'from-purple-600 to-indigo-600',
      icon: Cpu,
      features: [
        'SHAP contribution charts per transaction',
        'Interactive compliance recommendations & actions',
        'Direct investigator escalation & assignment workflows'
      ]
    },
    graph: {
      title: 'Network Graph Intelligence',
      desc: 'Visualize money flows using interactive NetworkX directed layouts. Identify wash loops and complex layering schemes.',
      color: 'from-emerald-600 to-teal-600',
      icon: Network,
      features: [
        'Louvain community detection and circular wash-trading loops',
        'Centrality metrics: Betweenness, Closeness, Degree, PageRank',
        'Suspect account node inspection registry'
      ]
    },
    riskMap: {
      title: 'Geospatial Fund Routing Map',
      desc: 'Monitor cross-border wire transfers, showing transaction aggregates alongside active FATF tax haven alerts.',
      color: 'from-cyan-600 to-blue-600',
      icon: Globe,
      features: [
        'FATF High-Risk Jurisdictions blacklist checks',
        'Interactive country node selection with drilldown tables',
        'Tax haven threat index indicators (KY, PA, RU, BS)'
      ]
    },
    cases: {
      title: 'Enterprise Case Management',
      desc: 'Manage the complete lifecycle of escalations, assign compliance officers, upload evidence files, and log audits.',
      color: 'from-pink-600 to-rose-600',
      icon: Shield,
      features: [
        'Vertical timeline chronology of investigator actions',
        'Secure multi-format compliance document upload',
        'Compliance PDF audit trail generator'
      ]
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-[#020617] dark:text-slate-100 font-sans antialiased transition-colors duration-300">
      
      {/* Background Grids & Blobs */}
      <div className="absolute top-0 inset-x-0 h-[640px] bg-gradient-to-b from-blue-500/5 to-transparent dark:from-blue-900/10 pointer-events-none" />
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-80 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* ─── Premium Navigation Bar ─── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-slate-200 dark:border-slate-800/60 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md shadow-sm dark:shadow-none transition-all duration-300">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-650 via-indigo-500 to-blue-650" />
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/50 dark:border-slate-700/50 transition-transform duration-300 group-hover:scale-115">
              <img src={LogoImage} className="w-full h-full object-contain" alt="FundTrace Logo" />
            </div>
            <div className="transition-transform duration-300 group-hover:translate-x-1">
              <span className="font-extrabold tracking-wide text-base text-slate-900 dark:text-white">FundTrace <span className="text-blue-600 dark:text-blue-500">AI</span></span>
              <span className="text-[8px] block text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest -mt-0.5">Financial Intelligence</span>
            </div>
          </div>
          
          <nav className="hidden lg:flex items-center gap-8 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <a 
              href="#capabilities" 
              onClick={(e) => scrollToSection(e, 'capabilities')} 
              className={`relative transition-all duration-300 hover:text-blue-600 dark:hover:text-blue-400 hover:-translate-y-0.5 block py-1 ${
                activeSection === 'capabilities' ? 'text-blue-650 dark:text-blue-550 font-black' : ''
              }`}
            >
              Capabilities
              {activeSection === 'capabilities' && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-500 animate-pulse" />
              )}
            </a>
            <a 
              href="#workflow" 
              onClick={(e) => scrollToSection(e, 'workflow')} 
              className={`relative transition-all duration-300 hover:text-blue-600 dark:hover:text-blue-400 hover:-translate-y-0.5 block py-1 ${
                activeSection === 'workflow' ? 'text-blue-650 dark:text-blue-550 font-black' : ''
              }`}
            >
              Workflow
              {activeSection === 'workflow' && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-500 animate-pulse" />
              )}
            </a>
            <a 
              href="#showcase" 
              onClick={(e) => scrollToSection(e, 'showcase')} 
              className={`relative transition-all duration-300 hover:text-blue-600 dark:hover:text-blue-400 hover:-translate-y-0.5 block py-1 ${
                activeSection === 'showcase' ? 'text-blue-650 dark:text-blue-550 font-black' : ''
              }`}
            >
              Showcase
              {activeSection === 'showcase' && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-500 animate-pulse" />
              )}
            </a>
            <a 
              href="#tech" 
              onClick={(e) => scrollToSection(e, 'tech')} 
              className={`relative transition-all duration-300 hover:text-blue-600 dark:hover:text-blue-400 hover:-translate-y-0.5 block py-1 ${
                activeSection === 'tech' ? 'text-blue-650 dark:text-blue-550 font-black' : ''
              }`}
            >
              Technology
              {activeSection === 'tech' && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-500 animate-pulse" />
              )}
            </a>
            <a 
              href="#stats" 
              onClick={(e) => scrollToSection(e, 'stats')} 
              className={`relative transition-all duration-300 hover:text-blue-600 dark:hover:text-blue-400 hover:-translate-y-0.5 block py-1 ${
                activeSection === 'stats' ? 'text-blue-650 dark:text-blue-550 font-black' : ''
              }`}
            >
              Metrics
              {activeSection === 'stats' && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-500 animate-pulse" />
              )}
            </a>
          </nav>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors text-slate-500 dark:text-slate-400"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button 
              onClick={() => navigate('/login')}
              className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all shadow-sm shadow-blue-500/10 flex items-center gap-1.5 btn-premium-glow"
            >
              <Lock className="w-3.5 h-3.5" /> Secure Login
            </button>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="lg:hidden p-2 rounded-lg border border-slate-250 dark:border-slate-850 text-slate-550 dark:text-slate-350"
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${mobileMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 py-4 flex flex-col gap-4 text-xs font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400 animate-slide-in">
            <a href="#capabilities" onClick={(e) => scrollToSection(e, 'capabilities')} className="hover:text-blue-500 py-1">Capabilities</a>
            <a href="#workflow" onClick={(e) => scrollToSection(e, 'workflow')} className="hover:text-blue-500 py-1">Workflow</a>
            <a href="#showcase" onClick={(e) => scrollToSection(e, 'showcase')} className="hover:text-blue-500 py-1">Showcase</a>
            <a href="#tech" onClick={(e) => scrollToSection(e, 'tech')} className="hover:text-blue-500 py-1">Technology</a>
            <a href="#stats" onClick={(e) => scrollToSection(e, 'stats')} className="hover:text-blue-500 py-1">Metrics</a>
          </div>
        )}
      </header>

      {/* ─── Hero Section ─── */}
      <section id="hero" className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-600/10 dark:border-blue-500/20 bg-blue-500/5 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5" /> Smarter AML Monitoring for Modern Banking
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight text-slate-900 dark:text-white">
              AI-Powered <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-650 to-blue-500 dark:from-blue-400 dark:via-indigo-400 dark:to-blue-500 bg-clip-text text-transparent">
                Financial Crime Intelligence
              </span>
            </h1>
            
            <p className="text-sm md:text-base text-slate-550 dark:text-slate-400 leading-relaxed max-w-xl">
              An enterprise-grade transaction monitoring and AML compliance platform built for regulated financial institutions. Safeguard transactions with explainable models and graph network intelligence.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <button 
                onClick={() => navigate('/login')}
                className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all btn-premium-glow"
              >
                Launch Platform Console <ArrowRight className="w-4 h-4" />
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 rounded-lg transition-all btn-premium-glow"
              >
                Request Integration Demo
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200 dark:border-slate-900">
              <div>
                <div className="text-xl font-black text-slate-850 dark:text-white">&lt; 2.0s</div>
                <div className="text-[9px] text-slate-500 uppercase font-extrabold tracking-wider">Evaluation Latency</div>
              </div>
              <div>
                <div className="text-xl font-black text-slate-850 dark:text-white">99.8%</div>
                <div className="text-[9px] text-slate-500 uppercase font-extrabold tracking-wider">Detection Accuracy</div>
              </div>
              <div>
                <div className="text-xl font-black text-slate-850 dark:text-white">100%</div>
                <div className="text-[9px] text-slate-500 uppercase font-extrabold tracking-wider">Explainability (XAI)</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/20 backdrop-blur shadow-xl dark:shadow-none">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl opacity-10 dark:opacity-15 blur-xl" />
              
              <div className="relative bg-white dark:bg-slate-950 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-900 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-350 font-mono">THREAT AUDIT STREAM</span>
                  </div>
                  <span className="text-[9px] bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-450 px-2 py-0.5 rounded font-mono">LIVE FEED</span>
                </div>
                
                <div className="space-y-2.5">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-900 space-y-1">
                    <div className="flex justify-between text-[9px] font-mono">
                      <span className="text-slate-550 dark:text-slate-450 font-bold">ALERT: IMPS-INR-0428</span>
                      <span className="text-red-600 dark:text-red-400 font-black">RISK: 91%</span>
                    </div>
                    <p className="text-[11px] text-slate-655 dark:text-slate-300 font-medium">UPI structuring pattern detected across 5 split transfers to tax shelter.</p>
                  </div>
                  
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-900 space-y-1">
                    <div className="flex justify-between text-[9px] font-mono">
                      <span className="text-slate-550 dark:text-slate-450 font-bold">NEFT-LIMIT-FLAG</span>
                      <span className="text-orange-600 dark:text-orange-400 font-black">RISK: 73%</span>
                    </div>
                    <p className="text-[11px] text-slate-655 dark:text-slate-300 font-medium">Rapid transaction velocity check triggered. Transfer total: ₹9,95,000.</p>
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-450 font-mono">
                  <span>API LATENCY: 14ms</span>
                  <span>ENGINE: XGBOOST + SHAP</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Compliance Section ─── */}
      <section id="compliance" className="border-y border-slate-200 bg-white dark:border-slate-900 dark:bg-slate-950/40 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h4 className="text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-500 font-black">Regulatory Compliance</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
              Designed for Public and Private Sector banks, ensuring complete alignment with local regulatory and intelligence frameworks.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {['RBI Directives', 'FIU-IND Guidelines', 'PMLA 2002', 'FATF Standards', 'AML/CFT Aligned'].map((rule) => (
              <span key={rule} className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-[10px] font-bold text-slate-650 dark:text-slate-300">
                {rule}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Platform Capabilities ─── */}
      <section id="capabilities" className="py-20 px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-500 uppercase tracking-widest">Platform capabilities</span>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">Advanced Detection Capabilities</h2>
          <p className="text-slate-550 dark:text-slate-400 max-w-xl mx-auto text-xs md:text-sm">
            FundTrace AI integrates explainable machine learning models, community graphs, and compliance audit frameworks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Cpu, title: 'Explainable AI Decisioning', desc: 'SHAP explanations map local feature attributions, showing investigators exactly why a transaction was flagged.' },
            { icon: Network, title: 'Directed Graph Analytics', desc: 'Computes PageRank, betweenness centrality, and isolates wash-trading networks to reveal complex fraud rings.' },
            { icon: Globe, title: 'Geospatial Risk Tracking', desc: 'Monitors international money flows, highlighting high-risk jurisdictions under FATF watchlists.' },
            { icon: Shield, title: 'Multi-Factor Risk Scoring', desc: 'Six-factor composite scoring blends transaction size, payment channels, geographic parameters, and velocity profiles.' },
            { icon: FileText, title: 'Regulatory Report Compiler', desc: 'One-click generation of PDF audits and STR files containing all transaction data, SHAP reports, and case histories.' },
            { icon: Lock, title: 'Audit Trail Security', desc: 'Enforces complete action logging for admins, investigators, and auditors to maintain chain of custody.' }
          ].map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div key={idx} className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/20 hover:border-blue-500/30 dark:hover:border-blue-500/20 hover:shadow-md transition-all duration-300 space-y-4">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">{feat.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Platform Workflow ─── */}
      <section id="workflow" className="py-20 px-6 bg-white dark:bg-slate-950/60 border-y border-slate-200 dark:border-slate-900">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-500 uppercase tracking-widest">Process Flow</span>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Unified Investigation Loop</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 text-center">
            {[
              { num: '01', name: 'Transaction' },
              { num: '02', name: 'AI Analysis' },
              { num: '03', name: 'Explainability' },
              { num: '04', name: 'Graph Analysis' },
              { num: '05', name: 'Risk Scoring' },
              { num: '06', name: 'Alert Queue' },
              { num: '07', name: 'Investigation' },
              { num: '08', name: 'STR Report' }
            ].map((step, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 dark:border-slate-900 bg-slate-50 dark:bg-slate-900/30 space-y-2 relative group hover:border-blue-500/20 transition-all duration-300">
                <div className="text-2xl font-black text-slate-400 dark:text-slate-700 font-mono group-hover:text-blue-650 dark:group-hover:text-blue-500/60 transition-colors">{step.num}</div>
                <div className="text-[11px] font-bold text-slate-850 dark:text-white tracking-wide">{step.name}</div>
                {idx < 7 && (
                  <div className="hidden lg:block absolute top-1/2 -right-2.5 -translate-y-1/2 text-slate-350 dark:text-slate-700 font-bold z-10 pointer-events-none">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Product Previews Tab Section ─── */}
      <section id="showcase" className="py-20 px-6 max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-500 uppercase tracking-widest">Interface Previews</span>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">Experience FundTrace AI</h2>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {Object.keys(screenshots).map((key) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border uppercase tracking-wider ${
                activeTab === key
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-850 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        <div className="p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-900/20 backdrop-blur max-w-5xl mx-auto shadow-sm dark:shadow-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-4">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">{screenshots[activeTab].title}</h3>
              <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">{screenshots[activeTab].desc}</p>
              
              <ul className="space-y-2 pt-2">
                {screenshots[activeTab].features.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs text-slate-655 dark:text-slate-350">
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-500 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              
              <button 
                onClick={() => navigate('/login')}
                className="mt-4 px-5 py-2.5 text-xs font-bold uppercase tracking-wider bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg flex items-center gap-2 transition-all btn-premium-glow"
              >
                Access Screen Console <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="lg:col-span-7">
              {/* Realistic device frame */}
              <div className="p-2 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-100 dark:bg-slate-950 overflow-hidden shadow-lg relative min-h-[240px] flex items-center justify-center bg-gradient-to-tr from-slate-100 to-white dark:from-slate-950 dark:to-slate-900">
                <div className="text-center p-6 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
                    {React.createElement(screenshots[activeTab].icon, { className: 'w-6 h-6' })}
                  </div>
                  <span className="text-xs font-bold block text-slate-800 dark:text-white font-mono">{screenshots[activeTab].title}</span>
                  <span className="text-[10px] text-slate-450 dark:text-slate-500 block max-w-xs mx-auto">Click Launch Console to interact with this operational interface in the secure environment.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Technology Stack ─── */}
      <section id="tech" className="py-20 px-6 bg-white dark:bg-slate-950/60 border-y border-slate-200 dark:border-slate-900">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-500 uppercase tracking-widest">Stack Architecture</span>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Engineered on Production-Grade Frameworks</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Frontend Interface', tech: 'React, Vite, Recharts, Cytoscape.js', desc: 'Responsive layouts, interactive community graph networks, and high-contrast geospatial risk maps.' },
              { title: 'Compliance APIs', tech: 'Node.js, Express, JWT, PDFKit', desc: 'Secure, authenticated backends handling transactional updates and packaged PDF reports.' },
              { title: 'AI Risk Engine', tech: 'Python, XGBoost, Scikit-Learn', desc: 'Optimized gradient-boosted trees providing transaction risk scores at scale.' },
              { title: 'Explainability & Graph', tech: 'SHAP, NetworkX, MongoDB', desc: 'Local feature attribution models and mathematical graph centrality calculations.' }
            ].map((tech, idx) => (
              <div key={idx} className="p-5 rounded-xl border border-slate-200 dark:border-slate-900 bg-slate-50 dark:bg-slate-900/30 space-y-3">
                <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{tech.title}</h4>
                <div className="text-xs font-bold text-slate-800 dark:text-white font-mono">{tech.tech}</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Counter Metrics ─── */}
      <section id="stats" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCounter value="25000000" suffix="+" label="Transactions Processed" />
          <StatCounter value="99" suffix="%" label="Model Classification Accuracy" />
          <StatCounter value="2" suffix="s" label="Decision Speed Per Flag" prefix="< " />
          <StatCounter value="500" suffix="+" label="Risk Parameter Weights" />
        </div>
      </section>

      {/* ─── Call to Action ─── */}
      <section className="py-20 px-6 text-center max-w-4xl mx-auto space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 rounded-full text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" /> Institutional AML Compliance Portal
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Elevate Your Compliance Operations
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl mx-auto">
            Experience next-generation AML transaction monitoring with real TreeSHAP explainability, multi-hop topological graph analysis, and cryptographic audit security.
          </p>
        </div>
        
        {/* Professional Authorized Role Profiles Directory (No passwords exposed) */}
        <div className="p-6 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-900/5 inline-block text-xs text-left max-w-xl w-full">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Authorized Officer Roles
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
              Personal Password Required
            </span>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/40">
                  admin
                </span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">System Administrator</span>
              </div>
              <span className="text-[11px] text-slate-450 dark:text-slate-400">Rule Engine, ML Governance & User Setup</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-900/40">
                  investigator
                </span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">AML Compliance Officer</span>
              </div>
              <span className="text-[11px] text-slate-450 dark:text-slate-400">Alert Triage, 360 Graph & Case Workflow</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-bold text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-900/40">
                  auditor
                </span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Regulatory Auditor</span>
              </div>
              <span className="text-[11px] text-slate-450 dark:text-slate-400">Read-Only Cryptographic Audit Verification</span>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
            <span>Pass-through username preset enabled</span>
            <span className="font-medium text-slate-500 dark:text-slate-400">Members input their secret password</span>
          </div>
        </div>
        
        <div>
          <button 
            onClick={() => navigate('/login')}
            className="px-8 py-4 text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 mx-auto"
          >
            <span>Access Compliance Portal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ─── Premium Footer ─── */}
      <footer className="border-t border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 py-16 px-6 transition-colors duration-300">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-8 border-b border-slate-100 dark:border-slate-900 pb-12">
          
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3 group w-fit cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/50 dark:border-slate-700/50 transition-transform duration-300 group-hover:scale-110">
                <img src={LogoImage} className="w-full h-full object-contain" alt="FundTrace Logo" />
              </div>
              <div>
                <span className="font-black text-slate-900 dark:text-white text-base">FundTrace <span className="text-blue-600 dark:text-blue-500">AI</span></span>
                <span className="text-[8px] block text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest -mt-0.5">AML Monitoring Platform</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
              Next-generation Anti-Money Laundering monitoring platform engineered for Indian and global financial institutions. Fusing deterministic regulatory rules with calibrated machine learning and local TreeSHAP attribution.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" /> RBI & FIU-IND Compliant
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                <Lock className="w-3.5 h-3.5" /> SHA-256 Ledger
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Platform</h4>
            <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <li>
                <a href="#capabilities" onClick={(e) => scrollToSection(e, 'capabilities')} className="hover:text-blue-500 transition-colors flex items-center gap-1">
                  AI Risk Scoring
                </a>
              </li>
              <li>
                <a href="#capabilities" onClick={(e) => scrollToSection(e, 'capabilities')} className="hover:text-blue-500 transition-colors flex items-center gap-1">
                  Graph Wash Loops
                </a>
              </li>
              <li>
                <button onClick={() => navigate('/risk-map')} className="hover:text-blue-500 text-left transition-colors flex items-center gap-1">
                  Geospatial Risk Map
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/cases')} className="hover:text-blue-500 text-left transition-colors flex items-center gap-1">
                  Case Manager
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Compliance</h4>
            <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <li>
                <button onClick={() => setActiveModal('rbi')} className="hover:text-blue-500 text-left transition-colors flex items-center gap-1.5 group">
                  <FileCheck className="w-3.5 h-3.5 text-orange-500 group-hover:scale-110 transition-transform" />
                  <span>RBI Master Circulars</span>
                </button>
              </li>
              <li>
                <button onClick={() => setActiveModal('fiu')} className="hover:text-blue-500 text-left transition-colors flex items-center gap-1.5 group">
                  <Building className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
                  <span>FIU-IND Guidelines</span>
                </button>
              </li>
              <li>
                <button onClick={() => setActiveModal('pmla')} className="hover:text-blue-500 text-left transition-colors flex items-center gap-1.5 group">
                  <Scale className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
                  <span>PMLA 2002 Directive</span>
                </button>
              </li>
              <li>
                <button onClick={() => setActiveModal('fatf')} className="hover:text-blue-500 text-left transition-colors flex items-center gap-1.5 group">
                  <Globe className="w-3.5 h-3.5 text-purple-500 group-hover:scale-110 transition-transform" />
                  <span>FATF Blacklists</span>
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Resources</h4>
            <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <li>
                <button onClick={() => setActiveModal('api')} className="hover:text-blue-500 text-left transition-colors flex items-center gap-1.5 group">
                  <Terminal className="w-3.5 h-3.5 text-cyan-500 group-hover:scale-110 transition-transform" />
                  <span>API Documentation</span>
                </button>
              </li>
              <li>
                <button onClick={() => setActiveModal('security')} className="hover:text-blue-500 text-left transition-colors flex items-center gap-1.5 group">
                  <Shield className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform" />
                  <span>Security Policies</span>
                </button>
              </li>
              <li>
                <button onClick={() => setActiveModal('terms')} className="hover:text-blue-500 text-left transition-colors flex items-center gap-1.5 group">
                  <BookOpen className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
                  <span>Terms of Service</span>
                </button>
              </li>
              <li>
                <button onClick={() => setActiveModal('privacy')} className="hover:text-blue-500 text-left transition-colors flex items-center gap-1.5 group">
                  <Lock className="w-3.5 h-3.5 text-rose-500 group-hover:scale-110 transition-transform" />
                  <span>Privacy Policy</span>
                </button>
              </li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] font-medium text-slate-400 dark:text-slate-500">
          <span>&copy; {new Date().getFullYear()} FundTrace AI Platform. Engineered for Enterprise Financial Compliance.</span>
          <div className="flex items-center gap-3">
            <span className="text-slate-600 dark:text-slate-400 font-semibold">Lead Author: Prashant Singh</span>
            <span>&middot;</span>
            <span>Version 2.4.0 (Enterprise Build)</span>
          </div>
        </div>
      </footer>

      {/* ─── Interactive Compliance & Documentation Modals ─── */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[85vh] overflow-y-auto space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {activeModal === 'rbi' && <FileCheck className="w-5 h-5 text-orange-500" />}
                  {activeModal === 'fiu' && <Building className="w-5 h-5 text-blue-500" />}
                  {activeModal === 'pmla' && <Scale className="w-5 h-5 text-emerald-500" />}
                  {activeModal === 'fatf' && <Globe className="w-5 h-5 text-purple-500" />}
                  {activeModal === 'api' && <Terminal className="w-5 h-5 text-cyan-500" />}
                  {activeModal === 'security' && <Shield className="w-5 h-5 text-indigo-500" />}
                  {activeModal === 'terms' && <BookOpen className="w-5 h-5 text-amber-500" />}
                  {activeModal === 'privacy' && <Lock className="w-5 h-5 text-rose-500" />}
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {activeModal === 'rbi' && 'Reserve Bank of India (RBI) Master Directions'}
                    {activeModal === 'fiu' && 'Financial Intelligence Unit - India (FIU-IND) Guidelines'}
                    {activeModal === 'pmla' && 'Prevention of Money Laundering Act (PMLA 2002)'}
                    {activeModal === 'fatf' && 'Financial Action Task Force (FATF) International Standards'}
                    {activeModal === 'api' && 'Enterprise AML Gateway API Reference'}
                    {activeModal === 'security' && 'Cryptographic Security & Audit Architecture'}
                    {activeModal === 'terms' && 'Institutional Terms of Service'}
                    {activeModal === 'privacy' && 'Enterprise Data Privacy & Sovereignty Policy'}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Regulatory specification & implementation standards in FundTrace AI.
                </p>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-4 leading-relaxed">
              {activeModal === 'rbi' && (
                <>
                  <p>
                    FundTrace AI aligns with the <strong>RBI Master Direction - Know Your Customer (KYC) Direction, 2016</strong> (updated through 2024-2026) Section 35 through 42 regarding continuous transaction monitoring.
                  </p>
                  <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 space-y-2">
                    <h5 className="font-bold text-orange-900 dark:text-orange-300">Core RBI Mandates Embedded:</h5>
                    <ul className="list-disc pl-4 space-y-1 text-orange-850 dark:text-orange-200">
                      <li><strong>Automated Alert Triggers</strong>: Continuous monitoring of complex, unusually large transactions and unusual patterns which have no apparent economic purpose.</li>
                      <li><strong>Cash Transaction Reporting (CTR)</strong>: Automated tracking of single and integrally connected cash transactions exceeding ₹10,00,000 within a calendar month.</li>
                      <li><strong>Cross-Border Wire Transfers</strong>: Complete originator and beneficiary information validation across SWIFT, RTGS, and cross-border remitting corridors.</li>
                    </ul>
                  </div>
                </>
              )}

              {activeModal === 'fiu' && (
                <>
                  <p>
                    FundTrace AI automates compliance with <strong>FIU-IND Reporting Formats (XML 2.0 Standard)</strong> and Suspicious Transaction Report (STR) lifecycle workflows.
                  </p>
                  <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-2">
                    <h5 className="font-bold text-blue-900 dark:text-blue-300">Deterministic STR/CTR Engine:</h5>
                    <ul className="list-disc pl-4 space-y-1 text-blue-850 dark:text-blue-200">
                      <li><strong>Strict Timelines</strong>: Alerts prioritized with SLA clocks enforcing filing within 7 working days of suspicion determination.</li>
                      <li><strong>No Hallucinations</strong>: Case narratives drafted using verified, deterministic event ledgers and transaction hashes.</li>
                      <li><strong>Electronic Filing Export</strong>: Official XML schema download and encrypted PDF dossier generation with four-eyes supervisor sign-off.</li>
                    </ul>
                  </div>
                </>
              )}

              {activeModal === 'pmla' && (
                <>
                  <p>
                    Complies with the statutory obligations under the <strong>Prevention of Money Laundering Act, 2002 (PMLA)</strong>, including Sections 12, 12AA, and 13.
                  </p>
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-2">
                    <h5 className="font-bold text-emerald-900 dark:text-emerald-300">Statutory Recordkeeping Standards:</h5>
                    <ul className="list-disc pl-4 space-y-1 text-emerald-850 dark:text-emerald-200">
                      <li><strong>5-Year Immutable Retention</strong>: Append-only transaction ledger with explicit debit/credit adjustment records to maintain statutory history.</li>
                      <li><strong>Client Due Diligence (CDD)</strong>: Beneficial ownership identification and ongoing customer profile risk grading (Low, Medium, High).</li>
                      <li><strong>Legal Protection</strong>: Built-in strict role-based access control protecting reporting officers under Section 14 statutory immunity provisions.</li>
                    </ul>
                  </div>
                </>
              )}

              {activeModal === 'fatf' && (
                <>
                  <p>
                    Adheres to the <strong>40 Recommendations of the Financial Action Task Force (FATF)</strong>, specifically Recommendations 10, 16, and 20.
                  </p>
                  <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 space-y-2">
                    <h5 className="font-bold text-purple-900 dark:text-purple-300">Global Watchlist Screening:</h5>
                    <ul className="list-disc pl-4 space-y-1 text-purple-850 dark:text-purple-200">
                      <li><strong>FATF Blacklist & Greylist</strong>: Automated risk weight multipliers applied to flows touching high-risk and monitored jurisdictions (DPRK, Iran, Myanmar, etc.).</li>
                      <li><strong>PEP & Sanctions Fuzzy Match</strong>: Phonetic and Levenshtein string matching against global PEP, UN, and OFAC sanctions lists.</li>
                    </ul>
                  </div>
                </>
              )}

              {activeModal === 'api' && (
                <>
                  <p>
                    The <strong>FundTrace AI REST API Gateway</strong> (Port 5050) provides financial institutions with high-throughput ingestion and triage interfaces.
                  </p>
                  <div className="p-4 rounded-xl bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900/40 space-y-2 font-mono text-[11px]">
                    <div className="text-cyan-900 dark:text-cyan-300 font-bold">Standard Gateway Endpoints:</div>
                    <div>POST /api/transactions/import <span className="text-slate-400"># Column mapping bulk ingestion</span></div>
                    <div>GET  /api/transactions <span className="text-slate-400"># Paginated, indexed transaction feed</span></div>
                    <div>GET  /api/alerts <span className="text-slate-400"># Prioritized alert backlog queue</span></div>
                    <div>POST /api/alerts/:id/disposition <span className="text-slate-400"># Four-eyes case disposition</span></div>
                    <div>GET  /api/admin/audit-logs/verify <span className="text-slate-400"># Cryptographic hash verification</span></div>
                  </div>
                  <p className="text-[11px] text-slate-450 dark:text-slate-400">
                    All routes enforce JSON Web Token (JWT) Bearer authentication with role permissions and IP rate-limiting.
                  </p>
                </>
              )}

              {activeModal === 'security' && (
                <>
                  <p>
                    FundTrace AI employs a <strong>Zero-Trust Cryptographic Audit Architecture</strong> to guarantee tamper-evidence across all compliance actions.
                  </p>
                  <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 space-y-2">
                    <h5 className="font-bold text-indigo-900 dark:text-indigo-300">Cryptographic Guarantees:</h5>
                    <ul className="list-disc pl-4 space-y-1 text-indigo-850 dark:text-indigo-200">
                      <li><strong>SHA-256 Hash Chaining</strong>: Every audit record contains the cryptographic digest of the prior record, verifiable via one-click chain audit.</li>
                      <li><strong>Bcrypt Password Hashing</strong>: Strong salt rounds ensure zero plaintext credential exposure.</li>
                      <li><strong>Data Immutability</strong>: Transaction adjustments are strictly additive; original records are never deleted or modified in place.</li>
                    </ul>
                  </div>
                </>
              )}

              {activeModal === 'terms' && (
                <>
                  <p>
                    <strong>Institutional Master Services Agreement (MSA)</strong> terms governing deployment of the FundTrace AI transaction monitoring software.
                  </p>
                  <div className="space-y-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <p>1. <strong>Enterprise License</strong>: Licensed for enterprise banking, non-banking financial companies (NBFCs), and payment aggregators.</p>
                    <p>2. <strong>Regulatory Audit Rights</strong>: System generates exportable evidence packets for RBI, FIU-IND, and external compliance inspectors.</p>
                    <p>3. <strong>Model Governance</strong>: Explainability outputs (SHAP attributions) are transparent and auditable for supervisory review.</p>
                  </div>
                </>
              )}

              {activeModal === 'privacy' && (
                <>
                  <p>
                    <strong>Data Sovereignty & Privacy Framework</strong> aligned with the <strong>Digital Personal Data Protection Act (DPDPA 2023)</strong> and RBI Data Localization directives.
                  </p>
                  <div className="space-y-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <p>1. <strong>Local Data Sovereignty</strong>: All database transactions and machine learning model artifacts are hosted within domestic Indian cloud regions.</p>
                    <p>2. <strong>Tokenization & Masking</strong>: Sensitive identifying tokens (PAN, Aadhaar numbers) are masked in UI investigator displays.</p>
                    <p>3. <strong>Audited Access</strong>: Every customer 360 profile inspection creates an immutable entry in the compliance ledger.</p>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Close Specification
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
