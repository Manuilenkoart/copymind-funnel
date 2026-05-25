'use server';

import { cookies } from 'next/headers';

import { upsertVoiceTranscript } from '@/app/lib/transcripts';

export async function saveVoiceTranscript(params: {
  funnelId: string;
  questionId: string;
  text: string;
  model?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const text = params.text.trim();
  if (!text) return { ok: false, error: 'Empty transcript' };
  if (!params.funnelId || !params.questionId) {
    return { ok: false, error: 'Missing funnel or question id' };
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;
  if (!userId) return { ok: false, error: 'No user session' };

  try {
    await upsertVoiceTranscript({
      userId,
      funnelId: params.funnelId,
      questionId: params.questionId,
      text,
      model: params.model,
    });
    return { ok: true };
  } catch (err) {
    console.error('[tracking] saveVoiceTranscript failed:', err);
    return { ok: false, error: 'Failed to save transcript' };
  }
}
