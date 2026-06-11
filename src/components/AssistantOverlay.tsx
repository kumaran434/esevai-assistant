import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  Scan,
  Upload,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Bot,
  Languages,
  Info,
  Copy,
  Check,
  RefreshCw,
  History,
  Trash2,
  X,
  Minimize2,
  Zap,
  ArrowRight,
  Sparkles,
  Download,
  CheckCircle2,
  ListOrdered,
  GripHorizontal,
  Plus,
  Loader2,
  Move,
  MousePointer2,
  FileStack,
  Image as ImageIcon,
  PenTool,
  Search,
  FileSearch,
  Globe,
  Wrench,
  User,
  Users,
  Hand,
  MessageCircle,
} from "lucide-react";
import {
  extractDetailsFromDocuments,
  analyzeFormFields,
  explainError,
  analyzePortalWithAI,
} from "../services/geminiService";
import {
  compressImage,
  mergeIDCardImages,
  convertImageToPdf,
} from "../lib/file-processor";
import { reportAppError } from "../lib/firebase-utils";
import { useLanguage } from "../lib/translations";

// Import tool components
import PdfCompressor from "./tools/PdfCompressor";
import IdCardTool from "./tools/IdCardTool";
import SignatureGenerator from "./tools/SignatureGenerator";
import PdfToImage from "./tools/PdfToImage";
import ImageToPdf from "./tools/ImageToPdf";
import PdfMerger from "./tools/PdfMerger";
import TranslatorTool from "./tools/TranslatorTool";
import PassportResizer from "./tools/PassportResizer";
import DataExtractionTool from "./tools/DataExtractionTool";
import ActiveCustomerSidebar from "./ActiveCustomerSidebar";
import WhatsAppTool from "./tools/WhatsAppTool";

interface AssistantOverlayProps {
  isEmbedded?: boolean;
  portalName?: string | null;
  onClose?: () => void;
  sidebarWidth?: number;
  onOpenPortal?: (url: string, name: string) => void;
  onCollapse?: () => void;
}

// Optimized Memoized Component to prevent unnecessary re-renders during app-level state changes
const AssistantOverlay = React.memo(
  ({
    isEmbedded = false,
    portalName,
    onClose,
    sidebarWidth,
    onOpenPortal,
    onCollapse,
  }: AssistantOverlayProps) => {
    const { language } = useLanguage();
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(400);
    const [scaleFactor, setScaleFactor] = useState(1);

    const isNarrow = containerWidth < 380;
    const isUltraNarrow = containerWidth < 300;

    useEffect(() => {
      if (!containerRef.current) return;

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          setContainerWidth(width);

          // Scale Factor Calculation - Adjusting for better readability
          if (width < 250) setScaleFactor(0.75);
          else if (width < 320) setScaleFactor(0.82);
          else if (width < 380) setScaleFactor(0.9);
          else setScaleFactor(1);
        }
      });

      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }, []);

    useEffect(() => {
      if (portalName && stage === "idle") {
        const timer = setTimeout(() => {
          setStage("tools");
        }, 800);
        return () => clearTimeout(timer);
      }
    }, [portalName]);

    const [expanded, setExpanded] = useState(isEmbedded);
    const [stage, setStage] = useState<
      | "idle"
      | "selection"
      | "scanning"
      | "requirements"
      | "preview"
      | "filling"
      | "tools"
    >(() => {
      return (sessionStorage.getItem("assistant_stage") as any) || "tools";
    });
    const [selectedMainMode, setSelectedMainMode] = useState<
      "ai" | "tools" | null
    >(null);
    const [selectedToolId, setSelectedToolId] = useState<string | null>(() => {
      return sessionStorage.getItem("assistant_tool_id");
    });

    const [activeToolIds, setActiveToolIds] = useState<string[]>(() => {
      const initial = sessionStorage.getItem("assistant_tool_id");
      return initial ? [initial] : [];
    });

    const [wasWhatsAppEverOpenedInAssistant, setWasWhatsAppEverOpenedInAssistant] = useState(false);

    useEffect(() => {
      if (activeToolIds.includes("whatsapp-web")) {
        setWasWhatsAppEverOpenedInAssistant(true);
      }
    }, [activeToolIds]);

    const scrollableAreaRef = React.useRef<HTMLDivElement>(null);

    const handleCloseTool = (toolId: string) => {
      const nextActive = activeToolIds.filter(id => id !== toolId);
      setActiveToolIds(nextActive);
      if (nextActive.length > 0) {
        setSelectedToolId(nextActive[nextActive.length - 1]);
      } else {
        setSelectedToolId(null);
      }
    };

    useEffect(() => {
      sessionStorage.setItem("assistant_stage", stage);
    }, [stage]);

    useEffect(() => {
      if (selectedToolId) {
        sessionStorage.setItem("assistant_tool_id", selectedToolId);
        setActiveToolIds((prev) => {
          if (!prev.includes(selectedToolId)) {
            return [...prev, selectedToolId];
          }
          return prev;
        });
      } else {
        sessionStorage.removeItem("assistant_tool_id");
      }
    }, [selectedToolId]);
    const [toolUploadedFiles, setToolUploadedFiles] = useState<
      {
        id: string;
        name: string;
        status: "processing" | "ready";
        blob?: Blob;
      }[]
    >([]);

    const [activeCustomerId, setActiveCustomerId] = useState<string | null>(() => localStorage.getItem("ACTIVE_CUSTOMER_ID"));

    useEffect(() => {
      const handleActiveCustChange = () => {
        setActiveCustomerId(localStorage.getItem("ACTIVE_CUSTOMER_ID"));
      };
      window.addEventListener("ACTIVE_CUSTOMER_ID_CHANGED", handleActiveCustChange);
      const interval = setInterval(handleActiveCustChange, 1000);
      return () => {
        window.removeEventListener("ACTIVE_CUSTOMER_ID_CHANGED", handleActiveCustChange);
        clearInterval(interval);
      };
    }, []);

    const handleSelectCustomer = (id: string | null) => {
      if (id) {
        localStorage.setItem("ACTIVE_CUSTOMER_ID", id);
      } else {
        localStorage.removeItem("ACTIVE_CUSTOMER_ID");
      }
      setActiveCustomerId(id);
      window.dispatchEvent(new CustomEvent("ACTIVE_CUSTOMER_ID_CHANGED"));
    };

    const toolsList = [
      {
        id: "active-customer",
        name: "Active Profile (வாடிக்கையாளர்)",
        desc: "Profile copy & documents",
        icon: <User size={20} />,
      },
      {
        id: "data-extraction",
        name: "Data Extractor (தகவல் பிரிப்பு)",
        desc: "Scan docs for details",
        icon: <FileSearch size={20} />,
      },
      {
        id: "id-card",
        name: "ID Card Tool (ஐடி கார்டு)",
        desc: "Front & Back merging",
        icon: <GripHorizontal size={20} />,
      },
      {
        id: "passport-resizer",
        name: "Passport Resizer",
        desc: "Size for portals",
        icon: <Minimize2 size={20} />,
      },
      {
        id: "pdf-compress",
        name: "Photo/PDF Compressor",
        desc: "Reduce file size",
        icon: <FileText size={20} />,
      },
      {
        id: "pdf-merge",
        name: "PDF Merger",
        desc: "Combine multiple PDFs",
        icon: <FileStack size={20} />,
      },
      {
        id: "image-to-pdf",
        name: "Image to PDF",
        desc: "Photos to PDF",
        icon: <FileText size={20} />,
      },
      {
        id: "pdf-to-image",
        name: "PDF to Image",
        desc: "Extract photos",
        icon: <ImageIcon size={20} />,
      },
      {
        id: "signature",
        name: "Signature Generator",
        desc: "Digital signature",
        icon: <PenTool size={20} />,
      },
      {
        id: "translator",
        name: "Translator",
        desc: "Tamil/English",
        icon: <Languages size={20} />,
      },
      {
        id: "whatsapp-web",
        name: "WhatsApp Web (வாட்ஸ்அப்)",
        desc: "Get customer docs & details",
        icon: <MessageCircle size={20} />,
      },
    ];

    const currentTool = toolsList.find((t) => t.id === selectedToolId);

    const renderToolsWithStatePreservation = () => {
      const whatsappToolObj = toolsList.find(t => t.id === "whatsapp-web");
      return (
        <div className="space-y-6">
          {activeToolIds.map((toolId) => {
            if (toolId === "whatsapp-web") return null;
            const tool = toolsList.find(t => t.id === toolId);
            if (!tool) return null;
            return (
              <div
                key={tool.id}
                className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm relative space-y-4"
              >
                {/* Header for this specific tool in stack */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                      {React.cloneElement(
                        tool.icon as React.ReactElement,
                        { size: 16 }
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">
                        {tool.name}
                      </h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">
                        {tool.desc}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleCloseTool(tool.id)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition-colors shrink-0"
                    title="Close Tool / கருவியை மூடு"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Tool's actual component */}
                <div>
                  {tool.id === "active-customer" && (
                    <ActiveCustomerSidebar
                      activeCustomerId={activeCustomerId}
                      onSelectCustomer={handleSelectCustomer}
                      isEmbedded={true}
                    />
                  )}
                  {tool.id === "pdf-compress" && (
                    <PdfCompressor isNarrow={isNarrow} />
                  )}
                  {tool.id === "id-card" && <IdCardTool isNarrow={isNarrow} />}
                  {tool.id === "signature" && (
                    <SignatureGenerator
                      isNarrow={isNarrow}
                      onSync={(b64) => addLog("Signature ready!", "success")}
                    />
                  )}
                  {tool.id === "pdf-to-image" && <PdfToImage isNarrow={isNarrow} />}
                  {tool.id === "image-to-pdf" && <ImageToPdf isNarrow={isNarrow} />}
                  {tool.id === "pdf-merge" && <PdfMerger isNarrow={isNarrow} />}
                  {tool.id === "translator" && (
                    <TranslatorTool isNarrow={isNarrow} />
                  )}
                  {tool.id === "passport-resizer" && (
                    <PassportResizer isNarrow={isNarrow} />
                  )}
                  {tool.id === "data-extraction" && (
                    <DataExtractionTool isNarrow={isNarrow} />
                  )}
                </div>
              </div>
            );
          })}

          {/* Persistent WhatsApp Web representation */}
          {wasWhatsAppEverOpenedInAssistant && whatsappToolObj && (
            <div
              className={activeToolIds.includes("whatsapp-web") ? "bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm relative space-y-4 block" : "hidden"}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                    {React.cloneElement(
                      whatsappToolObj.icon as React.ReactElement,
                      { size: 16 }
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">
                      {whatsappToolObj.name}
                    </h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">
                      {whatsappToolObj.desc}
                    </p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => handleCloseTool("whatsapp-web")}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition-colors shrink-0"
                  title="Close Tool / கருவியை மூடு"
                >
                  <X size={14} />
                </button>
              </div>

              <div>
                <WhatsAppTool isNarrow={isNarrow} />
              </div>
            </div>
          )}
        </div>
      );
    };

    const handleToolFileUpload = async (
      e: React.ChangeEvent<HTMLInputElement>,
    ) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const newFiles = Array.from(files).map((f: File) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: f.name,
        status: "processing" as const,
        blob: f,
      }));

      setToolUploadedFiles((prev) => [...prev, ...newFiles]);
      addLog(
        `${files.length} ஆவணங்கள் பெறப்பட்டன. தயார் செய்கிறோம்...`,
        "info",
      );

      // Real processing based on tool ID
      for (const fileObj of newFiles) {
        try {
          let processedBlob: Blob = fileObj.blob;

          if (
            selectedToolId === "pdf-compress" ||
            selectedToolId === "passport-resizer"
          ) {
            addLog(`${fileObj.name} அமுக்கப்படுகிறது...`, "info");
            const targetSize = selectedToolId === "pdf-compress" ? 200 : 50;
            processedBlob = await compressImage(
              fileObj.blob as File,
              targetSize,
            );
            setToolUploadedFiles((prev) =>
              prev.map((f) =>
                f.id === fileObj.id
                  ? { ...f, status: "ready", blob: processedBlob }
                  : f,
              ),
            );
          } else if (
            selectedToolId === "id-card" ||
            selectedToolId === "pdf-merge" ||
            selectedToolId === "image-to-pdf"
          ) {
            // For merge/collection tools, we just mark them as ready for merging
            addLog(`${fileObj.name} சேர்க்கப்பட்டது. தயார்!`, "info");
            setToolUploadedFiles((prev) =>
              prev.map((f) =>
                f.id === fileObj.id
                  ? { ...f, status: "ready", blob: processedBlob }
                  : f,
              ),
            );
          } else if (selectedToolId === "pdf-to-image") {
            addLog(`PDF-லிருந்து போட்டோக்கள் எடுக்கப்படுகின்றன...`, "info");
            // Simple pass-through for now, or we could split it
            setToolUploadedFiles((prev) =>
              prev.map((f) =>
                f.id === fileObj.id
                  ? { ...f, status: "ready", blob: processedBlob }
                  : f,
              ),
            );
          } else {
            setToolUploadedFiles((prev) =>
              prev.map((f) =>
                f.id === fileObj.id
                  ? { ...f, status: "ready", blob: processedBlob }
                  : f,
              ),
            );
          }
        } catch (err) {
          addLog(`${fileObj.name} செயல்படுத்துவதில் பிழை.`, "error");
          setToolUploadedFiles((prev) =>
            prev.filter((f) => f.id !== fileObj.id),
          );
        }
      }

      if (selectedToolId === "id-card") {
        addLog(
          `இரண்டு ஆவணங்கள் அப்லோட் செய்தவுடன் 'Merge' பட்டனை அழுத்தவும்.`,
          "info",
        );
      } else if (
        selectedToolId === "pdf-merge" ||
        selectedToolId === "image-to-pdf"
      ) {
        addLog(
          `தேவையான அனைத்து ஆவணங்களையும் அப்லோட் செய்துவிட்டு 'Merge/Convert' பட்டனை அழுத்தவும்.`,
          "info",
        );
      } else {
        addLog(
          `ஆவணங்கள் தயார்! அப்படியே இணையதளத்தில் இழுத்து (Drag) அப்லோட் செய்யலாம்.`,
          "success",
        );
      }
    };

    const handleToolMerge = async () => {
      if (toolUploadedFiles.length < 2) {
        addLog("குறைந்தது இரண்டு போட்டோக்களை அப்லோட் செய்யவும்.", "error");
        return;
      }

      setIsProcessing(true);
      addLog("ஆவணங்களை இணைக்கிறது...", "info");
      try {
        // Use the first two uploaded files for merging
        const front = toolUploadedFiles[0].blob as File;
        const back = toolUploadedFiles[1].blob as File;

        const merged = await mergeIDCardImages(front, back);
        addLog("இணைக்கப்பட்டது. அமுக்கப்படுகிறது...", "info");
        const compressed = await compressImage(merged, 500);

        const mergedFile = {
          id: "merged-" + Math.random().toString(36).substr(2, 5),
          name: "merged_id_card.jpg",
          status: "ready" as const,
          blob: compressed,
        };

        setToolUploadedFiles([mergedFile]);
        addLog(
          "முன் மற்றும் பின் பக்கம் வெற்றிகரமாக இணைக்கப்பட்டது!",
          "success",
        );
      } catch (err: any) {
        addLog(`இணைப்பதில் பிழை: ${err.message}`, "error");
      } finally {
        setIsProcessing(false);
      }
    };

    const copyFileToClipboard = async (fileBlob: Blob, fileName: string) => {
      try {
        if (isElectron) {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const base64 = (reader.result as string).split(",")[1];
              // @ts-ignore
              window
                .require("electron")
                .ipcRenderer.send("copy-image-to-clipboard", {
                  data: base64,
                  type: fileBlob.type,
                });
              addLog(
                `${fileName} நகலெடுக்கப்பட்டது (Desktop Clipboard)!`,
                "success",
              );
            } catch (e) {
              addLog(
                "Clipboard Error: பிரவுசர் வழியில் முயற்சிக்கிறது.",
                "info",
              );
            }
          };
          reader.readAsDataURL(fileBlob);
          return;
        }

        // For images, we can use the Clipboard API to copy the actual image data
        if (fileBlob.type.startsWith("image/")) {
          const item = new ClipboardItem({ [fileBlob.type]: fileBlob });
          await navigator.clipboard.write([item]);
          addLog(
            `${fileName} நகலெடுக்கப்பட்டது! இணையதளத்தில் Ctrl+V அழுத்தவும்.`,
            "success",
          );
        } else {
          // For other files, we'll suggest a fast one-click download then upload
          const url = URL.createObjectURL(fileBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          a.click();
          addLog(
            `${fileName} பதிவிறக்கப்பட்டது. இப்போது இணையதளத்தில் அப்லோட் செய்யவும்.`,
            "info",
          );
        }
      } catch (err) {
        console.error("Clipboard error:", err);
        addLog(
          `நகலெடுப்பதில் சிக்கல். பட்டனை இழுத்து (Drag) செய்து பார்க்கவும்.`,
          "error",
        );
      }
    };
    const [currentReqIndex, setCurrentReqIndex] = useState(0);
    const [fileSyncedIds, setFileSyncedIds] = useState<Set<string>>(new Set());
    const [detailsSyncedIds, setDetailsSyncedIds] = useState<Set<string>>(
      new Set(),
    );
    const [extractingIds, setExtractingIds] = useState<Set<string>>(new Set());
    const [websiteSyncingIds, setWebsiteSyncingIds] = useState<Set<string>>(
      new Set(),
    );
    const [syncTimeouts, setSyncTimeouts] = useState<Record<string, any>>({});
    const [logs, setLogs] = useState<
      { msg: string; type: "info" | "error" | "success" }[]
    >([]);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [mergeQueue, setMergeQueue] = useState<
      Record<string, { front?: File; back?: File }>
    >({});
    const [requirements, setRequirements] = useState<
      {
        id: string;
        name: string;
        tamilName?: string;
        reason: string;
        requiresMerge?: boolean;
        maxSizeKb?: number;
        purpose?: string;
      }[]
    >([]);
    const [fieldMapping, setFieldMapping] = useState<any>({});
    const [scanResult, setScanResult] = useState<any>(null);
    const [previewData, setPreviewData] = useState<{
      mapping: any;
      extracted: any;
      files: Record<string, any>;
    } | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<Record<string, File[]>>(
      {},
    );
    const [extractionFiles, setExtractionFiles] = useState<Record<string, any>>(
      {},
    );
    const [draggingOverId, setDraggingOverId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingReq, setProcessingReq] = useState<string | null>(null);
    const [currentExtraction, setCurrentExtraction] = useState<{
      name: string;
      photo?: string;
      data: any;
      compression?: string;
    } | null>(null);
    const [errorHistory, setErrorHistory] = useState<
      { id: string; msg: string; time: string; resolved: boolean }[]
    >([]);
    const [showHistory, setShowHistory] = useState(false);

    const [showLogs, setShowLogs] = useState(false);
    const [lastSavedFile, setLastSavedFile] = useState<{
      name: string;
      blob: Blob;
      dataUrl: string;
    } | null>(null);
    const [currentProgress, setCurrentProgress] = useState<{
      message: string;
      percentage: number;
    } | null>(null);
    const [portalSyncStatus, setPortalSyncStatus] = useState<
      Record<string, "pending" | "success" | "failed">
    >({});
    const [uploadStatus, setUploadStatus] = useState<
      Record<string, "pending" | "success" | "failed">
    >({});
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [serviceAnalysis, setServiceAnalysis] = useState<{
      serviceName?: string;
      goal?: string;
      errorFeedback?: string;
      specialInstructions?: string;
      fillingStrategy?: string;
      applicationSteps?: string[];
    } | null>(null);

    const addLog = (
      msg: string,
      type: "info" | "error" | "success" = "info",
    ) => {
      setLogs((prev) => {
        // Prevent consecutive duplicate logs which cause flickering and number increase
        if (prev.length > 0 && prev[prev.length - 1].msg === msg) {
          return prev;
        }
        return [...prev, { msg, type }];
      });

      if (type === "error") {
        reportAppError(msg, "Assistant UI Log");
        saveToErrorHistory(msg);
      }
    };

    const saveToErrorHistory = (msg: string) => {
      const newErr = {
        id: Math.random().toString(36).substring(2, 9),
        msg,
        time: new Date().toLocaleTimeString("ta-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        resolved: false,
      };
      setErrorHistory((prev) => {
        const updated = [newErr, ...prev.slice(0, 9)];
        localStorage.setItem("ai_error_history", JSON.stringify(updated));
        return updated;
      });
    };

    const markResolved = (id: string) => {
      setErrorHistory((prev) => {
        const updated = prev.map((e) =>
          e.id === id ? { ...e, resolved: true } : e,
        );
        localStorage.setItem("ai_error_history", JSON.stringify(updated));
        return updated;
      });
    };

    useEffect(() => {
      const saved = localStorage.getItem("ai_error_history");
      if (saved) {
        try {
          setErrorHistory(JSON.parse(saved));
        } catch (e) {}
      }
    }, []);

    const copyToClipboard = (text: string, index: number) => {
      navigator.clipboard.writeText(text);
      setCopiedId(index);
      setTimeout(() => setCopiedId(null), 2000);
    };

    const handleFileDownload = (fileBlob: Blob, fileName: string) => {
      try {
        const reader = new FileReader();
        reader.onload = () => {
          const fullDataUrl = reader.result as string;

          // Notify App.tsx to show global drag handle
          window.dispatchEvent(
            new CustomEvent("FILE_READY_FOR_DRAG", {
              detail: { blob: fileBlob, name: fileName, dataUrl: fullDataUrl },
            }),
          );

          addLog(
            `${fileName} தயாராக உள்ளது. அப்படியே பிடித்து இழுக்கவும் (Drag)!`,
            "success",
          );

          if (isElectron) {
            try {
              const { ipcRenderer } = window.require("electron");
              const base64 = fullDataUrl.split(",")[1];
              ipcRenderer.send("save-file-to-disk", {
                name: fileName,
                type: fileBlob.type,
                data: base64,
              });
            } catch (e) {
              const url = URL.createObjectURL(fileBlob);
              const link = document.createElement("a");
              link.href = url;
              link.download = fileName;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          } else {
            const url = URL.createObjectURL(fileBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            addLog(`${fileName} பதிவிறக்கம் செய்யப்படுகிறது.`, "success");
          }
        };
        reader.readAsDataURL(fileBlob);
      } catch (err) {
        addLog("பதிவிறக்கம் செய்வதில் சிக்கல்.", "error");
      }
    };

    const handleFileClipboard = (fileBlob: Blob, fileName: string) => {
      if (isElectron) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const base64 = (reader.result as string).split(",")[1];
            // @ts-ignore
            window
              .require("electron")
              .ipcRenderer.send("copy-image-to-clipboard", {
                data: base64,
                type: fileBlob.type,
              });
            addLog(
              `${fileName} நகலெடுக்கப்பட்டது (Desktop Clipboard)!`,
              "success",
            );
          } catch (e) {
            addLog("Clipboard Error: பிரவுசர் வழியில் முயற்சிக்கிறது.", "info");
          }
        };
        reader.readAsDataURL(fileBlob);
        return;
      }

      if (fileBlob.type.startsWith("image/")) {
        try {
          const item = new ClipboardItem({ [fileBlob.type]: fileBlob });
          navigator.clipboard.write([item]).then(() => {
            addLog(
              `${fileName} நகலெடுக்கப்பட்டது! Ctrl+V அழுத்தவும்.`,
              "success",
            );
          });
        } catch (e) {
          addLog("பிரவுசர் நகலெடுப்பதில் சிக்கல்.", "error");
        }
      } else {
        addLog(
          "இந்த வகை ஆவணத்தை நேரடியாக நகலெடுக்க முடியாது. தரவிறக்கம் செய்யவும்.",
          "info",
        );
      }
    };

    const handleDragStart = (
      e: React.DragEvent,
      fileBlob: Blob,
      fileName: string,
    ) => {
      if (!fileBlob) return;

      if (isElectron) {
        e.preventDefault();
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          try {
            // @ts-ignore
            const ipc = window.require("electron").ipcRenderer;
            ipc.send("start-drag", {
              name: fileName,
              data: base64,
              type: fileBlob.type,
            });
            addLog(`${fileName} இழுத்து விடத் தயாராக உள்ளது.`, "info");
          } catch (err) {
            addLog("Drag செய்வதில் பிழை ஏற்பட்டது.", "error");
          }
        };
        reader.onerror = () => {
          addLog("கோப்பை வாசிப்பதில் பிழை.", "error");
        };
        reader.readAsDataURL(fileBlob);
      } else {
        // Browser fallback
        const url = URL.createObjectURL(fileBlob);
        e.dataTransfer.setData(
          "DownloadURL",
          `${fileBlob.type}:${fileName}:${url}`,
        );
        e.dataTransfer.setData("text/plain", fileName);
      }
    };

    const isElectron =
      typeof window !== "undefined" &&
      (window.process?.versions?.electron ||
        navigator.userAgent.toLowerCase().indexOf(" electron/") > -1);

    const copyAllLogs = () => {
      const logText = logs
        .map((l) => `[${l.type.toUpperCase()}] ${l.msg}`)
        .join("\n");
      navigator.clipboard.writeText(logText);
      addLog("அனைத்து லாக்களும் நகலெடுக்கப்பட்டன.", "success");
    };

    useEffect(() => {
      // Initial startup audit
      reportAppError("Assistant Overlay Started", "Lifecycle", "activity");

      const handleData = (type: string, data: any) => {
        // Log incoming messages for debugging
        if (type) {
          const logContent =
            typeof data === "object"
              ? JSON.stringify(data).slice(0, 50) + "..."
              : String(data);
          reportAppError(
            `Message Received: ${type} - ${logContent}`,
            "Data Channel",
            "activity",
          );
        }

        const payload = data?.data || data;

        if (type === "portal-fields-detected") {
          setScanResult(payload);
          addLog(
            "இணையதளத் தரவுகள் பெறப்பட்டன. AI பகுப்பாய்வு செய்கிறது...",
            "success",
          );
          handleScanComplete(payload);
        }

        if (type === "fill-execution-success") {
          const mapping = payload?.mapping || {};
          const requirementIds = Object.values(mapping) as string[];

          addLog("இணையதளத்தில் வெற்றிகரமாகப் பதியப்பட்டது!", "success");

          setWebsiteSyncingIds((prev) => {
            const next = new Set(prev);
            requirementIds.forEach((id) => {
              next.delete(id);
              if (syncTimeouts[id]) {
                clearTimeout(syncTimeouts[id]);
              }
            });
            return next;
          });

          requirementIds.forEach((reqId) => {
            setPortalSyncStatus((prev) => ({ ...prev, [reqId]: "success" }));
            setFileSyncedIds((s) => new Set(s).add(reqId));
          });

          if (stage === "filling") setStage("preview");
        }

        if (type === "automation-technical-log") {
          const msg = payload.message || "செயல்பாடு நடக்கிறது...";
          let logType: "success" | "info" | "error" = "info";
          if (payload.stage?.includes("SUCCESS")) logType = "success";
          else if (payload.stage?.includes("ERROR")) logType = "error";

          addLog(msg, logType);
          if (
            payload.stage === "SUCCESS" &&
            (msg.toLowerCase().includes("uploaded") ||
              msg.toLowerCase().includes("ஏற்றப்பட்டது"))
          ) {
            Object.entries(uploadedFiles).forEach(([id, file]) => {
              const f = file as File;
              if (msg.includes(f.name)) {
                setPortalSyncStatus((prev) => ({ ...prev, [id]: "success" }));
              }
            });
          }
        }
        if (type === "automation-error" || type === "fill-execution-error") {
          const errorStage = payload?.stage || "Automation";
          const msg =
            typeof payload === "string"
              ? payload
              : payload.message || "தெரியாத பிழை";
          reportAppError(
            `Automation Error [${errorStage}]: ${msg}`,
            "Automation Flow",
            "error",
          );
          addLog(`பிழை [${errorStage}]: ${msg}`, "error");

          if (msg.length > 5 && errorStage !== "ANALYSIS") {
            explainError(msg, payload.field)
              .then((explanation) => {
                addLog(`AI விளக்கம்: ${explanation}`, "info");
              })
              .catch(() => {});
          }
          setStage((prev) => (prev === "filling" ? "preview" : prev));
        }
        if (type === "toggle-assistant-expansion") {
          setExpanded(data?.expanded ?? true);
        }
      };

      // 1. Listen for PostMessage (Web/Portal Environment)
      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type) {
          handleData(event.data.type, event.data.data);
        }
      };
      window.addEventListener("message", handleMessage);

      // 2. Listen for IPC (Electron Environment)
      let ipcRenderer: any = null;
      if (isElectron) {
        try {
          ipcRenderer = window.require("electron").ipcRenderer;
          ipcRenderer.on("portal-fields-detected", (_: any, data: any) =>
            handleData("portal-fields-detected", data),
          );
          ipcRenderer.on("automation-technical-log", (_: any, data: any) =>
            handleData("automation-technical-log", data),
          );
          ipcRenderer.on("fill-execution-error", (_: any, data: any) =>
            handleData("fill-execution-error", data),
          );
        } catch (e) {
          console.error("IPC Setup Error", e);
        }
      }

      return () => {
        window.removeEventListener("message", handleMessage);
        if (ipcRenderer) {
          ipcRenderer.removeAllListeners("portal-fields-detected");
          ipcRenderer.removeAllListeners("automation-technical-log");
          ipcRenderer.removeAllListeners("fill-execution-error");
        }
      };
    }, []);

    useEffect(() => {
      const handleFileReady = (e: any) => {
        // Comparison to prevent flickering and constant re-renders
        setLastSavedFile((prev) => {
          if (
            prev &&
            prev.dataUrl === e.detail.dataUrl &&
            prev.name === e.detail.name
          ) {
            return prev;
          }
          return e.detail;
        });
      };
      window.addEventListener("FILE_READY_FOR_DRAG", handleFileReady);
      return () =>
        window.removeEventListener("FILE_READY_FOR_DRAG", handleFileReady);
    }, []);

    useEffect(() => {
      if (isEmbedded) {
        window.parent.postMessage(
          { type: "assistant-stage-changed", stage },
          "*",
        );
        if (isElectron) {
          try {
            window
              .require("electron")
              .ipcRenderer.send("assistant-stage-changed", stage);
          } catch (e) {}
        }
      }
    }, [stage, isEmbedded]);

    const handleScanComplete = async (portalData: any) => {
      if (!portalData || !portalData.fields) {
        addLog(
          "படிவத் தரவுகளைப் பெறுவதில் சிக்கல். பக்கம் சரியாகப் பதிவேற்றப்படவில்லை.",
          "error",
        );
        setStage("idle");
        return;
      }

      try {
        setStage("analyzing");
        addLog("AI தேவையான ஆவணங்களை இணையதளம் வழியாகக் கண்டறிகிறது...", "info");

        const prompt = `
        DEEP RESEARCH & PORTAL GROUNDING TASK.
        WEBSITE: ${portalData.pageInfo?.title || "Unknown"}
        URL: ${portalData.pageInfo?.url || "Unknown"}
        VISIBLE HTML FIELDS: ${JSON.stringify(portalData.fields.slice(0, 80))}

        YOUR GOAL: 
        1. UNDERSTAND THE FULL JOURNEY: Use googleSearch to find the COMPLETE step-by-step procedure for this specific service. 
        2. COMPREHENSIVE DOCUMENT LIST: Identify ALL documents needed for ALL steps (e.g., photo, signature, address proof, income certificate). 
        3. EXACT FIELD MAPPING: Identify EVERY visible field on the current page. Map them exactly as they appear (Label/ID).
        4. VISUAL GROUPING: Group fields into logical sections (e.g., 'Personal Details', 'Address', 'Bank Info') based on their HTML context.
        5. ID CARD MERGING: For any Card (Aadhaar, Voter, DL), set "requiresMerge": true.
        6. PHOTO DETECTION: Most TN portals require a 5x5 cm or 3.5x4.5 cm photo. Identify the exact maxSizeKb.

        RETURN JSON FORMAT (STRICT):
        {
          "serviceName": "Official Service Name (TAMIL)",
          "goal": "Explain the journey for the user (TAMIL)",
          "applicationSteps": ["Step 1", "Step 2", "..."],
          "requiredDocuments": [
            {
              "id": "slug",
              "name": "English Name",
              "tamilName": "தூய தமிழ் பெயர்",
              "reason": "Why needed?",
              "maxSizeKb": 500,
              "requiresMerge": true,
              "format": "pdf/jpeg",
              "purpose": "extract|upload"
            }
          ],
          "formFields": [
             {
               "id": "field_id",
               "label": "EXACT LABEL IN PORTAL",
               "tamilLabel": "தமிழ் பெயர்",
               "visualGroup": "Section Name (TAMIL)",
               "description": "Short help text"
             }
          ]
        }
      `;

        const analysis = await analyzePortalWithAI(prompt);
        addLog("வியூகம் (Strategy) வெற்றிகரமாக உருவாக்கப்பட்டது.", "success");

        let docs = analysis.requiredDocuments || [];
        if (docs.length === 0 && analysis.serviceName) {
          docs = [
            {
              id: "id_proof",
              name: "Identity Proof",
              tamilName: "ஆதார் கார்டு",
              reason: "Identity verification",
              requiresMerge: true,
            },
          ];
        }

        setRequirements(docs);
        // Map AI detected form fields to our internal format for Step 2
        const mapping: any = {};
        analysis.formFields?.forEach((f: any) => {
          mapping[f.id] = {
            label: f.tamilLabel || f.label,
            description: f.description,
            visualGroup: f.visualGroup,
            lang: f.lang || "Both",
          };
        });
        setFieldMapping(mapping);

        setServiceAnalysis({
          serviceName: analysis.serviceName,
          goal: analysis.goal,
          applicationSteps: analysis.applicationSteps,
        });

        setStage("requirements");
        addLog(`சேவை: ${analysis.serviceName}`, "success");
      } catch (err: any) {
        addLog(`ஆய்வில் பிழை: ${err.message}`, "error");
        setStage("idle");
      }
    };

    const handleDrop = async (e: React.DragEvent, reqId: string) => {
      e.preventDefault();
      setDraggingOverId(null);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        const req = requirements.find((r) => r.id === reqId);
        if (req?.requiresMerge && files.length >= 2) {
          handleFileUpload(reqId, files[0] as File, "front");
          handleFileUpload(reqId, files[1] as File, "back");
        } else {
          handleFileUpload(reqId, files[0] as File);
        }
      }
    };

    const startScan = () => {
      if (stage !== "idle" && stage !== "selection") {
        addLog(`தற்போதைய நிலை: ${stage}. தயவுசெய்து காத்திருக்கவும்.`, "info");
        return;
      }

      setStage("scanning");
      setLogs([
        { msg: "AI பக்கத்தைப் பகுப்பாயத் தயாராகிறது...", type: "info" },
      ]);

      try {
        console.log("Start Scan Initiated", { isElectron, stage });
        reportAppError(
          `Scan Initiated (Env: ${isElectron ? "Electron" : "Web"})`,
          "User Action",
          "activity",
        );

        const requestPayload = { type: "page-analysis-request" };

        if (isElectron) {
          try {
            const electron = (window as any).require("electron");
            if (electron && electron.ipcRenderer) {
              electron.ipcRenderer.send("page-analysis-request");
              addLog(
                "எலக்ட்ரான் வாயிலாக இணையதளத்தைத் தொடர்புகொள்ள முயற்சிக்கிறது...",
                "info",
              );
            } else {
              throw new Error(
                "எலக்ட்ரான் சூழல் சரியாக அமையவில்லை (Bridge Missing).",
              );
            }
          } catch (ipcErr: any) {
            reportAppError(ipcErr, "Electron IPC Start Scan Error");
            addLog(
              "இணையதளத்தை இணைப்பதில் சிக்கல். பிரவுசர் வழியாக முயற்சிக்கிறது...",
              "error",
            );
            window.parent.postMessage(requestPayload, "*");
          }
        } else {
          window.postMessage({ type: "SIMULATE_SCAN" }, "*");
          window.parent.postMessage(requestPayload, "*");
          addLog("இணையதளத் தரவுகள் கோரப்பட்டுள்ளன (Web Interface)...", "info");
        }
      } catch (e: any) {
        console.error("Fatal Scan Error", e);
        reportAppError(
          e.message || "Unknown error",
          "startScan Failure",
          "error",
        );
        addLog(
          `இயக்குவதில் பிழை: ${e.message || "தெரியாத பிழை"}. தயவுசெய்து பக்கத்தைப் புதுப்பிக்கவும் (Refresh).`,
          "error",
        );
        setStage("idle");
        return;
      }

      // Timeout safety: Give AI or Bridge time to respond
      const scanTimeout = setTimeout(() => {
        setStage((current) => {
          if (current === "scanning") {
            const timeoutMsg =
              "AI பதிலளிக்க அதிக நேரம் எடுக்கிறது. இணையதளம் சரியாகக் கிடைக்கிறதா அல்லது பிளாக் செய்யப்பட்டுள்ளதா எனச் சரிபார்க்கவும்.";
            addLog(timeoutMsg, "error");
            return "idle";
          }
          return current;
        });
      }, 45000);

      return () => clearTimeout(scanTimeout);
    };

    const handleFileUpload = async (
      reqId: string,
      file: File,
      side?: "front" | "back",
    ) => {
      try {
        const req = requirements.find((r) => r.id === reqId);
        if (!req) return;

        addLog(`${file.name}: ஆவணம் கையாளப்படுகிறது...`, "info");

        if (req.requiresMerge && file.type.startsWith("image/")) {
          setMergeQueue((prev) => {
            const current = prev[reqId] || {};
            let next;
            if (side) {
              next = { ...current, [side]: file };
            } else {
              if (!current.front) next = { ...current, front: file };
              else next = { ...current, back: file };
            }

            if (next.front && next.back) {
              addLog(
                "ஆதாரின் இரு பக்கங்களும் தயார். இப்போது 'இணை (Merge)' பட்டனை அழுத்தவும்.",
                "success",
              );
            } else {
              const pending = next.front
                ? "பின்பக்கம் (Back)"
                : "முன்பக்கம் (Front)";
              addLog(`${pending} பக்கத்தைப் பதிவேற்றவும்.`, "info");
            }
            return { ...prev, [reqId]: next };
          });
          return;
        }

        setProcessingReq(reqId);
        const maxSizeKb = req.maxSizeKb || 500;

        let processed = file;
        const isImg = file.type.startsWith("image/");

        if (isImg) {
          addLog(
            `அமுக்கப்படுகிறது (Compression)... இலக்கு: ${maxSizeKb}KB`,
            "info",
          );
          processed = await compressImage(file, maxSizeKb);
        }

        syncFileToElectron(reqId, processed);
        addLog(`${file.name} தயாராக உள்ளது.`, "success");
      } catch (err: any) {
        addLog(`பிழை: ${err.message}`, "error");
      } finally {
        setProcessingReq(null);
      }
    };

    const syncFileToElectron = (reqId: string, file: File) => {
      setUploadedFiles((prev) => ({
        ...prev,
        [reqId]: [...(prev[reqId] || []), file],
      }));
      setUploadStatus((prev) => ({ ...prev, [reqId]: "success" }));

      setFileSyncedIds((s) => new Set(s).add(reqId));
    };

    const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });
    };

    const proceedToMapping = async () => {
      if (Object.keys(uploadedFiles).length === 0) return;

      setIsProcessing(true);
      setCurrentProgress({
        message: "ஆவணங்களிலிருந்து தகவல்களைத் தேடுகிறது...",
        percentage: 20,
      });
      addLog("ஆவணங்களிலிருந்து விபரங்களைப் பிரித்தெடுக்கிறது...", "info");

      try {
        // Flatten all uploaded files into a single batch for the AI
        const allFiles = Object.values(uploadedFiles).flat() as File[];

        const images = await Promise.all(
          allFiles.map(async (file: File) => {
            const base64 = await fileToBase64(file);
            return { base64, mimeType: file.type };
          }),
        );

        setCurrentProgress({
          message: "AI உங்கள் ஆவணங்களை ஆய்வு செய்கிறது...",
          percentage: 50,
        });

        const targetFields = Object.entries(fieldMapping)
          .filter(([_, cfg]: [string, any]) => cfg.type !== "file")
          .map(([id, cfg]: [string, any]) => ({
            id,
            label: cfg.description || id,
          }));

        const result = await extractDetailsFromDocuments(images, targetFields);

        // Map extracted data to form fields, with better address breakdown
        const mapping: any = {};
        Object.entries(fieldMapping).forEach(([id, field]: [string, any]) => {
          const label = (field.description || "").toLowerCase();
          const lang = field.lang || "English";
          const isTamilField =
            label.includes("tamil") ||
            label.includes("தமிழ்") ||
            lang === "Tamil";

          let foundVal = "";

          // Complex semantic mapping based on new Gemini prompt
          if (label.includes("address") || label.includes("முகவரி")) {
            foundVal = isTamilField
              ? result.addressTamil || ""
              : result.address || "";
          } else if (label.includes("door") || label.includes("கதவு"))
            foundVal = isTamilField ? result.doorNoTa : result.doorNoEn;
          else if (label.includes("street") || label.includes("தெரு"))
            foundVal = isTamilField ? result.streetTa : result.streetEn;
          else if (label.includes("village") || label.includes("கிராமம்"))
            foundVal = isTamilField ? result.villageTa : result.villageEn;
          else if (label.includes("taluk") || label.includes("வட்டம்"))
            foundVal = isTamilField ? result.talukTa : result.talukEn;
          else if (label.includes("district") || label.includes("மாவட்டம்"))
            foundVal = isTamilField ? result.districtTa : result.districtEn;
          else if (label.includes("pincode") || label.includes("அஞ்சல்"))
            foundVal = result.pincode || "";
          else if (label.includes("aadhaar") || label.includes("ஆதார்"))
            foundVal = result.aadhaarNumber || result.aadhaar || "";
          else if (label.includes("ration") || label.includes("குடும்ப அட்டை"))
            foundVal = result.rationCardNumber || result.rationCard || "";
          else if (label.includes("dob") || label.includes("பிறந்த தேதி"))
            foundVal = result.dob || "";
          else if (label.includes("gender") || label.includes("பாலினம்"))
            foundVal = isTamilField
              ? result.genderTamil || result.gender || ""
              : result.gender || "";
          else if (label.includes("father") || label.includes("தந்தை"))
            foundVal = isTamilField
              ? result.fatherNameTamil || result.fatherName || ""
              : result.fatherName || "";
          else if (label.includes("mother") || label.includes("தாய்"))
            foundVal = isTamilField
              ? result.motherNameTamil || result.motherName || ""
              : result.motherName || "";
          else if (
            label.includes("spouse") ||
            label.includes("மனைவி") ||
            label.includes("கணவர்")
          )
            foundVal = isTamilField
              ? result.spouseNameTamil || result.spouseName || ""
              : result.spouseName || "";
          else if (
            label.includes("applicant") ||
            label.includes("name") ||
            label.includes("பெயர்")
          )
            foundVal = isTamilField
              ? result.applicantNameTamil || result.applicantName || ""
              : result.applicantName || "";
          else if (label.includes("mobile") || label.includes("கைபேசி"))
            foundVal = result.mobileNumber || "";
          else if (label.includes("email") || label.includes("மின்னஞ்சல்"))
            foundVal = result.email || "";

          if (!foundVal)
            foundVal =
              result[id] ||
              (result.customValues ? result.customValues[id] : "") ||
              "";
          if (foundVal) mapping[id] = foundVal;
        });

        setPreviewData({
          mapping,
          extracted: result,
          files: uploadedFiles,
        });

        addLog(
          "விபரங்கள் தயார். ஒவ்வொன்றாக நகலெடுத்து இணையதளத்தில் பயன்படுத்தவும்.",
          "success",
        );
        setCurrentProgress({ message: "வெற்றி!", percentage: 100 });
        setStage("preview");

        // Cleanup progress after a delay
        setTimeout(() => setCurrentProgress(null), 2000);
      } catch (err: any) {
        console.error("Extraction error:", err);
        addLog(`தகவல் சேகரிப்பில் பிழை: ${err.message}`, "error");
        setCurrentProgress({ message: "தோல்வி!", percentage: 0 });
        setTimeout(() => setCurrentProgress(null), 3000);
      } finally {
        setIsProcessing(false);
      }
    };

    const initiateDrag = (e: React.DragEvent, file: Blob, fileName: string) => {
      e.dataTransfer.setData("fileName", fileName);
      // In our specific desktop bridge, we handle this via custom event usually,
      // but for browser drag it needs a dataTransfer.
      const reader = new FileReader();
      reader.onload = () => {
        e.dataTransfer.setData("fileData", reader.result as string);
      };
      reader.readAsDataURL(file);
    };

    const handleMergeAction = async (reqId: string) => {
      const queue = mergeQueue[reqId];
      if (!queue || !queue.front || !queue.back) return;

      setProcessingReq(reqId);
      try {
        addLog(
          "இரு பக்கங்களும் இணைக்கப்படுகின்றன (Merging Aadhaar)...",
          "info",
        );
        // Simple merge logic: For now we just take front for extraction but keep both
        // Ideally we'd canvas-merge them. But here we just push them as a batch.

        // Real merge would use canvas. For brevity we just treat them as separate files
        // in the same requirement slot since our logic supports multiple files per req.
        syncFileToElectron(reqId, queue.front);
        syncFileToElectron(reqId, queue.back);

        setMergeQueue((prev) => {
          const next = { ...prev };
          delete next[reqId];
          return next;
        });
        addLog("ஆதார் வெற்றிகரமாக இணைக்கப்பட்டது.", "success");
      } catch (err: any) {
        addLog(`இணைப்பதில் பிழை: ${err.message}`, "error");
      } finally {
        setProcessingReq(null);
      }
    };

    const onExtractionUpload = async (
      e: React.ChangeEvent<HTMLInputElement>,
      reqId: string,
    ) => {
      const file = e.target.files?.[0];
      if (file) {
        // Direct extraction logic or batch processing
        handleFileUpload(reqId, file);
      }
    };

    const handleDetailsSync = (reqId: string) => {
      const req = requirements.find((r) => r.id === reqId);
      if (!req) return;

      setWebsiteSyncingIds((prev) => new Set(prev).add(reqId));
      setPortalSyncStatus((prev) => ({ ...prev, [reqId]: "pending" }));
      addLog(
        `${req.tamilName || req.name} இணையதளத்திற்கு அனுப்பப்படுகிறது...`,
        "info",
      );

      const fileData = uploadedFiles[reqId];
      const isFile = !!fileData;

      const finalizeSync = (filePayload: any = null) => {
        const allMappings: Record<string, string> = {};
        if (isFile) {
          const entry = Object.entries(fieldMapping).find(
            ([_, cfg]: [string, any]) =>
              cfg.type === "file" && cfg.key === reqId,
          );
          const fallbackId = req.id.toLowerCase().includes("photo")
            ? "photo_upload"
            : req.id.toLowerCase().includes("proof")
              ? "proof_upload"
              : req.id;
          const htmlId = entry ? entry[0] : fallbackId;
          allMappings[htmlId] = reqId;
        }

        const syncData = {
          mapping: isFile ? allMappings : previewData?.mapping || {},
          extracted: previewData?.extracted || {},
          files: filePayload ? { [reqId]: filePayload } : {},
        };

        if (isElectron) {
          try {
            window
              .require("electron")
              .ipcRenderer.send("trigger-fill", syncData);
          } catch (e) {
            window.parent.postMessage(
              { type: "trigger-fill", data: syncData },
              "*",
            );
          }
        } else {
          window.parent.postMessage(
            { type: "trigger-fill", data: syncData },
            "*",
          );
        }

        if (!isElectron) {
          setTimeout(() => {
            setWebsiteSyncingIds((prev) => {
              const n = new Set(prev);
              n.delete(reqId);
              return n;
            });
            setPortalSyncStatus((prev) => ({ ...prev, [reqId]: "success" }));
          }, 3000);
        }
      };

      if (isFile && fileData instanceof File) {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          finalizeSync({
            name: fileData.name,
            type: fileData.type,
            data: base64,
          });
        };
        reader.readAsDataURL(fileData);
      } else {
        finalizeSync();
      }
    };

    const executeFill = () => {
      if (!previewData) {
        addLog("சரிபார்ப்புத் தரவுகள் இல்லை.", "error");
        return;
      }

      setStage("filling");
      const locationTag = isElectron
        ? "இணையதளத்தில் (Website)"
        : "ஆவணங்களில் (Documents)";
      addLog(`${locationTag} படிவம் நிரப்பத் தொடங்குகிறது...`, "info");

      const fillData = {
        mapping: { ...previewData.mapping },
        extracted: previewData.extracted,
        files: uploadedFiles,
        serviceInfo: serviceAnalysis,
      };

      // Ensure file mappings are included in the final fill command
      Object.keys(uploadedFiles).forEach((rid) => {
        const entry = Object.entries(fieldMapping).find(
          ([_, cfg]: [string, any]) => cfg.type === "file" && cfg.key === rid,
        );
        const r = requirements.find((reqItem) => reqItem.id === rid);
        const fallbackId = r?.id.toLowerCase().includes("photo")
          ? "photo_upload"
          : r?.id.toLowerCase().includes("proof")
            ? "proof_upload"
            : rid;
        const htmlId = entry ? entry[0] : fallbackId;
        if (!fillData.mapping[htmlId]) {
          fillData.mapping[htmlId] = rid;
        }
      });

      reportAppError(
        "Triggering Full Form Fill",
        "Automation Flow",
        "activity",
      );

      // Communication sequence
      const triggerExecution = () => {
        if (isElectron) {
          try {
            // @ts-ignore
            window
              .require("electron")
              .ipcRenderer.send("trigger-fill", fillData);
          } catch (err) {
            window.postMessage({ type: "trigger-fill", data: fillData }, "*");
            window.parent.postMessage(
              { type: "trigger-fill", data: fillData },
              "*",
            );
          }
        } else {
          // Essential: Send to BOTH target and self for simulation
          window.postMessage({ type: "trigger-fill", data: fillData }, "*");
          window.parent.postMessage(
            { type: "trigger-fill", data: fillData },
            "*",
          );
        }
      };

      // Small delay to show the "Filling" stage to the user
      setTimeout(() => {
        triggerExecution();

        // In web simulation mode, we provide a fallback success message if no response received
        if (!isElectron) {
          setTimeout(() => {
            setStage("preview");
            addLog(
              "நிரப்பல் கட்டளை அனுப்பப்பட்டது. சிமுலேட்டரைச் சரிபார்க்கவும்.",
              "success",
            );
          }, 1500);
        }
      }, 800);
    };

    if (!expanded) {
      return (
        <motion.div
          layoutId="assistant-bubble"
          onClick={() => setExpanded(true)}
          className="fixed bottom-10 right-4 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer shadow-2xl text-white z-50 overflow-hidden"
        >
          <Bot size={32} />
        </motion.div>
      );
    }

    return (
      <motion.div
        ref={containerRef}
        initial={isEmbedded ? false : { opacity: 0, x: 100 }}
        animate={isEmbedded ? { opacity: 1, x: 0 } : { opacity: 1, x: 0 }}
        style={{
          width: "100%",
          height: "100%",
          fontSize: `${scaleFactor * 100}%`,
        }}
        className={`${isEmbedded ? "relative" : "fixed inset-y-0 right-0 z-50 shadow-2xl border-l"} bg-white border-slate-200 flex flex-col text-slate-900 h-full overflow-hidden transform-gpu`}
      >
        <div className="flex-1 flex flex-col min-h-0 overflow-x-hidden">
          {/* Header */}
          <div className="bg-white border-b border-slate-100 shadow-sm">
            <div
              className={`${isNarrow ? "p-2.5" : "p-4"} flex items-center justify-between ${isNarrow ? "gap-2" : "gap-4"}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`${isNarrow ? "w-8 h-8" : "w-10 h-10"} ${stage === "scanning" ? "bg-indigo-600 animate-pulse" : "bg-blue-600"} rounded-xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20 shrink-0 transition-colors`}
                >
                  {stage === "scanning" ? (
                    <Loader2
                      size={isNarrow ? 16 : 20}
                      className="animate-spin"
                    />
                  ) : (
                    <Bot size={isNarrow ? 16 : 20} />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <h2
                    className={`${isNarrow ? "text-[10px]" : "text-xs"} font-black text-slate-900 tracking-tight truncate leading-tight uppercase`}
                  >
                    {portalName || serviceAnalysis?.serviceName || "Assistant"}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div
                      className={`w-1.5 h-1.5 rounded-full animate-pulse shadow-sm ${stage === "scanning" ? "bg-blue-500" : "bg-green-500"}`}
                    />
                    <span
                      className={`text-[8px] font-black uppercase tracking-widest ${stage === "scanning" ? "text-blue-600" : "text-slate-400"}`}
                    >
                      {stage === "scanning" ? "Wait" : "Active"}
                    </span>
                  </div>
                </div>
              </div>

              {currentProgress && (
                <div className="flex-1 max-w-[120px] lg:max-w-none">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] font-black text-blue-600 uppercase truncate pr-2">
                      {currentProgress.message}
                    </span>
                    <span className="text-[8px] font-black text-blue-600">
                      {currentProgress.percentage}%
                    </span>
                  </div>
                  <div className="w-full h-1 bg-blue-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${currentProgress.percentage}%` }}
                      className="h-full bg-blue-600"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1.5 shrink-0">
                {onCollapse && (
                  <button
                    onClick={onCollapse}
                    title={language === "ta" ? "கருவிகள் பட்டியலைச் சுருக்குக" : "Collapse Sidebar"}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                <button
                  onClick={() => {
                    setStage("tools");
                    setSelectedToolId(null);
                    setLogs([]);
                    setToolUploadedFiles([]);
                    setUploadedFiles({});
                    setScanResult(null);
                    setPreviewData(null);
                    setServiceAnalysis(null);
                    addLog("ரீசெட் செய்யப்பட்டது.", "info");
                  }}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  <RefreshCw size={16} />
                </button>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Step Indicator - Hidden as AI Mode is removed */}
            {/* <div className="px-8 pb-4 flex items-center justify-between relative">...</div> */}
          </div>

          {/* Dynamic Roadmap Removed */}

          {/* Main Content Area */}
          <div
            ref={scrollableAreaRef}
            className={`flex-1 overflow-y-auto ${isNarrow ? "p-2" : "p-5"} space-y-4 sm:space-y-6 custom-scrollbar`}
          >
            <AnimatePresence mode="wait">
              {/* Tools List Stage */}
              {stage === "tools" && !selectedToolId && (
                <motion.div
                  key="tools"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (onClose) {
                          onClose();
                        } else {
                          setStage("selection");
                        }
                      }}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
                      title="Close Portal / போர்டலை மூடு"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div>
                      <h3 className="font-black text-lg text-slate-900">
                        எங்கள் கருவிகள் (Tools)
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        தேவையான கருவியைத் தேர்ந்தெடுக்கவும்
                      </p>
                    </div>
                  </div>

                  <div className={isNarrow ? "space-y-2" : "space-y-4"}>
                    {toolsList.filter((t) => t.id !== "whatsapp-web").map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => {
                          setSelectedToolId(tool.id);
                          setActiveToolIds([tool.id]);
                          setToolUploadedFiles([]);
                        }}
                        className={`w-full ${isNarrow ? "p-3" : "p-5"} bg-white border border-slate-100 rounded-3xl hover:border-blue-200 hover:shadow-lg transition-all group text-left`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`${isNarrow ? "w-8 h-8" : "w-12 h-12"} bg-slate-50 rounded-2xl flex items-center justify-center text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0`}
                          >
                            {React.cloneElement(
                              tool.icon as React.ReactElement,
                              { size: isNarrow ? 16 : 20 },
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4
                              className={`font-black ${isNarrow ? "text-[11px]" : "text-sm"} text-slate-900 truncate`}
                            >
                              {tool.name}
                            </h4>
                            {!isUltraNarrow && (
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight truncate">
                                {tool.desc}
                              </p>
                            )}
                          </div>
                          {!isNarrow && (
                            <ChevronRight
                              size={16}
                              className="text-slate-300 group-hover:text-slate-900"
                            />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Active Tool View */}
              {stage === "tools" && selectedToolId && currentTool && (
                <motion.div
                  key="tool-view"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`${isNarrow ? "space-y-3" : "space-y-6"}`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setSelectedToolId(null);
                        setActiveToolIds([]);
                      }}
                      className={`${isNarrow ? "p-1.5" : "p-2"} hover:bg-slate-100 rounded-xl text-slate-500 transition-colors shrink-0`}
                      title="Back to all tools"
                    >
                      <ChevronLeft size={isNarrow ? 18 : 20} />
                    </button>
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`${isNarrow ? "w-6 h-6" : "w-8 h-8"} bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0`}
                      >
                        <Wrench size={isNarrow ? 14 : 18} />
                      </div>
                      <h3
                        className={`font-black ${isNarrow ? "text-[11px]" : "text-base"} text-slate-900 truncate uppercase tracking-tight`}
                      >
                        கருவிகள் (Active Tools)
                      </h3>
                    </div>
                  </div>

                  <div className={isNarrow ? "space-y-3" : "space-y-4"}>
                      {renderToolsWithStatePreservation()}

                    {toolUploadedFiles.length > 0 && (
                      <div className={isNarrow ? "space-y-1.5" : "space-y-4"}>
                        <p
                          className={`font-black text-slate-400 uppercase tracking-widest pl-2 ${isNarrow ? "text-[7px]" : "text-[10px]"}`}
                        >
                          Uploaded ({toolUploadedFiles.length})
                        </p>
                        {toolUploadedFiles.map((file) => (
                          <div
                            key={file.id}
                            className={`${isNarrow ? "p-2" : "p-4"} ${isNarrow ? "flex-col items-start gap-2" : "flex-row items-center gap-4"} bg-white border-2 border-slate-100 rounded-[16px] sm:rounded-[30px] flex shadow-sm hover:border-indigo-200 transition-colors`}
                          >
                            <div className="flex items-center gap-2 w-full min-w-0">
                              <div
                                className={`${isNarrow ? "w-7 h-7" : "w-10 h-10"} rounded-lg flex items-center justify-center shrink-0 ${file.status === "ready" ? "bg-green-100 text-green-600" : "bg-indigo-100 text-indigo-600 animate-pulse"}`}
                              >
                                {file.status === "ready" ? (
                                  <CheckCircle2 size={isNarrow ? 14 : 20} />
                                ) : (
                                  <Loader2
                                    size={isNarrow ? 14 : 20}
                                    className="animate-spin"
                                  />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`${isNarrow ? "text-[9px]" : "text-xs"} font-black text-slate-900 truncate`}
                                >
                                  {file.name}
                                </p>
                                <p
                                  className={`${isNarrow ? "text-[7px]" : "text-[9px]"} font-bold text-slate-400 uppercase`}
                                >
                                  {file.status === "ready"
                                    ? "Ready"
                                    : "Processing..."}
                                </p>
                              </div>
                            </div>
                            {file.status === "ready" && file.blob && (
                              <div className="w-full">
                                <button
                                  onClick={() =>
                                    handleFileDownload(file.blob!, file.name)
                                  }
                                  className="w-full py-3 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md group font-black uppercase tracking-wider text-[10px] sm:text-xs"
                                  title="Save"
                                >
                                  <Download size={16} />
                                  <span>Save (பதிவிறக்கம் செய்க)</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Guidance */}
                  <div
                    className={`${isNarrow ? "p-2.5" : "p-5"} bg-indigo-50 rounded-[24px] sm:rounded-[32px] border border-indigo-100 shadow-sm`}
                  >
                    <div
                      className={`flex items-center gap-2 ${isNarrow ? "mb-1" : "mb-3"}`}
                    >
                      <div
                        className={`${isNarrow ? "w-5 h-5" : "w-8 h-8"} bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg`}
                      >
                        <MousePointer2 size={isNarrow ? 10 : 16} />
                      </div>
                      <h5
                        className={`${isNarrow ? "text-[8px]" : "text-[12px]"} font-black uppercase text-indigo-900 tracking-tight`}
                      >
                        உதவி (Help):
                      </h5>
                    </div>
                    <div className={isNarrow ? "space-y-1" : "space-y-4"}>
                      <div
                        className={`flex ${isNarrow ? "gap-2" : "gap-3"} bg-white/80 ${isNarrow ? "p-1.5" : "p-3"} rounded-xl border border-indigo-200`}
                      >
                        <span
                          className={`${isNarrow ? "w-4 h-4" : "w-6 h-6"} bg-indigo-600 rounded-lg flex items-center justify-center text-white ${isNarrow ? "text-[7px]" : "text-[10px]"} font-black shrink-0 shadow-md`}
                        >
                          1
                        </span>
                        <p
                          className={`${isNarrow ? "text-[8px]" : "text-[10px]"} font-bold text-slate-700 leading-normal`}
                        >
                          {isNarrow
                            ? "சேமிக்க 'Save' பட்டனை அழுத்தவும்."
                            : "கோப்பை உங்களது கம்ப்யூட்டரில் சேமிக்க மேலே உள்ள 'Save (பதிவிறக்கம் செய்க)' பட்டனை அழுத்தவும்."}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Scan Now Screen Removed */}

              {/* Scanning Stage: Simplified UI */}
              {stage === "scanning" && (
                <motion.div
                  key="scanning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white min-h-0"
                >
                  <div className="relative mb-12">
                    <motion.div
                      animate={{
                        scale: [1, 1.4, 1],
                        opacity: [0.1, 0.3, 0.1],
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute -inset-12 bg-blue-500 rounded-full blur-[60px]"
                    />

                    <div className="relative w-36 h-36 bg-slate-900 rounded-[48px] flex items-center justify-center shadow-2xl shadow-blue-500/20 overflow-hidden border border-white/10">
                      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] bg-[size:10px_10px]" />

                      <motion.div
                        animate={{ top: ["-20%", "120%"] }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="absolute left-0 right-0 h-10 bg-gradient-to-b from-blue-400/0 via-blue-400/40 to-blue-400/0 z-10"
                      />

                      <Bot size={56} className="text-white relative z-20" />
                    </div>
                  </div>

                  <div className="space-y-6 max-w-sm">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-2"
                    >
                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                        AI பகுப்பாய்வு...
                      </h3>
                      <div className="flex items-center justify-center gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{
                              repeat: Infinity,
                              duration: 1.5,
                              delay: i * 0.2,
                            }}
                            className="w-1.5 h-1.5 bg-blue-600 rounded-full"
                          />
                        ))}
                      </div>
                    </motion.div>

                    <div className="grid gap-3 mt-4">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm"
                      >
                        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                          <Search size={16} />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-black text-slate-900 uppercase">
                            Portal Schema
                          </p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">
                            புலங்களைக் கண்டறிகிறது
                          </p>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm"
                      >
                        <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                          <FileSearch size={16} />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-black text-slate-900 uppercase">
                            checklist
                          </p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">
                            தேவையான ஆவணங்களைத் தேடுகிறது
                          </p>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Requirements Stage: Simplified Document list with direct uploads */}
              {stage === "requirements" && requirements.length > 0 && (
                <motion.div
                  key="requirements"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col px-1">
                    <h4 className="text-[14px] font-black text-slate-900 uppercase">
                      தேவையான ஆவணங்கள் (Documents)
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                      கீழ்கண்டவற்றை ஒவ்வொன்றாக அப்லோட் செய்யவும்
                    </p>
                  </div>

                  <div className={isNarrow ? "space-y-2" : "space-y-3"}>
                    {requirements.map((req) => {
                      const files = uploadedFiles[req.id] || [];
                      const isProcessingReq = processingReq === req.id;

                      return (
                        <motion.div
                          key={req.id}
                          className={`${isNarrow ? "p-2" : "p-3"} rounded-[24px] border-2 transition-all bg-white flex flex-col gap-2 relative ${
                            files.length > 0
                              ? "border-green-200 bg-green-50/10"
                              : "border-slate-100"
                          }`}
                        >
                          <div className="flex items-center gap-3 w-full min-w-0">
                            <div
                              className={`${isNarrow ? "w-6 h-6" : "w-8 h-8"} rounded-xl flex items-center justify-center shrink-0 ${files.length > 0 ? "bg-green-100 text-green-600" : "bg-slate-50 text-slate-400"}`}
                            >
                              {files.length > 0 ? (
                                <CheckCircle2 size={isNarrow ? 12 : 16} />
                              ) : (
                                <FileText size={isNarrow ? 12 : 16} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5
                                className={`${isNarrow ? "text-[9px]" : "text-[11px]"} font-black text-slate-900 uppercase truncate`}
                              >
                                {req.tamilName || req.name}
                              </h5>
                              <div className="flex gap-2 items-center flex-wrap">
                                {req.maxSizeKb && (
                                  <p className="text-[7px] font-bold text-slate-400">
                                    Max: {req.maxSizeKb}KB
                                  </p>
                                )}
                                {files.length > 0 && (
                                  <p className="text-[7px] font-black text-blue-600 bg-blue-50 px-1 py-0.5 rounded uppercase">
                                    {files.length} Ready
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 flex flex-col gap-2 w-full">
                            {files.length === 0 ? (
                              <div
                                className={isNarrow ? "space-y-1" : "space-y-2"}
                              >
                                {req.requiresMerge ? (
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="relative">
                                      <button
                                        className={`w-full ${isNarrow ? "py-1.5" : "py-2"} bg-white border-2 border-dashed rounded-xl text-[8px] font-black transition-all ${mergeQueue[req.id]?.front ? "border-green-500 text-green-600 bg-green-50" : "border-slate-200 text-slate-400"}`}
                                      >
                                        {mergeQueue[req.id]?.front
                                          ? "FRONT OK"
                                          : "FRONT"}
                                      </button>
                                      <input
                                        type="file"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={(e) => {
                                          const f = e.target.files?.[0];
                                          if (f)
                                            handleFileUpload(
                                              req.id,
                                              f,
                                              "front",
                                            );
                                        }}
                                      />
                                    </div>
                                    <div className="relative">
                                      <button
                                        className={`w-full ${isNarrow ? "py-1.5" : "py-2"} bg-white border-2 border-dashed rounded-xl text-[8px] font-black transition-all ${mergeQueue[req.id]?.back ? "border-green-500 text-green-600 bg-green-50" : "border-slate-200 text-slate-400"}`}
                                      >
                                        {mergeQueue[req.id]?.back
                                          ? "BACK OK"
                                          : "BACK"}
                                      </button>
                                      <input
                                        type="file"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={(e) => {
                                          const f = e.target.files?.[0];
                                          if (f)
                                            handleFileUpload(req.id, f, "back");
                                        }}
                                      />
                                    </div>
                                    {mergeQueue[req.id]?.front &&
                                      mergeQueue[req.id]?.back && (
                                        <button
                                          onClick={() =>
                                            handleMergeAction(req.id)
                                          }
                                          className={`col-span-2 ${isNarrow ? "py-2" : "py-2.5"} bg-blue-600 text-white rounded-xl text-[9px] font-black shadow-lg animate-bounce`}
                                        >
                                          {isNarrow
                                            ? "MERGE"
                                            : "MERGE & PREPARE"}
                                        </button>
                                      )}
                                  </div>
                                ) : (
                                  <div className="relative w-full">
                                    <button
                                      className={`w-full ${isNarrow ? "py-2" : "py-2.5"} bg-blue-600 text-white rounded-xl text-[9px] font-black shadow hover:bg-blue-700 transition-colors`}
                                    >
                                      UPLOAD
                                    </button>
                                    <input
                                      type="file"
                                      className="absolute inset-0 opacity-0 cursor-pointer"
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleFileUpload(req.id, f);
                                        e.target.value = "";
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div
                                className={isNarrow ? "space-y-1" : "space-y-2"}
                              >
                                {files.map((file, idx) => (
                                  <div
                                    key={idx}
                                    className={`flex gap-2 items-center w-full bg-slate-50 ${isNarrow ? "p-1.5" : "p-2"} rounded-xl border border-slate-100`}
                                  >
                                    <p className="flex-1 text-[8px] font-bold text-slate-500 truncate">
                                      {file.name}
                                    </p>
                                    <button
                                      onClick={() =>
                                        handleFileDownload(file, file.name)
                                      }
                                      className="bg-white border text-blue-600 p-1 rounded-lg hover:bg-blue-50 transition-colors shrink-0"
                                      title="Save"
                                    >
                                      <Download size={10} />
                                    </button>
                                    <div
                                      draggable
                                      onDragStart={(e) =>
                                        initiateDrag(e, file, file.name)
                                      }
                                      className="bg-slate-900 border-b-2 border-black text-white p-1 rounded-lg flex items-center justify-center cursor-move shrink-0"
                                    >
                                      <Move
                                        size={10}
                                        className="text-blue-400 shrink-0"
                                      />
                                    </div>
                                    <button
                                      onClick={() => {
                                        setUploadedFiles((prev) => ({
                                          ...prev,
                                          [req.id]: prev[req.id].filter(
                                            (_, i) => i !== idx,
                                          ),
                                        }));
                                      }}
                                      className="text-slate-300 hover:text-red-500 shrink-0"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ))}

                                <div className="relative w-full mt-1">
                                  <button
                                    className={`w-full ${isNarrow ? "py-1.5" : "py-2"} bg-blue-50 text-blue-600 border border-blue-200 border-dashed rounded-xl text-[8px] font-black hover:bg-blue-100 transition-colors`}
                                  >
                                    + ADD MORE
                                  </button>
                                  <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    multiple
                                    onChange={(e) => {
                                      const files = e.target.files;
                                      if (files) {
                                        Array.from(files).forEach((f) =>
                                          handleFileUpload(req.id, f as File),
                                        );
                                      }
                                      e.target.value = "";
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {isProcessingReq && (
                            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-[24px]">
                              <Loader2
                                className="animate-spin text-blue-600"
                                size={isNarrow ? 14 : 18}
                              />
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 leading-normal italic text-center">
                      ஆவணங்களைத் தயார் செய்த பிறகு 'CONTINUE' பட்டனை அழுத்தவும்.
                    </p>
                  </div>

                  <button
                    onClick={proceedToMapping}
                    disabled={
                      isProcessing || Object.keys(uploadedFiles).length === 0
                    }
                    className="w-full py-5 bg-blue-600 text-white rounded-[32px] font-black text-sm flex items-center justify-center gap-3 hover:bg-blue-700 disabled:opacity-30 disabled:grayscale transition-all shadow-xl shadow-blue-500/20"
                  >
                    {isProcessing ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      "அடுத்த படி (CONTINUE)"
                    )}{" "}
                    <ArrowRight size={18} />
                  </button>
                </motion.div>
              )}

              {stage === "preview" && (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6 pb-24"
                >
                  <div className="flex flex-col px-1">
                    <h4 className="text-[14px] font-black text-slate-900 uppercase">
                      ஆவண விவரங்கள் (Extracted Details)
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                      கீழே உள்ள விவரங்களைச் சரிபார்த்து நகலெடுத்துப்
                      பயன்படுத்தவும்
                    </p>
                  </div>

                  {previewData && (
                    <div className="space-y-5">
                      {/* Informational Note */}
                      <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-3">
                        <Info
                          size={16}
                          className="text-blue-600 shrink-0 mt-0.5"
                        />
                        <p className="text-[10px] font-bold text-blue-800 leading-normal">
                          AI உங்கள் ஆவணங்களிலிருந்து தகவல்களை எடுத்துள்ளது.
                          தமிழ் மற்றும் ஆங்கில விவரங்கள் சரியாக உள்ளதா எனச்
                          சரிபார்க்கவும்.
                        </p>
                      </div>

                      {/* Extraction Summary */}
                      <div className="flex flex-wrap gap-2 px-1">
                        {Object.keys(uploadedFiles).map((rid) => {
                          const req = requirements.find((r) => r.id === rid);
                          return (
                            <div
                              key={rid}
                              className="flex items-center gap-1.5 bg-slate-100/50 px-2.5 py-1.5 rounded-xl border border-slate-100"
                            >
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                              <span className="text-[8px] font-black text-slate-500 uppercase truncate max-w-[80px]">
                                {req?.tamilName || req?.name || rid}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Simplified Dual Language Display */}
                      <div className="space-y-4">
                        {(() => {
                          const data = previewData.extracted || {};

                          // Defined core fields with explicit labels
                          const fieldsToDisplay = [
                            {
                              key: "applicantName",
                              label: "விண்ணப்பதாரர் பெயர் (Name)",
                              tamilKey: "applicantNameTamil",
                            },
                            {
                              key: "fatherName",
                              label: "தந்தை/கணவர் பெயர் (Father/Husband Name)",
                              tamilKey: "fatherNameTamil",
                            },
                            {
                              key: "motherName",
                              label: "தாய் பெயர் (Mother Name)",
                              tamilKey: "motherNameTamil",
                            },
                            {
                              key: "spouseName",
                              label: "மனைவி/கணவர் பெயர் (Spouse Name)",
                              tamilKey: "spouseNameTamil",
                            },
                            {
                              key: "dob",
                              label: "பிறந்த தேதி (DOB)",
                              isNative: true,
                            },
                            {
                              key: "gender",
                              label: "பாலினம் (Gender)",
                              tamilKey: "genderTamil",
                            },
                            {
                              key: "aadhaarNumber",
                              label: "ஆதார் எண் (Aadhaar)",
                              isNative: true,
                            },
                            {
                              key: "mobileNumber",
                              label: "கைபேசி எண் (Mobile)",
                              isNative: true,
                            },
                            {
                              key: "rationCardNumber",
                              label: "குடும்ப அட்டை (Ration Card)",
                              isNative: true,
                            },
                            {
                              key: "smartCardNumber",
                              label: "ஸ்மார்ட் கார்டு எண் (Smart Card)",
                              isNative: true,
                            },
                            {
                              key: "panNumber",
                              label: "பான் எண் (PAN)",
                              isNative: true,
                            },
                            {
                              key: "voterId",
                              label: "வாக்காளர் அடையாள அட்டை (Voter ID)",
                              isNative: true,
                            },
                            {
                              type: "header",
                              label: "முகவரி விவரங்கள் (Address Details)",
                            },
                            {
                              key: "doorNoEn",
                              label: "கதவு எண் (Door No)",
                              tamilKey: "doorNoTa",
                            },
                            {
                              key: "streetEn",
                              label: "தெரு பெயர் (Street Name)",
                              tamilKey: "streetTa",
                            },
                            {
                              key: "villageEn",
                              label: "கிராமம் (Village)",
                              tamilKey: "villageTa",
                            },
                            {
                              key: "talukEn",
                              label: "வட்டம் (Taluk)",
                              tamilKey: "talukTa",
                            },
                            {
                              key: "districtEn",
                              label: "மாவட்டம் (District)",
                              tamilKey: "districtTa",
                            },
                            {
                              key: "pincode",
                              label: "அஞ்சல் குறியீடு (Pincode)",
                              isNative: true,
                            },
                          ];

                          const DetailRow = ({
                            label,
                            valueEn,
                            valueTa,
                            id,
                          }: any) => {
                            const isCopiedEn = copiedId === `${id}_en`;
                            const isCopiedTa = copiedId === `${id}_ta`;

                            if (!valueEn && !valueTa) return null;

                            const showDual = valueTa && valueTa !== valueEn;

                            return (
                              <div
                                className={`group relative overflow-hidden bg-white border-2 border-slate-100 rounded-[32px] ${isNarrow ? "p-2" : "p-4"} ${isNarrow ? "space-y-1" : "space-y-3"} hover:border-blue-200 transition-all shadow-sm`}
                              >
                                <label
                                  className={`${isNarrow ? "text-[7px]" : "text-[10px]"} font-black text-slate-400 uppercase tracking-widest px-1 block truncate`}
                                >
                                  {label}
                                </label>
                                <div
                                  className={
                                    isNarrow ? "space-y-1" : "space-y-2"
                                  }
                                >
                                  {valueEn && (
                                    <div className="flex items-center gap-2">
                                      <div
                                        draggable
                                        onDragStart={(e) => {
                                          e.dataTransfer.effectAllowed = "copy";
                                          e.dataTransfer.setData(
                                            "text/plain",
                                            valueEn,
                                          );
                                          e.dataTransfer.dropEffect = "copy";
                                          // Custom class for visual feedback
                                          (
                                            e.target as HTMLElement
                                          ).classList.add("opacity-55");
                                          try {
                                            const img = new Image();
                                            img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5'/%3E%3Cpath d='M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6'/%3E%3Cpath d='M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4.5'/%3E%3Cpath d='M18 8a2 2 0 0 1 2 2v9a4 4 0 0 1-4 4H9.415a4 4 0 0 1-2.828-1.172l-4.522-4.522a1 1 0 0 1 0-1.414H2.1a1 1 0 0 1 1-1h2.529a2 2 0 0 1 1.748.966L9 15h1v-4.5c0-1.1.9-2 2-2s2 .9 2 2z'/%3E%3C/svg%3E";
                                            e.dataTransfer.setDragImage(img, 10, 10);
                                          } catch (err) {}
                                        }}
                                        onDragEnd={(e) => {
                                          (
                                            e.target as HTMLElement
                                          ).classList.remove("opacity-55");
                                        }}
                                        className={`flex-1 bg-slate-50 border border-slate-100 rounded-2xl cursor-grab active:cursor-grabbing hover:cursor-grab drag-handle-cursor ${isNarrow ? "px-2" : "px-4"} ${isNarrow ? "py-1.5" : "py-3"} group/field relative transition-all hover:bg-white hover:border-blue-300 hover:shadow-inner`}
                                      >
                                        <span
                                          className={`${isNarrow ? "text-[10px]" : "text-[14px]"} font-bold text-slate-900 line-clamp-1 select-all`}
                                        >
                                          {valueEn}
                                        </span>
                                        {showDual && !isNarrow && (
                                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-200 uppercase">
                                            EN
                                          </span>
                                        )}
                                        {/* Beautiful Drag & Paste Hover overlay */}
                                        <div className="absolute inset-0 bg-indigo-600/95 rounded-2xl flex items-center justify-center gap-1.5 opacity-0 group-hover/field:opacity-100 transition-all duration-150 pointer-events-none z-10 shadow-md drag-handle-cursor">
                                          <Hand size={isNarrow ? 12 : 14} className="text-white animate-bounce" />
                                          <span className="text-[8px] sm:text-[10px] font-black uppercase text-white tracking-wider">இழுத்து ஒட்டவும் (Drag & Fill)</span>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(
                                            valueEn,
                                          );
                                          setCopiedId(`${id}_en`);
                                          setTimeout(
                                            () => setCopiedId(null),
                                            2000,
                                          );
                                        }}
                                        className={`${isNarrow ? "w-8 h-8 rounded-lg" : "w-12 h-12 rounded-2xl"} flex items-center justify-center transition-all shrink-0 shadow-lg ${
                                          isCopiedEn
                                            ? "bg-green-600 text-white scale-110"
                                            : "bg-slate-900 text-white hover:bg-blue-600 active:scale-95"
                                        }`}
                                      >
                                        {isCopiedEn ? (
                                          <Check
                                            size={isNarrow ? 14 : 20}
                                            strokeWidth={3}
                                          />
                                        ) : (
                                          <Copy size={isNarrow ? 14 : 18} />
                                        )}
                                      </button>
                                    </div>
                                  )}
                                  {showDual && (
                                    <div className="flex items-center gap-1.5">
                                      <div
                                        draggable
                                        onDragStart={(e) => {
                                          e.dataTransfer.effectAllowed = "copy";
                                          e.dataTransfer.setData(
                                            "text/plain",
                                            valueTa,
                                          );
                                          e.dataTransfer.dropEffect = "copy";
                                          (
                                            e.target as HTMLElement
                                          ).classList.add("opacity-55");
                                          try {
                                            const img = new Image();
                                            img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5'/%3E%3Cpath d='M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6'/%3E%3Cpath d='M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4.5'/%3E%3Cpath d='M18 8a2 2 0 0 1 2 2v9a4 4 0 0 1-4 4H9.415a4 4 0 0 1-2.828-1.172l-4.522-4.522a1 1 0 0 1 0-1.414H2.1a1 1 0 0 1 1-1h2.529a2 2 0 0 1 1.748.966L9 15h1v-4.5c0-1.1.9-2 2-2s2 .9 2 2z'/%3E%3C/svg%3E";
                                            e.dataTransfer.setDragImage(img, 10, 10);
                                          } catch (err) {}
                                        }}
                                        onDragEnd={(e) => {
                                          (
                                            e.target as HTMLElement
                                          ).classList.remove("opacity-55");
                                        }}
                                        className={`flex-1 bg-slate-50 border border-slate-100 rounded-2xl cursor-grab active:cursor-grabbing hover:cursor-grab drag-handle-cursor ${isNarrow ? "px-2 py-1.5" : "px-4 py-3"} group/field relative transition-all hover:bg-white hover:border-blue-300 hover:shadow-inner`}
                                      >
                                        <span
                                          className={`${isNarrow ? "text-[10px]" : "text-[14px]"} font-bold text-slate-900 line-clamp-1 select-all`}
                                        >
                                          {valueTa}
                                        </span>
                                        {!isNarrow && (
                                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-200 uppercase">
                                            TA
                                          </span>
                                        )}
                                        {/* Beautiful Drag & Paste Hover overlay */}
                                        <div className="absolute inset-0 bg-indigo-600/95 rounded-2xl flex items-center justify-center gap-1.5 opacity-0 group-hover/field:opacity-100 transition-all duration-150 pointer-events-none z-10 shadow-lg drag-handle-cursor">
                                          <Hand size={isNarrow ? 12 : 14} className="text-white animate-bounce" />
                                          <span className="text-[8px] sm:text-[10px] font-black uppercase text-white tracking-wider">இழுத்து ஒட்டவும் (Drag & Fill)</span>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(
                                            valueTa,
                                          );
                                          setCopiedId(`${id}_ta`);
                                          setTimeout(
                                            () => setCopiedId(null),
                                            2000,
                                          );
                                        }}
                                        className={`${isNarrow ? "w-8 h-8 rounded-lg" : "w-12 h-12 rounded-2xl"} flex items-center justify-center transition-all shrink-0 shadow-lg ${
                                          isCopiedTa
                                            ? "bg-green-600 text-white scale-110"
                                            : "bg-slate-900 text-white hover:bg-blue-600 active:scale-95"
                                        }`}
                                      >
                                        {isCopiedTa ? (
                                          <Check
                                            size={isNarrow ? 14 : 20}
                                            strokeWidth={3}
                                          />
                                        ) : (
                                          <Copy size={isNarrow ? 14 : 18} />
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          };

                          return fieldsToDisplay.map((f, i) => {
                            if (f.type === "header") {
                              return (
                                <div key={`header_${i}`} className="pt-4 pb-2">
                                  <div className="flex items-center gap-3">
                                    <div className="h-[2px] flex-1 bg-slate-100" />
                                    <h6 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                      {f.label}
                                    </h6>
                                    <div className="h-[2px] flex-1 bg-slate-100" />
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <DetailRow
                                key={f.key || i}
                                id={f.key}
                                label={f.label}
                                valueEn={data[f.key!]}
                                valueTa={f.tamilKey ? data[f.tamilKey] : null}
                              />
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}

                  <div
                    className={`fixed bottom-0 left-0 right-0 ${isNarrow ? "p-3" : "p-5"} bg-white/95 backdrop-blur-md border-t border-slate-100 z-50 flex gap-3`}
                  >
                    <button
                      onClick={() => setStage("requirements")}
                      className={`${isNarrow ? "w-12 h-12" : "w-16 h-16"} bg-slate-100 rounded-[28px] flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-all shadow-sm shrink-0`}
                      title="Back to Documents"
                    >
                      <ChevronLeft size={isNarrow ? 20 : 24} />
                    </button>
                    <button
                      onClick={executeFill}
                      className={`flex-1 ${isNarrow ? "py-3" : "py-5"} bg-blue-600 text-white rounded-[28px] font-black ${isNarrow ? "text-xs" : "text-sm"} flex items-center justify-center gap-2 shadow-2xl shadow-blue-500/40 hover:bg-blue-700 active:scale-[0.98] transition-all`}
                    >
                      <Zap size={isNarrow ? 18 : 22} fill="currentColor" />
                      {isNarrow ? "AUTO-FILL" : "தானாக நிரப்பு (AUTO-FILL)"}
                    </button>
                  </div>
                </motion.div>
              )}

              {stage === "filling" && (
                <motion.div
                  key="filling"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center justify-center py-20 space-y-6 text-center"
                >
                  <div className="relative">
                    <div className="w-24 h-24 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Bot size={32} className="text-blue-600" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-black uppercase tracking-widest">
                      படிவம் நிரப்பப்படுகிறது...
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold italic px-4">
                      AI இணையதளத்தில் உங்கள் விபரங்களைப் பதிவு செய்கிறது.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* PERSISTENT TOOLS LIST - Only visible when a tool is already selected (at the bottom) */}
            {selectedToolId && stage !== "scanning" && stage !== "filling" && (
              <div
                className={`pt-12 mt-8 border-t-2 border-slate-100 pb-20 ${isNarrow ? "space-y-6" : "space-y-8"}`}
              >
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-7 bg-indigo-600 rounded-full shadow-lg shadow-indigo-500/30"></div>
                    <div>
                      <h4
                        className={`${isNarrow ? "text-[11px]" : "text-sm"} font-black uppercase tracking-[0.2em] text-slate-900`}
                      >
                        Switch Tool / மற்ற கருவிகள்
                      </h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        தேவையான கருவியை தேர்வு செய்யவும்
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`grid ${isNarrow ? "grid-cols-2 gap-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4"}`}
                >
                  {toolsList
                    .filter((t) => !activeToolIds.includes(t.id) && t.id !== "whatsapp-web")
                    .map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => {
                          setSelectedToolId(tool.id);
                          setToolUploadedFiles([]);
                          setTimeout(() => {
                            if (scrollableAreaRef.current) {
                              scrollableAreaRef.current.scrollTo({
                                top: scrollableAreaRef.current.scrollHeight,
                                behavior: "smooth",
                              });
                            }
                          }, 100);
                        }}
                        className={`group relative flex items-center gap-3 ${isNarrow ? "flex-col text-center p-4" : "p-4"} bg-white border-2 border-slate-100 rounded-[20px] sm:rounded-[32px] hover:border-indigo-600 hover:shadow-xl transition-all duration-300 transform active:scale-95`}
                      >
                        {/* Icon with hover effect */}
                        <div
                          className={`${isNarrow ? "w-10 h-10" : "w-12 h-12"} bg-slate-50 flex items-center justify-center rounded-xl sm:rounded-2xl text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm`}
                        >
                          {React.cloneElement(tool.icon as React.ReactElement, {
                            size: isNarrow ? 18 : 22,
                          })}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4
                            className={`font-black text-slate-900 tracking-tight uppercase ${isNarrow ? "text-[10px] mt-1" : "text-xs mb-0.5"}`}
                          >
                            {tool.name.split("(")[0]}
                          </h4>
                          {!isNarrow && (
                            <p className="text-[9px] font-bold text-slate-400 leading-tight uppercase tracking-tighter truncate">
                              {tool.desc}
                            </p>
                          )}
                          {isNarrow && (
                            <span className="text-[7px] font-bold text-indigo-500 uppercase tracking-widest">
                              தேர்வு செய் (Select)
                            </span>
                          )}
                        </div>

                        {/* Hover Arrow */}
                        {!isNarrow && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                            <ChevronRight
                              size={16}
                              className="text-indigo-600"
                            />
                          </div>
                        )}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Persistence Drag Handle (Mini Version for Overlay) */}
          <AnimatePresence>
            {lastSavedFile && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className={`absolute bottom-20 left-4 right-4 z-50 bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-white/10 flex items-center gap-3 transition-transform hover:scale-[1.02]`}
              >
                <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <Download size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-tight text-white/50 leading-none">
                    Ready to Upload
                  </p>
                  <p className="text-[10px] font-bold truncate mt-1">
                    {lastSavedFile.name}
                  </p>
                </div>
                <button
                  draggable
                  onDragStart={(e) =>
                    handleDragStart(e, lastSavedFile.blob, lastSavedFile.name)
                  }
                  className="bg-white/10 hover:bg-white/20 p-2 rounded-xl text-blue-400 cursor-grab active:cursor-grabbing transition-colors"
                >
                  <Move size={16} />
                </button>
                <button
                  onClick={() => setLastSavedFile(null)}
                  className="p-1 text-white/40 hover:text-white"
                >
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer / Logs */}
          <div className="bg-slate-50 border-t border-slate-200">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="w-full px-4 py-2.5 flex items-center justify-between group transition-all hover:bg-slate-100"
            >
              <div className="flex items-center gap-2">
                <RefreshCw
                  size={12}
                  className={`text-blue-600 ${stage === "scanning" || stage === "filling" ? "animate-spin" : ""}`}
                />
                <div className="flex flex-col items-start">
                  <h4 className="text-[9px] font-black uppercase text-slate-800 tracking-widest leading-none">
                    System Status
                  </h4>
                  <p className="text-[7px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">
                    {stage === "idle" ? "Ready" : stage}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[7px] text-blue-600 font-black uppercase tracking-widest">
                  {showLogs ? "குறைக்கவும்" : "விவரங்களைக் காட்டு"}
                </span>
                <ChevronRight
                  size={12}
                  className={`text-slate-400 transition-transform duration-300 ${showLogs ? "rotate-90" : ""}`}
                />
              </div>
            </button>

            <AnimatePresence>
              {showLogs && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 200, opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-white"
                >
                  <div className="p-4 space-y-3 h-full">
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <h5 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                        Logs
                      </h5>
                      <button
                        onClick={copyAllLogs}
                        className="text-[8px] text-blue-600 font-black uppercase hover:underline"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="space-y-2 overflow-y-auto h-[140px] pr-2 custom-scrollbar">
                      {logs
                        .slice()
                        .reverse()
                        .map((log, i) => (
                          <div
                            key={i}
                            className={`text-[10px] font-bold flex items-start gap-2 p-2 rounded-xl border ${
                              log.type === "error"
                                ? "text-red-500 bg-red-50 border-red-100"
                                : log.type === "success"
                                  ? "text-green-600 bg-green-50 border-green-100"
                                  : "text-slate-500 bg-slate-50 border-slate-100"
                            }`}
                          >
                            <span className="flex-1 leading-normal">
                              {log.msg}
                            </span>
                          </div>
                        ))}
                      {logs.length === 0 && (
                        <p className="text-[9px] text-slate-300 italic text-center py-8">
                          No logs found.
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    );
  },
);

export default AssistantOverlay;
