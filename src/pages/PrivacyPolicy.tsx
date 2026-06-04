import React from 'react';
import { motion } from 'framer-motion';
import { PiShieldCheck } from 'react-icons/pi';

const PrivacyPolicy = () => {
    return (
        <div className="max-w-4xl mx-auto py-12 px-4 space-y-12 mb-24">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-4"
            >
                <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-2xl mb-4">
                    <PiShieldCheck className="text-5xl text-primary" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold">Privacy Policy</h1>
                <p className="text-gray-400">Last updated: June 3, 2025</p>
            </motion.div>

            <div className="space-y-10 text-gray-300 leading-relaxed">
                <section className="space-y-4 p-6 bg-primary/5 border border-primary/10 rounded-2xl">
                    <h2 className="text-xl font-bold text-white">Developer's Note</h2>
                    <p className="italic">
                        "I created Vibe On as a personal project to practice and showcase my learnings in modern web development and Android app publishing. This application serves as a portfolio piece to demonstrate my technical skills as I pursue a career as a software engineer. Every feature, from the dynamic theme engine to the native Android integration, is a result of my dedication to learning and implementation."
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-white">1. Introduction</h2>
                    <p>
                        Vibe On ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how your personal information is collected, used, and disclosed by Vibe On.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-white">2. Information We Collect</h2>
                    <p>
                        We collect information to provide better services to all our users. The types of information we collect include:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Account Information:</strong> When you sign in using Google OAuth via Supabase, we collect your email address and profile name to personalize your experience and sync your library.</li>
                        <li><strong>App Usage:</strong> We may collect data about your interactions with the app, such as playback history and favorites, to improve our recommendations. This data is stored securely in our database.</li>
                        <li><strong>Local Data:</strong> We use IndexedDB to store downloaded songs for offline playback. This data remains on your device.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-white">3. How We Use Information</h2>
                    <p>
                        We use the information we collect for the following purposes:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>To provide and maintain our Service.</li>
                        <li>To sync your music library across different devices.</li>
                        <li>To personalize your experience (e.g., Daily Mix, language preferences).</li>
                        <li>To monitor and analyze usage patterns to improve the app.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-white">4. Data Security</h2>
                    <p>
                        We use Supabase (a secure backend-as-a-service provider) to store your data. Access is controlled via Row Level Security (RLS) to ensure that only you can access your own information.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-white">5. Your Choices</h2>
                    <p>
                        You can access and update your account information through the Profile page. If you wish to delete your data, please contact us at support@vibeon.app.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-white">6. Changes to This Policy</h2>
                    <p>
                        We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
                    </p>
                </section>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
