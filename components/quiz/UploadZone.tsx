"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, X, AlertCircle } from "lucide-react";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  disabled?: boolean;
}

export default function UploadZone({ onFileSelect, selectedFile, onClear, disabled }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState("");

  function validateFile(file: File): boolean {
    const isPDF = file.type === "application/pdf" || file.name.endsWith(".pdf");
    const isJSON = file.type === "application/json" || file.name.endsWith(".json");

    if (!isPDF && !isJSON) {
      setError("Only PDF or JSON files are allowed");
      return false;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("File size must be under 20MB");
      return false;
    }
    setError("");
    return true;
  }

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file && validateFile(file)) {
        onFileSelect(file);
      }
    },
    [disabled, onFileSelect]
  );

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  }

  if (selectedFile) {
    return (
      <div className="glass rounded-2xl p-6 flex items-center gap-4 border border-purple-500/20">
        <div className="w-12 h-12 rounded-xl bg-purple-500/15 flex items-center justify-center flex-shrink-0">
          <FileText className="w-6 h-6 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{selectedFile.name}</p>
          <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
        {!disabled && (
          <button onClick={onClear} className="text-muted-foreground hover:text-red-400 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 p-12 text-center cursor-pointer ${
          isDragOver
            ? "border-purple-500 bg-purple-500/10"
            : "border-white/10 hover:border-purple-500/50 hover:bg-white/3"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        onClick={() => !disabled && document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".pdf,.json"
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />
        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, hsl(262 80% 65% / 0.2), hsl(199 89% 48% / 0.2))" }}>
          <Upload className="w-8 h-8 text-purple-400" />
        </div>
        <p className="font-semibold text-lg mb-1">Drop your PDF or JSON here</p>
        <p className="text-sm text-muted-foreground">or click to browse — Max 20MB</p>
      </div>
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
