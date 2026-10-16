var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/pages/RoleAuth.jsx
var RoleAuth_exports = {};
__export(RoleAuth_exports, {
  default: () => RoleAuth
});
module.exports = __toCommonJS(RoleAuth_exports);
var import_react2 = __toESM(require("react"), 1);

// src/context/AuthContext.jsx
var import_react = __toESM(require("react"), 1);
var import_meta = {};
var AuthContext = (0, import_react.createContext)(null);
var API_URL = {VITE_API_URL: " url\}.VITE_API_URL || "http://localhost:3001/api";
var useAuth = () => (0, import_react.useContext)(AuthContext);

// src/pages/RoleAuth.jsx
var import_lucide_react = require("lucide-react");
function RoleAuth({ role, initialMode, onNavigate }) {
  const { login, signup } = useAuth();
  const [mode, setMode] = (0, import_react2.useState)(initialMode);
  const [email, setEmail] = (0, import_react2.useState)("");
  const [password, setPassword] = (0, import_react2.useState)("");
  const [showPassword, setShowPassword] = (0, import_react2.useState)(false);
  const [name, setName] = (0, import_react2.useState)("");
  const [isLoading, setIsLoading] = (0, import_react2.useState)(false);
  const [error, setError] = (0, import_react2.useState)("");
  const roleConfig = {
    student: {
      title: "Student Portal",
      color: "indigo",
      icon: import_lucide_react.User,
      bg: "bg-indigo-600 hover:bg-indigo-500",
      shadow: "shadow-[0_0_20px_rgba(99,102,241,0.3)]",
      text: "text-indigo-400"
    },
    teacher: {
      title: "Teacher Portal",
      color: "emerald",
      icon: import_lucide_react.Users,
      bg: "bg-emerald-600 hover:bg-emerald-500",
      shadow: "shadow-[0_0_20px_rgba(16,185,129,0.3)]",
      text: "text-emerald-400"
    },
    hr: {
      title: "HR Portal",
      color: "amber",
      icon: import_lucide_react.Briefcase,
      bg: "bg-amber-600 hover:bg-amber-500",
      shadow: "shadow-[0_0_20px_rgba(245,158,11,0.3)]",
      text: "text-amber-400"
    }
  };
  const config = roleConfig[role];
  const Icon = config.icon;
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    setIsLoading(true);
    let result;
    if (mode === "login") {
      result = await login(email.trim(), password);
    } else {
      result = await signup(name.trim(), email.trim(), password);
    }
    if (result && !result.success) {
      setError(result.error);
      setIsLoading(false);
    } else {
      if (role === "student") onNavigate("dashboard");
      else if (role === "teacher") onNavigate("teacher-dashboard");
      else if (role === "hr") onNavigate("hr-dashboard");
      else onNavigate("dashboard");
    }
  };
  const toggleMode = () => {
    setMode((prev) => prev === "login" ? "signup" : "login");
    setError("");
  };
  return /* @__PURE__ */ import_react2.default.createElement("div", { className: "min-h-screen flex items-center justify-center p-4 bg-[#080c14] relative overflow-hidden" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: `absolute top-1/4 left-1/4 w-96 h-96 bg-${config.color}-600/10 rounded-full blur-[100px] pointer-events-none` }), /* @__PURE__ */ import_react2.default.createElement("div", { className: `absolute bottom-1/4 right-1/4 w-96 h-96 bg-${config.color}-600/10 rounded-full blur-[100px] pointer-events-none` }), /* @__PURE__ */ import_react2.default.createElement("div", { className: "max-w-md w-full glass-card rounded-3xl p-8 border border-white/10 shadow-2xl relative z-10 animate-in fade-in slide-in-from-bottom-8" }, /* @__PURE__ */ import_react2.default.createElement("button", { onClick: () => onNavigate("portal-selection"), className: "absolute top-6 left-6 text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium" }, /* @__PURE__ */ import_react2.default.createElement(import_lucide_react.ArrowLeft, { className: "w-4 h-4" }), " ", /* @__PURE__ */ import_react2.default.createElement("span", { className: "hidden sm:inline" }, "Back")), /* @__PURE__ */ import_react2.default.createElement("div", { className: "text-center mt-6 mb-8" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: `w-16 h-16 rounded-2xl bg-${config.color}-500/20 flex items-center justify-center mx-auto mb-4 border border-${config.color}-500/30` }, /* @__PURE__ */ import_react2.default.createElement(Icon, { className: `w-8 h-8 ${config.text}` })), /* @__PURE__ */ import_react2.default.createElement("h2", { className: "text-2xl font-bold text-white mb-2 font-['Outfit']" }, config.title), /* @__PURE__ */ import_react2.default.createElement("p", { className: "text-sm text-slate-400" }, mode === "login" ? "Sign in to continue" : "Create an account")), /* @__PURE__ */ import_react2.default.createElement("div", { className: "bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs p-3 rounded-xl mb-6 text-center" }, /* @__PURE__ */ import_react2.default.createElement("strong", null, "Note:"), " Authentication uses the unified JobDM backend. Role authorization checks on the backend may be pending."), /* @__PURE__ */ import_react2.default.createElement("form", { onSubmit: handleSubmit, className: "space-y-4" }, error && /* @__PURE__ */ import_react2.default.createElement("div", { className: "p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium text-center" }, error), mode === "signup" && /* @__PURE__ */ import_react2.default.createElement("div", null, /* @__PURE__ */ import_react2.default.createElement("label", { className: "block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5" }, "Full Name"), /* @__PURE__ */ import_react2.default.createElement("div", { className: "relative" }, /* @__PURE__ */ import_react2.default.createElement(import_lucide_react.User, { className: "w-4 h-4 text-slate-400 absolute left-3.5 top-3" }), /* @__PURE__ */ import_react2.default.createElement(
    "input",
    {
      type: "text",
      required: true,
      value: name,
      onChange: (e) => setName(e.target.value),
      placeholder: "John Doe",
      className: "w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
    }
  ))), /* @__PURE__ */ import_react2.default.createElement("div", null, /* @__PURE__ */ import_react2.default.createElement("label", { className: "block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5" }, "Email Address"), /* @__PURE__ */ import_react2.default.createElement("div", { className: "relative" }, /* @__PURE__ */ import_react2.default.createElement(import_lucide_react.Mail, { className: "w-4 h-4 text-slate-400 absolute left-3.5 top-3" }), /* @__PURE__ */ import_react2.default.createElement(
    "input",
    {
      type: "email",
      required: true,
      value: email,
      onChange: (e) => setEmail(e.target.value),
      placeholder: "email@example.com",
      className: "w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
    }
  ))), /* @__PURE__ */ import_react2.default.createElement("div", null, /* @__PURE__ */ import_react2.default.createElement("label", { className: "block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5" }, "Password"), /* @__PURE__ */ import_react2.default.createElement("div", { className: "relative" }, /* @__PURE__ */ import_react2.default.createElement(import_lucide_react.Lock, { className: "w-4 h-4 text-slate-400 absolute left-3.5 top-3" }), /* @__PURE__ */ import_react2.default.createElement(
    "input",
    {
      type: showPassword ? "text" : "password",
      required: true,
      value: password,
      onChange: (e) => setPassword(e.target.value),
      placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
      className: "w-full pl-10 pr-10 py-2.5 rounded-xl glass-input text-sm"
    }
  ), /* @__PURE__ */ import_react2.default.createElement(
    "button",
    {
      type: "button",
      onClick: () => setShowPassword(!showPassword),
      className: "absolute right-3.5 top-3 text-slate-400 hover:text-white transition-colors"
    },
    showPassword ? /* @__PURE__ */ import_react2.default.createElement(import_lucide_react.EyeOff, { className: "w-4 h-4" }) : /* @__PURE__ */ import_react2.default.createElement(import_lucide_react.Eye, { className: "w-4 h-4" })
  ))), /* @__PURE__ */ import_react2.default.createElement(
    "button",
    {
      type: "submit",
      disabled: isLoading,
      className: `w-full py-3 mt-4 rounded-xl text-white font-bold text-sm transition-all flex items-center justify-center gap-2 ${config.bg} ${config.shadow} disabled:opacity-50`
    },
    /* @__PURE__ */ import_react2.default.createElement("span", null, isLoading ? "Processing..." : mode === "login" ? "Sign In" : "Create Account"),
    !isLoading && /* @__PURE__ */ import_react2.default.createElement(import_lucide_react.ArrowRight, { className: "w-4 h-4" })
  )), /* @__PURE__ */ import_react2.default.createElement("div", { className: "mt-6 text-center text-xs text-slate-400" }, mode === "login" ? /* @__PURE__ */ import_react2.default.createElement("p", null, "Don't have an account?", " ", /* @__PURE__ */ import_react2.default.createElement("button", { onClick: toggleMode, className: `${config.text} font-bold hover:underline` }, "Sign Up")) : /* @__PURE__ */ import_react2.default.createElement("p", null, "Already have an account?", " ", /* @__PURE__ */ import_react2.default.createElement("button", { onClick: toggleMode, className: `${config.text} font-bold hover:underline` }, "Sign In")))));
}
