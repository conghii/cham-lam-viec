"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase/auth";
import { createUserProfile } from "@/lib/firebase/firestore";
import { useRouter } from "next/navigation";
import { Layout, Loader2, User, Mail, Lock, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function RegisterPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Update Auth Profile
            await updateProfile(user, {
                displayName: name
            });

            // Create Firestore Profile
            await createUserProfile({
                ...user,
                displayName: name
            });

            toast.success("Account created successfully! Please log in.");
            router.push("/login?registered=true");
        } catch (err: any) {
            console.error(err);
            if (err.code === "auth/email-already-in-use") {
                setError("Email is already in use.");
            } else if (err.code === "auth/invalid-email") {
                setError("Invalid email address.");
            } else if (err.code === "auth/weak-password") {
                setError("Password should be at least 6 characters.");
            } else {
                setError(err.message || "Failed to create account. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 bg-background font-sans">
            <div className="flex items-center justify-center py-12 px-4 lg:px-8 relative overflow-hidden">
                {/* Background Blobs */}
                <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse" />
                <div className="absolute bottom-0 -right-4 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl -z-10 animate-pulse delay-700" />

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
                        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Create account</h1>
                        <p className="text-muted-foreground text-pretty">
                            Join our community and start your journey today.
                        </p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-center gap-2"
                        >
                            <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleRegister} className="grid gap-5">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="text-sm font-semibold px-1">Full Name</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="name"
                                    placeholder="John Doe"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="h-12 pl-10 bg-muted/30 border-muted-foreground/10 focus:bg-background transition-all rounded-xl"
                                />
                            </div>
                        </div>

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
                            <Label htmlFor="password" title="At least 6 characters" className="text-sm font-semibold px-1">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    minLength={6}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-12 pl-10 bg-muted/30 border-muted-foreground/10 focus:bg-background transition-all rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="confirmPassword" className="text-sm font-semibold px-1">Confirm Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="h-12 pl-10 bg-muted/30 border-muted-foreground/10 focus:bg-background transition-all rounded-xl"
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98] rounded-xl mt-2" disabled={loading}>
                            {loading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    Create Account
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="text-center text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <Link href="/login" className="font-bold text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline">
                            Log in
                        </Link>
                    </div>
                </motion.div>
            </div>

            <div className="hidden lg:block relative overflow-hidden bg-slate-950">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-purple-900/20 to-slate-950 z-10" />
                <motion.div
                    initial={{ scale: 1.1, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.4 }}
                    transition={{ duration: 1.5 }}
                    className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1590069261209-f8e9b8642343?q=80&w=2152&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay"
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
                                "Start where you are. Use what you have. Do what you can."
                            </h2>
                            <p className="text-indigo-200/60 text-xl font-medium">- Arthur Ashe</p>
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
        </div>
    );
}
