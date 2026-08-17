"use client";

import { PDFDocument } from "pdf-lib";
import type { ProcuraFormData } from "@/lib/schema";
import { generateProcuraPdf } from "@/lib/pdfGenerator";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const IMAGE_MARGIN = 24;

async function webpToPngBytes(file: File): Promise<ArrayBuffer> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Impossibile convertire l'immagine WEBP.");
  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error("Impossibile convertire l'immagine WEBP.")),
      "image/png",
    );
  });
  return blob.arrayBuffer();
}

async function appendSourceDocument(output: PDFDocument, source: File) {
  if (source.type === "application/pdf") {
    const sourcePdf = await PDFDocument.load(await source.arrayBuffer());
    const pages = await output.copyPages(sourcePdf, sourcePdf.getPageIndices());
    pages.forEach((page) => output.addPage(page));
    return;
  }

  const bytes = source.type === "image/webp"
    ? await webpToPngBytes(source)
    : await source.arrayBuffer();
  const image = source.type === "image/jpeg"
    ? await output.embedJpg(bytes)
    : await output.embedPng(bytes);

  const page = output.addPage([A4_WIDTH, A4_HEIGHT]);
  const maxWidth = A4_WIDTH - IMAGE_MARGIN * 2;
  const maxHeight = A4_HEIGHT - IMAGE_MARGIN * 2;
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  const width = image.width * scale;
  const height = image.height * scale;

  page.drawImage(image, {
    x: (A4_WIDTH - width) / 2,
    y: (A4_HEIGHT - height) / 2,
    width,
    height,
  });
}

export async function generateCompletePracticePdf(
  data: ProcuraFormData,
  sourceDocument: File,
  clientSignature?: string,
): Promise<Blob> {
  const output = await PDFDocument.create();
  await appendSourceDocument(output, sourceDocument);

  const procuraBlob = await generateProcuraPdf(data, clientSignature);
  const procuraPdf = await PDFDocument.load(await procuraBlob.arrayBuffer());
  const procuraPages = await output.copyPages(procuraPdf, procuraPdf.getPageIndices());
  procuraPages.forEach((page) => output.addPage(page));

  const bytes = await output.save();
  const pdfBuffer = new Uint8Array(bytes).buffer;
  return new Blob([pdfBuffer], { type: "application/pdf" });
}

export async function downloadCompletePracticePdf(
  data: ProcuraFormData,
  sourceDocument: File,
  clientSignature?: string,
): Promise<void> {
  const blob = await generateCompletePracticePdf(data, sourceDocument, clientSignature);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Fascicolo_${data.cognome}_${data.nome}_${
    new Date().toISOString().split("T")[0]
  }.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
