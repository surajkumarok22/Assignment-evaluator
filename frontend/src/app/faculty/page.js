"use client";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Upload, FileText, Settings, CheckCircle2, ArrowLeft, BookOpen,
  Plus, Trash2, Eye, Users, BarChart3, ClipboardList, Sparkles, AlertCircle, Clock, ChevronDown, ChevronUp, Cpu, Download, FileQuestion
} from "lucide-react";

function FileDropzone({ onDrop, accept, label, icon: Icon, file }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => onDrop(accepted[0]),
    accept,
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${isDragActive ? "border-primary bg-primary/5 scale-[1.02]" : file ? "border-emerald-400 bg-emerald-50" : "border-border hover:border-primary/50 hover:bg-muted/30"
        }`}
    >
      <input {...getInputProps()} />
      {file ? (
        <div className="flex items-center justify-center gap-3">
          <FileText className="w-8 h-8 text-emerald-600" />
          <div className="text-left">
            <p className="font-medium text-emerald-700 text-sm">{file.name}</p>
            <p className="text-xs text-emerald-600">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-2" />
        </div>
      ) : (
        <div>
          <Icon className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground mt-1">Drop here or click to browse</p>
        </div>
      )}
    </div>
  );
}

export default function FacultyPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("setup");
  const [files, setFiles] = useState({ question: null, rubric: null, model: null });
  const [settings, setSettings] = useState({ difficulty: "medium", strictness: "moderate", totalMarks: "10", subject: "", title: "", branch: "", semester: "" });
  const [modelConfig, setModelConfig] = useState({ models: ["gemini"], strategy: "average" });
  const [rubricItems, setRubricItems] = useState([
    { parameter: "Concept Accuracy", maxMarks: 3, description: "Are concepts correct and well-explained?" },
    { parameter: "Completeness", maxMarks: 2, description: "Are all parts of the question answered?" },
    { parameter: "Relevance", maxMarks: 2, description: "Is the answer on-topic?" },
    { parameter: "Language Quality", maxMarks: 2, description: "Grammar, clarity, and expression" },
    { parameter: "Structure", maxMarks: 1, description: "Intro → Body → Conclusion flow" },
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState("");
  const { token, user, loading, logout } = useAuth();

  const [historySessions, setHistorySessions] = useState([]);
  const [historyGenerated, setHistoryGenerated] = useState([]);
  const [sessionSubmissions, setSessionSubmissions] = useState({});
  const [expandedSession, setExpandedSession] = useState(null);

  // Generate Questions State
  const [genSettings, setGenSettings] = useState({ branch: "", semester: "", year: "", difficulty: "medium", type: "subjective", count: 5 });
  const [genFile, setGenFile] = useState(null);
  const [genModels, setGenModels] = useState(["gemini"]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genResult, setGenResult] = useState(null);

  const fetchHistory = useCallback(async () => {
    try {
      const [resSessions, resGenerated] = await Promise.all([
        fetch("http://localhost:5000/api/faculty/sessions", { headers: { "Authorization": `Bearer ${token}` } }),
        fetch("http://localhost:5000/api/faculty/generated-questions", { headers: { "Authorization": `Bearer ${token}` } })
      ]);
      const dataSessions = await resSessions.json();
      const dataGenerated = await resGenerated.json();
      if (dataSessions.success) setHistorySessions(dataSessions.sessions);
      if (dataGenerated.success) setHistoryGenerated(dataGenerated.data);
    } catch (e) { console.error(e); }
  }, [token]);

  const loadSubmissions = async (sessionId) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
      return;
    }
    setExpandedSession(sessionId);
    if (!sessionSubmissions[sessionId]) {
      try {
        const res = await fetch(`http://localhost:5000/api/student/submissions/${sessionId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setSessionSubmissions(prev => ({ ...prev, [sessionId]: data.submissions }));
        }
      } catch (e) { console.error(e); }
    }
  };

  useEffect(() => {
    if (!loading && (!token || user?.role !== "teacher")) {
      router.push("/login");
    }
  }, [token, user, loading, router]);

  useEffect(() => {
    if (activeTab === "history" && token) {
      fetchHistory();
    }
  }, [activeTab, token, fetchHistory]);

  const totalRubricMarks = rubricItems.reduce((sum, r) => sum + Number(r.maxMarks), 0);

  const addRubricItem = () => {
    setRubricItems([...rubricItems, { parameter: "", maxMarks: 1, description: "" }]);
  };

  const removeRubricItem = (idx) => {
    setRubricItems(rubricItems.filter((_, i) => i !== idx));
  };

  const updateRubricItem = (idx, field, value) => {
    setRubricItems(rubricItems.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleCreate = async () => {
    if (!settings.title || !settings.subject) {
      setError("Please fill in assignment title and subject.");
      return;
    }
    setError("");
    setIsCreating(true);
    try {
      const formData = new FormData();
      if (files.question) formData.append("questionPaper", files.question);
      if (files.rubric) formData.append("rubricFile", files.rubric);
      if (files.model) formData.append("modelAnswer", files.model);
      formData.append("settings", JSON.stringify({ ...settings, models: modelConfig.models, evaluationStrategy: modelConfig.strategy }));
      formData.append("rubricItems", JSON.stringify(rubricItems));

      const res = await fetch("http://localhost:5000/api/faculty/create-session", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setSessionId(data.sessionId);
        setActiveTab("review");
      } else {
        setError(data.message || "Failed to create session.");
      }
    } catch (e) {
      setError("Backend unavailable. Running in demo mode.");
      setSessionId("DEMO-" + Math.random().toString(36).substring(2, 8).toUpperCase());
      setActiveTab("review");
    }
    setIsCreating(false);
  };

  const handleGenerateQuestions = async () => {
    if (!genSettings.branch || !genSettings.semester || !genSettings.year) {
      setError("Please fill in Branch, Semester, and Year.");
      return;
    }
    setError("");
    setIsGenerating(true);
    setGenResult(null);
    try {
      const formData = new FormData();
      Object.keys(genSettings).forEach(k => formData.append(k, genSettings[k]));
      if (genFile) formData.append("syllabusFile", genFile);
      formData.append("selectedModels", JSON.stringify(genModels.includes("all") ? ["gemini", "openai", "anthropic"] : genModels));

      const res = await fetch("http://localhost:5000/api/faculty/generate-questions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setGenResult(data.data);
      } else {
        setError(data.message || "Failed to generate questions.");
      }
    } catch (e) {
      setError("Error connecting to server.");
    }
    setIsGenerating(false);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white">
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "radial-gradient(circle at 10% 10%, rgba(99,102,241,0.06) 0%, transparent 40%)"
      }} />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="rounded-full">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center shadow-md">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Faculty Dashboard</h1>
              <p className="text-sm text-muted-foreground">Create & manage assignment evaluations</p>
            </div>
          </div>
          <div className="ml-auto">
            <Button variant="outline" onClick={logout}>Logout</Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col md:flex-row gap-8 items-start">
          <TabsList className="flex-col h-auto w-full md:w-64 shrink-0 bg-white/80 shadow-sm border border-slate-200/50 rounded-2xl p-3 gap-1 sticky top-8">
            <div className="w-full px-3 py-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Navigation</div>
            <TabsTrigger value="setup" className="w-full justify-start px-4 py-2.5 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all rounded-xl">
              <Settings className="w-4 h-4 mr-3" />Setup
            </TabsTrigger>
            <TabsTrigger value="rubric" className="w-full justify-start px-4 py-2.5 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all rounded-xl">
              <ClipboardList className="w-4 h-4 mr-3" />Rubric
            </TabsTrigger>
            <TabsTrigger value="review" disabled={!sessionId} className="w-full justify-start px-4 py-2.5 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all rounded-xl">
              <Eye className="w-4 h-4 mr-3" />Review
            </TabsTrigger>
            <TabsTrigger value="history" className="w-full justify-start px-4 py-2.5 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all rounded-xl">
              <Clock className="w-4 h-4 mr-3" />History
            </TabsTrigger>
            <TabsTrigger value="generate" className="w-full justify-start px-4 py-2.5 text-sm font-medium data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all rounded-xl mt-4 border border-purple-200 text-purple-700 bg-purple-50">
              <Sparkles className="w-4 h-4 mr-3" />Generate Qs
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-w-0 w-full print:w-full print:m-0 print:p-0">

          {/* Setup Tab */}
          <TabsContent value="setup" className="animate-fade-in">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="shadow-sm border-0 bg-white/80">
                <CardHeader>
                  <CardTitle className="text-lg">Assignment Details</CardTitle>
                  <CardDescription>Basic information about the assignment</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Branch *</Label>
                    <Select value={settings.branch} onValueChange={(v) => setSettings({ ...settings, branch: v })}>
                      <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Computer Science Engineering">Computer Science Engineering (CSE)</SelectItem>
                        <SelectItem value="Computer Science Engineering(AI/ML)">Computer Science Engineering(AI/ML)</SelectItem>
                        <SelectItem value="Electronics & Communication">Electronics & Communication (ECE)</SelectItem>
                        <SelectItem value="Electrical Engineering">Electrical Engineering (EE)</SelectItem>
                        <SelectItem value="Mechanical Engineering">Mechanical Engineering (ME)</SelectItem>
                        <SelectItem value="Civil Engineering">Civil Engineering (CE)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Semester *</Label>
                    <Select value={settings.semester} onValueChange={(v) => setSettings({ ...settings, semester: v })}>
                      <SelectTrigger><SelectValue placeholder="Select Semester" /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                          <SelectItem key={sem} value={sem.toString()}>Semester {sem}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject *</Label>
                    <Input
                      placeholder="e.g. Computer Science"
                      value={settings.subject}
                      onChange={(e) => setSettings({ ...settings, subject: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Assignment Title *</Label>
                    <Input
                      placeholder="e.g. Object Oriented Programming Concepts"
                      value={settings.title}
                      onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Total Marks</Label>
                      <Input
                        type="number"
                        placeholder="10"
                        value={settings.totalMarks}
                        onChange={(e) => setSettings({ ...settings, totalMarks: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Difficulty Level</Label>
                      <Select value={settings.difficulty} onValueChange={(v) => setSettings({ ...settings, difficulty: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Evaluation Strictness</Label>
                    <Select value={settings.strictness} onValueChange={(v) => setSettings({ ...settings, strictness: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lenient">Lenient — Focus on core concepts</SelectItem>
                        <SelectItem value="moderate">Moderate — Balanced evaluation</SelectItem>
                        <SelectItem value="strict">Strict — Penalise minor errors too</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card className="shadow-sm border-0 bg-white/80">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Upload Files</CardTitle>
                    <CardDescription>Upload question paper and supporting documents</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="mb-2 block">Question Paper</Label>
                      <FileDropzone
                        onDrop={(f) => setFiles({ ...files, question: f })}
                        accept={{ "application/pdf": [".pdf"], "application/msword": [".doc", ".docx"] }}
                        label="Upload Question Paper"
                        icon={FileText}
                        file={files.question}
                      />
                    </div>
                    <div>
                      <Label className="mb-2 block">Model Answer <span className="text-muted-foreground text-xs">(optional)</span></Label>
                      <FileDropzone
                        onDrop={(f) => setFiles({ ...files, model: f })}
                        accept={{ "application/pdf": [".pdf"], "application/msword": [".doc", ".docx"] }}
                        label="Upload Model Answer"
                        icon={FileText}
                        file={files.model}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* AI Model Configuration */}
                <Card className="shadow-sm border-0 bg-white/80">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      AI Model Configuration
                    </CardTitle>
                    <CardDescription>Choose which AI models evaluate this assignment</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Select Models</Label>
                      <div className="space-y-2">
                        {[
                          { id: "gemini", label: "Gemini 2.0 Flash", desc: "Google's fast multimodal model", color: "bg-blue-500" },
                          { id: "openai", label: "GPT-4o Mini", desc: "OpenAI's efficient model", color: "bg-green-500" },
                          { id: "anthropic", label: "Claude Sonnet", desc: "Anthropic's reasoning model", color: "bg-purple-500" },
                        ].map(({ id, label, desc, color }) => {
                          const checked = modelConfig.models.includes(id);
                          return (
                            <label key={id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${checked ? "border-indigo-400 bg-indigo-50" : "border-border hover:border-indigo-200"}`}>
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={checked}
                                onChange={() => {
                                  const next = checked
                                    ? modelConfig.models.filter(m => m !== id)
                                    : [...modelConfig.models, id];
                                  if (next.length > 0) setModelConfig({ ...modelConfig, models: next });
                                }}
                              />
                              <div className={`w-3 h-3 rounded-full ${color} flex-shrink-0 ${!checked ? "opacity-30" : ""}`} />
                              <div className="flex-1">
                                <p className="text-sm font-semibold">{label}</p>
                                <p className="text-xs text-muted-foreground">{desc}</p>
                              </div>
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? "bg-indigo-600 border-indigo-600" : "border-border"}`}>
                                {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Scoring Strategy</Label>
                      <Select value={modelConfig.strategy} onValueChange={v => setModelConfig({ ...modelConfig, strategy: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="average">📊 Average — All models ka average score</SelectItem>
                          <SelectItem value="best">🏆 Best — Highest scoring model ka result</SelectItem>
                        </SelectContent>
                      </Select>
                      {modelConfig.models.length > 1 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {modelConfig.strategy === "average"
                            ? `${modelConfig.models.length} models parallel chalenge, marks ka average final score banega.`
                            : `${modelConfig.models.length} models parallel chalenge, sabse achha result select hoga.`}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>


            {error && (
              <div className="mt-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <Button size="lg" onClick={() => setActiveTab("rubric")}>
                Continue to Rubric
                <ClipboardList className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </TabsContent>

          {/* Rubric Tab */}
          <TabsContent value="rubric" className="animate-fade-in">
            <Card className="shadow-sm border-0 bg-white/80">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Evaluation Rubric</CardTitle>
                    <CardDescription>Define the scoring criteria for this assignment</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={totalRubricMarks === Number(settings.totalMarks) ? "success" : "warning"}>
                      {totalRubricMarks} / {settings.totalMarks} marks allocated
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  {rubricItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-3 items-start p-4 bg-muted/30 rounded-xl border border-border/50">
                      <div className="col-span-4">
                        <Label className="text-xs mb-1 block">Parameter</Label>
                        <Input
                          placeholder="e.g. Concept Accuracy"
                          value={item.parameter}
                          onChange={(e) => updateRubricItem(idx, "parameter", e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-5">
                        <Label className="text-xs mb-1 block">Description</Label>
                        <Input
                          placeholder="What this criterion evaluates"
                          value={item.description}
                          onChange={(e) => updateRubricItem(idx, "description", e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs mb-1 block">Max Marks</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.maxMarks}
                          onChange={(e) => updateRubricItem(idx, "maxMarks", Number(e.target.value))}
                          className="text-sm text-center"
                        />
                      </div>
                      <div className="col-span-1 pt-6">
                        <Button variant="ghost" size="icon" onClick={() => removeRubricItem(idx)} className="text-destructive hover:text-destructive hover:bg-destructive/10 w-8 h-8">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button variant="outline" onClick={addRubricItem} className="w-full border-dashed">
                  <Plus className="w-4 h-4 mr-2" />Add Rubric Item
                </Button>

                <Separator className="my-6" />

                {error && (
                  <div className="mb-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setActiveTab("setup")}>
                    <ArrowLeft className="w-4 h-4 mr-2" />Back
                  </Button>
                  <Button size="lg" onClick={handleCreate} disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Create Evaluation Session
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Review Tab */}
          <TabsContent value="review" className="animate-fade-in">
            {sessionId && (
              <div className="space-y-6">
                <Card className="shadow-sm border-0 bg-white/80">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-emerald-800">Session Created Successfully!</h3>
                        <p className="text-sm text-muted-foreground">Share this session ID with students</p>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 mb-6">
                      <p className="text-xs text-blue-600 font-medium uppercase tracking-wider mb-2">Session ID</p>
                      <div className="flex items-center justify-between">
                        <code className="text-3xl font-bold font-mono text-blue-800 tracking-widest">{sessionId}</code>
                        <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(sessionId)}>
                          Copy
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: "Branch", value: settings.branch || "—" },
                        { label: "Semester", value: settings.semester ? `Sem ${settings.semester}` : "—" },
                        { label: "Subject", value: settings.subject || "—" },
                        { label: "Difficulty", value: settings.difficulty },
                        { label: "Strictness", value: settings.strictness },
                        { label: "Total Marks", value: settings.totalMarks },
                        { label: "Rubric Items", value: rubricItems.length },
                        { label: "Model Answer", value: files.model ? "Uploaded" : "Not provided" },
                      ].map((item) => (
                        <div key={item.label} className="bg-muted/40 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                          <p className="font-semibold text-sm capitalize">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="shadow-sm border-0 bg-white/80 cursor-pointer hover:shadow-md transition-all" onClick={() => router.push("/student")}>
                    <CardContent className="pt-6 flex items-center gap-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold">View as Student</p>
                        <p className="text-xs text-muted-foreground">See the student submission portal</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm border-0 bg-white/80 cursor-pointer hover:shadow-md transition-all">
                    <CardContent className="pt-6 flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold">Analytics (Coming Soon)</p>
                        <p className="text-xs text-muted-foreground">View all student submissions</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="animate-fade-in">
            <Card className="shadow-sm border-0 bg-white/80">
              <CardHeader>
                <CardTitle className="text-lg">Past Sessions</CardTitle>
                <CardDescription>View your previously created evaluation sessions and student submissions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {historySessions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No previous sessions found.</p>
                ) : (
                  historySessions.map(session => (
                    <div key={session.sessionId} className="border border-border/50 rounded-xl overflow-hidden">
                      <button
                        className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                        onClick={() => loadSubmissions(session.sessionId)}
                      >
                        <div>
                          <p className="font-semibold text-sm">{session.title} <span className="text-xs text-muted-foreground ml-2 font-mono">{session.sessionId}</span></p>
                          <p className="text-xs text-muted-foreground">{session.subject} • {session.settings?.difficulty}</p>
                        </div>
                        {expandedSession === session.sessionId ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </button>

                      {expandedSession === session.sessionId && (
                        <div className="p-4 bg-white border-t border-border/50">
                          {(!sessionSubmissions[session.sessionId] ? (
                            <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                          ) : sessionSubmissions[session.sessionId].length === 0 ? (
                            <p className="text-sm text-center text-muted-foreground py-2">No submissions yet for this session.</p>
                          ) : (
                            <div className="space-y-3">
                              {sessionSubmissions[session.sessionId].map(sub => (
                                <div key={sub._id} className="flex items-center justify-between p-3 border rounded-lg hover:border-primary/30 transition-colors">
                                  <div>
                                    <p className="font-medium text-sm">{sub.studentName}</p>
                                    <p className="text-xs text-muted-foreground">{new Date(sub.evaluatedAt).toLocaleString()}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Badge variant={sub.result.percentage >= 75 ? "success" : sub.result.percentage >= 50 ? "warning" : "danger"}>
                                      {sub.result.percentage}%
                                    </Badge>
                                    <p className="text-sm font-bold">{sub.result.totalMarks}/{sub.result.maxMarks}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}

              {historyGenerated.length > 0 && (
                <>
                  <Separator className="my-6" />
                  <h3 className="text-md font-semibold mb-4 text-purple-700 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Past Generated Questions
                  </h3>
                  {historyGenerated.map((gen) => (
                    <div key={gen._id} className="border border-purple-100 rounded-xl bg-purple-50/30 p-4 mb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-sm">
                            {gen.parameters.branch} - Sem {gen.parameters.semester} (Year {gen.parameters.year})
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {gen.parameters.count} {gen.parameters.type} Questions | {gen.parameters.difficulty} Level
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{new Date(gen.createdAt).toLocaleString()}</p>
                          <Badge variant="outline" className="mt-1 text-[10px] uppercase text-purple-600 border-purple-200 bg-purple-100/50">
                            {gen.modelsUsed.join(" + ")}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-3">
                        <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={() => {
                          setGenResult(gen);
                          setActiveTab("generate");
                        }}>
                          <Eye className="w-3 h-3 mr-2" /> View Questions
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Generate Questions Tab */}
          <TabsContent value="generate" className="animate-fade-in print:block print:w-full">
            {!genResult ? (
              <div className="grid lg:grid-cols-2 gap-6 print:hidden">
                <Card className="shadow-sm border-0 bg-white/80">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      AI Question Generator
                    </CardTitle>
                    <CardDescription>Enter parameters to automatically generate an exam paper based on your syllabus.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Branch</Label>
                        <Input placeholder="e.g. Computer Science" value={genSettings.branch} onChange={(e) => setGenSettings({ ...genSettings, branch: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Semester</Label>
                        <Input placeholder="e.g. 5th" value={genSettings.semester} onChange={(e) => setGenSettings({ ...genSettings, semester: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Year</Label>
                        <Input placeholder="e.g. 3rd" value={genSettings.year} onChange={(e) => setGenSettings({ ...genSettings, year: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Difficulty Level</Label>
                        <Select value={genSettings.difficulty} onValueChange={(v) => setGenSettings({ ...genSettings, difficulty: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Easy (Basic Concepts)</SelectItem>
                            <SelectItem value="medium">Medium (Application)</SelectItem>
                            <SelectItem value="hard">Hard (Analysis & Design)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Question Type</Label>
                        <Select value={genSettings.type} onValueChange={(v) => setGenSettings({ ...genSettings, type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="subjective">Subjective (Long Answer)</SelectItem>
                            <SelectItem value="objective">Objective (MCQs)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Number of Questions</Label>
                        <Input type="number" min="1" max="50" value={genSettings.count} onChange={(e) => setGenSettings({ ...genSettings, count: e.target.value })} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card className="shadow-sm border-0 bg-white/80">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-emerald-600" />
                        Syllabus Upload
                      </CardTitle>
                      <CardDescription>Upload syllabus PDF/DOCX to base the questions on.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FileDropzone
                        onDrop={(f) => setGenFile(f)}
                        accept={{ "application/pdf": [".pdf"], "application/msword": [".doc", ".docx"] }}
                        label="Upload Syllabus Document"
                        icon={FileText}
                        file={genFile}
                      />
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm border-0 bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-100">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-purple-600" />
                        AI Model Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          { id: "gemini", label: "Gemini 2.0 Flash", color: "bg-blue-500" },
                          { id: "openai", label: "GPT-4o Mini", color: "bg-green-500" },
                          { id: "anthropic", label: "Claude Sonnet", color: "bg-purple-500" },
                          { id: "all", label: "All Models (Compare)", color: "bg-gradient-to-r from-blue-500 via-green-500 to-purple-500" },
                        ].map(({ id, label, color }) => {
                          const checked = genModels.includes(id) || (id === "all" && genModels.includes("all"));
                          return (
                            <label key={id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${checked ? "border-purple-400 bg-white/80 shadow-sm" : "border-border/50 hover:border-purple-200 bg-white/40"}`}>
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={checked}
                                onChange={() => {
                                  if (id === "all") setGenModels(["all"]);
                                  else {
                                    const next = genModels.filter(m => m !== "all" && m !== id);
                                    if (!checked) next.push(id);
                                    if (next.length > 0) setGenModels(next);
                                  }
                                }}
                              />
                              <div className={`w-3 h-3 rounded-full ${color} flex-shrink-0 ${!checked ? "opacity-30" : ""}`} />
                              <div className="flex-1 text-sm font-semibold">{label}</div>
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${checked ? "bg-purple-600 border-purple-600" : "border-muted-foreground/30"}`}>
                                {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      {error && (
                        <div className="mt-4 flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <p>{error}</p>
                        </div>
                      )}

                      <Button className="w-full mt-6 bg-purple-600 hover:bg-purple-700" size="lg" disabled={isGenerating} onClick={handleGenerateQuestions}>
                        {isGenerating ? (
                          <div className="flex items-center">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            Generating...
                          </div>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" /> Generate Question Paper
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between print:hidden">
                  <Button variant="outline" onClick={() => setGenResult(null)}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Generator
                  </Button>
                  <Button className="bg-purple-600 hover:bg-purple-700" onClick={handlePrintPDF}>
                    <Download className="w-4 h-4 mr-2" /> Export to PDF
                  </Button>
                </div>

                <div className="print:block">
                  <div className="text-center mb-8 border-b-2 border-black pb-4">
                    <h1 className="text-2xl font-bold uppercase tracking-wide">Question Paper</h1>
                    <p className="text-sm font-medium mt-1">Branch: {genResult.parameters.branch} | Semester: {genResult.parameters.semester} | Year: {genResult.parameters.year}</p>
                    <p className="text-sm text-muted-foreground mt-1">Type: <span className="capitalize">{genResult.parameters.type}</span> | Level: <span className="capitalize">{genResult.parameters.difficulty}</span></p>
                  </div>

                  {genResult.generatedQuestions.length === 1 ? (
                    <div className="prose prose-sm max-w-none print:prose-p:text-black print:prose-headings:text-black print:prose-li:text-black whitespace-pre-wrap">
                      {genResult.generatedQuestions[0].questions}
                    </div>
                  ) : (
                    <Tabs defaultValue={genResult.generatedQuestions[0].model} className="print:hidden">
                      <TabsList className="w-full justify-start bg-purple-50 p-1 rounded-xl mb-4">
                        {genResult.generatedQuestions.map(q => (
                          <TabsTrigger key={q.model} value={q.model} className="data-[state=active]:bg-white data-[state=active]:text-purple-700 capitalize rounded-lg px-6">
                            {q.model} Output
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {genResult.generatedQuestions.map(q => (
                        <TabsContent key={q.model} value={q.model} className="bg-white p-6 rounded-xl border border-border/50 shadow-sm">
                          <div className="prose prose-sm max-w-none whitespace-pre-wrap">{q.questions}</div>
                          <Button className="mt-6 w-full" variant="outline" onClick={handlePrintPDF}>
                            Print this version ({q.model})
                          </Button>
                        </TabsContent>
                      ))}
                    </Tabs>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
