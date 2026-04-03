import { useState, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

interface Props {
  onFilesSelected: (files: File[]) => void;
  className?: string;
}

export default function FileUpload({ onFilesSelected, className }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [rejectedFiles, setRejectedFiles] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = (incoming: File[]) => {
    const accepted: File[] = [];
    const rejected: string[] = [];
    incoming.forEach(f => {
      if (f.size > MAX_SIZE) {
        rejected.push(f.name);
      } else {
        accepted.push(f);
      }
    });
    setRejectedFiles(rejected);
    if (accepted.length > 0) {
      const updated = [...files, ...accepted];
      setFiles(updated);
      onFilesSelected(updated);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (idx: number) => {
    const updated = files.filter((_, i) => i !== idx);
    setFiles(updated);
    onFilesSelected(updated);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 transition-all flex flex-col items-center justify-center cursor-pointer",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/40 bg-card"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.docx"
          className="hidden"
          onChange={handleChange}
        />
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Upload className="w-6 h-6 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold">Glissez-déposez vos documents ici</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ou cliquez pour sélectionner des fichiers
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, JPG, PNG, DOCX — 10 Mo max par fichier
          </p>
        </div>
      </div>

      {rejectedFiles.length > 0 && (
        <div className="bg-error-container border border-destructive/30 rounded-lg px-4 py-3 space-y-1">
          <p className="text-sm font-semibold text-destructive">Fichier(s) refusé(s) — taille supérieure à 10 Mo :</p>
          {rejectedFiles.map((name, i) => (
            <p key={i} className="text-xs text-destructive">• {name}</p>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-lg relative group">
              <div className="w-10 h-10 rounded bg-white flex items-center justify-center border border-border shrink-0">
                {f.type.startsWith('image/') ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{f.name}</p>
                <p className="text-[10px] text-muted-foreground">{(f.size / 1024).toFixed(1)} Ko</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                className="p-1 hover:bg-destructive hover:text-destructive-foreground rounded-full transition-colors opacity-0 group-hover:opacity-100 absolute -top-2 -right-2 bg-white border border-border"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
