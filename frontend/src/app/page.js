"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, GraduationCap, Sparkles, ChevronRight, Brain, Target, BarChart3, Shield, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function HomePage() {
  const router = useRouter();
  const [hovering, setHovering] = useState(null);

  const features = [
    { icon: Brain, title: "AI-Powered Evaluation", desc: "Advanced LLM assesses concept accuracy, structure, and relevance instantly." },
    { icon: Target, title: "Rubric-Based Scoring", desc: "Controlled prompting with faculty-defined rubrics to eliminate hallucination." },
    { icon: BarChart3, title: "Detailed Analytics", desc: "Visual breakdowns of scores across all parameters for precise insights." },
    { icon: Shield, title: "Plagiarism Detection", desc: "Smart filtering flags potential similarity and AI-generated content." },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background text-foreground font-sans selection:bg-primary/20">
      
      {/* Navigation Bar */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full animate-fade-in">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => router.push('/')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-900">
            AIEval<span className="text-primary">.</span>
          </span>
        </div>
        <div className="flex items-center gap-3 md:gap-5">
          <Button variant="ghost" className="font-semibold text-sm text-slate-600 hover:text-primary hover:bg-primary/5 hidden sm:flex" onClick={() => router.push('/login')}>
            Sign In
          </Button>
          <Button className="font-semibold text-sm bg-slate-900 text-white transition-all hover:bg-slate-800 rounded-full px-6 shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:-translate-y-0.5" onClick={() => router.push('/signup')}>
            Get Started
          </Button>
        </div>
      </nav>

      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-[-10%] -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-50 blur-[100px]"></div>
        <div className="absolute left-1/4 right-0 bottom-[-10%] -z-10 m-auto h-[310px] w-[310px] rounded-full bg-accent/20 opacity-50 blur-[100px]"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-12 pb-12 flex flex-col items-center justify-center">
        
        {/* Header Section */}
        <motion.div 
          className="text-center w-full max-w-3xl mx-auto mb-16"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={itemVariants} className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-md border border-slate-200/60 rounded-full px-4 py-1.5 shadow-sm hover:shadow-md transition-shadow">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold tracking-tight text-slate-800">Next-Generation AI Evaluation</span>
            </div>
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Mark Assignments <br /> 
            <span className="gradient-text">with Precision.</span>
          </motion.h1>
          
          <motion.p variants={itemVariants} className="text-lg md:text-xl text-muted-foreground mx-auto leading-relaxed max-w-2xl font-medium">
            Eliminate subjective bias, dramatically save time, and provide rich, personalized feedback to every student at scale using our intelligent, rubric-driven LLM engine.
          </motion.p>
        </motion.div>

        {/* Roles Section */}
        <motion.div 
          className="grid md:grid-cols-2 gap-8 w-full max-w-4xl mx-auto mb-20"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {[
            {
              id: "faculty",
              icon: BookOpen,
              title: "For Faculty",
              subtitle: "Streamline grading effortlessly.",
              accent: "text-blue-600",
              color: "from-blue-600 to-indigo-600",
              bg: "bg-white/70",
              path: "/faculty",
              items: ["Upload rubrics & model answers", "Customize strictness levels", "Review profound analytics"]
            },
            {
              id: "student",
              icon: GraduationCap,
              title: "For Students",
              subtitle: "Get immediate, actionable insights.",
              accent: "text-purple-600",
              color: "from-purple-600 to-violet-600",
              bg: "bg-white/70",
              path: "/student",
              items: ["Submit assignments seamlessly", "Receive instant scores", "View personalized feedback"]
            }
          ].map((role) => (
            <motion.div key={role.id} variants={itemVariants} className="h-full">
              <Card
                className={`group relative h-full overflow-hidden cursor-pointer border border-slate-200/60 ${role.bg} backdrop-blur-xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-slate-300 transition-all duration-500`}
                onMouseEnter={() => setHovering(role.id)}
                onMouseLeave={() => setHovering(null)}
                onClick={() => router.push(role.path)}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${role.color} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500 z-0`} />
                
                <CardContent className="p-8 h-full flex flex-col relative z-10">
                  <div className="flex items-center gap-5 mb-8">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center shadow-lg shadow-${role.accent}/20`}>
                      <role.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-slate-900">{role.title}</h2>
                      <p className="text-slate-500 text-sm font-medium">{role.subtitle}</p>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <ul className="space-y-4 mb-8">
                      {role.items.map((item, i) => (
                         <li key={i} className="flex items-start gap-3 text-[15px] font-semibold text-slate-700">
                          <CheckCircle2 className={`w-5 h-5 ${role.accent} shrink-0`} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button className={`w-full group shadow-md transition-all duration-300 bg-gradient-to-r ${role.color} hover:shadow-lg`} size="lg">
                    <span className="font-bold text-white">Get Started</span>
                    <ChevronRight className="w-5 h-5 ml-2 text-white/90 transition-transform group-hover:translate-x-1.5" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Features Section */}
        <motion.div 
          className="w-full max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
        >
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Why choose AI Evaluation?</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-white/60 backdrop-blur-md border border-slate-200/50 rounded-2xl p-6 hover:bg-white/90 transition-colors duration-300 shadow-sm pointer-events-auto">
                <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center mb-5 border border-slate-200/50">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div 
          className="mt-20 border-t border-slate-200/60 pt-8 w-full flex justify-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
           <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
            Built with 
            <span className="text-slate-900 font-semibold">Next.js</span> • 
            <span className="text-slate-900 font-semibold">Claude AI</span> • 
            <span className="text-slate-900 font-semibold">MongoDB</span>
          </p>
        </motion.div>

      </div>
    </div>
  );
}
