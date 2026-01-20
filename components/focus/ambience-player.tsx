"use client"

import { useState, useRef, useEffect } from "react"
import { Volume2, VolumeX, CloudRain, Coffee, Music, Play, Pause, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const SOUNDS = [
    {
        id: "rain",
        name: "Rainy Mood",
        icon: CloudRain,
        url: "https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg"
    },
    {
        id: "cafe",
        name: "Coffee Shop",
        icon: Coffee,
        url: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg"
    },
    {
        id: "lofi",
        name: "Lofi Beats",
        icon: Music,
        // Using a reliable royalty-free source
        url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3"
    }
]

export function AmbiencePlayer() {
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentSound, setCurrentSound] = useState(SOUNDS[0])
    const [volume, setVolume] = useState(0.5)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio(currentSound.url)
            audioRef.current.loop = true
        } else {
            // Update source if changed (only if needed)
            if (audioRef.current.src !== currentSound.url) {
                const wasPlaying = !audioRef.current.paused
                audioRef.current.src = currentSound.url
                if (wasPlaying) audioRef.current.play()
            }
        }
        audioRef.current.volume = volume
    }, [currentSound, volume])

    const togglePlay = () => {
        if (!audioRef.current) return

        if (isPlaying) {
            audioRef.current.pause()
        } else {
            audioRef.current.play().catch(e => console.error("Audio play failed", e))
        }
        setIsPlaying(!isPlaying)
    }

    const changeSound = (sound: typeof SOUNDS[0]) => {
        setCurrentSound(sound)
        if (!isPlaying) {
            setIsPlaying(true)
            setTimeout(() => {
                audioRef.current?.play()
            }, 100)
        }
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                        "h-10 w-10 rounded-full shadow-lg transition-all border-0",
                        isPlaying ? "bg-indigo-500 text-white hover:bg-indigo-600 animate-pulse-subtle" : "bg-white dark:bg-slate-800 text-slate-500 hover:text-indigo-500"
                    )}
                >
                    {isPlaying ? <Volume2 className="h-5 w-5" /> : <Music className="h-5 w-5" />}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4 mb-2 mr-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl" side="top" align="end">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">Focus Ambience</h4>
                        {isPlaying && <span className="text-[10px] text-indigo-500 animate-pulse font-medium">Playing</span>}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {SOUNDS.map(sound => (
                            <button
                                key={sound.id}
                                onClick={() => changeSound(sound)}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-2 p-2 rounded-xl transition-all border",
                                    currentSound.id === sound.id
                                        ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400"
                                        : "hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent hover:border-slate-200 text-slate-500"
                                )}
                            >
                                <sound.icon className={cn("h-5 w-5", currentSound.id === sound.id && isPlaying && "animate-bounce-subtle")} />
                                <span className="text-[10px] font-medium">{sound.name}</span>
                            </button>
                        ))}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                            <VolumeX className="h-3 w-3 text-slate-400" />
                            <Slider
                                value={[volume * 100]}
                                onValueChange={(v) => setVolume(v[0] / 100)}
                                max={100}
                                step={1}
                                className="flex-1"
                            />
                            <Volume2 className="h-3 w-3 text-slate-400" />
                        </div>

                        <Button
                            className="w-full h-8 text-xs rounded-full font-medium bg-indigo-500 hover:bg-indigo-600 text-white"
                            onClick={togglePlay}
                        >
                            {isPlaying ? (
                                <>
                                    <Pause className="h-3 w-3 mr-2" /> Pause Sound
                                </>
                            ) : (
                                <>
                                    <Play className="h-3 w-3 mr-2" /> Play Sound
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
