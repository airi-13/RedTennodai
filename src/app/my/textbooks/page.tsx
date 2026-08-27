// src/app/my/textbooks/page.tsx
import { listTextbooks } from '@/lib/data/textbooks'
import { TextbooksView } from './TextbooksView'

export const dynamic = 'force-dynamic'

export default async function TextbooksPage() {
  const textbooks = await listTextbooks()
  return <TextbooksView textbooks={textbooks} />
}
