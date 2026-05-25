import { createServerClient } from './supabase/server';

export async function upsertVoiceTranscript(params: {
  userId: string;
  funnelId: string;
  questionId: string;
  text: string;
  model?: string;
}): Promise<void> {
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { error } = await supabase.from('voice_transcripts').upsert(
    {
      user_id: params.userId,
      funnel_id: params.funnelId,
      question_id: params.questionId,
      text: params.text,
      model: params.model ?? null,
      updated_at: now,
    },
    { onConflict: 'user_id,funnel_id,question_id' }
  );

  if (error) throw error;
}
