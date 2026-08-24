import { redirect } from 'next/navigation'

/**
 * Client Page - Email Request Mode
 * Simplified form for clients (no authentication required)
 * Only allows generating email requests + payment
 */
export default function ClientPage() {
  redirect('/')
}
