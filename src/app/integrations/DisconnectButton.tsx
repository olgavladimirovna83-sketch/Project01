'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DisconnectButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    await fetch('/api/integrations/instagram/disconnect', { method: 'POST' });
    setPending(false);
    router.refresh();
  }

  return (
    <button type="button" onClick={handleClick} disabled={pending}>
      Отключить
    </button>
  );
}
