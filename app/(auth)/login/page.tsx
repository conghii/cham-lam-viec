"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, Suspense } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, signInWithGoogle } from "@/lib/firebase/auth";
import { createUserProfile } from "@/lib/firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { Layout, ArrowRight, Loader2, Mail, Lock, Sparkles, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

function LoginContent() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const registered = searchParams.get("registered");

    useEffect(() => {
        if (registered === "true") {
            toast.success("Registration successful! Please log in with your new account.");
        }
    }, [registered]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            await createUserProfile(userCredential.user);
            router.push("/dashboard");
        } catch (err: any) {
            console.error(err);
            setError("Invalid email or password. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            await signInWithGoogle();
            router.push("/dashboard");
        } catch (error: any) {
            console.error(error);
            setError("Failed to sign in with Google.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 bg-background font-sans">
            <div className="flex items-center justify-center py-12 px-4 lg:px-8 relative overflow-hidden">
                {/* Background Blobs */}
                <div className="absolute top-0 -left-6 w-80 h-80 bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse" />
                <div className="absolute bottom-0 -right-6 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl -z-10 animate-pulse delay-700" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mx-auto w-full max-w-[400px] space-y-8"
                >
                    <div className="space-y-2 text-center">
                        <div className="flex justify-center mb-6">
                            <Link href="/" className="group flex flex-col items-center">
                                <div className="h-16 w-16 bg-gradient-to-br from-primary to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
                                    <Layout className="h-8 w-8 text-white" />
                                </div>
                                <span className="mt-4 text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-600">ChamLam.</span>
                            </Link>
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Welcome back</h1>
                        <p className="text-muted-foreground text-pretty">
                            Please enter your details to sign in to your account.
                        </p>
                    </div>

                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-center gap-2 overflow-hidden"
                            >
                                <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse shrink-0" />
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleLogin} className="grid gap-5">
                        <div className="grid gap-2">
                            <Label htmlFor="email" className="text-sm font-semibold px-1">Email Address</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-12 pl-10 bg-muted/30 border-muted-foreground/10 focus:bg-background transition-all rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <div className="flex items-center justify-between px-1">
                                <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                                <Link
                                    href="/forgot-password"
                                    className="text-xs font-medium text-primary hover:underline underline-offset-4"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-12 pl-10 bg-muted/30 border-muted-foreground/10 focus:bg-background transition-all rounded-xl"
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98] rounded-xl mt-2" disabled={loading}>
                            {loading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    Sign In
                                    <LogIn className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>

                        <div className="relative my-2">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-muted" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground font-medium">Or continue with</span>
                            </div>
                        </div>

                        <Button variant="outline" type="button" className="w-full h-12 text-sm font-semibold border-muted-foreground/10 hover:bg-muted/50 rounded-xl transition-all" onClick={handleGoogleLogin} disabled={loading}>
                            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                            </svg>
                            Google Account
                        </Button>
                    </form>

                    <div className="text-center text-sm text-muted-foreground">
                        Don&apos;t have an account?{" "}
                        <Link href="/register" className="font-bold text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline">
                            Create one
                        </Link>
                    </div>
                </motion.div>
            </div>

            {/* Right Side - Visuals */}
            <div className="hidden lg:block relative overflow-hidden bg-slate-950">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-indigo-900/10 to-slate-950 z-10" />
                <motion.div
                    initial={{ scale: 1.1, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.4 }}
                    transition={{ duration: 1.5 }}
                    className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1621252179027-94459d27d3ee?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay"
                />

                <div className="relative h-full flex flex-col p-12 text-white z-20">
                    <div className="flex items-center gap-3 font-bold text-2xl tracking-tight">
                        <div className="h-10 w-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                            <Layout className="h-6 w-6" />
                        </div>
                        <span>ChamLam.</span>
                    </div>

                    <div className="flex-1 flex items-center justify-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.8 }}
                            className="space-y-4 max-w-lg"
                        >
                            <h2 className="text-4xl font-bold leading-tight tracking-tight">
                                "The only way to do great work is to love what you do."
                            </h2>
                            <p className="text-indigo-200/60 text-xl font-medium">- Steve Jobs</p>
                        </motion.div>
                    </div>

                    <div className="flex items-center gap-4 text-white/20 text-xs font-medium tracking-widest uppercase">
                        <span>Focus</span>
                        <span>•</span>
                        <span>Create</span>
                        <span>•</span>
                        <span>Achieve</span>
                    </div>
                </div>
            </div>
        </div >
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="h-screen w-screen flex items-center justify-center bg-background">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
