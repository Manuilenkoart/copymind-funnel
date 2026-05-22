import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockEq, mockInsert, mockUpsert, mockUpdate, mockFrom } = vi.hoisted(() => {
  const mockEq = vi.fn().mockResolvedValue({ error: null });
  const mockInsert = vi.fn().mockResolvedValue({ error: null });
  const mockUpsert = vi.fn().mockResolvedValue({ error: null });
  const mockUpdate = vi.fn(() => ({ eq: mockEq }));
  const mockFrom = vi.fn(() => ({
    upsert: mockUpsert,
    insert: mockInsert,
    update: mockUpdate,
  }));
  return { mockEq, mockInsert, mockUpsert, mockUpdate, mockFrom };
});

vi.mock('@/app/lib/supabase/server', () => ({
  createServerClient: () => ({ from: mockFrom }),
}));

import { recordEvent, updateUserEmail } from '@/app/lib/tracking';

describe('recordEvent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('upserts the user row', async () => {
    await recordEvent('user-abc', 'quiz-1', 'page_view', '0', 'google');
    expect(mockFrom).toHaveBeenCalledWith('users');
    expect(mockUpsert).toHaveBeenCalledWith(
      { id: 'user-abc' },
      { onConflict: 'id', ignoreDuplicates: true }
    );
  });

  it('inserts a page_view event with utm_source', async () => {
    await recordEvent('user-abc', 'quiz-1', 'page_view', '0', 'google');
    expect(mockFrom).toHaveBeenCalledWith('events');
    expect(mockInsert).toHaveBeenCalledWith({
      name: 'page_view',
      funnel_id: 'quiz-1',
      question_id: '0',
      user_id: 'user-abc',
      utm_source: 'google',
    });
  });

  it('records "Direct" when caller passes "Direct"', async () => {
    await recordEvent('user-abc', 'quiz-1', 'page_view', '0', 'Direct');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ utm_source: 'Direct' })
    );
  });

  it('records paywall as question_id "paywall"', async () => {
    await recordEvent('user-abc', 'quiz-1', 'page_view', 'paywall', 'google');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ question_id: 'paywall' })
    );
  });

  it('records a buy event with utm_source', async () => {
    await recordEvent('user-abc', 'quiz-1', 'buy', 'paywall', 'facebook');
    expect(mockInsert).toHaveBeenCalledWith({
      name: 'buy',
      funnel_id: 'quiz-1',
      question_id: 'paywall',
      user_id: 'user-abc',
      utm_source: 'facebook',
    });
  });
});

describe('updateUserEmail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates email on the users table filtered by id', async () => {
    await updateUserEmail('user-abc', 'test@example.com');
    expect(mockFrom).toHaveBeenCalledWith('users');
    expect(mockUpdate).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(mockEq).toHaveBeenCalledWith('id', 'user-abc');
  });
});
