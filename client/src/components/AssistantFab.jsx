import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import AssistantPanel from "./AssistantPanel";

const spring = { type: "spring", stiffness: 420, damping: 30 };

/** Floating action button + portal'd chat panel. Mount once in DashboardLayout. */
const AssistantFab = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
        title="AI Finance Assistant"
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={spring}
        whileHover={{ scale: 1.07, y: -2 }}
        whileTap={{ scale: 0.94 }}
        style={{
          position: "fixed",
          right: "max(18px, env(safe-area-inset-right))",
          bottom: "max(18px, env(safe-area-inset-bottom))",
          zIndex: 89,
          width: 52, height: 52, borderRadius: "50%",
          background: "var(--brand)", color: "white",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "none", cursor: "pointer",
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.28)",
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? "close" : "open"}
            initial={{ opacity: 0, rotate: open ? 90 : -90, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: open ? -90 : 90, scale: 0.6 }}
            transition={{ duration: 0.18 }}
            style={{ display: "flex" }}
          >
            {open ? <X size={20} /> : <Sparkles size={20} />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
      <AssistantPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default AssistantFab;
