"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, CheckCircle2, X, Timer, Play, Pause, RotateCcw, PartyPopper } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import confetti from "canvas-confetti";

function CookingTimer() {
    const [timeLeft, setTimeLeft] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [inputMinutes, setInputMinutes] = useState("5");

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    const startTimer = () => {
        if (timeLeft === 0) {
             setTimeLeft(parseInt(inputMinutes) * 60);
        }
        setIsActive(true);
    };

    const pauseTimer = () => setIsActive(false);
    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(0);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2 border">
            <Timer className="h-4 w-4 text-muted-foreground" />
            {timeLeft > 0 || isActive ? (
                <span className="font-mono font-bold text-lg w-16 text-center">{formatTime(timeLeft)}</span>
            ) : (
                <Input 
                    type="number" 
                    value={inputMinutes} 
                    onChange={(e) => setInputMinutes(e.target.value)}
                    className="w-16 h-8 text-center p-1"
                    min="1"
                />
            )}
            
            {!isActive ? (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={startTimer}>
                    <Play className="h-4 w-4 fill-current" />
                </Button>
            ) : (
                 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={pauseTimer}>
                    <Pause className="h-4 w-4 fill-current" />
                </Button>
            )}
            
            {(timeLeft > 0 || isActive) && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={resetTimer}>
                    <RotateCcw className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}

export default function CookingMode() {
  const params = useParams();
  const router = useRouter();
  const recipeId = params.id as Id<"recipes">;
  const recipe = useQuery(api.recipes.get, { id: recipeId });

  // State
  // Phase 0: Ingredients, Phase 1: Cooking Instructions
  const [cookingPhase, setCookingPhase] = useState<0 | 1>(0);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [isFinished, setIsFinished] = useState(false);

  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Prevent screen sleep
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.log('Wake Lock not supported or failed', err);
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLock) wakeLock.release();
    };
  }, []);

  // Auto-scroll to active step in Phase 2
  useEffect(() => {
    if (cookingPhase === 1 && stepRefs.current[activeStepIndex]) {
      stepRefs.current[activeStepIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeStepIndex, cookingPhase]);

  // Handle completion (scroll to top + confetti)
  useEffect(() => {
    if (isFinished) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [isFinished]);

  if (recipe === undefined) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (recipe === null) {
    return <div className="flex h-screen items-center justify-center">Recipe not found</div>;
  }

  const totalInstructionSteps = recipe.steps.length;

  const toggleIngredient = (index: number) => {
    const next = new Set(checkedIngredients);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setCheckedIngredients(next);
  };

  const handleNext = () => {
    if (cookingPhase === 0) {
      setCookingPhase(1);
      setActiveStepIndex(0);
    } else {
      if (activeStepIndex < totalInstructionSteps - 1) {
        setActiveStepIndex((prev) => prev + 1);
      } else {
        setIsFinished(true);
      }
    }
  };

  const handlePrevious = () => {
    if (cookingPhase === 1) {
      if (activeStepIndex > 0) {
        setActiveStepIndex((prev) => prev - 1);
      } else {
        setCookingPhase(0);
      }
    }
  };

  // Progress calculation
  // Phase 0: count checked ingredients? Or just 0% until phase 2?
  // Let's do: 
  // Phase 0: 0% to 10% (based on ingredients checked?)
  // Phase 1: 10% to 100% based on steps
  
  let progress = 0;
  if (isFinished) {
    progress = 100;
  } else if (cookingPhase === 0) {
    const totalIngredients = recipe.ingredients.length;
    const checkedCount = checkedIngredients.size;
    progress = totalIngredients > 0 ? (checkedCount / totalIngredients) * 10 : 0;
  } else {
    // Start at 10%, go to 100%
    const stepProgress = (activeStepIndex / totalInstructionSteps) * 90;
    progress = 10 + stepProgress;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-background z-10 shadow-sm">
        <div className="flex items-center gap-4 overflow-hidden">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <X className="h-6 w-6" />
            </Button>
            <div className="min-w-0">
                <h1 className="font-semibold text-lg truncate">{recipe.title}</h1>
                <p className="text-sm text-muted-foreground truncate">
                    {isFinished 
                        ? "Completed!" 
                        : cookingPhase === 0 
                            ? "Step 1: Ingredients" 
                            : `Step 2: Cooking (${activeStepIndex + 1}/${totalInstructionSteps})`}
                </p>
            </div>
        </div>
        <div className="flex items-center gap-4">
             <div className="hidden md:block">
                 <CookingTimer />
             </div>
             <div className="w-24 md:w-32 hidden sm:block">
                <Progress value={progress} className="h-2" />
            </div>
        </div>
      </div>
      
      <div className="md:hidden p-2 bg-muted/20 flex justify-end">
         <CookingTimer />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl w-full mx-auto p-6 space-y-8">
            {isFinished ? (
                <Card className="border-none shadow-none bg-transparent text-center mt-4 animate-in fade-in zoom-in duration-500">
                    <CardContent className="flex flex-col items-center">
                        <div className="relative mb-8 w-full max-w-md aspect-video rounded-xl overflow-hidden shadow-2xl ring-4 ring-primary/20">
                            {recipe.imageUrl ? (
                                <Image
                                    src={recipe.imageUrl}
                                    alt={recipe.title}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-muted flex items-center justify-center">
                                    <CheckCircle2 className="h-24 w-24 text-green-500 opacity-50" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center pb-6">
                                <div className="text-white flex items-center gap-2">
                                    <PartyPopper className="h-6 w-6 text-yellow-400" />
                                    <span className="font-bold text-lg">Completed!</span>
                                </div>
                            </div>
                        </div>
                        
                        <h2 className="text-4xl md:text-5xl font-bold mb-4 text-primary bg-clip-text bg-gradient-to-r from-primary to-orange-600">
                            Bon Appétit!
                        </h2>
                        <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-lg leading-relaxed">
                            You've successfully cooked <span className="font-semibold text-foreground">{recipe.title}</span>. Time to enjoy your masterpiece!
                        </p>
                        
                        <div className="flex gap-4 w-full max-w-sm">
                            <Button size="lg" className="flex-1 h-14 text-lg" onClick={() => router.push("/")}>
                                <ArrowLeft className="mr-2 h-5 w-5" /> Back to Recipes
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : cookingPhase === 0 ? (
                // Phase 1: Ingredients
                <div className="space-y-6">
                    <h2 className="text-3xl font-bold">Ingredients</h2>
                    <p className="text-muted-foreground text-lg">Check off what you have ready.</p>
                    <div className="grid gap-4">
                        {recipe.ingredients.map((ing, i) => (
                            <div 
                                key={i} 
                                className={`flex items-start space-x-4 p-4 rounded-xl border-2 transition-colors ${
                                    checkedIngredients.has(i) 
                                        ? "bg-primary/5 border-primary/20" 
                                        : "bg-card border-muted hover:border-primary/50"
                                }`}
                                onClick={() => toggleIngredient(i)}
                            >
                                <Checkbox 
                                    checked={checkedIngredients.has(i)} 
                                    onCheckedChange={() => toggleIngredient(i)}
                                    className="mt-1 h-6 w-6"
                                />
                                <Label className={`text-xl leading-relaxed cursor-pointer flex-1 ${
                                    checkedIngredients.has(i) ? "line-through text-muted-foreground" : ""
                                }`}>
                                    {ing}
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                // Phase 2: Instructions (Hybrid List)
                <div className="space-y-8 pb-24">
                     <h2 className="text-3xl font-bold mb-6">Instructions</h2>
                     {recipe.steps.map((step, i) => {
                         const isActive = i === activeStepIndex;
                         return (
                             <div
                                 key={i}
                                 ref={el => { stepRefs.current[i] = el; }}
                                 onClick={() => setActiveStepIndex(i)}
                                 className={`transition-all duration-500 cursor-pointer rounded-xl p-6 border-2 ${
                                     isActive 
                                        ? "opacity-100 scale-105 border-primary shadow-lg bg-card" 
                                        : "opacity-40 hover:opacity-60 border-transparent bg-muted/50"
                                 }`}
                             >
                                 <h3 className={`font-bold mb-2 ${isActive ? "text-primary text-xl" : "text-muted-foreground text-lg"}`}>
                                     Step {i + 1}
                                 </h3>
                                 <p className={`leading-relaxed ${isActive ? "text-2xl" : "text-xl"}`}>
                                     {step}
                                 </p>
                             </div>
                         );
                     })}
                </div>
            )}
        </div>
      </div>

      {/* Footer Controls */}
      {!isFinished && (
        <div className="p-6 border-t bg-background sticky bottom-0 flex justify-between gap-4 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            {cookingPhase === 0 ? (
                 <Button 
                    size="lg" 
                    className="w-full h-16 text-xl font-semibold"
                    onClick={handleNext}
                 >
                    Start Cooking <ArrowRight className="ml-2 h-6 w-6" />
                 </Button>
            ) : (
                <>
                    <Button 
                        variant="outline" 
                        size="lg" 
                        className="flex-1 h-16 text-lg"
                        onClick={handlePrevious}
                    >
                        <ArrowLeft className="mr-2 h-5 w-5" /> 
                        {activeStepIndex === 0 ? "Ingredients" : "Previous"}
                    </Button>
                    <Button 
                        size="lg" 
                        className="flex-1 h-16 text-lg"
                        onClick={handleNext}
                    >
                        {activeStepIndex === totalInstructionSteps - 1 ? "Finish Cooking" : "Next Step"} 
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </>
            )}
        </div>
      )}
    </div>
  );
}
