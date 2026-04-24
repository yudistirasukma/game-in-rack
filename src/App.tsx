import { 
  Gamepad2, 
  Search, 
  Library, 
  Star, 
  User as UserIcon,
  Plus,
  PlayCircle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Bookmark,
  ExternalLink,
  ChevronRight,
  MoreVertical,
  Trash2,
  X
} from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { auth, db } from './lib/firebase';
import { updateProfile } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  setDoc,
  deleteDoc, 
  serverTimestamp, 
  orderBy 
} from 'firebase/firestore';

import { handleFirestoreError } from './lib/errorUtils';

// Types reflect the blueprint
interface UserGame {
  id: string;
  userId: string;
  gameId: string;
  title: string;
  coverUrl: string;
  status: 'backlog' | 'playing' | 'completed' | 'wishlist';
  platforms: string[];
  progress: number;
  hoursPlayed: number;
  rating?: number;
  priority?: 'low' | 'medium' | 'high';
  isArchived?: boolean;
  notes?: string;
  gallery?: string[];
  lastPlayed?: any;
  createdAt?: any;
  updatedAt?: any;
}

// --- Components ---

const GameCard = ({ game, onSelect, variant = 'standard' }: { 
  game: UserGame, 
  onSelect: (g: UserGame) => void, 
  variant?: 'standard' | 'large' | 'compact',
  key?: any
}) => {
  const isLarge = variant === 'large';
  const isCompact = variant === 'compact';

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(game)}
      className={`relative group bg-card-dark rounded-2xl overflow-hidden border border-border-dark cursor-pointer transition-shadow hover:shadow-[0_0_20px_rgba(79,70,229,0.15)] ${
        isLarge ? 'p-0' : 'p-2'
      }`}
    >
      <div className={`${isLarge ? 'aspect-video' : 'aspect-[3/4]'} rounded-xl bg-zinc-900 overflow-hidden relative`}>
        <img 
          src={game.coverUrl || 'https://via.placeholder.com/300x400?text=No+Cover'} 
          alt={game.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className={`absolute inset-0 bg-gradient-to-t from-bg-dark ${isLarge ? 'via-bg-dark/20' : 'via-transparent'} to-transparent`} />
        
        {/* Progress Overlay for large cards */}
        {isLarge && game.status === 'playing' && (
          <div className="absolute bottom-4 left-4 right-4">
             <div className="flex justify-between items-end mb-2">
                <h3 className="font-bold text-xl drop-shadow-md">{game.title}</h3>
                <span className="text-xs font-mono text-brand-secondary">{game.progress}%</span>
             </div>
             <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-brand-primary" style={{ width: `${game.progress}%` }} />
             </div>
          </div>
        )}

        {/* Status Badge */}
        {!isLarge && (
           <div className="absolute top-2 right-2">
             {game.status === 'playing' && (
               <div className="px-2 py-1 bg-brand-primary/20 backdrop-blur-md rounded-full border border-brand-primary/30 flex items-center gap-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                 <span className="text-[8px] font-bold uppercase tracking-wider text-brand-primary">Live</span>
               </div>
             )}
           </div>
        )}
      </div>
      
      {!isLarge && (
        <div className="mt-3 px-1">
          <h3 className="font-bold text-sm truncate">{game.title}</h3>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[10px] text-zinc-500 uppercase font-medium">{game.platforms[0] || 'Unknown'}</p>
            {game.status === 'playing' && !isCompact && (
              <span className="text-[10px] font-mono text-brand-secondary">{game.progress}%</span>
            )}
          </div>
          
          {game.status === 'playing' && !isCompact && (
            <div className="w-full h-1 bg-zinc-800 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-brand-primary" style={{ width: `${game.progress}%` }} />
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

const AddGameModal = ({ isOpen, onClose, userId }: { isOpen: boolean, onClose: () => void, userId: string }) => {
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('');
  const [status, setStatus] = useState<UserGame['status']>('backlog');
  const [coverUrl, setCoverUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    try {
      await addDoc(collection(db, `users/${userId}/games`), {
        userId,
        gameId: Math.random().toString(36).substring(7),
        title,
        coverUrl: coverUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${title}&backgroundColor=4f46e5`,
        status,
        platforms: platform ? [platform.trim()] : [],
        progress: status === 'completed' ? 100 : 0,
        hoursPlayed: 0,
        priority: 'medium',
        isArchived: false,
        notes: '',
        gallery: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setTitle('');
      setPlatform('');
      setCoverUrl('');
      onClose();
    } catch (err) {
      handleFirestoreError(err, 'create', `users/${userId}/games`, { uid: userId });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-t-[32px] sm:rounded-[32px] p-8 relative z-10"
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">New Game</h2>
                <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Expanding your rack</p>
              </div>
              <button onClick={onClose} className="p-3 bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-2">Title</label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Ghost of Tsushima"
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-5 py-4 focus:border-brand-primary outline-none transition-all placeholder:text-zinc-700"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-2">Platform</label>
                  <input 
                    type="text" 
                    value={platform}
                    onChange={e => setPlatform(e.target.value)}
                    placeholder="e.g. PS5, PC"
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-5 py-4 focus:border-brand-primary outline-none transition-all placeholder:text-zinc-700"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-2">Cover URL (Optional)</label>
                  <input 
                    type="text" 
                    value={coverUrl}
                    onChange={e => setCoverUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-5 py-4 focus:border-brand-primary outline-none transition-all placeholder:text-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'backlog', color: 'bg-zinc-800' },
                  { id: 'playing', color: 'bg-indigo-900/20' },
                  { id: 'completed', color: 'bg-emerald-900/20' },
                  { id: 'wishlist', color: 'bg-amber-900/20' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setStatus(item.id as any)}
                    className={`px-4 py-3 rounded-xl border text-[11px] font-bold uppercase tracking-widest transition-all ${
                      status === item.id 
                        ? 'bg-zinc-100 text-zinc-950 border-zinc-100' 
                        : `border-zinc-800 bg-zinc-900/30 text-zinc-500`
                    }`}
                  >
                    {item.id}
                  </button>
                ))}
              </div>

              <button 
                type="submit"
                className="w-full bg-brand-primary text-white font-bold py-5 rounded-2xl mt-4 hover:shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add to Rack
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// --- Views ---

const RadarView = ({ games, onSelect }: { games: UserGame[], onSelect: (g: UserGame) => void }) => {
  const wishlist = useMemo(() => games.filter(g => g.status === 'wishlist' && !g.isArchived), [games]);

  return (
    <div className="space-y-6 pb-32">
      <div className="flex justify-between items-center mb-2">
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">Tracking {wishlist.length} Shadows</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {wishlist.map(game => (
          <GameCard key={game.id} game={game} onSelect={onSelect} variant="compact" />
        ))}
        {wishlist.length === 0 && (
          <div className="col-span-full py-24 text-center">
            <Bookmark className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
            <p className="text-zinc-500 text-sm">Your radar is clear. No games detected.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const HomeView = ({ games, onSelect }: { games: UserGame[], onSelect: (g: UserGame) => void }) => {
  const activeGames = useMemo(() => games.filter(g => !g.isArchived), [games]);
  
  const playing = useMemo(() => activeGames.filter(g => g.status === 'playing'), [activeGames]);
  
  const sortedGames = useMemo(() => {
    return activeGames
      .filter(g => g.priority === 'high')
      .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
  }, [activeGames]);

  const recent = useMemo(() => sortedGames.slice(0, 4), [sortedGames]);
  const wishlist = useMemo(() => activeGames.filter(g => g.status === 'wishlist').slice(0, 3), [activeGames]);

  return (
    <div className="space-y-10 pb-32">
      {/* Continue Playing */}
      <section>
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Continue Playing</h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Pick up where you left</p>
          </div>
        </div>
        
        {playing.length > 0 ? (
          <div className="space-y-4">
            {playing.slice(0, 2).map(game => (
              <GameCard key={game.id} game={game} onSelect={onSelect} variant="large" />
            ))}
          </div>
        ) : (
          <div className="p-8 border border-dashed border-zinc-800 rounded-[32px] text-center">
            <Gamepad2 className="w-8 h-8 text-zinc-800 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No active sessions. Start a new quest?</p>
          </div>
        )}
      </section>

      {/* Recently Updated / High Priority */}
      <section>
        <div className="flex justify-between items-end mb-5">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Priority Rack</h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">High focus titles</p>
          </div>
          <button className="text-[10px] text-brand-primary uppercase font-bold tracking-widest hover:underline">View All</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {recent.map(game => (
            <GameCard key={game.id} game={game} onSelect={onSelect} />
          ))}
        </div>
      </section>

      {/* Wishlist Preview */}
      {wishlist.length > 0 && (
        <section className="bg-zinc-900/30 border border-zinc-800 rounded-[32px] p-6">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">On Radar</h3>
             <Bookmark className="w-4 h-4 text-zinc-600" />
          </div>
          <div className="space-y-4">
            {wishlist.map(game => (
              <div 
                key={game.id} 
                className="flex items-center gap-4 cursor-pointer group"
                onClick={() => onSelect(game)}
              >
                <div className="w-12 h-16 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                  <img src={game.coverUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{game.title}</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-medium mt-0.5">{game.platforms[0]}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400" />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const LibraryView = ({ games, onSelect }: { games: UserGame[], onSelect: (g: UserGame) => void }) => {
  const [filter, setFilter] = useState<'all' | 'playing' | 'backlog' | 'completed' | 'wishlist' | 'archived'>('all');

  const filtered = useMemo(() => {
    if (filter === 'archived') return games.filter(g => g.isArchived);
    const unarchived = games.filter(g => !g.isArchived);
    if (filter === 'all') return unarchived;
    return unarchived.filter(g => g.status === filter);
  }, [games, filter]);

  return (
    <div className="space-y-6 pb-32">
      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar border-b border-zinc-900">
        {['all', 'playing', 'backlog', 'completed', 'wishlist', 'archived'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border ${
              filter === f 
                ? 'bg-zinc-100 text-zinc-950 border-zinc-100 shadow-[0_4px_15px_rgba(255,255,255,0.1)]' 
                : 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:text-zinc-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filtered.map(game => (
          <GameCard key={game.id} game={game} onSelect={onSelect} variant="compact" />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-24 text-center">
            <Library className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
            <p className="text-zinc-500 text-sm">No items found in your archive.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const GameDetail = ({ game, onClose, userId }: { game: UserGame, onClose: () => void, userId: string }) => {
  const [progress, setProgress] = useState(game.progress);
  const [notes, setNotes] = useState(game.notes || '');
  const [hours, setHours] = useState(game.hoursPlayed || 0);
  const [rating, setRating] = useState(game.rating || 0);
  const [priority, setPriority] = useState(game.priority || 'medium');
  const [isSaving, setIsSaving] = useState(false);
  const [imageInput, setImageInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const saveChanges = async (updates: Partial<UserGame>) => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, `users/${userId}/games`, game.id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, 'update', `users/${userId}/games/${game.id}`, { uid: userId });
    } finally {
      setIsSaving(false);
    }
  };

  const updateProgress = (val: number) => {
    setProgress(val);
    saveChanges({ progress: val, status: val === 100 ? 'completed' : 'playing' });
  };

  const adjustHours = (delta: number) => {
    const newVal = Math.max(0, hours + delta);
    setHours(newVal);
    saveChanges({ hoursPlayed: newVal });
  };

  const togglePriority = () => {
    const levels: UserGame['priority'][] = ['low', 'medium', 'high'];
    const next = levels[(levels.indexOf(priority) + 1) % levels.length]!;
    setPriority(next);
    saveChanges({ priority: next });
  };

  const updateRating = (val: number) => {
    setRating(val);
    saveChanges({ rating: val });
  };

  const toggleArchive = () => {
    saveChanges({ isArchived: !game.isArchived });
    onClose();
  };

  const addGalleryImage = () => {
    if (!imageInput) return;
    const newGallery = [...(game.gallery || []), imageInput];
    saveChanges({ gallery: newGallery });
    setImageInput('');
  };

  const deleteGame = async () => {
    try {
      await deleteDoc(doc(db, `users/${userId}/games`, game.id));
      onClose();
    } catch (err) {
      handleFirestoreError(err, 'delete', `users/${userId}/games/${game.id}`, { uid: userId });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="fixed inset-0 z-[110] bg-bg-dark overflow-y-auto no-scrollbar"
    >
      {/* Hero Section */}
      <div className="relative h-[60vh] min-h-[400px]">
        <img src={game.coverUrl} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/40 to-transparent" />
        
        <div className="absolute top-6 left-6 right-6 flex justify-between">
          <button onClick={onClose} className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white">
            <X className="w-6 h-6" />
          </button>
          <div className="flex gap-2">
            <button 
              onClick={toggleArchive}
              className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-xs font-bold uppercase tracking-widest text-zinc-300"
            >
              {game.isArchived ? 'Restore' : 'Archive'}
            </button>
            <button onClick={() => setShowDeleteConfirm(true)} className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-red-500 hover:bg-red-500/20 transition-colors">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-8 text-center"
            >
              <div className="max-w-xs">
                <div className="w-20 h-20 bg-red-500/10 rounded-[32px] flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="w-10 h-10 text-red-500" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Eject Game?</h3>
                <p className="text-zinc-500 text-sm mb-8">This will permanently remove <span className="text-white font-bold">{game.title}</span> from your rack.</p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={deleteGame}
                    className="w-full bg-red-600 text-white font-bold py-4 rounded-2xl shadow-[0_10px_20px_rgba(220,38,38,0.2)]"
                  >
                    Confirm Ejection
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    className="w-full bg-zinc-900 text-zinc-400 font-bold py-4 rounded-2xl border border-zinc-800"
                  >
                    Abort
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute bottom-10 left-6 right-6">
          <div className="flex gap-2 mb-3">
             <span className="px-3 py-1 bg-brand-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-full">{game.status}</span>
             {game.platforms.map(p => (
               <span key={p} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-widest rounded-full">{p}</span>
             ))}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 drop-shadow-lg">{game.title}</h1>
          <p className="text-zinc-400 text-sm font-medium">Logged on {new Date(game.createdAt?.seconds * 1000).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="px-6 pb-32 space-y-12">
        {/* Progress & Quick Stats */}
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-[40px] p-8 -mt-8 relative z-10 backdrop-blur-sm">
           <div className="flex justify-between items-end mb-6">
              <div>
                <h3 className="text-[10px] uppercase font-bold text-zinc-500 tracking-[0.2em] mb-1">Completion</h3>
                <p className="text-3xl font-bold font-mono">{progress}%</p>
              </div>
              <div className="text-right">
                <h3 className="text-[10px] uppercase font-bold text-zinc-500 tracking-[0.2em] mb-1">Status</h3>
                <p className="text-sm font-bold uppercase text-brand-secondary">{game.status === 'playing' ? 'In Progress' : game.status}</p>
              </div>
           </div>
           
           <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden mb-8">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="absolute top-0 left-0 h-full bg-brand-primary shadow-[0_0_15px_rgba(79,70,229,0.5)]"
              />
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={progress}
                onChange={(e) => updateProgress(parseInt(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-900 rounded-2xl text-center border border-zinc-800/50">
                 <p className="text-[9px] uppercase font-bold text-zinc-500 mb-2">Playtime</p>
                 <div className="flex items-center justify-center gap-4">
                    <button onClick={() => adjustHours(-1)} className="text-zinc-600 hover:text-white">-</button>
                    <p className="text-base font-bold font-mono">{hours}h</p>
                    <button onClick={() => adjustHours(1)} className="text-zinc-600 hover:text-white">+</button>
                 </div>
              </div>
              <div className="p-4 bg-zinc-900 rounded-2xl text-center border border-zinc-800/50">
                 <p className="text-[9px] uppercase font-bold text-zinc-500 mb-2">Priority</p>
                 <button 
                   onClick={togglePriority}
                   className={`text-[10px] font-bold uppercase tracking-widest py-1 px-3 rounded-full border transition-all ${
                     priority === 'high' ? 'bg-red-900/20 text-red-400 border-red-900/30' :
                     priority === 'medium' ? 'bg-amber-900/20 text-amber-400 border-amber-900/30' :
                     'bg-zinc-800 text-zinc-500 border-zinc-700'
                   }`}
                 >
                   {priority}
                 </button>
              </div>
           </div>

           <div className="mt-4 p-4 bg-zinc-900 rounded-2xl border border-zinc-800/50 flex justify-between items-center">
              <p className="text-[9px] uppercase font-bold text-zinc-500">Rating</p>
              <div className="flex gap-1">
                 {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                      key={star}
                      onClick={() => updateRating(star)}
                    >
                       <Star 
                         className={`w-5 h-5 transition-colors ${
                           rating >= star ? 'text-brand-primary fill-brand-primary' : 'text-zinc-800'
                         }`} 
                       />
                    </button>
                 ))}
              </div>
           </div>
        </section>

        {/* Notes Section */}
        <section>
          <div className="flex items-center gap-2 mb-5">
             <div className="w-1.5 h-6 bg-brand-primary rounded-full" />
             <h3 className="text-xl font-bold tracking-tight">Personal Notes</h3>
          </div>
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-[32px] p-6">
             <textarea 
               value={notes}
               onChange={(e) => setNotes(e.target.value)}
               onBlur={() => saveChanges({ notes })}
               placeholder="Add tips, reminders, or a review..."
               className="w-full bg-transparent text-zinc-300 text-sm leading-relaxed min-h-[120px] outline-none resize-none placeholder:text-zinc-700"
             />
             <div className="flex justify-end mt-2">
                <span className="text-[9px] uppercase font-bold text-zinc-600">Autosaved</span>
             </div>
          </div>
        </section>

        {/* Gallery Section */}
        <section>
          <div className="flex justify-between items-center mb-5">
             <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-brand-secondary rounded-full" />
                <h3 className="text-xl font-bold tracking-tight">Gallery</h3>
             </div>
             <button className="text-[10px] text-zinc-500 uppercase font-bold hover:text-white transition-colors">Manage</button>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
             {game.gallery?.map((img, i) => (
                <div key={i} className="aspect-video rounded-2xl bg-zinc-900 overflow-hidden border border-zinc-800">
                   <img src={img} className="w-full h-full object-cover" />
                </div>
             ))}
             <div className="aspect-video rounded-2xl border border-dashed border-zinc-800 flex flex-col items-center justify-center p-4">
                <input 
                  type="text" 
                  placeholder="Paste image URL..."
                  value={imageInput}
                  onChange={e => setImageInput(e.target.value)}
                  className="w-full bg-transparent text-[10px] border-b border-zinc-800 pb-1 mb-2 text-center outline-none"
                />
                <button 
                  onClick={addGalleryImage}
                  className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-brand-secondary"
                >
                   <Plus className="w-4 h-4" />
                </button>
             </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
};

const ProfileView = ({ user, games, logout }: { user: any, games: UserGame[], logout: () => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [preferences, setPreferences] = useState(user.preferences || { mainPlatform: 'PS5' });

  useEffect(() => {
    setDisplayName(user.displayName || '');
    setPhotoURL(user.photoURL || '');
    setPreferences(user.preferences || { mainPlatform: 'PS5' });
  }, [user]);

  const getExperience = (count: number) => {
    if (count >= 30) return 'Legend';
    if (count >= 15) return 'Veteran';
    if (count >= 5) return 'Gamer';
    return 'Newbie';
  };

  const saveProfile = async () => {
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName,
          photoURL
        });

        // Also save preferences to Firestore
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userRef, {
          displayName,
          photoURL,
          preferences,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
      handleFirestoreError(err, 'update', `users/${auth.currentUser?.uid}`, { uid: auth.currentUser?.uid });
    }
  };

  return (
    <div className="space-y-6 pb-32">
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-[40px] p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-brand-primary/5 to-transparent" />
        
        <div className="text-center relative z-10">
          <div className="relative w-24 h-24 mx-auto mb-6 group">
            <img src={photoURL || user.photoURL || ''} className="w-full h-full rounded-[32px] ring-1 ring-zinc-800 p-1 object-cover" />
            <button 
              onClick={() => setIsEditing(true)}
              className="absolute -bottom-2 -right-2 p-2 bg-brand-primary text-white rounded-full shadow-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            >
              <UserIcon className="w-4 h-4" />
            </button>
          </div>
          
          <h2 className="text-2xl font-bold">{displayName || user.displayName}</h2>
          <p className="text-zinc-500 text-sm mb-6">{user.email}</p>
          
          <div className="flex gap-2 justify-center">
             <button 
               onClick={() => setIsEditing(true)}
               className="px-6 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white"
             >
               Configure Bio
             </button>
             <button 
               onClick={logout}
               className="px-6 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-500/10"
             >
               Logout
             </button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[32px] relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 w-12 h-12 bg-brand-primary/10 blur-xl rounded-full" />
          <Star className="w-5 h-5 text-brand-primary mb-3" />
          <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Experience</p>
          <p className="text-xl font-bold">{getExperience(games.length)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[32px] relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 w-12 h-12 bg-brand-secondary/10 blur-xl rounded-full" />
          <Gamepad2 className="w-5 h-5 text-brand-secondary mb-3" />
          <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Main Node</p>
          <p className="text-xl font-bold">{preferences?.mainPlatform || 'PS5'}</p>
        </div>
      </div>

      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-[32px] p-8 relative z-10"
            >
              <h3 className="text-xl font-bold mb-6 tracking-tight">Identity Config</h3>
              <div className="space-y-4 mb-8">
                 <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-2">Pilot Name</label>
                    <input 
                      value={displayName} 
                      onChange={e => setDisplayName(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 text-sm outline-none focus:border-brand-primary"
                    />
                 </div>
                 <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-2">Avatar Source URL</label>
                    <input 
                      value={photoURL} 
                      onChange={e => setPhotoURL(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 text-sm outline-none focus:border-brand-primary"
                    />
                 </div>
                 <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-2">Primary Node</label>
                    <select 
                      value={preferences.mainPlatform} 
                      onChange={e => setPreferences({...preferences, mainPlatform: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 text-sm outline-none focus:border-brand-primary appearance-none"
                    >
                      <option value="PS5">PlayStation 5</option>
                      <option value="PS4">PlayStation 4</option>
                      <option value="PC">PC</option>
                      <option value="Switch">Nintendo Switch</option>
                      <option value="Switch2">Nintendo Switch 2</option>
                      <option value="Xbox">Xbox Series X</option>
                      <option value="Handheld">Steam Deck / Ally</option>
                      <option value="Mobile">Mobile</option>
                    </select>
                 </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={saveProfile}
                  className="flex-1 bg-brand-primary text-white font-bold py-4 rounded-2xl"
                >
                  Save Profile
                </button>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-500 font-bold"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main App Content ---

const AppContent = () => {
  const { user, loading, signIn, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'library' | 'wishlist' | 'profile'>('home');
  const [games, setGames] = useState<UserGame[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<UserGame | null>(null);

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      return;
    }

    // Listen to user preferences/profile
    const userRef = doc(db, 'users', user.uid);
    const unsubscribeProfile = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data());
      }
    });

    const q = query(
      collection(db, `users/${user.uid}/games`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeGames = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserGame[];
      setGames(data);
    });

    return () => {
      unsubscribeProfile();
      unsubscribeGames();
    };
  }, [user]);

  // Merge user auth with firestore profile
  const mergedUser = useMemo(() => {
    if (!user) return null;
    return {
      ...user,
      displayName: userProfile?.displayName || user.displayName,
      photoURL: userProfile?.photoURL || user.photoURL,
      preferences: userProfile?.preferences || { mainPlatform: 'PS5' }
    };
  }, [user, userProfile]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Gamepad2 className="w-12 h-12 text-brand-cyan" />
        </motion.div>
      </div>
    );
  }

  if (!mergedUser) {
    return (
      <div className="min-h-screen bg-bg-dark flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
         {/* Background Decor */}
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/10 blur-[120px] rounded-full" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-secondary/10 blur-[120px] rounded-full" />
 
         <div className="relative mb-8">
            <div className="absolute -inset-4 bg-brand-primary/20 blur-2xl rounded-full" />
            <Gamepad2 className="w-20 h-20 text-brand-primary relative" />
         </div>
         
         <h1 className="text-6xl font-extrabold mb-2 tracking-tighter text-white">Gamira</h1>
         <p className="text-zinc-500 mb-12 text-sm uppercase tracking-[0.3em] font-bold">Your game in rack</p>
         
         <div className="w-full max-w-xs space-y-4">
            <button 
              onClick={signIn}
              className="w-full bg-zinc-100 text-zinc-950 font-bold py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-brand-primary hover:text-white transition-all group active:scale-95"
            >
              <span className="text-lg">Initialize System</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">Authentication via Google Secure</p>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark max-w-xl mx-auto px-6 pt-10">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <img 
            src={mergedUser.photoURL || ''} 
            className="w-10 h-10 rounded-xl cursor-pointer" 
            onClick={() => setActiveTab('profile')}
          />
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              {activeTab === 'home' && 'Discovery'}
              {activeTab === 'library' && 'Rack'}
              {activeTab === 'wishlist' && 'Radar'}
              {activeTab === 'profile' && 'Pilot Info'}
            </h1>
            <div className="flex items-center gap-1.5">
               <div className="w-1 h-1 rounded-full bg-brand-secondary animate-pulse" />
               <p className="text-[8px] uppercase tracking-widest font-bold text-zinc-500">Secure</p>
            </div>
          </div>
        </div>
        <div className="flex gap-4">
           <button onClick={() => setIsAddModalOpen(true)} className="w-10 h-10 bg-white text-zinc-950 rounded-xl flex items-center justify-center shadow-[0_10px_20px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95 transition-all">
             <Plus className="w-5 h-5" />
           </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="min-h-[70vh]">
        {activeTab === 'home' && <HomeView games={games} onSelect={setSelectedGame} />}
        {activeTab === 'library' && <LibraryView games={games} onSelect={setSelectedGame} />}
        {activeTab === 'wishlist' && <RadarView games={games} onSelect={setSelectedGame} />}
        {activeTab === 'profile' && <ProfileView user={mergedUser} games={games} logout={logout} />}
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-sm bg-bg-dark/80 backdrop-blur-xl border border-zinc-800 rounded-[32px] p-2 flex justify-between items-center z-50 shadow-2xl">
        {[
          { id: 'home', icon: Gamepad2, label: 'Discovery' },
          { id: 'library', icon: Library, label: 'Rack' },
          { id: 'wishlist', icon: Bookmark, label: 'Radar' },
          { id: 'profile', icon: UserIcon, label: 'Pilot' }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative flex flex-col items-center justify-center flex-1 py-4 rounded-2xl transition-all duration-300 ${
                isActive ? 'text-brand-primary' : 'text-zinc-500'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'scale-110 mb-1' : 'scale-100'}`} />
              <AnimatePresence>
                {isActive && (
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-[8px] font-bold uppercase tracking-widest"
                  >
                    {tab.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {isActive && (
                <motion.div 
                  layoutId="nav-glow"
                  className="absolute -bottom-1 w-1 h-1 bg-brand-primary rounded-full blur-[2px]"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Modals & Overlays */}
      <AddGameModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        userId={mergedUser.uid} 
      />
      
      <AnimatePresence>
        {selectedGame && (
          <GameDetail 
            game={selectedGame} 
            onClose={() => setSelectedGame(null)} 
            userId={mergedUser.uid}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
