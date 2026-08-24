'use client'

import { Document, Image, Page, StyleSheet, pdf } from '@react-pdf/renderer'

/* eslint-disable jsx-a11y/alt-text */

const styles = StyleSheet.create({
  page: {
    padding: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
})

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Impossibile leggere l'immagine."))
    image.src = src
  })
}

async function toJpegDataUrl(src: string): Promise<string> {
  const image = await loadImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight

  const context = canvas.getContext('2d')
  if (!context) throw new Error("Impossibile convertire l'immagine.")

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0)
  return canvas.toDataURL('image/jpeg', 0.94)
}

export async function downloadImageAsPdf(imageUrl: string, originalName: string) {
  const jpegDataUrl = await toJpegDataUrl(imageUrl)
  const blob = await pdf(
    <Document>
      <Page size="A4" style={styles.page}>
        <Image src={jpegDataUrl} style={styles.image} />
      </Page>
    </Document>
  ).toBlob()

  const downloadUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const baseName = originalName.replace(/\.[^.]+$/, '') || 'documento'
  anchor.href = downloadUrl
  anchor.download = `${baseName}.pdf`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
}
