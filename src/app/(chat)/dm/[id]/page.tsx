import { getUsers } from '@/lib/data';
import { DMPageClient } from './page-client';

export default async function DMPage() {
  const allUsers = await getUsers();
  return <DMPageClient allUsers={allUsers} />;
}
