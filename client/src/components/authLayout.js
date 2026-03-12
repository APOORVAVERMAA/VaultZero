import { motion, AnimatePresence } from "framer-motion";

function AuthLayout({ children, pageKey }) {
  return (
    <div className="relative min-h-screen flex bg-background text-gray-100 overflow-hidden">

      {/* ===== MESH GRID LINES ===== */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <svg className="w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="meshGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6366f1" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#meshGrid)" />
        </svg>
      </div>

      {/* ===== ORIGINAL LAYERED ENCRYPTION FLOW ===== */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-[1]">

        <svg
          className="w-full h-full opacity-30"
          viewBox="0 0 2200 1000"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0" />
              <stop offset="40%" stopColor="#6366f1" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#6366f1" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Back messy curve */}
          <motion.path
            d="M0 280 C400 120 800 520 1200 260 S1800 520 2200 280"
            stroke="url(#flowGrad)"
            strokeWidth="2"
            fill="none"
            strokeDasharray="3000"
            strokeDashoffset="3000"
            animate={{ strokeDashoffset: 0 }}
            transition={{
              duration: 4.2,
              ease: "easeInOut",
              repeat: Infinity,
              repeatDelay: 2
            }}
          />

          {/* Mid curve */}
          <motion.path
            d="M0 430 C500 350 1000 700 1600 430 S2000 700 2200 430"
            stroke="url(#flowGrad)"
            strokeWidth="1.8"
            fill="none"
            strokeDasharray="3000"
            strokeDashoffset="3000"
            animate={{ strokeDashoffset: 0 }}
            transition={{
              duration: 3.8,
              ease: "easeInOut",
              repeat: Infinity,
              repeatDelay: 2,
              delay: 0.5
            }}
          />

          {/* Front stronger curve */}
          <motion.path
            d="M0 350 C600 240 1300 600 1900 350 S2100 600 2200 350"
            stroke="url(#flowGrad)"
            strokeWidth="2.4"
            fill="none"
            strokeDasharray="3000"
            strokeDashoffset="3000"
            animate={{ strokeDashoffset: 0 }}
            transition={{
              duration: 3.5,
              ease: "easeInOut",
              repeat: Infinity,
              repeatDelay: 2,
              delay: 0.3
            }}
          />
        </svg>

      </div>

      {/* ===== LEFT STATIC PANEL ===== */}
      <div className="w-[40%] flex flex-col justify-center px-20 border-r border-borderSubtle relative z-10">

        <h1 className="text-5xl font-bold tracking-tight mb-6 font-mono">
          <span className="text-white">Vault</span><span className="text-primary">Zero</span>
        </h1>

        <p className="text-gray-400 text-lg leading-relaxed max-w-sm font-mono tracking-wider">
          secure. private. permanent.
        </p>

        <div className="mt-10 w-16 h-[2px] bg-primary" />

        <p className="text-gray-500 text-sm mt-6 max-w-sm font-mono">
          Zero-knowledge encrypted digital vault engineered
          for irreversible data control.
        </p>

      </div>

      {/* ===== RIGHT PANEL (ANIMATED ONLY) ===== */}
      <div className="w-[60%] flex items-center justify-center px-24 relative z-10">

        <AnimatePresence mode="wait">
          <motion.div
            key={pageKey}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            {children}
          </motion.div>
        </AnimatePresence>

      </div>

    </div>
  );
}

export default AuthLayout;