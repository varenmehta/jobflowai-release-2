"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { motionPresets } from "@/lib/motion/presets";
import type { ReactNode } from "react";

type DrawerProps = {
  open: boolean;
  title?: string;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

export default function Drawer({ open, title, onOpenChange, children }: DrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="ui-drawer-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.section
                className="ui-drawer"
                initial={motionPresets.drawerSlide.initial}
                animate={motionPresets.drawerSlide.animate}
                exit={motionPresets.drawerSlide.exit}
              >
                <div className="ui-drawer-head">
                  <Dialog.Title className="ui-drawer-title">{title ?? "Details"}</Dialog.Title>
                  <Dialog.Close asChild>
                    <button type="button" className="ui-icon-btn" aria-label="Close drawer">
                      <X size={16} />
                    </button>
                  </Dialog.Close>
                </div>
                <div className="ui-drawer-body">{children}</div>
              </motion.section>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
