import React, { useState } from 'react';
import {
  FileCode,
  Download,
  Copy,
  Check,
  Code2,
} from 'lucide-react';
import JSZip from 'jszip';
import confetti from 'canvas-confetti';
import { ANDROID_PROJECT_FILES, AndroidSourceFile } from '../data/androidKotlinCodebase';

interface AndroidCodeExplorerProps {
  onClose?: () => void;
}

export const AndroidCodeExplorer: React.FC<AndroidCodeExplorerProps> = ({ onClose }) => {
  const [selectedFile, setSelectedFile] = useState<AndroidSourceFile>(ANDROID_PROJECT_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();

      // Add all Kotlin, Gradle, and Manifest files
      ANDROID_PROJECT_FILES.forEach((file) => {
        zip.file(file.path, file.content);
      });

      // Add standard gradle wrapper and settings files
      zip.file(
        'settings.gradle.kts',
        `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "SmartAlarm"
include(":app")`
      );

      zip.file(
        'build.gradle.kts',
        `// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.kapt) apply false
}`
      );

      zip.file(
        'gradle/libs.versions.toml',
        `[versions]
agp = "8.3.0"
kotlin = "1.9.22"
coreKtx = "1.12.0"
lifecycleRuntimeKtx = "2.7.0"
activityCompose = "1.8.2"
composeBom = "2024.02.00"
room = "2.6.1"
coroutines = "1.8.0"
navCompose = "2.7.7"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
androidx-lifecycle-runtime-ktx = { group = "androidx.lifecycle", name = "lifecycle-runtime-ktx", version.ref = "lifecycleRuntimeKtx" }
androidx-lifecycle-viewmodel-compose = { group = "androidx.lifecycle", name = "lifecycle-viewmodel-compose", version.ref = "lifecycleRuntimeKtx" }
androidx-activity-compose = { group = "androidx.activity", name = "activity-compose", version.ref = "activityCompose" }
androidx-compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "composeBom" }
androidx-compose-ui = { group = "androidx.compose.ui", name = "ui" }
androidx-compose-ui-graphics = { group = "androidx.compose.ui", name = "ui-graphics" }
androidx-compose-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
androidx-compose-material3 = { group = "androidx.compose.material3", name = "material3" }
androidx-compose-material-icons-extended = { group = "androidx.compose.material", name = "material-icons-extended" }
androidx-room-runtime = { group = "androidx.room", name = "room-runtime", version.ref = "room" }
androidx-room-ktx = { group = "androidx.room", name = "room-ktx", version.ref = "room" }
androidx-room-compiler = { group = "androidx.room", name = "room-compiler", version.ref = "room" }
kotlinx-coroutines-android = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-android", version.ref = "coroutines" }
androidx-navigation-compose = { group = "androidx.navigation", name = "navigation-compose", version.ref = "navCompose" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-kapt = { id = "org.jetbrains.kotlin.kapt", version.ref = "kotlin" }`
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'smart-alarm-android-project.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch (err) {
      console.error('Failed to zip project', err);
    } finally {
      setIsZipping(false);
    }
  };

  const categories = [
    { id: 'all', label: 'All Files' },
    { id: 'scheduler', label: 'Alarm Scheduler' },
    { id: 'model', label: 'Data Model' },
    { id: 'database', label: 'Room Database' },
    { id: 'receiver', label: 'BroadcastReceivers' },
    { id: 'service', label: 'Foreground Service' },
    { id: 'ui', label: 'Compose UI' },
    { id: 'manifest', label: 'Manifest & Gradle' },
  ];

  const filteredFiles = ANDROID_PROJECT_FILES.filter((file) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'manifest') return file.category === 'manifest' || file.category === 'gradle';
    return file.category === activeCategory;
  });

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-[32px] border border-slate-800 overflow-hidden shadow-xl">
      {/* Code Explorer Top Bar */}
      <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2 text-white">
              <span>Android Kotlin & Compose Codebase</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                100% Production Ready
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Complete native Android Studio project with Room, AlarmManager, and Compose
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs shadow-2xs shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isZipping ? 'Generating ZIP...' : 'Download Android Studio ZIP'}</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-6 py-2.5 bg-slate-900/40 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeCategory === cat.id
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main split view: File list on left, Code Viewer on right */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* Left File Tree Sidebar */}
        <div className="md:col-span-4 bg-slate-900/30 border-r border-slate-800/80 overflow-y-auto p-3 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-3 py-2">
            Project Files ({filteredFiles.length})
          </div>
          {filteredFiles.map((file) => {
            const isSelected = selectedFile.path === file.path;
            const fileName = file.path.split('/').pop() || file.path;
            const dirPath = file.path.split('/').slice(0, -1).join('/');

            return (
              <div
                key={file.path}
                onClick={() => setSelectedFile(file)}
                className={`p-2.5 rounded-2xl cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-200'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <FileCode
                    className={`w-4 h-4 shrink-0 ${
                      isSelected ? 'text-indigo-400' : 'text-slate-500'
                    }`}
                  />
                  <div className="truncate">
                    <p className="text-xs font-semibold truncate text-slate-200">{fileName}</p>
                    <p className="text-[10px] text-slate-500 truncate font-mono">{dirPath}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Code Content View */}
        <div className="md:col-span-8 flex flex-col bg-slate-950 overflow-hidden">
          {/* File Header */}
          <div className="px-5 py-3 bg-slate-900/50 border-b border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-xs font-mono font-semibold text-indigo-400">
                {selectedFile.path}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">{selectedFile.description}</p>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>

          {/* Syntax Highlighted Code Box */}
          <div className="flex-1 overflow-auto p-5 font-mono text-xs text-slate-300 leading-relaxed bg-slate-950">
            <pre>
              <code>{selectedFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
