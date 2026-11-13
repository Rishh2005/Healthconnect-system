import { redirect } from 'next/navigation'

export default function HospitalsPage() {
  redirect('/?panel=overview')
}
