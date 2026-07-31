'use client';

import { useState } from 'react';
import { cn } from '@/lib/admin/utils/cn';
import { MessageCircle, Heart, ThumbsUp, Laugh, Send, User, Trash2 } from 'lucide-react';

type Reaction = { type: string; count: number; userReacted: boolean };

type MuralPost = {
  id: string;
  author: string;
  authorAvatar?: string;
  content: string;
  time: string;
  reactions: Reaction[];
  comments: { id: string; author: string; content: string; time: string }[];
};

const initialPosts: MuralPost[] = [
  {
    id: '1',
    author: 'Thalos',
    content: 'Parabéns pela conquista de Lendário! Merecido demais 🔥',
    time: '2 horas atrás',
    reactions: [
      { type: '👍', count: 5, userReacted: false },
      { type: '🔥', count: 3, userReacted: true },
    ],
    comments: [
      { id: 'c1', author: 'Lyra', content: 'Concordo! Muito orgulho dele!', time: '1h atrás' },
    ],
  },
  {
    id: '2',
    author: 'Lyra',
    content: 'Alguém pra raid amanhã? Vamos precisar de 2 tanques!',
    time: '5 horas atrás',
    reactions: [
      { type: '👍', count: 8, userReacted: false },
    ],
    comments: [],
  },
];

const reactionEmojis = ['👍', '❤️', '😂', '🔥', '🎮'];

export function ProfileMural({ isOwner }: { isOwner: boolean }) {
  const [posts, setPosts] = useState(initialPosts);
  const [newPost, setNewPost] = useState('');
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const addPost = () => {
    if (!newPost.trim()) return;
    const post: MuralPost = {
      id: String(Date.now()),
      author: 'Você',
      content: newPost.trim(),
      time: 'Agora',
      reactions: [],
      comments: [],
    };
    setPosts((prev) => [post, ...prev]);
    setNewPost('');
  };

  const addComment = (postId: string) => {
    if (!commentText.trim()) return;
    setPosts((prev) => prev.map((p) =>
      p.id === postId
        ? { ...p, comments: [...p.comments, { id: String(Date.now()), author: 'Você', content: commentText.trim(), time: 'Agora' }] }
        : p,
    ));
    setCommentText('');
  };

  const toggleReaction = (postId: string, emoji: string) => {
    setPosts((prev) => prev.map((p) => {
      if (p.id !== postId) return p;
      const existing = p.reactions.find((r) => r.type === emoji);
      if (existing) {
        return {
          ...p,
          reactions: p.reactions.map((r) =>
            r.type === emoji
              ? { ...r, count: r.userReacted ? r.count - 1 : r.count + 1, userReacted: !r.userReacted }
              : r,
          ).filter((r) => r.count > 0),
        };
      }
      return { ...p, reactions: [...p.reactions, { type: emoji, count: 1, userReacted: true }] };
    }));
  };

  const deletePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return (
    <div className="space-y-4">
      {/* New post */}
      {isOwner && (
        <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
              <User size={16} className="text-accent" />
            </div>
            <div className="flex-1">
              <textarea
                rows={2}
                maxLength={500}
                placeholder="Escreva um recado no mural..."
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                className="w-full px-3 py-2 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted">{newPost.length}/500</span>
                <button
                  onClick={addPost}
                  disabled={!newPost.trim()}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    newPost.trim()
                      ? 'bg-accent text-white hover:bg-accent-hover'
                      : 'bg-[rgba(38,51,86,0.3)] text-muted cursor-not-allowed',
                  )}
                >
                  <Send size={12} /> Publicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Posts */}
      {posts.map((post) => (
        <div key={post.id} className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
              <User size={16} className="text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white font-medium">{post.author}</span>
                <span className="text-xs text-muted">{post.time}</span>
                {isOwner && (
                  <button onClick={() => deletePost(post.id)} className="ml-auto text-muted hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <p className="text-sm text-white/90 mt-1 whitespace-pre-wrap">{post.content}</p>

              {/* Reactions */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {post.reactions.map((r) => (
                  <button
                    key={r.type}
                    onClick={() => toggleReaction(post.id, r.type)}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors',
                      r.userReacted
                        ? 'bg-accent/20 border border-accent/30 text-white'
                        : 'bg-[rgba(38,51,86,0.3)] border border-transparent text-muted hover:text-white',
                    )}
                  >
                    <span>{r.type}</span>
                    <span>{r.count}</span>
                  </button>
                ))}
                <div className="relative group">
                  <button className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-[rgba(38,51,86,0.2)] text-muted hover:text-white transition-colors">
                    +
                  </button>
                  <div className="absolute bottom-full left-0 mb-1 hidden group-hover:flex items-center gap-1 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg p-1.5 shadow-lg z-10">
                    {reactionEmojis.filter((e) => !post.reactions.find((r) => r.type === e)).map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => toggleReaction(post.id, emoji)}
                        className="w-7 h-7 rounded hover:bg-[rgba(38,51,86,0.5)] flex items-center justify-center text-sm transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Comments */}
              <div className="mt-3">
                <button
                  onClick={() => setOpenComments(openComments === post.id ? null : post.id)}
                  className="flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors"
                >
                  <MessageCircle size={14} />
                  {post.comments.length > 0 ? `${post.comments.length} comentário${post.comments.length > 1 ? 's' : ''}` : 'Comentar'}
                </button>

                {openComments === post.id && (
                  <div className="mt-3 space-y-3">
                    {post.comments.map((c) => (
                      <div key={c.id} className="flex items-start gap-2 pl-2 border-l border-[rgba(38,51,86,0.3)]">
                        <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                          <User size={10} className="text-accent" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white font-medium">{c.author}</span>
                            <span className="text-[10px] text-muted">{c.time}</span>
                          </div>
                          <p className="text-xs text-white/80 mt-0.5">{c.content}</p>
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center gap-2 pl-2">
                      <input
                        type="text"
                        placeholder="Escreva um comentário..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addComment(post.id)}
                        className="flex-1 h-8 px-3 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-xs text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
                      />
                      <button
                        onClick={() => addComment(post.id)}
                        disabled={!commentText.trim()}
                        className="text-accent hover:text-accent-hover disabled:text-muted transition-colors"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {posts.length === 0 && (
        <div className="text-center py-10 text-muted text-sm">
          Nenhum recado ainda. {isOwner ? 'Seja o primeiro a postar!' : 'Ainda não há postagens.'}
        </div>
      )}
    </div>
  );
}
