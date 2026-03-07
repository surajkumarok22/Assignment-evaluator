"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, GraduationCap, Sparkles, ChevronRight, Brain, Target, BarChart3, Shield } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [hovering, setHovering] = useState(null);

  const features = [
    { icon: Brain, title: "AI-Powered Evaluation", desc: "Advanced LLM evaluates concept accuracy, completeness, relevance and more" },
    { icon: Target, title: "Rubric-Based Scoring", desc: "Controlled prompting with faculty-defined rubrics reduces hallucination" },
    { icon: BarChart3, title: "Detailed Analytics", desc: "Visual breakdowns of scores across all evaluation parameters" },
    { icon: Shield, title: "Similarity Detection", desc: "Flags potential plagiarism and AI-generated content" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" />
      <div className="absolute inset-0" style={{
        backgroundImage: "radial-gradient(circle at 20% 50%, rgba(99,102,241,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(139,92,246,0.08) 0%, transparent 50%), radial-gradient(circle at 50% 80%, rgba(59,130,246,0.06) 0%, transparent 50%)"
      }} />
      
      {/* Floating orbs */}
      <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-blue-200/20 blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-purple-200/20 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-white/80 border border-blue-100 rounded-full px-4 py-2 mb-6 shadow-sm">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Powered by Generative AI</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
            <span className="gradient-text">AI Assignment</span>
            <br />
            <span className="text-foreground">Evaluator</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Eliminate bias, save time, and provide detailed personalized feedback at scale using 
            rubric-based controlled prompting.
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-16">
          {[
            {
              id: "faculty",
              icon: BookOpen,
              title: "I'm a Faculty",
              subtitle: "Upload questions, rubrics & model answers",
              color: "from-blue-600 to-indigo-600",
              bg: "from-blue-50 to-indigo-50",
              border: "border-blue-200",
              path: "/faculty",
              items: ["Upload question paper & rubric", "Set difficulty & strictness", "View student submissions"]
            },
            {
              id: "student",
              icon: GraduationCap,
              title: "I'm a Student",
              subtitle: "Submit assignments & get instant AI feedback",
              color: "from-purple-600 to-violet-600",
              bg: "from-purple-50 to-violet-50",
              border: "border-purple-200",
              path: "/student",
              items: ["Upload your assignment PDF", "Get instant marks & feedback", "View improvement suggestions"]
            }
          ].map((role) => (
            <Card
              key={role.id}
              className={`cursor-pointer transition-all duration-300 border-2 ${role.border} bg-gradient-to-br ${role.bg} hover:shadow-xl hover:-translate-y-1`}
              onMouseEnter={() => setHovering(role.id)}
              onMouseLeave={() => setHovering(null)}
              onClick={() => router.push(role.path)}
            >
              <CardContent className="p-8">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-5 shadow-lg`}>
                  <role.icon className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-foreground">{role.title}</h2>
                <p className="text-muted-foreground mb-5 text-sm">{role.subtitle}</p>
                <ul className="space-y-2 mb-6">
                  {role.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-foreground/80">
                      <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${role.color}`} />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button className="w-full group" onClick={() => router.push(role.path)}>
                  Get Started
                  <ChevronRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features */}
        <div>
          <h2 className="text-center text-2xl font-bold mb-8 text-foreground">Why AI Evaluation?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <div key={i} className="glass rounded-xl p-5 text-center hover:shadow-md transition-all duration-200 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center mx-auto mb-3">
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-12">
          Built with Next.js • Node.js • Claude AI • MongoDB
        </p>
      </div>
    </div>
  );
}
