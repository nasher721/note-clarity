
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileImage, Loader2, X, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { OCRService } from '@/services/ocrService';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadProps {
    onTextExtracted: (text: string, sourceName: string) => void;
    className?: string;
}

export function ImageUpload({ onTextExtracted, className }: ImageUploadProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const { toast } = useToast();

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];
        if (!file.type.startsWith('image/')) {
            toast({ title: 'Invalid file', description: 'Please upload an image file.', variant: 'destructive' });
            return;
        }

        setIsProcessing(true);
        setProgress(0);

        try {
            const result = await OCRService.processImage(file, (p) => {
                setProgress(p);
            });

            if (result.text.trim().length === 0) {
                toast({ title: 'No text found', description: 'Could not detect any text in the image.', variant: 'destructive' });
            } else {
                onTextExtracted(result.text, file.name);
                toast({
                    title: 'Scan Complete',
                    description: `Extracted ${result.wordCount} words (${(result.confidence * 100).toFixed(0)}% confidence).`
                });
            }
        } catch (error) {
            toast({ title: 'Scan Failed', description: 'Could not process the image.', variant: 'destructive' });
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }
    }, [onTextExtracted, toast]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
        maxFiles: 1,
        disabled: isProcessing
    });

    return (
        <div className={cn("space-y-4", className)}>
            <div
                {...getRootProps()}
                className={cn(
                    "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-card",
                    isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                    isProcessing && "opacity-50 cursor-not-allowed"
                )}
            >
                <input {...getInputProps()} />

                {isProcessing ? (
                    <div className="flex flex-col items-center gap-3 text-center py-2">
                        <ScanLine className="h-8 w-8 text-primary animate-pulse" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Scanning Document...</p>
                            <Progress value={progress} className="w-[120px] h-1.5" />
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 text-center">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <Upload className="h-5 w-5 text-primary" />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-sm font-medium">Scan Image / PDF</p>
                            <p className="text-xs text-muted-foreground">Drop file or click to upload</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
