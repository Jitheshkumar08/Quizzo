"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import {
  DIRECT_PDF_UPLOAD_LIMIT_BYTES,
  DIRECT_PDF_UPLOAD_LIMIT_LABEL,
  JSON_UPLOAD_LIMIT_BYTES,
  JSON_UPLOAD_LIMIT_LABEL,
} from "@/lib/uploadLimits";

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
    const fileName = file.name.toLowerCase();
    const isPDF = file.type === "application/pdf" || fileName.endsWith(".pdf");
    const isJSON = file.type === "application/json" || fileName.endsWith(".json");

    if (!isPDF && !isJSON) {
      setError("Only PDF or JSON files are allowed");
      return false;
    }
    if (isPDF && file.size > DIRECT_PDF_UPLOAD_LIMIT_BYTES) {
      setError(`PDF direct upload must be under ${DIRECT_PDF_UPLOAD_LIMIT_LABEL}. For larger PDFs, use the Upload Guide prompt and upload JSON.`);
      return false;
    }
    if (isJSON && file.size > JSON_UPLOAD_LIMIT_BYTES) {
      setError(`JSON file size must be under ${JSON_UPLOAD_LIMIT_LABEL}`);
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
      <div className="bg-white/50 backdrop-blur-xl border border-white/80 shadow-[0_4px_16px_rgba(44,42,40,0.04),inset_0_1px_2px_rgba(255,255,255,0.8)] rounded-2xl p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#8C5D3E]/10 flex items-center justify-center flex-shrink-0 text-[#8C5D3E]">
          <FileText className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[#2C2A28] text-sm truncate">{selectedFile.name}</p>
          <p className="text-xs text-[#918B80] font-medium">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
        {!disabled && (
          <button onClick={onClear} className="text-[#918B80] hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all cursor-pointer">
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
        className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 p-12 text-center cursor-pointer ${
          isDragOver
            ? "border-[#8C5D3E] bg-[#8C5D3E]/5"
            : "border-[#2C2A28]/10 hover:border-[#8C5D3E]/40 hover:bg-white/40 focus:outline-none"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "bg-white/30 backdrop-blur-sm"}`}
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
        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-[#8C5D3E]/10 text-[#8C5D3E] shadow-sm">
          <Upload className="w-8 h-8" />
        </div>
        <p className="font-bold text-[#2C2A28] text-lg mb-1">Drop your PDF or JSON here</p>
        <p className="text-sm font-medium text-[#918B80]">or click to browse - PDF max {DIRECT_PDF_UPLOAD_LIMIT_LABEL}, JSON max {JSON_UPLOAD_LIMIT_LABEL}</p>
      </div>
      {error && (
        <div className="flex items-center gap-2 text-red-600 font-medium text-sm p-4 rounded-xl bg-red-50 border border-red-100 shadow-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
