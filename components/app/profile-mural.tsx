'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/admin/firebase/client';
import { cn } from '@/lib/admin/utils/cn';
import {
  Loader2,
  MessageCircle,
  Send,
  Trash2,
  User,
} from 'lucide-react';

type MuralPost = {
  id: string;
  authorId?: string;
  authorName?: string;
  content?: string;
  createdAt?: { seconds: number } | null;
};

type MuralReaction = {
  id: string;
  type?: string;
};

type MuralComment = {
  id: string;
  authorId?: string;
  authorName?: string;
  content?: string;
  createdAt?: { seconds: number } | null;
};

const reactionEmojis = ['👍', '❤️', '😂', '🔥', '🎮'];
const MAX_POST_LENGTH = 500;
const MAX_COMMENT_LENGTH = 300;

function timeAgo(ts?: { seconds: number } | null): string {
  if (!ts?.seconds) return '';
  const diff = Date.now() - ts.seconds * 1000;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} d`;
  return new Date(ts.seconds * 1000).toLocaleDateString('pt-BR');
}

export function ProfileMural({
  targetUserId,
  isOwner,
}: {
  targetUserId: string;
  isOwner: boolean;
}) {
  const [viewer, setViewer] = useState<FirebaseUser | null>(null);
  const [posts, setPosts] = useState<MuralPost[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');

  useEffect(
    () => onAuthStateChanged(getFirebaseAuth(), setViewer),
    [],
  );

  useEffect(() => {
    if (!targetUserId) return;
    setPosts(null);
    setLoadError(false);

    const q = query(
      collection(getFirebaseDb(), 'users', targetUserId, 'mural'),
      orderBy('createdAt', 'desc'),
      limit(30),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MuralPost));
        setLoadError(false);
      },
      () => setLoadError(true),
    );
    return unsub;
  }, [targetUserId]);

  const addPost = async () => {
    const content = newPost.trim();
    if (!content || !viewer || posting) return;
    setPosting(true);
    setPostError('');
    try {
      await addDoc(
        collection(getFirebaseDb(), 'users', targetUserId, 'mural'),
        {
          authorId: viewer.uid,
          authorName:
            viewer.displayName?.trim() ||
            viewer.email?.split('@')[0] ||
            'Usuário',
          content: content.slice(0, MAX_POST_LENGTH),
          createdAt: serverTimestamp(),
        },
      );
      setNewPost('');
    } catch {
      setPostError('Não foi possível publicar o recado.');
    }
    setPosting(false);
  };

  const canPost = !!viewer;

  return (
    <div className="space-y-4">
      {/* New post */}
      {canPost && (
        <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-4">
          <div className="flex items-start gap-3">
            <AvatarBubble name={viewer!.displayName} />
            <div className="flex-1">
              <textarea
                rows={2}
                maxLength={MAX_POST_LENGTH}
                placeholder={
                  isOwner
                    ? 'Escreva um recado no mural...'
                    : 'Deixe um recado para este jogador...'
                }
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                className="w-full px-3 py-2 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted">
                  {newPost.length}/{MAX_POST_LENGTH}
                </span>
                <button
                  onClick={addPost}
                  disabled={!newPost.trim() || posting}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    newPost.trim() && !posting
                      ? 'bg-accent text-white hover:bg-accent-hover'
                      : 'bg-[rgba(38,51,86,0.3)] text-muted cursor-not-allowed',
                  )}
                >
                  {posting ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Send size={12} />
                  )}
                  Publicar
                </button>
              </div>
              {postError && (
                <p className="text-xs text-red-400 mt-1">{postError}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Posts */}
      {loadError && (
        <p className="text-center py-8 text-red-400 text-sm">
          Não foi possível carregar o mural.
        </p>
      )}

      {!loadError &&
        posts === null && (
          <div className="flex items-center justify-center py-10 text-muted">
            <Loader2 size={20} className="animate-spin mr-2" />
            Carregando recados...
          </div>
        )}

      {posts !== null &&
        posts.map((post) => (
          <MuralPostItem
            key={post.id}
            post={post}
            targetUserId={targetUserId}
            isWallOwner={isOwner}
            viewerUid={viewer?.uid ?? null}
            viewerName={viewer?.displayName ?? ''}
            onDeleted={(id) =>
              setPosts((prev) => prev?.filter((p) => p.id !== id) ?? null)
            }
          />
        ))}

      {posts !== null && posts.length === 0 && (
        <div className="text-center py-10 text-muted text-sm">
          Nenhum recado ainda.{' '}
          {canPost
            ? isOwner
              ? 'Seja o primeiro a postar!'
              : 'Deixe o primeiro recado!'
            : 'Ainda não há postagens.'}
        </div>
      )}
    </div>
  );
}

function MuralPostItem({
  post,
  targetUserId,
  isWallOwner,
  viewerUid,
  viewerName,
  onDeleted,
}: {
  post: MuralPost;
  targetUserId: string;
  isWallOwner: boolean;
  viewerUid: string | null;
  viewerName: string;
  onDeleted: (id: string) => void;
}) {
  const [reactions, setReactions] = useState<MuralReaction[] | null>(null);
  const [comments, setComments] = useState<MuralComment[] | null>(null);
  const [openComments, setOpenComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const postDocRef = doc(
      getFirebaseDb(),
      'users',
      targetUserId,
      'mural',
      post.id,
    );

    const unsubReactions = onSnapshot(
      collection(postDocRef, 'reactions'),
      (snap) =>
        setReactions(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MuralReaction)),
      () => {},
    );

    const unsubComments = onSnapshot(
      query(collection(postDocRef, 'comments'), orderBy('createdAt', 'asc')),
      (snap) =>
        setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MuralComment)),
      () => {},
    );

    return () => {
      unsubReactions();
      unsubComments();
    };
  }, [targetUserId, post.id]);

  const myReaction = viewerUid
    ? reactions?.find((r) => r.id === viewerUid)
    : undefined;

  const groupedReactions = reactionEmojis
    .map((emoji) => ({
      emoji,
      count: reactions?.filter((r) => r.type === emoji).length ?? 0,
      mine: myReaction?.type === emoji,
    }))
    .filter((r) => r.count > 0 || r.mine);

  const toggleReaction = async (emoji: string) => {
    if (!viewerUid || busy) return;
    setBusy(true);
    setActionError('');
    try {
      const ref = doc(
        getFirebaseDb(),
        'users',
        targetUserId,
        'mural',
        post.id,
        'reactions',
        viewerUid,
      );
      if (myReaction?.type === emoji) {
        await deleteDoc(ref);
      } else {
        await setDoc(ref, { type: emoji, updatedAt: serverTimestamp() });
      }
    } catch {
      setActionError('Falha ao reagir.');
    }
    setBusy(false);
  };

  const addComment = async () => {
    const content = commentText.trim();
    if (!content || !viewerUid || busy) return;
    setBusy(true);
    setActionError('');
    try {
      await addDoc(
        collection(getFirebaseDb(), 'users', targetUserId, 'mural', post.id, 'comments'),
        {
          authorId: viewerUid,
          authorName: viewerName.trim() || 'Usuário',
          content: content.slice(0, MAX_COMMENT_LENGTH),
          createdAt: serverTimestamp(),
        },
      );
      setCommentText('');
    } catch {
      setActionError('Falha ao comentar.');
    }
    setBusy(false);
  };

  const deleteComment = async (commentId: string) => {
    setBusy(true);
    try {
      await deleteDoc(
        doc(getFirebaseDb(), 'users', targetUserId, 'mural', post.id, 'comments', commentId),
      );
    } catch {
      setActionError('Falha ao excluir comentário.');
    }
    setBusy(false);
  };

  const deletePost = async () => {
    setBusy(true);
    try {
      await deleteDoc(doc(getFirebaseDb(), 'users', targetUserId, 'mural', post.id));
      onDeleted(post.id);
    } catch {
      setActionError('Falha ao excluir o recado.');
      setBusy(false);
    }
  };

  const canDeletePost = isWallOwner || (!!viewerUid && post.authorId === viewerUid);
  const canInteract = !!viewerUid;

  return (
    <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-4">
      <div className="flex items-start gap-3">
        <AvatarBubble name={post.authorName} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white font-medium truncate">
              {post.authorName || 'Usuário'}
            </span>
            <span className="text-xs text-muted shrink-0">{timeAgo(post.createdAt)}</span>
            {canDeletePost && (
              <button
                onClick={deletePost}
                disabled={busy}
                title="Excluir recado"
                className="ml-auto text-muted hover:text-red-400 transition-colors disabled:opacity-50"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <p className="text-sm text-white/90 mt-1 whitespace-pre-wrap break-words">
            {post.content}
          </p>

          {/* Reactions */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {groupedReactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => toggleReaction(r.emoji)}
                disabled={!canInteract || busy}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors disabled:opacity-60',
                  r.mine
                    ? 'bg-accent/20 border border-accent/30 text-white'
                    : 'bg-[rgba(38,51,86,0.3)] border border-transparent text-muted hover:text-white',
                )}
              >
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </button>
            ))}
            {canInteract && (
              <div className="relative group">
                <button
                  disabled={busy}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-[rgba(38,51,86,0.2)] text-muted hover:text-white transition-colors disabled:opacity-60"
                >
                  +
                </button>
                <div className="absolute bottom-full left-0 mb-1 hidden group-hover:flex items-center gap-1 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg p-1.5 shadow-lg z-10">
                  {reactionEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => toggleReaction(emoji)}
                      disabled={busy}
                      className="w-7 h-7 rounded hover:bg-[rgba(38,51,86,0.5)] flex items-center justify-center text-sm transition-colors disabled:opacity-60"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setOpenComments(!openComments)}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors"
            >
              <MessageCircle size={14} />
              {comments !== null && comments.length > 0
                ? `${comments.length} comentário${comments.length > 1 ? 's' : ''}`
                : 'Comentar'}
            </button>

            {actionError && (
              <span className="text-xs text-red-400">{actionError}</span>
            )}
          </div>

          {/* Comments */}
          {openComments && (
            <div className="mt-3 space-y-3">
              {comments === null ? (
                <div className="flex items-center gap-2 pl-2 text-xs text-muted">
                  <Loader2 size={12} className="animate-spin" /> Carregando...
                </div>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start gap-2 pl-2 border-l border-[rgba(38,51,86,0.3)]"
                  >
                    <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                      <User size={10} className="text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white font-medium">
                          {c.authorName || 'Usuário'}
                        </span>
                        <span className="text-[10px] text-muted">
                          {timeAgo(c.createdAt)}
                        </span>
                        {(isWallOwner || c.authorId === viewerUid) && (
                          <button
                            onClick={() => deleteComment(c.id)}
                            disabled={busy}
                            title="Excluir comentário"
                            className="ml-auto text-muted hover:text-red-400 transition-colors disabled:opacity-50"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-white/80 mt-0.5 whitespace-pre-wrap break-words">
                        {c.content}
                      </p>
                    </div>
                  </div>
                ))
              )}

              {canInteract && (
                <div className="flex items-center gap-2 pl-2">
                  <input
                    type="text"
                    maxLength={MAX_COMMENT_LENGTH}
                    placeholder="Escreva um comentário..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addComment()}
                    className="flex-1 h-8 px-3 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-xs text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
                  />
                  <button
                    onClick={addComment}
                    disabled={!commentText.trim() || busy}
                    className="text-accent hover:text-accent-hover disabled:text-muted transition-colors"
                  >
                    <Send size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AvatarBubble({ name }: { name?: string | null }) {
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || '?';
  return (
    <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center shrink-0 font-heading font-bold text-accent text-sm">
      {initial}
    </div>
  );
}
