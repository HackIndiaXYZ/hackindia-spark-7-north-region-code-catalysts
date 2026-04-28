import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// ========= SPLASH SCREEN =========
const splashHTML = `
<div id="splash-screen" style="
  position: fixed; inset: 0; z-index: 99999;
  background: #0C1E3C;
  display: flex; align-items: center; justify-content: center;
  flex-direction: column;
  opacity: 1;
  transition: opacity 0.5s ease, transform 0.5s ease;
">
  <!-- Radial glow -->
  <div style="
    position: absolute;
    width: 320px; height: 320px;
    background: radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%);
    border-radius: 50%; filter: blur(40px);
    animation: splashPulse 2s ease-in-out infinite;
  "></div>

  <!-- Logo icon -->
  <div style="
    width: 80px; height: 80px;
    border-radius: 24px;
    background: linear-gradient(135deg, #1D4ED8, #3B82F6);
    border: 1px solid rgba(96,165,250,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 38px;
    margin-bottom: 22px;
    opacity: 0; transform: scale(0.5);
    animation: splashLogoIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.2s forwards;
    box-shadow: 0 8px 40px rgba(37,99,235,0.5);
  ">🏙️</div>

  <!-- Title -->
  <div style="
    font-family: 'Inter', sans-serif;
    font-size: 26px; font-weight: 800;
    color: #FFFFFF; letter-spacing: -0.03em;
    opacity: 0; transform: translateY(15px);
    animation: splashTextIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.5s forwards;
  ">Smart Street Light</div>

  <!-- Subtitle -->
  <div style="
    font-family: 'JetBrains Mono', 'Share Tech Mono', monospace;
    font-size: 12px;
    color: rgba(147,197,253,0.7);
    margin-top: 8px;
    opacity: 0; transform: translateY(10px);
    animation: splashTextIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.7s forwards;
  ">Ministry of Power — Monitoring System</div>

  <!-- Divider -->
  <div style="
    width: 0px; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(59,130,246,0.6), transparent);
    margin-top: 18px; border-radius: 2px;
    animation: splashLineExpand 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.9s forwards;
  "></div>

  <!-- Loading bar track -->
  <div style="
    width: 160px; height: 3px;
    background: rgba(255,255,255,0.08);
    border-radius: 10px; margin-top: 22px;
    overflow: hidden; opacity: 0;
    animation: splashTextIn 0.3s ease 1.1s forwards;
  ">
    <div style="
      width: 0%; height: 100%;
      background: linear-gradient(90deg, #1D4ED8, #60A5FA);
      border-radius: 10px;
      animation: splashLoadBar 1.2s cubic-bezier(0.22, 1, 0.36, 1) 1.2s forwards;
      box-shadow: 0 0 8px rgba(59,130,246,0.6);
    "></div>
  </div>

  <!-- Version -->
  <div style="
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px; color: rgba(255,255,255,0.25);
    margin-top: 12px; opacity: 0;
    animation: splashTextIn 0.3s ease 1.3s forwards;
  ">v1.0 — Initializing System</div>
</div>

<style>
  @keyframes splashPulse { 0%,100%{transform:scale(1);opacity:0.6} 50%{transform:scale(1.15);opacity:1} }
  @keyframes splashLogoIn { 0%{opacity:0;transform:scale(0.5) rotate(-8deg)} 100%{opacity:1;transform:scale(1) rotate(0deg)} }
  @keyframes splashTextIn { 0%{opacity:0;transform:translateY(15px)} 100%{opacity:1;transform:translateY(0)} }
  @keyframes splashLineExpand { 0%{width:0px} 100%{width:80px} }
  @keyframes splashLoadBar { 0%{width:0%} 100%{width:100%} }
  @keyframes splashFadeOut { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(1.02);filter:blur(6px)} }
</style>
`;

document.getElementById("root").insertAdjacentHTML("beforebegin", splashHTML);

const removeSplash = () => {
  const splash = document.getElementById("splash-screen");
  if (splash) {
    setTimeout(() => {
      splash.style.animation = "splashFadeOut 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards";
      setTimeout(() => splash.remove(), 500);
    }, 2600);
  }
};

removeSplash();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><App /></React.StrictMode>
);
