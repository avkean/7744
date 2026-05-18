// components/blue-grid-crypto.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EncodeSection from "./encode-section";
import DecodeSection from "./decode-section";

const BackgroundGrid = ({ activeTab }: { activeTab: "encode" | "decode" }) => {
  // Pre-generate two different patterns
  const [patterns] = useState(() => ({
    encode: [...Array(1000)].map(() => Math.floor(Math.random() * 4 + 4)),
    decode: [...Array(1000)].map(() => Math.floor(Math.random() * 4 + 4)),
  }));

  return (
    <div className="fixed inset-0">
      <AnimatePresence initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="absolute inset-0 grid grid-cols-[repeat(40,1fr)] gap-0"
        >
          {patterns[activeTab].map((shade: number, i: number) => (
            <motion.div
              key={i}
              className={`aspect-square bg-sky-${shade}00 opacity-80`}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{
                duration: 0.4,
                delay: (i % 100) * 0.001,
                ease: "easeOut",
              }}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default function BlueGridCrypto() {
  const [activeTab, setActiveTab] = useState<"encode" | "decode">("encode");

  return (
    <main className="min-h-screen relative">
      <AnimatePresence mode="wait">
        <BackgroundGrid activeTab={activeTab} />
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative  min-h-screen flex items-center">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white/95 rounded-lg shadow-lg pt-8 pl-8 pr-8 pb-4">
            <motion.h1
              className="text-4xl font-bold text-center mb-2 text-gray-900"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              7744 shades of blue
            </motion.h1>
            <motion.p
              className="text-lg text-center mb-12 text-gray-600"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              encrypt your messages using seven thousand seven hundred
              forty-four shades of blue
            </motion.p>
            <Tabs
              value={activeTab}
              onValueChange={(value) =>
                setActiveTab(value as "encode" | "decode")
              }
              className="w-full"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <TabsList className="grid w-full grid-cols-2 mb-8">
                  <TabsTrigger value="encode">Encode</TabsTrigger>
                  <TabsTrigger value="decode">Decode</TabsTrigger>
                </TabsList>
              </motion.div>
              <TabsContent value="encode">
                <EncodeSection />
              </TabsContent>
              <TabsContent value="decode">
                <DecodeSection />
              </TabsContent>
            </Tabs>
            <motion.p
              className="text-center pt-5 text-gray-500 pb-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              Created by <a href="https://github.com/avkean" target="_blank" className="nounderline hover:underline">avkean</a>
            </motion.p>
          </div>
        </div>
      </div>
    </main>
  );
}
