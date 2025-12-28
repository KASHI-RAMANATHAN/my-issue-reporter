import { useState, useEffect, createContext, useContext, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Sun, Moon, LogOut, Building2, FileText, Camera, 
  AlertTriangle, CheckCircle, Clock, Activity, 
  Shield, Upload, X, Loader2, BarChart3, Settings,
  ChevronRight, Zap, Users
} from "lucide-react";

// Firebase imports
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, getDocs, updateDoc, doc, query, orderBy, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("campus_user");
    return saved ? JSON.parse(saved) : null;
  });

  const login = (email) => {
    const userData = { email, name: email.split("@")[0] };
    setUser(userData);
    localStorage.setItem("campus_user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("campus_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Theme Context
const ThemeContext = createContext(null);

export const useTheme = () => useContext(ThemeContext);

const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("campus_theme");
    return saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("campus_theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Buildings list
const BUILDINGS = [
  "Main Library",
  "Science Building",
  "Student Center",
  "Engineering Hall",
  "Arts Building",
  "Administration Building",
  "Sports Complex",
  "Dormitory A",
  "Dormitory B",
  "Cafeteria"
];

// Login Page
const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Mock login - any credentials work
    setTimeout(() => {
      login(email || "demo@campus.edu");
      toast.success("Welcome to Campus Issue Reporter!");
      navigate("/dashboard");
      setLoading(false);
    }, 500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 h-screen w-full overflow-hidden">
      {/* Left Panel - Login Form */}
      <div className="flex flex-col justify-center px-8 md:px-16 lg:px-24 bg-background relative z-10">
        <button
          data-testid="theme-toggle-login"
          onClick={toggleTheme}
          className="absolute top-6 right-6 p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="max-w-md w-full mx-auto space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-indigo-600">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <span className="font-heading font-bold text-xl">CampusReport</span>
            </div>
            <h1 className="font-heading font-bold text-4xl md:text-5xl tracking-tight">
              Welcome back
            </h1>
            <p className="text-muted-foreground text-lg">
              Sign in to report and track campus issues
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                data-testid="login-email"
                type="email"
                placeholder="you@campus.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                data-testid="login-password"
                type="password"
                placeholder="Enter any password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12"
              />
            </div>
            <Button 
              type="submit" 
              data-testid="login-submit"
              className="w-full h-12 rounded-full font-medium bg-indigo-600 hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center">
            Demo mode: Any email/password combination works
          </p>
        </div>
      </div>

      {/* Right Panel - Image */}
      <div className="hidden lg:block relative bg-slate-900">
        <img
          src="https://images.unsplash.com/photo-1612277107663-a65c0f67be64?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2Mzl8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjB1bml2ZXJzaXR5JTIwY2FtcHVzJTIwYXJjaGl0ZWN0dXJlfGVufDB8fHx8d2hpdGV8MTc2NjQyMTgxMnww&ixlib=rb-4.1.0&q=85"
          alt="Modern university campus"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-indigo-900/30 mix-blend-multiply" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <h2 className="font-heading font-bold text-3xl mb-3">
            Keep Your Campus Safe
          </h2>
          <p className="text-white/80 text-lg">
            Report issues instantly. AI-powered categorization helps facilities team respond faster.
          </p>
        </div>
      </div>
    </div>
  );
};

// Dashboard Page
const Dashboard = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("report");

  // Report form state
  const [building, setBuilding] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch issues from backend API (MongoDB - primary source)
  const fetchIssues = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/issues`);
      // Sort by created_at descending
      const sortedIssues = response.data.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      setIssues(sortedIssues);
    } catch (error) {
      console.error("Error fetching issues from API:", error);
      // Fallback to Firestore
      try {
        const q = query(collection(db, "issues"), orderBy("created_at", "desc"));
        const snapshot = await getDocs(q);
        const issuesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setIssues(issuesList);
      } catch (firestoreError) {
        console.error("Firestore fallback error:", firestoreError);
      }
    }
    setLoading(false);
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
      // Calculate stats from local issues
      setStats({
        total_issues: issues.length,
        open_issues: issues.filter(i => i.status === "Open").length,
        in_progress: issues.filter(i => i.status === "In Progress").length,
        resolved: issues.filter(i => i.status === "Resolved").length,
        system_status: "Operational",
        recent_logs: issues.slice(0, 5)
      });
    }
  }, [issues]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin, fetchStats]);

  // Image resize using Canvas API
  const resizeImage = (file, maxWidth = 800) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            resolve(blob);
          }, "image/jpeg", 0.8);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle image selection
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setImageFile(file);
    }
  };

  // Clear image
  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  // Submit report
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!building || !description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl = null;
      let imageBase64 = null;

      // Upload image to Firebase Storage if present
      if (imageFile) {
        const resizedBlob = await resizeImage(imageFile);
        const fileName = `issues/${Date.now()}_${imageFile.name}`;
        const storageRef = ref(storage, fileName);
        
        try {
          await uploadBytes(storageRef, resizedBlob);
          imageUrl = await getDownloadURL(storageRef);
        } catch (storageError) {
          console.error("Storage upload error:", storageError);
          // Convert to base64 for API fallback
          const reader = new FileReader();
          imageBase64 = await new Promise((resolve) => {
            reader.onloadend = () => {
              const base64 = reader.result.split(",")[1];
              resolve(base64);
            };
            reader.readAsDataURL(resizedBlob);
          });
        }
      }

      // First call backend API for AI analysis and MongoDB storage
      const apiResponse = await axios.post(
        `${API}/issues`,
        {
          building,
          description,
          image_url: imageUrl,
          image_base64: imageBase64,
        },
        { timeout: 10000 }
      );

      // Also store in Firestore
      try {
        await addDoc(collection(db, "issues"), {
          ...apiResponse.data,
          created_at: new Date().toISOString()
        });
      } catch (firestoreError) {
        console.error("Firestore write error:", firestoreError);
      }

      toast.success("Issue reported successfully!");
      
      // Reset form
      setBuilding("");
      setDescription("");
      clearImage();
      
      // Refresh issues
      fetchIssues();
      
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to submit report. Please try again.");
    }
    setSubmitting(false);
  };

  // Update issue status (admin only)
  const updateIssueStatus = async (issueId, newStatus) => {
    try {
      // Update in API
      await axios.patch(`${API}/issues/${issueId}`, { status: newStatus });
      
      // Update in Firestore
      try {
        const issueRef = doc(db, "issues", issueId);
        await updateDoc(issueRef, { status: newStatus });
      } catch (firestoreError) {
        console.error("Firestore update error:", firestoreError);
      }

      toast.success(`Status updated to ${newStatus}`);
      fetchIssues();
      fetchStats();
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update status");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Open": return <AlertTriangle className="h-4 w-4" />;
      case "In Progress": return <Clock className="h-4 w-4" />;
      case "Resolved": return <CheckCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Open": return "status-open";
      case "In Progress": return "status-in-progress";
      case "Resolved": return "status-resolved";
      default: return "";
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority?.toLowerCase()) {
      case "low": return "priority-low";
      case "medium": return "priority-medium";
      case "high": return "priority-high";
      case "critical": return "priority-critical";
      default: return "priority-medium";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="font-heading font-bold text-lg">CampusReport</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Admin Toggle */}
            <div className="flex items-center gap-2">
              <Label htmlFor="admin-toggle" className="text-sm text-muted-foreground cursor-pointer">
                Admin View
              </Label>
              <Switch
                id="admin-toggle"
                data-testid="admin-toggle"
                checked={isAdmin}
                onCheckedChange={setIsAdmin}
              />
            </div>

            <Separator orientation="vertical" className="h-8" />

            <button
              data-testid="theme-toggle"
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden md:block">
                {user?.email}
              </span>
              <Button
                variant="ghost"
                size="icon"
                data-testid="logout-btn"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Admin Stats */}
        {isAdmin && stats && (
          <div className="mb-8 animate-fade-in">
            <h2 className="font-heading font-bold text-2xl mb-4">Admin Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Total Issues Card */}
              <Card className="stat-gradient text-white overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-sm">Total Issues</p>
                      <p className="font-heading font-bold text-4xl mt-1">{stats.total_issues}</p>
                    </div>
                    <BarChart3 className="h-10 w-10 text-white/50" />
                  </div>
                  <div className="mt-4 flex gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      Open: {stats.open_issues}
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      In Progress: {stats.in_progress}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* System Status Card */}
              <Card data-testid="system-status-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">System Status</p>
                      <p className="font-heading font-bold text-2xl mt-1 text-emerald-600 dark:text-emerald-400">
                        {stats.system_status}
                      </p>
                    </div>
                    <div className="p-3 rounded-full bg-emerald-50 dark:bg-emerald-950/30">
                      <Activity className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full w-full animate-pulse-slow" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity Card */}
              <Card data-testid="recent-logs-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-muted-foreground text-sm">Recent Logs</p>
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    {stats.recent_logs?.slice(0, 3).map((log, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <div className={`w-2 h-2 rounded-full ${
                          log.status === "Open" ? "bg-amber-500" :
                          log.status === "In Progress" ? "bg-blue-500" : "bg-emerald-500"
                        }`} />
                        <span className="truncate flex-1">{log.building}</span>
                        <span className="text-muted-foreground text-xs">{log.category}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "report" ? "default" : "outline"}
            data-testid="tab-report"
            onClick={() => setActiveTab("report")}
            className="rounded-full"
          >
            <FileText className="h-4 w-4 mr-2" />
            Report Issue
          </Button>
          <Button
            variant={activeTab === "tracker" ? "default" : "outline"}
            data-testid="tab-tracker"
            onClick={() => setActiveTab("tracker")}
            className="rounded-full"
          >
            <Activity className="h-4 w-4 mr-2" />
            Status Tracker
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Report Form */}
          {activeTab === "report" && (
            <div className="lg:col-span-7 animate-fade-in">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="font-heading">Report a Campus Issue</CardTitle>
                  <CardDescription>
                    Describe the issue and our AI will automatically categorize and prioritize it
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitReport} className="space-y-6">
                    {/* Building Select */}
                    <div className="space-y-2">
                      <Label htmlFor="building">Building *</Label>
                      <Select value={building} onValueChange={setBuilding}>
                        <SelectTrigger 
                          id="building" 
                          data-testid="building-select"
                          className="h-12"
                        >
                          <SelectValue placeholder="Select a building" />
                        </SelectTrigger>
                        <SelectContent>
                          {BUILDINGS.map((b) => (
                            <SelectItem key={b} value={b} data-testid={`building-option-${b.replace(/\s/g, '-')}`}>
                              {b}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        data-testid="issue-description"
                        placeholder="Describe the issue in detail..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="min-h-[120px] resize-none"
                      />
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-2">
                      <Label>Photo (Optional)</Label>
                      {!imagePreview ? (
                        <label 
                          htmlFor="image-upload"
                          className="upload-area flex flex-col items-center justify-center cursor-pointer"
                        >
                          <Camera className="h-10 w-10 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Images will be resized to 800px
                          </p>
                          <input
                            id="image-upload"
                            data-testid="image-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                          />
                        </label>
                      ) : (
                        <div className="relative rounded-xl overflow-hidden border border-border">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-48 object-cover"
                          />
                          <button
                            type="button"
                            data-testid="clear-image"
                            onClick={clearImage}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <Button
                      type="submit"
                      data-testid="submit-report"
                      className="w-full h-12 rounded-full font-medium bg-indigo-600 hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          Analyzing & Submitting...
                        </>
                      ) : (
                        <>
                          <Zap className="h-5 w-5 mr-2" />
                          Submit Report
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Status Tracker */}
          {activeTab === "tracker" && (
            <div className="lg:col-span-12 animate-fade-in">
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading">Issue Tracker</CardTitle>
                  <CardDescription>
                    {issues.length} issue{issues.length !== 1 ? "s" : ""} reported
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : issues.length === 0 ? (
                    <div className="empty-state">
                      <img
                        src="https://images.pexels.com/photos/18069239/pexels-photo-18069239.png"
                        alt="No issues"
                        className="w-32 h-32 object-contain mb-4 opacity-50"
                      />
                      <p className="text-muted-foreground">No issues reported yet</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="space-y-4">
                        {issues.map((issue, idx) => (
                          <div
                            key={issue.id}
                            data-testid={`issue-card-${idx}`}
                            className="issue-card group"
                            style={{ animationDelay: `${idx * 50}ms` }}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{issue.building}</span>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                  {issue.description}
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge 
                                    variant="outline" 
                                    className={`badge ${getStatusClass(issue.status)}`}
                                  >
                                    {getStatusIcon(issue.status)}
                                    <span className="ml-1">{issue.status}</span>
                                  </Badge>
                                  <Badge className={`badge ${getPriorityClass(issue.priority)}`}>
                                    {issue.priority} Priority
                                  </Badge>
                                  <Badge variant="secondary" className="badge">
                                    {issue.category}
                                  </Badge>
                                </div>
                              </div>
                              
                              {issue.image_url && (
                                <img
                                  src={issue.image_url}
                                  alt="Issue"
                                  className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                                />
                              )}
                            </div>

                            {/* Admin Actions */}
                            {isAdmin && (
                              <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant={issue.status === "Open" ? "default" : "outline"}
                                  data-testid={`status-open-${idx}`}
                                  onClick={() => updateIssueStatus(issue.id, "Open")}
                                  className="rounded-full"
                                >
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Open
                                </Button>
                                <Button
                                  size="sm"
                                  variant={issue.status === "In Progress" ? "default" : "outline"}
                                  data-testid={`status-progress-${idx}`}
                                  onClick={() => updateIssueStatus(issue.id, "In Progress")}
                                  className="rounded-full"
                                >
                                  <Clock className="h-3 w-3 mr-1" />
                                  In Progress
                                </Button>
                                <Button
                                  size="sm"
                                  variant={issue.status === "Resolved" ? "default" : "outline"}
                                  data-testid={`status-resolved-${idx}`}
                                  onClick={() => updateIssueStatus(issue.id, "Resolved")}
                                  className="rounded-full"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Resolved
                                </Button>
                              </div>
                            )}

                            <div className="mt-3 text-xs text-muted-foreground">
                              Reported on {new Date(issue.created_at).toLocaleDateString()} at{" "}
                              {new Date(issue.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quick Stats Sidebar (Report Tab) */}
          {activeTab === "report" && (
            <div className="lg:col-span-5 space-y-4 animate-fade-in">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-heading">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Issues</span>
                    <span className="font-semibold">{issues.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Open</span>
                    <Badge variant="outline" className="status-open">
                      {issues.filter(i => i.status === "Open").length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">In Progress</span>
                    <Badge variant="outline" className="status-in-progress">
                      {issues.filter(i => i.status === "In Progress").length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Resolved</span>
                    <Badge variant="outline" className="status-resolved">
                      {issues.filter(i => i.status === "Resolved").length}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/50">
                      <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-indigo-900 dark:text-indigo-100">AI-Powered Analysis</h4>
                      <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
                        Our Gemini AI automatically categorizes and prioritizes your reports for faster resolution.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return children;
};

// Main App
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster 
            position="top-right" 
            richColors 
            toastOptions={{
              className: "font-sans"
            }}
          />
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
