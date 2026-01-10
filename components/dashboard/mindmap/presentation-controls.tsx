"use client";

import { useState, useEffect } from "react";
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface PresentationControlsProps {
    isPlaying: boolean;
    currentStep: number;
    totalSteps: number;
    onPlayPause: () => void;
    onNext: () => void;
    onPrev: () => void;
    onExit: () => void;
}

export function PresentationControls({
    isPlaying,
    currentStep,
    totalSteps,
    onPlayPause,
    onNext,
    onPrev,
    onExit
}: PresentationControlsProps) {
    const [visible, setVisible] = useState(true);
    let timeoutId: NodeJS.Timeout;

    const handleMouseMove = () => {
        setVisible(true);
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => setVisible(false), 3000); // Hide after 3s idle
    };

    useEffect(() => {
        window.addEventListener("mousemove", handleMouseMove);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            clearTimeout(timeoutId);
        };
    }, []);

    const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

    return (
        <div
            className={cn(
                "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-in-out",
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            )}
            onMouseEnter={() => {
                setVisible(true);
                clearTimeout(timeoutId);
            }}
        >
            <div className="bg-background/80 backdrop-blur-xl border shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 min-w-[300px]">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={onExit} className="hover:bg-destructive/10 hover:text-destructive rounded-full">
                        <X className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-4 bg-border mx-2" />
                    <Button variant="ghost" size="icon" onClick={onPrev} disabled={currentStep <= 0} className="rounded-full">
                        <SkipBack className="h-4 w-4" />
                    </Button>
                    <Button
                        size="icon"
                        onClick={onPlayPause}
                        className="rounded-full h-12 w-12 bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform"
                    >
                        {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onNext} disabled={currentStep >= totalSteps - 1} className="rounded-full">
                        <SkipForward className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex-1 flex flex-col gap-1 min-w-[100px]">
                    <div className="flex justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        <span>Step {currentStep + 1}</span>
                        <span>{totalSteps}</span>
                    </div>
                    <Progress value={progress} className="h-1" />
                </div>
            </div>
        </div>
    );
}
