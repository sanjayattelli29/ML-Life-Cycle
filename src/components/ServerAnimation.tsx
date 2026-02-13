"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Server, Database, Activity, Lock, Cpu } from 'lucide-react';

const ServerAnimation = () => {
    return (
        <div className="relative w-full h-[400px] bg-gray-950 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl flex items-center justify-center">
            {/* Grid Background */}
            <div className="absolute inset-0 opacity-20"
                style={{
                    backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }}
            ></div>

            {/* Radial Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent"></div>

            {/* Main Server Rack */}
            <div className="relative z-10 flex gap-8 items-end">

                {/* Server Unit 1 */}
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="w-24 h-48 bg-gray-900 rounded-lg border border-gray-700 relative flex flex-col justify-between p-2 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                >
                    {/* Status Lights */}
                    <div className="flex gap-1">
                        {[1, 2, 3].map(i => (
                            <motion.div
                                key={i}
                                animate={{ opacity: [0.4, 1, 0.4] }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                                className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]"
                            />
                        ))}
                    </div>

                    {/* Server Drive Bays */}
                    <div className="space-y-1">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-1.5 bg-gray-800 rounded-sm w-full border border-gray-700/50"></div>
                        ))}
                    </div>

                    <div className="flex justify-center mt-2">
                        <Server className="w-8 h-8 text-gray-700" strokeWidth={1.5} />
                    </div>
                </motion.div>

                {/* Central Hub / Processor */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                    className="w-40 h-56 bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl border border-gray-700 relative flex flex-col items-center p-4 shadow-[0_0_30px_rgba(59,130,246,0.15)]"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>

                    <div className="w-16 h-16 rounded-full bg-gray-950 border border-gray-700 flex items-center justify-center mb-6 relative">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 rounded-full border-t border-blue-500 opacity-50"
                        ></motion.div>
                        <Cpu className="w-8 h-8 text-blue-400" />
                    </div>

                    {/* Data Lines */}
                    <div className="space-y-3 w-full">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-1 bg-gray-950 rounded-full overflow-hidden relative">
                                <motion.div
                                    className="absolute top-0 left-0 h-full w-10 bg-blue-500 blur-[2px]"
                                    animate={{ x: [-40, 160] }}
                                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.8, ease: "linear" }}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="mt-auto text-[10px] font-mono text-blue-400/80">PROCESSING</div>
                </motion.div>

                {/* Server Unit 2 */}
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                    className="w-24 h-48 bg-gray-900 rounded-lg border border-gray-700 relative flex flex-col justify-between p-2 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                >
                    {/* Status Lights */}
                    <div className="flex gap-1 justify-end">
                        {[1, 2].map(i => (
                            <motion.div
                                key={i}
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse", delay: i * 0.1 }}
                                className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)]"
                            />
                        ))}
                    </div>

                    {/* Server Drive Bays */}
                    <div className="space-y-1">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-1.5 bg-gray-800 rounded-sm w-full border border-gray-700/50"></div>
                        ))}
                    </div>

                    <div className="flex justify-center mt-2">
                        <Database className="w-8 h-8 text-gray-700" strokeWidth={1.5} />
                    </div>
                </motion.div>
            </div>

            {/* Floating Particles */}
            {[...Array(6)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-blue-400 rounded-full"
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: [0, 1, 0], y: -100, x: Math.random() * 100 - 50 }}
                    transition={{ duration: 3, repeat: Infinity, delay: Math.random() * 2, ease: "linear" }}
                    style={{
                        left: `${30 + Math.random() * 40}%`,
                        top: `${50 + Math.random() * 20}%`
                    }}
                />
            ))}

        </div>
    );
};

export default ServerAnimation;
